import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowUpRight, BadgePercent, BarChart3, Building2, Check, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, Eye, FileText, ImagePlus, LayoutDashboard, Loader2,
  LogOut, MessageCircle, Pencil, Plus, Search, ShieldCheck, X,
} from "lucide-react";
import {
  loadAdminData, loginAdmin, logoutAdmin, offerPublicUrl, saveCatalogItem, saveOffer,
  uploadOfferImage, type AdminData, type AnalyticsSummary,
} from "@/lib/admin-api";
import type { PublicOffer, ServiceCategory, ServiceItem } from "@/lib/catalog";

const iconOptions = [
  ["transport", "النقل والتراخيص"],
  ["insurance", "التأمين"],
  ["vehicles", "المركبات"],
  ["digital", "الخدمات الإلكترونية"],
] as const;

const emptyAnalytics: AnalyticsSummary = {
  totalVisits: 0,
  serviceClicks: 0,
  offerClicks: 0,
  searches: 0,
  daily: [],
  topServices: [],
  serviceClicksByService: [],
  topOffers: [],
  topSearches: [],
};

const emptyOffer = {
  title: "",
  description: "",
  discount_label: "",
  valid_from: "",
  valid_until: "",
  image_path: "",
  service_id: "",
  sort_order: 0,
  active: true,
};

type Tab = "overview" | "services" | "offers";
type OfferDraft = typeof emptyOffer & { id?: string };

function showError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizePin(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function toInputDate(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function displayDay(value: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "short", day: "numeric", month: "numeric" }).format(new Date(`${value}T12:00:00+03:00`));
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`manage-status ${active ? "is-active" : "is-paused"}`}><i />{active ? "ظاهر للزوار" : "موقوف"}</span>;
}

function LoginScreen({ onLogin }: { onLogin: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(code);
      setCode("");
    } catch (cause) {
      setError(showError(cause, "تعذر تسجيل الدخول."));
    } finally {
      setBusy(false);
    }
  };
  return <main className="manage-login" dir="rtl">
    <div className="manage-login-card">
      <a className="portal-brand" href="/"><span className="portal-brand-mark"><span className="portal-mark-road" /><Check size={15} strokeWidth={3} /></span><span className="portal-brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>إدارة المكتب</small></span></a>
      <div className="manage-login-icon"><ShieldCheck size={25} /></div>
      <span className="portal-kicker">منطقة خاصة بالمالك</span>
      <h1>تسجيل دخول الإدارة</h1>
      <p>هذه الصفحة للإدارة فقط. لا يحتاج زوار الخدمات إلى تسجيل دخول.</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-code">رمز الإدارة</label>
        <input id="admin-code" type="password" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={event => setCode(normalizePin(event.target.value))} autoComplete="off" minLength={6} maxLength={6} required placeholder="أدخل 6 أرقام" />
        {error && <div className="manage-error" role="alert">{error}</div>}
        <button className="manage-primary-button" type="submit" disabled={busy || !/^[0-9]{6}$/.test(code)}>{busy ? <Loader2 size={17} className="manage-spin" /> : <ShieldCheck size={17} />} دخول الإدارة</button>
      </form>
      <div className="manage-login-note"><CircleHelp size={16} /><span>يُدار الرمز من متغير Vercel <code>ADMIN_ACCESS_CODE</code>. بعد خمس محاولات خاطئة يُقفل الدخول 15 دقيقة. لا ترسله في رسالة.</span></div>
      <a className="manage-back-link" href="/">العودة إلى الموقع <ChevronLeft size={15} /></a>
    </div>
  </main>;
}

function Overview({ analytics, serviceCount, offerCount }: { analytics: AnalyticsSummary; serviceCount: number; offerCount: number }) {
  const maxDaily = Math.max(1, ...analytics.daily.flatMap(day => [day.visits, day.serviceClicks, day.offerClicks, day.searches]));
  const stats = [
    { label: "زيارات الصفحة", value: analytics.totalVisits, detail: "آخر 30 يومًا", icon: Eye, tone: "green" },
    { label: "نقرات الخدمات", value: analytics.serviceClicks, detail: "انتقال إلى واتساب", icon: MessageCircle, tone: "sand" },
    { label: "نقرات العروض", value: analytics.offerClicks, detail: "اهتمام بالعروض", icon: BadgePercent, tone: "blue" },
    { label: "عمليات البحث", value: analytics.searches, detail: "داخل قائمة الخدمات", icon: Search, tone: "violet" },
  ];
  const columns = [
    { key: "visits", label: "زيارة", color: "#0c6b56" },
    { key: "serviceClicks", label: "خدمة", color: "#c99b53" },
    { key: "offerClicks", label: "عرض", color: "#6483a0" },
    { key: "searches", label: "بحث", color: "#9274a5" },
  ] as const;
  return <div className="manage-overview">
    <div className="manage-stat-grid">{stats.map(({ label, value, detail, icon: Icon, tone }) => <article className="manage-stat-card" key={label}><span className={`manage-stat-icon tone-${tone}`}><Icon size={20} /></span><small>{label}</small><strong>{value.toLocaleString("ar-SA")}</strong><span>{detail}</span></article>)}</div>
    <div className="manage-analytics-note"><Activity size={16} /><span>الأرقام إحصاءات استخدام ونقرات، ولا تمثل عدد محادثات واتساب أو العملاء الذين أتمّوا الخدمة. لا يجري حفظ عنوان IP أو اسم الزائر.</span></div>
    <div className="manage-overview-grid">
      <section className="manage-panel manage-chart-panel">
        <div className="manage-panel-heading"><div><span className="portal-kicker">الحركة على الموقع</span><h2>آخر 7 أيام</h2></div><BarChart3 size={20} /></div>
        {analytics.daily.length === 0 ? <div className="manage-chart-empty"><Activity size={22} /><span>ستظهر الحركة هنا بعد بدء الزيارات والتفاعل.</span></div> : <>
          <div className="manage-chart-legend">{columns.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div>
          <div className="manage-chart" role="img" aria-label="مخطط الزيارات والنقرات والبحث خلال آخر سبعة أيام">
            {analytics.daily.map(day => <div className="manage-chart-day" key={day.day}>
              <div className="manage-chart-bars">{columns.map(item => <span className="manage-bar" key={item.key} title={`${item.label}: ${day[item.key]}`} style={{ height: `${Math.max(day[item.key] === 0 ? 0 : 5, (day[item.key] / maxDaily) * 112)}px`, background: item.color }} />)}</div>
              <small>{displayDay(day.day)}</small>
            </div>)}
          </div>
        </>}
      </section>
      <section className="manage-panel manage-quick-panel">
        <div className="manage-panel-heading"><div><span className="portal-kicker">قائمة الموقع</span><h2>ملخص المحتوى</h2></div><FileText size={20} /></div>
        <div className="manage-quick-row"><span>الخدمات المسجلة</span><strong>{serviceCount.toLocaleString("ar-SA")}</strong></div>
        <div className="manage-quick-row"><span>العروض المسجلة</span><strong>{offerCount.toLocaleString("ar-SA")}</strong></div>
        <p>يمكنك تحديث الخدمات والعروض من تبويبي «الخدمات» و«العروض».</p>
        <a className="manage-outline-link" href="/">معاينة الموقع <ArrowUpRight size={15} /></a>
      </section>
    </div>
    <div className="manage-overview-grid manage-lists-grid">
      <PopularList title="الخدمات الأكثر نقرًا" icon={<MessageCircle size={18} />} items={analytics.topServices} empty="لا توجد نقرات مسجلة بعد." />
      <PopularList title="أكثر عبارات البحث" icon={<Search size={18} />} items={analytics.topSearches} empty="ستظهر العبارات بعد البحث في قائمة الخدمات." />
      <PopularList title="العروض الأكثر اهتمامًا" icon={<BadgePercent size={18} />} items={analytics.topOffers} empty="لا توجد نقرات على العروض بعد." />
    </div>
  </div>;
}

function PopularList({ title, icon, items, empty }: { title: string; icon: ReactNode; items: { label: string; count: number }[]; empty: string }) {
  return <section className="manage-panel manage-popular-panel"><div className="manage-panel-heading"><h2>{title}</h2>{icon}</div>{items.length === 0 ? <p className="manage-empty-line">{empty}</p> : <ol>{items.map((item, index) => <li key={`${item.label}-${index}`}><span className="manage-rank">{index + 1}</span><span>{item.label}</span><strong>{item.count.toLocaleString("ar-SA")}</strong></li>)}</ol>}</section>;
}

function ServicesManager({ data, onRefresh, onError }: { data: AdminData; onRefresh: () => Promise<void>; onError: (message: string) => void }) {
  const [categoryDraft, setCategoryDraft] = useState<Partial<ServiceCategory> | null>(null);
  const [serviceDraft, setServiceDraft] = useState<Partial<ServiceItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const save = async (event: FormEvent, kind: "category" | "service") => {
    event.preventDefault();
    const draft = kind === "category" ? categoryDraft : serviceDraft;
    if (!draft) return;
    setSaving(true);
    setNotice("");
    try {
      await saveCatalogItem({ ...draft, kind });
      await onRefresh();
      setCategoryDraft(kind === "category" ? null : categoryDraft);
      setServiceDraft(kind === "service" ? null : serviceDraft);
      setNotice("تم حفظ التعديل.");
    } catch (error) {
      onError(showError(error, "تعذر حفظ البيانات."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (kind: "category" | "service", item: ServiceCategory | ServiceItem) => {
    setSaving(true);
    try { await saveCatalogItem({ ...item, kind, active: !item.active }); await onRefresh(); }
    catch (error) { onError(showError(error, "تعذر تحديث الحالة.")); }
    finally { setSaving(false); }
  };

  return <div className="manage-content-area">
    <div className="manage-section-lead"><div><span className="portal-kicker">إدارة الكتالوج</span><h2>الخدمات والأقسام</h2><p>تظهر العناصر النشطة للزوار مباشرة. إيقاف العنصر يخفيه دون حذف بياناته.</p></div><span className="manage-count-pill">{data.services.length.toLocaleString("ar-SA")} خدمة</span></div>
    <div className="manage-management-grid">
      <section className="manage-panel manage-form-panel">
        <div className="manage-panel-heading"><div><span className="portal-kicker">قسم جديد</span><h2>{categoryDraft?.id ? "تعديل قسم" : "إضافة قسم"}</h2></div><Building2 size={20} /></div>
        <form className="manage-form" onSubmit={event => void save(event, "category")}>
          <label>اسم القسم<input required maxLength={120} value={categoryDraft?.name ?? ""} onChange={event => setCategoryDraft(current => ({ ...(current ?? {}), name: event.target.value, icon_key: current?.icon_key ?? "transport", active: current?.active ?? true }))} placeholder="مثال: خدمات المنشآت" /></label>
          <label>وصف مختصر<input maxLength={80} value={categoryDraft?.kicker ?? ""} onChange={event => setCategoryDraft(current => ({ ...(current ?? {}), kicker: event.target.value }))} placeholder="مثال: حلول للأعمال" /></label>
          <label>الوصف<textarea rows={3} maxLength={500} value={categoryDraft?.description ?? ""} onChange={event => setCategoryDraft(current => ({ ...(current ?? {}), description: event.target.value }))} placeholder="اكتب تعريفًا موجزًا بالقسم" /></label>
          <div className="manage-form-row"><label>الأيقونة<select value={categoryDraft?.icon_key ?? "transport"} onChange={event => setCategoryDraft(current => ({ ...(current ?? {}), icon_key: event.target.value as ServiceCategory["icon_key"] }))}>{iconOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>الترتيب<input type="number" min={0} max={10000} value={categoryDraft?.sort_order ?? 0} onChange={event => setCategoryDraft(current => ({ ...(current ?? {}), sort_order: Number(event.target.value) }))} /></label></div>
          <div className="manage-form-buttons"><button className="manage-primary-button" disabled={saving}><Plus size={16} /> {saving ? "جارٍ الحفظ" : categoryDraft?.id ? "حفظ القسم" : "إضافة القسم"}</button>{categoryDraft && <button className="manage-cancel-button" type="button" onClick={() => setCategoryDraft(null)}>إلغاء</button>}</div>
        </form>
      </section>
      <section className="manage-panel manage-form-panel">
        <div className="manage-panel-heading"><div><span className="portal-kicker">خدمة جديدة</span><h2>{serviceDraft?.id ? "تعديل خدمة" : "إضافة خدمة"}</h2></div><Plus size={20} /></div>
        <form className="manage-form" onSubmit={event => void save(event, "service")}>
          <label>اسم الخدمة<input required maxLength={150} value={serviceDraft?.name ?? ""} onChange={event => setServiceDraft(current => ({ ...(current ?? {}), name: event.target.value, active: current?.active ?? true }))} placeholder="اكتب اسم الخدمة كما سيظهر للعميل" /></label>
          <label>القسم<select required value={serviceDraft?.category_id ?? data.categories[0]?.id ?? ""} onChange={event => setServiceDraft(current => ({ ...(current ?? {}), category_id: event.target.value }))}>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>وصف اختياري<textarea rows={3} maxLength={500} value={serviceDraft?.description ?? ""} onChange={event => setServiceDraft(current => ({ ...(current ?? {}), description: event.target.value }))} placeholder="تفاصيل موجزة عن الخدمة" /></label>
          <label>الترتيب<input type="number" min={0} max={10000} value={serviceDraft?.sort_order ?? 0} onChange={event => setServiceDraft(current => ({ ...(current ?? {}), sort_order: Number(event.target.value) }))} /></label>
          <div className="manage-form-buttons"><button className="manage-primary-button" disabled={saving || data.categories.length === 0}><Plus size={16} /> {saving ? "جارٍ الحفظ" : serviceDraft?.id ? "حفظ الخدمة" : "إضافة الخدمة"}</button>{serviceDraft && <button className="manage-cancel-button" type="button" onClick={() => setServiceDraft(null)}>إلغاء</button>}</div>
        </form>
      </section>
    </div>

    {notice && <div className="manage-success"><Check size={15} />{notice}</div>}
    <section className="manage-catalog-list">
      {data.categories.map(category => <article className="manage-panel manage-category-panel" key={category.id}>
        <div className="manage-category-list-heading"><div><span className="portal-kicker">{category.kicker || "قسم"}</span><h3>{category.name}</h3><p>{category.description}</p></div><div className="manage-category-actions"><StatusBadge active={category.active} /><button type="button" className="manage-icon-button" aria-label={`تعديل ${category.name}`} onClick={() => setCategoryDraft(category)}><Pencil size={16} /></button><button type="button" className="manage-small-action" disabled={saving} onClick={() => void toggleActive("category", category)}>{category.active ? "إيقاف" : "تفعيل"}</button></div></div>
        <div className="manage-service-admin-list">{data.services.filter(service => service.category_id === category.id).map(service => <div className="manage-service-admin-row" key={service.id}><span className="manage-service-name">{service.name}</span><span className="manage-service-click-count"><MessageCircle size={13} />{(data.analytics?.serviceClicksByService.find(item => item.serviceId === service.id)?.count ?? 0).toLocaleString("ar-SA")} نقرة</span><StatusBadge active={service.active} /><button type="button" className="manage-icon-button" aria-label={`تعديل ${service.name}`} onClick={() => setServiceDraft(service)}><Pencil size={15} /></button><button type="button" className="manage-small-action" disabled={saving} onClick={() => void toggleActive("service", service)}>{service.active ? "إيقاف" : "تفعيل"}</button></div>)}{data.services.filter(service => service.category_id === category.id).length === 0 && <p className="manage-empty-line">لا توجد خدمات في هذا القسم بعد.</p>}</div>
      </article>)}
    </section>
  </div>;
}

function OffersManager({ data, onRefresh, onError }: { data: AdminData; onRefresh: () => Promise<void>; onError: (message: string) => void }) {
  const [draft, setDraft] = useState<OfferDraft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const beginEdit = (offer: PublicOffer) => {
    setDraft({ id: offer.id, title: offer.title, description: offer.description, discount_label: offer.discount_label, valid_from: toInputDate(offer.valid_from), valid_until: toInputDate(offer.valid_until), image_path: offer.image_path ?? "", service_id: offer.service_id ?? "", sort_order: offer.sort_order, active: offer.active });
    setFile(null);
    setPreview(offerPublicUrl(offer.image_path) ?? "");
  };

  const reset = () => { setDraft(null); setFile(null); setPreview(""); };

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(selected);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setNotice("");
    try {
      let imagePath = draft.image_path;
      if (file) imagePath = await uploadOfferImage(file);
      await saveOffer({ ...draft, image_path: imagePath || null, service_id: draft.service_id || null });
      await onRefresh();
      setNotice("تم حفظ العرض.");
      reset();
    } catch (error) {
      onError(showError(error, "تعذر حفظ العرض أو رفع صورته."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (offer: PublicOffer) => {
    try {
      await saveOffer({ id: offer.id, title: offer.title, description: offer.description, discount_label: offer.discount_label, valid_from: toInputDate(offer.valid_from), valid_until: toInputDate(offer.valid_until), image_path: offer.image_path, service_id: offer.service_id, sort_order: offer.sort_order, active: !offer.active });
      await onRefresh();
    } catch (error) { onError(showError(error, "تعذر تحديث حالة العرض.")); }
  };

  return <div className="manage-content-area">
    <div className="manage-section-lead"><div><span className="portal-kicker">العروض والخصومات</span><h2>أضف عرضًا جديدًا</h2><p>ارفع صورة واضحة واكتب الخصم وفترة سريانه؛ لا يظهر العرض إلا إذا كان نشطًا.</p></div><span className="manage-count-pill">{data.offers.length.toLocaleString("ar-SA")} عرض</span></div>
    <div className="manage-management-grid manage-offer-grid">
      <section className="manage-panel manage-form-panel">
        <div className="manage-panel-heading"><div><span className="portal-kicker">بطاقة العرض</span><h2>{draft?.id ? "تعديل العرض" : "إنشاء عرض"}</h2></div><BadgePercent size={20} /></div>
        <form className="manage-form" onSubmit={event => void submit(event)}>
          <label>عنوان العرض<input required maxLength={120} value={draft?.title ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), title: event.target.value }))} placeholder="مثال: خصم على خدمة محددة" /></label>
          <div className="manage-form-row"><label>نص الخصم<input maxLength={50} value={draft?.discount_label ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), discount_label: event.target.value }))} placeholder="مثال: عرض خاص" /></label><label>الخدمة المرتبطة<select value={draft?.service_id ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), service_id: event.target.value }))}><option value="">كل الخدمات</option>{data.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label></div>
          <label>تفاصيل العرض<textarea rows={3} maxLength={800} value={draft?.description ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), description: event.target.value }))} placeholder="اشرح العرض وشروطه بإيجاز" /></label>
          <div className="manage-form-row"><label>يبدأ في<input type="date" value={draft?.valid_from ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), valid_from: event.target.value }))} /></label><label>ينتهي في<input type="date" value={draft?.valid_until ?? ""} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), valid_until: event.target.value }))} /></label></div>
          <label className="manage-upload-field"><span>صورة العرض <small>JPG أو PNG أو WebP — بحد أقصى 4 ميغابايت</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0])} /><i><ImagePlus size={18} /> اختر صورة من جهازك</i></label>
          {preview && <div className="manage-image-preview"><img src={preview} alt="معاينة صورة العرض" /><button type="button" className="manage-icon-button" aria-label="إزالة الصورة" onClick={() => { setPreview(""); setFile(null); setDraft(current => current ? { ...current, image_path: "" } : current); }}><X size={16} /></button></div>}
          <div className="manage-form-row"><label>الترتيب<input type="number" min={0} max={10000} value={draft?.sort_order ?? 0} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), sort_order: Number(event.target.value) }))} /></label><label className="manage-checkbox-label"><input type="checkbox" checked={draft?.active ?? true} onChange={event => setDraft(current => ({ ...(current ?? emptyOffer), active: event.target.checked }))} /> إظهار العرض للزوار</label></div>
          <div className="manage-form-buttons"><button className="manage-primary-button" disabled={saving}>{saving ? <><Loader2 size={16} className="manage-spin" /> جارٍ الرفع والحفظ</> : <><Check size={16} /> {draft?.id ? "حفظ التعديلات" : "إضافة العرض"}</>}</button>{draft && <button className="manage-cancel-button" type="button" onClick={reset}>إلغاء</button>}</div>
        </form>
      </section>
      <section className="manage-offers-list">
        <div className="manage-panel-heading"><div><span className="portal-kicker">العروض المحفوظة</span><h2>العروض الحالية</h2></div><BadgePercent size={20} /></div>
        {data.offers.length === 0 ? <div className="manage-panel manage-offer-empty"><ImagePlus size={24} /><strong>لا توجد عروض بعد</strong><span>أضف عرضك الأول من النموذج.</span></div> : data.offers.map(offer => <article className="manage-panel manage-offer-row" key={offer.id}>
          {offer.image_path ? <img src={offerPublicUrl(offer.image_path) ?? ""} alt="" loading="lazy" /> : <span className="manage-offer-thumb"><BadgePercent size={20} /></span>}
          <div className="manage-offer-row-copy"><strong>{offer.title}</strong><span>{offer.discount_label || "عرض خاص"}</span><StatusBadge active={offer.active} /></div>
          <div className="manage-offer-row-actions"><button type="button" className="manage-icon-button" aria-label={`تعديل ${offer.title}`} onClick={() => beginEdit(offer)}><Pencil size={15} /></button><button type="button" className="manage-small-action" onClick={() => void toggle(offer)}>{offer.active ? "إيقاف" : "تفعيل"}</button></div>
        </article>)}
      </section>
    </div>
  </div>;
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [globalError, setGlobalError] = useState("");
  const [dataError, setDataError] = useState("");

  const refresh = async () => {
    const fresh = await loadAdminData();
    setData(fresh);
    setDataError("");
    return fresh;
  };

  useEffect(() => {
    let active = true;
    loadAdminData().then(fresh => {
      if (active) { setData(fresh); setAuthenticated(true); }
    }).catch(error => {
      if (active && error instanceof Error && !error.message.includes("انتهت جلسة الإدارة")) setDataError(error.message);
    }).finally(() => { if (active) setLoadingSession(false); });
    return () => { active = false; };
  }, []);

  const onLogin = async (code: string) => {
    await loginAdmin(code);
    setAuthenticated(true);
    setGlobalError("");
    try { await refresh(); }
    catch (error) { setDataError(showError(error, "تعذر تحميل لوحة الإدارة.")); }
  };

  const onLogout = async () => {
    try { await logoutAdmin(); } catch { /* clear local admin state regardless */ }
    setAuthenticated(false);
    setData(null);
    setTab("overview");
  };

  const updateFromChild = async () => {
    await refresh();
  };

  if (loadingSession) return <div className="manage-loading" dir="rtl"><Loader2 size={24} className="manage-spin" /> جارٍ التحقق من الجلسة…</div>;
  if (!authenticated) return <LoginScreen onLogin={onLogin} />;

  const activeData = data;
  const analytics = activeData?.analytics ?? emptyAnalytics;
  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "الإحصاءات", icon: LayoutDashboard },
    { id: "services", label: "الخدمات", icon: FileText },
    { id: "offers", label: "العروض", icon: BadgePercent },
  ];

  return <main className="manage-shell" dir="rtl">
    <header className="manage-topbar"><a className="portal-brand" href="/"><span className="portal-brand-mark"><span className="portal-mark-road" /><Check size={15} strokeWidth={3} /></span><span className="portal-brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>لوحة الإدارة</small></span></a><div className="manage-topbar-actions"><a className="manage-view-site" href="/" target="_blank" rel="noreferrer"><Eye size={16} /> عرض الموقع</a><button type="button" className="manage-logout" onClick={() => void onLogout()}><LogOut size={16} /> خروج</button></div></header>
    <div className="manage-layout">
      <aside className="manage-sidebar"><div className="manage-sidebar-intro"><span className="manage-sidebar-mark"><LayoutDashboard size={19} /></span><strong>لوحة المكتب</strong><small>إدارة المحتوى والأداء</small></div><nav aria-label="أقسام الإدارة">{tabs.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={tab === item.id ? "is-current" : ""} onClick={() => { setTab(item.id); setGlobalError(""); }}><Icon size={17} />{item.label}{tab === item.id && <ChevronLeft size={15} />}</button>; })}</nav><div className="manage-sidebar-foot"><span className="manage-live-dot" /> الموقع متاح للزوار <small>رمز الدخول يُدار من Vercel</small></div></aside>
      <section className="manage-main">
        <div className="manage-page-title"><div><span className="portal-kicker">مكتب البقمي 2</span><h1>{tab === "overview" ? "نظرة عامة" : tab === "services" ? "إدارة الخدمات" : "إدارة العروض"}</h1><p>{tab === "overview" ? "تابع حركة الموقع واهتمام الزوار." : tab === "services" ? "أضف خدماتك وعدّل ما يظهر للزوار." : "أضف العروض والخصومات وصورها."}</p></div><div className="manage-date-chip"><Clock3 size={15} /> {new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</div></div>
        {(globalError || dataError) && <div className="manage-error manage-global-error" role="alert"><CircleHelp size={16} /> {globalError || dataError}<button type="button" onClick={() => { setGlobalError(""); setDataError(""); }}><X size={15} /></button></div>}
        {!activeData ? <div className="manage-panel manage-unavailable"><CircleHelp size={24} /><strong>لوحة البيانات غير متاحة</strong><span>تأكد من إعداد <code>SUPABASE_SECRET_KEY</code> في متغيرات Vercel ثم أعد تحميل الصفحة.</span><button type="button" className="manage-outline-link" onClick={() => void refresh()}>إعادة المحاولة <ChevronRight size={15} /></button></div> : tab === "overview" ? <Overview analytics={analytics} serviceCount={activeData.services.length} offerCount={activeData.offers.length} /> : tab === "services" ? <ServicesManager data={activeData} onRefresh={updateFromChild} onError={setGlobalError} /> : <OffersManager data={activeData} onRefresh={updateFromChild} onError={setGlobalError} />}
      </section>
    </div>
    <footer className="manage-footer"><span>مكتب البقمي 2</span><span>الزيارات والنقرات مؤشرات اهتمام وليست عدد عملاء مؤكدين.</span></footer>
  </main>;
}
