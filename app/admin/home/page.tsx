import Link from "next/link";
import HomepageHeroForm from "@/app/components/HomepageHeroForm";
import { requireEditor } from "@/lib/editorial";
import type { HomepageHero } from "@/lib/types";

export const metadata = {
  title: "Главная страница — Админ",
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { supabase } = await requireEditor();

  const { data } = await supabase
    .from("homepage_hero")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <main className="adminPage">
      <section className="adminHero compactAdminHero">
        <div className="container adminHeroInner">
          <div>
            <p className="eyebrow">FC EDINEȚ • ГЛАВНАЯ</p>
            <h1>Главная страница</h1>
            <p>
              Фоновое фото, заголовок, описание и кнопки первого экрана.
            </p>
          </div>

          <div className="adminHeroActions">
            <Link href="/admin" className="adminBack">
              ← Админка
            </Link>
            <Link href="/" className="rowAction muted">
              Открыть главную ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="section adminSurface">
        <div className="container">
          <HomepageHeroForm settings={data as HomepageHero | null} />
        </div>
      </section>
    </main>
  );
}
