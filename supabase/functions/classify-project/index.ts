// Supabase Edge Function for project classification
// Provides server-side classification of project descriptions into categories

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClassificationResult {
  categories: string[];
  primaryCategory: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "CRM Setup": [
    "crm setup", "crm config", "hubspot setup", "portal setup",
    "crm implementation", "pipeline setup", "property setup",
  ],
  "Marketing Hub": [
    "marketing hub", "email marketing", "lead nurture", "landing page",
    "marketing automation", "email campaign", "lead generation",
    "content strategy", "seo", "social media",
  ],
  "Sales Hub": [
    "sales hub", "sales pipeline", "sales process", "sequences",
    "playbook", "deal pipeline", "sales enablement", "forecasting",
  ],
  "Service Hub": [
    "service hub", "ticketing", "knowledge base", "customer portal",
    "help desk", "support ticket", "customer service",
  ],
  "CMS / Website": [
    "cms hub", "website", "web design", "web development",
    "theme", "template", "blog", "content management",
  ],
  "Integration": [
    "integration", "salesforce", "api", "zapier", "middleware",
    "sync", "connector", "webhook", "data flow",
  ],
  "Migration": [
    "migration", "data import", "data transfer", "switch from",
    "transition", "convert", "move from",
  ],
  "RevOps": [
    "revops", "revenue operations", "strategy", "consulting",
    "process optimization", "reporting", "analytics",
  ],
  "Training": [
    "training", "onboarding", "adoption", "coaching",
    "user training", "documentation", "enablement",
  ],
  "Audit": [
    "audit", "review", "optimization", "health check",
    "portal review", "assessment", "cleanup",
  ],
};

function classifyProject(description: string): ClassificationResult {
  const lower = description.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const categories = sorted.map(([cat]) => cat);
  const primaryCategory = categories[0] || "General";
  const maxScore = sorted.length > 0 ? sorted[0][1] : 0;
  const totalKeywords = Object.values(CATEGORY_KEYWORDS).flat().length;
  const confidence = Math.min(maxScore / 5, 1);

  return { categories, primaryCategory, confidence };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'description' field" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const result = classifyProject(description);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
