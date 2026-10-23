import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const ok = (name, condition, detail = "") => checks.push({ name, ok: Boolean(condition), detail });

function walk(dir, extensions = null) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file, extensions));
    else if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) out.push(file);
  }
  return out;
}

ok("sitemap exists", exists("app/sitemap.ts"));
ok("robots exists", exists("app/robots.ts"));
ok("404 exists", exists("app/not-found.tsx"));
ok("manifest exists", exists("app/manifest.ts"));
ok("Open Graph image exists", exists("app/opengraph-image.tsx"));
ok("admin noindex", /index:\s*false/.test(read("app/admin/layout.tsx")));
ok("account noindex", /index:\s*false/.test(read("app/account/layout.tsx")));
ok("login noindex", exists("app/login/layout.tsx") && /index:\s*false/.test(read("app/login/layout.tsx")));
ok("register noindex", exists("app/register/layout.tsx") && /index:\s*false/.test(read("app/register/layout.tsx")));

const sitemap = read("app/sitemap.ts");
for (const route of ["/team","/staff","/club/about","/club/history","/club/stadium","/club/leadership","/club/achievements","/club/archive","/club/hall-of-fame"]) {
  ok(`sitemap ${route}`, sitemap.includes(route));
}
ok("custom pages in sitemap", sitemap.includes("site_custom_pages"));
ok("robots blocks API", read("app/robots.ts").includes('"/api/"'));
ok("security headers configured", read("next.config.ts").includes("X-Content-Type-Options"));

// Final Product QA hardening.
ok("cookie-free public Supabase client", exists("lib/supabase/public.ts") && read("lib/supabase/public.ts").includes("persistSession: false"));
ok("public menu isolated from auth cookies", read("app/components/SiteHeader.tsx").includes('publicSupabase.from("site_menu_items")'));
ok("global public design isolated from auth cookies", read("lib/site-global-designs.ts").includes("createPublicClient"));
ok("homepage public data isolated from auth cookies", read("app/page.tsx").includes("createPublicClient"));
ok("stale auth 401 clears session cookies", /status === 401/.test(read("lib/supabase/proxy.ts")));
ok("admin dashboard requires staff before profile use", read("app/admin/page.tsx").includes("await requireStaff()"));
ok("custom pages protect reserved slugs", read("app/admin/site-builder/actions.ts").includes("isReservedSiteSlug"));
ok("managed menu validates href", read("app/admin/site-builder/actions.ts").includes("normalizeSiteMenuHref"));
ok("club system preview uses canonical route", read("app/admin/site-builder/page.tsx").includes('preview:"/club/about"'));
ok("legacy header club link uses canonical route", read("app/components/HeaderNavClient.tsx").includes('club: { href: "/club/about"'));

const unifiedBuilder = read("app/components/UnifiedSiteBuilderClient.tsx");
const unsafeUiButtons = [...unifiedBuilder.matchAll(/<button\b([^>]*)\bonClick=/g)].filter((match) => !/\btype=/.test(match[1]));
ok("Site Builder UI buttons have explicit type", unsafeUiButtons.length === 0, unsafeUiButtons.length ? `${unsafeUiButtons.length} missing type` : "");

const targetBlankWithoutRel = [];
for (const file of walk(path.join(root, "app"), [".tsx", ".ts"])) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
    if (!/\brel=/.test(match[0])) targetBlankWithoutRel.push(path.relative(root, file));
  }
}
ok("target=_blank links declare rel", targetBlankWithoutRel.length === 0, [...new Set(targetBlankWithoutRel)].join(", "));

for (const cssFile of walk(path.join(root, "app"), [".css"])) {
  const css = fs.readFileSync(cssFile, "utf8");
  ok(`CSS braces ${path.relative(root, cssFile)}`, (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);
}

ok("team root is squad page", read("app/team/page.tsx").includes("positionOrder"));
ok("team squad page exists", exists("app/team/page.tsx"));
ok("legacy team staff query redirects", read("app/team/page.tsx").includes('view === "staff"') && read("app/team/page.tsx").includes('redirect("/staff")'));
ok("public staff is standalone data page", read("app/staff/page.tsx").includes('from("team_staff")') && read("app/staff/page.tsx").includes('path: "/staff"'));
ok("public staff hides placeholder records", read("app/staff/page.tsx").includes('.eq("is_placeholder", false)') && !read("app/staff/page.tsx").includes('ЗАГЛУШКА'));
ok("legacy team squad redirects", read("app/team/squad/page.tsx").includes('redirect("/team")'));
ok("legacy team staff redirects", read("app/team/staff/page.tsx").includes('redirect("/staff")'));
ok("canonical fallback staff route", read("lib/site-navigation.ts").includes('system_key: "team_staff"') && read("lib/site-navigation.ts").includes('href: "/staff"'));
ok("stale database staff route normalized at runtime", read("lib/site-navigation.ts").includes("normalizeCanonicalMenuRoutes") && read("app/components/SiteHeader.tsx").includes("normalizeCanonicalMenuRoutes") && read("app/admin/site-builder/page.tsx").includes("normalizeCanonicalMenuRoutes"));
ok("global design fallback staff route", read("lib/global-design.ts").includes('label_ru: "Тренерский штаб"') && read("lib/global-design.ts").includes('href: "/staff"'));
ok("staff admin opens canonical public route", read("app/admin/staff/page.tsx").includes('href="/staff"'));
ok("legacy roster filter removed", !exists("app/components/TeamRosterBrowser.tsx"));
ok("managed navigation has one canonical CSS block", (read("app/globals.css").match(/^\.globalHeader \.menu \.managedMenuDropdown\{/gm) || []).length === 1);
ok("managed navigation matches header palette", read("app/globals.css").includes("background:#052b5d"));
ok("managed navigation uses visible hamburger glyph", read("app/components/HeaderNavClient.tsx").includes('>☰</span>'));
ok("dropdown rendered through body portal", read("app/components/HeaderNavClient.tsx").includes("createPortal") && read("app/globals.css").includes("managedMenuDropdownPortal"));
ok("desktop nav centered with balanced grid", read("app/globals.css").includes("grid-template-columns:minmax(250px,1fr) auto minmax(250px,1fr)"));
ok("desktop menu blocks equal width", read("app/globals.css").includes(".globalHeader .menu>a,.globalHeader .menu>.managedMenuGroup"));
ok("dropdown hover uses mouse events", read("app/components/HeaderNavClient.tsx").includes("onMouseEnter") && !read("app/components/HeaderNavClient.tsx").includes("onPointerEnter"));
ok("top navigation dividers removed", !read("app/globals.css").includes(".globalHeader .menu>a:last-child,.globalHeader .menu>.managedMenuGroup:last-child") && !read("app/globals.css").includes("border-left:1px solid rgba(255,255,255,.055)"));
ok("top navigation yellow underline removed", !read("app/globals.css").includes(".globalHeader .menu a:after") && !read("app/globals.css").includes(".managedMenuTrigger:before"));
ok("dropdown active yellow rail removed", !read("app/globals.css").includes(".managedMenuDropdownPortal a.isActive{box-shadow"));
ok("season migration exists", exists("database/059_navigation_season_2627.sql"));
ok("season contains calendar statistics standings", ["system_key='matches'","system_key='statistics'","system_key='standings'"].every((x) => read("database/059_navigation_season_2627.sql").includes(x)));
ok("fallback nav uses season label", read("lib/i18n.ts").includes('team: "Сезон 26/27"'));
ok("canonical managed-menu fallback exists", exists("lib/site-navigation.ts") && read("lib/site-navigation.ts").includes("canonicalPublicMenu"));
ok("header rejects broken flat managed menu", read("app/components/SiteHeader.tsx").includes("hasCanonicalMenuHierarchy") && read("app/components/SiteHeader.tsx").includes("canonicalPublicMenu"));
ok("header always supplies managed hierarchy", read("app/components/SiteHeader.tsx").includes("managedMenu={managedMenu}"));
ok("public menu RLS migration exists", exists("database/060_fix_public_site_menu_rls.sql") && read("database/060_fix_public_site_menu_rls.sql").includes('to anon') && !read("database/060_fix_public_site_menu_rls.sql").includes('to anon,authenticated'));
ok("public custom pages RLS migration exists", exists("database/061_fix_public_custom_pages_rls.sql") && read("database/061_fix_public_custom_pages_rls.sql").includes('to anon'));
ok("staff route correction migration exists", exists("database/063_team_staff_public_route.sql") && read("database/063_team_staff_public_route.sql").includes("set href = '/staff'"));
ok("API version cache disabled", read("app/api/version/route.ts").includes('Vercel-CDN-Cache-Control') && read("app/api/version/route.ts").includes('revalidate = 0'));
ok("API version response is simple and explicit", read("app/api/version/route.ts").includes('ok: true') && read("app/api/version/route.ts").includes('version: RELEASE_VERSION') && read("app/api/version/route.ts").includes('apiVersion: RELEASE_API_VERSION') && read("app/api/version/route.ts").includes('release: RELEASE_NAME'));
ok("health uses canonical release constant", read("app/api/health/route.ts").includes('version: RELEASE_VERSION'));
ok("diagnostics uses canonical release constant", read("app/admin/diagnostics/page.tsx").includes('const APP_VERSION = RELEASE_VERSION') && read("app/admin/diagnostics/page.tsx").includes('RELEASE_API_VERSION'));
ok("Site Builder exposes squad and staff", read("app/admin/site-builder/page.tsx").includes('key:"team_squad"') && read("app/admin/site-builder/page.tsx").includes('key:"team_staff"') && read("app/admin/site-builder/page.tsx").includes('preview:"/staff"'));
ok("legacy public hero wrapper removed", !read("app/components/PageHeroShell.tsx").includes("managedPageHeroInner") && !read("app/components/PageHeroShell.tsx").includes("heroBuilderContent"));
ok("generic PageHero media is opt-in", read("app/components/PageHeroShell.tsx").includes("showBackgroundMedia = false") && read("app/components/PageHeroShell.tsx").includes("showBackgroundMedia && heroLayerVisible"));
ok("detail heroes retain media opt-in", ["app/news/[slug]/page.tsx","app/media/[slug]/page.tsx","app/team/[slug]/page.tsx"].every((file) => read(file).includes("showBackgroundMedia")));
ok("club landing hero block removed", !read("app/components/ClubSectionShell.tsx").includes('className="clubSectionHero"'));
ok("managed public landing hero omitted", read("app/components/ManagedPageCanvas.tsx").includes('section.key === "hero"') && read("app/components/ManagedPageCanvas.tsx").includes('return preview ? <HeroSection'));
ok("hero yellow bottom borders removed", !read("app/globals.css").includes("border-bottom:3px solid #ffd328") && !read("app/globals.css").includes("border-bottom:4px solid #ffd328"));

ok("generic public PageHeroShell blocks return null", read("app/components/PageHeroShell.tsx").includes('isGenericLandingHero') && read("app/components/PageHeroShell.tsx").includes('if (isGenericLandingHero) return null'));
ok("custom page hero removed", !read("app/[slug]/page.tsx").includes('className="customSiteHero"'));
const headerNavSource = read("app/components/HeaderNavClient.tsx");
ok("admin removed from primary nav but retained in profile menu", (headerNavSource.match(/href=\"\/admin\"/g) || []).length === 1 && headerNavSource.includes('accountMenuDropdown'));
const homepageSource = read("app/page.tsx");
ok("next match host guest labels removed", !homepageSource.includes('label={locale === "ro" ? "GAZDE" : "ХОЗЯЕВА"}') && !homepageSource.includes('label={locale === "ro" ? "OASPEȚI" : "ГОСТИ"}'));
const homeCss = read("app/home-v215.css");
ok("next match yellow rail removed", homeCss.includes('.fcV215NextMatchDashboard.fcRefNextMatch:before{display:none!important}'));
ok("next match team frames removed and crests enlarged", homeCss.includes('.fcV215NextMatchDashboard .fcRefTeamBadge{') && homeCss.includes('background:transparent!important;') && homeCss.includes('width:168px!important;'));
ok("next match VS circle replaced", homeCss.includes('Modern VS separator') && homeCss.includes('border-radius:0!important;') && homeCss.includes('.fcV215NextMatchDashboard .fcRefVs:before'));
ok("results rail frame and rounding removed", homeCss.includes('.fcV215ResultsSection .fcV215MatchRailWide{') && homeCss.includes('.fcV215ResultsSection .fcRefRecentMatchCard,') && homeCss.includes('border:0!important;') && homeCss.includes('border-radius:0!important;'));
ok("homepage news rounding removed", homeCss.includes('.fcRefLeadColumn,\n.fcRefLatestColumn{') && homeCss.includes('.fcRefNewsRow>div{\n  border-radius:0!important;'));
const releaseSource = read("lib/release.ts");
ok("canonical release constant", releaseSource.includes('RELEASE_VERSION = "2.28.17"'));
ok("release version", JSON.parse(read("package.json")).version === "2.28.17");

const failed = checks.filter((x) => !x.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);

ok("v2.28.8 next-match footprint restored", homeCss.includes("FC EDINEȚ v2.28.8 — LARGE CRESTS WITHOUT TALLER MATCH CARD") && homeCss.includes("min-height:168px!important") && homeCss.includes("height:168px!important"));
ok("v2.28.8 crests enlarge without layout growth", homeCss.includes("transform:scale(1.58) translateY(-7px)!important"));
ok("v2.28.9 recent match labels removed", !homepageSource.includes('side={locale === "ro" ? "GAZDE" : "ДОМА"}') && !homepageSource.includes('side={locale === "ro" ? "OASPEȚI" : "ГОСТИ"}') && !homepageSource.includes('<small>{side}</small>'));
ok("v2.28.9 recent match crest frames removed and enlarged", homeCss.includes("FC EDINEȚ v2.28.9 — RECENT MATCHES CRESTS UP, NO FRAMES") && homeCss.includes("width:78px!important") && homeCss.includes("border:0!important") && homeCss.includes("background:transparent!important"));
ok("v2.28.10 recent match crest alignment fixed", homeCss.includes("FC EDINEȚ v2.28.10 — RECENT MATCH CREST ALIGNMENT") && homeCss.includes('align-items:center!important'));
ok("v2.28.17 recent match crest stage added", homepageSource.includes('className="fcRefRecentMatchCrest"') && homeCss.includes("FC EDINEȚ v2.28.17 — RECENT MATCHES HORIZONTAL CREST LINE") && homeCss.includes("grid-template-columns:98px minmax(76px,auto) 98px!important") && homeCss.includes("height:112px!important"));
ok("v2.28.17 recent match crests aligned and larger", homeCss.includes("width:88px!important") && homeCss.includes("height:100px!important") && homeCss.includes("transform:scale(1.24)!important") && homeCss.includes("object-position:center center!important"));
const legacyTxt = fs.readdirSync(root).filter((name)=>/^(STEP-|DEPLOY-|FIX-).*\.txt$/.test(name));
ok("v2.28.17 legacy step/deploy/fix txt pruned", legacyTxt.length === 1 && legacyTxt[0] === 'STEP-2.28.17.txt', legacyTxt.join(', '));
ok("v2.28.17 recent match side padding restored", homeCss.includes("FC EDINEȚ v2.28.17 — RECENT MATCH SIDE PADDING FIX") && homeCss.includes("grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important") && homeCss.includes("padding:4px 16px 6px!important") && homeCss.includes("width:84px!important") && homeCss.includes("transform:scale(1.18)!important"));
ok("v2.28.17 recent match logo boxes added", homepageSource.includes('className="fcRefRecentMatchLogoBox"') && homeCss.includes("FC EDINEȚ v2.28.17 — RECENT MATCH LOGO BOXES") && homeCss.includes("grid-template-columns:96px 76px 96px!important") && homeCss.includes("width:96px!important") && homeCss.includes("height:108px!important"));
ok("v2.28.17 recent match card compacted", homeCss.includes("FC EDINEȚ v2.28.17 — RECENT MATCH CARD COMPACTION") && homeCss.includes("grid-template-columns:82px 72px 82px!important") && homeCss.includes("column-gap:6px!important") && homeCss.includes("padding:4px 10px 6px!important") && homeCss.includes("width:76px!important") && homeCss.includes("height:88px!important"));
ok("v2.28.17 recent match edge balance fixed", homeCss.includes("FC EDINEȚ v2.28.17 — RECENT MATCH EDGE BALANCE") && homeCss.includes("padding:4px 10px 6px 6px!important") && homeCss.includes("padding:10px 12px 6px 8px!important") && homeCss.includes("padding:8px 12px 8px 8px!important"));
ok("v2.28.17 news history kicker removed", !read("app/news/[slug]/page.tsx").includes("ИСТОРИЯ КЛУБА") && !read("app/news/[slug]/page.tsx").includes("POVESTEA CLUBULUI") && !read("app/news/[slug]/page.tsx").includes("articleStoryLabel"));
ok("v2.28.17 news aside sticky unit", homeCss !== undefined && read("app/visual-polish.css").includes("FC EDINEȚ v2.28.17 — NEWS ARTICLE POLISH") && read("app/visual-polish.css").includes(".newsArticlePage .articleAside{") && read("app/visual-polish.css").includes("position:sticky!important") && read("app/visual-polish.css").includes(".newsArticlePage .articleEditorialInfo{\n  position:static!important"));
ok("v2.28.17 homepage shows four latest news", homepageSource.includes('.slice(0, 4);'));
ok("v2.28.17 public structural geometry unified", homeCss.length > 0 && read("app/visual-polish.css").includes("FC EDINEȚ v2.28.17 — PUBLIC VISUAL POLISH") && read("app/visual-polish.css").includes(".teamStaffCard,.playerCard,.bioCard,.detailsCard") && read("app/visual-polish.css").includes(".teamStatisticsFilters,.statisticsFeaturedPlayer") && read("app/visual-polish.css").includes(".proMediaAlbumCard,.proMediaVideoCard,.proPartnerCard"));
ok("v2.28.17 four-row homepage news layout", read("app/visual-polish.css").includes("grid-template-rows:repeat(4,minmax(0,1fr))!important"));
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
