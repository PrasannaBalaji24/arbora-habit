SELECT cron.unschedule('send-habit-reminders-every-minute');
SELECT cron.schedule(
  'send-habit-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bfrfdgsmbkuchebplver.supabase.co/functions/v1/send-habit-reminders',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    timeout_milliseconds := 5000
  );
  $$
);