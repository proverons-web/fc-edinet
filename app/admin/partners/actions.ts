"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/editorial";
import type { PartnerLevel } from "@/lib/types";
import { resolveRomanianTranslation } from "@/lib/auto-translation";

const validLevels = new Set<PartnerLevel>([
  "main",
  "official",
  "technical",
  "supporter",
]);

const allowedLogoMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const maxLogoBytes = 5 * 1024 * 1024;

export async function createPartner(formData: FormData) {
  const { supabase, userId } = await requireEditor();

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const websiteUrl = normalizeWebsite(formData.get("website_url"));
  const description = nullableString(formData.get("description"));
  const descriptionRo = nullableString(formData.get("description_ro"));
  const partnerLevel = String(
    formData.get("partner_level") ?? "official"
  ) as PartnerLevel;
  const displayOrder = parseOrder(formData.get("display_order"));
  const isActive = formData.get("is_active") === "on";
  const showOnHomepage = formData.get("show_on_homepage") === "on";
  const logoValue = formData.get("logo_file");

  if (name.length < 2 || !slug) {
    redirect("/admin/partners?error=invalid_name");
  }

  if (websiteUrl === "invalid") {
    redirect("/admin/partners?error=invalid_url");
  }

  if (!validLevels.has(partnerLevel)) {
    redirect("/admin/partners?error=invalid_level");
  }

  if (!(logoValue instanceof File) || logoValue.size === 0) {
    redirect("/admin/partners?error=logo_required");
  }

  const logoFile = logoValue as File;
  const upload = await uploadPartnerLogo(
    supabase,
    userId,
    slug,
    logoFile
  );

  if (!upload.ok) {
    redirect(`/admin/partners?error=${upload.code}`);
  }

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { description },
    manual: { description: descriptionRo },
    context: `FC Edinet partner description: ${name}`,
    locked: translationLocked,
  });

  const { error } = await supabase.from("partners").insert({
    name,
    slug,
    website_url: websiteUrl,
    description,
    description_ro: translation.values.description || null,
    ro_translation_locked: translationLocked,
    ro_translation_source_hash: translation.sourceHash,
    ro_translation_updated_at: translation.translatedAt,
    logo_url: upload.publicUrl,
    logo_storage_path: upload.path,
    partner_level: partnerLevel,
    display_order: displayOrder,
    is_active: isActive,
    show_on_homepage: showOnHomepage,
  });

  if (error) {
    await supabase.storage.from("partners").remove([upload.path]);
    redirect(
      `/admin/partners?error=${
        error.message.toLowerCase().includes("duplicate")
          ? "duplicate_slug"
          : "create_failed"
      }`
    );
  }

  revalidatePartners();
  redirect("/admin/partners?saved=created");
}

export async function updatePartner(formData: FormData) {
  const { supabase, userId } = await requireEditor();

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const websiteUrl = normalizeWebsite(formData.get("website_url"));
  const description = nullableString(formData.get("description"));
  const descriptionRo = nullableString(formData.get("description_ro"));
  const partnerLevel = String(
    formData.get("partner_level") ?? "official"
  ) as PartnerLevel;
  const displayOrder = parseOrder(formData.get("display_order"));
  const isActive = formData.get("is_active") === "on";
  const showOnHomepage = formData.get("show_on_homepage") === "on";

  if (!partnerId || name.length < 2 || !slug) {
    redirect("/admin/partners?error=invalid_name");
  }

  if (websiteUrl === "invalid") {
    redirect("/admin/partners?error=invalid_url");
  }

  if (!validLevels.has(partnerLevel)) {
    redirect("/admin/partners?error=invalid_level");
  }

  const { data: existing, error: existingError } = await supabase
    .from("partners")
    .select("id,logo_url,logo_storage_path,ro_translation_source_hash,ro_translation_updated_at")
    .eq("id", partnerId)
    .single();

  if (existingError || !existing) {
    redirect("/admin/partners?error=not_found");
  }

  let logoUrl = existing.logo_url as string;
  let logoStoragePath = existing.logo_storage_path as string | null;
  let newUploadedPath: string | null = null;

  const logoValue = formData.get("logo_file");
  if (logoValue instanceof File && logoValue.size > 0) {
    const upload = await uploadPartnerLogo(
      supabase,
      userId,
      slug,
      logoValue
    );

    if (!upload.ok) {
      redirect(`/admin/partners?error=${upload.code}`);
    }

    logoUrl = upload.publicUrl;
    logoStoragePath = upload.path;
    newUploadedPath = upload.path;
  }

  const translationLocked = formData.get("ro_translation_locked") === "on";
  const translation = await resolveRomanianTranslation({
    source: { description },
    manual: { description: descriptionRo },
    context: `FC Edinet partner description: ${name}`,
    locked: translationLocked,
    previousHash: existing.ro_translation_source_hash ?? null,
  });

  const { error } = await supabase
    .from("partners")
    .update({
      name,
      slug,
      website_url: websiteUrl,
      description,
      description_ro: translation.values.description || null,
      ro_translation_locked: translationLocked,
      ro_translation_source_hash: translation.sourceHash,
      ro_translation_updated_at:
        translation.translatedAt ?? existing.ro_translation_updated_at ?? null,
      logo_url: logoUrl,
      logo_storage_path: logoStoragePath,
      partner_level: partnerLevel,
      display_order: displayOrder,
      is_active: isActive,
      show_on_homepage: showOnHomepage,
    })
    .eq("id", partnerId);

  if (error) {
    if (newUploadedPath) {
      await supabase.storage.from("partners").remove([newUploadedPath]);
    }

    redirect(
      `/admin/partners?error=${
        error.message.toLowerCase().includes("duplicate")
          ? "duplicate_slug"
          : "update_failed"
      }`
    );
  }

  if (
    newUploadedPath &&
    existing.logo_storage_path &&
    existing.logo_storage_path !== newUploadedPath
  ) {
    await supabase.storage
      .from("partners")
      .remove([existing.logo_storage_path]);
  }

  revalidatePartners();
  redirect("/admin/partners?saved=updated");
}

export async function deletePartner(formData: FormData) {
  const { supabase, profile } = await requireEditor();

  if (profile.role !== "admin") {
    redirect("/admin/partners?error=admin_only");
  }

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  if (!partnerId) {
    redirect("/admin/partners?error=not_found");
  }

  const { data: existing } = await supabase
    .from("partners")
    .select("logo_storage_path")
    .eq("id", partnerId)
    .maybeSingle();

  const { error } = await supabase
    .from("partners")
    .delete()
    .eq("id", partnerId);

  if (error) {
    redirect("/admin/partners?error=delete_failed");
  }

  if (existing?.logo_storage_path) {
    await supabase.storage
      .from("partners")
      .remove([existing.logo_storage_path]);
  }

  revalidatePartners();
  redirect("/admin/partners?saved=deleted");
}

async function uploadPartnerLogo(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  userId: string,
  slug: string,
  file: File
): Promise<
  | { ok: true; code: null; path: string; publicUrl: string }
  | { ok: false; code: string; path: null; publicUrl: null }
> {
  if (!allowedLogoMime.has(file.type)) {
    return {
      ok: false,
      code: "invalid_logo_type",
      path: null,
      publicUrl: null,
    };
  }

  if (file.size > maxLogoBytes) {
    return {
      ok: false,
      code: "logo_too_large",
      path: null,
      publicUrl: null,
    };
  }

  const ext = extensionForFile(file);
  const path = `${userId}/${Date.now()}-${slug}.${ext}`;

  const { error } = await supabase.storage
    .from("partners")
    .upload(path, file, {
      cacheControl: "86400",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return {
      ok: false,
      code: error.message.toLowerCase().includes("bucket not found")
        ? "bucket_missing"
        : "upload_failed",
      path: null,
      publicUrl: null,
    };
  }

  const { data } = supabase.storage.from("partners").getPublicUrl(path);

  return {
    ok: true,
    code: null,
    path,
    publicUrl: data.publicUrl,
  };
}

function revalidatePartners() {
  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/admin");
  revalidatePath("/admin/partners");
}

function nullableString(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

function normalizeWebsite(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return "invalid" as const;
    return parsed.toString();
  } catch {
    return "invalid" as const;
  }
}

function parseOrder(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0"));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function extensionForFile(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
  return "jpg";
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",
    и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
    с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
    щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
