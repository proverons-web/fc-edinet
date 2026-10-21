import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Статистика сайта — Админ" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ period?: string | string[] }> };
type Summary = {
  unique_24h: number; unique_7d: number; unique_30d: number; unique_total: number;
  pageviews_24h: number; pageviews_7d: number; pageviews_30d: number; pageviews_total: number;
  period_unique: number; period_pageviews: number; period_new: number; period_returning: number;
};
type Comparison = { current_unique: number; previous_unique: number; current_pageviews: number; previous_pageviews: number; current_new: number; previous_new: number };
type DailyRow = { date: string; unique: number; pageviews: number };
type PageRow = { path: string; pageviews: number; unique_visitors: number };
type ReferrerRow = { source: string; pageviews: number; unique_visitors: number };
type CountryRow = { country_code: string; pageviews: number; unique_visitors: number };
type DeviceRow = { device: string; pageviews: number; unique_visitors: number };
type LocaleRow = { locale: string; pageviews: number; unique_visitors: number };
type ViewportRow = { bucket: string; pageviews: number; unique_visitors: number; sort_order: number };
type RecentRow = {
  visitor: string; first_seen: string; last_seen: string; pageviews: number; last_path: string | null; referrer: string | null;
  country_code: string | null; device: string | null; viewport_width: number | null; viewport_height: number | null; locale: string | null;
};
type AnalyticsPayload = {
  period_days: number; summary: Summary; comparison: Comparison; daily: DailyRow[]; top_pages: PageRow[]; referrers: ReferrerRow[];
  countries: CountryRow[]; devices: DeviceRow[]; locales: LocaleRow[]; viewports: ViewportRow[]; recent: RecentRow[];
};

const allowedPeriods = [7, 30, 90, 365];
const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function number(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function list<T>(raw: Record<string, unknown>, key: string) { return Array.isArray(raw[key]) ? raw[key] as T[] : []; }

function normalizePayload(value: unknown, fallbackDays: number): AnalyticsPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const s = (raw.summary && typeof raw.summary === "object" ? raw.summary : {}) as Record<string, unknown>;
  const c = (raw.comparison && typeof raw.comparison === "object" ? raw.comparison : {}) as Record<string, unknown>;
  return {
    period_days: number(raw.period_days) || fallbackDays,
    summary: {
      unique_24h: number(s.unique_24h), unique_7d: number(s.unique_7d), unique_30d: number(s.unique_30d), unique_total: number(s.unique_total),
      pageviews_24h: number(s.pageviews_24h), pageviews_7d: number(s.pageviews_7d), pageviews_30d: number(s.pageviews_30d), pageviews_total: number(s.pageviews_total),
      period_unique: number(s.period_unique), period_pageviews: number(s.period_pageviews), period_new: number(s.period_new), period_returning: number(s.period_returning),
    },
    comparison: {
      current_unique: number(c.current_unique), previous_unique: number(c.previous_unique), current_pageviews: number(c.current_pageviews), previous_pageviews: number(c.previous_pageviews),
      current_new: number(c.current_new), previous_new: number(c.previous_new),
    },
    daily: list<DailyRow>(raw, "daily"), top_pages: list<PageRow>(raw, "top_pages"), referrers: list<ReferrerRow>(raw, "referrers"),
    countries: list<CountryRow>(raw, "countries"), devices: list<DeviceRow>(raw, "devices"), locales: list<LocaleRow>(raw, "locales"), viewports: list<ViewportRow>(raw, "viewports"),
    recent: list<RecentRow>(raw, "recent"),
  };
}

function fmt(value: number) { return new Intl.NumberFormat("ru-RU").format(value); }
function fmtDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", withTime
    ? { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }
    : { day: "2-digit", month: "short", timeZone: "Europe/Chisinau" }).format(date);
}
function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
function deltaText(current: number, previous: number) {
  const d = delta(current, previous);
  return `${d > 0 ? "+" : ""}${d}% к прошлому периоду`;
}
function countryName(code: string | null | undefined) {
  if (!code || code === "XX") return "Не определено";
  try { return regionNames.of(code) || code; } catch { return code; }
}
function flag(code: string | null | undefined) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}
function deviceLabel(value: string | null | undefined) {
  if (value === "mobile") return "Телефон";
  if (value === "tablet") return "Планшет";
  if (value === "desktop") return "Компьютер";
  return "Не определено";
}
function localeLabel(value: string | null | undefined) {
  if (value === "ru") return "Русский";
  if (value === "ro") return "Română";
  if (value === "other") return "Другой";
  return "Не определено";
}

export default async function SiteAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Number(single(params.period));
  const days = allowedPeriods.includes(requested) ? requested : 30;
  const { supabase } = await requireEditor();
  const { data, error } = await supabase.rpc("admin_site_analytics", { p_days: days });
  const analytics = normalizePayload(data, days);

  if (error || !analytics) {
    return <main className="adminPage siteAnalyticsPage">
      <section className="adminDashboardIntro"><div><p className="eyebrow blue">АНАЛИТИКА САЙТА</p><h1>Статистика посещений</h1><p>Аналитика временно недоступна.</p></div><Link href="/admin" className="secondaryAdminButton">← Админка</Link></section>
      <section className="analyticsSetupNotice"><strong>Проверь migration 049_visitor_analytics_dimensions.sql</strong><p>Он добавляет страны, устройства, viewport, языки и сравнение периодов.</p><code>{error?.message || "RPC admin_site_analytics недоступен"}</code></section>
    </main>;
  }

  const summary = analytics.summary;
  const comparison = analytics.comparison;
  const maxDaily = Math.max(1, ...analytics.daily.map((row) => Math.max(number(row.pageviews), number(row.unique))));
  const avgPages = summary.period_unique ? summary.period_pageviews / summary.period_unique : 0;
  const returnRate = summary.period_unique ? Math.round((summary.period_returning / summary.period_unique) * 100) : 0;

  return <main className="adminPage siteAnalyticsPage">
    <section className="adminDashboardIntro siteAnalyticsIntro">
      <div><p className="eyebrow blue">АНАЛИТИКА САЙТА · 2.0</p><h1>Статистика посещений</h1><p>Анонимные посетители, страницы, страны, устройства и язык интерфейса. IP-адреса и координаты не сохраняются.</p></div>
      <div className="analyticsPeriodTabs" aria-label="Период статистики">{allowedPeriods.map((period) => <Link key={period} className={days === period ? "active" : ""} href={`/admin/site-analytics?period=${period}`}>{period === 365 ? "1 год" : `${period} дней`}</Link>)}</div>
    </section>

    <section className="analyticsKpiGrid">
      <AnalyticsKpi label="Уникальные · 24 часа" value={summary.unique_24h} hint="активных посетителей" accent="blue" />
      <AnalyticsKpi label="Уникальные · 7 дней" value={summary.unique_7d} hint="за последнюю неделю" />
      <AnalyticsKpi label="Уникальные · 30 дней" value={summary.unique_30d} hint="за последние 30 дней" />
      <AnalyticsKpi label="Уникальные · всего" value={summary.unique_total} hint="за всё время" />
      <AnalyticsKpi label={`Просмотры · ${days} дней`} value={summary.period_pageviews} hint={`${avgPages.toFixed(1)} страницы на посетителя`} accent="yellow" />
      <AnalyticsKpi label="Новые" value={summary.period_new} hint={`за ${days} дней`} />
      <AnalyticsKpi label="Вернувшиеся" value={summary.period_returning} hint={`${returnRate}% от аудитории периода`} />
      <AnalyticsKpi label="Просмотры · всего" value={summary.pageviews_total} hint="все зарегистрированные pageview" />
    </section>

    <section className="analyticsPanel">
      <header><div><p className="eyebrow blue">СРАВНЕНИЕ</p><h2>Текущий период против предыдущего</h2></div><span className="analyticsPrivacy">по {days} дней</span></header>
      <div className="analyticsKpiGrid">
        <AnalyticsKpi label="Уникальные" value={comparison.current_unique} hint={`${deltaText(comparison.current_unique, comparison.previous_unique)} · было ${fmt(comparison.previous_unique)}`} accent="blue" />
        <AnalyticsKpi label="Просмотры" value={comparison.current_pageviews} hint={`${deltaText(comparison.current_pageviews, comparison.previous_pageviews)} · было ${fmt(comparison.previous_pageviews)}`} />
        <AnalyticsKpi label="Новые посетители" value={comparison.current_new} hint={`${deltaText(comparison.current_new, comparison.previous_new)} · было ${fmt(comparison.previous_new)}`} />
      </div>
    </section>

    <section className="analyticsPanel analyticsTrafficPanel">
      <header><div><p className="eyebrow blue">ДИНАМИКА</p><h2>Посещения по дням</h2></div><div className="analyticsLegend"><span><i className="unique" />Уникальные</span><span><i className="views" />Просмотры</span></div></header>
      <div className="analyticsChartScroller"><div className="analyticsChart" style={{ "--chart-days": String(Math.max(analytics.daily.length, 7)) } as React.CSSProperties}>{analytics.daily.map((row) => <div className="analyticsChartDay" key={row.date} title={`${fmtDate(row.date)} · уникальные ${fmt(number(row.unique))} · просмотры ${fmt(number(row.pageviews))}`}><div className="analyticsBars"><i className="views" style={{ height: number(row.pageviews) ? `${Math.max(2, (number(row.pageviews) / maxDaily) * 100)}%` : "0%" }} /><i className="unique" style={{ height: number(row.unique) ? `${Math.max(2, (number(row.unique) / maxDaily) * 100)}%` : "0%" }} /></div><span>{fmtDate(row.date)}</span></div>)}</div></div>
    </section>

    <section className="analyticsTwoColumns">
      <AnalyticsRank title="Страны посетителей" eyebrow="ГЕОГРАФИЯ" rows={analytics.countries.map((row) => ({ key: row.country_code, label: `${flag(row.country_code)} ${countryName(row.country_code)}`, hint: `${fmt(number(row.pageviews))} просмотров`, value: fmt(number(row.unique_visitors)) }))} valueTitle="уникальных" />
      <AnalyticsRank title="Устройства" eyebrow="УСТРОЙСТВА" rows={analytics.devices.map((row) => ({ key: row.device, label: deviceLabel(row.device), hint: `${fmt(number(row.unique_visitors))} уникальных`, value: fmt(number(row.pageviews)) }))} valueTitle="просмотров" />
    </section>

    <section className="analyticsTwoColumns">
      <AnalyticsRank title="Язык сайта" eyebrow="RU / RO" rows={analytics.locales.map((row) => ({ key: row.locale, label: localeLabel(row.locale), hint: `${fmt(number(row.unique_visitors))} уникальных`, value: fmt(number(row.pageviews)) }))} valueTitle="просмотров" />
      <AnalyticsRank title="Ширина экрана" eyebrow="VIEWPORT" rows={analytics.viewports.map((row) => ({ key: row.bucket, label: row.bucket, hint: `${fmt(number(row.unique_visitors))} уникальных`, value: fmt(number(row.pageviews)) }))} valueTitle="просмотров" />
    </section>

    <section className="analyticsTwoColumns">
      <AnalyticsRank title="Популярные страницы" eyebrow="КОНТЕНТ" rows={analytics.top_pages.map((row) => ({ key: row.path, label: row.path, hint: `${fmt(number(row.unique_visitors))} уникальных`, value: fmt(number(row.pageviews)) }))} valueTitle="просмотров" />
      <AnalyticsRank title="Откуда приходят" eyebrow="ИСТОЧНИКИ" rows={analytics.referrers.map((row, index) => ({ key: `${row.source}-${index}`, label: row.source, hint: `${fmt(number(row.unique_visitors))} уникальных`, value: fmt(number(row.pageviews)) }))} valueTitle="просмотров" />
    </section>

    <section className="analyticsPanel">
      <header><div><p className="eyebrow blue">ПОСЛЕДНЯЯ АКТИВНОСТЬ</p><h2>Недавние посетители</h2></div><span className="analyticsPrivacy">Анонимные ID · без IP</span></header>
      <div className="analyticsTableWrap"><table className="analyticsTable"><thead><tr><th>Посетитель</th><th>Страна</th><th>Устройство</th><th>Viewport</th><th>Язык</th><th>Последний визит</th><th>Просмотры</th><th>Страница</th><th>Источник</th></tr></thead><tbody>{analytics.recent.map((row) => <tr key={`${row.visitor}-${row.last_seen}`}><td><code>{row.visitor}</code></td><td>{flag(row.country_code)} {countryName(row.country_code)}</td><td>{deviceLabel(row.device)}</td><td>{row.viewport_width && row.viewport_height ? `${row.viewport_width}×${row.viewport_height}` : "—"}</td><td>{localeLabel(row.locale)}</td><td>{fmtDate(row.last_seen, true)}</td><td><strong>{fmt(number(row.pageviews))}</strong></td><td>{row.last_path || "—"}</td><td>{row.referrer || "Прямой заход"}</td></tr>)}</tbody></table></div>
    </section>
  </main>;
}

function AnalyticsKpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: "blue" | "yellow" }) {
  return <article className={`analyticsKpi${accent ? ` is-${accent}` : ""}`}><span>{label}</span><strong>{fmt(value)}</strong><small>{hint}</small></article>;
}

function AnalyticsRank({ title, eyebrow, rows, valueTitle }: { title: string; eyebrow: string; rows: { key: string; label: string; hint: string; value: string }[]; valueTitle: string }) {
  return <div className="analyticsPanel"><header><div><p className="eyebrow blue">{eyebrow}</p><h2>{title}</h2></div><span className="analyticsPrivacy">{valueTitle}</span></header><div className="analyticsRankList">{rows.length ? rows.map((row, index) => <div key={row.key}><b>{index + 1}</b><span><strong>{row.label}</strong><small>{row.hint}</small></span><em>{row.value}</em></div>) : <p className="analyticsEmpty">Данных пока нет.</p>}</div></div>;
}
