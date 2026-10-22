import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import type { CustomSitePage } from "@/lib/site-builder";

type Props={params:Promise<{slug:string}>};

async function getPage(slug:string){
  const supabase=createPublicClient();
  const {data}=await supabase.from("site_custom_pages").select("*").eq("slug",slug).eq("status","published").maybeSingle();
  return data as CustomSitePage|null;
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params; const page=await getPage(slug); if(!page)return {};
  const locale=await getLocale(); const title=locale==="ro"?(page.title_ro||page.title_ru):page.title_ru;
  const description=locale==="ro"?(page.intro_ro||page.intro_ru):page.intro_ru;
  return publicMetadata({ title, description, path: `/${page.slug}`, locale, image: page.hero_image_url });
}

export default async function CustomSitePage({params}:Props){
  const {slug}=await params; const page=await getPage(slug); if(!page)notFound();
  const locale=await getLocale(); const ro=locale==="ro";
  const title=ro?(page.title_ro||page.title_ru):page.title_ru;
  const intro=ro?(page.intro_ro||page.intro_ru):page.intro_ru;
  const body=ro?(page.body_ro||page.body_ru):page.body_ru;
  const paragraphs=body.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  return <main className="customSitePage">
    <section className="customSiteHero" style={page.hero_image_url?{backgroundImage:`linear-gradient(90deg,rgba(4,30,61,.9),rgba(4,30,61,.58)),url(${page.hero_image_url})`}:undefined}>
      <div className="container"><span>FC EDINEȚ</span><h1>{title}</h1>{intro&&<p>{intro}</p>}</div>
    </section>
    <section className="section"><div className="container customSiteBody">{paragraphs.length?paragraphs.map((p,i)=><p key={i}>{p}</p>):<p>{ro?"Conținutul paginii va apărea aici.":"Содержимое страницы появится здесь."}</p>}</div></section>
  </main>;
}
