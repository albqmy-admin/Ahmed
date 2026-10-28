import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { bodyObject, isUuid, json, stringField } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin-auth.js";
import { createAdminSupabase } from "../_lib/supabase.js";

function dateValue(value: unknown, endOfDay = false): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+03:00`);
  return Number.isNaN(date.valueOf()) ? undefined : value;
}

export default async function offers(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!requireAdmin(req, res)) return;
  const body = bodyObject(req);
  if (!body) {
    json(res, 400, { error: "بيانات العرض غير مكتملة." });
    return;
  }
  const id = body.id;
  if (id !== undefined && !isUuid(id)) {
    json(res, 400, { error: "معرّف العرض غير صالح." });
    return;
  }
  const title = stringField(body.title, 120, 2);
  const description = stringField(body.description ?? "", 800);
  const discount = stringField(body.discount_label ?? "", 50);
  const validFrom = dateValue(body.valid_from);
  const validUntil = dateValue(body.valid_until, true);
  const imagePath = body.image_path === null || body.image_path === "" || body.image_path === undefined
    ? null
    : typeof body.image_path === "string" && body.image_path.startsWith("offers/") && body.image_path.length <= 300
      ? body.image_path
      : undefined;
  const serviceId = body.service_id === null || body.service_id === "" || body.service_id === undefined
    ? null
    : isUuid(body.service_id) ? body.service_id : undefined;
  const sortOrder = body.sort_order === undefined ? 0 : Number(body.sort_order);
  if (!title || description === null || discount === null || validFrom === undefined || validUntil === undefined
    || imagePath === undefined || serviceId === undefined
    || !Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000
    || (validFrom && validUntil && validFrom > validUntil)) {
    json(res, 400, { error: "تحقق من عنوان العرض والخصم والتواريخ والصورة." });
    return;
  }
  try {
    const supabase = createAdminSupabase();
    const values = {
      title,
      description,
      discount_label: discount,
      valid_from: validFrom,
      valid_until: validUntil,
      image_path: imagePath,
      service_id: serviceId,
      sort_order: sortOrder,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    };
    const result = typeof id === "string"
      ? await supabase.from("albugmi2_offers").update(values).eq("id", id).select().single()
      : await supabase.from("albugmi2_offers").insert(values).select().single();
    if (result.error || !result.data) {
      json(res, result.error?.code === "23505" ? 409 : 400, { error: "تعذر حفظ العرض. تحقق من البيانات وحاول مجددًا." });
      return;
    }
    json(res, 200, { item: result.data });
  } catch {
    json(res, 503, { error: "تأكد من إعداد مفتاح Supabase السري على Vercel." });
  }
}
