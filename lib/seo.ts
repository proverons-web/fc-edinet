import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import type { Locale } from "@/lib/i18n";

const CREST = "/brand/fc-edinet-crest.png";

const sectionCopy = {
  home: {
    ru: ["FC Edineț — Официальный сайт", "Новости, матчи, состав, статистика, медиа и история футбольного клуба FC Edineț."],
    ro: ["FC Edineț — Site oficial", "Știri, meciuri, lot, statistici, media și istoria clubului de fotbal FC Edineț."],
  },
  news: {
    ru: ["Новости", "Последние новости, события и материалы футбольного клуба FC Edineț."],
    ro: ["Știri", "Ultimele știri, evenimente și materiale ale clubului de fotbal FC Edineț."],
  },
  team: {
    ru: ["Команда", "Состав FC Edineț: игроки, номера, позиции и профили футболистов."],
    ro: ["Echipa", "Lotul FC Edineț: jucători, numere, poziții și profiluri."],
  },
  matches: {
    ru: ["Матчи", "Календарь, результаты и протоколы матчей FC Edineț."],
    ro: ["Meciuri", "Calendarul, rezultatele și rapoartele meciurilor FC Edineț."],
  },
  standings: {
    ru: ["Турнирная таблица", "Положение FC Edineț в чемпионате, результаты и турнирная таблица."],
    ro: ["Clasament", "Poziția FC Edineț în campionat, rezultate și clasamentul competiției."],
  },
  statistics: {
    ru: ["Статистика", "Статистика FC Edineț по сезонам и турнирам: матчи, голы, ассисты и лидеры команды."],
    ro: ["Statistici", "Statisticile FC Edineț pe sezoane și competiții: meciuri, goluri, pase decisive și liderii echipei."],
  },
  club: {
    ru: ["Клуб", "История, стадион, руководство и достижения футбольного клуба FC Edineț."],
    ro: ["Club", "Istoria, stadionul, conducerea și performanțele clubului de fotbal FC Edineț."],
  },
  media: {
    ru: ["Медиа", "Фотоальбомы и видео футбольного клуба FC Edineț."],
    ro: ["Media", "Albume foto și video ale clubului de fotbal FC Edineț."],
  },
  partners: {
    ru: ["Партнёры", "Официальные партнёры и спонсоры футбольного клуба FC Edineț."],
    ro: ["Parteneri", "Partenerii și sponsorii oficiali ai clubului de fotbal FC Edineț."],
  },
  academy: {
    ru: ["Академия", "Футбольная академия FC Edineț: возрастные группы и путь развития молодого игрока."],
    ro: ["Academia", "Academia de fotbal FC Edineț: grupe de vârstă și parcursul de dezvoltare al tinerilor jucători."],
  },
} as const;

export type PublicSection = keyof typeof sectionCopy;

export function publicSectionMetadata(section: PublicSection, locale: Locale, path: string): Metadata {
  const [title, description] = sectionCopy[section][locale];
  const metadata = publicMetadata({ title, description, path, locale });
  if (section === "home") metadata.title = { absolute: title };
  return metadata;
}

export function publicMetadata({
  title,
  description,
  path,
  locale,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const canonical = absolute(path);
  const imageUrl = absolute(image || CREST);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      siteName: "FC Edineț",
      locale: locale === "ro" ? "ro_MD" : "ru_MD",
      title,
      description,
      url: canonical,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function absolute(path: string) {
  const base = getSiteUrl();
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function sportsTeamJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: "FC Edineț",
    sport: "Football",
    url: getSiteUrl(),
    logo: absolute(CREST),
  };
}
