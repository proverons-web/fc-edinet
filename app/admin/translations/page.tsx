import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import {
  sourceHash,
  translationConfigured,
  translationModel,
} from "@/lib/auto-translation";
import { translateExistingContent } from "./actions";

export const metadata = { title: "Автоперевод RU → RO — Админ" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminTranslationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireEditor();
  const params = await searchParams;

  const [
    newsResult,
    playersResult,
    leadersResult,
    achievementsResult,
    partnersResult,
    clubResult,
    heroResult,
    settingsResult,
  ] = await Promise.all([
    supabase.from("news").select("id,title,excerpt,content,ro_translation_locked,ro_translation_source_hash"),
    supabase.from("players").select("id,first_name,last_name,bio,ro_translation_locked,ro_translation_source_hash"),
    supabase.from("club_leadership").select("id,name,role,bio,ro_translation_locked,ro_translation_source_hash"),
    supabase.from("club_achievements").select("id,title,description,ro_translation_locked,ro_translation_source_hash"),
    supabase.from("partners").select("id,name,description,ro_translation_locked,ro_translation_source_hash"),
    supabase.from("club_profile").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_hero").select("*").eq("id", 1).maybeSingle(),
    supabase.from("homepage_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const groups = [
    {
      label: "Новости",
      total: newsResult.data?.length ?? 0,
      pending: countPending(newsResult.data ?? [], (row: any) => ({ title: row.title, excerpt: row.excerpt, content: row.content })),
    },
    {
      label: "Игроки",
      total: playersResult.data?.length ?? 0,
      pending: countPending(playersResult.data ?? [], (row: any) => ({ bio: row.bio })),
    },
    {
      label: "Руководство",
      total: leadersResult.data?.length ?? 0,
      pending: countPending(leadersResult.data ?? [], (row: any) => ({ role: row.role, bio: row.bio })),
    },
    {
      label: "Достижения",
      total: achievementsResult.data?.length ?? 0,
      pending: countPending(achievementsResult.data ?? [], (row: any) => ({ title: row.title, description: row.description })),
    },
    {
      label: "Партнёры",
      total: partnersResult.data?.length ?? 0,
      pending: countPending(partnersResult.data ?? [], (row: any) => ({ description: row.description })),
    },
  ];

  const singletonPending = [
    pendingSingleton(clubResult.data, clubSource),
    pendingSingleton(heroResult.data, heroSource),
    pendingSingleton(settingsResult.data, settingsSource),
  ].filter(Boolean).length;

  const pendingTotal = groups.reduce((sum, group) => sum + group.pending, 0) + singletonPending;
  const configured = translationConfigured();
  const processed = numberParam(params.processed);
  const failed = numberParam(params.failed);
  const more = numberParam(params.more);
  const missingKey = params.error === "missing_key";

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • RU → RO</p>
            <h1>Автоматический перевод</h1>
            <p>Русский — основной язык редактирования. Румынская версия создаётся автоматически при сохранении.</p>
          </div>
          <Link href="/admin" className="adminBack">← Админка</Link>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container translationAdminGrid">
          <section className="translationStatusCard">
            <p className="eyebrow blue">СЕРВИС</p>
            <h2>{configured ? "Автоперевод готов" : "Нужен API-ключ"}</h2>
            <div className={`translationProviderStatus ${configured ? "ready" : "missing"}`}>
              <strong>{configured ? "✓ OPENAI_API_KEY настроен" : "! OPENAI_API_KEY не настроен"}</strong>
              <span>Модель: {translationModel()}</span>
            </div>
            <p>
              Ключ хранится только на сервере. Если перевод временно не сработает,
              русская запись всё равно сохраняется, а публичная RO-версия использует
              существующий перевод или русский fallback.
            </p>
          </section>

          <section className="translationStatusCard">
            <p className="eyebrow blue">ОЧЕРЕДЬ</p>
            <h2>{pendingTotal} материалов требуют перевода</h2>
            <div className="translationStats">
              {groups.map((group) => (
                <div key={group.label}>
                  <span>{group.label}</span>
                  <strong>{group.pending}</strong>
                  <small>из {group.total}</small>
                </div>
              ))}
              <div><span>Клуб / главная</span><strong>{singletonPending}</strong><small>из 3</small></div>
            </div>
          </section>

          {(processed > 0 || failed > 0 || more > 0) && (
            <div className="formSuccess translationWideNotice">
              Обработано: {processed}. Ошибок: {failed}.{more > 0 ? ` В очереди этого запуска осталось ещё ${more}; нажми кнопку ещё раз.` : ""}
            </div>
          )}
          {missingKey && (
            <div className="formError translationWideNotice">
              Добавь OPENAI_API_KEY в .env.local и Vercel Environment Variables. Без ключа сайт продолжит работать, но автоматический перевод не запускается.
            </div>
          )}

          <section className="translationStatusCard translationWideCard">
            <p className="eyebrow blue">СТАРЫЕ МАТЕРИАЛЫ</p>
            <h2>Перевести существующий контент</h2>
            <p>
              За один запуск обрабатывается до 12 материалов, чтобы не упираться в лимит времени Vercel.
              Заблокированные вручную RO-переводы пропускаются.
            </p>
            <form action={translateExistingContent} className="translationBulkForm">
              <label className="checkRow compact">
                <input type="checkbox" name="force" />
                <span><strong>Перевести заново</strong><small>Перегенерировать даже актуальные автоматические переводы. Ручные зафиксированные RO всё равно не трогаются.</small></span>
              </label>
              <button className="primaryButton" type="submit" disabled={!configured}>
                Перевести следующую партию
              </button>
            </form>
          </section>

          <section className="translationStatusCard translationWideCard">
            <p className="eyebrow blue">КАК ЭТО РАБОТАЕТ</p>
            <h2>Обычная работа редактора не меняется</h2>
            <ol className="translationSteps">
              <li>Пишешь новость, биографию, описание клуба или другой текст на русском.</li>
              <li>Нажимаешь «Сохранить» или «Опубликовать».</li>
              <li>Сервер создаёт RO-перевод и сохраняет его в Supabase.</li>
              <li>Посетитель переключает RU → RO и сразу видит сохранённую румынскую версию.</li>
              <li>Если вручную исправил RO и не хочешь его перезаписывать — включи «Зафиксировать ручной RO».</li>
            </ol>
          </section>
        </div>
      </section>
    </main>
  );
}

function countPending(rows: any[], sourceFor: (row: any) => Record<string, string | null | undefined>) {
  return rows.filter((row) => {
    if (row.ro_translation_locked) return false;
    const source = sourceFor(row);
    if (!Object.values(source).some((value) => String(value ?? "").trim())) return false;
    return row.ro_translation_source_hash !== sourceHash(source);
  }).length;
}

function pendingSingleton(row: any, sourceFor: (row: any) => Record<string, string | null | undefined>) {
  if (!row || row.ro_translation_locked) return false;
  const source = sourceFor(row);
  if (!Object.values(source).some((value) => String(value ?? "").trim())) return false;
  return row.ro_translation_source_hash !== sourceHash(source);
}

function clubSource(row: any) {
  return {
    club_name: row.club_name,
    city: row.city,
    club_colors: row.club_colors,
    motto: row.motto,
    about_text: row.about_text,
    history_text: row.history_text,
    address: row.address,
    stadium_name: row.stadium_name,
    stadium_address: row.stadium_address,
    stadium_description: row.stadium_description,
  };
}

function heroSource(row: any) {
  return {
    eyebrow: row.eyebrow,
    title_main: row.title_main,
    title_accent: row.title_accent,
    description: row.description,
    primary_button_text: row.primary_button_text,
    secondary_button_text: row.secondary_button_text,
  };
}

function settingsSource(row: any) {
  return {
    banner_eyebrow: row.banner_eyebrow,
    banner_title: row.banner_title,
    banner_text: row.banner_text,
    banner_button_text: row.banner_button_text,
  };
}

function numberParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = Number(raw ?? 0);
  return Number.isFinite(number) ? number : 0;
}
