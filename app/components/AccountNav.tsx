import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { accountText } from "@/lib/account-i18n";
import { createClient } from "@/lib/supabase/server";

export default async function AccountNav({ locale }: { locale: Locale }) {
  const text = accountText[locale];
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const unreadResult = userId ? await supabase.from("fan_notifications")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null) : null;
  const unreadCount = unreadResult?.error ? null : (unreadResult?.count ?? 0);
  return (
    <nav className="accountNav" aria-label={text.title}>
      <Link href="/account">{text.dashboard}</Link>
      <Link href="/account/profile">{text.profile}</Link>
      <Link href="/account/favorites">{text.favorites}</Link>
      <Link href="/account/notifications">{text.notificationsNav}{unreadCount !== null && unreadCount > 0 && <span className="fanNotificationNavCount" aria-label={`${unreadCount} ${text.notificationsNav}`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>
      <Link href="/account/settings">{text.settings}</Link>
    </nav>
  );
}
