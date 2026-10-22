import ClubRichContent from "@/app/components/ClubRichContent";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { mergeTranslatedTextIntoRichContent } from "@/lib/club-rich-content";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import type { ClubProfile } from "@/lib/types";
import { localized } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata(){ const locale=await getLocale(); return publicMetadata({title:locale==="ro"?"Despre club":"О клубе",description:locale==="ro"?"Informații despre FC Edineț, identitatea clubului și date de contact.":"Информация о FC Edineț, идентичность клуба и контакты.",path:"/club/about",locale}); }

export default async function ClubAboutPage(){
  const locale=await getLocale(); const supabase=await createClient();
  const {data}=await supabase.from("club_profile").select("*").eq("id",1).maybeSingle(); const profile=data as ClubProfile|null;
  const clubName=localized(profile?.club_name,profile?.club_name_ro,locale)||"FC Edineț";
  const city=localized(profile?.city,profile?.city_ro,locale)||"Edineț";
  const colors=localized(profile?.club_colors,profile?.club_colors_ro,locale)||(locale==="ro"?"Albastru / alb":"Синий / белый");
  const motto=localized(profile?.motto,profile?.motto_ro,locale)||(locale==="ro"?"Împreună pentru Edineț":"Вместе за Единец");
  const rich=locale==="ro"?(profile?.about_rich_content_ro??mergeTranslatedTextIntoRichContent(profile?.about_rich_content,profile?.about_text_ro)):profile?.about_rich_content;
  const fallback=localized(profile?.about_text,profile?.about_text_ro,locale)||(locale==="ro"?"Informația despre club va fi adăugată în curând.":"Информация о клубе будет добавлена администрацией.");
  return <ClubSectionShell locale={locale} active="about" title={locale==="ro"?"Despre club":"О клубе"} eyebrow="FC EDINEȚ" description={motto} imageUrl={profile?.hero_image_url}>
    <section className="section clubSplitPage"><div className="container clubSplitGrid">
      <article className="clubSectionMain"><p className="eyebrow blue">{locale==="ro"?"IDENTITATE":"ИДЕНТИЧНОСТЬ"}</p><h2>{clubName}</h2><ClubRichContent content={rich} fallbackText={fallback}/></article>
      <aside className="clubInfoPanel"><div className="clubInfoStat"><span>{locale==="ro"?"Fondat":"Основан"}</span><strong>{profile?.founded_year||"—"}</strong></div><div className="clubInfoStat"><span>{locale==="ro"?"Oraș":"Город"}</span><strong>{city}</strong></div><div className="clubInfoStat"><span>{locale==="ro"?"Culori":"Цвета"}</span><strong>{colors}</strong></div><div className="clubInfoDivider"/><div className="clubInfoContact"><span>Email</span><strong>{profile?.email||"—"}</strong></div><div className="clubInfoContact"><span>{locale==="ro"?"Telefon":"Телефон"}</span><strong>{profile?.phone||"—"}</strong></div><div className="clubInfoContact"><span>{locale==="ro"?"Adresă":"Адрес"}</span><strong>{localized(profile?.address,profile?.address_ro,locale)||"—"}</strong></div></aside>
    </div></section>
  </ClubSectionShell>;
}
