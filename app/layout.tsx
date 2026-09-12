import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { getSiteUrlObject } from "@/lib/site-url";
import { getLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ro = locale === "ro";
  const title = ro ? "FC Edineț — Site oficial" : "FC Edineț — Официальный сайт";
  const description = ro
    ? "Știri, meciuri, lot, istorie și media ale clubului de fotbal FC Edineț."
    : "Новости, матчи, состав, история и медиа футбольного клуба FC Edineț.";

  return {
    metadataBase: getSiteUrlObject(),
    title: { default: title, template: "%s | FC Edineț" },
    description,
    applicationName: "FC Edineț",
    openGraph: {
      type: "website",
      siteName: "FC Edineț",
      locale: ro ? "ro_MD" : "ru_MD",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
