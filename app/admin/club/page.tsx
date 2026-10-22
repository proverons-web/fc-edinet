import Link from "next/link";
import AdminClubNav from "@/app/components/AdminClubNav";
import { requireEditor } from "@/lib/editorial";
export const metadata={title:"Клуб — Админ"}; export const dynamic="force-dynamic";
const cards=[
 ["О клубе","Основные данные, контакты, главное фото.","/admin/club/about","/club/about"],
 ["История FC Edineț","Исторический текст и визуальная верстка.","/admin/club/history","/club/history"],
 ["Стадион","Фото, адрес, вместимость и описание арены.","/admin/club/stadium","/club/stadium"],
 ["Руководство","Люди клуба: фото, должности, биографии.","/admin/club/leadership","/club/leadership"],
 ["Достижения","Трофеи, результаты и важные сезоны.","/admin/club/achievements","/club/achievements"],
 ["Архивные фото","Будущий исторический фотоархив.","/admin/club/archive","/club/archive"],
 ["Зал славы","Исторические составы и знаковые люди.","/admin/club/hall-of-fame","/club/hall-of-fame"],
] as const;
export default async function AdminClubPage(){await requireEditor();return <main className="adminPage"><section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ • КЛУБ</p><h1>Клуб</h1><p>Каждый публичный раздел теперь редактируется отдельно.</p></div><div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link></div></div></section><section className="section adminSurface"><div className="container"><AdminClubNav/><div className="adminClubHubGrid">{cards.map(([title,desc,adminHref,publicHref],i)=><article className="adminClubHubCard" key={adminHref}><span>{String(i+1).padStart(2,"0")}</span><h2>{title}</h2><p>{desc}</p><div><Link href={adminHref} className="primaryButton">Редактировать</Link><Link href={publicHref} className="rowAction muted">На сайте ↗</Link></div></article>)}</div></div></section></main>}
