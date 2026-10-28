import { randomUUID } from "node:crypto";
import type { ApiRequest, ApiResponse } from "../_lib/http";
import { bodyObject, json, stringField } from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";
import { createAdminSupabase, OFFER_BUCKET } from "../_lib/supabase";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024;

export default async function uploadUrl(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!requireAdmin(req, res)) return;
  const body = bodyObject(req);
  const mimeType = typeof body?.content_type === "string" ? body.content_type : "";
  const fileName = stringField(body?.file_name, 180, 1);
  const size = Number(body?.size_bytes);
  const extension = MIME_EXTENSIONS[mimeType];
  if (!body || !fileName || !extension || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) {
    json(res, 400, { error: "الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 4 ميغابايت." });
    return;
  }
  try {
    const supabase = createAdminSupabase();
    const path = `offers/${randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage.from(OFFER_BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token) {
      json(res, 503, { error: "تعذر إنشاء رابط رفع الصورة. تحقق من إعداد Supabase Storage." });
      return;
    }
    json(res, 200, { path, token: data.token });
  } catch {
    json(res, 503, { error: "تأكد من إعداد مفتاح Supabase السري على Vercel." });
  }
}
