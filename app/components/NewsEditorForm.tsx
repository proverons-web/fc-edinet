"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  saveNews,
  type NewsFormState,
} from "@/app/admin/news/actions";
import type { NewsArticle, NewsCategory, UserRole } from "@/lib/types";

const initialState: NewsFormState = {};

export default function NewsEditorForm({
  article,
  categories,
  role,
}: {
  article?: NewsArticle | null;
  categories: NewsCategory[];
  role: UserRole;
}) {
  const [state, action, pending] = useActionState(saveNews, initialState);
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article?.slug));
  const [preview, setPreview] = useState(article?.cover_image_url ?? "");
  const objectUrlRef = useRef<string | null>(null);

  const editor = role === "editor" || role === "admin";
  const isAuthorLocked =
    role === "author" && Boolean(article) && article?.status !== "draft";

  const statusLabel = useMemo(() => {
    if (!article) return "Новая публикация";
    if (article.status === "draft") return "Черновик";
    if (article.status === "review") return "На проверке";
    return "Опубликовано";
  }, [article]);

  function handleTitle(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleFile(file?: File) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      setPreview(article?.cover_image_url ?? "");
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
  }

  if (isAuthorLocked) {
    return (
      <div className="editorLocked">
        <p className="eyebrow blue">{statusLabel.toUpperCase()}</p>
        <h2>Материал передан редактору</h2>
        <p>
          Пока новость имеет статус «На проверке» или «Опубликовано»,
          автор не может менять её. Если редактор вернёт материал в
          черновики, редактирование снова станет доступно.
        </p>

        {article?.editor_note && (
          <div className="editorNoteBox">
            <strong>Комментарий редактора</strong>
            <p>{article.editor_note}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="newsEditorForm">
      {article && (
        <input type="hidden" name="article_id" value={String(article.id)} />
      )}
      <input
        type="hidden"
        name="existing_cover_url"
        value={article?.cover_image_url ?? ""}
      />

      <div className="editorTopline">
        <div>
          <span className={`statusPill status-${article?.status ?? "new"}`}>
            {statusLabel}
          </span>
          {article?.author_name && (
            <small>Автор: {article.author_name}</small>
          )}
        </div>
        {article?.updated_at && (
          <small>
            Обновлено: {new Date(article.updated_at).toLocaleString("ru-RU")}
          </small>
        )}
      </div>

      <div className="editorGrid">
        <section className="editorMain">
          <div className="fieldGroup">
            <label htmlFor="title">Заголовок</label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(event) => handleTitle(event.target.value)}
              maxLength={180}
              placeholder="Например: FC Edineț одержал победу..."
              required
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="slug">Slug / адрес новости</label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="fc-edinet-pobeda-v-domashnem-matche"
              required
            />
            <small className="fieldHint">
              Страница будет доступна по адресу /news/{slug || "slug"}
            </small>
          </div>

          <div className="fieldGroup">
            <label htmlFor="excerpt">Краткое описание</label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={3}
              maxLength={420}
              defaultValue={article?.excerpt ?? ""}
              placeholder="Короткий анонс для карточки новости."
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="content">Полный текст</label>
            <textarea
              id="content"
              name="content"
              rows={18}
              defaultValue={article?.content ?? ""}
              placeholder={"Первый абзац.\n\nВторой абзац.\n\nТретий абзац."}
              required
            />
            <small className="fieldHint">
              Оставляй пустую строку между абзацами.
            </small>
          </div>

          {article?.editor_note && !editor && (
            <div className="editorNoteBox">
              <strong>Комментарий редактора</strong>
              <p>{article.editor_note}</p>
            </div>
          )}

          {editor && (
            <div className="fieldGroup">
              <label htmlFor="editor_note">Комментарий редактора</label>
              <textarea
                id="editor_note"
                name="editor_note"
                rows={4}
                defaultValue={article?.editor_note ?? ""}
                placeholder="Например: уточнить фамилию игрока или добавить фото."
              />
            </div>
          )}
        </section>

        <aside className="editorSidebar">
          <div className="editorSideCard">
            <h3>Параметры</h3>

            <div className="fieldGroup">
              <label htmlFor="category_id">Категория</label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={
                  article?.category_id
                    ? String(article.category_id)
                    : ""
                }
                required
              >
                <option value="" disabled>
                  Выбери категорию
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {editor && (
              <label className="checkRow">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={article?.is_featured ?? false}
                />
                <span>
                  <strong>Главная новость</strong>
                  <small>
                    Получит приоритет на главной странице.
                  </small>
                </span>
              </label>
            )}
          </div>

          <div className="editorSideCard">
            <h3>Обложка</h3>

            <div className="coverPreview">
              {preview ? (
                <img src={preview} alt="" />
              ) : (
                <span>ОБЛОЖКА НОВОСТИ</span>
              )}
            </div>

            <div className="fieldGroup">
              <label htmlFor="cover_file">Новое изображение</label>
              <input
                id="cover_file"
                name="cover_file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleFile(event.target.files?.[0])
                }
              />
              <small className="fieldHint">
                JPG, PNG или WEBP. До 8 МБ.
              </small>
            </div>

            {article?.cover_image_url && (
              <label className="checkRow compact">
                <input type="checkbox" name="clear_cover" />
                <span>Удалить обложку из новости</span>
              </label>
            )}
          </div>

          <div className="editorSideCard editorialActions">
            <h3>Действия</h3>

            {state.error && (
              <div className="formError">{state.error}</div>
            )}

            <button
              className="editorButton secondary"
              name="intent"
              value="save"
              type="submit"
              disabled={pending}
            >
              {pending ? "Сохраняем..." : "Сохранить"}
            </button>

            {(role === "author" || editor) && (
              <button
                className="editorButton review"
                name="intent"
                value="submit_review"
                type="submit"
                disabled={pending}
              >
                Отправить на проверку
              </button>
            )}

            {editor && (
              <>
                <button
                  className="editorButton publish"
                  name="intent"
                  value="publish"
                  type="submit"
                  disabled={pending}
                >
                  Опубликовать
                </button>

                {article && article.status !== "draft" && (
                  <button
                    className="editorButton return"
                    name="intent"
                    value="return_draft"
                    type="submit"
                    disabled={pending}
                  >
                    Вернуть в черновики
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",
    и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
    с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
    щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
