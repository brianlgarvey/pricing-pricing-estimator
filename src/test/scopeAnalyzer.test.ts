import { describe, it, expect } from "vitest";
import { analyzeScopeSignals } from "@/lib/scopeAnalyzer";

describe("analyzeScopeSignals", () => {
  it("returns no signals for a generic description", () => {
    const result = analyzeScopeSignals("I need help with my project");
    expect(result.signals).toHaveLength(0);
    expect(result.complexityScore).toBe(0);
    expect(result.scopeMultiplier).toBe(1.0);
    expect(result.complexityLevel).toBe("Low");
  });

  it("detects hub mentions", () => {
    const result = analyzeScopeSignals("Set up Marketing Hub and Sales Hub");
    const hubSignals = result.signals.filter((s) => s.category === "Hub");
    expect(hubSignals).toHaveLength(2);
    expect(hubSignals[0].weight).toBe(1);
  });

  it("adds multi-hub bonus for 3+ hubs", () => {
    const result = analyzeScopeSignals(
      "Marketing Hub, Sales Hub, and Service Hub implementation"
    );
    const multiHub = result.signals.find((s) => s.category === "Multi-Hub");
    expect(multiHub).toBeDefined();
    expect(multiHub!.weight).toBe(3);
  });

  it("detects integration signals", () => {
    const result = analyzeScopeSignals("Salesforce integration with API sync");
    const integrations = result.signals.filter(
      (s) => s.category === "Integration"
    );
    expect(integrations.length).toBeGreaterThan(0);
  });

  it("detects migration signals", () => {
    const result = analyzeScopeSignals("Data migration from old CRM");
    const migrations = result.signals.filter((s) => s.category === "Migration");
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].weight).toBe(3);
  });

  it("calculates correct multiplier tiers", () => {
    // Score 0 -> 1.0
    expect(analyzeScopeSignals("generic project").scopeMultiplier).toBe(1.0);

    // Score 1-2 -> 1.05 (one hub = 1pt)
    expect(
      analyzeScopeSignals("Marketing Hub setup").scopeMultiplier
    ).toBe(1.05);
  });

  it("handles complex descriptions with high score", () => {
    const result = analyzeScopeSignals(
      "Enterprise Marketing Hub, Sales Hub, Service Hub implementation " +
        "with Salesforce integration, data migration from old CRM, " +
        "custom development of reports, and advanced automation"
    );
    expect(result.complexityScore).toBeGreaterThan(10);
    expect(result.scopeMultiplier).toBeGreaterThanOrEqual(1.2);
    expect(["High", "Very High"]).toContain(result.complexityLevel);
  });
});
