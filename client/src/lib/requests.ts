import { supabase } from "./supabase";

export const serviceCatalog = {
  "خدمات الهيئة العامة للنقل": [
    "إصدار أو تجديد تراخيص النقل",
    "إصدار كروت التشغيل",
    "زيادة عدد كروت التشغيل حتى 100 سيارة",
    "تعديل التصنيفات",
    "بطاقات السائقين",
    "ربط المركبات",
    "خدمات النقل للمنشآت",
  ],
  "خدمات التأمين": [
    "تأمين ضد الغير",
    "التأمين الشامل للأفراد أو الشركات",
    "نقل التأمين",
    "متابعة استرداد مبالغ التأمين",
  ],
  "خدمات المركبات": [
    "نقل ملكية السيارات",
    "تجديد الاستمارات",
    "تعديل اللون أو الموديل",
    "اللوحات",
    "كروت الجمرك",
    "متابعة مطالبات الحوادث",
  ],
  "الخدمات الحكومية والإلكترونية": [
    "خدمات أبشر",
    "خدمات ناجز",
    "خدمات نفاذ",
    "تصاريح دخول مكة",
    "خدمات أمانة جدة",
    "خدمات المنشآت",
    "متابعة الطلبات",
  ],
} as const;

export type RequestCategory = keyof typeof serviceCatalog;
export type RequestStatus = "new" | "in_progress" | "waiting_customer" | "completed" | "cancelled";

export type RequestInput = {
  customer_name: string;
  phone: string;
  email?: string;
  category: RequestCategory;
  service: string;
  details: string;
};

export type ServiceRequest = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  phone: string;
  email: string | null;
  category: RequestCategory;
  service: string;
  details: string;
  status: RequestStatus;
  staff_note: string | null;
};

export const statusLabels: Record<RequestStatus, string> = {
  new: "طلب جديد",
  in_progress: "قيد الإجراء",
  waiting_customer: "بانتظار العميل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export type AdminStats = {
  total: number;
  new: number;
  in_progress: number;
  completed: number;
};

export async function createServiceRequest(input: RequestInput) {
  const { error } = await supabase.from("albugmi2_service_requests").insert({
    customer_name: input.customer_name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    category: input.category,
    service: input.service,
    details: input.details.trim(),
  });
  if (error) throw error;
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("albugmi2_admin_validate", { p_code: code });
  if (error) throw error;
  return data === true;
}

export async function getAdminRequests(code: string, status: string, search: string) {
  const { data, error } = await supabase.rpc("albugmi2_admin_list_requests", {
    p_code: code,
    p_status: status,
    p_search: search,
  });
  if (error) throw error;
  return (data ?? []) as ServiceRequest[];
}

export async function getAdminStats(code: string) {
  const { data, error } = await supabase.rpc("albugmi2_admin_request_stats", { p_code: code });
  if (error) throw error;
  return data as AdminStats;
}

export async function updateAdminRequest(
  code: string,
  requestId: string,
  status: RequestStatus,
  staffNote: string,
) {
  const { error } = await supabase.rpc("albugmi2_admin_update_request", {
    p_code: code,
    p_request_id: requestId,
    p_status: status,
    p_staff_note: staffNote.trim() || null,
  });
  if (error) throw error;
}
