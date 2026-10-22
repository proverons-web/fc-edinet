import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import { ClubAboutAdminForm } from "@/app/components/ClubAdminSectionForms";
import { requireEditor } from "@/lib/editorial";
import type { ClubProfile } from "@/lib/types";
export const dynamic="force-dynamic"; export const metadata={title:"О клубе — Админ"};
export default async function Page(){const {supabase}=await requireEditor();const {data}=await supabase.from("club_profile").select("*").eq("id",1).maybeSingle();return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">КЛУБ • О КЛУБЕ</p><h1>О клубе</h1></div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/about" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section><section className="section adminSurface"><div className="container"><AdminClubNav active="about"/><ClubAboutAdminForm profile={data as ClubProfile|null}/></div></section></main>}
