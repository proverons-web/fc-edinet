"use client";

import { useActionState, useState } from "react";
import {
  createAlbum,
  type MediaFormState,
} from "@/app/admin/media/actions";

const initialState: MediaFormState = {};

export default function MediaAlbumCreateForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [state, action, pending] = useActionState(
    createAlbum,
    initialState
  );

  return (
    <form action={action} className="mediaAdminCard mediaCreateAlbumForm">
      <div>
        <p className="eyebrow blue">НОВЫЙ АЛЬБОМ</p>
        <h2>Создать фотоальбом</h2>
      </div>

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="media_album_title">Название</label>
          <input
            id="media_album_title"
            name="title"
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              if (!slugTouched) setSlug(slugify(value));
            }}
            placeholder="FC Edineț — Olimp"
            required
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="media_album_slug">Slug</label>
          <input
            id="media_album_slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            required
          />
        </div>
      </div>

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="media_event_date">Дата события</label>
          <input id="media_event_date" name="event_date" type="date" />
        </div>

        <div className="fieldGroup">
          <label htmlFor="media_location">Место</label>
          <input
            id="media_location"
            name="location"
            placeholder="Stadionul Edineț"
          />
        </div>
      </div>

      <div className="fieldGroup">
        <label htmlFor="media_description">Описание</label>
        <textarea
          id="media_description"
          name="description"
          rows={4}
          placeholder="Короткое описание альбома..."
        />
      </div>

      <label className="checkRow">
        <input type="checkbox" name="is_published" />
        <span>
          <strong>Опубликовать альбом</strong>
          <small>
            Можно сначала загрузить фотографии и опубликовать позже.
          </small>
        </span>
      </label>

      {state.error && <div className="formError">{state.error}</div>}

      <button className="playerSaveButton" type="submit" disabled={pending}>
        {pending ? "Создаём..." : "Создать альбом"}
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
