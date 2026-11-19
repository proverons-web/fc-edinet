"use client";

import { usePathname } from "next/navigation";
import OnSiteEditorAction from "@/app/components/OnSiteEditorAction";
import { canEditPublicPath } from "@/lib/admin-role-permissions";
import type { UserRole } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

/** Visible only to administrator / editor; server actions and RLS enforce real permissions. */
export default function EditOnSite({ role, locale }: { role: UserRole; locale: Locale }) {
  const pathname = usePathname();
  if (!pathname || !canEditPublicPath(role, pathname)) return null;
  const ro = locale === "ro";
  const edit = pathname.startsWith("/matches/cups/") ? "/admin/matches/cups"
    : `/admin/edit?from=${encodeURIComponent(pathname)}`;
  const add = pathname === "/news" ? { href: "/admin/news/new", label: ro ? "Știre nouă" : "Новая новость" }
    : pathname === "/team" ? { href: "/admin/players/new", label: ro ? "Jucător nou" : "Новый игрок" }
    : pathname === "/staff" ? { href: "/admin/staff#new-staff", label: ro ? "Membru nou" : "Добавить сотрудника" }
    : pathname === "/media" ? { href: "/admin/media", label: ro ? "Album nou" : "Добавить альбом" }
    : null;
  const protocol = /^\/matches\/\d+$/.test(pathname) ? `/admin/match-center/${pathname.split("/")[2]}` : null;
  const extras = pathname === "/matches" ? { href: "/admin/matches/competitions", label: ro ? "Competiții" : "Соревнования" }
    : pathname.startsWith("/news/") ? { href: "/admin/comments", label: ro ? "Comentarii" : "Комментарии" }
    : null;
  return <div className="fcOnSiteToolbar" role="group" aria-label={ro ? "Editare pe site" : "Редактирование на сайте"}>
    <OnSiteEditorAction href={edit} locale={locale} label={ro ? "Editează" : "Редактировать"} />
    {protocol && <OnSiteEditorAction href={protocol} locale={locale} kind="protocol" label={ro ? "Protocol" : "Протокол"} />}
    {add && <OnSiteEditorAction href={add.href} locale={locale} kind="add" label={add.label} />}
    {extras && <OnSiteEditorAction href={extras.href} locale={locale} label={extras.label} />}
  </div>;
}
