import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";
import { roleLabels, staffRoles } from "@/lib/types";

export const metadata = { title: "Админ-панель" };

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const profile = profileData as Profile | null;

  if (!profile || !staffRoles.includes(profile.role)) {
    return (
      <main className="statusPage">
        <div className="container statusCard">
          <div className="statusIcon">🔒</div>
          <p className="eyebrow blue">ДОСТУП ЗАКРЫТ</p>
          <h1>Недостаточно прав</h1>
          <p>
            Этот раздел предназначен для авторов, редакторов и
            администраторов FC Edineț.
          </p>
          <Link className="primaryButton" href="/account">
            Вернуться в кабинет
          </Link>
        </div>
      </main>
    );
  }

  const [
    playersResult,
    publishedResult,
    draftsResult,
    reviewResult,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "review"),
  ]);

  return (
    <main className="adminPage">
      <section className="adminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ADMIN</p>
            <h1>Панель управления</h1>
            <p>
              {profile.full_name || profile.email} •{" "}
              {roleLabels[profile.role]}
            </p>
          </div>
          <Link href="/account" className="adminBack">
            ← Личный кабинет
          </Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="adminStats">
            <Stat label="Активные игроки" value={playersResult.count} />
            <Stat label="Опубликовано" value={publishedResult.count} />
            <Stat label="Черновики" value={draftsResult.count} />
            <Stat label="На проверке" value={reviewResult.count} />
          </div>

          <div className="adminModules">
            <AdminModule
              title="Новости"
              text="Создание, черновики, проверка и публикация."
              badge="Работает"
              href="/admin/news"
            />
            <AdminModule
              title="Игроки"
              text="Состав, фотографии, профили и архив игроков."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/players"
                  : undefined
              }
            />
            <AdminModule
              title="Статистика игроков"
              text="Сезоны, турниры, матчевые показатели и автоматические итоги игроков."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "v2.2.3"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/statistics"
                  : undefined
              }
            />
            <AdminModule
              title="Матчи"
              text="Календарь, соперники, результаты и блоки на главной."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/matches"
                  : undefined
              }
            />
            <AdminModule
              title="Таблица"
              text="Участники, победы, мячи, очки и положение в чемпионате."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/standings"
                  : undefined
              }
            />
            <AdminModule
              title="Клуб"
              text="История, стадион, контакты, руководство и достижения."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/club"
                  : undefined
              }
            />
            <AdminModule
              title="Медиа"
              text="Фотоальбомы, массовая загрузка фотографий и YouTube-видео."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/media"
                  : undefined
              }
            />
            <AdminModule
              title="Главная"
              text="Hero, порядок блоков, закреплённая новость и специальный баннер."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/home"
                  : undefined
              }
            />
            <AdminModule
              title="Visual Editor"
              text="Конструктор Hero и главной страницы: Canvas, секции, Block Library, медиатека, адаптивные режимы, черновики и история."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/design"
                  : undefined
              }
            />
            <AdminModule
              title="Партнёры"
              text="Спонсоры, логотипы, категории, ссылки и показ на главной."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/partners"
                  : undefined
              }
            />
            <AdminModule
              title="Комментарии"
              text="Обсуждения новостей, жалобы, скрытие комментариев и блокировки."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/comments"
                  : undefined
              }
            />
            <AdminModule
              title="Автоперевод RU → RO"
              text="Автоматический перевод нового и существующего контента на румынский."
              badge={
                profile.role === "editor" || profile.role === "admin"
                  ? "Работает"
                  : "Editor/Admin"
              }
              href={
                profile.role === "editor" || profile.role === "admin"
                  ? "/admin/translations"
                  : undefined
              }
            />
            <AdminModule
              title="Пользователи"
              text="Аккаунты, роли сотрудников и управление доступом."
              badge={profile.role === "admin" ? "Работает" : "Только admin"}
              href={profile.role === "admin" ? "/admin/users" : undefined}
            />
            <AdminModule
              title="Журнал действий"
              text="История изменений, удалений и смены прав пользователей."
              badge={profile.role === "admin" ? "Работает" : "Только admin"}
              href={profile.role === "admin" ? "/admin/audit" : undefined}
            />
          </div>

          <section className="roleMatrix">
            <p className="eyebrow blue">РОЛИ</p>
            <h2>Кто что сможет делать</h2>
            <div className="roleRows">
              <RoleRow
                role="fan"
                text="Профиль, комментарии и функции болельщика."
              />
              <RoleRow
                role="author"
                text="Создание и редактирование собственных черновиков."
              />
              <RoleRow
                role="editor"
                text="Новости, состав и другие редакционные разделы."
              />
              <RoleRow
                role="admin"
                text="Полное управление сайтом и ролями."
              />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <article className="adminStat">
      <strong>{value ?? 0}</strong>
      <span>{label}</span>
    </article>
  );
}

function AdminModule({
  title,
  text,
  badge,
  href,
}: {
  title: string;
  text: string;
  badge: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="moduleBadge">{badge}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && <span className="moduleLink">Открыть →</span>}
    </>
  );

  return href ? (
    <Link className="adminModule adminModuleLink" href={href}>
      {content}
    </Link>
  ) : (
    <article className="adminModule">
      {content}
    </article>
  );
}

function RoleRow({
  role,
  text,
}: {
  role: UserRole;
  text: string;
}) {
  return (
    <div className="roleRow">
      <strong>{roleLabels[role]}</strong>
      <span>{text}</span>
    </div>
  );
}
