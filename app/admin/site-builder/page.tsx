import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Unified Site Builder — Admin" };
export const dynamic = "force-dynamic";

type Props={searchParams?:Promise<Record<string,string|string[]|undefined>>};
type Item={key:string;label:string;preview:string;design:string;content:string};
const pages:Item[]=[
 {key:"home",label:"Главная",preview:"/",design:"/admin/design?page=home",content:"/admin/home"},
 {key:"club",label:"Клуб",preview:"/club",design:"/admin/page-builder/club",content:"/admin/club"},
 {key:"news",label:"Новости",preview:"/news",design:"/admin/design?page=news",content:"/admin/news"},
 {key:"team",label:"Команда",preview:"/team",design:"/admin/design?page=team",content:"/admin/players"},
 {key:"matches",label:"Матчи",preview:"/matches",design:"/admin/design?page=matches",content:"/admin/matches"},
 {key:"standings",label:"Таблица",preview:"/standings",design:"/admin/design?page=standings",content:"/admin/standings"},
 {key:"media",label:"Медиа",preview:"/media",design:"/admin/page-builder/media",content:"/admin/media"},
 {key:"partners",label:"Партнёры",preview:"/partners",design:"/admin/page-builder/partners",content:"/admin/partners"},
 {key:"academy",label:"Академия",preview:"/academy",design:"/admin/page-builder/academy",content:"/admin/page-builder/academy"},
 {key:"statistics",label:"Статистика",preview:"/statistics",design:"/admin/statistics",content:"/admin/statistics"},
];
function first(v:string|string[]|undefined){return Array.isArray(v)?v[0]:v}
export default async function UnifiedSiteBuilder({searchParams}:Props){
 await requireEditor(); const q=searchParams?await searchParams:{}; const selected=pages.find(p=>p.key===first(q.page))??pages[0]; const mode=first(q.mode)==="content"?"content":"design"; const editorUrl=mode==="design"?selected.design:selected.content;
 return <main className="adminPage unifiedSiteBuilder">
  <section className="adminHero compactAdminHero"><div className="container adminHeroInner"><div><p className="eyebrow">FC EDINEȚ • UNIFIED SITE BUILDER</p><h1>Редактор всего сайта</h1><p>Visual Editor и Page Builder объединены в одном рабочем месте. Выбери страницу, редактируй дизайн или контент и сразу сверяйся с реальной страницей справа.</p></div><div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link><a className="rowAction muted" href={selected.preview} target="_blank">Открыть страницу ↗</a></div></div></section>
  <section className="unifiedBuilderSurface"><aside className="unifiedBuilderSidebar"><strong>СТРАНИЦЫ</strong>{pages.map(p=><Link key={p.key} className={p.key===selected.key?"active":""} href={`/admin/site-builder?page=${p.key}&mode=${mode}`}>{p.label}</Link>)}<hr/><strong>ГЛОБАЛЬНО</strong><Link href="/admin/design?page=global_header">Header</Link><Link href="/admin/design?page=global_footer">Footer</Link><Link href="/admin/design?page=global_design_system">Design System</Link></aside>
   <div className="unifiedBuilderMain"><div className="unifiedBuilderTop"><div><b>{selected.label}</b><span>{selected.preview}</span></div><nav><Link className={mode==="design"?"active":""} href={`/admin/site-builder?page=${selected.key}&mode=design`}>Дизайн</Link><Link className={mode==="content"?"active":""} href={`/admin/site-builder?page=${selected.key}&mode=content`}>Контент</Link></nav></div>
    <div className="unifiedBuilderSplit"><section><header><span>РЕДАКТОР</span><a href={editorUrl} target="_blank">На весь экран ↗</a></header><iframe title={`Редактор ${selected.label}`} src={editorUrl}/></section><section><header><span>LIVE PAGE</span><a href={selected.preview} target="_blank">Открыть ↗</a></header><iframe title={`Preview ${selected.label}`} src={selected.preview}/></section></div>
   </div></section>
 </main>
}
