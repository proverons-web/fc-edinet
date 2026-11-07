"use client";

import { useActionState } from "react";
import { deleteHistoryEvent, saveHistoryEvent, type HistoryFormState } from "./actions";
import type { ClubHistoryEvent } from "@/lib/club-history";

type Option = { id: number | string; label: string };
const initial: HistoryFormState = {};

export default function HistoryEventForm({ event, seasons, hallEntries, canDelete }: {
  event?: ClubHistoryEvent; seasons: Option[]; hallEntries: Option[]; canDelete: boolean;
}) {
  const [state, action, pending] = useActionState(saveHistoryEvent, initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteHistoryEvent, initial);
  return <div className="historyAdminFormPanel">
    <form action={action} className="staffAdminForm historyAdminForm" encType="multipart/form-data">
      {event && <input type="hidden" name="event_id" value={event.id} />}
      <div className="historyAdminTriplet">
        <label className="fieldGroup"><span>Год *</span><input name="event_year" type="number" min="1850" max="2100" required defaultValue={event?.event_year ?? ""} placeholder="Например, 1998" /></label>
        <label className="fieldGroup"><span>Месяц (если известен)</span><select name="event_month" defaultValue={event?.event_month ?? ""}><option value="">Не указывать</option>{Array.from({length: 12}, (_, i) => <option value={i + 1} key={i}>{i + 1}</option>)}</select></label>
        <label className="fieldGroup"><span>Тип события</span><select name="event_kind" defaultValue={event?.event_kind ?? "milestone"}><option value="milestone">Важное событие</option><option value="achievement">Достижение</option><option value="people">Люди клуба</option><option value="squad">Исторический состав</option><option value="stadium">Стадион</option></select></label>
      </div>
      <div className="clubArchiveAdminGrid2">
        <label className="fieldGroup"><span>Заголовок RU *</span><input name="title" required maxLength={180} defaultValue={event?.title ?? ""} placeholder="Подтверждённое событие клуба" /></label>
        <label className="fieldGroup"><span>Titlu RO</span><input name="title_ro" maxLength={180} defaultValue={event?.title_ro ?? ""} /></label>
      </div>
      <div className="clubArchiveAdminGrid2">
        <label className="fieldGroup"><span>Описание RU</span><textarea name="description" rows={5} maxLength={6000} defaultValue={event?.description ?? ""} placeholder="Факты, участники и обстоятельства события" /></label>
        <label className="fieldGroup"><span>Descriere RO</span><textarea name="description_ro" rows={5} maxLength={6000} defaultValue={event?.description_ro ?? ""} /></label>
      </div>
      <div className="clubArchiveAdminGrid2">
        <label className="fieldGroup"><span>Связанный сезон</span><select name="season_id" defaultValue={event?.season_id ?? ""}><option value="">Без привязки</option>{seasons.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="fieldGroup"><span>Человек / исторический состав из Зала славы</span><select name="hall_entry_id" defaultValue={event?.hall_entry_id ?? ""}><option value="">Без привязки</option>{hallEntries.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label className="fieldGroup"><span>Ссылка на источник (HTTPS, необязательно)</span><input type="url" name="source_url" placeholder="https://..." maxLength={1000} defaultValue={event?.source_url ?? ""}/><small>При публикации событий используй проверяемый источник, если он доступен.</small></label>
      <div className="clubArchiveAdminGrid2 historyAdminBottom">
        <div className="fieldGroup"><span>Историческая фотография</span>{event?.image_url && <img className="historyAdminPreview" src={event.image_url} alt="Текущее фото события" />}
          <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp"/><small>JPG, PNG, WebP · до 8 МБ. Файл не изменяется.</small>
          {event?.image_url && <label className="checkRow"><input type="checkbox" name="clear_image" />Удалить текущее фото</label>}</div>
        <div className="historyAdminSide"><label className="fieldGroup"><span>Порядок внутри года</span><input type="number" name="display_order" min="0" max="100000" defaultValue={event?.display_order ?? 100}/></label>
          <label className="checkRow"><input type="checkbox" name="is_published" defaultChecked={event?.is_published ?? false} /><span><strong>Опубликовать на сайте</strong><small>Новая запись по умолчанию остаётся черновиком.</small></span></label>
        </div>
      </div>
      <div className="historyAdminActions"><button className="primaryButton" type="submit" disabled={pending}>{pending ? "Сохранение..." : event ? "Сохранить событие" : "Добавить событие"}</button>
        {state.error && <p className="historyAdminError" role="alert">{state.error}</p>}
        {state.success && <p className="historyAdminSuccess" role="status">{state.success}</p>}
      </div>
    </form>
    {event && canDelete && <form action={deleteAction} className="historyAdminDelete"><input type="hidden" name="event_id" value={event.id}/><button type="submit" className="dangerButton" disabled={deleting}>{deleting ? "Удаление..." : "Удалить событие"}</button>{deleteState.error && <p role="alert">{deleteState.error}</p>}{deleteState.success && <p role="status">{deleteState.success}</p>}</form>}
  </div>;
}
