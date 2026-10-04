import Link from "next/link";
import { requireEditor } from "@/lib/editorial";

export const metadata = { title: "Page Builder — Admin" };
export const dynamic = "force-dynamic";

export default async function PageBuilderIndex() {
  await requireEditor();
  return <main className="adminPage">
    <section className="adminHero compactAdminHero"><div className="container adminHeroInner">
      <div><p className="eyebrow">FC EDINEȚ • PAGE BUILDER</p><h1>Конструктор страниц</h1><p>Page Builder 3.1: реальный рендер страницы, свободная раскладка и управляемый кадр изображений.</p></div>
      <div className="adminHeroActions"><Link href="/admin" className="adminBack">← Админка</Link></div>
    </div></section>
    <section className="section adminSurface"><div className="container">
      <div className="pageBuilderCatalog">
        <Link href="/admin/page-builder/club" className="pageBuilderCatalogCard active"><span>ДОСТУПНО • v2.3.5</span><h2>Клуб</h2><p>Два дизайн-пресета, свободная раскладка, точный фокус фото и визуальная верстка контента.</p><b>Открыть конструктор →</b></Link>
        <article className="pageBuilderCatalogCard"><span>СЛЕДУЮЩИЙ ЭТАП</span><h2>Медиа</h2><p>Шаблоны галерей, обложек и блоков фото/видео.</p><b>Архитектура готова</b></article>
        <article className="pageBuilderCatalogCard"><span>СЛЕДУЮЩИЙ ЭТАП</span><h2>Партнёры / Академия</h2><p>Эти страницы смогут использовать тот же движок секций без отдельного конструктора.</p><b>Архитектура готова</b></article>
      </div>
    </div></section>
  </main>;
}
