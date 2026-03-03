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
): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured — skipping submission");
    return;
  }

  try {
    // Insert into submissions table
    const { error: insertError } = await supabase.from("submissions").insert({
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
  } catch {
    console.warn("Failed to submit estimate");
  }
}
