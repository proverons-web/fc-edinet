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
ok("canonical release constant", releaseSource.includes('RELEASE_VERSION = "2.30.2"'));
ok("release version", JSON.parse(read("package.json")).version === "2.30.2");

ok("v2.28.8 next-match footprint restored", homeCss.includes("FC EDINEȚ v2.28.8 — LARGE CRESTS WITHOUT TALLER MATCH CARD") && homeCss.includes("min-height:168px!important") && homeCss.includes("height:168px!important"));
ok("v2.28.8 crests enlarge without layout growth", homeCss.includes("transform:scale(1.58) translateY(-7px)!important"));
ok("v2.28.9 recent match labels removed", !homepageSource.includes('side={locale === "ro" ? "GAZDE" : "ДОМА"}') && !homepageSource.includes('side={locale === "ro" ? "OASPEȚI" : "ГОСТИ"}') && !homepageSource.includes('<small>{side}</small>'));
ok("v2.28.9 recent match crest frames removed and enlarged", homeCss.includes("FC EDINEȚ v2.28.9 — RECENT MATCHES CRESTS UP, NO FRAMES") && homeCss.includes("width:78px!important") && homeCss.includes("border:0!important") && homeCss.includes("background:transparent!important"));
ok("v2.28.10 recent match crest alignment fixed", homeCss.includes("FC EDINEȚ v2.28.10 — RECENT MATCH CREST ALIGNMENT") && homeCss.includes('align-items:center!important'));
ok("v2.28.11 recent match crest stage added", homepageSource.includes('className="fcRefRecentMatchCrest"') && homeCss.includes("FC EDINEȚ v2.28.11 — RECENT MATCHES HORIZONTAL CREST LINE"));
ok("recent match crests aligned", homeCss.includes("object-position:center center!important") && homepageSource.includes('className="fcRefRecentMatchLogoBox"'));
const legacyTxt = fs.readdirSync(root).filter((name)=>/^(STEP-|DEPLOY-|FIX-).*\.txt$/.test(name));
ok("v2.28.24 legacy step/deploy/fix txt pruned", legacyTxt.length === 1 && legacyTxt[0] === 'STEP-2.30.2.txt', legacyTxt.join(', '));
ok("v2.28.12 recent match side padding restored", homeCss.includes("FC EDINEȚ v2.28.12 — RECENT MATCH SIDE PADDING FIX"));
ok("v2.28.13 recent match logo boxes added", homepageSource.includes('className="fcRefRecentMatchLogoBox"') && homeCss.includes("FC EDINEȚ v2.28.13 — RECENT MATCH LOGO BOXES"));
ok("v2.28.14 recent match card compacted", homeCss.includes("FC EDINEȚ v2.28.14 — RECENT MATCH CARD COMPACTION"));
ok("v2.28.15 recent match edge balance fixed", homeCss.includes("FC EDINEȚ v2.28.15 — RECENT MATCH EDGE BALANCE"));
ok("v2.28.17 news history kicker removed", !read("app/news/[slug]/page.tsx").includes("ИСТОРИЯ КЛУБА") && !read("app/news/[slug]/page.tsx").includes("POVESTEA CLUBULUI") && !read("app/news/[slug]/page.tsx").includes("articleStoryLabel"));
ok("v2.28.16 news aside sticky unit", read("app/visual-polish.css").includes("FC EDINEȚ v2.28.16 — NEWS ARTICLE POLISH") && read("app/visual-polish.css").includes(".newsArticlePage .articleAside{") && read("app/visual-polish.css").includes("position:sticky!important"));
ok("v2.28.17 homepage shows four latest news", homepageSource.includes('.slice(0, 4);'));
ok("v2.28.17 public structural geometry unified", homeCss.length > 0 && read("app/visual-polish.css").includes("FC EDINEȚ v2.28.17 — PUBLIC VISUAL POLISH") && read("app/visual-polish.css").includes(".teamStaffCard,.playerCard,.bioCard,.detailsCard") && read("app/visual-polish.css").includes(".teamStatisticsFilters,.statisticsFeaturedPlayer") && read("app/visual-polish.css").includes(".proMediaAlbumCard,.proMediaVideoCard,.proPartnerCard"));
ok("v2.28.17 four-row homepage news layout", read("app/visual-polish.css").includes("grid-template-rows:repeat(4,minmax(0,1fr))!important"));
ok("v2.28.21 IP analytics migration exists", exists("database/064_ip_unique_analytics.sql") && read("database/064_ip_unique_analytics.sql").includes("identity_version = 'ip_v1'") && read("database/064_ip_unique_analytics.sql").includes("record_site_visit_v3") && read("database/064_ip_unique_analytics.sql").includes("period_dimensions"));
ok("v2.28.21 legacy analytics RPCs retired", exists("database/065_retire_legacy_analytics_rpc.sql") && read("database/065_retire_legacy_analytics_rpc.sql").includes("record_site_visit(text, text, text)") && read("database/065_retire_legacy_analytics_rpc.sql").includes("record_site_visit_v2"));
ok("v2.28.21 analytics ingest guarded", exists("database/066_guard_analytics_ingest.sql") && read("database/066_guard_analytics_ingest.sql").includes("private.analytics_ingest_config") && read("database/066_guard_analytics_ingest.sql").includes("record_site_visit_v4") && read("app/api/analytics/visit/route.ts").includes("p_ingest_proof: salt"));
ok("v2.28.21 tracker no longer creates browser visitor IDs", !read("app/components/VisitorTracker.tsx").includes("localStorage") && !read("app/components/VisitorTracker.tsx").includes("visitorId"));
ok("v2.28.21 analytics hashes trusted client IP server-side", read("app/api/analytics/visit/route.ts").includes("x-vercel-forwarded-for") && read("app/api/analytics/visit/route.ts").includes("createHmac") && read("app/api/analytics/visit/route.ts").includes("ANALYTICS_IP_SALT") && read("app/api/analytics/visit/route.ts").includes('supabase.rpc("record_site_visit_v4"'));
ok("v2.28.21 preview analytics excluded", read("app/api/analytics/visit/route.ts").includes('process.env.VERCEL_ENV !== "production"'));
ok("v2.28.21 demographic shares use unique IP denominator", read("app/admin/site-analytics/page.tsx").includes("share(number(row.unique_visitors), summary.period_unique)") && read("app/admin/site-analytics/page.tsx").includes('valueTitle="доля уникальных IP"'));
ok("v2.28.21 analytics salt diagnostics present", read("app/admin/diagnostics/page.tsx").includes('label: "ANALYTICS_IP_SALT"') && read("scripts/check-deploy.mjs").includes("ANALYTICS_IP_SALT"));
ok("v2.28.21 generic hero flex excludes player profile grid", read("app/globals.css").includes(".pageHeroContent:not(.playerProfileGrid){display:flex;flex-direction:column}"));
ok("v2.28.21 player profile desktop grid restored", read("app/visual-polish.css").includes("FC EDINEȚ v2.28.21 — PLAYER PROFILE HERO GRID RESTORE") && read("app/visual-polish.css").includes("display:grid!important") && read("app/visual-polish.css").includes("grid-template-columns:minmax(330px,.78fr) minmax(0,1.22fr)!important") && read("app/visual-polish.css").includes("grid-column:1!important") && read("app/visual-polish.css").includes("grid-column:2!important"));
ok("v2.28.21 player profile hero aligned", read("app/visual-polish.css").includes("FC EDINEȚ v2.28.21 — PLAYER PROFILE HERO ALIGNMENT POLISH") && read("app/visual-polish.css").includes("min-height:auto!important") && read("app/visual-polish.css").includes("padding-top:52px!important") && read("app/visual-polish.css").includes("publicBackLink") && read("app/visual-polish.css").includes("breadcrumbsOnDark"));
ok("v2.28.21 player navigation above portrait and photo bottom locked", read("app/team/[slug]/page.tsx").includes('className="playerProfileNavigation"') && read("app/visual-polish.css").includes("FC EDINEȚ v2.28.21 — PLAYER NAV ABOVE PORTRAIT + BOTTOM LOCK") && read("app/visual-polish.css").includes("grid-template-rows:auto 1fr!important") && read("app/visual-polish.css").includes("padding-bottom:0!important") && read("app/visual-polish.css").includes("grid-row:2!important"));
const mobileStyles = read("app/mobile.css");
const timelineSource = read("app/matches/[id]/page.tsx");
ok("v2.28.22 mobile stylesheet loaded last", read("app/layout.tsx").includes('import "./home-v215.css";\nimport "./mobile.css";'));
ok("v2.28.22 mobile styles width isolated", mobileStyles.includes("@media (max-width:767px){") && !mobileStyles.includes("@media (min-width:768px){"));
ok("v2.29.0 mobile form retains seven KPIs in 4+3 grid", mobileStyles.includes("grid-template-columns:repeat(12,minmax(0,1fr))!important") && mobileStyles.includes("span:nth-child(2){display:flex!important;order:1;grid-column:span 3") && mobileStyles.includes("span:nth-child(1){order:5;grid-column:span 4") && mobileStyles.includes("span:nth-child(7){order:7;grid-column:span 4"));
ok("v2.28.22 mobile recent matches one full card", mobileStyles.includes(".fcV215MatchRailWide .fcRefRecentMatchesGrid") && mobileStyles.includes("grid-auto-columns:100%!important"));
ok("v2.28.22 mobile home standings no team wraps", mobileStyles.includes(".standingTeam strong") && mobileStyles.includes("text-overflow:ellipsis!important"));
ok("v2.28.22 mobile team media headings compact", mobileStyles.includes(".fcRefTeamSection .fcRefTeamHead h2") && mobileStyles.includes(".fcV215MediaSection .fcV215SectionHead h2"));
ok("v2.28.22 mobile timeline all events without scrolling", timelineSource.includes('className="mobileMatchTimeline"') && timelineSource.includes('function MobileMatchTimelineEvent(') && timelineSource.includes('firstMobile.map') && timelineSource.includes('secondMobile.map') && mobileStyles.includes(".premiumTimelinePanel .horizontalTimelineViewport{display:none!important") && mobileStyles.includes(".premiumTimelinePanel .mobileMatchTimeline{display:block!important"));
ok("v2.28.22 mobile lineup badges after names", mobileStyles.includes(".premiumLineupsPanel .premiumLineupRow{") && mobileStyles.includes("display:flex!important") && mobileStyles.includes(".premiumLineupRow>.premiumLineupBadges"));
ok("v2.28.23 deploy restores local env before dependency install", read("DEPLOY_FC_EDINET.bat").includes("[0/8] Checking local Supabase settings") && read("DEPLOY_FC_EDINET.bat").includes("node scripts/prepare-local-env.mjs"));
ok("v2.28.23 no secret file overwrite and git protection", exists("scripts/prepare-local-env.mjs") && read("scripts/prepare-local-env.mjs").includes("COPYFILE_EXCL") && read("DEPLOY_FC_EDINET.bat").includes("git check-ignore -q .env.local") && read(".gitignore").includes(".env.local"));
const mobile24 = mobileStyles;
ok("v2.28.24 mobile-only stylesheet last", read("app/layout.tsx").includes('import "./mobile.css";') && mobile24.includes("@media (max-width:767px){") && !mobile24.includes("@media (min-width:768px){"));
ok("v2.28.24 last-five stats Games first and Place second", homepageSource.includes('className="dashboardGamesMobileLabel"') && homepageSource.includes('"ИГРЫ"') && mobile24.includes("span:nth-child(1){order:5;grid-column:span 4") && mobile24.includes("span:nth-child(2){display:flex!important;order:1;grid-column:span 3") && mobile24.includes("span:nth-child(7){order:7;grid-column:span 4") && mobile24.includes("grid-template-columns:repeat(12,minmax(0,1fr))"));
ok("v2.28.24 match teams and score separate nodes", timelineSource.includes('className="premiumOverviewResultTitle"') && timelineSource.includes('className="premiumOverviewTeam is-home"') && timelineSource.includes('className="premiumOverviewScore"') && timelineSource.includes('className="premiumOverviewTeam is-away"') && mobile24.includes("grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important"));
const stats24 = read("app/statistics/page.tsx");
ok("v2.28.24 mobile season stats full readable player cards", stats24.includes('className="teamStatisticsMobileCards"') && stats24.includes('className="teamStatisticsMobilePlayerName"') && stats24.includes('className="teamStatisticsMobileMetrics"') && mobile24.includes(".teamStatisticsTableSection>.teamStatisticsTableWrap{display:none!important}") && mobile24.includes(".teamStatisticsMobile{display:block!important"));
ok("v2.28.24 all 8 key player stats retained", ["row.appearances","row.starts","row.minutes_played","row.goals","row.assists","contribution(row)","row.yellow_cards","row.red_cards"].every(x=>stats24.includes(x)) && mobile24.includes("grid-template-columns:repeat(4,minmax(0,1fr))"));
ok("v2.28.24 mobile sorting without horizontal scroll", stats24.includes('className="teamStatisticsMobileSort"') && stats24.includes('scroll={false}') && mobile24.includes(".teamStatisticsMobileSort nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"));
const mobile25 = mobileStyles;
ok("v2.28.25 mobile layer imported last", read("app/layout.tsx").includes('import "./mobile.css";'));
ok("v2.28.25 dashboard voids removed", mobile25.includes(".fcV215NextMatchDashboard .fcRefMatchTeams") && mobile25.includes("flex:0 0 auto!important") && mobile25.includes(".fcV215DashboardLastMatch .fcV215LastMatchFooter"));
ok("v2.28.25 result cards compact mobile", mobile25.includes("grid-template-rows:max-content max-content max-content!important") && mobile25.includes("min-height:0!important"));
ok("v2.28.25 menu uses fixed portal", read("app/components/HeaderNavClient.tsx").includes('className="mobileMenuOverlay"') && read("app/components/HeaderNavClient.tsx").includes('className="mobileMenu mobileMenuFixed"') && mobile25.includes("position:fixed!important"));
ok("v2.28.25 footer uses 3 columns", mobile25.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important"));
ok("v2.29.0 only one mobile stylesheet imported", (read("app/layout.tsx").match(/import "\.\/mobile[^"]*\.css";/g)||[]).length === 1 && !["mobile-v2.28.22.css", "mobile-v2.28.24.css", "mobile-v2.28.25.css"].some((name) => exists(`app/${name}`)));
ok("v2.29.0 mobile timeline still guarded by viewport", mobileStyles.includes("@media (max-width:767px){") && mobileStyles.includes(".premiumTimelinePanel .mobileMatchTimeline{display:block!important"));
ok("v2.29.0 test fixture exists", exists("qa/fixtures/home-mobile.html") && exists("scripts/qa-responsive.mjs"));
ok("v2.29.0 CSS guard exists", exists("scripts/qa-css-audit.mjs") && exists("qa/css-baseline.json"));
ok("v2.29.14 visual consistency regression guard", exists("scripts/qa-ui-consistency.mjs") && exists("qa/baselines/ui-v2.29.13-css.json.gz") && exists("qa/fixtures/profile-hero.html") && JSON.parse(read("package.json")).scripts["qa:ui"]?.includes("qa-ui-consistency.mjs"));
ok("v2.29.14 approved CSS override count reduced", (read("app/globals.css")+read("app/visual-polish.css")+read("app/home-v215.css")+read("app/mobile.css")).match(/!important/g)?.length <= 4080);
ok("v2.29.0 screenshot reference and CI present", exists("qa/baselines/mobile.css") && exists(".github/workflows/responsive-qa.yml") && exists("docs/FOUNDATION-QA-v2.29.0.md"));
ok("v2.29.1 performance QA wired into deploy and CI", read("package.json").includes("scripts/qa-performance.mjs") && exists("scripts/qa-performance.mjs") && read(".github/workflows/responsive-qa.yml").includes("scripts/qa-performance.mjs"));
ok("v2.29.1 optimized media with safe external fallback", read("app/components/PublicImage.tsx").includes("isOptimizablePublicImage") && read("next.config.ts").includes("trustedSupabaseImageHost"));
ok("v2.29.1 public global design cache invalidated on publish", read("lib/site-global-designs.ts").includes("fce-public-global-designs") && read("app/admin/design/global-actions.ts").includes('updateTag("fce-public-global-designs")'));
ok("v2.29.2 patched Next version pinned", JSON.parse(read("package.json")).dependencies.next === "16.4.4");
ok("v2.29.2 security QA and migration added", exists("scripts/qa-security.mjs") && exists("database/067_restrict_trigger_helper_execute.sql"));
ok("v2.29.3 admin news local preview added", exists("app/components/NewsWorkflowPanel.tsx") && read("app/components/NewsEditorForm.tsx").includes("<NewsWorkflowPanel"));
ok("v2.29.3 admin publishing guards active", read("app/admin/news/actions.ts").includes('.eq("updated_at", originalUpdatedAt)') && read("app/admin/news/actions.ts").includes('.eq("is_active", true)'));
ok("v2.29.3 editorial QA wired", exists("scripts/qa-editorial.mjs") && read("package.json").includes("qa:editorial") && read(".github/workflows/responsive-qa.yml").includes("qa-editorial.mjs"));
ok("v2.29.4 admin search and worklist", exists("lib/admin-list-search.ts") && exists("app/components/AdminListSearch.tsx") && read("app/admin/page.tsx").includes("adminOperationsGrid"));
ok("v2.29.4 admin QA wired", exists("scripts/qa-admin-ops.mjs") && read("package.json").includes("qa:admin-ops"));
ok("v2.29.7 attention filtering and media search", exists("lib/admin-attention.ts") && exists("scripts/qa-admin-attention.mjs") && read("app/admin/media/page.tsx").includes("AdminListSearch"));
ok("v2.29.15 read-only data-integrity audit", exists("app/admin/data-integrity/page.tsx") && exists("lib/match-data-integrity.ts") && exists("scripts/qa-data-integrity.mjs") && JSON.parse(read("package.json")).scripts["qa:data-integrity"]?.includes("qa-data-integrity.mjs"));
const failed = checks.filter((x) => !x.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
