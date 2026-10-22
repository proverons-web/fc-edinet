import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { clubPageLabel, clubPages, type ClubPageKey } from "@/lib/club-pages";

export default function ClubSectionShell({
  locale,
  active,
  title,
  eyebrow,
  description,
  children,
}: {
  locale: Locale;
  active: ClubPageKey;
  title: string;
  eyebrow?: string;
  description?: string;
  imageUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <main className="clubSectionPage">
      <section className="clubSectionHero imageFreeClubHero">
        <div className="container clubSectionHeroInner">
          <p className="eyebrow">{eyebrow || "FC EDINEȚ • CLUB"}</p>
          <h1>{title}</h1>
          {description ? <p className="clubSectionHeroLead">{description}</p> : null}
        </div>
      </section>

      <nav className="clubSubnav" aria-label={locale === "ro" ? "Secțiunile clubului" : "Разделы клуба"}>
        <div className="container clubSubnavInner">
          {clubPages.map((item, index) => (
            <Link key={item.key} href={item.href} className={item.key === active ? "active" : undefined} aria-current={item.key === active ? "page" : undefined}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {clubPageLabel(item.key, locale)}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </main>
  );
}
