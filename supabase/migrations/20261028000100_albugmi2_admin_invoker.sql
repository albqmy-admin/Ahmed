-- مكتب البقمي 2: narrow privileges to invoker + RLS; no request data is changed.
GRANT USAGE ON SCHEMA albugmi2_private TO anon, authenticated;
GRANT SELECT ON TABLE albugmi2_private.admin_access TO anon, authenticated;
GRANT SELECT ON TABLE public.albugmi2_service_requests TO anon, authenticated;
GRANT UPDATE (status, staff_note) ON TABLE public.albugmi2_service_requests TO anon, authenticated;

DROP POLICY IF EXISTS albugmi2_admin_request_read ON public.albugmi2_service_requests;
CREATE POLICY albugmi2_admin_request_read
  ON public.albugmi2_service_requests
  FOR SELECT TO anon, authenticated
  USING (public.albugmi2_admin_validate(pg_catalog.current_setting('albugmi2.admin_code', true)));

DROP POLICY IF EXISTS albugmi2_admin_request_update ON public.albugmi2_service_requests;
CREATE POLICY albugmi2_admin_request_update
  ON public.albugmi2_service_requests
  FOR UPDATE TO anon, authenticated
  USING (public.albugmi2_admin_validate(pg_catalog.current_setting('albugmi2.admin_code', true)))
  WITH CHECK (public.albugmi2_admin_validate(pg_catalog.current_setting('albugmi2.admin_code', true)));

CREATE OR REPLACE FUNCTION public.albugmi2_admin_validate(p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT p_code IS NOT NULL
    AND pg_catalog.char_length(p_code) BETWEEN 32 AND 200
    AND EXISTS (
      SELECT 1
      FROM albugmi2_private.admin_access AS access
      WHERE access.singleton
        AND access.code_sha256 = pg_catalog.encode(
          extensions.digest(pg_catalog.convert_to(p_code, 'UTF8'), 'sha256'),
          'hex'
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_list_requests(
  p_code text,
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS SETOF public.albugmi2_service_requests
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;
  PERFORM pg_catalog.set_config('albugmi2.admin_code', p_code, true);

  RETURN QUERY
  SELECT request.*
  FROM public.albugmi2_service_requests AS request
  WHERE (p_status = 'all' OR request.status = p_status)
    AND (
      NULLIF(pg_catalog.btrim(COALESCE(p_search, '')), '') IS NULL
      OR pg_catalog.concat_ws(' ', request.customer_name, request.phone, request.email,
        request.category, request.service, request.details)
        ILIKE ('%' || pg_catalog.btrim(COALESCE(p_search, '')) || '%')
    )
  ORDER BY request.created_at DESC
  LIMIT 300;
END;
$function$;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_request_stats(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;
  PERFORM pg_catalog.set_config('albugmi2.admin_code', p_code, true);

  RETURN (
    SELECT pg_catalog.jsonb_build_object(
      'total', pg_catalog.count(*),
      'new', pg_catalog.count(*) FILTER (WHERE status = 'new'),
      'in_progress', pg_catalog.count(*) FILTER (WHERE status = 'in_progress'),
      'completed', pg_catalog.count(*) FILTER (WHERE status = 'completed')
    )
    FROM public.albugmi2_service_requests
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_update_request(
  p_code text,
  p_request_id uuid,
  p_status text,
  p_staff_note text DEFAULT NULL
)
RETURNS public.albugmi2_service_requests
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  updated_request public.albugmi2_service_requests;
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;
  PERFORM pg_catalog.set_config('albugmi2.admin_code', p_code, true);
  IF p_status NOT IN ('new', 'in_progress', 'waiting_customer', 'completed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid request status';
  END IF;
  IF p_staff_note IS NOT NULL AND pg_catalog.char_length(p_staff_note) > 1500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Note is too long';
  END IF;

  UPDATE public.albugmi2_service_requests AS request
  SET status = p_status, staff_note = NULLIF(pg_catalog.btrim(p_staff_note), '')
  WHERE request.id = p_request_id
  RETURNING request.* INTO updated_request;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request not found';
  END IF;
  RETURN updated_request;
END;
$function$;
