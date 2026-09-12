"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  saveHomepageLayout,
  type HomepageLayoutState,
} from "@/app/admin/home/actions";
import {
  homepageSectionLabels,
  type HomepageSection,
  type HomepageSectionKey,
  type HomepageSettings,
} from "@/lib/types";

const initialState: HomepageLayoutState = {};

const fallbackSections: HomepageSection[] = [
  { section_key: "matches", is_enabled: true, display_order: 10, updated_at: "" },
  { section_key: "standings", is_enabled: true, display_order: 20, updated_at: "" },
  { section_key: "news", is_enabled: true, display_order: 30, updated_at: "" },
  { section_key: "players", is_enabled: true, display_order: 40, updated_at: "" },
  { section_key: "media", is_enabled: true, display_order: 50, updated_at: "" },
  { section_key: "partners", is_enabled: true, display_order: 60, updated_at: "" },
];

const fallbackSettings: HomepageSettings = {
  id: 1,
  show_pinned_news: false,
  pinned_news_id: null,
  banner_enabled: false,
  banner_eyebrow: "FC EDINEȚ",
  banner_title: "Вместе с клубом",
  banner_text: "",
  banner_button_text: "Подробнее",
  banner_button_href: "/club",
  banner_image_url: null,
  banner_overlay_opacity: 72,
  banner_background_position: "center",
  updated_at: "",
};

const sectionDescriptions: Record<HomepageSectionKey, string> = {
  matches: "Последний матч, следующий матч и ссылка на календарь.",
  standings: "Короткая турнирная таблица на главной странице.",
  news: "Закреплённая публикация и последние новости клуба.",
  players: "Карточки игроков первой команды.",
  media: "Свежие фотоальбомы и видео из медиараздела.",
  partners: "Логотипы партнёров, отмеченных для показа на главной.",
};

type NewsOption = {
  id: string | number;
  title: string;
  published_at: string | null;
};

export default function HomepageLayoutForm({
  sections,
  settings,
  publishedNews,
}: {
  sections: HomepageSection[];
  settings: HomepageSettings | null;
  publishedNews: NewsOption[];
}) {
  const initialSections = useMemo(() => {
    const source = sections.length > 0 ? sections : fallbackSections;
    const map = new Map(source.map((item) => [item.section_key, item]));

    return fallbackSections
      .map((fallback) => map.get(fallback.section_key) ?? fallback)
      .sort((a, b) => a.display_order - b.display_order);
  }, [sections]);

  const initial = settings ?? fallbackSettings;
  const [state, action, pending] = useActionState(
    saveHomepageLayout,
    initialState
  );

  const [orderedSections, setOrderedSections] = useState(initialSections);
  const [enabled, setEnabled] = useState<Record<HomepageSectionKey, boolean>>(
    Object.fromEntries(
      initialSections.map((section) => [section.section_key, section.is_enabled])
    ) as Record<HomepageSectionKey, boolean>
  );

  const [showPinned, setShowPinned] = useState(initial.show_pinned_news);
  const [bannerEnabled, setBannerEnabled] = useState(initial.banner_enabled);
  const [bannerEyebrow, setBannerEyebrow] = useState(initial.banner_eyebrow);
  const [bannerTitle, setBannerTitle] = useState(initial.banner_title);
  const [bannerText, setBannerText] = useState(initial.banner_text);
  const [bannerButtonText, setBannerButtonText] = useState(initial.banner_button_text);
  const [bannerImage, setBannerImage] = useState(initial.banner_image_url ?? "");
  const [bannerOverlay, setBannerOverlay] = useState(initial.banner_overlay_opacity);
  const [bannerPosition, setBannerPosition] = useState(
    initial.banner_background_position
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedSections.length) return;

    setOrderedSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const overlayAlpha = Math.max(0, Math.min(95, bannerOverlay)) / 100;

  return (
    <form action={action} className="homepageLayoutAdmin">
      <section className="clubAdminSection homepageControlSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">СТРУКТУРА</p>
          <h2>Блоки главной страницы</h2>
          <p>
            Включай нужные разделы и меняй их порядок. Hero-блок всегда остаётся
            первым экраном сайта.
          </p>
        </div>

        <input
          type="hidden"
          name="section_order"
          value={orderedSections.map((item) => item.section_key).join(",")}
        />

        <div className="homepageSectionList">
          {orderedSections.map((section, index) => (
            <div className="homepageSectionRow" key={section.section_key}>
              <div className="homepageSectionOrder">{index + 1}</div>

              <label className="homepageSectionToggle">
                <input
                  type="checkbox"
                  name={`section_${section.section_key}_enabled`}
                  checked={enabled[section.section_key]}
                  onChange={(event) =>
                    setEnabled((current) => ({
                      ...current,
                      [section.section_key]: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>{homepageSectionLabels[section.section_key]}</strong>
                  <small>{sectionDescriptions[section.section_key]}</small>
                </span>
              </label>

              <div className="homepageSectionMove">
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  aria-label={`Поднять ${homepageSectionLabels[section.section_key]}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === orderedSections.length - 1}
                  aria-label={`Опустить ${homepageSectionLabels[section.section_key]}`}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="clubAdminSection homepageControlSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">НОВОСТИ</p>
          <h2>Закреплённая новость</h2>
          <p>
            Выбранная публикация будет выделена над обычной лентой новостей на
            главной странице.
          </p>
        </div>

        <label className="checkRow">
          <input
            type="checkbox"
            name="show_pinned_news"
            checked={showPinned}
            onChange={(event) => setShowPinned(event.target.checked)}
          />
          <span>
            <strong>Показывать закреплённую новость</strong>
          </span>
        </label>

        <div className="fieldGroup">
          <label htmlFor="pinned_news_id">Новость</label>
          <select
            id="pinned_news_id"
            name="pinned_news_id"
            defaultValue={String(initial.pinned_news_id ?? "")}
          >
            <option value="">Не выбрана</option>
            {publishedNews.map((article) => (
              <option key={article.id} value={String(article.id)}>
                {article.title}
              </option>
            ))}
          </select>
          <small className="fieldHint">
            В списке отображаются только уже опубликованные материалы.
          </small>
        </div>
      </section>

      <section className="clubAdminSection homepageControlSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">БАННЕР</p>
          <h2>Специальный информационный блок</h2>
          <p>
            Для важных объявлений: набор в академию, домашний матч, мероприятие,
            обращение клуба или другая заметная ссылка.
          </p>
        </div>

        <label className="checkRow">
          <input
            type="checkbox"
            name="banner_enabled"
            checked={bannerEnabled}
            onChange={(event) => setBannerEnabled(event.target.checked)}
          />
          <span>
            <strong>Показывать специальный баннер</strong>
          </span>
        </label>

        <div
          className={`homepageBannerPreview ${bannerImage ? "withImage" : ""}`}
          style={
            bannerImage
              ? {
                  backgroundImage: `linear-gradient(rgba(4,18,40,${overlayAlpha}),rgba(4,18,40,${overlayAlpha})),url("${bannerImage}")`,
                  backgroundPosition: bannerPosition,
                }
              : undefined
          }
        >
          <p>{bannerEyebrow || "FC EDINEȚ"}</p>
          <h3>{bannerTitle || "Вместе с клубом"}</h3>
          {bannerText && <span>{bannerText}</span>}
          <b>{bannerButtonText || "Подробнее"} →</b>
        </div>

        <div className="homepageHeroAdminGrid">
          <div>
            <div className="fieldGroup">
              <label htmlFor="banner_eyebrow">Верхняя подпись</label>
              <input
                id="banner_eyebrow"
                name="banner_eyebrow"
                value={bannerEyebrow}
                onChange={(event) => setBannerEyebrow(event.target.value)}
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="banner_title">Заголовок</label>
              <input
                id="banner_title"
                name="banner_title"
                value={bannerTitle}
                onChange={(event) => setBannerTitle(event.target.value)}
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="banner_text">Описание</label>
              <textarea
                id="banner_text"
                name="banner_text"
                rows={4}
                value={bannerText}
                onChange={(event) => setBannerText(event.target.value)}
              />
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="banner_button_text">Текст кнопки</label>
                <input
                  id="banner_button_text"
                  name="banner_button_text"
                  value={bannerButtonText}
                  onChange={(event) => setBannerButtonText(event.target.value)}
                />
              </div>
              <div className="fieldGroup">
                <label htmlFor="banner_button_href">Ссылка</label>
                <input
                  id="banner_button_href"
                  name="banner_button_href"
                  defaultValue={initial.banner_button_href}
                  placeholder="/club"
                />
              </div>
            </div>
            <fieldset className="i18nFieldset">
              <legend>Română / RO</legend>
              <div className="fieldGroup"><label htmlFor="banner_eyebrow_ro">Text superior</label><input id="banner_eyebrow_ro" name="banner_eyebrow_ro" defaultValue={initial.banner_eyebrow_ro ?? ""} /></div>
              <div className="fieldGroup"><label htmlFor="banner_title_ro">Titlu</label><input id="banner_title_ro" name="banner_title_ro" defaultValue={initial.banner_title_ro ?? ""} /></div>
              <div className="fieldGroup"><label htmlFor="banner_text_ro">Descriere</label><textarea id="banner_text_ro" name="banner_text_ro" rows={3} defaultValue={initial.banner_text_ro ?? ""} /></div>
              <div className="fieldGroup"><label htmlFor="banner_button_text_ro">Text buton</label><input id="banner_button_text_ro" name="banner_button_text_ro" defaultValue={initial.banner_button_text_ro ?? ""} /></div>
            </fieldset>
          </div>

          <div>
            <div className="fieldGroup">
              <label htmlFor="banner_image">Фоновое изображение</label>
              <input
                id="banner_image"
                name="banner_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (objectUrl) URL.revokeObjectURL(objectUrl);
                  const url = URL.createObjectURL(file);
                  setObjectUrl(url);
                  setBannerImage(url);
                }}
              />
              <small className="fieldHint">JPG, PNG или WEBP, максимум 8 МБ.</small>
            </div>

            <div className="fieldGroup homepageOverlayControl">
              <label htmlFor="banner_overlay_opacity">
                Затемнение: <strong>{bannerOverlay}%</strong>
              </label>
              <input
                id="banner_overlay_opacity"
                name="banner_overlay_opacity"
                type="range"
                min={0}
                max={95}
                step={1}
                value={bannerOverlay}
                onChange={(event) => setBannerOverlay(Number(event.target.value))}
              />
            </div>

            <div className="fieldGroup">
              <label htmlFor="banner_background_position">Положение фото</label>
              <select
                id="banner_background_position"
                name="banner_background_position"
                value={bannerPosition}
                onChange={(event) =>
                  setBannerPosition(
                    event.target.value as HomepageSettings["banner_background_position"]
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

            {initial.banner_image_url && (
              <label className="checkRow compact">
                <input type="checkbox" name="clear_banner_image" />
                <span>Удалить текущее фоновое изображение</span>
              </label>
            )}
          </div>
        </div>
      </section>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button className="primaryButton homepageHeroSave" type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить структуру главной"}
      </button>
    </form>
  );
}
