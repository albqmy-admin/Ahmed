import { supabase } from "./supabase";

export type ServiceCategory = {
  id: string;
  name: string;
  kicker: string;
  description: string;
  icon_key: "transport" | "insurance" | "vehicles" | "digital" | string;
  sort_order: number;
  active: boolean;
};

export type ServiceItem = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

export type PublicOffer = {
  id: string;
  title: string;
  description: string;
  discount_label: string;
  valid_from: string | null;
  valid_until: string | null;
  image_path: string | null;
  image_url: string | null;
  service_id: string | null;
  sort_order: number;
  active: boolean;
};

export type PublicCatalog = {
  categories: ServiceCategory[];
  services: ServiceItem[];
  offers: PublicOffer[];
};

export const defaultCategories: ServiceCategory[] = [
  { id: "default-transport", name: "خدمات الهيئة العامة للنقل", kicker: "النقل والتراخيص", description: "إجراءات النقل والتراخيص وكروت التشغيل للمنشآت والسائقين.", icon_key: "transport", sort_order: 1, active: true },
  { id: "default-insurance", name: "خدمات التأمين", kicker: "حماية واطمئنان", description: "تأمين ضد الغير والتأمين الشامل للأفراد والشركات، ونقل التأمين ومتابعة الاسترداد.", icon_key: "insurance", sort_order: 2, active: true },
  { id: "default-vehicles", name: "خدمات المركبات", kicker: "كل ما يخص مركبتك", description: "نقل الملكية والاستمارات واللوحات وكروت الجمرك ومطالبات الحوادث.", icon_key: "vehicles", sort_order: 3, active: true },
  { id: "default-digital", name: "الخدمات الحكومية والإلكترونية", kicker: "خدماتك الإلكترونية", description: "أبشر وناجز ونفاذ وتصاريح مكة وخدمات أمانة جدة والمنشآت.", icon_key: "digital", sort_order: 4, active: true },
];

export const defaultServices: ServiceItem[] = [
  ["default-transport", ["إصدار وتجديد تراخيص النقل", "كروت التشغيل", "زيادة عدد كروت التشغيل حتى 100 سيارة", "تعديل التصنيفات", "بطاقات السائقين", "ربط المركبات", "خدمات النقل لصالح المنشآت"]],
  ["default-insurance", ["تأمين ضد الغير", "التأمين الشامل للأفراد", "التأمين الشامل للشركات", "نقل التأمين", "متابعة استرداد مبالغ التأمين"]],
  ["default-vehicles", ["نقل ملكية السيارات", "تجديد الاستمارات", "تعديل اللون والموديل", "اللوحات", "كروت الجمرك", "متابعة مطالبات الحوادث"]],
  ["default-digital", ["خدمات أبشر", "خدمات ناجز", "خدمات نفاذ", "تصاريح دخول مكة", "خدمات أمانة جدة", "خدمات المنشآت ومتابعة الطلبات"]],
].flatMap(([categoryId, names]) => (names as string[]).map((name, index) => ({
  id: `default-${categoryId}-${index}`,
  category_id: categoryId as string,
  name,
  description: "",
  sort_order: index + 1,
  active: true,
})));

export const offerPublicUrl = (path: string | null): string | null => {
  if (!path || !path.startsWith("offers/")) return null;
  return supabase.storage.from("albugmi2-offers").getPublicUrl(path).data.publicUrl;
};

export async function loadPublicCatalog(): Promise<PublicCatalog> {
  const [categoryResult, serviceResult, offerResult] = await Promise.all([
    supabase.from("albugmi2_service_categories").select("id,name,kicker,description,icon_key,sort_order,active").order("sort_order"),
    supabase.from("albugmi2_services").select("id,category_id,name,description,sort_order,active").order("sort_order"),
    supabase.from("albugmi2_offers").select("id,title,description,discount_label,valid_from,valid_until,image_path,service_id,sort_order,active").order("sort_order"),
  ]);

  if (categoryResult.error || serviceResult.error || offerResult.error) {
    return { categories: defaultCategories, services: defaultServices, offers: [] };
  }

  const categories = (categoryResult.data ?? []) as ServiceCategory[];
  const services = (serviceResult.data ?? []) as ServiceItem[];
  const offers = ((offerResult.data ?? []) as Omit<PublicOffer, "image_url">[]).map(offer => ({
    ...offer,
    image_url: offerPublicUrl(offer.image_path),
  }));

  return { categories, services, offers };
}
