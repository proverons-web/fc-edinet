import Link from "next/link";
import HomepageHeroForm from "@/app/components/HomepageHeroForm";
import HomepageLayoutForm from "@/app/components/HomepageLayoutForm";
import { requireEditor } from "@/lib/editorial";
import type {
  HomepageHero,
  HomepageSection,
  HomepageSettings,
} from "@/lib/types";

export const metadata = {
  title: "Главная страница — Админ",
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { supabase } = await requireEditor();
  const now = new Date().toISOString();

  const [heroResult, sectionsResult, settingsResult, newsResult] =
    await Promise.all([
      supabase
        .from("homepage_hero")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("homepage_sections")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase
        .from("homepage_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("news")
        .select("id,title,published_at")
        .eq("status", "published")
        .lte("published_at", now)
        .order("published_at", { ascending: false })
        .limit(100),
    ]);

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ГЛАВНАЯ</p>
            <h1>Главная страница</h1>
            <p>
              Первый экран, порядок блоков, закреплённая новость и специальный
              информационный баннер.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/admin/design" className="rowAction">
              Visual Editor
            </Link>
            <Link href="/" className="rowAction muted">
              Открыть главную ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container homepageAdminStack">
          <HomepageHeroForm
            settings={heroResult.data as HomepageHero | null}
          />

          <div className="homepageAdminDivider">
            <span>СТРУКТУРА ГЛАВНОЙ</span>
          </div>

          <HomepageLayoutForm
            sections={(sectionsResult.data ?? []) as HomepageSection[]}
            settings={settingsResult.data as HomepageSettings | null}
            publishedNews={newsResult.data ?? []}
          />
        </div>
      </section>
    </main>
  );
}
