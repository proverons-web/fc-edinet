import Link from "next/link";
import { requireEditor } from "@/lib/editorial";
import { getDraftClubPageLayout } from "@/lib/content-page-builder";
import ClubPageBuilder from "@/app/components/ClubPageBuilder";
import { saveClubPageLayout } from "./actions";

export const metadata = { title: "Page Builder 3.0 — Клуб — Admin" };
export const dynamic = "force-dynamic";

export default async function ClubPageBuilderPage() {
  const { supabase } = await requireEditor();
  const layout = await getDraftClubPageLayout(supabase);
  return <main className="adminPage pageBuilder2Page">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER 3.0</p><h1>Конструктор страницы «Клуб»</h1><p>Два готовых дизайна, реальное Live Preview, свободное позиционирование и фокус фото отдельно для Desktop / Tablet / Mobile.</p></div>
      <div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← Контент клуба</Link><Link href="/club" target="_blank" className="rowAction muted">Открыть /club ↗</Link></div>
    </div></section>
    <section className="section adminSurface pageBuilder2Surface"><div className="pageBuilder2Container"><ClubPageBuilder initial={layout} action={saveClubPageLayout}/></div></section>
  </main>;
}
