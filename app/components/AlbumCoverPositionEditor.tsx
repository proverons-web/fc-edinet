"use client";

import { useRef, useState } from "react";
import "./album-cover-position-v2305.css";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Preview shows precisely the cover-crop behaviour of the public album hero. */
export default function AlbumCoverPositionEditor({ imageUrl, title, initialX, initialY }: { imageUrl: string | null; title: string; initialX: number; initialY: number }) {
  const [x, setX] = useState(clamp(initialX));
  const [y, setY] = useState(clamp(initialY));
  const photoRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; clientX: number; clientY: number; startX: number; startY: number; availableX: number; availableY: number } | null>(null);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const image = photoRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    drag.current = {
      pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, startX: x, startY: y,
      availableX: rect.width - image.naturalWidth * scale,
      availableY: rect.height - image.naturalHeight * scale,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || event.pointerId !== start.pointerId) return;
    if (Math.abs(start.availableX) > 0.5) setX(clamp(start.startX + (event.clientX - start.clientX) / start.availableX * 100));
    if (Math.abs(start.availableY) > 0.5) setY(clamp(start.startY + (event.clientY - start.clientY) / start.availableY * 100));
  }
  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <section className="albumCoverFocus2305" aria-label="Настройка положения обложки">
    <div className="albumCoverFocus2305Title"><div><b>Положение обложки альбома</b><p>Перетащи фотографию в рамке или настрой ползунками. Сохранится положение только этого альбома.</p></div><button type="button" className="albumCoverReset2305" onClick={() => { setX(50); setY(50); }}>По центру</button></div>
    {imageUrl ? <div className="albumCoverFocus2305Preview" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} role="img" aria-label="Предпросмотр обложки. Перетащите фотографию для настройки положения.">
      <img ref={photoRef} src={imageUrl} alt="" draggable={false} style={{ objectPosition: `${x}% ${y}%` }} />
      <div className="albumCoverFocus2305Overlay" aria-hidden="true"><span>ПРЕДПРОСМОТР HERO</span><strong>{title}</strong></div>
    </div> : <div className="albumCoverFocus2305Empty">Сначала загрузи фотографии и назначь обложку альбома.</div>}
    <div className="albumCoverFocus2305Controls">
      <label><span>Горизонталь <b>{x}%</b></span><input name="cover_position_x" type="range" min="0" max="100" value={x} onChange={e => setX(Number(e.target.value))} /></label>
      <label><span>Вертикаль <b>{y}%</b></span><input name="cover_position_y" type="range" min="0" max="100" value={y} onChange={e => setY(Number(e.target.value))} /></label>
    </div>
    <small>Верхняя обложка остаётся широкоформатной, но нужную часть снимка теперь выбираешь сам. Для лучшего качества используется оригинал фотографии.</small>
  </section>;
}
