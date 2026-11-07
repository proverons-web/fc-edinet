"use client";
import { useActionState } from "react";
import { updateVideo, type MediaFormState } from "@/app/admin/media/actions";
import type { MediaVideo } from "@/lib/types";

const initial: MediaFormState = {};
export default function MediaVideoEditorForm({ video, matches }: {
  video: MediaVideo; matches: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(updateVideo, initial);
  return <form action={action} className="mediaAdminCard mediaVideoEditForm">
    <input type="hidden" name="video_id" value={String(video.id)} />
    <div className="fieldGroup"><label htmlFor="edit_video_title">Название</label>
      <input id="edit_video_title" name="title" defaultValue={video.title} required /></div>
    <div className="fieldGroup"><label htmlFor="edit_youtube_url">Ссылка YouTube</label>
      <input id="edit_youtube_url" name="youtube_url" type="url" defaultValue={video.youtube_url} required /></div>
    <div className="twoFields">
      <div className="fieldGroup"><label htmlFor="edit_video_kind">Тип видео</label>
        <select id="edit_video_kind" name="video_kind" defaultValue={video.video_kind ?? "other"}>
          <option value="highlights">Обзор матча</option><option value="full_match">Полная запись</option>
          <option value="interview">Интервью</option><option value="other">Другое видео</option>
        </select></div>
      <div className="fieldGroup"><label htmlFor="edit_video_match">Матч</label>
        <select id="edit_video_match" name="match_id" defaultValue={video.match_id ? String(video.match_id) : ""}>
          <option value="">Без привязки</option>
          {matches.map(match => <option key={match.id} value={match.id}>{match.label}</option>)}
          {video.match_id && !matches.some(m => m.id === String(video.match_id)) &&
            <option value={String(video.match_id)}>Сохранённый матч #{video.match_id}</option>}
        </select></div>
    </div>
    <div className="fieldGroup"><label htmlFor="edit_video_description">Описание</label>
      <textarea id="edit_video_description" name="description" rows={4} defaultValue={video.description ?? ""}/></div>
    <div className="fieldGroup"><label htmlFor="edit_video_date">Дата публикации</label>
      <input id="edit_video_date" name="published_at" type="date" defaultValue={video.published_at ?? ""}/></div>
    <label className="checkRow"><input name="is_published" type="checkbox" defaultChecked={video.is_published}/><span><strong>Опубликовать видео</strong></span></label>
    <label className="checkRow"><input name="show_on_homepage" type="checkbox" defaultChecked={video.show_on_homepage}/><span><strong>Показывать на главной</strong><small>Заменит предыдущее главное видео.</small></span></label>
    {state.error && <div className="formError" role="alert">{state.error}</div>}
    {state.success && <div className="formSuccess" role="status">{state.success}</div>}
    <button type="submit" className="playerSaveButton" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить видео"}</button>
  </form>;
}
