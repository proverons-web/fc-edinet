"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveTeam,
  type TeamFormState,
} from "@/app/admin/matches/actions";
import TeamLogoEditor from "@/app/components/TeamLogoEditor";
import type { ClubTeam } from "@/lib/types";

const initialState: TeamFormState = {};

export default function TeamEditorForm({
  team,
}: {
  team: ClubTeam;
}) {
  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(team.slug));

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(team.logo_url ?? "");
  const [previewObjectUrl, setPreviewObjectUrl] =
    useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (previous: TeamFormState, formData: FormData) => {
      if (logoFile) {
        formData.set("logo_file", logoFile, logoFile.name);
      }
      return saveTeam(previous, formData);
    },
    initialState
  );

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  function acceptLogo(file: File, url: string) {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setLogoFile(file);
    setPreview(url);
    setPreviewObjectUrl(url);
    setSourceFile(null);
  }

  return (
    <>
      <form action={action} className="teamEditorForm">
        <input type="hidden" name="team_id" value={String(team.id)} />

        <div className="matchEditorGrid">
          <section className="matchEditorMain">
            <div className="formSectionTitle">
              <p className="eyebrow blue">КОМАНДА</p>
              <h2>Основная информация</h2>
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="name">Название</label>
                <input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    if (!slugTouched) setSlug(slugify(value));
                  }}
                  required
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="short_name">Короткое название</label>
                <input
                  id="short_name"
                  name="short_name"
                  defaultValue={team.short_name ?? ""}
                  placeholder="FCE"
                />
              </div>
            </div>

            <div className="twoFields">
              <div className="fieldGroup">
                <label htmlFor="city">Город</label>
                <input
                  id="city"
                  name="city"
                  defaultValue={team.city ?? ""}
                  placeholder="Edineț"
                />
              </div>

              <div className="fieldGroup">
                <label htmlFor="home_stadium">Домашний стадион</label>
                <input
                  id="home_stadium"
                  name="home_stadium"
                  defaultValue={team.home_stadium ?? ""}
                  placeholder="Stadionul Edineț"
                />
                <small className="fieldHint">
                  Будет автоматически подставляться, когда команда играет дома.
                </small>
              </div>
            </div>

            <div className="fieldGroup">
              <label htmlFor="slug">Slug</label>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                required
              />
            </div>

            <div className="twoFields">
              <label className="checkRow">
                <input
                  type="checkbox"
                  name="is_club"
                  defaultChecked={team.is_club}
                />
                <span>
                  <strong>Наш клуб</strong>
                  <small>Использовать только для FC Edineț.</small>
                </span>
              </label>

              <label className="checkRow">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={team.is_active}
                />
                <span>
                  <strong>Активная команда</strong>
                  <small>Неактивные команды не отображаются публично.</small>
                </span>
              </label>
            </div>
          </section>

          <aside className="matchEditorSidebar">
            <div className="playerPhotoAdminCard">
              <h3>Логотип</h3>

              <div className="teamLogoPreview square large">
                {preview ? <img src={preview} alt="" /> : <span>ЛОГОТИП</span>}
              </div>

              <div className="fieldGroup">
                <label htmlFor="logo_source">Новый логотип</label>
                <input
                  id="logo_source"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setSourceFile(file);
                    event.currentTarget.value = "";
                  }}
                />
                <small className="fieldHint">
                  Можно уменьшить, увеличить и сместить герб перед загрузкой.
                </small>
              </div>

              {logoFile && (
                <div className="cropReadyBadge">
                  ✓ Новый логотип подготовлен
                </div>
              )}

              {team.logo_url && (
                <label className="checkRow compact">
                  <input type="checkbox" name="clear_logo" />
                  <span>Удалить логотип команды</span>
                </label>
              )}
            </div>

            <div className="playerPhotoAdminCard">
              {state.error && <div className="formError">{state.error}</div>}

              <button
                className="playerSaveButton"
                type="submit"
                disabled={pending}
              >
                {pending ? "Сохраняем..." : "Сохранить команду"}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {sourceFile && (
        <TeamLogoEditor
          sourceFile={sourceFile}
          onCancel={() => setSourceFile(null)}
          onConfirm={acceptLogo}
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
