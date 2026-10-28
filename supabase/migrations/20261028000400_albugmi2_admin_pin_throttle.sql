-- Rate-limit the six-digit admin PIN in a durable store without persisting raw client IPs.
-- The API derives ip_fingerprint with HMAC-SHA256 using a server-only Supabase secret.
CREATE TABLE IF NOT EXISTS public.albugmi2_admin_login_throttle (
  ip_fingerprint text PRIMARY KEY CHECK (ip_fingerprint ~ '^[0-9a-f]{64}$'),
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.albugmi2_admin_login_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.albugmi2_admin_login_throttle FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.albugmi2_admin_login_throttle TO service_role;
CREATE INDEX IF NOT EXISTS albugmi2_admin_login_throttle_updated_idx
  ON public.albugmi2_admin_login_throttle (updated_at);

CREATE OR REPLACE FUNCTION public.albugmi2_admin_login_throttle_status(p_ip_fingerprint text)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT COALESCE((
    SELECT GREATEST(1, CEIL(EXTRACT(epoch FROM throttle.blocked_until - pg_catalog.now()))::integer)
    FROM public.albugmi2_admin_login_throttle AS throttle
    WHERE throttle.ip_fingerprint = p_ip_fingerprint
      AND throttle.blocked_until > pg_catalog.now()
    LIMIT 1
  ), 0);
$function$;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_login_record_failure(p_ip_fingerprint text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_blocked_until timestamptz;
  v_cutoff timestamptz := pg_catalog.now() - interval '15 minutes';
BEGIN
  IF p_ip_fingerprint IS NULL OR p_ip_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit fingerprint';
  END IF;

  INSERT INTO public.albugmi2_admin_login_throttle AS existing (
    ip_fingerprint, failed_attempts, window_started_at, blocked_until, updated_at
  ) VALUES (
    p_ip_fingerprint, 1, pg_catalog.now(), NULL, pg_catalog.now()
  )
  ON CONFLICT (ip_fingerprint) DO UPDATE SET
    window_started_at = CASE
      WHEN existing.window_started_at <= v_cutoff THEN pg_catalog.now()
      ELSE existing.window_started_at
    END,
    failed_attempts = CASE
      WHEN existing.window_started_at <= v_cutoff THEN 1
      ELSE LEAST(existing.failed_attempts + 1, 5)
    END,
    blocked_until = CASE
      WHEN existing.window_started_at <= v_cutoff THEN NULL
      WHEN existing.blocked_until > pg_catalog.now() THEN existing.blocked_until
      WHEN existing.failed_attempts + 1 >= 5 THEN pg_catalog.now() + interval '15 minutes'
      ELSE NULL
    END,
    updated_at = pg_catalog.now()
  RETURNING blocked_until INTO v_blocked_until;

  DELETE FROM public.albugmi2_admin_login_throttle
  WHERE updated_at < pg_catalog.now() - interval '7 days';

  IF v_blocked_until > pg_catalog.now() THEN
    RETURN GREATEST(1, CEIL(EXTRACT(epoch FROM v_blocked_until - pg_catalog.now()))::integer);
  END IF;
  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_login_clear_failures(p_ip_fingerprint text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  DELETE FROM public.albugmi2_admin_login_throttle
  WHERE ip_fingerprint = p_ip_fingerprint
    AND p_ip_fingerprint ~ '^[0-9a-f]{64}$';
$function$;

REVOKE ALL ON FUNCTION public.albugmi2_admin_login_throttle_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.albugmi2_admin_login_record_failure(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.albugmi2_admin_login_clear_failures(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_login_throttle_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_login_record_failure(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_login_clear_failures(text) TO service_role;
