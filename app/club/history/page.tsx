import ClubRichContent from "@/app/components/ClubRichContent";
import ClubSectionShell from "@/app/components/ClubSectionShell";
import { mergeTranslatedTextIntoRichContent } from "@/lib/club-rich-content";
import { getLocale } from "@/lib/locale";
import { publicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import type { ClubProfile } from "@/lib/types";
import { localized } from "@/lib/i18n";
export const dynamic="force-dynamic";
export async function generateMetadata(){const locale=await getLocale();return publicMetadata({title:locale==="ro"?"Istoria FC Edineț":"История FC Edineț",description:locale==="ro"?"Istoria clubului de fotbal FC Edineț.":"История футбольного клуба FC Edineț.",path:"/club/history",locale});}
export default async function ClubHistoryPage(){const locale=await getLocale();const supabase=await createClient();const {data}=await supabase.from("club_profile").select("*").eq("id",1).maybeSingle();const p=data as ClubProfile|null;const rich=locale==="ro"?(p?.history_rich_content_ro??mergeTranslatedTextIntoRichContent(p?.history_rich_content,p?.history_text_ro)):p?.history_rich_content;const fallback=localized(p?.history_text,p?.history_text_ro,locale)||(locale==="ro"?"Istoria clubului nu este încă completată.":"История клуба пока не заполнена.");return <ClubSectionShell locale={locale} active="history" title={locale==="ro"?"Istoria FC Edineț":"История FC Edineț"} eyebrow={locale==="ro"?"MOȘTENIREA CLUBULUI":"НАСЛЕДИЕ КЛУБА"} description={locale==="ro"?"Ani, oameni și momente care au format identitatea clubului.":"Годы, люди и события, из которых складывалась история клуба."} imageUrl={p?.hero_image_url}><section className="section clubNarrativePage"><div className="container clubNarrativeInner"><div className="clubHistoryStamp"><span>{locale==="ro"?"DIN":"С"}</span><strong>{p?.founded_year||"—"}</strong></div><article className="clubSectionMain"><ClubRichContent content={rich} fallbackText={fallback}/></article></div></section></ClubSectionShell>;}
