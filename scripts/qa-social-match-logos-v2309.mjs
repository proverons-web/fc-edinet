import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicSocialImageUrl, socialTeamNameFont } from "../lib/social-preview.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const og = read("app/matches/[id]/opengraph-image.tsx");
const helper = read("lib/social-preview.ts");
const site = read("scripts/qa-site.mjs");
let passed = 0, failed = 0;
function check(title, fn) {
  try { fn(); passed++; console.log("PASS", title); }
  catch (error) { failed++; console.error("FAIL", title, error.message); }
}

check("v2.30.19 release is consistent", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.30.19");
  assert.match(read("lib/release.ts"), /RELEASE_VERSION = "2\.30\.19"/);
  assert.match(site, /STEP-2\.30\.19\.txt/);
});
check("only one current installation text file", () => {
  assert.deepEqual(fs.readdirSync(root).filter(x => /^STEP-.*\.txt$/.test(x)), ["STEP-2.30.19.txt"]);
});
check("match OG renders 1200x630 PNG", () => {
  assert.match(og, /width: 1200, height: 630/);
  assert.match(og, /contentType = "image\/png"/);
});
check("logos are queried for both teams", () => {
  assert.match(og, /home:teams![^\n]+logo_url/);
  assert.match(og, /away:teams![^\n]+logo_url/);
});
check("both logos are downloaded concurrently", () => {
  assert.match(og, /Promise\.all\(/);
  assert.match(og, /socialTeamLogoDataUrl\(home\?\.logo_url\)/);
  assert.match(og, /socialTeamLogoDataUrl\(away\?\.logo_url\)/);
});
check("stored user-controlled image URLs are restricted to public Supabase", () => {
  const base="https://example.supabase.co";
  assert.equal(publicSocialImageUrl(base + "/storage/v1/object/public/teams/badge.png", base), base + "/storage/v1/object/public/teams/badge.png");
  assert.equal(publicSocialImageUrl("http://127.0.0.1/", base), null);
  assert.equal(publicSocialImageUrl("https://another.example/badge.png", base), null);
});
check("logo fetch is limited and cannot redirect", () => {
  assert.match(helper, /export async function socialTeamLogoDataUrl/);
  const section=helper.slice(helper.indexOf("export async function socialTeamLogoDataUrl"));
  assert.match(section, /AbortSignal\.timeout\(4500\)/);
  assert.match(section, /redirect: "error"/);
  assert.match(section, /6_000_000/);
  assert.match(section, /limitInputPixels: 24_000_000/);
});
check("PNG/JPEG/WebP supported", () => {
  const section=helper.slice(helper.indexOf("export async function socialTeamLogoDataUrl"));
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.ok(section.includes(type), type);
});
check("team badge normalized into transparent 200px PNG", () => {
  assert.match(helper, /width: 200, height: 200, fit: "contain"/);
  assert.match(helper, /alpha: 0/);
  assert.match(helper, /\.png\(\{ compressionLevel: 9 \}\)/);
  assert.match(helper, /data:image\/png;base64/);
});
check("the logo slot is big enough", () => {
  assert.match(og, /width: 214, height: 214/);
  assert.match(og, /width=\{178\} height=\{178\}/);
  assert.match(og, /objectFit: "contain"/);
});
check("each team has an equal-width column", () => {
  assert.match(og, /width: 316, minWidth: 316/);
});
check("real logos appear for home and away", () => {
  assert.match(og, /name=\{homeName\} logo=\{homeLogo/);
  assert.match(og, /name=\{awayName\} logo=\{awayLogo/);
});
check("club's own logo has a local fallback", () => {
  assert.match(og, /home\?\.is_club \? crest : null/);
  assert.match(og, /away\?\.is_club \? crest : null/);
  assert.ok(fs.statSync(path.join(root, "public/brand/fc-edinet-crest.png")).size > 10000);
});
check("opponents have an initials fallback", () => {
  assert.match(og, /fallback \|\| name/);
  assert.match(og, /\{letters\}/);
});
check("team names are placed beneath the badges", () => {
  const teamBlock = og.slice(og.indexOf("function TeamBlock("));
  assert.ok(teamBlock.indexOf("{logo ?") < teamBlock.indexOf("{name}"));
  assert.match(teamBlock, /marginTop: 20/);
});
check("long team names fit", () => {
  assert.equal(socialTeamNameFont("FC Edineț"), 34);
  assert.equal(socialTeamNameFont("CF Locomotiva"), 34);
  assert.ok(socialTeamNameFont("Very Long Opponent Club Name That Does Not Fit") < 34);
});
check("score comes from safe match status policy", () => {
  assert.match(og, /matchScoreText\(match \|\| \{\}\)/);
  assert.match(og, /width: 252/);
});
check("existing title / date / competition remain", () => {
  assert.match(og, /competition\?\.name/);
  assert.match(og, /Europe\/Chisinau/);
  assert.match(og, /match\?\.stadium/);
});
check("release change invalidates cached match preview URLs", () => {
  const page = read("app/matches/[id]/page.tsx");
  assert.match(page, /RELEASE_VERSION/);
  assert.match(page, /&r=\$\{RELEASE_VERSION\}/);
});
check("no new SQL migrations", () => {
  assert.equal(fs.existsSync(path.join(root, "database/078_match_social_logos.sql")), false);
});
check("new QA is part of the mandatory pre-deploy gate", () => {
  const scripts = JSON.parse(read("package.json")).scripts;
  assert.match(scripts["deploy:check"], /qa-social-match-logos-v2309\.mjs/);
  assert.match(scripts["qa:all"], /qa:social-logos/);
});
console.log(`\nMatch Social Logos v2.30.19: ${passed}/${passed+failed} checks passed.`);
if (failed) process.exitCode=1;
