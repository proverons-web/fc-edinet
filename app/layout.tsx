import type { Metadata } from "next";
import { Inter, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import "./visual-polish.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import JsonLd from "./components/JsonLd";
import { getSiteUrlObject } from "@/lib/site-url";
import { getLocale } from "@/lib/locale";
import { defaultDesignSystem, designSystemCssVariables, normalizeDesignSystem } from "@/lib/design-system";
import { getGlobalDesignConfigs } from "@/lib/site-global-designs";
import { sportsTeamJsonLd } from "@/lib/seo";

const fceBodyFont = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-fce-body",
  display: "swap",
});

const fceDisplayFont = Roboto_Condensed({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-fce-display",
  display: "swap",
});

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
    manifest: "/manifest.webmanifest",
    icons: { icon: "/brand/fc-edinet-crest.png", apple: "/brand/fc-edinet-crest.png" },
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const globalDesigns = await getGlobalDesignConfigs();
  const designSystem = normalizeDesignSystem(globalDesigns.design_system, defaultDesignSystem);

  const teamJsonLd = sportsTeamJsonLd(locale);

  return (
    <html lang={locale}>
      <body className={`${fceBodyFont.variable} ${fceDisplayFont.variable}`} style={designSystemCssVariables(designSystem)}>
        <JsonLd data={teamJsonLd} />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
