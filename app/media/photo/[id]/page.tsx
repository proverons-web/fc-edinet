import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoShareButton from "@/app/components/PhotoShareButton";
import { createClient } from "@/lib/supabase/server";
import type { MediaPhoto } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getPhoto(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("media_photos")
    .select(`
      *,
      album:media_albums!media_photos_album_id_fkey(
        id,title,slug,description,event_date,location,cover_image_url,
        is_published,display_order,created_at,updated_at
      )
    `)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) return null;

  const album = data.album as unknown as { is_published?: boolean } | null;
  if (!album?.is_published) return null;

  return data as unknown as MediaPhoto;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const photo = await getPhoto(id);

  if (!photo) return { title: "Фотография" };

  const albumTitle = photo.album?.title || "FC Edineț";
  const title = photo.caption || albumTitle;

  return {
    title,
    description: `${title} — фото FC Edineț`,
    openGraph: {
      title,
      description: `${title} — фото FC Edineț`,
      type: "article",
      images: [
        {
          url: photo.image_url,
        },
      ],
    },
  };
}

export default async function MediaPhotoPage({
  params,
}: PageProps) {
  const { id } = await params;
  const photo = await getPhoto(id);

  if (!photo) {
    return notFound();
  }

  const album = photo.album;
  const title = photo.caption || album?.title || "FC Edineț";

  return (
    <main className="singlePhotoPage">
      <section className="singlePhotoStage">
        <div className="container">
          <div className="singlePhotoTopbar">
            <Link href={album ? `/media/${album.slug}` : "/media"}>
              ← Вернуться в альбом
            </Link>

            <PhotoShareButton photoId={photo.id} title={title} />
          </div>

          <div className="singlePhotoImage">
            <img src={photo.image_url} alt={title} />
          </div>

          <div className="singlePhotoInfo">
            <div>
              <p className="eyebrow blue">
                {album?.title || "FC EDINEȚ MEDIA"}
              </p>
              <h1>{title}</h1>
              {photo.photographer && (
                <p>Фото: {photo.photographer}</p>
              )}
            </div>

            <PhotoShareButton
              photoId={photo.id}
              title={title}
              compact
            />
          </div>
        </div>
      </section>
    </main>
  );
}
