import Link from "next/link";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import {
  createPartner,
  deletePartner,
  updatePartner,
} from "@/app/admin/partners/actions";
import { requireEditor } from "@/lib/editorial";
import type { Partner, PartnerLevel } from "@/lib/types";
import { partnerLevelLabels } from "@/lib/types";

export const metadata = { title: "Партнёры — Админ" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    saved?: string | string[];
    error?: string | string[];
  }>;
};

const levels: PartnerLevel[] = [
  "main",
  "official",
  "technical",
  "supporter",
];

const errorMessages: Record<string, string> = {
  invalid_name: "Укажи название партнёра и корректный slug.",
  invalid_url: "Ссылка на сайт партнёра указана некорректно.",
  invalid_level: "Выбрана неизвестная категория партнёра.",
  logo_required: "При создании партнёра обязательно загрузи логотип.",
  invalid_logo_type: "Логотип должен быть JPG, PNG, WEBP или SVG.",
  logo_too_large: "Максимальный размер логотипа — 5 МБ.",
  bucket_missing: "Bucket partners не найден. Проверь migration 017_partners.sql.",
  upload_failed: "Не удалось загрузить логотип в Supabase Storage.",
  duplicate_slug: "Такой slug уже используется другим партнёром.",
  create_failed: "Не удалось создать партнёра.",
  update_failed: "Не удалось сохранить изменения партнёра.",
  delete_failed: "Не удалось удалить партнёра.",
  not_found: "Партнёр не найден.",
  admin_only: "Окончательно удалять партнёров может только администратор.",
};

export default async function AdminPartnersPage({ searchParams }: PageProps) {
  const { supabase, profile } = await requireEditor();
  const params = await searchParams;

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("display_order")
    .order("name");

  const partners = (data ?? []) as Partner[];
  const saved = first(params.saved);
  const errorCode = first(params.error);

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ПАРТНЁРЫ</p>
            <h1>Партнёры и спонсоры</h1>
            <p>
              Логотипы, категории, ссылки и порядок отображения партнёров клуба.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/partners" className="rowAction muted">
              Открыть на сайте ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          {saved && (
            <div className="adminNotice successNotice">
              {saved === "created"
                ? "Партнёр добавлен."
                : saved === "deleted"
                  ? "Партнёр удалён."
                  : "Изменения сохранены."}
            </div>
          )}

          {errorCode && (
            <div className="adminNotice errorNotice">
              {errorMessages[errorCode] ?? "Произошла ошибка."}
            </div>
          )}

          <section className="partnerCreateSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">НОВЫЙ ПАРТНЁР</p>
                <h2>Добавить организацию</h2>
              </div>
            </div>

            <form action={createPartner} className="partnerCreateForm">
              <label>
                <span>Название *</span>
                <input name="name" required placeholder="Например, Joma" />
              </label>

              <label>
                <span>Slug</span>
                <input name="slug" placeholder="joma" />
              </label>

              <label>
                <span>Категория</span>
                <select name="partner_level" defaultValue="official">
                  {levels.map((level) => (
                    <option value={level} key={level}>
                      {partnerLevelLabels[level]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Порядок</span>
                <input name="display_order" type="number" min="0" defaultValue="0" />
              </label>

              <label className="partnerWideField">
                <span>Сайт</span>
                <input name="website_url" type="text" placeholder="https://example.com" />
              </label>

              <label className="partnerWideField">
                <span>Описание</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Коротко о сотрудничестве с клубом"
                />
              </label>

              <label className="partnerWideField">
                <span>Описание RO</span>
                <textarea name="description_ro" rows={3} placeholder="Создастся автоматически после сохранения" />
              </label>

              <label className="checkRow compact partnerWideField autoTranslationLock">
                <input type="checkbox" name="ro_translation_locked" />
                <span><strong>Зафиксировать ручной RO</strong><small>Если выключено, описание переводится автоматически.</small></span>
              </label>

              <label className="partnerWideField">
                <span>Логотип *</span>
                <input
                  name="logo_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  required
                />
                <small>
                  Лучше PNG/WebP/SVG с прозрачным фоном. До 5 МБ. Изображение
                  сохраняется без обрезки.
                </small>
              </label>

              <div className="partnerCheckboxes partnerWideField">
                <label>
                  <input type="checkbox" name="is_active" defaultChecked />
                  <span>Показывать на сайте</span>
                </label>
                <label>
                  <input type="checkbox" name="show_on_homepage" defaultChecked />
                  <span>Показывать на главной</span>
                </label>
              </div>

              <button type="submit" className="primaryButton partnerSaveButton">
                Добавить партнёра
              </button>
            </form>
          </section>

          <section className="partnerAdminListSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow blue">СПИСОК</p>
                <h2>Текущие партнёры</h2>
              </div>
              <span className="partnerCount">{partners.length}</span>
            </div>

            {error ? (
              <div className="adminEmpty">
                Не удалось загрузить партнёров: {error.message}. Проверь migration
                017_partners.sql.
              </div>
            ) : partners.length === 0 ? (
              <div className="adminEmpty">
                Партнёров пока нет. Добавь первого через форму выше.
              </div>
            ) : (
              <div className="partnerAdminList">
                {partners.map((partner) => (
                  <article className="partnerAdminCard" key={partner.id}>
                    <div className="partnerAdminLogo">
                      <img src={partner.logo_url} alt={partner.name} />
                    </div>

                    <form action={updatePartner} className="partnerEditForm">
                      <input type="hidden" name="partner_id" value={String(partner.id)} />

                      <label>
                        <span>Название</span>
                        <input name="name" defaultValue={partner.name} required />
                      </label>

                      <label>
                        <span>Slug</span>
                        <input name="slug" defaultValue={partner.slug} required />
                      </label>

                      <label>
                        <span>Категория</span>
                        <select name="partner_level" defaultValue={partner.partner_level}>
                          {levels.map((level) => (
                            <option value={level} key={level}>
                              {partnerLevelLabels[level]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Порядок</span>
                        <input
                          name="display_order"
                          type="number"
                          min="0"
                          defaultValue={partner.display_order}
                        />
                      </label>

                      <label className="partnerEditWide">
                        <span>Сайт</span>
                        <input
                          name="website_url"
                          type="text"
                          defaultValue={partner.website_url ?? ""}
                        />
                      </label>

                      <label className="partnerEditWide">
                        <span>Описание</span>
                        <textarea
                          name="description"
                          rows={2}
                          defaultValue={partner.description ?? ""}
                        />
                      </label>

                      <label className="partnerEditWide">
                        <span>Описание RO</span>
                        <textarea name="description_ro" rows={2} defaultValue={partner.description_ro ?? ""} />
                      </label>

                      <label className="checkRow compact partnerEditWide autoTranslationLock">
                        <input type="checkbox" name="ro_translation_locked" defaultChecked={partner.ro_translation_locked ?? false} />
                        <span><strong>Зафиксировать ручной RO</strong><small>Иначе описание обновляется автоматически после изменения RU.</small></span>
                      </label>

                      <label className="partnerEditWide">
                        <span>Заменить логотип</span>
                        <input
                          name="logo_file"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        />
                      </label>

                      <div className="partnerCheckboxes partnerEditWide">
                        <label>
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={partner.is_active}
                          />
                          <span>На сайте</span>
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="show_on_homepage"
                            defaultChecked={partner.show_on_homepage}
                          />
                          <span>На главной</span>
                        </label>
                      </div>

                      <button type="submit" className="rowAction primaryRowAction">
                        Сохранить
                      </button>
                    </form>

                    <div className="partnerAdminMeta">
                      <span className={`partnerLevelPill level-${partner.partner_level}`}>
                        {partnerLevelLabels[partner.partner_level]}
                      </span>
                      <span>{partner.is_active ? "Активен" : "Скрыт"}</span>
                      {partner.website_url && (
                        <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                          Сайт ↗
                        </a>
                      )}
                    </div>

                    {profile.role === "admin" && (
                      <form action={deletePartner} className="partnerDeleteForm">
                        <input type="hidden" name="partner_id" value={String(partner.id)} />
                        <ConfirmSubmitButton
                          className="clubDeleteButton"
                          confirmMessage={`Удалить партнёра «${partner.name}» и его логотип?`}
                        >
                          Удалить
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
