import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MediaGallery from "@/app/components/MediaGallery";
import PageHeroShell from "@/app/components/PageHeroShell";
import { createClient } from "@/lib/supabase/server";
import type { MediaAlbum, MediaPhoto } from "@/lib/types";
import { getLocale } from "@/lib/locale";
import { dateLocale, publicText, type Locale } from "@/lib/i18n";
import { getPublishedSitePageDesign } from "@/lib/page-design";
import { heroLayerStyle, heroLayerVisible } from "@/lib/hero-builder";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("media_albums").select("title,description,cover_image_url").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!data) return { title: publicText[locale].media.defaultAlbum };
  return { title: data.title, description: data.description || `${data.title} — FC Edineț`, openGraph: { title: data.title, description: data.description || `${data.title} — FC Edineț`, type: "website", images: data.cover_image_url ? [{ url: data.cover_image_url }] : undefined } };
}

export default async function MediaAlbumPage({ params }: PageProps) {
  const locale = await getLocale();
  const text = publicText[locale].media;
  const { slug } = await params;
  const supabase = await createClient();
  const [{ data: albumData }, design] = await Promise.all([
    supabase.from("media_albums").select("*").eq("slug", slug).eq("is_published", true).maybeSingle(),
    getPublishedSitePageDesign(supabase, "template_album"),
  ]);
  if (!albumData) notFound();
  const { data: photosData } = await supabase.from("media_photos").select("*").eq("album_id", albumData.id).eq("is_published", true).order("display_order").order("id");
  const album = albumData as MediaAlbum;
  const photos = (photosData ?? []) as MediaPhoto[];

  return <main>
    <PageHeroShell design={design} className="mediaAlbumHero" contentImageUrl={album.cover_image_url}>
<>{heroLayerVisible(design.layer_config,"navigation") && <div className="mediaAlbumNavigation" style={heroLayerStyle(design.layer_config,"navigation")}><Link href="/media" className="mediaBackLink">{text.allAlbums}</Link>{design.show_eyebrow && <p className="eyebrow">{formatDate(album.event_date, locale)}{album.location ? ` • ${album.location}` : ""}</p>}</div>}{heroLayerVisible(design.layer_config,"title") && <h1 style={heroLayerStyle(design.layer_config,"title")}>{album.title}</h1>}{heroLayerVisible(design.layer_config,"description") && design.show_description && album.description && <p style={heroLayerStyle(design.layer_config,"description")}>{album.description}</p>}{heroLayerVisible(design.layer_config,"count") && <span className="mediaAlbumCount" style={heroLayerStyle(design.layer_config,"count")}>{photos.length} {photoWord(photos.length, locale)}</span>}</>
    </PageHeroShell>
    <section className="section mediaGallerySection"><div className="container">{photos.length ? <MediaGallery photos={photos} albumTitle={album.title} locale={locale}/> : <div className="adminEmpty">{text.albumEmpty}</div>}</div></section>
  </main>;
}
function formatDate(value: string | null, locale: Locale) { if (!value) return "FC EDINEȚ"; return new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(`${value}T12:00:00`)); }
function photoWord(value: number, locale: Locale) { if (locale === "ro") return value === 1 ? "fotografie" : "fotografii"; const mod10 = value % 10, mod100 = value % 100; if (mod10 === 1 && mod100 !== 11) return "фотография"; if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "фотографии"; return "фотографий"; }
