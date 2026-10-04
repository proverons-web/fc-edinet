import { requireEditor } from "@/lib/editorial";
import UnifiedSiteBuilderClient from "@/app/components/UnifiedSiteBuilderClient";

export const metadata = { title: "Unified Site Builder — Admin" };
export const dynamic = "force-dynamic";

type Props={searchParams?:Promise<Record<string,string|string[]|undefined>>};
const pages=[
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
 await requireEditor(); const q=searchParams?await searchParams:{}; const selectedKey=pages.some(p=>p.key===first(q.page))?String(first(q.page)):pages[0].key; const mode=first(q.mode)==="content"?"content":"design";
 return <UnifiedSiteBuilderClient pages={pages} selectedKey={selectedKey} mode={mode}/>;
}
