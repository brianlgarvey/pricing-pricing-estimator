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

-- RLS: the table is read-only from the anon/authenticated roles.
-- Only the service role (used by edge functions) can insert/update/delete.
alter table proposals enable row level security;

create policy "Allow read access for all users"
  on proposals for select
  using (true);
