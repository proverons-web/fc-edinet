import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import {
  createAdminUser,
  toggleUserBlock,
  updateUserRole,
} from "@/app/admin/users/actions";
import { requireAdmin } from "@/lib/editorial";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { AdminUser, UserRole } from "@/lib/types";
import { roleLabels } from "@/lib/types";

export const metadata = { title: "Пользователи — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    role?: string | string[];
    saved?: string | string[];
    created?: string | string[];
    confirm?: string | string[];
    blocked?: string | string[];
    unblocked?: string | string[];
    error?: string | string[];
  }>;
};

type UserRow = AdminUser & {
  banned_until?: string | null;
};

const roles: UserRole[] = ["fan", "author", "editor", "admin"];

const errorMessages: Record<string, string> = {
  invalid_request: "Не удалось распознать пользователя или выбранную роль.",
  self_role: "Нельзя снять роль администратора у собственного аккаунта.",
  self_block: "Нельзя заблокировать собственный аккаунт.",
  update_failed: "Не удалось изменить роль. Проверь миграцию 015_admin_users.sql.",
  create_invalid: "Проверь email, имя, пароль (минимум 10 символов) и выбранную роль.",
  email_exists: "Пользователь с таким email уже существует.",
  create_failed: "Не удалось создать пользователя. Проверь настройки Supabase Auth.",
  create_profile_failed: "Аккаунт создан не полностью: не удалось назначить профиль/роль.",
  admin_secret_required:
    "Для блокировки пользователей добавь SUPABASE_SECRET_KEY в Vercel Environment Variables.",
  block_failed: "Не удалось изменить состояние доступа пользователя.",
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
  const created = first(params.created) === "1";
  const needsConfirmation = first(params.confirm) === "1";
  const blocked = first(params.blocked) === "1";
  const unblocked = first(params.unblocked) === "1";
  const errorCode = first(params.error);
  const adminAuthConfigured = isSupabaseAdminConfigured();

  const { data, error } = await supabase.rpc("admin_list_users");
  let users = ((data ?? []) as UserRow[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (adminAuthConfigured && users.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: authData } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const authMap = new Map(
        (authData?.users ?? []).map((item) => [item.id, item.banned_until ?? null])
      );
      users = users.map((item) => ({
        ...item,
        banned_until: authMap.get(item.id) ?? null,
      }));
    } catch (adminError) {
      console.error("Unable to enrich admin users with auth status", adminError);
    }
  }

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
  const blockedCount = users.filter(isUserBlocked).length;

  return (
    <main className="adminPage adminUsersPageV2">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ДОСТУП И РОЛИ</p>
            <h1>Пользователи</h1>
            <p>
              Создавай аккаунты сотрудников, назначай роли и контролируй доступ к
              админке из одного места.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="#new-user" className="primaryButton">
              + Создать пользователя
            </Link>
            <Link href="/admin" className="adminBack">
              ← Обзор
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="adminStats usersStats">
            <Stat label="Всего аккаунтов" value={users.length} />
            <Stat label="Сотрудники" value={staffCount} />
            <Stat label="Администраторы" value={adminCount} />
            <Stat
              label={adminAuthConfigured ? "Заблокировано" : "Email не подтверждён"}
              value={adminAuthConfigured ? blockedCount : unconfirmedCount}
            />
          </div>

          <section className="adminCreateUserPanel" id="new-user">
            <div className="adminCreateUserIntro">
              <div>
                <p className="eyebrow">НОВЫЙ АККАУНТ</p>
                <h2>Создать пользователя</h2>
                <p>
                  Задай временный пароль и сразу выбери уровень доступа. Пароль не
                  сохраняется и после отправки формы больше не показывается.
                </p>
              </div>
              <span className={`adminAuthMode ${adminAuthConfigured ? "ready" : "fallback"}`}>
                {adminAuthConfigured ? "Admin API подключён" : "Режим с подтверждением email"}
              </span>
            </div>

            {!adminAuthConfigured && (
              <div className="adminNotice warningNotice compactNotice">
                <strong>Рекомендуется добавить SUPABASE_SECRET_KEY.</strong>{" "}
                Без server-only secret аккаунт всё равно можно создать, но Supabase может
                потребовать подтверждение email. Блокировка/разблокировка будет недоступна.
              </div>
            )}

            <form action={createAdminUser} className="adminCreateUserForm">
              <label>
                <span>Email *</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  required
                  placeholder="editor@fc-edinet.md"
                />
              </label>

              <label>
                <span>Имя</span>
                <input
                  type="text"
                  name="full_name"
                  maxLength={120}
                  autoComplete="off"
                  placeholder="Имя сотрудника"
                />
              </label>

              <label>
                <span>Временный пароль *</span>
                <input
                  type="password"
                  name="password"
                  minLength={10}
                  required
                  autoComplete="new-password"
                  placeholder="Минимум 10 символов"
                />
              </label>

              <label>
                <span>Роль *</span>
                <select name="role" defaultValue="editor">
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {roleLabels[item]}
                    </option>
                  ))}
                </select>
              </label>

              <button className="primaryButton adminCreateUserSubmit" type="submit">
                Создать аккаунт
              </button>
            </form>
          </section>

          <section className="usersPermissionGuide">
            <PermissionCard
              role="fan"
              text="Только личный кабинет. Доступа к административной панели нет."
            />
            <PermissionCard
              role="author"
              text="Создаёт собственные новости и отправляет материалы редактору."
            />
            <PermissionCard
              role="editor"
              text="Управляет контентом сайта: новости, игроки, матчи, таблица, медиа и визуальные разделы."
            />
            <PermissionCard
              role="admin"
              text="Полный доступ редактора плюс пользователи, роли, журнал действий и системные настройки."
            />
          </section>

          {created && (
            <div className="adminNotice successNotice">
              Пользователь создан и роль назначена.
              {needsConfirmation
                ? " На его email отправлено подтверждение — до подтверждения вход может быть недоступен."
                : " Аккаунт уже готов к входу."}
            </div>
          )}

          {saved && (
            <div className="adminNotice successNotice">Роль пользователя сохранена.</div>
          )}

          {blocked && (
            <div className="adminNotice successNotice">Доступ пользователя заблокирован.</div>
          )}

          {unblocked && (
            <div className="adminNotice successNotice">Доступ пользователя восстановлен.</div>
          )}

          {errorCode && (
            <div className="adminNotice errorNotice">
              {errorMessages[errorCode] ??
                "Произошла ошибка при управлении пользователем."}
            </div>
          )}

          <div className="adminUsersListHeader">
            <div>
              <p className="eyebrow">АККАУНТЫ</p>
              <h2>Пользователи и права</h2>
            </div>
            <span>{filteredUsers.length} из {users.length}</span>
          </div>

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
            <div className="adminEmpty">По выбранным условиям пользователи не найдены.</div>
          ) : (
            <div className="adminUserList">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === userId;
                const isBlocked = isUserBlocked(user);

                return (
                  <article className={`adminUserRow${isBlocked ? " isBlocked" : ""}`} key={user.id}>
                    <div className="adminUserAvatar" aria-hidden="true">
                      {initials(user)}
                    </div>

                    <div className="adminUserMain">
                      <div className="adminUserTopline">
                        <h2>{user.full_name || "Без имени"}</h2>
                        <span className={`userRolePill role-${user.role}`}>
                          {roleLabels[user.role]}
                        </span>
                        {isCurrentUser && <span className="currentUserPill">Это вы</span>}
                        {isBlocked && <span className="blockedUserPill">Доступ закрыт</span>}
                      </div>

                      <p className="adminUserEmail">{user.email || "Email не указан"}</p>

                      <div className="adminUserMeta">
                        <span>Регистрация: {formatDate(user.created_at)}</span>
                        <span>Email: {user.email_confirmed_at ? "подтверждён" : "не подтверждён"}</span>
                        <span>Последний вход: {formatDateTime(user.last_sign_in_at)}</span>
                      </div>
                    </div>

                    {isCurrentUser ? (
                      <div className="selfRoleLock">
                        <strong>Текущий администратор</strong>
                        <span>Свою роль и доступ здесь изменить нельзя.</span>
                      </div>
                    ) : (
                      <div className="adminUserControls">
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

                        {adminAuthConfigured ? (
                          <form action={toggleUserBlock} className="userBlockForm">
                            <input type="hidden" name="user_id" value={user.id} />
                            <ConfirmSubmitButton
                              className={`rowAction ${isBlocked ? "secondaryRowAction" : "dangerRowAction"}`}
                              confirmMessage={
                                isBlocked
                                  ? `Восстановить доступ пользователя ${user.email || user.full_name || user.id}?`
                                  : `Заблокировать вход пользователя ${user.email || user.full_name || user.id}?`
                              }
                            >
                              {isBlocked ? "Разблокировать" : "Заблокировать"}
                            </ConfirmSubmitButton>
                          </form>
                        ) : (
                          <span className="userBlockUnavailable" title="Нужен SUPABASE_SECRET_KEY">
                            Блокировка недоступна
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <p className="adminPermissionHint usersPermissionHint">
            Роли изменяются защищённой server-side функцией. Создание подтверждённых
            аккаунтов и блокировка используют только server-only Supabase secret — ключ
            никогда не отправляется в браузер.
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

function isUserBlocked(user: Pick<UserRow, "banned_until">) {
  if (!user.banned_until) return false;
  const value = new Date(user.banned_until).getTime();
  return Number.isFinite(value) && value > Date.now();
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
