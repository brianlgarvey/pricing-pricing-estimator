#!/usr/bin/env -S npx tsx
//
// Import proposals from a CSV file into the Supabase `proposals` table.
// Strips PII columns (provider/customer names and IDs) before inserting.
//
// Usage:
//   npx tsx scripts/import-proposals.ts [path/to/proposals.csv]
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
// (or a .env file in the project root).
//
// By default reads from public/data/proposals.csv if no path is given.

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  console.error("Set them in your environment or a .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const csvPath = resolve(process.argv[2] || "data/proposals.csv");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,£]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Reading CSV from: ${csvPath}`);
  const csvText = readFileSync(csvPath, "utf-8");

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Map to the columns we keep (stripping PII)
  const proposals = rows
    .map((row) => ({
      proposal_id: parseInt(row.proposal_id) || 0,
      job_id: parseInt(row.job_id) || 0,
      job_title: (row.job_title || "").trim(),
      job_description: (row.job_description || "").trim(),
      currency: (row.currency || "usd").toLowerCase(),
      proposed_price: parsePrice(row.proposed_price),
      proposal_status: (row.proposal_status || "").trim(),
      created_at: row.created_at || new Date().toISOString(),
    }))
    .filter((p) => p.proposal_id > 0 && p.job_title);

  console.log(`${proposals.length} valid proposals after filtering`);

  // Upsert the new data first, then remove anything no longer present. This
  // avoids the empty-table window a delete-then-insert would create: the
  // `estimate` function always sees a fully populated table.
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < proposals.length; i += BATCH_SIZE) {
    const batch = proposals.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("proposals")
      .upsert(batch, { onConflict: "proposal_id" });

    if (insertError) {
      console.error(
        `Failed to insert batch ${i}-${i + batch.length}:`,
        insertError.message
      );
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Upserted ${inserted}/${proposals.length}`);
  }

  // Delete stale rows: any proposal_id in the table but not in this import.
  const importedIds = new Set(proposals.map((p) => p.proposal_id));
  const { data: existing, error: fetchError } = await supabase
    .from("proposals")
    .select("proposal_id");

  if (fetchError) {
    console.error("Failed to read existing proposals:", fetchError.message);
    process.exit(1);
  }

  const staleIds = (existing ?? [])
    .map((r) => r.proposal_id as number)
    .filter((id) => !importedIds.has(id));

  if (staleIds.length > 0) {
    console.log(`Removing ${staleIds.length} stale proposals...`);
    for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
      const chunk = staleIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from("proposals")
        .delete()
        .in("proposal_id", chunk);

      if (deleteError) {
        console.error("Failed to delete stale proposals:", deleteError.message);
        process.exit(1);
      }
    }
  }

  console.log(`\nDone. ${inserted} proposals imported, ${staleIds.length} removed.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
