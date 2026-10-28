import type { ApiRequest, ApiResponse, JsonObject } from "../_lib/http.js";
import { bodyObject, isUuid, json, stringField } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin-auth.js";
import { createAdminSupabase } from "../_lib/supabase.js";

const validIcons = new Set(["transport", "insurance", "vehicles", "digital"]);

function integerField(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 10000 ? number : null;
}

function activeField(value: unknown): boolean {
  return value !== false;
}

function recordFor(kind: string, body: JsonObject): { table: string; values: Record<string, unknown> } | null {
  const order = integerField(body.sort_order, 0);
  if (order === null) return null;
  if (kind === "category") {
    const name = stringField(body.name, 120, 2);
    const kicker = stringField(body.kicker ?? "", 80);
    const description = stringField(body.description ?? "", 500);
    const iconKey = typeof body.icon_key === "string" && validIcons.has(body.icon_key) ? body.icon_key : "transport";
    if (!name || kicker === null || description === null) return null;
    return {
      table: "albugmi2_service_categories",
      values: { name, kicker, description, icon_key: iconKey, sort_order: order, active: activeField(body.active) },
    };
  }
  if (kind === "service") {
    const categoryId = isUuid(body.category_id) ? body.category_id : null;
    const name = stringField(body.name, 150, 2);
    const description = stringField(body.description ?? "", 500);
    if (!categoryId || !name || description === null) return null;
    return {
      table: "albugmi2_services",
      values: { category_id: categoryId, name, description, sort_order: order, active: activeField(body.active) },
    };
  }
  return null;
}

export default async function catalog(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!requireAdmin(req, res)) return;
  const body = bodyObject(req);
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const record = body && recordFor(kind, body);
  if (!body || !record) {
    json(res, 400, { error: "راجع اسم العنصر والوصف والترتيب." });
    return;
  }
  const id = body.id;
  if (id !== undefined && !isUuid(id)) {
    json(res, 400, { error: "معرّف العنصر غير صالح." });
    return;
  }
  try {
    const supabase = createAdminSupabase();
    const values = { ...record.values, updated_at: new Date().toISOString() };
    const result = typeof id === "string"
      ? await supabase.from(record.table).update(values).eq("id", id).select().single()
      : await supabase.from(record.table).insert(values).select().single();
    if (result.error || !result.data) {
      json(res, result.error?.code === "23505" ? 409 : 400, { error: "تعذر حفظ العنصر. تحقق من البيانات ثم حاول مجددًا." });
      return;
    }
    json(res, 200, { item: result.data });
  } catch {
    json(res, 503, { error: "تأكد من إعداد مفتاح Supabase السري على Vercel." });
  }
}
