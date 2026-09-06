import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { getSiteUrlObject } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: "FC Edineț — Официальный сайт",
    template: "%s | FC Edineț",
  },
  description:
    "Новости, матчи, состав, история и медиа футбольного клуба FC Edineț.",
  applicationName: "FC Edineț",
  openGraph: {
    type: "website",
    siteName: "FC Edineț",
    locale: "ru_MD",
    title: "FC Edineț — Официальный сайт",
    description:
      "Новости, матчи, состав, история и медиа футбольного клуба FC Edineț.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FC Edineț — Официальный сайт",
    description:
      "Новости, матчи, состав, история и медиа футбольного клуба FC Edineț.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
