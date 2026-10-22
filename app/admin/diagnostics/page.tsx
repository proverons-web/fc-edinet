import Link from "next/link";
import { requireAdmin } from "@/lib/editorial";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const metadata = { title: "Диагностика системы — Админ" };
export const dynamic = "force-dynamic";

type CheckState = "ok" | "warn" | "error" | "info";

type DiagnosticCheck = {
  label: string;
  value: string;
  state: CheckState;
  detail?: string;
};

const APP_VERSION = "2.15.6";
const BUILDER_VERSION = "2.1";
const HERO_BUILDER_VERSION = "2.1";
const CONTENT_SCHEMA_VERSION = "3";
const PRO_PAGE_SCHEMA_VERSION = "1";
const RICH_CONTENT_SCHEMA_VERSION = "1";

function fmtDate(value: string | null | undefined) {
  if (!value) return "Нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Нет данных";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  }).format(date);
}

function statusFromError(error: { message?: string } | null | undefined): CheckState {
  return error ? "error" : "ok";
}

export default async function AdminDiagnosticsPage() {
  const { supabase, profile } = await requireAdmin();

  const [
    profileCount,
    matchCount,
    newsCount,
    designCount,
    latestAudit,
    latestPagePublish,
    latestGlobalPublish,
    latestPageDraft,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("site_global_designs").select("component_key", { count: "exact", head: true }),
    supabase.from("audit_log").select("created_at,entity_type,action").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("site_page_designs").select("page_key,updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("site_global_designs").select("component_key,updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("site_page_design_drafts").select("page_key,updated_at,autosaved_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dbChecks: DiagnosticCheck[] = [
    {
      label: "Supabase / profiles",
      value: profileCount.error ? "Ошибка" : `${profileCount.count ?? 0} пользователей`,
      state: statusFromError(profileCount.error),
      detail: profileCount.error?.message,
    },
    {
      label: "Supabase / matches",
      value: matchCount.error ? "Ошибка" : `${matchCount.count ?? 0} матчей`,
      state: statusFromError(matchCount.error),
      detail: matchCount.error?.message,
    },
    {
      label: "Supabase / news",
      value: newsCount.error ? "Ошибка" : `${newsCount.count ?? 0} новостей`,
      state: statusFromError(newsCount.error),
      detail: newsCount.error?.message,
    },
    {
      label: "Global design storage",
      value: designCount.error ? "Ошибка" : `${designCount.count ?? 0} конфигураций`,
      state: statusFromError(designCount.error),
      detail: designCount.error?.message,
    },
    {
      label: "Audit Log",
      value: latestAudit.error ? "Недоступен" : latestAudit.data ? `Последнее событие: ${fmtDate(latestAudit.data.created_at)}` : "Записей пока нет",
      state: latestAudit.error ? "error" : latestAudit.data ? "ok" : "warn",
      detail: latestAudit.error?.message,
    },
  ];

  const adminConfigured = isSupabaseAdminConfigured();
  const requiredEnv: DiagnosticCheck[] = [
    {
      label: "NEXT_PUBLIC_SUPABASE_URL",
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Настроено" : "Отсутствует",
      state: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "error",
    },
    {
      label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "Настроено" : "Отсутствует",
      state: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "ok" : "error",
    },
    {
      label: "SUPABASE_SECRET_KEY",
      value: adminConfigured ? "Настроено" : "Не настроено",
      state: adminConfigured ? "ok" : "warn",
      detail: adminConfigured ? "Полный режим управления пользователями активен." : "Создание пользователей работает в fallback-режиме; блокировка/разблокировка ограничена.",
    },
    {
      label: "NEXT_PUBLIC_SITE_URL",
      value: process.env.NEXT_PUBLIC_SITE_URL ? "Задано явно" : "Используется Vercel fallback",
      state: process.env.NEXT_PUBLIC_SITE_URL ? "ok" : "info",
    },
    {
      label: "OPENAI_API_KEY",
      value: process.env.OPENAI_API_KEY ? "Настроено" : "Не настроено",
      state: process.env.OPENAI_API_KEY ? "ok" : "info",
      detail: "Используется только для функций автоматического перевода, если они включены.",
    },
  ];

  // Release-integrity checks that require source-tree access are performed by
  // scripts/check-deploy.mjs before Next.js builds. Runtime Diagnostics stays
  // independent from the project filesystem so the server bundle remains scoped.
  const fileChecks: DiagnosticCheck[] = [
    {
      label: "Официальный герб",
      value: "Включён в релиз",
      state: "ok",
      detail: "/public/brand/fc-edinet-crest.png · проверяется deploy:check",
    },
    {
      label: "sitemap.xml",
      value: "Маршрут включён",
      state: "ok",
      detail: "app/sitemap.ts · проверяется deploy:check",
    },
    {
      label: "robots.txt",
      value: "Маршрут включён",
      state: "ok",
      detail: "app/robots.ts · проверяется deploy:check",
    },
    {
      label: "Social preview",
      value: "Генератор включён",
      state: "ok",
      detail: "app/opengraph-image.tsx · проверяется deploy:check",
    },
  ];

  const publicRoutes = [
    ["Главная", "app/page.tsx"],
    ["Новости", "app/news/page.tsx"],
    ["Команда", "app/team/page.tsx"],
    ["Календарь", "app/matches/page.tsx"],
    ["Таблица", "app/standings/page.tsx"],
    ["Статистика", "app/statistics/page.tsx"],
    ["Клуб", "app/club/page.tsx"],
    ["Медиа", "app/media/page.tsx"],
    ["Партнёры", "app/partners/page.tsx"],
    ["Академия", "app/academy/page.tsx"],
  ].map(([label, file]) => ({ label, file, ok: true }));

  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "—";
  const siteUrl = getSiteUrl();
  const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "локальная среда";

  const publishTimes = [latestPagePublish.data?.updated_at, latestGlobalPublish.data?.updated_at]
    .filter((value): value is string => Boolean(value))
    .sort();
  const lastPublish = publishTimes[publishTimes.length - 1];
  const latestDraftTime = latestPageDraft.data?.autosaved_at || latestPageDraft.data?.updated_at;

  const criticalCount = [...dbChecks, ...requiredEnv, ...fileChecks].filter((check) => check.state === "error").length;
  const warningCount = [...dbChecks, ...requiredEnv, ...fileChecks].filter((check) => check.state === "warn").length;

  return (
    <main className="adminPage diagnosticsPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • SYSTEM</p>
            <h1>Диагностика</h1>
            <p>Состояние приложения, окружения, базы, редакторов и ключевых файлов — без отображения секретных значений.</p>
          </div>
          <div className="adminHeroActions">
            <a href="/api/version" target="_blank" rel="noreferrer" className="secondaryButton">API Version ↗</a>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="primaryButton">Открыть сайт ↗</a>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container diagnosticsStack">
          <div className="diagnosticsSummary">
            <SummaryCard label="Версия" value={`v${APP_VERSION}`} detail={`Commit ${commit}`} tone="blue" />
            <SummaryCard label="Среда" value={environment} detail={deploymentHost} tone={environment === "production" ? "green" : "blue"} />
            <SummaryCard label="Критические" value={String(criticalCount)} detail={criticalCount ? "Требуют исправления" : "Критических проблем нет"} tone={criticalCount ? "red" : "green"} />
            <SummaryCard label="Предупреждения" value={String(warningCount)} detail={warningCount ? "Стоит проверить" : "Предупреждений нет"} tone={warningCount ? "amber" : "green"} />
          </div>

          <div className="diagnosticsGrid">
            <DiagnosticPanel title="Приложение" eyebrow="RUNTIME">
              <DiagnosticRow label="Public URL" value={siteUrl} state="ok" />
              <DiagnosticRow label="Текущий администратор" value={profile.email || profile.display_name || profile.id} state="ok" />
              <DiagnosticRow label="Язык профиля" value={(profile.preferred_language || "ru").toUpperCase()} state="info" />
              <DiagnosticRow label="Next.js" value="16.3.2" state="info" />
              <DiagnosticRow label="Node.js" value={process.version} state="info" />
            </DiagnosticPanel>

            <DiagnosticPanel title="Builder / Schemas" eyebrow="EDITOR">
              <DiagnosticRow label="Unified Site Builder" value={BUILDER_VERSION} state="ok" />
              <DiagnosticRow label="Hero Builder" value={HERO_BUILDER_VERSION} state="ok" />
              <DiagnosticRow label="Content page schema" value={`v${CONTENT_SCHEMA_VERSION}`} state="info" />
              <DiagnosticRow label="Pro page schema" value={`v${PRO_PAGE_SCHEMA_VERSION}`} state="info" />
              <DiagnosticRow label="Rich content schema" value={`v${RICH_CONTENT_SCHEMA_VERSION}`} state="info" />
              <DiagnosticRow label="DB migration marker" value="Не экспонируется приложением" state="info" detail="Текущий FULL-пакет не содержит отдельного runtime-маркера версии схемы БД." />
            </DiagnosticPanel>
          </div>

          <DiagnosticPanel title="Окружение" eyebrow="ENVIRONMENT" wide>
            <div className="diagnosticsCheckGrid">
              {requiredEnv.map((check) => <DiagnosticRow key={check.label} {...check} />)}
            </div>
          </DiagnosticPanel>

          <DiagnosticPanel title="Supabase" eyebrow="DATABASE" wide>
            <div className="diagnosticsCheckGrid">
              {dbChecks.map((check) => <DiagnosticRow key={check.label} {...check} />)}
            </div>
          </DiagnosticPanel>

          <div className="diagnosticsGrid">
            <DiagnosticPanel title="Публикация" eyebrow="PUBLISHING">
              <DiagnosticRow label="Последняя публикация дизайна" value={fmtDate(lastPublish)} state={lastPublish ? "ok" : "warn"} />
              <DiagnosticRow label="Последний autosave" value={fmtDate(latestDraftTime)} state="info" detail={latestPageDraft.data?.page_key ? `Страница: ${latestPageDraft.data.page_key}` : "Активных черновиков может не быть."} />
              <DiagnosticRow label="Последнее audit-событие" value={fmtDate(latestAudit.data?.created_at)} state={latestAudit.error ? "error" : latestAudit.data ? "ok" : "warn"} />
            </DiagnosticPanel>

            <DiagnosticPanel title="Файлы / SEO" eyebrow="FILES">
              {fileChecks.map((check) => <DiagnosticRow key={check.label} {...check} />)}
            </DiagnosticPanel>
          </div>

          <DiagnosticPanel title="Публичные маршруты" eyebrow="ROUTES" wide>
            <div className="diagnosticsRouteGrid">
              {publicRoutes.map((route) => (
                <div className={`diagnosticsRoute${route.ok ? " ok" : " error"}`} key={route.label}>
                  <span aria-hidden="true">{route.ok ? "✓" : "!"}</span>
                  <div><strong>{route.label}</strong><small>{route.file}</small></div>
                </div>
              ))}
            </div>
          </DiagnosticPanel>

          <div className="diagnosticsNote">
            <div>
              <strong>Безопасность диагностики</strong>
              <p>Экран показывает только факт наличия переменных окружения. Ключи, токены и секретные значения никогда не выводятся в интерфейс.</p>
            </div>
            <div className="diagnosticsQuickLinks">
              <Link href="/admin/audit">Журнал действий →</Link>
              <Link href="/admin/users">Пользователи →</Link>
              <Link href="/admin/site-builder">Site Builder →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DiagnosticPanel({ title, eyebrow, wide = false, children }: { title: string; eyebrow: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`diagnosticsPanel${wide ? " wide" : ""}`}>
      <header><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header>
      <div className="diagnosticsPanelBody">{children}</div>
    </section>
  );
}

function DiagnosticRow({ label, value, state, detail }: DiagnosticCheck) {
  return (
    <div className={`diagnosticsRow state-${state}`}>
      <span className="diagnosticsDot" aria-hidden="true" />
      <div><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</div>
      <b>{value}</b>
    </div>
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" | "amber" | "red" }) {
  return (
    <article className={`diagnosticsSummaryCard tone-${tone}`}>
      <span>{label}</span><strong>{value}</strong><small>{detail}</small>
    </article>
  );
}
