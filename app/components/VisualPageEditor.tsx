"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  saveVisualEditor,
  type VisualEditorState,
} from "@/app/admin/design/actions";
import {
  homepageSectionLabels,
  type HomepageDesignSnapshot,
  type HomepageHero,
  type HomepageSectionKey,
} from "@/lib/types";

const initialState: VisualEditorState = {};

const descriptions: Record<HomepageSectionKey, string> = {
  matches: "Последний и следующий матч",
  standings: "Турнирная таблица",
  news: "Новости клуба",
  players: "Игроки команды",
  media: "Фото и видео",
  partners: "Партнёры клуба",
};

export default function VisualPageEditor({
  initial,
  hero,
  hasDraft,
}: {
  initial: HomepageDesignSnapshot;
  hero: HomepageHero | null;
  hasDraft: boolean;
}) {
  const [state, action, pending] = useActionState(saveVisualEditor, initialState);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [safeZone, setSafeZone] = useState(true);

  const [desktopImage, setDesktopImage] = useState(initial.background_image_url ?? "");
  const [mobileImage, setMobileImage] = useState(initial.mobile_background_image_url ?? "");
  const [desktopObjectUrl, setDesktopObjectUrl] = useState<string | null>(null);
  const [mobileObjectUrl, setMobileObjectUrl] = useState<string | null>(null);
  const [clearDesktop, setClearDesktop] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);

  const [desktopX, setDesktopX] = useState(initial.desktop_position_x);
  const [desktopY, setDesktopY] = useState(initial.desktop_position_y);
  const [desktopZoom, setDesktopZoom] = useState(initial.desktop_zoom_percent);
  const [mobileX, setMobileX] = useState(initial.mobile_position_x);
  const [mobileY, setMobileY] = useState(initial.mobile_position_y);
  const [mobileZoom, setMobileZoom] = useState(initial.mobile_zoom_percent);
  const [desktopHeight, setDesktopHeight] = useState(initial.hero_height_desktop);
  const [mobileHeight, setMobileHeight] = useState(initial.hero_height_mobile);
  const [overlay, setOverlay] = useState(initial.overlay_opacity);
  const [alignment, setAlignment] = useState(initial.text_alignment);
  const [showMatchCard, setShowMatchCard] = useState(initial.show_match_card);

  const [sections, setSections] = useState(initial.section_order);
  const [visible, setVisible] = useState(initial.section_visibility);
  const [dragging, setDragging] = useState<HomepageSectionKey | null>(null);

  useEffect(() => {
    return () => {
      if (desktopObjectUrl) URL.revokeObjectURL(desktopObjectUrl);
      if (mobileObjectUrl) URL.revokeObjectURL(mobileObjectUrl);
    };
  }, [desktopObjectUrl, mobileObjectUrl]);

  const desktopPreviewImage = clearDesktop ? "" : desktopImage;
  const mobilePreviewImage = clearMobile ? "" : mobileImage;
  const currentImage = mode === "mobile" ? mobilePreviewImage || desktopPreviewImage : desktopPreviewImage;
  const preview = useMemo(
    () =>
      mode === "desktop"
        ? { x: desktopX, y: desktopY, zoom: desktopZoom, height: desktopHeight }
        : { x: mobileX, y: mobileY, zoom: mobileZoom, height: mobileHeight },
    [mode, desktopX, desktopY, desktopZoom, desktopHeight, mobileX, mobileY, mobileZoom, mobileHeight]
  );

  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function dropSection(target: HomepageSectionKey) {
    if (!dragging || dragging === target) return;
    setSections((current) => {
      const next = current.filter((key) => key !== dragging);
      const targetIndex = next.indexOf(target);
      next.splice(targetIndex, 0, dragging);
      return next;
    });
    setDragging(null);
  }

  const titleMain = hero?.title_main || "ВМЕСТЕ";
  const titleAccent = hero?.title_accent || "ЗА ЕДИНЕЦ";
  const eyebrow = hero?.eyebrow || "ЕДИНЕЦ • МОЛДОВА";
  const description =
    hero?.description ||
    "Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.";

  return (
    <form action={action} className="visualEditorForm">
      <input type="hidden" name="section_order" value={sections.join(",")} />

      <section className="visualEditorWorkspace">
        <div className="visualEditorToolbar">
          <div>
            <p className="eyebrow blue">LIVE PREVIEW</p>
            <h2>Hero / Header главной</h2>
            <small>
              {hasDraft ? "Открыт сохранённый черновик." : "Показан текущий опубликованный дизайн."}
            </small>
          </div>

          <div className="visualViewportTabs" role="tablist" aria-label="Размер предпросмотра">
            <button type="button" className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")}>Desktop</button>
            <button type="button" className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")}>Mobile</button>
          </div>
        </div>

        <div className={`visualPreviewStage ${mode}`}>
          <div
            className={`visualHeroPreview align-${alignment} ${showMatchCard ? "" : "withoutMatch"}`}
            style={{ height: mode === "desktop" ? Math.min(preview.height, 620) : Math.min(preview.height, 680) }}
          >
            {currentImage ? (
              <img
                className="visualHeroImage"
                src={currentImage}
                alt=""
                style={{
                  objectPosition: `${preview.x}% ${preview.y}%`,
                  transform: `scale(${preview.zoom / 100})`,
                  transformOrigin: `${preview.x}% ${preview.y}%`,
                }}
              />
            ) : (
              <div className="visualHeroFallback" />
            )}
            <div className="visualHeroOverlay" style={{ opacity: overlay / 100 }} />
            {safeZone && <div className="visualSafeZone"><span>SAFE ZONE</span></div>}

            <div className="visualHeroPreviewContent">
              <div className="visualHeroPreviewText">
                <p className="eyebrow">{eyebrow}</p>
                <h1>{titleMain}<span>{titleAccent}</span></h1>
                <p>{description}</p>
                <div className="visualPreviewButtons">
                  <span>Смотреть матчи</span>
                  <span>Последние новости</span>
                </div>
              </div>

              {showMatchCard && mode === "desktop" && (
                <div className="visualMatchMock">
                  <small>СЛЕДУЮЩИЙ МАТЧ</small>
                  <b>FC EDINEȚ</b>
                  <strong>VS</strong>
                  <b>СОПЕРНИК</b>
                  <span>Дата • Стадион</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="visualSafeToggle">
          <input type="checkbox" checked={safeZone} onChange={(event) => setSafeZone(event.target.checked)} />
          <span>Показывать безопасную зону текста</span>
        </label>
      </section>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle">
            <p className="eyebrow blue">ФОТО</p>
            <h2>Кадрирование Desktop</h2>
            <p>Загрузи фото и подгони кадр ползунками. Исходный файл не портится.</p>
          </div>

          <div className="fieldGroup">
            <label htmlFor="visual_desktop_image">Фоновое фото</label>
            <input
              id="visual_desktop_image"
              name="background_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (desktopObjectUrl) URL.revokeObjectURL(desktopObjectUrl);
                const url = URL.createObjectURL(file);
                setDesktopObjectUrl(url);
                setDesktopImage(url);
                setClearDesktop(false);
              }}
            />
            <small className="fieldHint">Рекомендуется 1920×1080 или больше, до 8 МБ.</small>
          </div>

          <Range label="Фокус по горизонтали" name="desktop_position_x" min={0} max={100} value={desktopX} setValue={setDesktopX} suffix="%" />
          <Range label="Фокус по вертикали" name="desktop_position_y" min={0} max={100} value={desktopY} setValue={setDesktopY} suffix="%" />
          <Range label="Масштаб" name="desktop_zoom_percent" min={100} max={240} value={desktopZoom} setValue={setDesktopZoom} suffix="%" />
          <Range label="Высота Hero" name="hero_height_desktop" min={420} max={900} step={10} value={desktopHeight} setValue={setDesktopHeight} suffix=" px" />

          {desktopImage && (
            <label className="checkRow compact">
              <input type="checkbox" name="clear_background_image" checked={clearDesktop} onChange={(event) => setClearDesktop(event.target.checked)} />
              <span>Убрать фоновое фото Desktop</span>
            </label>
          )}
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle">
            <p className="eyebrow blue">MOBILE</p>
            <h2>Отдельный мобильный кадр</h2>
            <p>Можно использовать то же фото или загрузить отдельную вертикальную версию.</p>
          </div>

          <div className="fieldGroup">
            <label htmlFor="visual_mobile_image">Отдельное фото для Mobile</label>
            <input
              id="visual_mobile_image"
              name="mobile_background_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (mobileObjectUrl) URL.revokeObjectURL(mobileObjectUrl);
                const url = URL.createObjectURL(file);
                setMobileObjectUrl(url);
                setMobileImage(url);
                setClearMobile(false);
                setMode("mobile");
              }}
            />
            <small className="fieldHint">Если не загружать — Mobile использует Desktop-фото.</small>
          </div>

          <Range label="Фокус по горизонтали" name="mobile_position_x" min={0} max={100} value={mobileX} setValue={setMobileX} suffix="%" />
          <Range label="Фокус по вертикали" name="mobile_position_y" min={0} max={100} value={mobileY} setValue={setMobileY} suffix="%" />
          <Range label="Масштаб" name="mobile_zoom_percent" min={100} max={300} value={mobileZoom} setValue={setMobileZoom} suffix="%" />
          <Range label="Высота Hero" name="hero_height_mobile" min={360} max={850} step={10} value={mobileHeight} setValue={setMobileHeight} suffix=" px" />

          {mobileImage && (
            <label className="checkRow compact">
              <input type="checkbox" name="clear_mobile_background_image" checked={clearMobile} onChange={(event) => setClearMobile(event.target.checked)} />
              <span>Удалить отдельное Mobile-фото</span>
            </label>
          )}
        </section>
      </div>

      <div className="visualEditorColumns">
        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle">
            <p className="eyebrow blue">ВИД</p>
            <h2>Текст и затемнение</h2>
          </div>

          <Range label="Затемнение фотографии" name="overlay_opacity" min={0} max={95} value={overlay} setValue={setOverlay} suffix="%" />

          <div className="fieldGroup">
            <label htmlFor="visual_text_alignment">Выравнивание текста</label>
            <select id="visual_text_alignment" name="text_alignment" value={alignment} onChange={(event) => setAlignment(event.target.value as "left" | "center" | "right") }>
              <option value="left">Слева</option>
              <option value="center">По центру</option>
              <option value="right">Справа</option>
            </select>
          </div>

          <label className="checkRow">
            <input type="checkbox" name="show_match_card" checked={showMatchCard} onChange={(event) => setShowMatchCard(event.target.checked)} />
            <span>
              <strong>Показывать карточку следующего матча</strong>
              <small>На мобильном она скрывается автоматически, чтобы первый экран не был перегружен.</small>
            </span>
          </label>
        </section>

        <section className="clubAdminSection visualControlCard">
          <div className="formSectionTitle">
            <p className="eyebrow blue">СЕКЦИИ</p>
            <h2>Порядок главной</h2>
            <p>Перетаскивай блоки мышкой или используй стрелки.</p>
          </div>

          <div className="visualSectionList">
            {sections.map((key, index) => (
              <div
                className={`visualSectionRow ${dragging === key ? "dragging" : ""}`}
                key={key}
                draggable
                onDragStart={() => setDragging(key)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropSection(key)}
              >
                <span className="visualDragHandle" aria-hidden>⋮⋮</span>
                <label>
                  <input
                    type="checkbox"
                    name={`section_${key}_enabled`}
                    checked={visible[key]}
                    onChange={(event) => setVisible((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  <span>
                    <strong>{homepageSectionLabels[key]}</strong>
                    <small>{descriptions[key]}</small>
                  </span>
                </label>
                <div className="visualSectionButtons">
                  <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="visualPublishBar">
        <div>
          <p className="eyebrow blue">ПУБЛИКАЦИЯ</p>
          <h2>Черновик или сразу на сайт</h2>
          <p>«Сохранить черновик» не меняет публичную страницу. «Опубликовать» применяет дизайн и записывает его в историю.</p>
        </div>
        <div className="visualPublishControls">
          <input name="version_label" placeholder="Название версии, например: Hero сентябрь" />
          <div className="visualPublishButtons">
            <button className="secondaryAdminButton" type="submit" name="intent" value="draft" disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить черновик"}
            </button>
            <button className="primaryButton homepageHeroSave" type="submit" name="intent" value="publish" disabled={pending}>
              {pending ? "Публикуем…" : "Опубликовать дизайн"}
            </button>
          </div>
        </div>
      </section>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}
    </form>
  );
}

function Range({
  label,
  name,
  min,
  max,
  step = 1,
  value,
  setValue,
  suffix,
}: {
  label: string;
  name: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  setValue: (value: number) => void;
  suffix: string;
}) {
  return (
    <div className="visualRange">
      <div><label htmlFor={name}>{label}</label><strong>{value}{suffix}</strong></div>
      <input id={name} name={name} type="range" min={min} max={max} step={step} value={value} onChange={(event) => setValue(Number(event.target.value))} />
    </div>
  );
}
