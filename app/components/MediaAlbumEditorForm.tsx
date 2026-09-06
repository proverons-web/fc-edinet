"use client";

import { useActionState, useState } from "react";
import {
  updateAlbum,
  type MediaFormState,
} from "@/app/admin/media/actions";
import type { MediaAlbum } from "@/lib/types";

const initialState: MediaFormState = {};

export default function MediaAlbumEditorForm({
  album,
}: {
  album: MediaAlbum;
}) {
  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [state, action, pending] = useActionState(
    updateAlbum,
    initialState
  );

  return (
    <form action={action} className="mediaAdminCard mediaAlbumEditor">
      <input type="hidden" name="album_id" value={String(album.id)} />

      <div className="mediaAlbumEditorHeader">
        <div>
          <p className="eyebrow blue">НАСТРОЙКИ АЛЬБОМА</p>
          <h2>{album.title}</h2>
        </div>

        <label className="mediaPublishSwitch">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={album.is_published}
          />
          <span>Опубликован</span>
        </label>
      </div>

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="album_title">Название</label>
          <input
            id="album_title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="album_slug">Slug</label>
          <input
            id="album_slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            required
          />
        </div>
      </div>

      <div className="threeFields">
        <div className="fieldGroup">
          <label htmlFor="album_event_date">Дата</label>
          <input
            id="album_event_date"
            name="event_date"
            type="date"
            defaultValue={album.event_date ?? ""}
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="album_location">Место</label>
          <input
            id="album_location"
            name="location"
            defaultValue={album.location ?? ""}
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="album_order">Порядок</label>
          <input
            id="album_order"
            name="display_order"
            type="number"
            min={0}
            defaultValue={album.display_order}
          />
        </div>
      </div>

      <div className="fieldGroup">
        <label htmlFor="album_description">Описание</label>
        <textarea
          id="album_description"
          name="description"
          rows={4}
          defaultValue={album.description ?? ""}
        />
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button className="playerSaveButton" type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить настройки"}
      </button>
    </form>
  );
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",
    и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
    с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
    щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
