import type { SimilarMatch } from "./similarity";
import type { ScopeAnalysis } from "./scopeAnalyzer";

export interface PriceEstimate {
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
// IQR-based outlier removal — better than σ-based for right-skewed price data.
// Outliers are below Q1 - 1.5×IQR or above Q3 + 1.5×IQR.
// ---------------------------------------------------------------------------
export function trimOutliers(prices: number[]): number[] {
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

// ---------------------------------------------------------------------------
// Weighted percentile — computes a percentile from sorted values + weights.
// Uses linear interpolation between cumulative weight positions.
// If no weights provided, all values are weighted equally.
// ---------------------------------------------------------------------------
function weightedPercentile(
  sortedValues: number[],
  p: number,
  weights?: number[]
): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  if (!weights) {
    // Simple unweighted percentile
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    const frac = index - lower;
    return sortedValues[lower] * (1 - frac) + sortedValues[upper] * frac;
  }

  // Weighted: build cumulative weight array, then interpolate
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return sortedValues[0];

  const target = (p / 100) * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < sortedValues.length; i++) {
    const prevCum = cumulative;
    cumulative += weights[i];

    if (cumulative >= target) {
      if (i === 0 || weights[i] === 0) return sortedValues[i];
      // Interpolate within this step
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

// ---------------------------------------------------------------------------
// Confidence is based on how many matches we have and how strong the top one is.
// With adaptive matching, counts can be higher, so thresholds are adjusted.
// ---------------------------------------------------------------------------
function getConfidence(
  matchCount: number,
  topSimilarity: number
): "low" | "medium" | "high" {
  if (matchCount >= 15 && topSimilarity > 0.15) return "high";
  if (matchCount >= 8 && topSimilarity > 0.08) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Main estimate function — combines all four improvements:
// 1. IQR outlier removal
// 2. Similarity-weighted percentiles
// 3. Log-space math (handles right-skewed price distributions)
// 4. Works with adaptive match counts from the similarity engine
// ---------------------------------------------------------------------------
export function calculatePriceEstimate(
  matches: SimilarMatch[],
  scope: ScopeAnalysis,
  preferredCurrency: string = "usd"
): PriceEstimate {
  // Filter to preferred currency when possible, fall back to all
  let relevantMatches = matches.filter(
    (m) => m.proposal.currency === preferredCurrency
  );
  if (relevantMatches.length < 3) {
    relevantMatches = matches;
  }

  // Sort by price for percentile computation
  relevantMatches.sort(
    (a, b) => a.proposal.proposed_price - b.proposal.proposed_price
  );

  const rawPrices = relevantMatches.map((m) => m.proposal.proposed_price);
  const similarities = relevantMatches.map((m) => m.similarity);

  // Step 1: IQR-based outlier removal (keep matching indices in sync)
  const trimmedPrices = trimOutliers(rawPrices);
  const trimmedCount: Record<number, number> = {};
  for (const p of trimmedPrices) {
    trimmedCount[p] = (trimmedCount[p] || 0) + 1;
  }
  // Filter matches to only those whose prices survived trimming
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

  // Guard: if no prices survived trimming, fall back to raw prices
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

  // Step 2: Compute percentiles in log-space with similarity weights
  const logPrices = prices.map((p) => Math.log(Math.max(p, 1)));

  // Sort by log price (should already be sorted, but ensure)
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

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    usd: "$",
    cad: "CA$",
    gbp: "£",
  };
  const symbol = symbols[currency] || "$";
  return `${symbol}${amount.toLocaleString("en-US")}`;
}
