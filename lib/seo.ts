import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import type { Locale } from "@/lib/i18n";
import type { ClubMatch } from "@/lib/types";

const CREST = "/brand/fc-edinet-crest.png";
const SOCIAL = "/opengraph-image";

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

type ArticleOpenGraph = {
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
  section?: string | null;
};

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
  article,
}: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string | null;
  type?: "website" | "article";
  article?: ArticleOpenGraph;
}): Metadata {
  const canonical = absolute(path);
  const imageUrl = absolute(image || SOCIAL);
  const common = {
    siteName: "FC Edineț",
    locale: locale === "ro" ? "ro_MD" : "ru_MD",
    title,
    description,
    url: canonical,
    images: [{ url: imageUrl, alt: title }],
  };

  return {
    title,
    description,
    alternates: { canonical },
    openGraph:
      type === "article"
        ? {
            ...common,
            type: "article",
            publishedTime: article?.publishedTime || undefined,
            modifiedTime: article?.modifiedTime || undefined,
            authors: article?.authors?.length ? article.authors : undefined,
            section: article?.section || undefined,
          }
        : { ...common, type: "website" },
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

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function sportsTeamJsonLd(locale: Locale = "ru") {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": `${getSiteUrl()}#club`,
    name: "FC Edineț",
    sport: "Football",
    url: getSiteUrl(),
    logo: absolute(CREST),
    image: absolute(CREST),
    description:
      locale === "ro"
        ? "Club de fotbal din Edineț, Republica Moldova."
        : "Футбольный клуб из Единца, Республика Молдова.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Edineț",
      addressCountry: "MD",
    },
  };
}

export function newsArticleJsonLd({
  slug,
  title,
  description,
  image,
  publishedAt,
  updatedAt,
  authorName,
  section,
  locale,
}: {
  slug: string;
  title: string;
  description: string;
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
  section?: string | null;
  locale: Locale;
}) {
  const url = absolute(`/news/${encodeURIComponent(slug)}`);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: [absolute(image || SOCIAL)],
    datePublished: publishedAt || undefined,
    dateModified: updatedAt || publishedAt || undefined,
    articleSection: section || undefined,
    inLanguage: locale === "ro" ? "ro-MD" : "ru-MD",
    isAccessibleForFree: true,
    author: authorName
      ? { "@type": "Person", name: authorName }
      : { "@id": `${getSiteUrl()}#club` },
    publisher: { "@id": `${getSiteUrl()}#club` },
  };
}

export function playerPersonJsonLd({
  slug,
  fullName,
  position,
  image,
  birthDate,
  nationality,
  hometown,
  bio,
  locale,
}: {
  slug: string;
  fullName: string;
  position: string;
  image?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  hometown?: string | null;
  bio?: string | null;
  locale: Locale;
}) {
  const url = absolute(`/team/${encodeURIComponent(slug)}`);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#player`,
    name: fullName,
    url,
    image: image ? absolute(image) : undefined,
    jobTitle: position,
    description: bio || undefined,
    birthDate: birthDate || undefined,
    nationality: nationality || undefined,
    homeLocation: hometown ? { "@type": "Place", name: hometown } : undefined,
    memberOf: { "@id": `${getSiteUrl()}#club` },
    knowsAbout: "Football",
    inLanguage: locale === "ro" ? "ro-MD" : "ru-MD",
  };
}

export function sportsEventJsonLd(match: ClubMatch, locale: Locale) {
  const url = absolute(`/matches/${encodeURIComponent(String(match.id))}`);
  const home = match.home?.name || (locale === "ro" ? "Gazde" : "Хозяева");
  const away = match.away?.name || (locale === "ro" ? "Oaspeți" : "Гости");
  const statusMap: Record<ClubMatch["status"], string> = {
    scheduled: "https://schema.org/EventScheduled",
    live: "https://schema.org/EventInProgress",
    finished: "https://schema.org/EventCompleted",
    postponed: "https://schema.org/EventPostponed",
    cancelled: "https://schema.org/EventCancelled",
  };
  const score =
    match.home_score !== null && match.away_score !== null
      ? `${match.home_score}:${match.away_score}`
      : null;

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": `${url}#event`,
    name: `${home} — ${away}`,
    url,
    startDate: match.kickoff,
    eventStatus: statusMap[match.status],
    sport: "Football",
    description: score
      ? locale === "ro"
        ? `${home} — ${away}, scor ${score}.`
        : `${home} — ${away}, счёт ${score}.`
      : `${home} — ${away}.`,
    location: match.stadium
      ? { "@type": "Place", name: match.stadium }
      : undefined,
    homeTeam: sportsEventTeam(match.home),
    awayTeam: sportsEventTeam(match.away),
    superEvent: match.competition?.name
      ? { "@type": "SportsEvent", name: match.competition.name }
      : undefined,
  };
}

function sportsEventTeam(team: ClubMatch["home"]) {
  if (!team) return undefined;
  if (team.is_club) return { "@id": `${getSiteUrl()}#club` };
  return {
    "@type": "SportsTeam",
    name: team.name,
    logo: team.logo_url ? absolute(team.logo_url) : undefined,
  };
}
