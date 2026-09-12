"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff, isEditor } from "@/lib/editorial";
import type { NewsArticle } from "@/lib/types";

export type NewsFormState = {
  error?: string;
};

type Intent =
  | "save"
  | "submit_review"
  | "publish"
  | "return_draft";

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const maxImageBytes = 8 * 1024 * 1024;

export async function saveNews(
  _previousState: NewsFormState,
  formData: FormData
): Promise<NewsFormState> {
  const { supabase, profile, userId } = await requireStaff();
  const editor = isEditor(profile);

  const rawId = String(formData.get("article_id") ?? "").trim();
  const articleId = rawId ? Number(rawId) : null;

  const title = String(formData.get("title") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const titleRo = String(formData.get("title_ro") ?? "").trim();
  const excerptRo = String(formData.get("excerpt_ro") ?? "").trim();
  const contentRo = String(formData.get("content_ro") ?? "").trim();
  const categoryRaw = String(formData.get("category_id") ?? "").trim();
  const categoryId = categoryRaw ? Number(categoryRaw) : null;
  const intent = String(formData.get("intent") ?? "save") as Intent;
  const clearCover = formData.get("clear_cover") === "on";
  const existingCover = String(
    formData.get("existing_cover_url") ?? ""
  ).trim();
  const editorNoteInput = String(
    formData.get("editor_note") ?? ""
  ).trim();

  if (title.length < 5 || title.length > 180) {
    return { error: "Заголовок должен содержать от 5 до 180 символов." };
  }

  if (!slug || slug.length < 3 || slug.length > 180) {
    return { error: "Укажи корректный slug." };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      error: "Slug может содержать только a-z, 0-9 и дефисы.",
    };
  }

  if (excerpt.length > 420) {
    return { error: "Краткое описание — максимум 420 символов." };
  }

  if (content.length < 20) {
    return { error: "Текст новости слишком короткий." };
  }

  if (!categoryId || !Number.isFinite(categoryId)) {
    return { error: "Выбери категорию." };
  }

  if (!["save", "submit_review", "publish", "return_draft"].includes(intent)) {
    return { error: "Неизвестное действие редактора." };
  }

  let existing: NewsArticle | null = null;

  if (articleId) {
    const { data, error } = await supabase
      .from("news")
      .select(`
        id,title,title_ro,slug,excerpt,excerpt_ro,content,content_ro,cover_image_url,author_name,status,
        published_at,views,is_featured,category_id,created_by,submitted_at,
        published_by,editor_note,created_at,updated_at,
        category:news_categories(id,name,slug)
      `)
      .eq("id", articleId)
      .maybeSingle();

    if (error || !data) {
      return { error: "Материал не найден или у тебя нет доступа." };
    }

    existing = data as unknown as NewsArticle;

    if (
      profile.role === "author" &&
      (
        existing.created_by !== userId ||
        existing.status !== "draft" ||
        !["save", "submit_review"].includes(intent)
      )
    ) {
      return {
        error:
          "Автор может изменять только собственный черновик и отправлять его на проверку.",
      };
    }
  } else if (profile.role === "author" && !["save", "submit_review"].includes(intent)) {
    return { error: "Автор не может публиковать материал напрямую." };
  }

  if (!editor && ["publish", "return_draft"].includes(intent)) {
    return { error: "Для этого действия нужны права редактора." };
  }

  let coverImageUrl = clearCover ? null : ((existing?.cover_image_url ?? existingCover) || null);

  const fileValue = formData.get("cover_file");
  if (fileValue instanceof File && fileValue.size > 0) {
    if (!allowedMime.has(fileValue.type)) {
      return { error: "Обложка должна быть JPG, PNG или WEBP." };
    }

    if (fileValue.size > maxImageBytes) {
      return { error: "Максимальный размер обложки — 8 МБ." };
    }

    const ext = extensionForFile(fileValue);
    const path = `${userId}/${Date.now()}-${slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("news")
      .upload(path, fileValue, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileValue.type,
      });

    if (uploadError) {
      return {
        error: `Не удалось загрузить обложку: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("news")
      .getPublicUrl(path);

    coverImageUrl = publicUrlData.publicUrl;
  }

  const now = new Date().toISOString();
  const currentStatus = existing?.status ?? "draft";

  let status: NewsArticle["status"] = currentStatus;
  let submittedAt = existing?.submitted_at ?? null;
  let publishedAt = existing?.published_at ?? null;
  let publishedBy = existing?.published_by ?? null;

  if (profile.role === "author") {
    if (intent === "submit_review") {
      status = "review";
      submittedAt = now;
    } else {
      status = "draft";
      publishedAt = null;
      publishedBy = null;
    }
  } else {
    if (intent === "submit_review") {
      status = "review";
      submittedAt = now;
      publishedAt = null;
      publishedBy = null;
    }

    if (intent === "publish") {
      status = "published";
      submittedAt = submittedAt ?? now;
      publishedAt = now;
      publishedBy = userId;
    }

    if (intent === "return_draft") {
      status = "draft";
      publishedAt = null;
      publishedBy = null;
    }

    if (intent === "save" && !existing) {
      status = "draft";
    }
  }

  const featured =
    editor && formData.get("is_featured") === "on"
      ? true
      : editor
        ? false
        : (existing?.is_featured ?? false);

  const authorName =
    existing?.author_name ||
    profile.full_name ||
    profile.email ||
    "FC Edineț";

  const payload = {
    category_id: categoryId,
    title,
    title_ro: titleRo || null,
    slug,
    excerpt: excerpt || null,
    excerpt_ro: excerptRo || null,
    content,
    content_ro: contentRo || null,
    cover_image_url: coverImageUrl,
    author_name: authorName,
    status,
    submitted_at: submittedAt,
    published_at: publishedAt,
    published_by: publishedBy,
    editor_note: editor
      ? (editorNoteInput || null)
      : (existing?.editor_note ?? null),
    is_featured: featured,
  };

  let savedId: number;

  if (existing && articleId) {
    const { data, error } = await supabase
      .from("news")
      .update(payload)
      .eq("id", articleId)
      .select("id")
      .single();

    if (error || !data) {
      return { error: humanizeDatabaseError(error?.message) };
    }

    savedId = Number(data.id);
  } else {
    const { data, error } = await supabase
      .from("news")
      .insert({
        ...payload,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { error: humanizeDatabaseError(error?.message) };
    }

    savedId = Number(data.id);
  }

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  revalidatePath("/admin/news");

  if (status === "review") {
    redirect("/admin/news?status=review");
  }

  if (status === "published") {
    redirect("/admin/news?status=published");
  }

  redirect(`/admin/news/${savedId}/edit?saved=1`);
}

export async function deleteDraft(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const articleId = Number(formData.get("article_id"));

  if (!Number.isFinite(articleId)) {
    redirect("/admin/news");
  }

  const { data: article } = await supabase
    .from("news")
    .select("id,status,created_by")
    .eq("id", articleId)
    .maybeSingle();

  if (!article) {
    redirect("/admin/news");
  }

  const canDelete =
    isEditor(profile) ||
    (
      profile.role === "author" &&
      article.created_by === userId &&
      article.status === "draft"
    );

  if (!canDelete) {
    redirect(`/admin/news/${articleId}/edit`);
  }

  await supabase.from("news").delete().eq("id", articleId);

  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin");
  revalidatePath("/admin/news");
  redirect("/admin/news");
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extensionForFile(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function humanizeDatabaseError(message?: string) {
  if (!message) return "Не удалось сохранить новость.";
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "Такой slug уже используется другой новостью.";
  }

  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "Недостаточно прав для этого действия.";
  }

  return `Не удалось сохранить новость: ${message}`;
}
