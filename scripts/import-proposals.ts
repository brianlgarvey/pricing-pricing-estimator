#!/usr/bin/env -S npx tsx
//
// Import proposals from a CSV file into the Supabase `proposals` table.
// Strips PII columns (provider/customer names and IDs) before inserting.
//
// Usage:
//   npm run import:proposals [-- path/to/proposals.csv]
//
// Reads Supabase credentials from a .env file in the project root (or from real
// exported environment variables, which take precedence). Needs:
//   - SUPABASE_URL (falls back to the frontend's VITE_SUPABASE_URL)
//   - SUPABASE_SERVICE_ROLE_KEY  (server-side only; must NOT be VITE_-prefixed,
//     or Vite would bundle this RLS-bypassing key into the public browser build)
//
// By default reads the CSV from data/proposals.csv if no path is given.

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env if present. This does not override real exported env vars, and is a
// no-op when there is no .env, so both the .env and export workflows work.
dotenv.config({ quiet: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// The URL is not secret and the frontend already stores it as VITE_SUPABASE_URL,
// so reuse that as a fallback: an admin then only adds the service role key.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase credentials. Add them to your .env (or export them):"
  );
  console.error("  SUPABASE_URL=...            (or reuse VITE_SUPABASE_URL)");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...   (server-side; no VITE_ prefix)");
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
    // Strip a leading UTF-8 BOM if present. Without this, a BOM binds to the
    // first header ("proposal_id"), so every row's id parses as 0, gets
    // filtered out, and the stale-row cleanup below would wipe the table.
    bom: true,
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

  // Safety guard: never let an empty parse wipe the table. The stale-row
  // cleanup below deletes every id not present in this import, so proceeding
  // with zero rows (a wrong/truncated file, a parse failure, an unexpected
  // header) would clear all proposals. Abort instead and leave the data intact.
  if (proposals.length === 0) {
    console.error(
      "Refusing to import: 0 valid proposals parsed from the CSV. " +
        "Check the file path, headers, and contents. No changes were made."
    );
    process.exit(1);
  }

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
