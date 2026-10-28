import { supabase } from "./supabase";
import { offerPublicUrl, type PublicOffer, type ServiceCategory, type ServiceItem } from "./catalog";

export type AnalyticsPoint = { day: string; visits: number; serviceClicks: number; offerClicks: number; searches: number };
export type PopularItem = { label: string; count: number };
export type AnalyticsSummary = {
  totalVisits: number;
  serviceClicks: number;
  offerClicks: number;
  searches: number;
  daily: AnalyticsPoint[];
  topServices: PopularItem[];
  serviceClicksByService: (PopularItem & { serviceId: string })[];
  topOffers: PopularItem[];
  topSearches: PopularItem[];
};
export type AdminData = {
  categories: ServiceCategory[];
  services: ServiceItem[];
  offers: PublicOffer[];
  analytics: AnalyticsSummary | null;
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  let payload: { error?: string } & Record<string, unknown> = {};
  try { payload = await response.json() as typeof payload; } catch { /* no JSON response */ }
  if (!response.ok) throw new Error(payload.error || "تعذر إكمال العملية. حاول مجددًا.");
  return payload as T;
}

export const loginAdmin = (code: string) => request<{ ok: true }>("/api/admin/login", { method: "POST", body: JSON.stringify({ code }) });
export const logoutAdmin = () => request<{ ok: true }>("/api/admin/logout", { method: "POST", body: JSON.stringify({}) });
export const loadAdminData = () => request<AdminData>("/api/admin/data", { method: "GET" });

export function saveCatalogItem(item: Record<string, unknown>) {
  return request<{ item: ServiceCategory | ServiceItem }>("/api/admin/catalog", { method: "POST", body: JSON.stringify(item) });
}

export function saveOffer(item: Record<string, unknown>) {
  return request<{ item: PublicOffer }>("/api/admin/offers", { method: "POST", body: JSON.stringify(item) });
}

export async function uploadOfferImage(file: File): Promise<string> {
  const signed = await request<{ path: string; token: string }>("/api/admin/upload-url", {
    method: "POST",
    body: JSON.stringify({ file_name: file.name, content_type: file.type, size_bytes: file.size }),
  });
  const { error } = await supabase.storage.from("albugmi2-offers").uploadToSignedUrl(signed.path, signed.token, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error("تعذر رفع الصورة إلى Supabase Storage.");
  return signed.path;
}

export { offerPublicUrl };
