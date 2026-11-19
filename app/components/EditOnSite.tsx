"use client";

import Link from "next/link";
import "../edit-on-site-v23027.css";
import { usePathname } from "next/navigation";
import { canEditPublicPath } from "@/lib/admin-role-permissions";
import type { UserRole } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

/** One-click editor for trusted staff, never a public editing API. */
export default function EditOnSite({ role, locale }: { role: UserRole; locale: Locale }) {
  const pathname = usePathname();
  if (!pathname || !canEditPublicPath(role, pathname)) return null;
  const title = locale === "ro" ? "Editează această pagină" : "Редактировать эту страницу";
  return (
    <Link
      className="fcEditOnSite"
      href={`/admin/edit?from=${encodeURIComponent(pathname)}`}
      title={title}
      aria-label={title}
      prefetch={false}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20H5a2 2 0 0 1-2-2v-2"/><path d="m16.3 4.3 3.4 3.4"/>
        <path d="M4 20l4.6-1 11-11a2.4 2.4 0 0 0-3.4-3.4l-11 11L4 20Z"/>
      </svg>
      <span>{locale === "ro" ? "Editează" : "Изменить"}</span>
    </Link>
  );
}
