import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { getSiteUrlObject } from "@/lib/site-url";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { defaultDesignSystem, designSystemCssVariables, normalizeDesignSystem } from "@/lib/design-system";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: designRow } = await supabase.from("site_global_designs").select("config").eq("component_key", "design_system").maybeSingle();
  const designSystem = normalizeDesignSystem(designRow?.config, defaultDesignSystem);

  return (
    <html lang={locale}>
      <body style={designSystemCssVariables(designSystem)}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
