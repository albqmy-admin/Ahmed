-- Supabase Cron gives deterministic retention for anonymous HMAC login fingerprints.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'albugmi2_admin_pin_throttle_cleanup',
  '0 * * * *',
  $sql$
    DELETE FROM public.albugmi2_admin_login_throttle
    WHERE updated_at < pg_catalog.now() - interval '7 days';
  $sql$
);
