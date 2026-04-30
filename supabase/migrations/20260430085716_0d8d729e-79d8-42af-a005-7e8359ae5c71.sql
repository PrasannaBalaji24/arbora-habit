-- Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Unschedule existing cron job that uses pg_net (will be recreated below)
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

-- Reschedule the reminder cron job using the relocated http_post
SELECT cron.schedule(
  'send-habit-reminders-every-minute',
  '* * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://bfrfdgsmbkuchebplver.supabase.co/functions/v1/send-habit-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmZkZ3NtYmt1Y2hlYnBsdmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzM1MTMsImV4cCI6MjA5MzEwOTUxM30.RPXLDYYAFhI2LghU9lNp06nqiqLbKpG7b7D5TJMZXqk'
    ),
    body := '{}'::jsonb
  );
  $$
);