"use client";

import { useState, useTransition } from "react";
import { saveAlbumPhotoOrder } from "@/app/admin/media/actions";

type OrderedPhoto = { id: string; thumb_url: string; caption: string | null };

export default function AlbumPhotoOrder({ albumId, photos }: { albumId: string; photos: OrderedPhoto[] }) {
  const [order, setOrder] = useState(photos);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const original = photos.map(photo => photo.id).join("|");
  const changed = order.map(photo => photo.id).join("|") !== original;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder(current => {
      const updated = [...current];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      const result = await saveAlbumPhotoOrder(albumId, order.map(photo => photo.id));
      setMessage(result.ok ? "Порядок фотографий сохранён." : result.error);
    });
  }

  if (photos.length < 2) return null;
  return <div className="mediaOrderPanel">
    <div className="mediaOrderHeading"><div><h3>Порядок фотографий</h3><p>Перемещай снимки стрелками. Новый порядок появится в опубликованной галерее после сохранения.</p></div>
      <button type="button" disabled={!changed || busy} onClick={save}>{busy ? "Сохранение…" : "Сохранить порядок"}</button>
    </div>
    <ol className="mediaOrderList">{order.map((photo, index) => <li key={photo.id}>
      <span className="mediaOrderNumber">{index + 1}</span>
      <img src={photo.thumb_url} alt="" loading="lazy" />
      <span className="mediaOrderCaption">{photo.caption || `Фото ${index + 1}`}</span>
      <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || busy} aria-label={`Переместить фото ${index + 1} вверх`}>↑</button>
      <button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1 || busy} aria-label={`Переместить фото ${index + 1} вниз`}>↓</button>
    </li>)}</ol>
    {message && <p role="status" className="mediaOrderMessage">{message}</p>}
  </div>;
}
