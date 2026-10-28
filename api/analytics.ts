import type { ApiRequest, ApiResponse } from "./_lib/http.js";
import { bodyObject, clientIpKey, empty, isUuid, json, sameOrigin, stringField } from "./_lib/http.js";
import { createAdminSupabase } from "./_lib/supabase.js";

const buckets = new Map<string, { count: number; resetAt: number }>();
const allowedTypes = new Set(["page_view", "service_click", "offer_click", "search"]);
const CONTACT_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|[+0-9٠-٩۰-۹][0-9٠-٩۰-۹\s()+-]{7,}/i;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  if (current.count >= 100) return true;
  current.count += 1;
  return false;
}

export default async function analytics(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    json(res, 405, { error: "طريقة الطلب غير مدعومة." });
    return;
  }
  if (!sameOrigin(req)) {
    json(res, 403, { error: "طلب غير مسموح." });
    return;
  }
  if (rateLimited(clientIpKey(req))) {
    empty(res, 429);
    return;
  }
  const body = bodyObject(req);
  const eventType = typeof body?.event_type === "string" && allowedTypes.has(body.event_type) ? body.event_type : null;
  const label = stringField(body?.label, 160, 1);
  if (!body || !eventType || !label) {
    empty(res);
    return;
  }
  const serviceId = isUuid(body.service_id) ? body.service_id : null;
  const offerId = isUuid(body.offer_id) ? body.offer_id : null;
  if (eventType === "service_click" && offerId) { empty(res); return; }
  if (eventType === "offer_click" && serviceId) { empty(res); return; }
  if (["page_view", "search"].includes(eventType) && (serviceId || offerId)) { empty(res); return; }

  let searchTerm: string | null = null;
  if (eventType === "search") {
    const raw = stringField(body.search_term, 100, 2)?.replace(/\s+/g, " ") ?? "";
    if (raw.length < 2 || CONTACT_PATTERN.test(raw)) { empty(res); return; }
    searchTerm = raw;
  } else if (body.search_term !== undefined && body.search_term !== null) {
    empty(res);
    return;
  }

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("albugmi2_analytics").insert({
      event_type: eventType,
      label,
      service_id: serviceId,
      offer_id: offerId,
      search_term: searchTerm,
    });
    if (error) {
      empty(res, 204);
      return;
    }
    empty(res);
  } catch {
    // Keep client navigation available even before the owner completes Vercel secrets.
    empty(res);
  }
}
