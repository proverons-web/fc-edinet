import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Статистика сайта — Админ" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ period?: string | string[] }> };

type Summary = {
  unique_24h: number;
  unique_7d: number;
  unique_30d: number;
  unique_total: number;
  pageviews_24h: number;
  pageviews_7d: number;
  pageviews_30d: number;
  pageviews_total: number;
  period_unique: number;
  period_pageviews: number;
  period_new: number;
  period_returning: number;
};

type DailyRow = { date: string; unique: number; pageviews: number };
type PageRow = { path: string; pageviews: number; unique_visitors: number };
type ReferrerRow = { source: string; pageviews: number; unique_visitors: number };
type RecentRow = { visitor: string; first_seen: string; last_seen: string; pageviews: number; last_path: string | null; referrer: string | null };
type AnalyticsPayload = { period_days: number; summary: Summary; daily: DailyRow[]; top_pages: PageRow[]; referrers: ReferrerRow[]; recent: RecentRow[] };

const allowedPeriods = [7, 30, 90, 365];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePayload(value: unknown, fallbackDays: number): AnalyticsPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const s = (raw.summary && typeof raw.summary === "object" ? raw.summary : {}) as Record<string, unknown>;
  const list = <T,>(key: string) => Array.isArray(raw[key]) ? raw[key] as T[] : [];
  return {
    period_days: number(raw.period_days) || fallbackDays,
    summary: {
      unique_24h: number(s.unique_24h), unique_7d: number(s.unique_7d), unique_30d: number(s.unique_30d), unique_total: number(s.unique_total),
      pageviews_24h: number(s.pageviews_24h), pageviews_7d: number(s.pageviews_7d), pageviews_30d: number(s.pageviews_30d), pageviews_total: number(s.pageviews_total),
      period_unique: number(s.period_unique), period_pageviews: number(s.period_pageviews), period_new: number(s.period_new), period_returning: number(s.period_returning),
    },
    daily: list<DailyRow>("daily"), top_pages: list<PageRow>("top_pages"), referrers: list<ReferrerRow>("referrers"), recent: list<RecentRow>("recent"),
  };
}

function fmt(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function fmtDate(value: string, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", withTime ? { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" } : { day: "2-digit", month: "short", timeZone: "Europe/Chisinau" }).format(date);
}

export default async function SiteAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Number(single(params.period));
  const days = allowedPeriods.includes(requested) ? requested : 30;
  const { supabase } = await requireEditor();
  const { data, error } = await supabase.rpc("admin_site_analytics", { p_days: days });
  const analytics = normalizePayload(data, days);

  if (error || !analytics) {
    return (
      <main className="adminPage siteAnalyticsPage">
        <section className="adminDashboardIntro">
          <div><p className="eyebrow blue">АНАЛИТИКА САЙТА</p><h1>Статистика посещений</h1><p>Счётчик ещё не подключён к базе данных.</p></div>
          <Link href="/admin" className="secondaryAdminButton">← Админка</Link>
        </section>
        <section className="analyticsSetupNotice">
          <strong>Нужно применить migration 048_visitor_analytics.sql</strong>
          <p>После выполнения SQL в Supabase здесь автоматически появятся уникальные посетители, просмотры, графики, популярные страницы и источники переходов.</p>
          <code>{error?.message || "RPC admin_site_analytics недоступен"}</code>
        </section>
      </main>
    );
  }

  const summary = analytics.summary;
  const maxDaily = Math.max(1, ...analytics.daily.map((row) => Math.max(number(row.pageviews), number(row.unique))));
  const avgPages = summary.period_unique ? summary.period_pageviews / summary.period_unique : 0;
  const returnRate = summary.period_unique ? Math.round((summary.period_returning / summary.period_unique) * 100) : 0;

  return (
    <main className="adminPage siteAnalyticsPage">
      <section className="adminDashboardIntro siteAnalyticsIntro">
        <div>
          <p className="eyebrow blue">АНАЛИТИКА САЙТА</p>
          <h1>Статистика посещений</h1>
          <p>Уникальные посетители и просмотры публичных страниц. IP-адреса не сохраняются.</p>
        </div>
        <div className="analyticsPeriodTabs" aria-label="Период статистики">
          {allowedPeriods.map((period) => <Link key={period} className={days === period ? "active" : ""} href={`/admin/site-analytics?period=${period}`}>{period === 365 ? "1 год" : `${period} дней`}</Link>)}
        </div>
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

      <section className="analyticsPanel analyticsTrafficPanel">
        <header><div><p className="eyebrow blue">ДИНАМИКА</p><h2>Посещения по дням</h2></div><div className="analyticsLegend"><span><i className="unique" />Уникальные</span><span><i className="views" />Просмотры</span></div></header>
        <div className="analyticsChartScroller">
          <div className="analyticsChart" style={{ "--chart-days": String(Math.max(analytics.daily.length, 7)) } as React.CSSProperties}>
            {analytics.daily.map((row) => (
              <div className="analyticsChartDay" key={row.date} title={`${fmtDate(row.date)} · уникальные ${fmt(number(row.unique))} · просмотры ${fmt(number(row.pageviews))}`}>
                <div className="analyticsBars">
                  <i className="views" style={{ height: number(row.pageviews) ? `${Math.max(2, (number(row.pageviews) / maxDaily) * 100)}%` : "0%" }} />
                  <i className="unique" style={{ height: number(row.unique) ? `${Math.max(2, (number(row.unique) / maxDaily) * 100)}%` : "0%" }} />
                </div>
                <span>{fmtDate(row.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="analyticsTwoColumns">
        <div className="analyticsPanel">
          <header><div><p className="eyebrow blue">КОНТЕНТ</p><h2>Популярные страницы</h2></div></header>
          <div className="analyticsRankList">
            {analytics.top_pages.length ? analytics.top_pages.map((row, index) => <div key={row.path}><b>{index + 1}</b><span><strong>{row.path}</strong><small>{fmt(number(row.unique_visitors))} уникальных</small></span><em>{fmt(number(row.pageviews))}</em></div>) : <p className="analyticsEmpty">Данных пока нет.</p>}
          </div>
        </div>
        <div className="analyticsPanel">
          <header><div><p className="eyebrow blue">ИСТОЧНИКИ</p><h2>Откуда приходят</h2></div></header>
          <div className="analyticsRankList">
            {analytics.referrers.length ? analytics.referrers.map((row, index) => <div key={`${row.source}-${index}`}><b>{index + 1}</b><span><strong>{row.source}</strong><small>{fmt(number(row.unique_visitors))} уникальных</small></span><em>{fmt(number(row.pageviews))}</em></div>) : <p className="analyticsEmpty">Данных пока нет.</p>}
          </div>
        </div>
      </section>

      <section className="analyticsPanel">
        <header><div><p className="eyebrow blue">ПОСЛЕДНЯЯ АКТИВНОСТЬ</p><h2>Недавние посетители</h2></div><span className="analyticsPrivacy">Анонимные ID · без IP</span></header>
        <div className="analyticsTableWrap">
          <table className="analyticsTable">
            <thead><tr><th>Посетитель</th><th>Первый визит</th><th>Последний визит</th><th>Просмотры</th><th>Последняя страница</th><th>Источник</th></tr></thead>
            <tbody>{analytics.recent.map((row) => <tr key={`${row.visitor}-${row.last_seen}`}><td><code>{row.visitor}</code></td><td>{fmtDate(row.first_seen, true)}</td><td>{fmtDate(row.last_seen, true)}</td><td><strong>{fmt(number(row.pageviews))}</strong></td><td>{row.last_path || "—"}</td><td>{row.referrer || "Прямой заход"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function AnalyticsKpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: "blue" | "yellow" }) {
  return <article className={`analyticsKpi${accent ? ` is-${accent}` : ""}`}><span>{label}</span><strong>{fmt(value)}</strong><small>{hint}</small></article>;
}
