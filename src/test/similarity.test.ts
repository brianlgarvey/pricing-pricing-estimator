import { describe, it, expect } from "vitest";
import { buildCorpus, findSimilar } from "@/lib/similarity";
import type { Proposal } from "@/lib/csvParser";

const mockProposals: Proposal[] = [
  {
    proposal_id: 1,
    job_id: 1,
    job_title: "HubSpot Marketing Hub Implementation",
    job_description: "Set up marketing automation email campaigns lead nurturing",
    currency: "usd",
    proposed_price: 5000,
    proposal_status: "ACCEPTED",
    created_at: "2024-01-01",
  },
  {
    proposal_id: 2,
    job_id: 2,
    job_title: "Salesforce to HubSpot CRM Migration",
    job_description: "Migrate data from Salesforce to HubSpot CRM including contacts deals",
    currency: "usd",
    proposed_price: 8000,
    proposal_status: "ACCEPTED",
    created_at: "2024-02-01",
  },
  {
    proposal_id: 3,
    job_id: 3,
    job_title: "Website Redesign and CMS Hub Setup",
    job_description: "Design and build new website on HubSpot CMS Hub with custom themes",
    currency: "usd",
    proposed_price: 15000,
    proposal_status: "PENDING",
    created_at: "2024-03-01",
  },
];

describe("TF-IDF similarity", () => {
  it("builds a corpus from proposals", () => {
    const corpus = buildCorpus(mockProposals);
    expect(corpus.documentVectors).toHaveLength(3);
    expect(corpus.idf.size).toBeGreaterThan(0);
    expect(corpus.proposals).toHaveLength(3);
  });

  it("finds similar proposals for a marketing query", () => {
    const corpus = buildCorpus(mockProposals);
    const matches = findSimilar("marketing hub email automation", corpus);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].proposal.job_title).toContain("Marketing");
  });

  it("finds similar proposals for a migration query", () => {
    const corpus = buildCorpus(mockProposals);
    const matches = findSimilar("salesforce migration data transfer", corpus);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].proposal.job_title).toContain("Migration");
  });

  it("returns empty for completely unrelated query", () => {
    const corpus = buildCorpus(mockProposals);
    const matches = findSimilar("quantum physics blockchain", corpus);
    // May return 0 or very low similarity matches
    for (const m of matches) {
      expect(m.similarity).toBeLessThan(0.5);
    }
  });
});
