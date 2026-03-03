export interface ScopeSignal {
  category: string;
  signal: string;
  weight: number;
}

export interface ScopeAnalysis {
  signals: ScopeSignal[];
  complexityScore: number;
  scopeMultiplier: number;
  complexityLevel: "Low" | "Medium" | "High" | "Very High";
}

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

export function analyzeScopeSignals(text: string): ScopeAnalysis {
  const signals: ScopeSignal[] = [];

  // Hub mentions (1pt each)
  const hubsFound = new Set<string>();
  for (const [pattern, hubName] of HUB_PATTERNS) {
    if (pattern.test(text) && !hubsFound.has(hubName)) {
      hubsFound.add(hubName);
      signals.push({ category: "Hub", signal: hubName, weight: 1 });
    }
  }

  // Multi-hub bonus (3pt if 3+ hubs)
  if (hubsFound.size >= 3) {
    signals.push({
      category: "Multi-Hub",
      signal: `${hubsFound.size} hubs involved`,
      weight: 3,
    });
  }

  // Integrations (2pt each, max 3 signals)
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

  // Migrations (3pt each)
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

  // Custom development (2pt each)
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

  // Enterprise features (2pt each)
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
