import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types returned by the server-side estimate function
// ---------------------------------------------------------------------------
export interface SimilarMatch {
  title: string;
  price: number;
  currency: string;
  similarity: number;
}

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

export interface ScopeAnalysis {
  signals: { category: string; signal: string; weight: number }[];
  complexityScore: number;
  scopeMultiplier: number;
  complexityLevel: "Low" | "Medium" | "High" | "Very High";
}

export interface EstimateResponse {
  estimate: PriceEstimate;
  matches: SimilarMatch[];
  scope: ScopeAnalysis;
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------
export async function fetchEstimate(
  description: string,
  email?: string
): Promise<EstimateResponse> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.functions.invoke("estimate", {
    body: { description, email },
  });

  if (error) {
    throw new Error(error.message || "Failed to get estimate");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as EstimateResponse;
}
