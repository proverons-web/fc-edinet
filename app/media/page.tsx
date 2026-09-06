import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  MediaAlbum,
  MediaVideo,
} from "@/lib/types";

export const metadata = {
  title: "Медиа",
  description: "Фотоальбомы и видео FC Edineț.",
};
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const supabase = await createClient();

  const [{ data: albumsData }, { data: videosData }] =
    await Promise.all([
      supabase
        .from("media_albums")
        .select("*")
        .eq("is_published", true)
        .order("display_order")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("media_videos")
        .select("*")
        .eq("is_published", true)
        .order("display_order")
        .order("published_at", { ascending: false })
        .limit(6),
    ]);

  const albums = (albumsData ?? []) as MediaAlbum[];
  const videos = (videosData ?? []) as MediaVideo[];

  return (
    <main>
      <section className="mediaHero">
        <div className="container">
          <p className="eyebrow">FC EDINEȚ MEDIA</p>
          <h1>Моменты клуба</h1>
          <p>
            Матчи, тренировки, болельщики и жизнь FC Edineț в фотографиях
            и видео.
          </p>
        </div>
      </section>

      <section className="section mediaAlbumsSection">
        <div className="container">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow blue">ФОТО</p>
              <h2>Фотоальбомы</h2>
            </div>
          </div>

          {albums.length > 0 ? (
            <div className="mediaAlbumGrid">
              {albums.map((album, index) => (
                <Link
                  href={`/media/${album.slug}`}
                  className={`mediaAlbumCard ${
                    index === 0 ? "featured" : ""
                  }`}
                  key={album.id}
                >
                  <div className="mediaAlbumCover">
                    {album.cover_image_url ? (
                      <img src={album.cover_image_url} alt={album.title} />
                    ) : (
                      <span>FC EDINEȚ</span>
                    )}
                    <div className="mediaAlbumOverlay" />
                    <div className="mediaAlbumCardContent">
                      <span>
                        {formatDate(album.event_date)}
                        {album.location ? ` · ${album.location}` : ""}
                      </span>
                      <h3>{album.title}</h3>
                      {album.description && <p>{album.description}</p>}
                      <b>Открыть альбом →</b>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="adminEmpty">
              Фотоальбомы скоро появятся.
            </div>
          )}
        </div>
      </section>

      <section className="section mediaVideosSection">
        <div className="container">
          <div className="sectionHeading light">
            <div>
              <p className="eyebrow">FC EDINEȚ TV</p>
              <h2>Видео</h2>
            </div>
          </div>

          {videos.length > 0 ? (
            <div className="mediaVideoGrid">
              {videos.map((video) => (
                <article className="mediaVideoCard" key={video.id}>
                  <div className="mediaVideoEmbed">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
                      title={video.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <div>
                    <span>{formatDate(video.published_at)}</span>
                    <h3>{video.title}</h3>
                    {video.description && <p>{video.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="clubDarkEmpty">
              Видео пока не добавлены.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Фотоальбом";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(`${value}T12:00:00`));
}
