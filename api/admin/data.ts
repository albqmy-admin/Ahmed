import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { json } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin-auth.js";
import { createAdminSupabase } from "../_lib/supabase.js";

export default async function adminData(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!requireAdmin(req, res)) return;
  try {
    const supabase = createAdminSupabase();
    const [categories, services, offers, analytics] = await Promise.all([
      supabase.from("albugmi2_service_categories").select("id,name,kicker,description,icon_key,sort_order,active,created_at,updated_at").order("sort_order"),
      supabase.from("albugmi2_services").select("id,category_id,name,description,sort_order,active,created_at,updated_at").order("sort_order"),
      supabase.from("albugmi2_offers").select("id,title,description,discount_label,valid_from,valid_until,image_path,service_id,sort_order,active,created_at,updated_at").order("sort_order"),
      supabase.rpc("albugmi2_admin_analytics_summary"),
    ]);
    const firstError = categories.error || services.error || offers.error || analytics.error;
    if (firstError) {
      json(res, 500, { error: "تعذر تحميل بيانات لوحة الإدارة." });
      return;
    }
    json(res, 200, {
      categories: categories.data ?? [],
      services: services.data ?? [],
      offers: offers.data ?? [],
      analytics: analytics.data ?? null,
    });
  } catch {
    json(res, 503, { error: "تأكد من إعداد SUPABASE_SECRET_KEY في بيئة Vercel." });
  }
}
