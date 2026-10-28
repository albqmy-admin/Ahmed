import type { ApiRequest, ApiResponse } from "../_lib/http";
import { bodyObject, json, sameOrigin, stringField } from "../_lib/http";
import { adminIpFingerprint, hasAdminCode, setAdminCookie, verifyAccessCode } from "../_lib/admin-auth";
import { createAdminSupabase, hasAdminSupabaseConfig } from "../_lib/supabase";

function lockedResponse(res: ApiResponse, seconds: number): void {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  json(res, 429, { error: `تم إيقاف الدخول مؤقتًا بعد خمس محاولات خاطئة. حاول بعد ${minutes} دقيقة.` });
}

export default async function login(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!sameOrigin(req)) {
    json(res, 403, { error: "طلب غير مسموح." });
    return;
  }
  if (!hasAdminCode()) {
    json(res, 503, { error: "اضبط ADMIN_ACCESS_CODE في Vercel على ستة أرقام بالضبط." });
    return;
  }
  if (!hasAdminSupabaseConfig()) {
    json(res, 503, { error: "إعداد مفتاح Supabase السري غير مكتمل على الخادم." });
    return;
  }

  const fingerprint = adminIpFingerprint(req);
  if (!fingerprint) {
    json(res, 503, { error: "تعذر إعداد حماية تسجيل الدخول." });
    return;
  }

  try {
    const supabase = createAdminSupabase();
    const { data: blockedSeconds, error: statusError } = await supabase.rpc(
      "albugmi2_admin_login_throttle_status",
      { p_ip_fingerprint: fingerprint },
    );
    if (statusError) {
      json(res, 503, { error: "تعذر التحقق من حماية تسجيل الدخول. حاول لاحقًا." });
      return;
    }
    const activeLock = Number(blockedSeconds) || 0;
    if (activeLock > 0) {
      lockedResponse(res, activeLock);
      return;
    }

    const body = bodyObject(req);
    const code = stringField(body?.code, 12, 6) ?? "";
    if (!verifyAccessCode(code)) {
      const { data: retrySeconds, error: recordError } = await supabase.rpc(
        "albugmi2_admin_login_record_failure",
        { p_ip_fingerprint: fingerprint },
      );
      if (recordError) {
        json(res, 503, { error: "تعذر تسجيل محاولة الدخول. حاول لاحقًا." });
        return;
      }
      const seconds = Number(retrySeconds) || 0;
      if (seconds > 0) lockedResponse(res, seconds);
      else json(res, 401, { error: "رمز الإدارة غير صحيح." });
      return;
    }

    const { error: clearError } = await supabase.rpc(
      "albugmi2_admin_login_clear_failures",
      { p_ip_fingerprint: fingerprint },
    );
    if (clearError || !setAdminCookie(res)) {
      json(res, 503, { error: "تعذر بدء جلسة الإدارة الآمنة. حاول لاحقًا." });
      return;
    }
    json(res, 200, { ok: true });
  } catch {
    json(res, 503, { error: "تعذر الاتصال بإعدادات الإدارة. حاول لاحقًا." });
  }
}
