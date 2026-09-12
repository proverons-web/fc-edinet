import Link from "next/link";
import { requireAdmin } from "@/lib/editorial";
import type { AuditLogEntry } from "@/lib/types";

export const metadata = { title: "Журнал действий — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    entity?: string | string[];
    action?: string | string[];
  }>;
};

const actionLabels: Record<AuditLogEntry["action"], string> = {
  insert: "Создание",
  update: "Изменение",
  delete: "Удаление",
};

const entityLabels: Record<string, string> = {
  profiles: "Пользователи",
  news: "Новости",
  news_categories: "Категории новостей",
  players: "Игроки",
  competitions: "Соревнования",
  teams: "Команды",
  matches: "Матчи",
  standings: "Турнирная таблица",
  club_profile: "Клуб",
  club_leadership: "Руководство",
  club_achievements: "Достижения",
  media_albums: "Фотоальбомы",
  media_photos: "Фотографии",
  media_videos: "Видео",
  homepage_hero: "Главная страница",
};

const fieldLabels: Record<string, string> = {
  role: "Роль",
  title: "Заголовок",
  name: "Название",
  full_name: "Имя",
  status: "Статус",
  is_active: "Активность",
  is_published: "Публикация",
  is_featured: "Главная новость",
  home_score: "Голы хозяев",
  away_score: "Голы гостей",
  kickoff: "Дата и время",
  stadium: "Стадион",
  shirt_number: "Номер игрока",
  position: "Позиция",
  photo_url: "Фото",
  logo_url: "Логотип",
  display_order: "Порядок",
  points_adjustment: "Корректировка очков",
  wins: "Победы",
  draws: "Ничьи",
  losses: "Поражения",
  goals_for: "Забито",
  goals_against: "Пропущено",
  cover_image_url: "Обложка",
  background_image_url: "Фон",
  overlay_opacity: "Затемнение",
  eyebrow: "Надзаголовок",
  title_main: "Главный заголовок",
  title_accent: "Акцентный заголовок",
};

const entityOptions = Object.entries(entityLabels);
const actions: AuditLogEntry["action"][] = ["insert", "update", "delete"];

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const q = first(params.q).trim().toLocaleLowerCase("ru-RU");
  const entity = first(params.entity);
  const requestedAction = first(params.action);
  const action = actions.includes(requestedAction as AuditLogEntry["action"])
    ? (requestedAction as AuditLogEntry["action"])
    : undefined;

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (entity && entityLabels[entity]) {
    query = query.eq("entity_type", entity);
  }

  if (action) {
    query = query.eq("action", action);
  }

  const [logResult, totalResult, dayResult, deleteResult, roleResult] =
    await Promise.all([
      query,
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("action", "delete"),
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "profiles")
        .contains("changed_fields", ["role"]),
    ]);

  const entries = ((logResult.data ?? []) as AuditLogEntry[]).filter((entry) => {
    if (!q) return true;

    return [
      entry.actor_email,
      entry.entity_label,
      entry.entity_id,
      entityLabels[entry.entity_type],
      actionLabels[entry.action],
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("ru-RU").includes(q));
  });

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • БЕЗОПАСНОСТЬ</p>
            <h1>Журнал действий</h1>
            <p>
              Кто, когда и что изменял в административных разделах сайта.
            </p>
          </div>

          <Link href="/admin" className="adminBack">
            ← Админка
          </Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="adminStats auditStats">
            <Stat label="Всего событий" value={totalResult.count ?? 0} />
            <Stat label="За 24 часа" value={dayResult.count ?? 0} />
            <Stat label="Удалений" value={deleteResult.count ?? 0} />
            <Stat label="Смен ролей" value={roleResult.count ?? 0} />
          </div>

          <div className="auditSecurityNote">
            <strong>Только для администратора.</strong>
            <span>
              Записи создаются автоматически на уровне базы данных. Редактор не
              может удалить или подменить историю через сайт.
            </span>
          </div>

          <form className="auditFilters" method="get">
            <label>
              <span>Поиск</span>
              <input
                type="search"
                name="q"
                defaultValue={first(params.q)}
                placeholder="Email, объект или ID"
              />
            </label>

            <label>
              <span>Раздел</span>
              <select name="entity" defaultValue={entityLabels[entity] ? entity : ""}>
                <option value="">Все разделы</option>
                {entityOptions.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Действие</span>
              <select name="action" defaultValue={action ?? ""}>
                <option value="">Все действия</option>
                {actions.map((item) => (
                  <option key={item} value={item}>
                    {actionLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <button className="primaryButton auditFilterButton" type="submit">
              Применить
            </button>

            {(q || entity || action) && (
              <Link href="/admin/audit" className="secondaryButton auditResetButton">
                Сбросить
              </Link>
            )}
          </form>

          {logResult.error ? (
            <div className="adminEmpty">
              Не удалось загрузить журнал: {logResult.error.message}. Проверь
              migration 016_audit_security.sql.
            </div>
          ) : entries.length === 0 ? (
            <div className="adminEmpty">
              Записей по выбранным условиям пока нет.
            </div>
          ) : (
            <div className="auditList">
              {entries.map((entry) => (
                <div key={entry.id} className="auditRowWrap">
                  <AuditRow entry={entry} />
                </div>
              ))}
            </div>
          )}

          {entries.length >= 300 && (
            <p className="adminPermissionHint auditLimitHint">
              Показаны последние 300 событий. Используй фильтры, чтобы быстрее
              найти нужное изменение.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const changedFields = entry.changed_fields ?? [];

  return (
    <article className="auditRow">
      <div className={`auditActionIcon audit-${entry.action}`} aria-hidden="true">
        {entry.action === "insert" ? "+" : entry.action === "delete" ? "−" : "↻"}
      </div>

      <div className="auditMain">
        <div className="auditTopline">
          <span className={`auditActionBadge audit-${entry.action}`}>
            {actionLabels[entry.action]}
          </span>
          <span className="auditEntityBadge">
            {entityLabels[entry.entity_type] ?? entry.entity_type}
          </span>
          <time>{formatDateTime(entry.created_at)}</time>
        </div>

        <h2>{entry.entity_label || `ID ${entry.entity_id || "—"}`}</h2>

        <p className="auditActor">
          Выполнил: <strong>{entry.actor_email || "Система / SQL"}</strong>
          {entry.actor_role ? ` • ${roleLabel(entry.actor_role)}` : ""}
        </p>

        {changedFields.length > 0 && (
          <div className="auditChangedFields">
            {changedFields.map((field) => (
              <span key={field}>{fieldLabels[field] ?? field}</span>
            ))}
          </div>
        )}

        <AuditDetails entry={entry} />
      </div>
    </article>
  );
}

function AuditDetails({ entry }: { entry: AuditLogEntry }) {
  if (entry.action === "update" && entry.changed_fields.length > 0) {
    return (
      <details className="auditDetails">
        <summary>Показать изменения</summary>
        <div className="auditDiffList">
          {entry.changed_fields.map((field) => (
            <div className="auditDiffRow" key={field}>
              <strong>{fieldLabels[field] ?? field}</strong>
              <span className="auditBefore">{formatValue(entry.old_data?.[field])}</span>
              <span className="auditArrow">→</span>
              <span className="auditAfter">{formatValue(entry.new_data?.[field])}</span>
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (entry.action === "insert") {
    return (
      <details className="auditDetails">
        <summary>Данные созданного объекта</summary>
        <Snapshot data={entry.new_data} />
      </details>
    );
  }

  if (entry.action === "delete") {
    return (
      <details className="auditDetails">
        <summary>Данные удалённого объекта</summary>
        <Snapshot data={entry.old_data} />
      </details>
    );
  }

  return null;
}

function Snapshot({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="auditNoData">Нет сохранённых данных.</p>;

  const keys = Object.keys(data)
    .filter((key) => !["created_at", "updated_at", "content", "bio"].includes(key))
    .slice(0, 10);

  return (
    <div className="auditSnapshot">
      {keys.map((key) => (
        <div key={key}>
          <strong>{fieldLabels[key] ?? key}</strong>
          <span>{formatValue(data[key])}</span>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 117)}…` : json;
  }

  const text = String(value);
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function roleLabel(role: AuditLogEntry["actor_role"]) {
  if (role === "admin") return "Администратор";
  if (role === "editor") return "Редактор";
  if (role === "author") return "Автор";
  if (role === "fan") return "Болельщик";
  return "";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="adminStat">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Chisinau",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
