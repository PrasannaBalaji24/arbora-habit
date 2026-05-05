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

SELECT cron.schedule(
  'send-habit-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bfrfdgsmbkuchebplver.supabase.co/functions/v1/send-habit-reminders',
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmZkZ3NtYmt1Y2hlYnBsdmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUzMzUxMywiZXhwIjoyMDkzMTA5NTEzfQ.z04EIcyp0JXYawWrryUY7tTPp8V2PqUb10D6BOAGI5c'
    ),
    timeout_milliseconds := 5000
  );
  $$
);