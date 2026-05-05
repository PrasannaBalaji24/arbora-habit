-- Unschedule the cron job if present. Re-creation happens in migration
-- 20260505113603 using the Vault-managed CRON_SECRET via the `x-cron-secret`
-- header. No JWTs or other secrets must live in committed migration SQL.
DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
    INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'send-habit-reminders-every-minute';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END $$;
