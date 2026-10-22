"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import { cleanSiteSlug } from "@/lib/site-builder";

function text(fd: FormData, key: string) { return String(fd.get(key) ?? "").trim(); }

export async function createCustomPage(fd: FormData) {
  const { supabase, userId } = await requireEditor();
  const titleRu = text(fd, "title_ru") || "Новая страница";
  const titleRo = text(fd, "title_ro");
  const slug = cleanSiteSlug(text(fd, "slug") || titleRu);
  if (!slug) throw new Error("Не удалось создать адрес страницы");
  const { data, error } = await supabase.from("site_custom_pages").insert({ slug, title_ru: titleRu, title_ro: titleRo, created_by: userId, updated_by: userId }).select("id,slug").single();
  if (error) throw error;
  if (fd.get("add_to_menu") === "on") {
    const { data: maxRow } = await supabase.from("site_menu_items").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("site_menu_items").insert({ label_ru: titleRu, label_ro: titleRo, href: `/${slug}`, custom_page_id: data.id, display_order: Number(maxRow?.display_order ?? 100) + 10 });
  }
  revalidatePath("/", "layout");
  redirect(`/admin/site-builder?page=custom:${data.id}`);
}

export async function saveCustomPage(fd: FormData) {
  const { supabase, userId } = await requireEditor();
  const id = Number(fd.get("id"));
  if (!Number.isFinite(id)) throw new Error("Некорректная страница");
  const slug = cleanSiteSlug(text(fd, "slug"));
  const status = text(fd, "status") === "published" ? "published" : "draft";
  const patch = {
    slug,
    title_ru: text(fd, "title_ru") || "Без названия",
    title_ro: text(fd, "title_ro"),
    intro_ru: text(fd, "intro_ru"), intro_ro: text(fd, "intro_ro"),
    body_ru: text(fd, "body_ru"), body_ro: text(fd, "body_ro"),
    hero_image_url: text(fd, "hero_image_url") || null,
    status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
    published_at: status === "published" ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from("site_custom_pages").update(patch).eq("id", id);
  if (error) throw error;
  await supabase.from("site_menu_items").update({ href: `/${slug}`, label_ru: patch.title_ru, label_ro: patch.title_ro, updated_at: new Date().toISOString() }).eq("custom_page_id", id);
  revalidatePath("/", "layout");
  revalidatePath(`/${slug}`);
}

export async function deleteCustomPage(fd: FormData) {
  const { supabase } = await requireEditor();
  const id = Number(fd.get("id"));
  if (!Number.isFinite(id)) return;
  const { error } = await supabase.from("site_custom_pages").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/admin/site-builder");
}

export async function saveMenuItem(fd: FormData) {
  const { supabase } = await requireEditor();
  const id = Number(fd.get("id"));
  const parentRaw = text(fd, "parent_id");
  const patch = {
    label_ru: text(fd, "label_ru") || "Пункт меню",
    label_ro: text(fd, "label_ro"),
    href: text(fd, "href") || "/",
    visible: fd.get("visible") === "on",
    parent_id: parentRaw ? Number(parentRaw) : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("site_menu_items").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function createMenuItem(fd: FormData) {
  const { supabase } = await requireEditor();
  const { data: maxRow } = await supabase.from("site_menu_items").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("site_menu_items").insert({
    label_ru: text(fd, "label_ru") || "Новый пункт",
    label_ro: text(fd, "label_ro"),
    href: text(fd, "href") || "/",
    visible: true,
    display_order: Number(maxRow?.display_order ?? 100) + 10,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function reorderMenuItems(ids: number[]) {
  const { supabase } = await requireEditor();
  await Promise.all(ids.map((id, index) => supabase.from("site_menu_items").update({ display_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq("id", id)));
  revalidatePath("/", "layout");
}

export async function deleteMenuItem(id: number) {
  const { supabase } = await requireEditor();
  const { data } = await supabase.from("site_menu_items").select("system_key").eq("id", id).maybeSingle();
  if (data?.system_key) return;
  await supabase.from("site_menu_items").delete().eq("id", id);
  revalidatePath("/", "layout");
}
