import Link from "next/link";
import AccountNav from "@/app/components/AccountNav";
import FanNotificationsList from "@/app/account/FanNotificationsList";
import { markAllFanNotificationsRead } from "@/app/account/actions";
import { requireAccountProfile } from "@/lib/account";
import { getLocale } from "@/lib/locale";
import { notificationText, FAN_NOTIFICATION_SELECT, type FanNotification } from "@/lib/fan-notifications";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;
type Params = { filter?: string; page?: string };

export default async function AccountNotificationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const locale = await getLocale();
  const t = notificationText[locale];
  const { supabase, userId, profile } = await requireAccountProfile();
  const params = await searchParams;
  const unreadOnly = params?.filter === "unread";
  const parsedPage = Number(params?.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage >= 1 && parsedPage <= 1000 ? parsedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase.from("fan_notifications").select(FAN_NOTIFICATION_SELECT, { count: "exact" })
    .eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (unreadOnly) query = query.is("read_at", null);
  const [listResult, unreadResult] = await Promise.all([
    query,
    supabase.from("fan_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const rows = (listResult.data || []) as unknown as FanNotification[];
  const hasMore = !listResult.error && (listResult.count ?? 0) > from + PAGE_SIZE;
  const base = unreadOnly ? "/account/notifications?filter=unread" : "/account/notifications";
  const pageUrl = (index: number) => `${base}${base.includes("?") ? "&" : "?"}page=${index}`;
  const unreadCount = unreadResult.error ? 0 : (unreadResult.count ?? 0);

  return <main className="accountV2Page">
    <section className="accountHero accountV2Hero"><div className="container"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.description}</p><AccountNav locale={locale}/></div></section>
    <section className="section"><div className="container accountSingleColumn fanNotificationPage">
      {!profile.notifications_enabled && <div className="fanNotificationDisabled" role="status">{t.disabled} <Link href="/account/settings">{t.settings} →</Link></div>}
      <div className="fanNotificationToolbar">
        <nav aria-label={t.title} className="fanNotificationFilters">
          <Link href="/account/notifications" aria-current={!unreadOnly ? "page" : undefined}>{t.all}</Link>
          <Link href="/account/notifications?filter=unread" aria-current={unreadOnly ? "page" : undefined}>{t.unread}{!unreadResult.error ? ` (${unreadCount})` : ""}</Link>
        </nav>
        {unreadCount > 0 && <form action={markAllFanNotificationsRead}><button type="submit">{t.markAll}</button></form>}
      </div>
      {listResult.error ? <div className="fanNotificationNotice" role="alert">{t.error}</div> : rows.length ?
        <FanNotificationsList rows={rows} locale={locale}/> :
        <div className="fanNotificationNotice">{unreadOnly ? t.unreadNone : t.none}</div>}
      {!listResult.error && (page > 1 || hasMore) && <nav className="fanNotificationPagination" aria-label={t.title}>
        {page > 1 && <Link href={page === 2 ? base : pageUrl(page - 1)}>{t.earlier}</Link>}
        <span>{page}</span>
        {hasMore && <Link href={pageUrl(page + 1)}>{t.later}</Link>}
      </nav>}
    </div></section>
  </main>;
}
