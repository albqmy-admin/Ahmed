-- مكتب البقمي 2: طلبات الخدمات. Additive migration; no existing data is changed or removed.
CREATE SCHEMA IF NOT EXISTS albugmi2_private;
REVOKE ALL ON SCHEMA albugmi2_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS albugmi2_private.admin_access (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  code_sha256 text NOT NULL CHECK (code_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

-- Only the SHA-256 digest of a randomly generated 256-bit owner code is stored.
INSERT INTO albugmi2_private.admin_access (singleton, code_sha256)
VALUES (true, '3466ea47b9a2764713f4b1fffa73e6cae2634c38a6acb39b08a25f55156c41cb')
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.albugmi2_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 24 AND phone ~ '^[+0-9٠-٩۰-۹ ()-]+$'),
  email text CHECK (email IS NULL OR char_length(email) <= 254),
  category text NOT NULL,
  service text NOT NULL,
  details text NOT NULL CHECK (char_length(btrim(details)) BETWEEN 5 AND 1500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting_customer', 'completed', 'cancelled')),
  staff_note text CHECK (staff_note IS NULL OR char_length(staff_note) <= 1500),
  CONSTRAINT albugmi2_request_service_category_check CHECK (
    (category = 'خدمات الهيئة العامة للنقل' AND service IN (
      'إصدار أو تجديد تراخيص النقل', 'إصدار كروت التشغيل', 'زيادة عدد كروت التشغيل حتى 100 سيارة',
      'تعديل التصنيفات', 'بطاقات السائقين', 'ربط المركبات', 'خدمات النقل للمنشآت'
    )) OR
    (category = 'خدمات التأمين' AND service IN (
      'تأمين ضد الغير', 'التأمين الشامل للأفراد أو الشركات', 'نقل التأمين', 'متابعة استرداد مبالغ التأمين'
    )) OR
    (category = 'خدمات المركبات' AND service IN (
      'نقل ملكية السيارات', 'تجديد الاستمارات', 'تعديل اللون أو الموديل', 'اللوحات', 'كروت الجمرك', 'متابعة مطالبات الحوادث'
    )) OR
    (category = 'الخدمات الحكومية والإلكترونية' AND service IN (
      'خدمات أبشر', 'خدمات ناجز', 'خدمات نفاذ', 'تصاريح دخول مكة', 'خدمات أمانة جدة', 'خدمات المنشآت', 'متابعة الطلبات'
    ))
  )
);

CREATE INDEX IF NOT EXISTS albugmi2_requests_created_at_idx
  ON public.albugmi2_service_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS albugmi2_requests_status_created_at_idx
  ON public.albugmi2_service_requests (status, created_at DESC);

ALTER TABLE public.albugmi2_service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.albugmi2_service_requests FROM PUBLIC, anon, authenticated;
GRANT INSERT (customer_name, phone, email, category, service, details)
  ON TABLE public.albugmi2_service_requests TO anon, authenticated;
DROP POLICY IF EXISTS albugmi2_public_request_insert ON public.albugmi2_service_requests;
CREATE POLICY albugmi2_public_request_insert
  ON public.albugmi2_service_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new' AND staff_note IS NULL);

CREATE OR REPLACE FUNCTION public.albugmi2_touch_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.albugmi2_touch_request_updated_at() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS albugmi2_request_updated_at ON public.albugmi2_service_requests;
CREATE TRIGGER albugmi2_request_updated_at
  BEFORE UPDATE ON public.albugmi2_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.albugmi2_touch_request_updated_at();

CREATE OR REPLACE FUNCTION public.albugmi2_admin_validate(p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
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
REVOKE ALL ON FUNCTION public.albugmi2_admin_validate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_validate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_list_requests(
  p_code text,
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS SETOF public.albugmi2_service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;

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
REVOKE ALL ON FUNCTION public.albugmi2_admin_list_requests(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_list_requests(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_request_stats(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;

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
REVOKE ALL ON FUNCTION public.albugmi2_admin_request_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_request_stats(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.albugmi2_admin_update_request(
  p_code text,
  p_request_id uuid,
  p_status text,
  p_staff_note text DEFAULT NULL
)
RETURNS public.albugmi2_service_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  updated_request public.albugmi2_service_requests;
BEGIN
  IF NOT public.albugmi2_admin_validate(p_code) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Unauthorized';
  END IF;
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
REVOKE ALL ON FUNCTION public.albugmi2_admin_update_request(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.albugmi2_admin_update_request(text, uuid, text, text) TO anon, authenticated;
