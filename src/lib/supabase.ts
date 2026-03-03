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
    // Insert into submissions table
    const { error: insertError } = await supabase
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
      });

    if (insertError) {
      console.warn("Failed to save submission:", insertError.message);
      return null;
    }

    // Fetch the ID of the row we just inserted
    const { data } = await supabase
      .from("submissions")
      .select("id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return data?.id ?? null;
  } catch {
    console.warn("Failed to submit estimate");
    return null;
  }
}

export async function updateSubmissionQualification(
  submissionId: string,
  jobTitle: string,
  expectedCost: string,
  email: string,
  description: string,
  estimate: PriceEstimate
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

    // Send notification email now that we have qualification data
    const { error: fnError } = await supabase.functions.invoke(
      "notify-submission",
      {
        body: {
          email,
          description,
          jobTitle,
          expectedCost,
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

    // Send follow-up notification with feedback
    const { error: fnError } = await supabase.functions.invoke(
      "notify-feedback",
      {
        body: { submissionId, rating },
      }
    );

    if (fnError) {
      console.warn("Failed to send feedback notification:", fnError.message);
    }
  } catch {
    console.warn("Failed to submit feedback");
  }
}
