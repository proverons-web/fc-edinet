import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import MediaGallery from "@/app/components/MediaGallery";
import PageHeroShell from "@/app/components/PageHeroShell";
import PublicBreadcrumbs from "@/app/components/PublicBreadcrumbs";
import PublicBackLink from "@/app/components/PublicBackLink";
import { createClient } from "@/lib/supabase/server";
import type { MediaAlbum, MediaPhoto } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { dateLocale, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";
import { publicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

const getAlbum = cache(async (slug: string): Promise<MediaAlbum | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_albums")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data as MediaAlbum | null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const data = await getAlbum(slug);
  if (!data) return { title: publicText[locale].media.defaultAlbum };
  return publicMetadata({
    title: data.title,
    description: data.description || `${data.title} — FC Edineț`,
    path: `/media/${encodeURIComponent(slug)}`,
    locale,
    image: data.cover_image_url,
  });
}

export default async function MediaAlbumPage({ params }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].media;
  const { slug } = await params;
  const supabase = await createClient();
  const [album, design] = await Promise.all([
    getAlbum(slug),
    getPublishedSitePageDesign(supabase, "template_album"),
  ]);
  if (!album) notFound();
  const { data: photosData } = await supabase.from("media_photos").select("*").eq("album_id", album.id).eq("is_published", true).order("display_order").order("id");
  const photos = (photosData ?? []) as MediaPhoto[];

  return <main>
    <PageHeroShell design={design} className="mediaAlbumHero" contentImageUrl={album.cover_image_url}>
<>{heroLayerVisible(design.layer_config,"navigation") && <div className="mediaAlbumNavigation" style={heroLayerStyle(design.layer_config,"navigation")}><PublicBackLink fallbackHref="/media" locale={locale} className="publicBackOnDark" /><PublicBreadcrumbs locale={locale} items={[{ label: text.title, href: "/media" }, { label: album.title }]} className="breadcrumbsOnDark" />{design.show_eyebrow && <p className="eyebrow">{formatDate(album.event_date, locale)}{album.location ? ` • ${album.location}` : ""}</p>}</div>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{album.title}</h1>}{heroLayerVisible(design.layer_config,"description") && design.show_description && album.description && <p style={heroLayerStyle(design.layer_config,"description")}>{album.description}</p>}{heroLayerVisible(design.layer_config,"count") && <span className="mediaAlbumCount" style={heroLayerStyle(design.layer_config,"count")}>{photos.length} {photoWord(photos.length, locale)}</span>}</>
    </PageHeroShell>
    <section className="section mediaGallerySection"><div className="container">{photos.length ? <MediaGallery photos={photos} albumTitle={album.title} text={{ openPhoto:text.openPhoto, open:text.open, close:text.close, previousPhoto:text.previousPhoto, nextPhoto:text.nextPhoto, photoBy:text.photoBy, separatePage:text.separatePage, share:text.share, copied:text.copied, copyLink:text.copyLink }}/> : <div className="adminEmpty">{text.albumEmpty}</div>}</div></section>
  </main>;
}
function formatDate(value: string | null, locale: Locale) { if (!value) return "FC EDINEȚ"; return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(`${value}T12:00:00`)); }
function photoWord(value: number, locale: Locale) { if (locale === "ro") return value === 1 ? "fotografie" : "fotografii"; const mod10 = value % 10, mod100 = value % 100; if (mod10 === 1 && mod100 !== 11) return "фотография"; if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "фотографии"; return "фотографий"; }
