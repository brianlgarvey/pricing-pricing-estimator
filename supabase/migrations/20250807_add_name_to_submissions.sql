-- Persist the submitter's name captured in the email-capture modal.
-- Previously first/last name were collected in the UI and discarded; the
-- estimate edge function now stores them alongside the submission.
-- Idempotent so it is safe to re-run.

alter table submissions add column if not exists first_name text;
alter table submissions add column if not exists last_name text;
