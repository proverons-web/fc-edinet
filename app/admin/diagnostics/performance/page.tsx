import Link from "next/link";
import { requireAdmin } from "@/lib/editorial";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { filterRumByDevice, summarizeRum, type RumDeviceFilter, type RumSample } from "@/lib/rum-report";

export const metadata = { title: "Реальная скорость и ошибки — FC Edineț" };
export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  LCP: "Основной контент (LCP)", INP: "Отклик на действие (INP)",
  CLS: "Стабильность верстки (CLS)", FCP: "Первый контент (FCP)",
  TTFB: "Ответ сервера (TTFB)",
};
const DEVICE: Record<string, string> = { mobile: "Телефоны", tablet: "Планшеты", desktop: "Компьютеры" };
const RATING: Record<string, string> = {
  good: "Хорошо", poor: "Нужно улучшить", "needs-improvement": "Есть отклонения", insufficient: "Недостаточно измерений",
};

export default async function PerformanceMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; device?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const period = params.days;
  const days = period === "1" ? 1 : period === "30" ? 30 : 7;
  const device: RumDeviceFilter =
    params.device === "mobile" || params.device === "tablet" || params.device === "desktop"
      ? params.device : "all";
  const missingSalt = !process.env.ANALYTICS_IP_SALT?.trim();
  let issue: string | null = null;
  let truncated = false;
  let rows: RumSample[] = [];
  if (!isSupabaseAdminConfigured()) {
    issue = "Для мониторинга нужен SUPABASE_SECRET_KEY в настройках сервера. Секрет не передаётся браузеру.";
  } else {
    try {
      const from = new Date(Date.now() - days * 86400000).toISOString();
      // PostgREST normally caps each response at 1000 records. Page explicitly,
      // otherwise a busy site's report silently includes only the first page.
      const client = createAdminClient();
      for (let offset = 0; offset <= 10000; offset += 1000) {
        const { data, error } = await client.from("rum_samples")
          .select("recorded_at,metric,value,route_key,device_type")
          .gte("recorded_at", from).order("recorded_at", { ascending: false })
          .range(offset, offset === 10000 ? offset : offset + 999);
        if (error) {
          rows = [];
          issue = "Нет доступа к данным мониторинга. Проверь миграцию 078 и серверный ключ Supabase.";
          break;
        }
        const page = (data ?? []) as RumSample[];
        if (offset === 10000) { truncated = page.length > 0; break; }
        rows.push(...page);
        if (page.length < 1000) break;
      }
    } catch { issue = "Не удалось получить данные. Проверь подключение к Supabase."; }
  }
  // Filter only after the database query, keeping the same anonymized dataset.
  const report = summarizeRum(filterRumByDevice(rows, device));
  const latestRecordedAt = rows[0]?.recorded_at ?? null;
  const latestLabel = latestRecordedAt
    ? new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Chisinau", day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(latestRecordedAt))
    : "Нет данных";
  return (
    <main className="adminPage diagnosticsPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • FIELD METRICS</p>
            <h1>Реальная скорость и ошибки</h1>
            <p>Обезличенные измерения браузеров посетителей. Без IP-адресов, идентификаторов пользователей и текста ошибок.</p>
          </div>
          <div className="adminHeroActions"><Link className="secondaryButton" href="/admin/diagnostics">← Диагностика</Link></div>
        </div>
      </section>
      <section className="section adminSurface">
        <div className="container diagnosticsStack">
          <div className="diagnosticsQuickLinks" aria-label="Период отчёта">
            <Link className="secondaryButton" href={`?days=1&device=${device}`} aria-current={days === 1 ? "page" : undefined}>24 часа</Link>
            <Link className="secondaryButton" href={`?days=7&device=${device}`} aria-current={days === 7 ? "page" : undefined}>7 дней</Link>
            <Link className="secondaryButton" href={`?days=30&device=${device}`} aria-current={days === 30 ? "page" : undefined}>30 дней</Link>
          </div>
          <div className="diagnosticsQuickLinks" aria-label="Устройство">
            <Link className="secondaryButton" href={`?days=${days}&device=all`} aria-current={device === "all" ? "page" : undefined}>Все устройства</Link>
            <Link className="secondaryButton" href={`?days=${days}&device=mobile`} aria-current={device === "mobile" ? "page" : undefined}>Телефоны</Link>
            <Link className="secondaryButton" href={`?days=${days}&device=tablet`} aria-current={device === "tablet" ? "page" : undefined}>Планшеты</Link>
            <Link className="secondaryButton" href={`?days=${days}&device=desktop`} aria-current={device === "desktop" ? "page" : undefined}>Компьютеры</Link>
          </div>
          {issue && <div className="diagnosticsNote"><strong>Мониторинг пока недоступен</strong><p>{issue}</p></div>}
          {!issue && missingSalt && <div className="diagnosticsNote"><strong>Приём новых измерений выключен</strong><p>На сервере отсутствует ANALYTICS_IP_SALT. Ранее записанные данные по-прежнему доступны, но новые измерения не сохраняются. Настрой переменную в Vercel Production и выполни Redeploy.</p></div>}
          {!issue && !missingSalt && rows.length === 0 && <div className="diagnosticsNote"><strong>Пока нет измерений за выбранный период</strong><p>Приёмник настроен. Открой публичные страницы обычным браузером, затем обнови отчёт. Отсутствие измерений не означает отсутствия проблем.</p></div>}
          {!issue && rows.length > 0 && report.samples === 0 && <div className="diagnosticsNote"><strong>Нет измерений для этого устройства</strong><p>Выбери «Все устройства» или другой тип устройства.</p></div>}
          {truncated && <div className="diagnosticsNote"><p>Выведены только последние 10 000 записей. Это выборка, а не весь период.</p></div>}
          <div className="diagnosticsSummary">
            <article className="diagnosticsSummaryCard tone-blue"><span>Приёмник данных</span><strong>{issue ? "Проверить" : missingSalt ? "Не настроен" : "Готов"}</strong><small>Секретные значения не отображаются</small></article>
            <article className="diagnosticsSummaryCard tone-blue"><span>Последняя запись</span><strong>{latestLabel}</strong><small>По всем устройствам за выбранный период</small></article>
            <article className="diagnosticsSummaryCard tone-blue"><span>Измерений</span><strong>{report.samples}</strong><small>{device === "all" ? "Все устройства" : DEVICE[device]} · {days === 1 ? "24 часа" : `${days} дней`}</small></article>
            <article className="diagnosticsSummaryCard tone-amber"><span>Событий JavaScript</span><strong>{report.errors}</strong><small>Без сообщений и стеков вызовов</small></article>
          </div>
          <section className="diagnosticsPanel wide">
            <header><p className="eyebrow">CORE WEB VITALS</p><h2>75-й процентиль (p75)</h2></header>
            <div className="diagnosticsPanelBody">
              <p>Порог качества оценивается только при наличии 10 и более измерений каждого показателя. Значения отфильтрованы по устройству; суммарно за период получено {rows.length} записей. Одна сессия может отправить несколько показателей — это не число уникальных пользователей.</p>
              <div className="diagnosticsCheckGrid">
                {report.vitals.map((v) => (
                  <div className="diagnosticsRow" key={v.metric}>
                    <div><strong>{TITLES[v.metric]}</strong><small>{v.count} измерений · {RATING[v.rating]}</small></div>
                    <b>{v.p75 === null ? "—" : `${v.metric === "CLS" ? v.p75.toFixed(3) : Math.round(v.p75)} ${v.unit}`}</b>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className="diagnosticsGrid">
            <section className="diagnosticsPanel">
              <header><p className="eyebrow">DEVICES</p><h2>Устройства</h2></header>
              <div className="diagnosticsPanelBody">
                {report.devices.map((d) => <div className="diagnosticsRow" key={d.device}><strong>{DEVICE[d.device]}</strong><b>{d.count}</b></div>)}
              </div>
            </section>
            <section className="diagnosticsPanel">
              <header><p className="eyebrow">ROUTES</p><h2>Страницы с отклонениями</h2></header>
              <div className="diagnosticsPanelBody">
                {!report.routes.length && <p>Пока нет измерений. Первые результаты появятся после посещений опубликованного сайта.</p>}
                {report.routes.map((r) => (
                  <div className="diagnosticsRow" key={r.route}>
                    <div><strong>{r.route}</strong><small>{r.total} показателей · {r.errors} JS-событий</small></div>
                    <b>{r.enoughData ? `${Math.round(r.badShare * 100)}% выше хорошего порога` : "Мало данных"}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="diagnosticsNote"><div><strong>Что означают данные</strong><p>Показатели собираются у посетителей публичных страниц, без cookie и без сторонних аналитических скриптов. Код страницы и устройство группируются по категориям. Учитываются не все устройства или сессии: браузер может блокировать отправку. Это мониторинг реальных пользователей, а не Lighthouse; отсутствие событий не доказывает отсутствие ошибок.</p></div></div>
        </div>
      </section>
    </main>
  );
}
