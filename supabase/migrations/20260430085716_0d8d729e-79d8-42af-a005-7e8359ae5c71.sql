-- Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Unschedule existing cron job (will be recreated by a later migration)
DO $$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'send-habit-reminders-every-minute';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;

-- Recreate pg_net in the extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- NOTE: The cron job rescheduling was removed from this migration.
-- The previous version hardcoded a Supabase service_role JWT in the Authorization
-- header, which is a secret and must never live in version-controlled code.
-- The job is now (re)created by migration 20260505113603 using the Vault-managed
-- CRON_SECRET passed via the `x-cron-secret` header.
