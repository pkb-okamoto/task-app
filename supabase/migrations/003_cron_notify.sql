-- =========================================
-- 003_cron_notify.sql
-- pg_cronを使って毎朝9時・16時にメール通知APIを呼び出す
-- =========================================

-- pg_cron拡張を有効化（Supabaseではデフォルトで利用可能）
SELECT cron.schedule(
  'notify-9am',       -- ジョブ名
  '0 0 * * *',        -- UTC 0:00 = JST 9:00
  $$
  SELECT net.http_post(
    url := 'https://YOUR_APP_URL/api/notify',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer taskboard-cron-secret-2026"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'notify-4pm',       -- ジョブ名
  '0 7 * * *',        -- UTC 7:00 = JST 16:00
  $$
  SELECT net.http_post(
    url := 'https://YOUR_APP_URL/api/notify',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer taskboard-cron-secret-2026"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
