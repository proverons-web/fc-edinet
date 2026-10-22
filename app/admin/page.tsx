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

  return (
    <main className="adminPage adminDashboardV2">
      <section className="adminDashboardIntro">
        <div>
          <p className="eyebrow blue">FC EDINEȚ • ADMIN CENTER</p>
          <h1>Панель управления</h1>
          <p>Рабочие разделы сгруппированы по задачам. Всё редкое и системное вынесено отдельно.</p>
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

      <DashboardSection eyebrow="РЕДАКЦИЯ" title="Контент и публикации" text="Новости, медиа и работа с аудиторией." modules={[
        { title: "Новости", text: "Создание, редактура, черновики и публикация материалов.", href: "/admin/news", icon: "N", kicker: "Редакция" },
        ...(canEdit ? [
          { title: "Медиа", text: "Фотоальбомы, фотографии и YouTube-видео.", href: "/admin/media", icon: "◎", kicker: "Редакция" },
          { title: "Комментарии", text: "Модерация обсуждений, жалоб и блокировок.", href: "/admin/comments", icon: "#", kicker: "Редакция" },
          { title: "Переводы RU → RO", text: "Автоперевод и контроль румынской версии.", href: "/admin/translations", icon: "RO", kicker: "Локализация" },
        ] : []),
      ]} />

      {canEdit && <>
        <DashboardSection eyebrow="КОМАНДА" title="Состав и персонал" text="Игроки и люди, работающие с командой." modules={[
          { title: "Игроки", text: "Профили, фотографии, номера и данные состава.", href: "/admin/players", icon: "P", kicker: "Команда" },
          { title: "Штаб команды", text: "Тренеры, медицина и организационный персонал.", href: "/admin/staff", icon: "ST", kicker: "Команда" },
        ]} />

        <DashboardSection eyebrow="МАТЧИ И ТУРНИР" title="Спортивные данные" text="Календарь, турнир и статистика. Матч-центр пока остаётся без переработки." modules={[
          { title: "Календарь", text: "Матчи, результаты, соперники и команды.", href: "/admin/matches", icon: "M", kicker: "Матчи" },
          { title: "Протокол матча", text: "События, составы и подробности созданных матчей.", href: "/admin/match-center", icon: "MC", kicker: "Матч-центр" },
          { title: "Таблица", text: "Турниры, положение команд и очки.", href: "/admin/standings", icon: "T", kicker: "Турнир" },
          { title: "Статистика", text: "Статистика игроков, сезонов и матчей.", href: "/admin/statistics", icon: "S", kicker: "Данные" },
        ]} />

        <DashboardSection eyebrow="КЛУБ" title="Клуб и коммерция" text="История клуба, стадион, руководство и партнёры." modules={[
          { title: "Клуб", text: "О клубе, история, стадион, руководство, достижения, архив и Зал славы.", href: "/admin/club", icon: "C", kicker: "Клуб" },
          { title: "Партнёры", text: "Спонсоры, логотипы, уровни и ссылки.", href: "/admin/partners", icon: "◇", kicker: "Коммерция" },
          { title: "Статистика сайта", text: "Посетители, просмотры, популярные страницы и источники.", href: "/admin/site-analytics", icon: "AN", kicker: "Аналитика" },
        ]} />
      </>}

      {isAdmin && <DashboardSection eyebrow="СИСТЕМА" title="Доступ и контроль" text="Служебные функции администратора." modules={[
        { title: "Пользователи", text: "Аккаунты, роли сотрудников и права доступа.", href: "/admin/users", icon: "U", kicker: "Только admin" },
        { title: "Журнал действий", text: "История изменений, удалений и смены ролей.", href: "/admin/audit", icon: "A", kicker: "Только admin" },
        { title: "Диагностика", text: "Версия, окружение, Supabase, SEO и системные проверки.", href: "/admin/diagnostics", icon: "D", kicker: "Только admin" },
      ]} />}
    </main>
  );
}

function Stat({ label, value, hint, accent = false }: { label: string; value: number | null; hint: string; accent?: boolean }) {
  return <article className={`adminDashStat${accent ? " isAccent" : ""}`}><strong>{value ?? 0}</strong><div><b>{label}</b><span>{hint}</span></div></article>;
}

function DashboardSection({ eyebrow, title, text, modules }: { eyebrow: string; title: string; text: string; modules: Module[] }) {
  if (!modules.length) return null;
  return <section className="adminDashboardSection"><header className="adminDashboardSectionHead"><div><p className="eyebrow blue">{eyebrow}</p><h2>{title}</h2><span>{text}</span></div></header><div className="adminDashboardGrid">{modules.map((module) => <DashboardCard key={module.href} {...module} />)}</div></section>;
}

function DashboardCard({ title, text, href, kicker, icon }: Module) {
  return <Link href={href} className="adminDashCard"><div className="adminDashCardTop"><i>{icon}</i><span>{kicker}</span></div><h3>{title}</h3><p>{text}</p><b>Открыть <span>→</span></b></Link>;
}
