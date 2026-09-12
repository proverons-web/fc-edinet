import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import { updateUserRole } from "@/app/admin/users/actions";
import { requireAdmin } from "@/lib/editorial";
import type { AdminUser, UserRole } from "@/lib/types";
import { roleLabels } from "@/lib/types";

export const metadata = { title: "Пользователи — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    role?: string | string[];
    saved?: string | string[];
    error?: string | string[];
  }>;
};

const roles: UserRole[] = ["fan", "author", "editor", "admin"];

const errorMessages: Record<string, string> = {
  invalid_request: "Не удалось распознать пользователя или выбранную роль.",
  self_role: "Нельзя снять роль администратора у собственного аккаунта.",
  update_failed: "Не удалось изменить роль. Проверь миграцию 015_admin_users.sql.",
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { supabase, userId } = await requireAdmin();
  const params = await searchParams;

  const q = first(params.q).trim();
  const requestedRole = first(params.role);
  const role = roles.includes(requestedRole as UserRole)
    ? (requestedRole as UserRole)
    : undefined;
  const saved = first(params.saved) === "1";
  const errorCode = first(params.error);

  const { data, error } = await supabase.rpc("admin_list_users");
  const users = ((data ?? []) as AdminUser[]).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const normalizedQuery = q.toLocaleLowerCase("ru-RU");
  const filteredUsers = users.filter((user) => {
    if (role && user.role !== role) return false;
    if (!normalizedQuery) return true;

    return [user.full_name, user.email]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase("ru-RU").includes(normalizedQuery)
      );
  });

  const staffCount = users.filter((user) => user.role !== "fan").length;
  const adminCount = users.filter((user) => user.role === "admin").length;
  const unconfirmedCount = users.filter((user) => !user.email_confirmed_at).length;

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ДОСТУП</p>
            <h1>Пользователи</h1>
            <p>Аккаунты, сотрудники и права доступа к управлению сайтом.</p>
          </div>

          <Link href="/admin" className="adminBack">
            ← Админка
          </Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="adminStats usersStats">
            <Stat label="Всего аккаунтов" value={users.length} />
            <Stat label="Сотрудники" value={staffCount} />
            <Stat label="Администраторы" value={adminCount} />
            <Stat label="Email не подтверждён" value={unconfirmedCount} />
          </div>

          <section className="usersPermissionGuide">
            <PermissionCard
              role="fan"
              text="Личный кабинет и будущие функции болельщика. Доступа к админке нет."
            />
            <PermissionCard
              role="author"
              text="Создаёт собственные новости и отправляет материалы редактору."
            />
            <PermissionCard
              role="editor"
              text="Публикует новости и управляет игроками, матчами, таблицей, клубом, медиа и главной страницей."
            />
            <PermissionCard
              role="admin"
              text="Все возможности редактора плюс управление пользователями и их ролями."
            />
          </section>

          {saved && (
            <div className="adminNotice successNotice">
              Роль пользователя сохранена.
            </div>
          )}

          {errorCode && (
            <div className="adminNotice errorNotice">
              {errorMessages[errorCode] ?? "Произошла ошибка при управлении пользователем."}
            </div>
          )}

          <form className="userFilters" method="get">
            <label className="userSearchField">
              <span>Поиск</span>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Имя или email"
              />
            </label>

            <label className="userRoleFilter">
              <span>Роль</span>
              <select name="role" defaultValue={role ?? ""}>
                <option value="">Все роли</option>
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <button className="primaryButton userFilterButton" type="submit">
              Применить
            </button>

            {(q || role) && (
              <Link href="/admin/users" className="secondaryButton userResetButton">
                Сбросить
              </Link>
            )}
          </form>

          {error ? (
            <div className="adminEmpty">
              Не удалось загрузить пользователей: {error.message}. Выполни
              database/015_admin_users.sql в Supabase.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="adminEmpty">
              По выбранным условиям пользователи не найдены.
            </div>
          ) : (
            <div className="adminUserList">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === userId;

                return (
                  <article className="adminUserRow" key={user.id}>
                    <div className="adminUserAvatar" aria-hidden="true">
                      {initials(user)}
                    </div>

                    <div className="adminUserMain">
                      <div className="adminUserTopline">
                        <h2>{user.full_name || "Без имени"}</h2>
                        <span className={`userRolePill role-${user.role}`}>
                          {roleLabels[user.role]}
                        </span>
                        {isCurrentUser && (
                          <span className="currentUserPill">Это вы</span>
                        )}
                      </div>

                      <p className="adminUserEmail">{user.email || "Email не указан"}</p>

                      <div className="adminUserMeta">
                        <span>Регистрация: {formatDate(user.created_at)}</span>
                        <span>
                          Email: {user.email_confirmed_at ? "подтверждён" : "не подтверждён"}
                        </span>
                        <span>
                          Последний вход: {formatDateTime(user.last_sign_in_at)}
                        </span>
                      </div>
                    </div>

                    {isCurrentUser ? (
                      <div className="selfRoleLock">
                        <strong>Администратор</strong>
                        <span>Свою роль здесь изменить нельзя.</span>
                      </div>
                    ) : (
                      <form action={updateUserRole} className="userRoleForm">
                        <input type="hidden" name="user_id" value={user.id} />
                        <label>
                          <span>Права</span>
                          <select name="role" defaultValue={user.role}>
                            {roles.map((item) => (
                              <option key={item} value={item}>
                                {roleLabels[item]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <ConfirmSubmitButton
                          className="rowAction primaryRowAction"
                          confirmMessage={`Изменить права пользователя ${user.email || user.full_name || user.id}?`}
                        >
                          Сохранить
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <p className="adminPermissionHint usersPermissionHint">
            Роли меняются только через защищённую admin-функцию Supabase. Обычный
            пользователь, автор или редактор не может назначить себе повышенные права.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="adminStat">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function PermissionCard({ role, text }: { role: UserRole; text: string }) {
  return (
    <article className="permissionCard">
      <span className={`userRolePill role-${role}`}>{roleLabels[role]}</span>
      <p>{text}</p>
    </article>
  );
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function initials(user: AdminUser) {
  const source = user.full_name?.trim() || user.email?.trim() || "FC";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Chisinau",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "ещё не входил";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Chisinau",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
