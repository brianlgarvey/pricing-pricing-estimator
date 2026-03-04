import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "brian@profound.ly";

const RATING_LABELS: Record<string, string> = {
  way_too_low: "Way too low \u{1F62C}",
  a_bit_low: "A bit low \u{1F914}",
  about_right: "About right \u{1F44D}",
  a_bit_high: "A bit high \u{1F60F}",
  way_too_high: "Way too high \u{1F633}",
};

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    usd: "$",
    cad: "CA$",
    gbp: "\u00A3",
  };
  const symbol = symbols[currency] || "$";
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { submissionId, rating } = await req.json();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the submission details from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: submission, error: fetchError } = await supabase
      .from("submissions")
      .select("email, description, job_title, expected_cost, company_size, estimate_low, estimate_typical, estimate_high, estimate_currency")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      console.error("Failed to fetch submission:", fetchError?.message);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const ratingLabel = RATING_LABELS[rating] || rating;
    const typical = formatCurrency(submission.estimate_typical, submission.estimate_currency);

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e; margin-bottom: 4px;">Estimate Feedback Received</h2>
        <p style="color: #6b7280; margin-top: 0;">A user rated their pricing estimate</p>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #92400e;">${ratingLabel}</p>
          <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">for a middle estimate of ${typical}</p>
        </div>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Email</td>
              <td style="padding: 8px 0; font-weight: 600;">${submission.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Project</td>
              <td style="padding: 8px 0;">${submission.description}</td>
            </tr>${submission.job_title ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Job Title</td>
              <td style="padding: 8px 0; font-weight: 600;">${submission.job_title}</td>
            </tr>` : ""}${submission.expected_cost ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Their Estimate</td>
              <td style="padding: 8px 0; font-weight: 600;">${submission.expected_cost}</td>
            </tr>` : ""}${submission.company_size ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company Size</td>
              <td style="padding: 8px 0; font-weight: 600;">${submission.company_size} employees</td>
            </tr>` : ""}
          </table>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Sent from Project Pricing Estimator
        </p>
      </div>
    `;

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pricing Estimator <notifications@profound.ly>",
        to: [NOTIFY_EMAIL],
        subject: `Estimate feedback: ${ratingLabel} — ${submission.email}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
