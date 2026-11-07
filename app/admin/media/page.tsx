import { mediaMatchOptions } from "@/lib/media-match-options";
import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import MediaAlbumCreateForm from "@/app/components/MediaAlbumCreateForm";
import MediaVideoForm from "@/app/components/MediaVideoForm";
import MediaHomepageToggle from "@/app/components/MediaHomepageToggle";
import {
  deleteVideo,
} from "@/app/admin/media/actions";
import { requireEditor } from "@/lib/editorial";
import AdminListSearch from "@/app/components/AdminListSearch";
import { adminListHref, adminTextMatches, parseAdminQuery } from "@/lib/admin-list-search";
import { mediaMatchesPublication } from "@/lib/admin-attention";
import { videoKindLabel } from "@/lib/media-video";
import type {
  MediaAlbum,
  MediaVideo,
} from "@/lib/types";

export const metadata = { title: "Медиа — Админ" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string | string[]; status?: string | string[] }> };

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;
  const search = parseAdminQuery(params.q);
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: "all" | "published" | "draft" = rawStatus === "published" || rawStatus === "draft" ? rawStatus : "all";

  const [{ data: albumsData, error: albumsError }, { data: videosData, error: videosError }] =
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

  const matches = await mediaMatchOptions(supabase);
  const rawAlbums = (albumsData ?? []) as MediaAlbum[];
  const rawVideos = (videosData ?? []) as MediaVideo[];
  const albumCountWithoutCover = rawAlbums.filter((album) => !album.cover_image_url?.trim()).length;
  const albums = rawAlbums.filter((album) => mediaMatchesPublication(status, album.is_published) &&
    adminTextMatches(search, album.title, album.location, album.description, album.event_date));
  const videos = rawVideos.filter((video) => mediaMatchesPublication(status, video.is_published) &&
    adminTextMatches(search, video.title, video.description, video.youtube_id, videoKindLabel(video.video_kind)));

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
            <Link href="/admin/page-builder/media" className="rowAction primaryRowAction">Конструктор страницы</Link>
            <Link href="/media" className="rowAction muted">
              Открыть на сайте ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <div className="adminMediaOverview" aria-label="Сводка медиатеки">
            <div><strong>{rawAlbums.length}</strong><span>Альбомов</span></div>
            <div><strong>{rawVideos.length}</strong><span>Видео</span></div>
            <div><strong>{albumCountWithoutCover}</strong><span>Альбомов без обложки</span></div>
          </div>

          <nav className="adminAttentionFilters" aria-label="Статус публикации медиа">
            <Link href={adminListHref("/admin/media", { q: search })} className={status === "all" ? "active" : ""} aria-current={status === "all" ? "page" : undefined}>Все</Link>
            <Link href={adminListHref("/admin/media", { status: "published", q: search })} className={status === "published" ? "active" : ""} aria-current={status === "published" ? "page" : undefined}>Опубликовано</Link>
            <Link href={adminListHref("/admin/media", { status: "draft", q: search })} className={status === "draft" ? "active" : ""} aria-current={status === "draft" ? "page" : undefined}>Черновики / скрыто</Link>
          </nav>
          <AdminListSearch path="/admin/media" query={search} status={status} label="Поиск в медиатеке" placeholder="Название, место, описание, YouTube ID…" count={albums.length + videos.length} />
          {(albumsError || videosError) && <p role="alert" className="adminAttentionError">Не удалось загрузить медиатеку: {albumsError?.message || videosError?.message}</p>}

          <div className="mediaAdminTwoColumns">
            <MediaAlbumCreateForm matches={matches} />
            <MediaVideoForm matches={matches} />
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
                      {!album.cover_image_url?.trim() && <span className="adminAttentionTag">Без обложки</span>}
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
                {search || status !== "all" ? "Альбомов по выбранным условиям нет." : "Создай первый фотоальбом."}
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
                      src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
                      alt=""
                    />
                    <div>
                      <strong>{video.title}</strong>
                      <span>
                        {video.is_published ? "На сайте" : "Скрыто"}
                        {video.show_on_homepage ? " · На главной" : ""}
                        {` · ${videoKindLabel(video.video_kind)}`}
                        {video.match_id ? ` · Матч #${video.match_id}` : ""}
                      </span>
                      <MediaHomepageToggle videoId={video.id} checked={Boolean(video.show_on_homepage)} />
                      <Link href={`/admin/media/videos/${video.id}/edit`} className="rowAction muted">Редактировать →</Link>
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
              <div className="adminEmpty">{search || status !== "all" ? "Видео по выбранным условиям не найдены." : "Видео пока не добавлены."}</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
