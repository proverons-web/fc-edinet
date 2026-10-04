import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Page Builder — Admin" };
export const dynamic = "force-dynamic";

export default async function PageBuilderIndex() {
  await requireEditor();
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER PRO</p><h1>Конструктор страниц</h1><p>Один профессиональный редактор: быстрый простой режим + расширенная точная настройка. Preview и публичная страница используют один рендер.</p></div>
      <div className="adminHeroActions"><Link href="/admin/site-builder" className="primaryButton">Открыть Unified Site Builder</Link><Link href="/admin" className="adminBack">← Админка</Link></div>
    </div></section>
    <section className="section adminSurface"><div className="container">
      <div className="pageBuilderCatalog">
        <Link href="/admin/page-builder/club" className="pageBuilderCatalogCard active"><span>PAGE BUILDER 3.1</span><h2>Клуб</h2><p>Свободная раскладка, фокус и zoom фото, Rich Content внутри текста.</p><b>Открыть →</b></Link>
        <Link href="/admin/page-builder/media" className="pageBuilderCatalogCard active"><span>PAGE BUILDER PRO • НОВОЕ</span><h2>Медиа</h2><p>Фотоальбомы и видео: Featured, Grid, Editorial, карточки и списки.</p><b>Открыть →</b></Link>
        <Link href="/admin/page-builder/partners" className="pageBuilderCatalogCard active"><span>PAGE BUILDER PRO • НОВОЕ</span><h2>Партнёры</h2><p>Карточки, логотипы, строки, CTA и адаптивная сетка.</p><b>Открыть →</b></Link>
        <Link href="/admin/page-builder/academy" className="pageBuilderCatalogCard active"><span>PAGE BUILDER PRO • НОВОЕ</span><h2>Академия</h2><p>Новая публичная страница с Hero, группами, путём игрока и контактным блоком.</p><b>Открыть →</b></Link>
      </div>
    </div></section>
  </main>;
}
