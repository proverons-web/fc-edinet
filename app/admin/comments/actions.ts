"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";

export async function moderateComment(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const commentId = Number(formData.get("comment_id"));
  const action = String(formData.get("moderation_action") ?? "");
  if (!Number.isFinite(commentId) || !["hide", "restore"].includes(action)) {
    redirect("/admin/comments?notice=invalid");
  }

  const { data: comment } = await supabase
    .from("comments")
    .select("id,news_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) redirect("/admin/comments?notice=not_found");

  const { error } = await supabase
    .from("comments")
    .update({
      status: action === "hide" ? "hidden" : "visible",
      moderated_by: userId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) redirect("/admin/comments?notice=error");

  if (action === "hide") {
    await supabase
      .from("comment_reports")
      .update({ status: "resolved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("comment_id", commentId)
      .eq("status", "pending");
  }

  await revalidateCommentNews(supabase, Number(comment.news_id));
  revalidatePath("/admin/comments");
  redirect(`/admin/comments?notice=${action === "hide" ? "hidden" : "restored"}`);
}

export async function reviewCommentReport(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const reportId = Number(formData.get("report_id"));
  const action = String(formData.get("report_action") ?? "");
  if (!Number.isFinite(reportId) || !["dismiss", "hide"].includes(action)) {
    redirect("/admin/comments?notice=invalid");
  }

  const { data: report } = await supabase
    .from("comment_reports")
    .select("id,comment_id,status")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) redirect("/admin/comments?notice=not_found");

  if (action === "hide") {
    const { data: comment } = await supabase
      .from("comments")
      .select("id,news_id")
      .eq("id", report.comment_id)
      .maybeSingle();

    const { error: commentError } = await supabase
      .from("comments")
      .update({ status: "hidden", moderated_by: userId, moderated_at: new Date().toISOString() })
      .eq("id", report.comment_id);
    if (commentError) redirect("/admin/comments?notice=error");

    await supabase
      .from("comment_reports")
      .update({ status: "resolved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("comment_id", report.comment_id)
      .eq("status", "pending");

    if (comment?.news_id) await revalidateCommentNews(supabase, Number(comment.news_id));
    revalidatePath("/admin/comments");
    redirect("/admin/comments?notice=report_hidden");
  }

  const { error } = await supabase
    .from("comment_reports")
    .update({ status: "dismissed", reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) redirect("/admin/comments?notice=error");

  revalidatePath("/admin/comments");
  redirect("/admin/comments?notice=report_dismissed");
}

export async function blockCommentUser(formData: FormData) {
  const { supabase, userId } = await requireEditor();
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const duration = String(formData.get("duration") ?? "7d");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isUuid(targetUserId) || targetUserId === userId || reason.length > 500) {
    redirect("/admin/comments?notice=invalid");
  }

  const durationMs: Record<string, number | null> = {
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    forever: null,
  };
  if (!(duration in durationMs)) redirect("/admin/comments?notice=invalid");

  const ms = durationMs[duration];
  const blockedUntil = ms === null ? null : new Date(Date.now() + ms).toISOString();

  const { error } = await supabase.from("comment_blocks").upsert({
    user_id: targetUserId,
    reason: reason || null,
    blocked_until: blockedUntil,
    blocked_by: userId,
  }, { onConflict: "user_id" });

  if (error) redirect("/admin/comments?notice=error");
  revalidatePath("/admin/comments");
  redirect("/admin/comments?notice=blocked");
}

export async function unblockCommentUser(formData: FormData) {
  const { supabase } = await requireEditor();
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  if (!isUuid(targetUserId)) redirect("/admin/comments?notice=invalid");

  const { error } = await supabase.from("comment_blocks").delete().eq("user_id", targetUserId);
  if (error) redirect("/admin/comments?notice=error");
  revalidatePath("/admin/comments");
  redirect("/admin/comments?notice=unblocked");
}

async function revalidateCommentNews(supabase: any, newsId: number) {
  const { data } = await supabase.from("news").select("slug").eq("id", newsId).maybeSingle();
  if (data?.slug) revalidatePath(`/news/${data.slug}`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
