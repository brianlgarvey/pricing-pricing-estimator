import { describe, it, expect } from "vitest";
import { calculatePriceEstimate, formatCurrency } from "@/lib/priceCalculator";
import type { SimilarMatch } from "@/lib/similarity";
import type { ScopeAnalysis } from "@/lib/scopeAnalyzer";

const mockMatches: SimilarMatch[] = [
  {
    proposal: {
      proposal_id: 1, job_id: 1, job_title: "A",
      job_description: "", currency: "usd",
      proposed_price: 1000, proposal_status: "ACCEPTED", created_at: "",
    },
    similarity: 0.5,
  },
  {
    proposal: {
      proposal_id: 2, job_id: 2, job_title: "B",
      job_description: "", currency: "usd",
      proposed_price: 3000, proposal_status: "ACCEPTED", created_at: "",
    },
    similarity: 0.4,
  },
  {
    proposal: {
      proposal_id: 3, job_id: 3, job_title: "C",
      job_description: "", currency: "usd",
      proposed_price: 5000, proposal_status: "ACCEPTED", created_at: "",
    },
    similarity: 0.3,
  },
  {
    proposal: {
      proposal_id: 4, job_id: 4, job_title: "D",
      job_description: "", currency: "usd",
      proposed_price: 7000, proposal_status: "ACCEPTED", created_at: "",
    },
    similarity: 0.2,
  },
  {
    proposal: {
      proposal_id: 5, job_id: 5, job_title: "E",
      job_description: "", currency: "usd",
      proposed_price: 10000, proposal_status: "ACCEPTED", created_at: "",
    },
    similarity: 0.1,
  },
];

const baseScope: ScopeAnalysis = {
  signals: [],
  complexityScore: 0,
  scopeMultiplier: 1.0,
  complexityLevel: "Low",
};

describe("calculatePriceEstimate", () => {
  it("returns correct percentile-based estimates", () => {
    const result = calculatePriceEstimate(mockMatches, baseScope);
    expect(result.low).toBeGreaterThan(0);
    expect(result.typical).toBeGreaterThanOrEqual(result.low);
    expect(result.high).toBeGreaterThanOrEqual(result.typical);
    expect(result.matchCount).toBe(5);
  });

  it("applies scope multiplier", () => {
    const highScope: ScopeAnalysis = {
      ...baseScope,
      complexityScore: 10,
      scopeMultiplier: 1.2,
    };
    const base = calculatePriceEstimate(mockMatches, baseScope);
    const multiplied = calculatePriceEstimate(mockMatches, highScope);

    expect(multiplied.typical).toBeGreaterThan(base.typical);
    expect(multiplied.scopeMultiplier).toBe(1.2);
  });

  it("stores raw (pre-multiplier) values", () => {
    const scope: ScopeAnalysis = {
      ...baseScope,
      complexityScore: 5,
      scopeMultiplier: 1.15,
    };
    const result = calculatePriceEstimate(mockMatches, scope);
    expect(result.rawTypical).toBeLessThan(result.typical);
  });
});

describe("formatCurrency", () => {
  it("formats USD", () => {
    expect(formatCurrency(5000, "usd")).toBe("$5,000");
  });

  it("formats GBP", () => {
    expect(formatCurrency(3000, "gbp")).toContain("£");
  });

  it("formats CAD", () => {
    expect(formatCurrency(2500, "cad")).toContain("CA$");
  });
});
