import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import { getDraftClubPageLayout } from "@/lib/content-page-builder";
import ClubPageBuilder from "@/app/components/ClubPageBuilder";
import { saveClubPageLayout } from "./actions";

export const metadata = { title: "Конструктор страницы клуба — Admin" };
export const dynamic = "force-dynamic";

export default async function ClubPageBuilderPage() {
  const { supabase } = await requireEditor();
  const [layout, profileResult] = await Promise.all([
    getDraftClubPageLayout(supabase),
    supabase.from("club_profile").select("stadium_image_url").eq("id", 1).maybeSingle(),
  ]);
  const stadiumImageUrl = profileResult.data?.stadium_image_url ?? null;
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER</p><h1>Конструктор страницы «Клуб»</h1><p>Порядок секций, варианты подачи, ширина, фон, отступы и кадрирование фото стадиона.</p></div>
      <div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← Клуб</Link><Link href="/club" className="rowAction muted">Открыть страницу ↗</Link></div>
    </div></section>
    <section className="section adminSurface"><div className="container"><ClubPageBuilder initial={layout} action={saveClubPageLayout} stadiumImageUrl={stadiumImageUrl}/></div></section>
  </main>;
}
