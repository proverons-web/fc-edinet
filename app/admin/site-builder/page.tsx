import { requireEditor } from "@/lib/editorial";
import UnifiedSiteBuilderClient from "@/app/components/UnifiedSiteBuilderClient";
import type { CustomSitePage, SiteMenuItem } from "@/lib/site-builder";

export const metadata = { title: "Редактор сайта — FC Edineț" };
export const dynamic = "force-dynamic";

type Props={searchParams?:Promise<Record<string,string|string[]|undefined>>};
const systemPages=[
 {key:"home",label:"Главная",preview:"/",design:"/admin/design?page=home",content:"/admin/home",kind:"system" as const},
 {key:"club",label:"Клуб",preview:"/club/about",design:"/admin/page-builder/club",content:"/admin/club",kind:"system" as const},
 {key:"news",label:"Новости",preview:"/news",design:"/admin/design?page=news",content:"/admin/news",kind:"system" as const},
 {key:"team",label:"Команда",preview:"/team",design:"/admin/design?page=team",content:"/admin/players",kind:"system" as const},
 {key:"matches",label:"Календарь",preview:"/matches",design:"/admin/design?page=matches",content:"/admin/matches",kind:"system" as const},
 {key:"standings",label:"Таблица",preview:"/standings",design:"/admin/design?page=standings",content:"/admin/standings",kind:"system" as const},
 {key:"media",label:"Медиа",preview:"/media",design:"/admin/page-builder/media",content:"/admin/media",kind:"system" as const},
 {key:"partners",label:"Партнёры",preview:"/partners",design:"/admin/page-builder/partners",content:"/admin/partners",kind:"system" as const},
 {key:"academy",label:"Академия",preview:"/academy",design:"/admin/page-builder/academy",content:"/admin/page-builder/academy",kind:"system" as const},
 {key:"statistics",label:"Статистика",preview:"/statistics",design:"/admin/statistics",content:"/admin/statistics",kind:"system" as const},
];
function first(v:string|string[]|undefined){return Array.isArray(v)?v[0]:v}
export default async function UnifiedSiteBuilder({searchParams}:Props){
 const {supabase}=await requireEditor();
 const q=searchParams?await searchParams:{};
 const [{data:customData},{data:menuData}]=await Promise.all([
   supabase.from("site_custom_pages").select("*").order("updated_at",{ascending:false}),
   supabase.from("site_menu_items").select("*").order("display_order").order("id"),
 ]);
 const customPages=(customData??[]) as CustomSitePage[];
 const pages=[...systemPages,...customPages.map(p=>({key:`custom:${p.id}`,label:p.title_ru,preview:`/${p.slug}`,design:"",content:"",kind:"custom" as const,custom:p}))];
 const requested=String(first(q.page)??"");
 const selectedKey=pages.some(p=>p.key===requested)?requested:pages[0].key;
 const error=String(first(q.error)??"");
 const noticeMap:Record<string,string>={
   invalid_slug:"Укажи корректный адрес страницы латиницей.", reserved_slug:"Этот адрес зарезервирован системным разделом сайта. Выбери другой slug.", slug_taken:"Страница с таким адресом уже существует.", create_failed:"Не удалось создать страницу.", invalid_page:"Некорректная страница.", page_not_found:"Страница не найдена.", save_failed:"Не удалось сохранить страницу.", delete_failed:"Не удалось удалить страницу.", invalid_href:"Некорректная ссылка меню. Используй /раздел, https://, mailto: или tel:.", invalid_menu_item:"Некорректный пункт меню.", menu_save_failed:"Не удалось сохранить пункт меню.", menu_create_failed:"Не удалось создать пункт меню."
 };
 const notice=error?noticeMap[error]||"Операция не выполнена.":first(q.saved)?"Страница сохранена.":first(q.created)?"Страница создана.":first(q.deleted)?"Страница удалена.":undefined;
 return <UnifiedSiteBuilderClient pages={pages} selectedKey={selectedKey} customPages={customPages} menuItems={(menuData??[]) as SiteMenuItem[]} notice={notice}/>;
}
