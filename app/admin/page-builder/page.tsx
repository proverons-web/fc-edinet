import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Page Builder Pro — Admin" };
export const dynamic = "force-dynamic";

const pages = [
  { key: "media", title: "Медиа", text: "Фотоальбомы и видео: порядок секций, внешний вид карточек, сетка и фон." },
  { key: "partners", title: "Партнёры", text: "Логотипы, карточки партнёров и финальный CTA-блок." },
  { key: "academy", title: "Академия", text: "Hero, описание, возрастные группы, путь игрока и контакты." },
] as const;

export default async function PageBuilderIndex() {
  await requireEditor();
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER PRO 2.0</p><h1>Редактор страниц</h1><p>Выбери страницу. Внутри всё устроено одинаково: секции → предпросмотр → настройки.</p></div>
      <div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link></div>
    </div></section>
    <section className="section adminSurface"><div className="container">
      <div className="pageBuilderCatalog">
        {pages.map((page) => <Link href={`/admin/page-builder/${page.key}`} className="pageBuilderCatalogCard active" key={page.key}><span>PAGE BUILDER PRO 2.0</span><h2>{page.title}</h2><p>{page.text}</p><b>Редактировать →</b></Link>)}
      </div>
    </div></section>
  </main>;
}
