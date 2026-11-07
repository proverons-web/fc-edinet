"use client";

import { useActionState } from "react";
import {
  addVideo,
  type MediaFormState,
} from "@/app/admin/media/actions";

const initialState: MediaFormState = {};

export default function MediaVideoForm({ matches = [] }: { matches?: { id: string; label: string }[] }) {
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

      <div className="twoFields">
        <div className="fieldGroup">
          <label htmlFor="media_video_kind">Тип видео</label>
          <select id="media_video_kind" name="video_kind" defaultValue="other">
            <option value="highlights">Обзор матча</option>
            <option value="full_match">Полная запись</option>
            <option value="interview">Интервью</option>
            <option value="other">Другое видео</option>
          </select>
        </div>
        <div className="fieldGroup">
          <label htmlFor="media_video_match">Матч (необязательно)</label>
          <select id="media_video_match" name="match_id" defaultValue="">
            <option value="">Без привязки</option>
            {matches.map((match) => <option key={match.id} value={match.id}>{match.label}</option>)}
          </select>
        </div>
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

      <label className="checkRow">
        <input type="checkbox" name="show_on_homepage" />
        <span>
          <strong>Показывать на главной</strong>
          <small>Если включить, это видео заменит прежнее главное видео.</small>
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
