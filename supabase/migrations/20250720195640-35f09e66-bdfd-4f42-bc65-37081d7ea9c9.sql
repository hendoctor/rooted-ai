-- Set up periodic notifications cron job
SELECT cron.schedule(
  'send-push-notifications',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://ylewpehqfgltbhpkaout.supabase.co/functions/v1/send-push-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZXdwZWhxZmdsdGJocGthb3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDkzMTcsImV4cCI6MjA2NTQyNTMxN30.ljNvNQSG0A2RsRkW8WXxADiOqVmZywD2GX318riotXs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);