"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addTeam,
  type TeamFormState,
} from "@/app/admin/matches/actions";
import TeamLogoEditor from "@/app/components/TeamLogoEditor";

const initialState: TeamFormState = {};

export default function TeamQuickAddForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [previewObjectUrl, setPreviewObjectUrl] =
    useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (previous: TeamFormState, formData: FormData) => {
      if (logoFile) {
        formData.set("logo_file", logoFile, logoFile.name);
      }
      return addTeam(previous, formData);
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
      <form action={action} className="teamQuickForm">
        <div className="twoFields">
          <div className="fieldGroup">
            <label htmlFor="team_name">Название команды</label>
            <input
              id="team_name"
              name="name"
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugTouched) setSlug(slugify(value));
              }}
              placeholder="CF Olimp"
              required
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="team_short">Короткое название</label>
            <input
              id="team_short"
              name="short_name"
              placeholder="Olimp"
            />
          </div>
        </div>

        <div className="twoFields">
          <div className="fieldGroup">
            <label htmlFor="team_city">Город</label>
            <input
              id="team_city"
              name="city"
              placeholder="Edineț"
            />
          </div>

          <div className="fieldGroup">
            <label htmlFor="team_home_stadium">Домашний стадион</label>
            <input
              id="team_home_stadium"
              name="home_stadium"
              placeholder="Stadionul Edineț"
            />
            <small className="fieldHint">
              При выборе этой команды хозяином матча стадион подставится автоматически.
            </small>
          </div>
        </div>

        <div className="fieldGroup">
          <label htmlFor="team_slug">Slug</label>
          <input
            id="team_slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            required
          />
        </div>

        <div className="teamLogoPicker">
          <div className="teamLogoPreview square">
            {preview ? <img src={preview} alt="" /> : <span>ЛОГОТИП</span>}
          </div>

          <div>
            <div className="fieldGroup">
              <label htmlFor="team_logo_source">Логотип команды</label>
              <input
                id="team_logo_source"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setSourceFile(file);
                  event.currentTarget.value = "";
                }}
              />
              <small className="fieldHint">
                После выбора откроется окно масштаба и позиционирования.
              </small>
            </div>

            {logoFile && (
              <div className="cropReadyBadge">
                ✓ Логотип подготовлен к загрузке
              </div>
            )}
          </div>
        </div>

        <label className="checkRow">
          <input type="checkbox" name="is_club" />
          <span>
            <strong>Это наш клуб</strong>
            <small>Включай только для FC Edineț.</small>
          </span>
        </label>

        {state.error && <div className="formError">{state.error}</div>}
        {state.success && <div className="formSuccess">{state.success}</div>}

        <button className="playerSaveButton" type="submit" disabled={pending}>
          {pending ? "Добавляем..." : "+ Добавить команду"}
        </button>
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
