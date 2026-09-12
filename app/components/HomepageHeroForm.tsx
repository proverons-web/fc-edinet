"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveHomepageHero,
  type HomepageHeroState,
} from "@/app/admin/home/actions";
import type { HomepageHero } from "@/lib/types";

const initialState: HomepageHeroState = {};

const fallback: HomepageHero = {
  id: 1,
  eyebrow: "ЕДИНЕЦ • МОЛДОВА",
  title_main: "ВМЕСТЕ",
  title_accent: "ЗА ЕДИНЕЦ",
  description:
    "Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.",
  primary_button_text: "Смотреть матчи",
  primary_button_href: "/matches",
  secondary_button_text: "Последние новости",
  secondary_button_href: "/news",
  background_image_url: null,
  overlay_opacity: 72,
  background_position: "center",
  show_primary_button: true,
  show_secondary_button: true,
  updated_at: "",
};

export default function HomepageHeroForm({
  settings,
}: {
  settings: HomepageHero | null;
}) {
  const initial = settings ?? fallback;

  const [state, action, pending] = useActionState(
    saveHomepageHero,
    initialState
  );

  const [eyebrow, setEyebrow] = useState(initial.eyebrow);
  const [titleMain, setTitleMain] = useState(initial.title_main);
  const [titleAccent, setTitleAccent] = useState(initial.title_accent);
  const [description, setDescription] = useState(initial.description);
  const [primaryText, setPrimaryText] =
    useState(initial.primary_button_text);
  const [secondaryText, setSecondaryText] =
    useState(initial.secondary_button_text);
  const [showPrimary, setShowPrimary] =
    useState(initial.show_primary_button);
  const [showSecondary, setShowSecondary] =
    useState(initial.show_secondary_button);
  const [overlay, setOverlay] = useState(initial.overlay_opacity);
  const [position, setPosition] =
    useState(initial.background_position);

  const [previewImage, setPreviewImage] = useState(
    initial.background_image_url ?? ""
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const overlayAlpha = Math.max(0, Math.min(95, overlay)) / 100;

  return (
    <form action={action} className="homepageHeroAdmin">
      <section className="homepageHeroPreviewSection">
        <div className="homepageHeroPreviewLabel">
          <div>
            <p className="eyebrow blue">ПРЕДПРОСМОТР</p>
            <h2>Первый экран сайта</h2>
          </div>
          <span>Изменяется сразу при вводе</span>
        </div>

        <div
          className="homepageHeroPreview"
          style={{
            backgroundImage: previewImage
              ? `linear-gradient(rgba(4,18,40,${overlayAlpha}),rgba(4,18,40,${overlayAlpha})),url("${previewImage}")`
              : `linear-gradient(130deg,rgba(7,22,47,1),rgba(15,58,114,1))`,
            backgroundPosition: position,
          }}
        >
          <div className="homepageHeroPreviewInner">
            <p className="eyebrow">{eyebrow || "ЕДИНЕЦ • МОЛДОВА"}</p>

            <h1>
              {titleMain || "ВМЕСТЕ"}
              <span>{titleAccent || "ЗА ЕДИНЕЦ"}</span>
            </h1>

            <p className="homepageHeroPreviewText">
              {description ||
                "Новости клуба, матчи, состав, история и медиаконтент."}
            </p>

            <div className="homepageHeroPreviewActions">
              {showPrimary && (
                <span className="primaryButton">
                  {primaryText || "Смотреть матчи"}
                </span>
              )}

              {showSecondary && (
                <span className="secondaryButton">
                  {secondaryText || "Последние новости"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="homepageHeroAdminGrid">
        <section className="clubAdminSection">
          <div className="formSectionTitle">
            <p className="eyebrow blue">ТЕКСТ</p>
            <h2>Надписи и заголовок</h2>
          </div>

          <div className="fieldGroup">
            <label htmlFor="hero_eyebrow">Верхняя подпись</label>
            <input
              id="hero_eyebrow"
              name="eyebrow"
              value={eyebrow}
              onChange={(event) => setEyebrow(event.target.value)}
              placeholder="ЕДИНЕЦ • МОЛДОВА"
            />
          </div>

          <div className="twoFields">
            <div className="fieldGroup">
              <label htmlFor="hero_title_main">Заголовок — строка 1</label>
              <input
                id="hero_title_main"
                name="title_main"
                value={titleMain}
                onChange={(event) => setTitleMain(event.target.value)}
                placeholder="ВМЕСТЕ"
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="hero_title_accent">
                Заголовок — строка 2
              </label>
              <input
                id="hero_title_accent"
                name="title_accent"
                value={titleAccent}
                onChange={(event) => setTitleAccent(event.target.value)}
                placeholder="ЗА ЕДИНЕЦ"
              />
            </div>
          </div>

          <div className="fieldGroup">
            <label htmlFor="hero_description">Описание</label>
            <textarea
              id="hero_description"
              name="description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </section>

        <fieldset className="i18nFieldset">
          <legend>Română / RO</legend>
          <div className="fieldGroup"><label htmlFor="hero_eyebrow_ro">Text superior</label><input id="hero_eyebrow_ro" name="eyebrow_ro" defaultValue={initial.eyebrow_ro ?? ""} /></div>
          <div className="twoFields">
            <div className="fieldGroup"><label htmlFor="hero_title_main_ro">Titlu — rândul 1</label><input id="hero_title_main_ro" name="title_main_ro" defaultValue={initial.title_main_ro ?? ""} /></div>
            <div className="fieldGroup"><label htmlFor="hero_title_accent_ro">Titlu — rândul 2</label><input id="hero_title_accent_ro" name="title_accent_ro" defaultValue={initial.title_accent_ro ?? ""} /></div>
          </div>
          <div className="fieldGroup"><label htmlFor="hero_description_ro">Descriere</label><textarea id="hero_description_ro" name="description_ro" rows={4} defaultValue={initial.description_ro ?? ""} /></div>
          <div className="twoFields">
            <div className="fieldGroup"><label htmlFor="hero_primary_text_ro">Buton principal</label><input id="hero_primary_text_ro" name="primary_button_text_ro" defaultValue={initial.primary_button_text_ro ?? ""} /></div>
            <div className="fieldGroup"><label htmlFor="hero_secondary_text_ro">Buton secundar</label><input id="hero_secondary_text_ro" name="secondary_button_text_ro" defaultValue={initial.secondary_button_text_ro ?? ""} /></div>
          </div>
          <label className="checkRow compact autoTranslationLock">
            <input
              type="checkbox"
              name="ro_translation_locked"
              defaultChecked={initial.ro_translation_locked ?? false}
            />
            <span>
              <strong>Зафиксировать ручной RO</strong>
              <small>Иначе тексты Hero автоматически переводятся после изменения RU.</small>
            </span>
          </label>
          <small className="i18nHint">При недоступности автоперевода используется существующий RO или русский fallback.</small>
        </fieldset>

        <section className="clubAdminSection">
          <div className="formSectionTitle">
            <p className="eyebrow blue">ФОН</p>
            <h2>Фото и затемнение</h2>
          </div>

          <div className="homepageBackgroundThumb">
            {previewImage ? (
              <img src={previewImage} alt="" />
            ) : (
              <span>ФОН НЕ ЗАГРУЖЕН</span>
            )}
          </div>

          <div className="fieldGroup">
            <label htmlFor="hero_background_image">Новое фоновое фото</label>
            <input
              id="hero_background_image"
              name="background_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (objectUrl) URL.revokeObjectURL(objectUrl);

                const url = URL.createObjectURL(file);
                setObjectUrl(url);
                setPreviewImage(url);
              }}
            />
            <small className="fieldHint">
              Лучше использовать горизонтальное фото 1920×1080 или шире.
            </small>
          </div>

          <div className="fieldGroup homepageOverlayControl">
            <label htmlFor="hero_overlay">
              Затемнение фона: <strong>{overlay}%</strong>
            </label>
            <input
              id="hero_overlay"
              name="overlay_opacity"
              type="range"
              min={0}
              max={95}
              step={1}
              value={overlay}
              onChange={(event) => setOverlay(Number(event.target.value))}
            />
            <small className="fieldHint">
              0% — фото почти без затемнения. 95% — фон почти полностью тёмный.
            </small>
          </div>

          <div className="fieldGroup">
            <label htmlFor="hero_position">Положение фотографии</label>
            <select
              id="hero_position"
              name="background_position"
              value={position}
              onChange={(event) =>
                setPosition(
                  event.target.value as HomepageHero["background_position"]
                )
              }
            >
              <option value="center">По центру</option>
              <option value="top">Верх</option>
              <option value="bottom">Низ</option>
              <option value="left">Левая часть</option>
              <option value="right">Правая часть</option>
            </select>
          </div>

          {initial.background_image_url && (
            <label className="checkRow compact">
              <input type="checkbox" name="clear_background_image" />
              <span>Удалить фоновое фото</span>
            </label>
          )}
        </section>
      </div>

      <section className="clubAdminSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">КНОПКИ</p>
          <h2>Действия на первом экране</h2>
        </div>

        <div className="homepageButtonAdminGrid">
          <div className="homepageButtonAdminCard">
            <label className="checkRow">
              <input
                type="checkbox"
                name="show_primary_button"
                checked={showPrimary}
                onChange={(event) => setShowPrimary(event.target.checked)}
              />
              <span>
                <strong>Показывать основную кнопку</strong>
              </span>
            </label>

            <div className="fieldGroup">
              <label htmlFor="hero_primary_text">Текст</label>
              <input
                id="hero_primary_text"
                name="primary_button_text"
                value={primaryText}
                onChange={(event) => setPrimaryText(event.target.value)}
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="hero_primary_href">Ссылка</label>
              <input
                id="hero_primary_href"
                name="primary_button_href"
                defaultValue={initial.primary_button_href}
                placeholder="/matches"
              />
            </div>
          </div>

          <div className="homepageButtonAdminCard">
            <label className="checkRow">
              <input
                type="checkbox"
                name="show_secondary_button"
                checked={showSecondary}
                onChange={(event) => setShowSecondary(event.target.checked)}
              />
              <span>
                <strong>Показывать вторую кнопку</strong>
              </span>
            </label>

            <div className="fieldGroup">
              <label htmlFor="hero_secondary_text">Текст</label>
              <input
                id="hero_secondary_text"
                name="secondary_button_text"
                value={secondaryText}
                onChange={(event) => setSecondaryText(event.target.value)}
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="hero_secondary_href">Ссылка</label>
              <input
                id="hero_secondary_href"
                name="secondary_button_href"
                defaultValue={initial.secondary_button_href}
                placeholder="/news"
              />
            </div>
          </div>
        </div>
      </section>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button
        className="primaryButton homepageHeroSave"
        type="submit"
        disabled={pending}
      >
        {pending ? "Сохраняем..." : "Сохранить главный экран"}
      </button>
    </form>
  );
}
