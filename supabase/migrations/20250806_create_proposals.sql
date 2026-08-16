-- Proposals table for the estimator.
-- Stores only the columns needed for similarity search and price estimation.
-- PII (provider/customer names and IDs) is stripped at import time.

create table if not exists proposals (
  id            bigint generated always as identity primary key,
  proposal_id   integer not null,
  job_id        integer not null,
  job_title     text    not null,
  job_description text  not null default '',
  currency      text    not null default 'usd',
  proposed_price numeric not null default 0,
  proposal_status text  not null default '',
  created_at    timestamptz not null default now(),

  constraint proposals_proposal_id_key unique (proposal_id)
);

-- Index for potential future queries by job_id
create index if not exists idx_proposals_job_id on proposals (job_id);

-- RLS: no policies are defined for anon/authenticated, so with RLS enabled
-- those roles cannot read, insert, update, or delete any rows. The only access
-- path is the `estimate` edge function, which uses the service role key and
-- bypasses RLS. This keeps the raw proposal data (including free-text
-- job_description) off the public PostgREST API served with the publishable key.
alter table proposals enable row level security;

-- Explicitly drop the previously permissive read policy in case an earlier
-- version of this migration was already applied to the database.
drop policy if exists "Allow read access for all users" on proposals;
