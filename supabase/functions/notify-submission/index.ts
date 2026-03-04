import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "brian@profound.ly";

interface EstimatePayload {
  email: string;
  description: string;
  jobTitle?: string;
  expectedCost?: string;
  companySize?: string;
  estimate: {
    low: number;
    typical: number;
    high: number;
    currency: string;
    matchCount: number;
    confidence: string;
  };
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    usd: "$",
    cad: "CA$",
    gbp: "£",
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
    const { email, description, jobTitle, expectedCost, companySize, estimate }: EstimatePayload = await req.json();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const low = formatCurrency(estimate.low, estimate.currency);
    const typical = formatCurrency(estimate.typical, estimate.currency);
    const high = formatCurrency(estimate.high, estimate.currency);

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e; margin-bottom: 4px;">New Pricing Estimate Request</h2>
        <p style="color: #6b7280; margin-top: 0;">Someone just used the Project Pricing Estimator</p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Email</td>
              <td style="padding: 8px 0; font-weight: 600;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Project</td>
              <td style="padding: 8px 0;">${description}</td>
            </tr>${jobTitle ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Job Title</td>
              <td style="padding: 8px 0; font-weight: 600;">${jobTitle}</td>
            </tr>` : ""}${expectedCost ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Their Estimate</td>
              <td style="padding: 8px 0; font-weight: 600;">${expectedCost}</td>
            </tr>` : ""}${companySize ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company Size</td>
              <td style="padding: 8px 0; font-weight: 600;">${companySize} employees</td>
            </tr>` : ""}
          </table>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Estimate Results</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Low End</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">${low}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534; font-size: 14px; font-weight: 600;">Middle</td>
              <td style="padding: 6px 0; font-weight: 700; text-align: right; font-size: 18px; color: #166534;">${typical}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">High End</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right;">${high}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Confidence</td>
              <td style="padding: 6px 0; text-align: right; text-transform: capitalize;">${estimate.confidence}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Similar proposals</td>
              <td style="padding: 6px 0; text-align: right;">${estimate.matchCount}</td>
            </tr>
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
        subject: `New estimate: ${email} — ${typical} middle`,
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
