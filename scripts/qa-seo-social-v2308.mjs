import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { socialText, socialFontSize, socialDate, publicSocialImageUrl, SOCIAL_IMAGE_SIZE } from "../lib/social-preview.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); console.log("PASS", name); passed++; }
  catch (error) { console.error("FAIL", name, error.message); failed++; }
}
const news = read("app/news/[slug]/page.tsx");
const newsOg = read("app/news/[slug]/opengraph-image.tsx");
const album = read("app/media/[slug]/page.tsx");
const albumOg = read("app/media/[slug]/opengraph-image.tsx");
const match = read("app/matches/[id]/page.tsx");
const matchOg = read("app/matches/[id]/opengraph-image.tsx");
const renderer = read("lib/social-image.tsx");
const seo = read("lib/seo.ts");
const site = read("lib/site-url.ts");
const base = "https://example.supabase.co";

check("social images use standard 1200x630", () => assert.deepEqual(SOCIAL_IMAGE_SIZE, { width: 1200, height: 630 }));
check("HTML tags stripped from preview copy", () => assert.equal(socialText("<b> FC </b> Edineț "), "FC Edineț"));
check("entities and multiline whitespace normalized", () => assert.equal(socialText("One&nbsp; &amp;   two\n lines"), "One & two lines"));
check("long headlines are bounded without split surrogates", () => { const title = "Турнирный матч Единец ".repeat(20); const out = socialText(title, 83); assert.ok(out.length <= 83); assert.ok(out.endsWith("…")); });
check("font size reduces as headlines grow", () => assert.ok(socialFontSize("Short") > socialFontSize("a".repeat(115))));
check("date is fixed to Moldova not server locale", () => assert.equal(socialDate("2026-11-07T10:20:00Z"), "07.11.2026"));
check("invalid dates never break preview", () => assert.equal(socialDate("invalid"), "FC EDINEȚ"));
check("only HTTPS public Supabase storage accepted", () => assert.equal(publicSocialImageUrl(`${base}/storage/v1/object/public/news/one.jpg`, base), `${base}/storage/v1/object/public/news/one.jpg`));
check("private buckets are rejected", () => assert.equal(publicSocialImageUrl(`${base}/storage/v1/object/sign/private/one.jpg`, base), null));
check("different hosts are rejected", () => assert.equal(publicSocialImageUrl("https://evil.example/a.jpg", base), null));
check("unsafe protocols are rejected", () => assert.equal(publicSocialImageUrl("javascript:alert(1)", base), null));
check("credentials or arbitrary ports rejected", () => { assert.equal(publicSocialImageUrl("https://x@example.supabase.co/storage/v1/object/public/a.jpg", base), null); assert.equal(publicSocialImageUrl("https://example.supabase.co:444/storage/v1/object/public/a.jpg", base), null); });
check("preview photo download is bounded and catches failures", () => { const src = read("lib/social-preview.ts"); assert.match(src, /AbortSignal\.timeout\(4500\)/); assert.match(src, /6_000_000/); assert.match(src, /catch \{ return null; \}/); });
check("WebP thumbnails are transcoded for Satori", () => { const src = read("lib/social-preview.ts"); assert.match(src, /type === "image\/webp"/); assert.match(src, /\.jpeg\(\{ quality: 82 \}\)/); assert.equal(JSON.parse(read("package.json")).dependencies.sharp, "0.35.5"); });
check("image rendering has branded fallback", () => { assert.match(renderer, /photo \? <img/); assert.match(renderer, /src=\{crest\}/); assert.match(renderer, /SOCIAL_IMAGE_SIZE/); });
check("news OG is dynamic and only for published articles", () => { assert.match(newsOg, /force-dynamic/); assert.match(newsOg, /\.eq\("status", "published"\)/); assert.match(newsOg, /\.lte\("published_at"/); });
check("album OG is dynamic and only for published albums", () => { assert.match(albumOg, /force-dynamic/); assert.match(albumOg, /\.eq\("is_published", true\)/); });
check("news metadata uses branded card with update-versioned URL", () => { assert.match(news, /opengraph-image\?v=\$\{encodeURIComponent\(article\.updated_at/); assert.match(news, /imageWidth: 1200/); });
check("album metadata uses branded card with update-versioned URL", () => { assert.match(album, /opengraph-image\?v=\$\{encodeURIComponent\(data\.updated_at/); assert.match(album, /imageHeight: 630/); });
check("match card uses live public data and existing safe score policy", () => { assert.match(matchOg, /force-dynamic/); assert.match(matchOg, /matchScoreText\(match \|\| \{\}\)/); assert.match(matchOg, /socialTeamLogoDataUrl/); });
check("match metadata points to cache-busted card", () => { assert.match(match, /opengraph-image\?v=\$\{encodeURIComponent\(match\.updated_at/); assert.match(match, /imageWidth: 1200/); });
check("Open Graph and Twitter card share same absolute image URL", () => { assert.match(seo, /images: \[\{ url: imageUrl/); assert.match(seo, /images: \[imageUrl\]/); assert.match(seo, /alternates: \{ canonical \}/); });
check("production domain outranks preview deployment host", () => { const p = site.indexOf('process.env.VERCEL_PROJECT_PRODUCTION_URL'); const q = site.indexOf('process.env.NEXT_PUBLIC_VERCEL_URL'); assert.ok(p !== -1 && q !== -1 && p < q); });
check("no new DB migrations required", () => assert.equal(fs.existsSync(path.join(root, "database/078_social_preview.sql")), false));
check("new QA included in release gate", () => { const scripts = JSON.parse(read("package.json")).scripts; assert.match(scripts["deploy:check"], /qa-seo-social-v2308\.mjs/); assert.match(scripts["qa:all"], /qa:seo-social/); });
check("release and installer consistency", () => { assert.equal(JSON.parse(read("package.json")).version, "2.30.18"); assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.18"/); assert.match(read("scripts/qa-site.mjs"), /STEP-2\.30\.18\.txt/); });
console.log(`\nSEO & Social Sharing v2.30.18: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exitCode = 1;
