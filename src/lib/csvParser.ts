import Papa from "papaparse";

export interface Proposal {
  proposal_id: number;
  job_id: number;
  job_title: string;
  job_description: string;
  currency: string;
  proposed_price: number;
  proposal_status: string;
  created_at: string;
}

interface RawProposalRow {
  proposal_id: string;
  job_id: string;
  job_title: string;
  job_description: string;
  currency: string;
  proposed_price: string;
  proposal_status: string;
  created_at: string;
}

function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,£]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Minimum price threshold — filters out hourly rates, placeholders ($1), and
// other non-project-level prices that would skew estimates.
const MIN_PROJECT_PRICE = 200;

export async function loadProposals(): Promise<Proposal[]> {
  const response = await fetch("/data/proposals.csv");
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<RawProposalRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const proposals: Proposal[] = results.data
          .map((row) => ({
            proposal_id: parseInt(row.proposal_id) || 0,
            job_id: parseInt(row.job_id) || 0,
            job_title: (row.job_title || "").trim(),
            job_description: stripHtml(row.job_description || ""),
            currency: (row.currency || "usd").toLowerCase(),
            proposed_price: parsePrice(row.proposed_price),
            proposal_status: (row.proposal_status || "").trim(),
            created_at: row.created_at || "",
          }))
          .filter((p) => p.proposed_price >= MIN_PROJECT_PRICE && p.job_title);

        resolve(proposals);
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

export function deduplicateByJob(proposals: Proposal[]): Proposal[] {
  const jobMap = new Map<number, Proposal[]>();
  for (const p of proposals) {
    const existing = jobMap.get(p.job_id) || [];
    existing.push(p);
    jobMap.set(p.job_id, existing);
  }

  const result: Proposal[] = [];
  for (const [, group] of jobMap) {
    const accepted = group.find((p) => p.proposal_status === "ACCEPTED");
    result.push(accepted || group[0]);
  }
  return result;
}
