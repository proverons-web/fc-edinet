"use client";

import { useActionState } from "react";
import {
  addVideo,
  type MediaFormState,
} from "@/app/admin/media/actions";

const initialState: MediaFormState = {};

export default function MediaVideoForm() {
  const [state, action, pending] = useActionState(
    addVideo,
    initialState
  );

  return (
    <form action={action} className="mediaAdminCard mediaVideoForm">
      <div>
        <p className="eyebrow blue">ВИДЕО</p>
        <h2>Добавить YouTube-видео</h2>
      </div>

      <div className="fieldGroup">
        <label htmlFor="media_video_title">Название</label>
        <input id="media_video_title" name="title" required />
      </div>

      <div className="fieldGroup">
        <label htmlFor="media_youtube_url">YouTube-ссылка</label>
        <input
          id="media_youtube_url"
          name="youtube_url"
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
      </div>

      <div className="fieldGroup">
        <label htmlFor="media_video_description">Описание</label>
        <textarea
          id="media_video_description"
          name="description"
          rows={3}
        />
      </div>

      <div className="fieldGroup">
        <label htmlFor="media_video_date">Дата публикации</label>
        <input
          id="media_video_date"
          name="published_at"
          type="date"
        />
      </div>

      <label className="checkRow">
        <input type="checkbox" name="is_published" defaultChecked />
        <span>
          <strong>Показывать на сайте</strong>
        </span>
      </label>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button className="playerSaveButton" type="submit" disabled={pending}>
        {pending ? "Добавляем..." : "+ Добавить видео"}
      </button>
    </form>
  );
}
