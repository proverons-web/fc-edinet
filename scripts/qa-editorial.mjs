import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const form = read("app/components/NewsEditorForm.tsx");
const panel = read("app/components/NewsWorkflowPanel.tsx");
const actions = read("app/admin/news/actions.ts");
const css = read("app/globals.css");
const checks = [];
const ok = (label, passed) => checks.push({ label, passed: Boolean(passed) });

ok("news draft preview is local and has no publication side effects", panel.includes('function NewsWorkflowPanel') && panel.includes("useState(false)") && !panel.includes("fetch(") && !panel.includes("saveNews(") && !panel.includes("window.open"));
ok("news preview supports RU/RO and desktop/mobile", panel.includes('PreviewLanguage = "ru" | "ro"') && panel.includes('PreviewDevice = "desktop" | "mobile"') && panel.includes('aria-pressed={language === "ro"}') && panel.includes('aria-pressed={device === "mobile"}'));
ok("draft readiness covers title slug category and body", ["Заголовок RU", "Адрес / slug", "Категория", "Текст RU"].every((value) => panel.includes(value)));
ok("RO fallback and manual translation lock called out", panel.includes("roLocked") && panel.includes("RU fallback") && form.includes("checked={roLocked}"));
ok("preview receives live controlled fields", ["value={excerpt}", "value={content}", "value={titleRo}", "value={excerptRo}", "value={contentRo}", "value={categoryId}"].every((value) => form.includes(value)) && form.includes("<NewsWorkflowPanel"));
ok("publish and review buttons enforce required-field readiness", form.includes("readyForReview") && form.includes("disabled={pending || !readyForReview}"));
ok("news editor warns on unsaved refresh", form.includes("beforeunload") && form.includes("setDirty(true)"));
ok("publish and live save require explicit confirmation", form.includes('intent === "publish"') && form.includes('article?.status === "published"') && form.includes("window.confirm(message)"));
ok("client sends original update timestamp", form.includes('name="article_updated_at"') && actions.includes('formData.get("article_updated_at")'));
ok("server detects outdated drafts before uploads", actions.includes("originalUpdatedAt !== existing.updated_at") && actions.indexOf("originalUpdatedAt !== existing.updated_at") < actions.indexOf(".upload(path, fileValue"));
ok("update protects against concurrent edits atomically", actions.includes('.eq("updated_at", originalUpdatedAt)') && actions.includes(".maybeSingle()") && actions.includes("изменена в другой вкладке"));
ok("server verifies active category", actions.includes('.from("news_categories")') && actions.includes('.eq("is_active", true)') && actions.includes("Категория недоступна"));
ok("server never accepts forged existing-cover URL", !actions.includes('formData.get("existing_cover_url")') && actions.includes("existing?.cover_image_url ?? null"));
ok("preview has isolated admin-only CSS", css.includes("FC EDINEȚ v2.29.3 — EDITORIAL WORKFLOW") && css.includes(".newsWorkflowPreviewSurface.is-mobile") && !css.includes(".newsArticlePage .newsWorkflowPreview"));

for (const check of checks) console.log(`${check.passed ? "PASS" : "FAIL"}  ${check.label}`);
const passed = checks.filter((check) => check.passed).length;
console.log(`\n${passed}/${checks.length} editorial QA checks passed.`);
if (passed !== checks.length) process.exit(1);
