import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import MediaAlbumCreateForm from "@/app/components/MediaAlbumCreateForm";
import MediaVideoForm from "@/app/components/MediaVideoForm";
import {
  deleteVideo,
} from "@/app/admin/media/actions";
import { requireEditor } from "@/lib/editorial";
import type {
  MediaAlbum,
  MediaVideo,
} from "@/lib/types";

export const metadata = { title: "Медиа — Админ" };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const { supabase, profile } = await requireEditor();

  const [{ data: albumsData }, { data: videosData }] =
    await Promise.all([
      supabase
        .from("media_albums")
        .select("*")
        .order("display_order")
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("media_videos")
        .select("*")
        .order("display_order")
        .order("published_at", { ascending: false }),
    ]);

  const albums = (albumsData ?? []) as MediaAlbum[];
  const videos = (videosData ?? []) as MediaVideo[];

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • MEDIA</p>
            <h1>Медиацентр</h1>
            <p>
              Фотоальбомы, галереи, публикация снимков и видео клуба.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/media" className="rowAction muted">
              Открыть на сайте ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="mediaAdminTwoColumns">
            <MediaAlbumCreateForm />
            <MediaVideoForm />
          </div>

          <section className="mediaAdminSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">ФОТО</p>
                <h2>Альбомы</h2>
              </div>
            </div>

            {albums.length > 0 ? (
              <div className="mediaAdminAlbumList">
                {albums.map((album) => (
                  <Link
                    className="mediaAdminAlbumRow"
                    href={`/admin/media/${album.id}/edit`}
                    key={album.id}
                  >
                    <div className="mediaAdminAlbumCover">
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt="" />
                      ) : (
                        <span>FCE</span>
                      )}
                    </div>

                    <div>
                      <span
                        className={
                          album.is_published
                            ? "mediaState published"
                            : "mediaState draft"
                        }
                      >
                        {album.is_published ? "Опубликован" : "Черновик"}
                      </span>
                      <h3>{album.title}</h3>
                      <p>
                        {album.event_date || "Без даты"}
                        {album.location ? ` · ${album.location}` : ""}
                      </p>
                    </div>

                    <strong>Редактировать →</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="adminEmpty">
                Создай первый фотоальбом.
              </div>
            )}
          </section>

          <section className="mediaAdminSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">VIDEO</p>
                <h2>YouTube</h2>
              </div>
            </div>

            {videos.length > 0 ? (
              <div className="mediaAdminVideoList">
                {videos.map((video) => (
                  <article key={video.id}>
                    <img
                      src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
                      alt=""
                    />
                    <div>
                      <strong>{video.title}</strong>
                      <span>
                        {video.is_published ? "На сайте" : "Скрыто"}
                      </span>
                    </div>

                    {profile.role === "admin" && (
                      <form action={deleteVideo}>
                        <input
                          type="hidden"
                          name="video_id"
                          value={String(video.id)}
                        />
                        <ConfirmSubmitButton className="clubDeleteButton" confirmMessage="Удалить видео из медиатеки?">
                          Удалить
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="adminEmpty">Видео пока не добавлены.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
