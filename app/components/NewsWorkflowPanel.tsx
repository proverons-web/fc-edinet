"use client";

import { useState } from "react";

type PreviewLanguage = "ru" | "ro";
type PreviewDevice = "desktop" | "mobile";

type Props = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  titleRo: string;
  excerptRo: string;
  contentRo: string;
  roLocked: boolean;
  categoryId: string;
  categoryName: string;
  coverUrl: string;
  coverX: number;
  coverY: number;
  coverZoom: number;
};

/**
 * Read-only, local preview of draft fields. Never uses a public draft URL and
 * never publishes or sends draft content to an additional service.
 */
export default function NewsWorkflowPanel({
  title, slug, excerpt, content, titleRo, excerptRo, contentRo, roLocked,
  categoryId, categoryName, coverUrl, coverX, coverY, coverZoom,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const [language, setLanguage] = useState<PreviewLanguage>("ru");
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const required = [
    { label: "Заголовок RU", ready: title.trim().length >= 5 && title.trim().length <= 180 },
    { label: "Адрес / slug", ready: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 180 },
    { label: "Категория", ready: Boolean(categoryId) },
    { label: "Текст RU", ready: content.trim().length >= 20 },
  ];
  const readyCount = required.filter((item) => item.ready).length;
  const roComplete = Boolean(titleRo.trim() && contentRo.trim());
  const previewTitle = (language === "ro" ? titleRo : title) || title || "Заголовок новости";
  const previewExcerpt = (language === "ro" ? excerptRo : excerpt) || excerpt;
  const previewContent = (language === "ro" ? contentRo : content) || content;
  const paragraphs = previewContent.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);

  return (
    <section className="newsWorkflowPanel" aria-label="Проверка материала и предпросмотр">
      <div className="newsWorkflowHeading">
        <div>
          <h2>Перед публикацией</h2>
          <p>Проверь обязательные поля и оформление до отправки редактору или публикации.</p>
        </div>
        <strong className={readyCount === required.length ? "isReady" : "isIncomplete"}>
          {readyCount}/{required.length} готово
        </strong>
      </div>

      <div className="newsWorkflowChecks" aria-live="polite">
        {required.map((item) => (
          <span key={item.label} className={item.ready ? "isReady" : "isMissing"}>
            <span aria-hidden="true">{item.ready ? "✓" : "!"}</span> {item.label}
          </span>
        ))}
      </div>
      <div className="newsWorkflowHints">
        {!roComplete && (
          <p><strong>RO:</strong> ручной перевод заполнен не полностью. {roLocked ? "Включена фиксация ручного перевода: автоперевод отключён, возможен RU fallback." : "При сохранении сервер попробует выполнить автоперевод; при недоступности сервиса возможен RU fallback."}</p>
        )}
        {!coverUrl && <p><strong>Обложка:</strong> не выбрана. Новость можно сохранить, но без обложки она будет менее заметной в ленте.</p>}
        {!excerpt.trim() && <p><strong>Анонс:</strong> пуст. Рекомендуется добавить краткое описание для карточек и соцсетей.</p>}
      </div>

      <button
        type="button"
        className="newsWorkflowPreviewToggle"
        aria-expanded={isOpen}
        aria-controls="newsWorkflowPreview"
        onClick={() => setOpen((value) => !value)}
      >
        {isOpen ? "Скрыть предпросмотр" : "Предпросмотр новости (без публикации)"}
      </button>

      {isOpen && (
        <div id="newsWorkflowPreview" className="newsWorkflowPreview">
          <div className="newsWorkflowPreviewControls">
            <div className="newsWorkflowSegment" aria-label="Язык предпросмотра">
              <button type="button" className={language === "ru" ? "isSelected" : ""} aria-pressed={language === "ru"} onClick={() => setLanguage("ru")}>RU</button>
              <button type="button" className={language === "ro" ? "isSelected" : ""} aria-pressed={language === "ro"} onClick={() => setLanguage("ro")}>RO</button>
            </div>
            <div className="newsWorkflowSegment" aria-label="Размер предпросмотра">
              <button type="button" className={device === "desktop" ? "isSelected" : ""} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>ПК</button>
              <button type="button" className={device === "mobile" ? "isSelected" : ""} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Телефон</button>
            </div>
          </div>
          {language === "ro" && !roComplete && <p className="newsWorkflowFallback">Предпросмотр RO использует русский текст как fallback для пустых полей. Это не результат автоматического перевода.</p>}
          <div className={`newsWorkflowPreviewSurface is-${device}`}>
            <div className="newsWorkflowPreviewLabel">FC EDINEȚ · {categoryName || "Без категории"}</div>
            <h3>{previewTitle}</h3>
            {previewExcerpt && <p className="newsWorkflowPreviewExcerpt">{previewExcerpt}</p>}
            <div className="newsWorkflowPreviewCover">
              {coverUrl ? (
                <img src={coverUrl} alt="Предпросмотр обложки" style={{ objectPosition: `${coverX}% ${coverY}%`, transform: `scale(${coverZoom / 100})`, transformOrigin: `${coverX}% ${coverY}%` }} />
              ) : <span>FC EDINEȚ · Без обложки</span>}
            </div>
            <div className="newsWorkflowPreviewText">
              {paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>Текст появится здесь после заполнения редактора.</p>}
            </div>
          </div>
          <small>Локальная проверка содержания и пропорций. Точное оформление публичной страницы зависит от её настроек дизайна. Предпросмотр не создаёт публикацию.</small>
        </div>
      )}
    </section>
  );
}
