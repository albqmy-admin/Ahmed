import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowUpLeft, BadgeCheck, Building2, CalendarDays, CarFront, Check, ChevronDown,
  CircleCheck, FileText, Landmark, MessageCircle, Search, ShieldCheck, Sparkles, Timer, X,
} from "lucide-react";
import { defaultCategories, defaultServices, loadPublicCatalog, type PublicCatalog, type ServiceCategory, type ServiceItem } from "@/lib/catalog";
import { trackPublicEvent } from "@/lib/analytics";

const defaultContent: PublicCatalog = { categories: defaultCategories, services: defaultServices, offers: [] };
const whatsappBase = "https://wa.me/966550718865";

const iconFor = (iconKey: string) => {
  if (iconKey === "insurance") return ShieldCheck;
  if (iconKey === "vehicles") return CarFront;
  if (iconKey === "digital") return Landmark;
  return Building2;
};

function serviceUrl(name: string): string {
  return `${whatsappBase}?text=${encodeURIComponent(`أرغب في خدمة: ${name}`)}`;
}

function normalizeArabic(value: string): string {
  return value.trim().toLocaleLowerCase("ar-SA")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي");
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00+03:00`);
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric", month: "long" }).format(date);
}

function recordSearch(value: string): void {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 100);
  if (normalized.length < 2 || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized) || /[+0-9٠-٩۰-۹][0-9٠-٩۰-۹\s()+-]{7,}/.test(normalized)) return;
  trackPublicEvent({ event_type: "search", label: "البحث في الخدمات", search_term: normalized });
}

export default function Home() {
  const [catalog, setCatalog] = useState<PublicCatalog>(defaultContent);
  const [query, setQuery] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const lastSearch = useRef("");

  useEffect(() => {
    let mounted = true;
    try {
      if (!sessionStorage.getItem("albugmi2-page-view")) {
        sessionStorage.setItem("albugmi2-page-view", "1");
        trackPublicEvent({ event_type: "page_view", label: "الرئيسية" });
      }
    } catch {
      trackPublicEvent({ event_type: "page_view", label: "الرئيسية" });
    }
    loadPublicCatalog().then(data => { if (mounted) setCatalog(data); }).catch(() => undefined).finally(() => { if (mounted) setLoadingCatalog(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const term = query.trim().replace(/\s+/g, " ");
    if (term.length < 2 || term === lastSearch.current) return;
    const timeout = window.setTimeout(() => {
      if (term !== lastSearch.current) {
        lastSearch.current = term;
        recordSearch(term);
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const filtered = useMemo(() => {
    const normalized = normalizeArabic(query);
    if (!normalized) return catalog;
    return {
      categories: catalog.categories,
      services: catalog.services.filter(service => normalizeArabic(`${service.name} ${service.description}`).includes(normalized)),
      offers: catalog.offers.filter(offer => normalizeArabic(`${offer.title} ${offer.description} ${offer.discount_label}`).includes(normalized)),
    };
  }, [catalog, query]);

  const totalServices = catalog.services.length;

  return (
    <div className="portal-shell" dir="rtl">
      <header className="portal-header">
        <div className="portal-container portal-header-inner">
          <a className="portal-brand" href="#top" aria-label="مكتب البقمي 2 — الصفحة الرئيسية">
            <span className="portal-brand-mark"><span className="portal-mark-road" /><Check size={15} strokeWidth={3} /></span>
            <span className="portal-brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>خدماتك في مكان واحد</small></span>
          </a>
          <nav className="portal-nav" aria-label="التنقل الرئيسي">
            <a href="#services">الخدمات</a>
            {catalog.offers.length > 0 && <a href="#offers">العروض</a>}
            <a href="#why-us">عن المكتب</a>
          </nav>
          <a className="portal-header-cta" href={`${whatsappBase}?text=${encodeURIComponent("السلام عليكم، أود الاستفسار عن خدمات مكتب البقمي 2")}`}><MessageCircle size={17} /> تواصل واتساب</a>
        </div>
      </header>

      <main id="top">
        <section className="portal-hero">
          <div className="portal-container portal-hero-grid">
            <div className="portal-hero-copy">
              <div className="portal-eyebrow"><span /> مكتب البقمي 2 <i /></div>
              <h1>خدماتك الحكومية وخدمات النقل والتأمين <em>في مكان واحد.</em></h1>
              <p>جميع خدمات النقل والتأمين والخدمات الإلكترونية — بإنجاز دقيق ومتابعة مستمرة، للأفراد والمنشآت.</p>
              <div className="portal-hero-actions">
                <a className="portal-primary-button" href="#services">اختر خدمتك <ArrowLeft size={17} /></a>
                <a className="portal-text-link" href={`${whatsappBase}?text=${encodeURIComponent("السلام عليكم، أود الاستفسار عن خدمات مكتب البقمي 2")}`}>استفسر عبر واتساب <ArrowUpLeft size={15} /></a>
              </div>
              <div className="portal-hero-proof"><span><BadgeCheck size={17} /></span><div><strong>خدمة ومتابعة في مكان واحد</strong><small>اختر الخدمة وسنفتح لك محادثة واتساب مباشرة.</small></div></div>
            </div>
            <div className="portal-hero-card" aria-label="ملخص خدمات المكتب">
              <div className="portal-card-topline"><span className="portal-status-dot" /> خدمة مباشرة</div>
              <div className="portal-route-art" aria-hidden="true"><span className="route-line route-line-a" /><span className="route-line route-line-b" /><span className="route-point route-point-a" /><span className="route-point route-point-b" /><span className="route-car"><CarFront size={36} /></span><span className="route-destination"><Check size={16} /></span></div>
              <div className="portal-hero-card-bottom"><div><small>القائمة تشمل</small><strong>{totalServices} خدمة</strong></div><span>نقل • تأمين • خدمات إلكترونية</span></div>
            </div>
          </div>
          <div className="portal-container portal-trust-strip"><span>سرعة في الإنجاز</span><i /><span>دقة في الإجراءات</span><i /><span>أمانة في التعامل</span><i /><span>متابعة حتى الإتمام</span></div>
        </section>

        <section className="portal-services-section" id="services">
          <div className="portal-container">
            <div className="portal-section-heading">
              <div><span className="portal-kicker">قائمة الخدمات</span><h2>اختر الخدمة <em>وتواصل مباشرة.</em></h2></div>
              <p>اضغط على اسم الخدمة لفتح واتساب برسالة تتضمن اختيارك.</p>
            </div>
            <label className="portal-search"><Search size={20} /><input aria-label="ابحث عن خدمة" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن خدمة مثل نقل الملكية أو التأمين" /><span className="portal-search-hint">{loadingCatalog ? "جارٍ تحديث القائمة" : `${filtered.services.length} خدمة`}</span>{query && <button type="button" aria-label="مسح البحث" onClick={() => setQuery("")}><X size={16} /></button>}</label>

            {filtered.categories.length === 0 || filtered.services.length === 0 ? (
              <div className="portal-empty"><Search size={23} /><strong>لم نجد خدمة بهذا الاسم</strong><span>جرّب عبارة أخرى أو تواصل معنا مباشرة.</span><a href={`${whatsappBase}?text=${encodeURIComponent("السلام عليكم، أبحث عن خدمة غير ظاهرة في القائمة")}`}>اسألنا على واتساب <ArrowLeft size={15} /></a></div>
            ) : (
              <div className="portal-category-list">
                {filtered.categories.map((category: ServiceCategory, index: number) => {
                  const items = filtered.services.filter((service: ServiceItem) => service.category_id === category.id);
                  if (items.length === 0) return null;
                  const Icon = iconFor(category.icon_key);
                  return <section className="portal-category" key={category.id}>
                    <div className="portal-category-heading"><span className={`portal-category-icon portal-category-icon-${category.icon_key}`}><Icon size={21} /></span><div><span className="portal-kicker">{category.kicker || "خدمات المكتب"}</span><h3>{category.name}</h3><p>{category.description}</p></div><span className="portal-category-index">0{index + 1}</span></div>
                    <div className="portal-service-list">
                      {items.map(service => <a className="portal-service-link" href={serviceUrl(service.name)} key={service.id} onClick={() => trackPublicEvent({ event_type: "service_click", label: service.name, ...(service.id.startsWith("default-") ? {} : { service_id: service.id }) })}>
                        <span className="portal-service-check"><Check size={14} /></span><span className="portal-service-text"><strong>{service.name}</strong>{service.description && <small>{service.description}</small>}</span><span className="portal-service-action"><MessageCircle size={16} /> واتساب</span><ArrowLeft className="portal-service-arrow" size={16} />
                      </a>)}
                    </div>
                  </section>;
                })}
              </div>
            )}
          </div>
        </section>

        {filtered.offers.length > 0 && <section className="portal-offers-section" id="offers">
          <div className="portal-container">
            <div className="portal-section-heading"><div><span className="portal-kicker">عروض المكتب</span><h2>فرص تستحق <em>الاطلاع.</em></h2></div><p>تعرّف على العروض المتاحة وتواصل معنا مباشرة للاستفادة منها.</p></div>
            <div className="portal-offers-grid">{filtered.offers.map(offer => <article className="portal-offer-card" key={offer.id}>
              {offer.image_url ? <img src={offer.image_url} alt={offer.title} loading="lazy" /> : <div className="portal-offer-placeholder"><Sparkles size={33} /><span>عرض خاص</span></div>}
              <div className="portal-offer-body"><div className="portal-offer-top"><span><Sparkles size={14} /> {offer.discount_label || "عرض متاح"}</span>{offer.valid_until && <small><CalendarDays size={13} /> حتى {formatDate(offer.valid_until)}</small>}</div><h3>{offer.title}</h3><p>{offer.description}</p>
                <a className="portal-offer-cta" href={`${whatsappBase}?text=${encodeURIComponent(`أرغب في الاستفادة من العرض: ${offer.title}`)}`} onClick={() => trackPublicEvent({ event_type: "offer_click", label: offer.title, offer_id: offer.id })}>اسأل عن العرض <ArrowLeft size={15} /></a>
              </div>
            </article>)}</div>
          </div>
        </section>}

        <section className="portal-why-section" id="why-us">
          <div className="portal-container portal-why-grid">
            <div className="portal-why-intro"><span className="portal-kicker">لماذا مكتب البقمي 2؟</span><h2>خطوة واضحة، <em>ومتابعة مستمرة.</em></h2><p>نخدمك في خدمات النقل والتأمين والإجراءات الإلكترونية باحترافية واهتمام بالتفاصيل.</p><a className="portal-light-button" href={`${whatsappBase}?text=${encodeURIComponent("السلام عليكم، أود الاستفسار عن خدمات مكتب البقمي 2")}`}>تواصل معنا الآن <MessageCircle size={17} /></a></div>
            <div className="portal-promises">
              <div><span>01</span><i><Timer size={20} /></i><section><strong>سرعة في الإنجاز</strong><small>نبدأ معك الخطوات بوضوح.</small></section></div>
              <div><span>02</span><i><CircleCheck size={20} /></i><section><strong>دقة في الإجراءات</strong><small>اهتمام بالتفاصيل ومراجعة لكل خطوة.</small></section></div>
              <div><span>03</span><i><ShieldCheck size={20} /></i><section><strong>أمانة في التعامل</strong><small>وضوح في التواصل معك.</small></section></div>
              <div><span>04</span><i><BadgeCheck size={20} /></i><section><strong>متابعة حتى الإتمام</strong><small>نبقى معك خلال خطوات الخدمة.</small></section></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="portal-footer"><div className="portal-container portal-footer-inner"><a className="portal-brand" href="#top"><span className="portal-brand-mark"><span className="portal-mark-road" /><Check size={15} strokeWidth={3} /></span><span className="portal-brand-copy"><strong>مكتب البقمي <b>2</b></strong><small>نخدمك أينما كنت</small></span></a><p>جميع خدمات النقل والتأمين والخدمات الإلكترونية.</p><a className="portal-admin-link" href="/admin">إدارة المكتب <ChevronDown size={13} /></a></div></footer>
      <a className="portal-mobile-cta" href={`${whatsappBase}?text=${encodeURIComponent("السلام عليكم، أود الاستفسار عن خدمات مكتب البقمي 2")}`}><MessageCircle size={19} /> تواصل على واتساب</a>
    </div>
  );
}
