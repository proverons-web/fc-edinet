import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { accountText } from "@/lib/account-i18n";

export default function AccountNav({ locale }: { locale: Locale }) {
  const text = accountText[locale];
  return (
    <nav className="accountNav" aria-label={text.title}>
      <Link href="/account">{text.dashboard}</Link>
      <Link href="/account/profile">{text.profile}</Link>
      <Link href="/account/favorites">{text.favorites}</Link>
      <Link href="/account/settings">{text.settings}</Link>
    </nav>
  );
}
