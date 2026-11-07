"use server";
import { requireEditor } from "@/lib/editorial";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { competitionSlug, competitionTypes } from "@/lib/competition";
import type { CompetitionType } from "@/lib/types";

const val = (f: FormData, k: string) => String(f.get(k) || "").trim();
function fail(message: string): never {
  redirect(`/admin/matches/competitions?error=${encodeURIComponent(message)}`);
}
export async function saveCompetition(formData: FormData) {
  const {supabase, userId} = await requireEditor();
  const id = val(formData,"competition_id");
  const name = val(formData,"name");
  const nameRo = val(formData,"name_ro") || null;
  const slug = competitionSlug(val(formData,"slug") || name);
  const competitionType = val(formData,"competition_type") as CompetitionType;
  const seasonId = val(formData,"season_id");
  const isActive = formData.get("is_active") === "on";
  let logo = val(formData,"logo_url") || null;
  if (id && !/^\d+$/.test(id)) fail("Некорректный ID.");
  if (name.length < 2 || name.length > 120 || (nameRo && nameRo.length > 120)) fail("Проверь длину названия.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail("Укажи slug латиницей, например cupa-moldovei-2026-27.");
  if (!competitionTypes.includes(competitionType)) fail("Тип соревнования не выбран.");
  if (!/^\d+$/.test(seasonId)) fail("Выбери сезон.");
  const {data: season,error: seasonError}=await supabase.from("seasons").select("id,name").eq("id",seasonId).maybeSingle();
  if (seasonError || !season) fail("Сезон не найден.");
  if (logo) {
    let u: URL;
    try { u = new URL(logo); } catch { fail("Некорректный адрес герба."); }
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.example").host;
    if (u!.protocol !== "https:" || u!.host !== supabaseHost || logo.length > 2048) fail("Герб должен быть загружен в Supabase Storage этого клуба.");
  }
  if (id) {
    const [{data: old,error: readError},{count:matchCount,error:matchError},{count:standingCount,error:standingsError}] = await Promise.all([
      supabase.from("competitions").select("competition_type,season_id").eq("id",id).maybeSingle(),
      supabase.from("matches").select("id",{count:"exact",head:true}).eq("competition_id",id),
      supabase.from("standings").select("id",{count:"exact",head:true}).eq("competition_id",id),
    ]);
    if (readError || matchError || standingsError || !old) fail("Не удалось проверить связанные данные соревнования.");
    if (((matchCount || 0)+(standingCount || 0))>0 && (
      (old.competition_type || "league") !== competitionType || String(old.season_id) !== seasonId || !isActive
    )) fail("У соревнования есть матчи или таблица. Нельзя менять тип, сезон или отключать его.");
  }
  const logoFile = formData.get("logo_file");
  let uploadedPath: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    const mime: Record<string,string> = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp"};
    if (!mime[logoFile.type] || logoFile.size > 3*1024*1024) fail("Герб: PNG, JPG или WebP, до 3 МБ.");
    const filePath = `${userId}/competitions/${Date.now()}-${slug}.${mime[logoFile.type]}`;
    const {error} = await supabase.storage.from("teams").upload(filePath,logoFile,{contentType:logoFile.type,upsert:false});
    if (error) fail(`Не удалось загрузить герб: ${error.message}`);
    uploadedPath = filePath;
    logo = supabase.storage.from("teams").getPublicUrl(filePath).data.publicUrl;
  }
  const payload = {name,name_ro:nameRo,slug,competition_type:competitionType,season_id:Number(seasonId),season:String(season.name),logo_url:logo,is_active:isActive};
  const {error} = id
    ? await supabase.from("competitions").update(payload).eq("id",id)
    : await supabase.from("competitions").insert(payload);
  if (error) {
    if (uploadedPath) await supabase.storage.from("teams").remove([uploadedPath]);
    fail(error.code==="23505"?"Этот slug уже занят.":`Ошибка сохранения: ${error.message}`);
  }
  for (const url of ["/","/matches","/standings","/admin/matches","/admin/matches/competitions","/club/seasons"]) revalidatePath(url);
  redirect("/admin/matches/competitions?saved=1");
}
