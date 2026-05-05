DO $$
DECLARE
  existing_job_id bigint;
  cron_secret text;
BEGIN
  SELECT jobid
    INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'send-habit-reminders-every-minute';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  SELECT decrypted_secret
    INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE EXCEPTION 'CRON_SECRET is not configured';
  END IF;

  PERFORM cron.schedule(
    'send-habit-reminders-every-minute',
    '* * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        body := '{}'::jsonb,
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        timeout_milliseconds := 5000
      );
      $job$,
      'https://bfrfdgsmbkuchebplver.supabase.co/functions/v1/send-habit-reminders',
      cron_secret
    )
  );
END $$;