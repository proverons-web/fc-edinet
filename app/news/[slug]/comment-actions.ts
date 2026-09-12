"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n";

const REPORT_REASONS = new Set(["spam", "offensive", "harassment", "other"]);

export async function createComment(formData: FormData) {
  const slug = safeSlug(formData.get("slug"));
  const locale = safeLocale(formData.get("locale"));
  const newsId = Number(formData.get("news_id"));
  const body = String(formData.get("body") ?? "").trim();

  if (!slug || !Number.isFinite(newsId) || body.length < 1 || body.length > 2000) {
    redirect(commentUrl(slug, locale, "invalid"));
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    news_id: newsId,
    user_id: userId,
    body,
    status: "visible",
  });

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("comment_rate_limit")) {
      redirect(commentUrl(slug, locale, "rate_limit"));
    }
    if (message.includes("row-level security") || message.includes("policy")) {
      redirect(commentUrl(slug, locale, "blocked"));
    }
    redirect(commentUrl(slug, locale, "error"));
  }

  revalidatePath(`/news/${slug}`);
  revalidatePath("/admin/comments");
  redirect(commentUrl(slug, locale, "added"));
}

export async function deleteOwnComment(formData: FormData) {
  const slug = safeSlug(formData.get("slug"));
  const locale = safeLocale(formData.get("locale"));
  const commentId = Number(formData.get("comment_id"));
  if (!slug || !Number.isFinite(commentId)) redirect(commentUrl(slug, locale, "error"));

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) redirect(commentUrl(slug, locale, "error"));
  revalidatePath(`/news/${slug}`);
  revalidatePath("/admin/comments");
  redirect(commentUrl(slug, locale, "deleted"));
}

export async function reportComment(formData: FormData) {
  const slug = safeSlug(formData.get("slug"));
  const locale = safeLocale(formData.get("locale"));
  const commentId = Number(formData.get("comment_id"));
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim();

  if (
    !slug ||
    !Number.isFinite(commentId) ||
    !REPORT_REASONS.has(reason) ||
    details.length > 500
  ) {
    redirect(commentUrl(slug, locale, "error"));
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("comment_reports").insert({
    comment_id: commentId,
    reporter_id: userId,
    reason,
    details: details || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") redirect(commentUrl(slug, locale, "report_duplicate"));
    redirect(commentUrl(slug, locale, "error"));
  }

  revalidatePath("/admin/comments");
  redirect(commentUrl(slug, locale, "reported"));
}

function safeSlug(value: FormDataEntryValue | null) {
  const slug = String(value ?? "").trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
}

function safeLocale(value: FormDataEntryValue | null): Locale {
  const raw = String(value ?? "");
  return isLocale(raw) ? raw : "ru";
}

function commentUrl(slug: string, locale: Locale, result: string) {
  const safe = slug || "";
  return `/news/${safe}?comment=${encodeURIComponent(result)}&lang=${locale}#comments`;
}
