import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type Crumb = { label: string; href?: string };

export default function PublicBreadcrumbs({
  locale,
  items,
  className = "",
}: {
  locale: Locale;
  items: Crumb[];
  className?: string;
}) {
  const home = locale === "ro" ? "Acasă" : "Главная";
  const crumbs: Crumb[] = [{ label: home, href: "/" }, ...items];

  return (
    <nav className={`publicBreadcrumbs ${className}`.trim()} aria-label={locale === "ro" ? "Navigare contextuală" : "Навигационная цепочка"}>
      <ol>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              {index > 0 && <span className="publicBreadcrumbSeparator" aria-hidden="true">/</span>}
              {crumb.href && !last ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
