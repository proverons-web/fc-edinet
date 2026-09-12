"use client";

import { useActionState, useState } from "react";
import {
  saveClubProfile,
  type ClubFormState,
} from "@/app/admin/club/actions";
import type { ClubProfile } from "@/lib/types";

const initialState: ClubFormState = {};

export default function ClubProfileForm({
  profile,
}: {
  profile: ClubProfile | null;
}) {
  const [state, action, pending] = useActionState(
    saveClubProfile,
    initialState
  );

  const [heroPreview, setHeroPreview] = useState(
    profile?.hero_image_url ?? ""
  );
  const [stadiumPreview, setStadiumPreview] = useState(
    profile?.stadium_image_url ?? ""
  );

  return (
    <form action={action} className="clubAdminForm">
      <div className="clubAdminSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">О КЛУБЕ</p>
          <h2>Основная информация</h2>
        </div>

        <div className="twoFields">
          <div className="fieldGroup">
            <label htmlFor="club_name">Название клуба</label>
            <input
              id="club_name"
              name="club_name"
              defaultValue={profile?.club_name ?? "FC Edineț"}
              required
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="city">Город</label>
            <input
              id="city"
              name="city"
              defaultValue={profile?.city ?? "Edineț"}
              required
            />
          </div>
        </div>

        <div className="threeFields">
          <div className="fieldGroup">
            <label htmlFor="founded_year">Год основания</label>
            <input
              id="founded_year"
              name="founded_year"
              type="number"
              min={1900}
              max={2100}
              defaultValue={profile?.founded_year ?? ""}
              placeholder="Например: 19xx"
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="club_colors">Цвета клуба</label>
            <input
              id="club_colors"
              name="club_colors"
              defaultValue={profile?.club_colors ?? "Синий / белый"}
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="motto">Девиз</label>
            <input
              id="motto"
              name="motto"
              defaultValue={profile?.motto ?? "Вместе за Единец"}
            />
          </div>
        </div>

        <div className="fieldGroup">
          <label htmlFor="about_text">О клубе</label>
          <textarea
            id="about_text"
            name="about_text"
            rows={7}
            defaultValue={profile?.about_text ?? ""}
            placeholder="Короткое официальное описание клуба..."
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="history_text">История</label>
          <textarea
            id="history_text"
            name="history_text"
            rows={10}
            defaultValue={profile?.history_text ?? ""}
            placeholder="История клуба. Оставляй пустую строку между абзацами."
          />
        </div>
      </div>

      <fieldset className="i18nFieldset">
        <legend>Română / RO</legend>
        <div className="twoFields">
          <div className="fieldGroup"><label htmlFor="club_name_ro">Denumirea clubului</label><input id="club_name_ro" name="club_name_ro" defaultValue={profile?.club_name_ro ?? ""} /></div>
          <div className="fieldGroup"><label htmlFor="city_ro">Oraș</label><input id="city_ro" name="city_ro" defaultValue={profile?.city_ro ?? ""} /></div>
        </div>
        <div className="twoFields">
          <div className="fieldGroup"><label htmlFor="club_colors_ro">Culorile clubului</label><input id="club_colors_ro" name="club_colors_ro" defaultValue={profile?.club_colors_ro ?? ""} /></div>
          <div className="fieldGroup"><label htmlFor="motto_ro">Motto</label><input id="motto_ro" name="motto_ro" defaultValue={profile?.motto_ro ?? ""} /></div>
        </div>
        <div className="fieldGroup"><label htmlFor="about_text_ro">Despre club</label><textarea id="about_text_ro" name="about_text_ro" rows={6} defaultValue={profile?.about_text_ro ?? ""} /></div>
        <div className="fieldGroup"><label htmlFor="history_text_ro">Istorie</label><textarea id="history_text_ro" name="history_text_ro" rows={8} defaultValue={profile?.history_text_ro ?? ""} /></div>
        <div className="fieldGroup"><label htmlFor="address_ro">Adresa clubului</label><input id="address_ro" name="address_ro" defaultValue={profile?.address_ro ?? ""} /></div>
        <div className="threeFields">
          <div className="fieldGroup"><label htmlFor="stadium_name_ro">Denumirea stadionului</label><input id="stadium_name_ro" name="stadium_name_ro" defaultValue={profile?.stadium_name_ro ?? ""} /></div>
          <div className="fieldGroup"><label htmlFor="stadium_address_ro">Adresa stadionului</label><input id="stadium_address_ro" name="stadium_address_ro" defaultValue={profile?.stadium_address_ro ?? ""} /></div>
        </div>
        <div className="fieldGroup"><label htmlFor="stadium_description_ro">Descrierea stadionului</label><textarea id="stadium_description_ro" name="stadium_description_ro" rows={5} defaultValue={profile?.stadium_description_ro ?? ""} /></div>
        <small className="i18nHint">Незаполненные поля RO автоматически используют русскую версию.</small>
      </fieldset>

      <div className="clubAdminSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">КОНТАКТЫ</p>
          <h2>Связаться с клубом</h2>
        </div>

        <div className="threeFields">
          <div className="fieldGroup">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ""}
              placeholder="club@example.md"
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="+373 ..."
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="address">Адрес клуба</label>
            <input
              id="address"
              name="address"
              defaultValue={profile?.address ?? ""}
              placeholder="Edineț, Moldova"
            />
          </div>
        </div>
      </div>

      <div className="clubAdminSection">
        <div className="formSectionTitle">
          <p className="eyebrow blue">СТАДИОН</p>
          <h2>Домашняя арена</h2>
        </div>

        <div className="threeFields">
          <div className="fieldGroup">
            <label htmlFor="stadium_name">Название</label>
            <input
              id="stadium_name"
              name="stadium_name"
              defaultValue={profile?.stadium_name ?? "Stadionul Edineț"}
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="stadium_capacity">Вместимость</label>
            <input
              id="stadium_capacity"
              name="stadium_capacity"
              type="number"
              min={0}
              defaultValue={profile?.stadium_capacity ?? ""}
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="stadium_address">Адрес стадиона</label>
            <input
              id="stadium_address"
              name="stadium_address"
              defaultValue={profile?.stadium_address ?? ""}
            />
          </div>
        </div>

        <div className="fieldGroup">
          <label htmlFor="stadium_description">Описание стадиона</label>
          <textarea
            id="stadium_description"
            name="stadium_description"
            rows={6}
            defaultValue={profile?.stadium_description ?? ""}
          />
        </div>
      </div>

      <div className="clubImageAdminGrid">
        <div className="clubAdminSection">
          <h3>Главное фото клуба</h3>
          <div className="clubAdminImagePreview">
            {heroPreview ? <img src={heroPreview} alt="" /> : <span>ФОТО</span>}
          </div>
          <div className="fieldGroup">
            <input
              name="hero_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setHeroPreview(URL.createObjectURL(file));
              }}
            />
          </div>
          {profile?.hero_image_url && (
            <label className="checkRow compact">
              <input type="checkbox" name="clear_hero" />
              <span>Удалить главное фото</span>
            </label>
          )}
        </div>

        <div className="clubAdminSection">
          <h3>Фото стадиона</h3>
          <div className="clubAdminImagePreview">
            {stadiumPreview ? (
              <img src={stadiumPreview} alt="" />
            ) : (
              <span>СТАДИОН</span>
            )}
          </div>
          <div className="fieldGroup">
            <input
              name="stadium_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setStadiumPreview(URL.createObjectURL(file));
              }}
            />
          </div>
          {profile?.stadium_image_url && (
            <label className="checkRow compact">
              <input type="checkbox" name="clear_stadium" />
              <span>Удалить фото стадиона</span>
            </label>
          )}
        </div>
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <button className="primaryButton clubSaveButton" type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить данные клуба"}
      </button>
    </form>
  );
}
