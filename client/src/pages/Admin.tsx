import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpLeft,
  Check,
  CheckCircle2,
  Clock3,
  FileSearch,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  getAdminRequests,
  getAdminStats,
  statusLabels,
  updateAdminRequest,
  verifyAdminCode,
  type AdminStats,
  type RequestStatus,
  type ServiceRequest,
} from "@/lib/requests";

const statuses: RequestStatus[] = ["new", "in_progress", "waiting_customer", "completed", "cancelled"];
const formatDate = (value: string) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const emptyStats: AdminStats = { total: 0, new: 0, in_progress: 0, completed: 0 };

export default function Admin() {
  const [code, setCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const refresh = useCallback(async (accessCode: string, query: string, status: string) => {
    setLoadingData(true);
    setDataError("");
    try {
      const [rows, summary] = await Promise.all([
        getAdminRequests(accessCode, status, query),
        getAdminStats(accessCode),
      ]);
      setRequests(rows);
      setStats(summary ?? emptyStats);
      setNoteDrafts(Object.fromEntries(rows.map((row) => [row.id, row.staff_note ?? ""])));
    } catch {
      setDataError("تعذر تحميل الطلبات. تحقق من اتصالك ثم أعد المحاولة.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!verifiedCode) return;
    const timer = window.setTimeout(() => void refresh(verifiedCode, search.trim(), statusFilter), 220);
    return () => window.clearTimeout(timer);
  }, [verifiedCode, search, statusFilter, refresh]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoadingLogin(true);
    try {
      const valid = await verifyAdminCode(code.trim());
      if (!valid) {
        setLoginError("رمز الدخول غير صحيح. تحقق منه وحاول مجددًا.");
        return;
      }
      setVerifiedCode(code.trim());
      setCode("");
    } catch {
      setLoginError("تعذر التحقق من الرمز الآن. حاول مرة أخرى.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleStatusChange = async (request: ServiceRequest, nextStatus: RequestStatus) => {
    if (!verifiedCode || nextStatus === request.status) return;
    setSavingId(request.id);
    setDataError("");
    try {
      await updateAdminRequest(verifiedCode, request.id, nextStatus, noteDrafts[request.id] ?? request.staff_note ?? "");
      await refresh(verifiedCode, search.trim(), statusFilter);
    } catch {
      setDataError("لم يتم تحديث حالة الطلب. أعد المحاولة.");
    } finally {
      setSavingId("");
    }
  };

  const saveNote = async (request: ServiceRequest) => {
    if (!verifiedCode) return;
    setSavingId(request.id);
    setDataError("");
    try {
      await updateAdminRequest(verifiedCode, request.id, request.status, noteDrafts[request.id] ?? "");
      await refresh(verifiedCode, search.trim(), statusFilter);
    } catch {
      setDataError("لم يتم حفظ الملاحظة. أعد المحاولة.");
    } finally {
      setSavingId("");
    }
  };

  if (!verifiedCode) {
    return (
      <main className="admin-gate" dir="rtl">
        <a className="gate-back" href="/"><ArrowRight size={17} /> العودة إلى الموقع</a>
        <section className="gate-card">
          <span className="gate-icon"><LockKeyhole size={23} /></span>
          <span className="section-kicker">دخول الموظفين</span>
          <h1>لوحة متابعة الطلبات</h1>
          <p>هذه المساحة مخصصة لفريق مكتب البقمي 2. أدخل رمز الإدارة للمتابعة.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-code">رمز الدخول</label>
            <input id="admin-code" type="password" autoComplete="current-password" required minLength={20} value={code} onChange={(event) => setCode(event.target.value)} placeholder="أدخل رمز الإدارة" />
            {loginError && <div className="login-error" role="alert"><X size={16} />{loginError}</div>}
            <button className="button button-dark gate-submit" type="submit" disabled={loadingLogin}>{loadingLogin ? "جارٍ التحقق…" : "دخول آمن"}{loadingLogin ? <LoaderCircle className="spin" size={17} /> : <ArrowUpLeft size={17} />}</button>
          </form>
          <div className="gate-note"><ShieldCheck size={16} /> لا يمكن للزوار الاطلاع على بيانات الطلبات.</div>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell" dir="rtl">
      <header className="admin-header">
        <div className="container admin-header-inner">
          <a className="brand" href="/"><span className="brand-mark"><ShieldCheck size={20} /></span><span className="brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>إدارة الطلبات</small></span></a>
          <div className="admin-header-actions"><span className="secure-pill"><span /> اتصال آمن</span><button className="admin-logout" onClick={() => { setVerifiedCode(""); setRequests([]); }}><LogOut size={16} /> خروج</button><a className="admin-home-link" href="/"><ArrowUpLeft size={15} /> الموقع</a></div>
        </div>
      </header>
      <main className="container admin-main">
        <div className="admin-title-row"><div><span className="section-kicker">مركز المتابعة</span><h1>طلبات العملاء</h1><p>تابع الطلبات وحالاتها، وأضف ملاحظات داخلية لفريقك.</p></div><button className="button button-outline refresh-button" onClick={() => void refresh(verifiedCode, search.trim(), statusFilter)} disabled={loadingData}><RefreshCw size={16} className={loadingData ? "spin" : ""} /> تحديث القائمة</button></div>
        <section className="stats-grid" aria-label="ملخص الطلبات">
          <article className="stat-card"><span className="stat-icon"><FileSearch size={19} /></span><small>إجمالي الطلبات</small><strong>{stats.total}</strong><span>كل الطلبات المسجلة</span></article>
          <article className="stat-card stat-new"><span className="stat-icon"><Clock3 size={19} /></span><small>طلبات جديدة</small><strong>{stats.new}</strong><span>تحتاج إلى مراجعة</span></article>
          <article className="stat-card stat-progress"><span className="stat-icon"><RefreshCw size={19} /></span><small>قيد الإجراء</small><strong>{stats.in_progress}</strong><span>تحت المتابعة</span></article>
          <article className="stat-card stat-done"><span className="stat-icon"><CheckCircle2 size={19} /></span><small>طلبات مكتملة</small><strong>{stats.completed}</strong><span>تم إنجازها</span></article>
        </section>
        <section className="orders-panel">
          <div className="orders-toolbar"><div><h2>قائمة الطلبات</h2><span>{loadingData ? "جارٍ التحديث…" : `${requests.length} طلب`}</span></div><div className="order-filters"><label className="search-field"><Search size={17} /><input aria-label="البحث في الطلبات" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو رقم الجوال أو الخدمة" /></label><select aria-label="تصفية حسب الحالة" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">كل الحالات</option>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></div></div>
          {dataError && <div className="admin-error" role="alert">{dataError}</div>}
          {loadingData && requests.length === 0 ? <div className="orders-empty"><LoaderCircle className="spin" size={24} /><span>جارٍ تحميل الطلبات…</span></div> : requests.length === 0 ? <div className="orders-empty"><span className="empty-illustration"><FileSearch size={28} /></span><strong>لا توجد طلبات مطابقة</strong><span>ستظهر هنا الطلبات الجديدة التي يرسلها العملاء.</span></div> : (
            <div className="orders-list">
              {requests.map((request) => (
                <article className="order-card" key={request.id}>
                  <div className="order-main-info"><div className="order-person"><span className="avatar-mark">{request.customer_name.trim().charAt(0)}</span><div><strong>{request.customer_name}</strong><span dir="ltr">{request.phone}</span></div></div><span className={`status-badge status-${request.status}`}>{statusLabels[request.status]}</span></div>
                  <div className="order-summary"><span className="order-category">{request.category}</span><strong>{request.service}</strong><details><summary>عرض تفاصيل الطلب</summary><p style={{ whiteSpace: "pre-wrap" }}>{request.details}</p></details></div>
                  <div className="order-meta"><span>{formatDate(request.created_at)}</span>{request.email && <a href={`mailto:${request.email}`} dir="ltr">{request.email}</a>}<a href={`tel:${request.phone}`} dir="ltr">اتصال: {request.phone}</a></div>
                  <div className="order-actions"><label>تحديث الحالة<select aria-label={`حالة طلب ${request.customer_name}`} value={request.status} disabled={savingId === request.id} onChange={(event) => void handleStatusChange(request, event.target.value as RequestStatus)}>{statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label><details className="note-details"><summary><span>ملاحظة داخلية</span><ArrowUpLeft size={14} /></summary><div className="note-editor"><textarea maxLength={1500} rows={2} placeholder="ملاحظة لفريق المكتب فقط" value={noteDrafts[request.id] ?? ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [request.id]: event.target.value }))} /><button className="button button-outline save-note" onClick={() => void saveNote(request)} disabled={savingId === request.id}>{savingId === request.id ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} حفظ الملاحظة</button></div></details></div>
                </article>
              ))}
            </div>
          )}
          <div className="orders-footnote"><ShieldCheck size={15} /> بيانات العملاء محمية ولا تظهر إلا بعد التحقق من رمز الإدارة.</div>
        </section>
        <div className="admin-bottom"><span>مكتب البقمي 2 — متابعة حتى اكتمال الخدمة.</span><span><CheckCircle2 size={15} /> الطلبات محفوظة في Supabase</span></div>
      </main>
    </div>
  );
}
