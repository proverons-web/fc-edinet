import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";

export const metadata = { title: "Админ-панель" };

type Module = { title: string; text: string; href: string; kicker?: string; icon: string };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string;
  const { data: profileData } = await supabase.from("profiles").select("id,email,full_name,display_name,role").eq("id", userId).single();
  const profile = profileData as Pick<Profile, "id" | "email" | "full_name" | "display_name" | "role">;
  const canEdit = profile.role === "editor" || profile.role === "admin";
  const isAdmin = profile.role === "admin";

  const [playersResult, publishedResult, draftsResult, reviewResult] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "review"),
  ]);

  const contentModules: Module[] = [
    { title: "Новости", text: "Создание, редактура, черновики и публикация материалов.", href: "/admin/news", icon: "N", kicker: "Контент" },
    ...(canEdit ? [
      { title: "Команда", text: "Игроки, профили, фотографии и состав клуба.", href: "/admin/players", icon: "P", kicker: "Команда" },
      { title: "Матчи", text: "Календарь, результаты, соперники и команды.", href: "/admin/matches", icon: "M", kicker: "Матчи" },
      { title: "Протокол матча", text: "События, составы, протокол и подробности уже созданных матчей.", href: "/admin/match-center", icon: "MC", kicker: "Матч-центр" },
      { title: "Таблица", text: "Турниры, положение команд и очки.", href: "/admin/standings", icon: "T", kicker: "Турнир" },
      { title: "Статистика", text: "Статистика игроков, сезонов и матчей.", href: "/admin/statistics", icon: "S", kicker: "Данные" },
      { title: "Медиа", text: "Фотоальбомы, фотографии и YouTube-видео.", href: "/admin/media", icon: "◎", kicker: "Медиа" },
      { title: "Партнёры", text: "Спонсоры, логотипы, уровни и ссылки.", href: "/admin/partners", icon: "◇", kicker: "Партнёры" },
    ] : []),
  ];

  return (
    <main className="adminPage adminDashboardV2">
      <section className="adminDashboardIntro">
        <div>
          <p className="eyebrow blue">FC EDINEȚ • ADMIN CENTER</p>
          <h1>Панель управления</h1>
          <p>Контент, сайт и клубные данные — в одном рабочем пространстве.</p>
        </div>
        <div className="adminDashboardIdentity">
          <span>Вы вошли как</span>
          <strong>{profile.display_name || profile.full_name || profile.email}</strong>
          <small>{roleLabels[profile.role]}</small>
        </div>
      </section>

      <section className="adminDashboardStats">
        <Stat label="Активные игроки" value={playersResult.count} hint="сейчас в составе" />
        <Stat label="Опубликовано" value={publishedResult.count} hint="новостей на сайте" />
        <Stat label="Черновики" value={draftsResult.count} hint="ещё не опубликованы" />
        <Stat label="На проверке" value={reviewResult.count} hint="ждут решения" accent={Boolean(reviewResult.count)} />
      </section>

      {canEdit && (
        <section className="adminFeaturePanel">
          <div className="adminFeatureCopy">
            <span className="adminFeatureIcon">✦</span>
            <div>
              <p className="eyebrow">ГЛАВНЫЙ РЕДАКТОР САЙТА</p>
              <h2>Site Builder</h2>
              <p>Главная точка для работы с внешним видом страниц: дизайн, контент, Desktop/Tablet/Mobile Preview и Live Page.</p>
            </div>
          </div>
          <div className="adminFeatureActions">
            <Link href="/admin/site-builder" className="primaryButton">Открыть Site Builder</Link>
            <a href="/" target="_blank" rel="noreferrer" className="secondaryAdminButton">Открыть сайт ↗</a>
          </div>
        </section>
      )}

      <DashboardSection eyebrow="КОНТЕНТ И ДАННЫЕ" title="Ежедневная работа" text="Разделы, с которыми редакция работает чаще всего." modules={contentModules} />

      {canEdit && (
        <DashboardSection
          eyebrow="САЙТ И ОФОРМЛЕНИЕ"
          title="Структура сайта"
          text="Настройка страниц, глобального дизайна и клубного контента."
          modules={[
            { title: "Site Builder", text: "Все публичные страницы и Live Preview в одном редакторе.", href: "/admin/site-builder", icon: "✦", kicker: "Рекомендуется" },
            { title: "Глобальный дизайн", text: "Header, Footer, цвета, шрифты и общая визуальная система.", href: "/admin/design", icon: "◈", kicker: "Дизайн" },
            { title: "Клуб", text: "История, стадион, руководство, достижения и контакты.", href: "/admin/club", icon: "C", kicker: "Контент клуба" },
          ]}
        />
      )}

      {canEdit && (
        <DashboardSection
          eyebrow="УПРАВЛЕНИЕ"
          title="Модерация и локализация"
          text="То, что не нужно открывать каждый день, но должно быть быстро доступно."
          modules={[
            { title: "Комментарии", text: "Модерация обсуждений, жалоб и блокировок.", href: "/admin/comments", icon: "#", kicker: "Модерация" },
            { title: "Переводы RU → RO", text: "Автоперевод и контроль румынской версии контента.", href: "/admin/translations", icon: "RO", kicker: "Локализация" },
          ]}
        />
      )}

      {isAdmin && (
        <DashboardSection
          eyebrow="СИСТЕМА"
          title="Доступ и контроль"
          text="Административные функции, доступные только администратору."
          modules={[
            { title: "Пользователи", text: "Аккаунты, роли сотрудников и права доступа.", href: "/admin/users", icon: "U", kicker: "Только admin" },
            { title: "Журнал действий", text: "История изменений, удалений и смены ролей.", href: "/admin/audit", icon: "A", kicker: "Только admin" },
          ]}
        />
      )}
    </main>
  );
}

function Stat({ label, value, hint, accent = false }: { label: string; value: number | null; hint: string; accent?: boolean }) {
  return <article className={`adminDashStat${accent ? " isAccent" : ""}`}><strong>{value ?? 0}</strong><div><b>{label}</b><span>{hint}</span></div></article>;
}

function DashboardSection({ eyebrow, title, text, modules }: { eyebrow: string; title: string; text: string; modules: Module[] }) {
  return (
    <section className="adminDashboardSection">
      <header className="adminDashboardSectionHead"><div><p className="eyebrow blue">{eyebrow}</p><h2>{title}</h2><span>{text}</span></div></header>
      <div className="adminDashboardGrid">
        {modules.map((module) => <DashboardCard key={module.href} {...module} />)}
      </div>
    </section>
  );
}

function DashboardCard({ title, text, href, kicker, icon }: Module) {
  return (
    <Link href={href} className="adminDashCard">
      <div className="adminDashCardTop"><i>{icon}</i><span>{kicker}</span></div>
      <h3>{title}</h3><p>{text}</p><b>Открыть <span>→</span></b>
    </Link>
  );
}
