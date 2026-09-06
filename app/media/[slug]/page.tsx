import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MediaGallery from "@/app/components/MediaGallery";
import { createClient } from "@/lib/supabase/server";
import type {
  MediaAlbum,
  MediaPhoto,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("media_albums")
    .select("title,description,cover_image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) return { title: "Фотоальбом" };

  return {
    title: data.title,
    description: data.description || `Фотоальбом FC Edineț: ${data.title}`,
    openGraph: {
      title: data.title,
      description:
        data.description || `Фотоальбом FC Edineț: ${data.title}`,
      type: "website",
      images: data.cover_image_url
        ? [{ url: data.cover_image_url }]
        : undefined,
    },
  };
}

export default async function MediaAlbumPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: albumData } = await supabase
    .from("media_albums")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!albumData) notFound();

  const { data: photosData } = await supabase
    .from("media_photos")
    .select("*")
    .eq("album_id", albumData.id)
    .eq("is_published", true)
    .order("display_order")
    .order("id");

  const album = albumData as MediaAlbum;
  const photos = (photosData ?? []) as MediaPhoto[];

  return (
    <main>
      <section
        className="mediaAlbumHero"
        style={
          album.cover_image_url
            ? {
                backgroundImage:
                  `linear-gradient(90deg,rgba(3,12,28,.95),rgba(3,12,28,.48)),url("${album.cover_image_url}")`,
              }
            : undefined
        }
      >
        <div className="container">
          <Link href="/media" className="mediaBackLink">
            ← Все альбомы
          </Link>
          <p className="eyebrow">
            {formatDate(album.event_date)}
            {album.location ? ` • ${album.location}` : ""}
          </p>
          <h1>{album.title}</h1>
          {album.description && <p>{album.description}</p>}
          <span className="mediaAlbumCount">
            {photos.length} {photoWord(photos.length)}
          </span>
        </div>
      </section>

      <section className="section mediaGallerySection">
        <div className="container">
          {photos.length > 0 ? (
            <MediaGallery photos={photos} albumTitle={album.title} />
          ) : (
            <div className="adminEmpty">
              В этом альбоме пока нет фотографий.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "FC EDINEȚ";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(`${value}T12:00:00`));
}

function photoWord(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return "фотография";
  if (
    mod10 >= 2 &&
    mod10 <= 4 &&
    !(mod100 >= 12 && mod100 <= 14)
  ) {
    return "фотографии";
  }

  return "фотографий";
}
