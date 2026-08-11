// Supabase Edge Function: /estimate
//
// Accepts a project description (and optional email), runs TF-IDF similarity
// search against the proposals table, computes a price estimate, saves the
// submission, and returns the estimate + anonymized similar matches.
//
// The raw proposal data never leaves the server.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Proposal {
  proposal_id: number;
  job_id: number;
  job_title: string;
  job_description: string;
  currency: string;
  proposed_price: number;
  proposal_status: string;
  created_at: string;
}

interface SimilarMatch {
  title: string;
  price: number;
  currency: string;
  similarity: number;
}

interface ScopeSignal {
  category: string;
  signal: string;
  weight: number;
}

interface ScopeAnalysis {
  signals: ScopeSignal[];
  complexityScore: number;
  scopeMultiplier: number;
  complexityLevel: "Low" | "Medium" | "High" | "Very High";
}

interface PriceEstimate {
  low: number;
  typical: number;
  high: number;
  currency: string;
  matchCount: number;
  confidence: "low" | "medium" | "high";
  scopeMultiplier: number;
  rawLow: number;
  rawTypical: number;
  rawHigh: number;
}

// ---------------------------------------------------------------------------
// Text processing
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "that", "this", "are", "was",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "not", "no", "we", "you",
  "i", "he", "she", "they", "them", "our", "your", "my", "its",
  "as", "if", "so", "up", "out", "about", "into", "over", "after",
  "all", "also", "been", "being", "more", "some", "such", "than",
  "very", "just", "only", "other", "new", "one", "two", "each",
  "any", "how", "what", "which", "when", "where", "who", "their",
  "then", "these", "those", "through", "while", "here", "there",
  "need", "looking", "want", "like", "get", "make", "us", "me",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// TF-IDF similarity engine
// ---------------------------------------------------------------------------
type TfIdfVector = Map<string, number>;

function computeTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

interface TfIdfCorpus {
  documentVectors: TfIdfVector[];
  idf: Map<string, number>;
  proposals: Proposal[];
}

function buildCorpus(proposals: Proposal[]): TfIdfCorpus {
  const N = proposals.length;
  const docFreq = new Map<string, number>();
  const allTokens: string[][] = [];

  for (const p of proposals) {
    const text = `${p.job_title} ${stripHtml(p.job_description)}`;
    const tokens = tokenize(text);
    const uniqueTerms = new Set(tokens);
    allTokens.push(tokens);

    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log(N / (1 + df)));
  }

  const documentVectors: TfIdfVector[] = allTokens.map((tokens) => {
    const tf = computeTf(tokens);
    const tfidf: TfIdfVector = new Map();
    for (const [term, tfVal] of tf) {
      const idfVal = idf.get(term) || 0;
      tfidf.set(term, tfVal * idfVal);
    }
    return tfidf;
  });

  return { documentVectors, idf, proposals };
}

function queryToVector(query: string, idf: Map<string, number>): TfIdfVector {
  const tokens = tokenize(query);
  const tf = computeTf(tokens);
  const tfidf: TfIdfVector = new Map();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || 0;
    tfidf.set(term, tfVal * idfVal);
  }
  return tfidf;
}

function cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, val] of a) {
    normA += val * val;
    const bVal = b.get(term) || 0;
    dotProduct += val * bVal;
  }

  for (const [, val] of b) {
    normB += val * val;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

interface InternalMatch {
  proposal: Proposal;
  similarity: number;
}

function findSimilar(
  query: string,
  corpus: TfIdfCorpus,
  minSimilarity = 0.05,
  maxMatches = 50
): InternalMatch[] {
  const queryVec = queryToVector(query, corpus.idf);

  const scored: InternalMatch[] = corpus.documentVectors
    .map((docVec, i) => ({
      proposal: corpus.proposals[i],
      similarity: cosineSimilarity(queryVec, docVec),
    }))
    .filter((m) => m.similarity >= minSimilarity);

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, maxMatches);
}

// ---------------------------------------------------------------------------
// Scope analysis
// ---------------------------------------------------------------------------
const HUB_PATTERNS: [RegExp, string][] = [
  [/\bmarketing\s*hub\b/i, "Marketing Hub"],
  [/\bsales\s*hub\b/i, "Sales Hub"],
  [/\bservice\s*hub\b/i, "Service Hub"],
  [/\bcms\s*hub\b/i, "CMS Hub"],
  [/\boperations\s*hub\b/i, "Operations Hub"],
  [/\bcontent\s*hub\b/i, "Content Hub"],
  [/\bcommerce\s*hub\b/i, "Commerce Hub"],
];

const INTEGRATION_PATTERNS: RegExp[] = [
  /\bsalesforce\b/i,
  /\bintegrat(e|ion|ions|ing)\b/i,
  /\bapi\s*(integration|connect|setup)\b/i,
  /\bzapier\b/i,
  /\bmiddleware\b/i,
  /\bsync(ing|hroniz)?\b/i,
  /\bconnect(or|ion|ing)?\b/i,
  /\bwebhook/i,
];

const MIGRATION_PATTERNS: RegExp[] = [
  /\bmigrat(e|ion|ions|ing)\b/i,
  /\bdata\s*(transfer|import|export|move)\b/i,
  /\bconver(t|sion|ting)\b/i,
  /\bswitch(ing)?\s*(from|to|over)\b/i,
  /\btransition(ing)?\b/i,
];

const CUSTOM_DEV_PATTERNS: RegExp[] = [
  /\bcustom\s*(development|module|object|code|build)\b/i,
  /\bbespoke\b/i,
  /\btailored\s*solution\b/i,
  /\bcustom\s*report(s|ing)?\b/i,
  /\bcustom\s*workflow/i,
  /\bcustom\s*propert(y|ies)\b/i,
];

const ENTERPRISE_PATTERNS: RegExp[] = [
  /\benterprise\b/i,
  /\badvanced\s*(automation|reporting|analytics)\b/i,
  /\bpredictive\s*(lead\s*)?scor(e|ing)\b/i,
  /\brevenue\s*attribution\b/i,
  /\bmulti(-|\s)?(touch|channel)\b/i,
  /\babm\b/i,
  /\baccount.based.marketing\b/i,
];

function analyzeScopeSignals(text: string): ScopeAnalysis {
  const signals: ScopeSignal[] = [];

  // Hub mentions
  const hubsFound = new Set<string>();
  for (const [pattern, hubName] of HUB_PATTERNS) {
    if (pattern.test(text) && !hubsFound.has(hubName)) {
      hubsFound.add(hubName);
      signals.push({ category: "Hub", signal: hubName, weight: 1 });
    }
  }

  if (hubsFound.size >= 3) {
    signals.push({
      category: "Multi-Hub",
      signal: `${hubsFound.size} hubs involved`,
      weight: 3,
    });
  }

  let integrationCount = 0;
  for (const pattern of INTEGRATION_PATTERNS) {
    if (pattern.test(text) && integrationCount < 3) {
      const match = text.match(pattern);
      signals.push({
        category: "Integration",
        signal: match ? match[0] : "Integration",
        weight: 2,
      });
      integrationCount++;
    }
  }

  let migrationCount = 0;
  for (const pattern of MIGRATION_PATTERNS) {
    if (pattern.test(text) && migrationCount < 2) {
      const match = text.match(pattern);
      signals.push({
        category: "Migration",
        signal: match ? match[0] : "Migration",
        weight: 3,
      });
      migrationCount++;
    }
  }

  let customCount = 0;
  for (const pattern of CUSTOM_DEV_PATTERNS) {
    if (pattern.test(text) && customCount < 3) {
      const match = text.match(pattern);
      signals.push({
        category: "Custom Development",
        signal: match ? match[0] : "Custom development",
        weight: 2,
      });
      customCount++;
    }
  }

  let enterpriseCount = 0;
  for (const pattern of ENTERPRISE_PATTERNS) {
    if (pattern.test(text) && enterpriseCount < 3) {
      const match = text.match(pattern);
      signals.push({
        category: "Enterprise",
        signal: match ? match[0] : "Enterprise feature",
        weight: 2,
      });
      enterpriseCount++;
    }
  }

  const complexityScore = signals.reduce((sum, s) => sum + s.weight, 0);
  const scopeMultiplier = getScopeMultiplier(complexityScore);
  const complexityLevel = getComplexityLevel(complexityScore);

  return { signals, complexityScore, scopeMultiplier, complexityLevel };
}

function getScopeMultiplier(score: number): number {
  if (score === 0) return 1.0;
  if (score <= 2) return 1.05;
  if (score <= 4) return 1.1;
  if (score <= 7) return 1.15;
  if (score <= 10) return 1.2;
  if (score <= 14) return 1.3;
  return 1.4;
}

function getComplexityLevel(
  score: number
): "Low" | "Medium" | "High" | "Very High" {
  if (score <= 2) return "Low";
  if (score <= 7) return "Medium";
  if (score <= 14) return "High";
  return "Very High";
}

// ---------------------------------------------------------------------------
// Price calculation
// ---------------------------------------------------------------------------

// Minimum price threshold
const MIN_PROJECT_PRICE = 200;

// Input bounds (see handler validation)
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_FIELD_LENGTH = 200;

// ---------------------------------------------------------------------------
// Cloudflare Turnstile verification
// ---------------------------------------------------------------------------
// Verification is only enforced when TURNSTILE_SECRET_KEY is set. This lets the
// code ship before the widget is provisioned; setting the secret (and the
// frontend site key) turns bot protection on without a redeploy.
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");

async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET!);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

function trimOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = weightedPercentile(sorted, 25);
  const q3 = weightedPercentile(sorted, 75);
  const iqr = q3 - q1;
  if (iqr === 0) return sorted;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return sorted.filter((p) => p >= lo && p <= hi);
}

function weightedPercentile(
  sortedValues: number[],
  p: number,
  weights?: number[]
): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  if (!weights) {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    const frac = index - lower;
    return sortedValues[lower] * (1 - frac) + sortedValues[upper] * frac;
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return sortedValues[0];

  const target = (p / 100) * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < sortedValues.length; i++) {
    const prevCum = cumulative;
    cumulative += weights[i];

    if (cumulative >= target) {
      if (i === 0 || weights[i] === 0) return sortedValues[i];
      const frac = (target - prevCum) / weights[i];
      if (i > 0 && frac < 0.5) {
        const blend = frac * 2;
        return sortedValues[i - 1] * (1 - blend) + sortedValues[i] * blend;
      }
      return sortedValues[i];
    }
  }
  return sortedValues[sortedValues.length - 1];
}

function getConfidence(
  matchCount: number,
  topSimilarity: number
): "low" | "medium" | "high" {
  if (matchCount >= 15 && topSimilarity > 0.15) return "high";
  if (matchCount >= 8 && topSimilarity > 0.08) return "medium";
  return "low";
}

function calculatePriceEstimate(
  matches: InternalMatch[],
  scope: ScopeAnalysis,
  preferredCurrency = "usd"
): PriceEstimate {
  let relevantMatches = matches.filter(
    (m) => m.proposal.currency === preferredCurrency
  );
  if (relevantMatches.length < 3) {
    relevantMatches = matches;
  }

  relevantMatches.sort(
    (a, b) => a.proposal.proposed_price - b.proposal.proposed_price
  );

  const rawPrices = relevantMatches.map((m) => m.proposal.proposed_price);
  const similarities = relevantMatches.map((m) => m.similarity);

  const trimmedPrices = trimOutliers(rawPrices);
  const trimmedCount: Record<number, number> = {};
  for (const p of trimmedPrices) {
    trimmedCount[p] = (trimmedCount[p] || 0) + 1;
  }
  const keptIndices: number[] = [];
  const usedCount: Record<number, number> = {};
  for (let i = 0; i < rawPrices.length; i++) {
    const p = rawPrices[i];
    usedCount[p] = (usedCount[p] || 0) + 1;
    if (usedCount[p] <= (trimmedCount[p] || 0)) {
      keptIndices.push(i);
    }
  }

  const prices = keptIndices.map((i) => rawPrices[i]);
  const weights = keptIndices.map((i) => similarities[i]);

  if (prices.length === 0) {
    const fallbackPrices = rawPrices.length > 0 ? rawPrices : [0];
    const median = fallbackPrices[Math.floor(fallbackPrices.length / 2)];
    const multiplier = scope.scopeMultiplier;
    const topSimilarity = matches.length > 0 ? matches[0].similarity : 0;
    return {
      low: Math.round(median * 0.7 * multiplier),
      typical: Math.round(median * multiplier),
      high: Math.round(median * 1.3 * multiplier),
      currency: preferredCurrency,
      matchCount: rawPrices.length,
      confidence: getConfidence(rawPrices.length, topSimilarity),
      scopeMultiplier: multiplier,
      rawLow: Math.round(median * 0.7),
      rawTypical: Math.round(median),
      rawHigh: Math.round(median * 1.3),
    };
  }

  const logPrices = prices.map((p) => Math.log(Math.max(p, 1)));
  const indices = logPrices.map((_, i) => i);
  indices.sort((a, b) => logPrices[a] - logPrices[b]);
  const sortedLogPrices = indices.map((i) => logPrices[i]);
  const sortedWeights = indices.map((i) => weights[i]);

  const rawLow = Math.exp(weightedPercentile(sortedLogPrices, 15, sortedWeights));
  const rawTypical = Math.exp(weightedPercentile(sortedLogPrices, 50, sortedWeights));
  const rawHigh = Math.exp(weightedPercentile(sortedLogPrices, 85, sortedWeights));

  const topSimilarity = matches.length > 0 ? matches[0].similarity : 0;
  const confidence = getConfidence(prices.length, topSimilarity);
  const multiplier = scope.scopeMultiplier;

  return {
    low: Math.round(rawLow * multiplier),
    typical: Math.round(rawTypical * multiplier),
    high: Math.round(rawHigh * multiplier),
    currency: preferredCurrency,
    matchCount: prices.length,
    confidence,
    scopeMultiplier: multiplier,
    rawLow: Math.round(rawLow),
    rawTypical: Math.round(rawTypical),
    rawHigh: Math.round(rawHigh),
  };
}

// ---------------------------------------------------------------------------
// Title anonymization: strip company-specific details from job titles
// ---------------------------------------------------------------------------
function anonymizeTitle(title: string): string {
  return title
    // Remove "for/at/with <CompanyName>" patterns mid-title (before a separator)
    .replace(/\s+(?:for|at|with)\s+[A-Z][A-Za-z0-9&',.\s-]{1,40}(?=\s*[-–—|:])/g, " ")
    // ...and the same trailing at the end of the title
    .replace(/\s+(?:for|at|with)\s+[A-Z][A-Za-z0-9&',.\s-]{1,40}$/g, "")
    // Remove a trailing "<sep> Company Name" tail (e.g. "... | Acme Corp")
    .replace(/\s*[-–—|:]\s*[A-Z][A-Za-z0-9&',.\s-]{1,40}$/g, "")
    // Remove parenthesized company references like "(Acme Corp)"
    .replace(/\s*\([A-Z][A-Za-z0-9&',.\s-]{1,40}\)\s*/g, " ")
    // Remove leading possessive company names like "Acme's ..."
    .replace(/^[A-Z][A-Za-z0-9&',.-]{1,40}['’]s\s+/g, "")
    // Clean up extra whitespace and dangling separators
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—|:]\s*$/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { description, email, firstName, lastName, turnstileToken } =
      await req.json();

    if (!description || typeof description !== "string") {
      return jsonResponse({ error: "Missing or invalid 'description' field" }, 400);
    }

    // ---- Bot protection: verify the Turnstile token when configured ----
    if (TURNSTILE_SECRET) {
      if (typeof turnstileToken !== "string" || !turnstileToken) {
        return jsonResponse({ error: "Verification required" }, 403);
      }
      const remoteIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        "";
      const verified = await verifyTurnstile(turnstileToken, remoteIp);
      if (!verified) {
        return jsonResponse({ error: "Verification failed" }, 403);
      }
    }

    // Bound the inputs. The description is used to build a per-request TF-IDF
    // query and is echoed into notification emails, so cap it to keep the
    // function cheap and to limit abuse via oversized payloads.
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return jsonResponse(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` },
        400
      );
    }
    if (email && (typeof email !== "string" || email.length > MAX_FIELD_LENGTH)) {
      return jsonResponse({ error: "Invalid 'email' field" }, 400);
    }
    const safeFirstName =
      typeof firstName === "string" ? firstName.slice(0, MAX_FIELD_LENGTH) : "";
    const safeLastName =
      typeof lastName === "string" ? lastName.slice(0, MAX_FIELD_LENGTH) : "";

    // ---- Supabase client (service role for full table access) ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- Load proposals from the database ----
    const { data: rows, error: fetchError } = await supabase
      .from("proposals")
      .select("proposal_id, job_id, job_title, job_description, currency, proposed_price, proposal_status, created_at");

    if (fetchError || !rows) {
      console.error("Failed to load proposals:", fetchError?.message);
      return jsonResponse({ error: "Failed to load proposal data" }, 500);
    }

    // Parse into typed proposals (filter same as the old client-side logic)
    const proposals: Proposal[] = rows
      .map((row: Record<string, unknown>) => ({
        proposal_id: Number(row.proposal_id) || 0,
        job_id: Number(row.job_id) || 0,
        job_title: String(row.job_title || "").trim(),
        job_description: stripHtml(String(row.job_description || "")),
        currency: String(row.currency || "usd").toLowerCase(),
        proposed_price: Number(row.proposed_price) || 0,
        proposal_status: String(row.proposal_status || "").trim(),
        created_at: String(row.created_at || ""),
      }))
      .filter((p: Proposal) => p.proposed_price >= MIN_PROJECT_PRICE && p.job_title);

    // ---- Build corpus and find similar matches ----
    const corpus = buildCorpus(proposals);
    const similar = findSimilar(description, corpus);
    const scope = analyzeScopeSignals(description);
    const estimate = calculatePriceEstimate(similar, scope);

    // ---- Build anonymized matches for the response ----
    const seenJobs = new Set<number>();
    const anonymizedMatches: SimilarMatch[] = [];
    for (const m of similar) {
      if (!seenJobs.has(m.proposal.job_id)) {
        seenJobs.add(m.proposal.job_id);
        anonymizedMatches.push({
          title: anonymizeTitle(m.proposal.job_title),
          price: m.proposal.proposed_price,
          currency: m.proposal.currency,
          similarity: m.similarity,
        });
      }
    }

    // ---- Save submission + notify ----
    // These run after the response is sent, but registered via
    // EdgeRuntime.waitUntil so the isolate is kept alive until they settle
    // (a bare fire-and-forget promise can be cancelled once we return).
    if (email && typeof email === "string") {
      const persistAndNotify = (async () => {
        const { error: insertError } = await supabase
          .from("submissions")
          .insert({
            email,
            first_name: safeFirstName || null,
            last_name: safeLastName || null,
            description,
            estimate_low: estimate.low,
            estimate_typical: estimate.typical,
            estimate_high: estimate.high,
            estimate_currency: estimate.currency,
            match_count: estimate.matchCount,
            confidence: estimate.confidence,
          });
        if (insertError) {
          console.warn("Failed to save submission:", insertError.message);
        }

        const { error: notifyError } = await supabase.functions.invoke(
          "notify-submission",
          {
            body: {
              email,
              firstName: safeFirstName,
              lastName: safeLastName,
              description,
              estimate: {
                low: estimate.low,
                typical: estimate.typical,
                high: estimate.high,
                currency: estimate.currency,
                matchCount: estimate.matchCount,
                confidence: estimate.confidence,
              },
            },
          }
        );
        if (notifyError) {
          console.warn("Failed to send notification:", notifyError.message);
        }
      })();

      EdgeRuntime.waitUntil(persistAndNotify);
    }

    // ---- Return results ----
    return jsonResponse({
      estimate,
      matches: anonymizedMatches,
      scope: {
        signals: scope.signals,
        complexityScore: scope.complexityScore,
        scopeMultiplier: scope.scopeMultiplier,
        complexityLevel: scope.complexityLevel,
      },
    });
  } catch (err) {
    console.error("Estimate function error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
