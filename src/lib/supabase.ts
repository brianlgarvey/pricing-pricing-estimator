import { createClient } from "@supabase/supabase-js";
import type { PriceEstimate } from "./priceCalculator";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export async function submitEstimate(
  email: string,
  description: string,
  estimate: PriceEstimate
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase not configured — skipping submission");
    return null;
  }

  try {
    // Insert into submissions table and return the row ID
    const { data, error: insertError } = await supabase
      .from("submissions")
      .insert({
        email,
        description,
        estimate_low: estimate.low,
        estimate_typical: estimate.typical,
        estimate_high: estimate.high,
        estimate_currency: estimate.currency,
        match_count: estimate.matchCount,
        confidence: estimate.confidence,
      })
      .select("id")
      .single();

    if (insertError) {
      console.warn("Failed to save submission:", insertError.message);
      return null;
    }

    // Call the edge function to send notification email
    const { error: fnError } = await supabase.functions.invoke(
      "notify-submission",
      {
        body: {
          email,
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

    if (fnError) {
      console.warn("Failed to send notification:", fnError.message);
    }

    return data?.id ?? null;
  } catch {
    console.warn("Failed to submit estimate");
    return null;
  }
}

export async function updateSubmissionQualification(
  submissionId: string,
  jobTitle: string,
  expectedCost: string
): Promise<void> {
  if (!supabase || !submissionId) return;

  try {
    const { error } = await supabase
      .from("submissions")
      .update({ job_title: jobTitle, expected_cost: expectedCost })
      .eq("id", submissionId);

    if (error) {
      console.warn("Failed to save qualification:", error.message);
    }
  } catch {
    console.warn("Failed to update qualification");
  }
}

export async function submitFeedback(
  submissionId: string,
  rating: string
): Promise<void> {
  if (!supabase || !submissionId) return;

  try {
    const { error } = await supabase
      .from("submissions")
      .update({ feedback_rating: rating })
      .eq("id", submissionId);

    if (error) {
      console.warn("Failed to save feedback:", error.message);
    }
  } catch {
    console.warn("Failed to submit feedback");
  }
}
