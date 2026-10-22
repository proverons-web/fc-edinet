import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import { ClubStadiumAdminForm } from "@/app/components/ClubAdminSectionForms";
import { requireEditor } from "@/lib/editorial";
import type { ClubProfile } from "@/lib/types";
export const dynamic="force-dynamic"; export const metadata={title:"Стадион — Админ"};
export default async function Page(){const {supabase}=await requireEditor();const {data}=await supabase.from("club_profile").select("*").eq("id",1).maybeSingle();return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">КЛУБ • СТАДИОН</p><h1>Стадион</h1></div><div className="adminHeroActions"><Link href="/admin/club" className="adminBack">← К разделам клуба</Link><Link href="/club/stadium" className="rowAction muted">Открыть на сайте ↗</Link></div></div></section><section className="section adminSurface"><div className="container"><AdminClubNav active="stadium"/><ClubStadiumAdminForm profile={data as ClubProfile|null}/></div></section></main>}
