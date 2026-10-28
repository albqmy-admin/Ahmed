import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  Building2,
  CarFront,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import {
  createServiceRequest,
  serviceCatalog,
  type RequestCategory,
} from "@/lib/requests";

const categories = [
  {
    title: "خدمات الهيئة العامة للنقل",
    kicker: "النقل والتراخيص",
    description: "إجراءات النقل والتراخيص وكروت التشغيل للمنشآت والسائقين.",
    icon: Building2,
    services: serviceCatalog["خدمات الهيئة العامة للنقل"],
  },
  {
    title: "خدمات التأمين",
    kicker: "حماية واطمئنان",
    description: "خيارات التأمين للأفراد والشركات مع متابعة النقل والاسترداد.",
    icon: ShieldCheck,
    services: serviceCatalog["خدمات التأمين"],
  },
  {
    title: "خدمات المركبات",
    kicker: "كل ما يخص مركبتك",
    description: "نقل الملكية وتجديد الاستمارات واللوحات ومطالبات الحوادث.",
    icon: CarFront,
    services: serviceCatalog["خدمات المركبات"],
  },
  {
    title: "الخدمات الحكومية والإلكترونية",
    kicker: "خدماتك الإلكترونية",
    description: "خدمات حكومية وإلكترونية ومتابعة متطلبات المنشآت والطلبات.",
    icon: FileText,
    services: serviceCatalog["الخدمات الحكومية والإلكترونية"],
  },
] as const;

const promises = [
  { title: "سرعة في الإنجاز", text: "نبدأ معك الخطوات بوضوح ونتابع طلبك.", icon: Clock3 },
  { title: "دقة في الإجراءات", text: "اهتمام بالتفاصيل ومراجعة لكل خطوة.", icon: FileCheck2 },
  { title: "أمانة في التعامل", text: "وضوح في التواصل ومعلومات طلبك.", icon: ShieldCheck },
  { title: "متابعة حتى الإتمام", text: "نبقى معك من استقبال الطلب إلى اكتماله.", icon: BadgeCheck },
];

const emptyForm = {
  customer_name: "",
  phone: "",
  email: "",
  category: "" as RequestCategory | "",
  service: "",
  details: "",
};

function ServiceIllustration() {
  return (
    <div className="hero-illustration" aria-label="رسم توضيحي لمسار خدمة ومركبة">
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <div className="illustration-label label-top"><Navigation size={15} /> متابعة واضحة</div>
      <div className="illustration-label label-bottom"><CheckCircle2 size={15} /> حتى إتمام الخدمة</div>
      <svg className="route-art" viewBox="0 0 520 370" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="road" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#d5b477" />
            <stop offset="1" stopColor="#f4e8d2" />
          </linearGradient>
          <linearGradient id="vehicle" x1="0" x2="1">
            <stop offset="0" stopColor="#315c4a" />
            <stop offset="1" stopColor="#193d31" />
          </linearGradient>
        </defs>
        <path d="M-10 284 C115 284 116 109 255 109 S370 277 540 62" fill="none" stroke="url(#road)" strokeWidth="77" strokeLinecap="round" />
        <path d="M-10 284 C115 284 116 109 255 109 S370 277 540 62" fill="none" stroke="#fffaf1" strokeWidth="3" strokeDasharray="13 16" strokeLinecap="round" />
        <circle cx="113" cy="225" r="11" fill="#c79e60" />
        <circle cx="256" cy="109" r="13" fill="#fffaf1" stroke="#c79e60" strokeWidth="5" />
        <circle cx="420" cy="194" r="11" fill="#c79e60" />
        <g transform="translate(186 209) rotate(-12)">
          <rect x="0" y="12" width="161" height="78" rx="24" fill="url(#vehicle)" />
          <path d="M37 14 56 -13 Q61 -20 75 -20h42q15 0 23 13l13 22" fill="#527864" />
          <path d="M67 -13h47q8 0 13 8l12 18H54l13-18q3-8 0-8Z" fill="#d7e4da" />
          <path d="M80 -10h28v22H64l12-17q2-5 4-5Z" fill="#edf2e8" />
          <circle cx="38" cy="88" r="17" fill="#26342b" />
          <circle cx="126" cy="88" r="17" fill="#26342b" />
          <circle cx="38" cy="88" r="7" fill="#d8c7a8" />
          <circle cx="126" cy="88" r="7" fill="#d8c7a8" />
          <rect x="9" y="33" width="11" height="20" rx="5" fill="#edc46b" />
          <rect x="143" y="33" width="10" height="20" rx="5" fill="#e8e4ca" />
        </g>
      </svg>
      <div className="illustration-stamp"><span>البقمي</span><strong>2</strong></div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const selectedServices = useMemo(
    () => (form.category ? serviceCatalog[form.category] : []),
    [form.category],
  );

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (!form.category || !form.service) {
      setNotice({ kind: "error", text: "اختر فئة الخدمة ونوع الخدمة لإكمال الطلب." });
      return;
    }
    if (!/^[+0-9٠-٩۰-۹\s()-]{8,20}$/.test(form.phone.trim())) {
      setNotice({ kind: "error", text: "تحقق من رقم الجوال وأدخله بصيغة صحيحة." });
      return;
    }
    setSending(true);
    try {
      await createServiceRequest({
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email,
        category: form.category,
        service: form.service,
        details: form.details,
      });
      setForm(emptyForm);
      setNotice({ kind: "success", text: "وصل طلبك بنجاح. سيتابع فريق مكتب البقمي 2 طلبك معك." });
    } catch {
      setNotice({ kind: "error", text: "تعذر إرسال الطلب الآن. تحقق من اتصالك وحاول مرة أخرى." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="site-shell" dir="rtl">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="مكتب البقمي 2 — الصفحة الرئيسية">
            <span className="brand-mark"><Navigation size={22} strokeWidth={2.2} /></span>
            <span className="brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>خدماتك في مكان واحد</small></span>
          </a>
          <nav className="main-nav" aria-label="التنقل الرئيسي">
            <a href="#services">الخدمات</a>
            <a href="#why-us">لماذا البقمي 2؟</a>
          </nav>
          <a className="button button-dark header-cta" href="#request">اطلب خدمتك <ArrowUpLeft size={16} /></a>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> مكتب البقمي 2 <span className="eyebrow-dot" /></div>
              <h1>خدماتك الحكومية وخدمات النقل والتأمين <em>في مكان واحد.</em></h1>
              <p className="hero-description">نختصر عليك الإجراءات. ننجز خدمات النقل والتأمين والخدمات الإلكترونية باحترافية ودقة، مع متابعة مستمرة وخدمة عملاء متميزة.</p>
              <div className="hero-actions">
                <a className="button button-dark button-large" href="#request">ابدأ طلبك الآن <ArrowLeft size={18} /></a>
                <a className="text-link" href="#services">تعرّف على الخدمات <span>↓</span></a>
              </div>
              <div className="hero-trust"><span className="trust-icon"><ShieldCheck size={18} /></span><span>متابعة مستمرة<br /><strong>من أول خطوة حتى اكتمال الخدمة</strong></span></div>
            </div>
            <ServiceIllustration />
          </div>
          <div className="hero-bottom container"><span>النقل والتراخيص</span><i /><span>التأمين</span><i /><span>المركبات</span><i /><span>الخدمات الإلكترونية</span></div>
        </section>

        <section className="services-section section-pad" id="services">
          <div className="container">
            <div className="section-heading">
              <div><span className="section-kicker">خدماتنا</span><h2>كل مشوارك، <em>له طريق.</em></h2></div>
              <p>خدمات متنوعة للأفراد والمنشآت، مع وضوح في الخطوات ومتابعة لطلبك.</p>
            </div>
            <div className="service-grid">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <article className={`service-card service-card-${index + 1}`} key={category.title}>
                    <div className="service-card-top"><span className="service-icon"><Icon size={22} strokeWidth={1.8} /></span><span className="service-index">0{index + 1}</span></div>
                    <span className="service-kicker">{category.kicker}</span>
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                    <ul>{category.services.map((service) => <li key={service}><span className="bullet-check"><CheckCircle2 size={14} /></span>{service}</li>)}</ul>
                    <a className="card-link" href="#request" onClick={() => setField("category", category.title)} aria-label={`اطلب ${category.title}`}>اطلب هذه الخدمة <ArrowLeft size={15} /></a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="promise-section section-pad" id="why-us">
          <div className="container promise-layout">
            <div className="promise-intro">
              <span className="section-kicker section-kicker-light">لماذا مكتب البقمي 2؟</span>
              <h2>خدمة تعرف <em>خطوتها التالية.</em></h2>
              <p>نحترم وقتك ونوضح لك الإجراء، ونتابع التفاصيل معك حتى تكتمل الخدمة.</p>
              <a className="button button-sand" href="#request">تواصل معنا الآن <ArrowLeft size={17} /></a>
              <span className="promise-signature">مكتب البقمي 2 — نخدمك أينما كنت.</span>
            </div>
            <div className="promise-list">
              {promises.map((item, index) => {
                const Icon = item.icon;
                return <div className="promise-item" key={item.title}><span className="promise-number">0{index + 1}</span><span className="promise-icon"><Icon size={20} /></span><div><h3>{item.title}</h3><p>{item.text}</p></div></div>;
              })}
            </div>
          </div>
        </section>

        <section className="request-section section-pad" id="request">
          <div className="container request-layout">
            <div className="request-intro">
              <span className="section-kicker">ابدأ من هنا</span>
              <h2>خدمتك تبدأ <em>بطلب بسيط.</em></h2>
              <p>أرسل تفاصيلك، وسيتواصل معك فريقنا لمتابعة الخطوة المناسبة.</p>
              <div className="request-aside"><span><FileCheck2 size={18} /></span><div><strong>خطوات واضحة</strong><small>استلام الطلب ثم مراجعته ومتابعته معك.</small></div></div>
              <div className="request-aside"><span><ShieldCheck size={18} /></span><div><strong>بياناتك بأمان</strong><small>نستخدم معلوماتك لمتابعة الطلب فقط.</small></div></div>
            </div>
            <form className="request-form" onSubmit={handleSubmit}>
              <div className="form-heading"><div><span>نموذج طلب خدمة</span><h3>كيف نقدر نخدمك؟</h3></div><span className="form-step">01 <i /> 02</span></div>
              <div className="form-row">
                <label>الاسم الكامل<input required minLength={2} maxLength={120} autoComplete="name" placeholder="اكتب اسمك" value={form.customer_name} onChange={(event) => setField("customer_name", event.target.value)} /></label>
                <label>رقم الجوال<input required inputMode="tel" autoComplete="tel" maxLength={24} placeholder="05xxxxxxxx" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></label>
              </div>
              <label>البريد الإلكتروني <span className="optional">اختياري</span><input type="email" maxLength={254} autoComplete="email" placeholder="name@example.com" value={form.email} onChange={(event) => setField("email", event.target.value)} dir="ltr" /></label>
              <div className="form-row">
                <label>فئة الخدمة<select required value={form.category} onChange={(event) => { setField("category", event.target.value); setField("service", ""); }}><option value="">اختر الفئة</option>{Object.keys(serviceCatalog).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label>نوع الخدمة<select required disabled={!form.category} value={form.service} onChange={(event) => setField("service", event.target.value)}><option value="">{form.category ? "اختر الخدمة" : "اختر الفئة أولًا"}</option>{selectedServices.map((service) => <option key={service} value={service}>{service}</option>)}</select></label>
              </div>
              <label>تفاصيل الطلب<textarea required minLength={5} maxLength={1500} rows={4} placeholder="اكتب لنا نبذة عن الخدمة التي تحتاجها" value={form.details} onChange={(event) => setField("details", event.target.value)} /></label>
              <div className="form-submit-row"><p>بالإرسال، توافق على استخدام بياناتك للتواصل بشأن طلب الخدمة.</p><button className="button button-dark button-submit" type="submit" disabled={sending}>{sending ? "جارٍ الإرسال…" : "إرسال الطلب"}{sending ? <span className="button-spinner" /> : <ArrowLeft size={17} />}</button></div>
              {notice && <div className={`form-notice ${notice.kind}`} role="status"><CheckCircle2 size={18} />{notice.text}</div>}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="brand footer-brand" href="#top"><span className="brand-mark"><Navigation size={20} /></span><span className="brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>نخدمك أينما كنت</small></span></a>
          <p>جميع خدمات النقل والتأمين والخدمات الإلكترونية.</p>
          <a href="/admin" className="admin-link">لوحة الإدارة <ArrowUpLeft size={14} /></a>
          <span className="footer-copy">© مكتب البقمي 2</span>
        </div>
      </footer>
    </div>
  );
}
