import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { json, sameOrigin } from "../_lib/http.js";
import { clearAdminCookie } from "../_lib/admin-auth.js";

export default function logout(req: ApiRequest, res: ApiResponse): void {
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
  clearAdminCookie(res);
  json(res, 200, { ok: true });
}
