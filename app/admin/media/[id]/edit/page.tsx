import Link from "next/link";
import { notFound } from "next/navigation";
import AlbumPhotoUploader from "@/app/components/AlbumPhotoUploader";
import MediaAlbumEditorForm from "@/app/components/MediaAlbumEditorForm";
import {
  deleteAlbum,
  deletePhoto,
  setAlbumCover,
  updatePhoto,
} from "@/app/admin/media/actions";
import { requireEditor } from "@/lib/editorial";
import type {
  MediaAlbum,
  MediaPhoto,
} from "@/lib/types";

export const metadata = { title: "Фотоальбом — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string | string[];
    uploaded?: string | string[];
  }>;
};

export default async function AdminAlbumEditPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const albumId = id.trim();

  if (!albumId) notFound();

  const { supabase, profile } = await requireEditor();

  const [{ data: albumData }, { data: photosData }] =
    await Promise.all([
      supabase
        .from("media_albums")
        .select("*")
        .eq("id", albumId)
        .maybeSingle(),
      supabase
        .from("media_photos")
        .select("*")
        .eq("album_id", albumId)
        .order("display_order")
        .order("id"),
    ]);

  if (!albumData) notFound();

  const album = albumData as MediaAlbum;
  const photos = (photosData ?? []) as MediaPhoto[];

  const created = Array.isArray(query.created)
    ? query.created[0]
    : query.created;
  const uploaded = Array.isArray(query.uploaded)
    ? query.uploaded[0]
    : query.uploaded;

  return (
    <main className="adminPage">
      <section className="editorPageHeader">
        <div className="container editorPageHeaderInner">
          <div>
            <Link href="/admin/media" className="adminBack">
              ← Медиацентр
            </Link>
            <p className="eyebrow blue">ФОТОАЛЬБОМ</p>
            <h1>{album.title}</h1>
          </div>

          {album.is_published && (
            <Link
              href={`/media/${album.slug}`}
              className="adminPreviewLink"
            >
              Открыть на сайте ↗
            </Link>
          )}
        </div>
      </section>

      <section className="editorPageSurface">
        <div className="container">
          {created === "1" && (
            <div className="saveNotice">
              Альбом создан. Теперь загрузи фотографии.
            </div>
          )}
          {uploaded && (
            <div className="saveNotice">
              Загружено фотографий: {uploaded}.
            </div>
          )}

          <MediaAlbumEditorForm album={album} />

          <AlbumPhotoUploader
            albumId={String(album.id)}
            albumSlug={album.slug}
          />

          <section className="mediaPhotoAdminSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">ФОТОГРАФИИ</p>
                <h2>{photos.length} снимков</h2>
              </div>
            </div>

            {photos.length > 0 ? (
              <div className="mediaPhotoAdminGrid">
                {photos.map((photo) => (
                  <article className="mediaPhotoAdminCard" key={photo.id}>
                    <div className="mediaPhotoAdminImage">
                      <img src={photo.thumb_url} alt="" />
                      {album.cover_image_url === photo.thumb_url && (
                        <span className="albumCoverBadge">ОБЛОЖКА</span>
                      )}
                    </div>

                    <form action={updatePhoto}>
                      <input
                        type="hidden"
                        name="photo_id"
                        value={String(photo.id)}
                      />

                      <div className="fieldGroup">
                        <label>Подпись</label>
                        <input
                          name="caption"
                          defaultValue={photo.caption ?? ""}
                          placeholder="Что происходит на фото?"
                        />
                      </div>

                      <div className="twoFields">
                        <div className="fieldGroup">
                          <label>Фотограф</label>
                          <input
                            name="photographer"
                            defaultValue={photo.photographer ?? ""}
                          />
                        </div>

                        <div className="fieldGroup">
                          <label>Порядок</label>
                          <input
                            name="display_order"
                            type="number"
                            min={0}
                            defaultValue={photo.display_order}
                          />
                        </div>
                      </div>

                      <label className="checkRow compact">
                        <input
                          type="checkbox"
                          name="is_published"
                          defaultChecked={photo.is_published}
                        />
                        <span>Показывать фото</span>
                      </label>

                      <button className="mediaPhotoSave" type="submit">
                        Сохранить
                      </button>
                    </form>

                    <div className="mediaPhotoAdminActions">
                      <form action={setAlbumCover}>
                        <input
                          type="hidden"
                          name="album_id"
                          value={String(album.id)}
                        />
                        <input
                          type="hidden"
                          name="photo_id"
                          value={String(photo.id)}
                        />
                        <button type="submit">Сделать обложкой</button>
                      </form>

                      {profile.role === "admin" && (
                        <form action={deletePhoto}>
                          <input
                            type="hidden"
                            name="photo_id"
                            value={String(photo.id)}
                          />
                          <button className="danger" type="submit">
                            Удалить
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="adminEmpty">
                В альбоме пока нет фотографий.
              </div>
            )}
          </section>

          {profile.role === "admin" && (
            <form action={deleteAlbum} className="dangerZone">
              <input
                type="hidden"
                name="album_id"
                value={String(album.id)}
              />
              <div>
                <strong>Удалить весь альбом</strong>
                <p>
                  Будут удалены записи альбома и все его файлы из Storage.
                </p>
              </div>
              <button type="submit">Удалить альбом</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
