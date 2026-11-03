import Link from "next/link";
import { requireStaff } from "@/lib/editorial";
import type { Profile } from "@/lib/types";
import { roleLabels } from "@/lib/types";

export const metadata = { title: "Админ-панель" };

type Module = { title: string; text: string; href: string; kicker?: string; icon: string };

export default async function AdminPage() {
  const { supabase, profile: staffProfile } = await requireStaff();
  const profile = staffProfile as Pick<Profile, "id" | "email" | "full_name" | "display_name" | "role">;
  const canEdit = profile.role === "editor" || profile.role === "admin";
  const isAdmin = profile.role === "admin";

  const [playersResult, publishedResult, draftsResult, reviewResult, photoResult, finishedResult, reportsResult] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("status", "review"),
    canEdit
      ? supabase.from("players").select("id,first_name,last_name,photo_url").eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    canEdit
      ? supabase.from("matches").select("id,kickoff").eq("status", "finished").order("kickoff", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    canEdit
      ? supabase.from("match_reports").select("match_id,is_published").eq("is_published", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const missingPhotos = ((photoResult.data ?? []) as { id: number; first_name: string; last_name: string; photo_url: string | null }[])
    .filter((player) => !player.photo_url?.trim());
  const publishedMatchIds = new Set((reportsResult.data ?? []).map((row) => String(row.match_id)));
  const unpublishedReports = ((finishedResult.data ?? []) as { id: number; kickoff: string }[])
    .filter((match) => !publishedMatchIds.has(String(match.id)));
  const operationsAvailable = canEdit && !draftsResult.error && !photoResult.error && !finishedResult.error && !reportsResult.error;

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

      {canEdit && (
        <section className="adminOperations">
          <header className="adminDashboardSectionHead">
            <div><p className="eyebrow blue">ЕЖЕДНЕВНЫЕ ЗАДАЧИ</p><h2>Требует внимания</h2>
              <span>Проверка реальных данных клуба. Никаких автоматических изменений и публикаций.</span></div>
          </header>
          {!operationsAvailable ? <p className="adminOperationsNotice">Не удалось загрузить все задачи. Проверь подключение Supabase.</p> : (
            <div className="adminOperationsGrid">
              <OperationCard title="Черновики новостей" value={draftsResult.count ?? 0} detail="Подготовить и опубликовать" href="/admin/news?status=draft" />
              <OperationCard title="Без фотографии" value={missingPhotos.length} detail="Активные игроки без фото" href="/admin/players?status=active" />
              <OperationCard title="Без опубликованного протокола" value={unpublishedReports.length} detail="Среди последних 50 завершённых матчей" href="/admin/match-center?status=finished" />
            </div>
          )}
          {operationsAvailable && (unpublishedReports.length > 0 || missingPhotos.length > 0) && (
            <div className="adminOperationsLinks" aria-label="Быстрые задачи">
              {unpublishedReports.slice(0, 3).map((match) => <Link key={match.id} href={`/admin/match-center/${match.id}`}>Протокол: {new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Chisinau", dateStyle: "medium" }).format(new Date(match.kickoff))} →</Link>)}
              {missingPhotos.slice(0, 3).map((player) => <Link key={player.id} href={`/admin/players/${player.id}/edit`}>Добавить фото: {player.first_name} {player.last_name} →</Link>)}
            </div>
          )}
        </section>
      )}

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

        <DashboardSection eyebrow="МАТЧИ И ТУРНИР" title="Спортивные данные" text="Календарь, турнир и статистика. Единый матч-центр объединяет составы, события, статистику, отчёт и публикацию." modules={[
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

function OperationCard({ title, value, detail, href }: { title: string; value: number; detail: string; href: string }) {
  return <Link href={href} className="adminOperationCard"><strong>{value}</strong><div><b>{title}</b><span>{detail}</span></div><span aria-hidden="true">→</span></Link>;
}

function DashboardSection({ eyebrow, title, text, modules }: { eyebrow: string; title: string; text: string; modules: Module[] }) {
  if (!modules.length) return null;
  return <section className="adminDashboardSection"><header className="adminDashboardSectionHead"><div><p className="eyebrow blue">{eyebrow}</p><h2>{title}</h2><span>{text}</span></div></header><div className="adminDashboardGrid">{modules.map((module) => <DashboardCard key={module.href} {...module} />)}</div></section>;
}

function DashboardCard({ title, text, href, kicker, icon }: Module) {
  return <Link href={href} className="adminDashCard"><div className="adminDashCardTop"><i>{icon}</i><span>{kicker}</span></div><h3>{title}</h3><p>{text}</p><b>Открыть <span>→</span></b></Link>;
}
