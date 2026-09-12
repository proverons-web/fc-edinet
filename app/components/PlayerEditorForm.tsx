"use client";

import { useActionState, useEffect, useState } from "react";
import {
  savePlayer,
  type PlayerFormState,
} from "@/app/admin/players/actions";
import PlayerPhotoCropper from "@/app/components/PlayerPhotoCropper";
import type { Player } from "@/lib/types";

const initialState: PlayerFormState = {};

export default function PlayerEditorForm({
  player,
}: {
  player?: Player | null;
}) {
  const [firstName, setFirstName] = useState(player?.first_name ?? "");
  const [lastName, setLastName] = useState(player?.last_name ?? "");
  const [slug, setSlug] = useState(player?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(player?.slug));

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(player?.photo_url ?? "");
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(
    null
  );

  const [state, action, pending] = useActionState(
    async (previous: PlayerFormState, formData: FormData) => {
      if (croppedFile) {
        formData.set("photo_file", croppedFile, croppedFile.name);
      }
      return savePlayer(previous, formData);
    },
    initialState
  );

  useEffect(() => {
    return () => {
      if (croppedPreviewUrl) {
        URL.revokeObjectURL(croppedPreviewUrl);
      }
    };
  }, [croppedPreviewUrl]);

  function syncName(nextFirst: string, nextLast: string) {
    if (!slugTouched) {
      setSlug(slugify(`${nextFirst} ${nextLast}`));
    }
  }

  function choosePhoto(file?: File) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return;
    }

    setSourceFile(file);
  }

  function acceptCrop(file: File, previewUrl: string) {
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
    }

    setCroppedFile(file);
    setCroppedPreviewUrl(previewUrl);
    setPreview(previewUrl);
    setSourceFile(null);
  }

  return (
    <>
      <form action={action} className="playerEditorForm">
        {player && (
          <input type="hidden" name="player_id" value={String(player.id)} />
        )}

        <div className="playerEditorGrid">
          <section className="playerEditorMain">
            <div className="formSectionTitle">
              <p className="eyebrow blue">ОСНОВНОЕ</p>
              <h2>Данные игрока</h2>
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="first_name">Имя</label>
                <input
                  id="first_name"
                  name="first_name"
                  value={firstName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFirstName(value);
                    syncName(value, lastName);
                  }}
                  placeholder="Ion"
                  required
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="last_name">Фамилия</label>
                <input
                  id="last_name"
                  name="last_name"
                  value={lastName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLastName(value);
                    syncName(firstName, value);
                  }}
                  placeholder="Popescu"
                  required
                />
              </div>
            </div>

            <div className="fieldGroup">
              <label htmlFor="slug">Slug / адрес страницы</label>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="ion-popescu"
                required
              />
              <small className="fieldHint">
                Страница игрока: /team/{slug || "ion-popescu"}
              </small>
            </div>

            <div className="threeFields">
              <div className="fieldGroup">
                <label htmlFor="shirt_number">Номер</label>
                <input
                  id="shirt_number"
                  name="shirt_number"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={player?.shirt_number ?? ""}
                  placeholder="10"
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="position">Позиция</label>
                <select
                  id="position"
                  name="position"
                  defaultValue={player?.position ?? ""}
                  required
                >
                  <option value="" disabled>Выбери</option>
                  <option value="goalkeeper">Вратарь</option>
                  <option value="defender">Защитник</option>
                  <option value="midfielder">Полузащитник</option>
                  <option value="forward">Нападающий</option>
                </select>
              </div>

              <div className="fieldGroup">
                <label htmlFor="display_order">Порядок</label>
                <input
                  id="display_order"
                  name="display_order"
                  type="number"
                  min={0}
                  max={10000}
                  defaultValue={player?.display_order ?? 100}
                />
              </div>
            </div>

            <div className="formSectionDivider" />

            <div className="formSectionTitle">
              <p className="eyebrow blue">ПРОФИЛЬ</p>
              <h2>Личная информация</h2>
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="birth_date">Дата рождения</label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  defaultValue={player?.birth_date ?? ""}
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="nationality">Гражданство</label>
                <input
                  id="nationality"
                  name="nationality"
                  defaultValue={player?.nationality ?? ""}
                  placeholder="Moldova"
                />
              </div>
            </div>

            <div className="threeFields">
              <div className="fieldGroup">
                <label htmlFor="height_cm">Рост, см</label>
                <input
                  id="height_cm"
                  name="height_cm"
                  type="number"
                  min={120}
                  max={230}
                  defaultValue={player?.height_cm ?? ""}
                  placeholder="182"
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="preferred_foot">Рабочая нога</label>
                <select
                  id="preferred_foot"
                  name="preferred_foot"
                  defaultValue={player?.preferred_foot ?? ""}
                >
                  <option value="">Не указано</option>
                  <option value="right">Правая</option>
                  <option value="left">Левая</option>
                  <option value="both">Обе</option>
                </select>
              </div>

              <div className="fieldGroup">
                <label htmlFor="hometown">Родной город</label>
                <input
                  id="hometown"
                  name="hometown"
                  defaultValue={player?.hometown ?? ""}
                  placeholder="Edineț"
                />
              </div>
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="previous_club">Предыдущий клуб</label>
                <input
                  id="previous_club"
                  name="previous_club"
                  defaultValue={player?.previous_club ?? ""}
                  placeholder="Название клуба"
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="joined_at">В FC Edineț с</label>
                <input
                  id="joined_at"
                  name="joined_at"
                  type="date"
                  defaultValue={player?.joined_at ?? ""}
                />
              </div>
            </div>

            <div className="fieldGroup">
              <label htmlFor="bio">Биография</label>
              <textarea
                id="bio"
                name="bio"
                rows={9}
                defaultValue={player?.bio ?? ""}
                placeholder="Короткая официальная биография игрока..."
              />
            </div>

            <fieldset className="i18nFieldset">
              <legend>Română</legend>
              <div className="fieldGroup">
                <label htmlFor="bio_ro">Biografie</label>
                <textarea
                  id="bio_ro"
                  name="bio_ro"
                  rows={7}
                  defaultValue={player?.bio_ro ?? ""}
                  placeholder="Biografia oficială scurtă a jucătorului..."
                />
                <label className="checkRow compact autoTranslationLock">
                  <input
                    type="checkbox"
                    name="ro_translation_locked"
                    defaultChecked={player?.ro_translation_locked ?? false}
                  />
                  <span>
                    <strong>Зафиксировать ручной RO</strong>
                    <small>Иначе биография автоматически переводится после изменения русского текста.</small>
                  </span>
                </label>
                <small className="i18nHint">Если автоперевод недоступен, используется существующий RO или русский fallback.</small>
              </div>
            </fieldset>
          </section>

          <aside className="playerEditorSidebar">
            <div className="playerPhotoAdminCard">
              <h3>Фотография</h3>

              <div className="playerAdminPreview">
                {preview ? (
                  <img src={preview} alt="" />
                ) : (
                  <span>ФОТО ИГРОКА</span>
                )}
              </div>

              <div className="fieldGroup">
                <label htmlFor="photo_source">Выбрать исходное фото</label>
                <input
                  id="photo_source"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    choosePhoto(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <small className="fieldHint">
                  После выбора откроется кадрирование 4:5. Можно приблизить
                  фото и оставить только нужного человека.
                </small>
              </div>

              {croppedFile && (
                <div className="cropReadyBadge">
                  ✓ Кадрирование готово — при сохранении загрузится именно этот кадр.
                </div>
              )}

              {player?.photo_url && (
                <label className="checkRow compact">
                  <input type="checkbox" name="clear_photo" />
                  <span>Удалить фотографию из профиля</span>
                </label>
              )}
            </div>

            <div className="playerPhotoAdminCard">
              <h3>Статус</h3>

              <label className="checkRow">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={player?.is_active ?? true}
                />
                <span>
                  <strong>В текущем составе</strong>
                  <small>
                    Если выключить, игрок исчезнет из публичного состава,
                    но останется в базе.
                  </small>
                </span>
              </label>
            </div>

            <div className="playerPhotoAdminCard">
              {state.error && (
                <div className="formError">{state.error}</div>
              )}

              <button
                className="playerSaveButton"
                type="submit"
                disabled={pending}
              >
                {pending ? "Сохраняем..." : "Сохранить игрока"}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {sourceFile && (
        <PlayerPhotoCropper
          sourceFile={sourceFile}
          onCancel={() => setSourceFile(null)}
          onConfirm={acceptCrop}
        />
      )}
    </>
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
