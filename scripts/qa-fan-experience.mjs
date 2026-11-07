import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMatchCalendar, escapeIcsText, foldIcsLine, isCalendarEligible } from "../lib/match-calendar.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let passed = 0;
let failed = 0;
const check = (name, test) => {
  try { test(); console.log(`PASS  ${name}`); passed++; }
  catch (error) { console.error(`FAIL  ${name}: ${error.message}`); failed++; }
};
const now = new Date("2026-11-07T08:00:00.000Z");
const fixture = {
  id: 124, status: "scheduled", kickoff: "2026-11-08T10:00:00.000Z", updated_at: "2026-11-06T12:00:00.000Z",
  home: { name: "FC Edineț", home_stadium: "Stadionul Edineț" },
  away: { name: "CS Atlètic; Vorona, A" },
  competition: { name: "Liga 2" }, round: "Тур 16", stadium: "Stadionul Edineț",
};
const calendar = () => createMatchCalendar([fixture], "https://fc-edinet.vercel.app", { now });
check("One event contains a stable event UID and RFC 5545 headers", () => {
  const body = calendar();
  assert.match(body, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(body, /UID:fc-edinet-match-124@fc-edinet\.vercel\.app/);
  assert.match(body, /BEGIN:VEVENT/);
  assert.match(body, /END:VCALENDAR\r\n$/);
});
check("Accurate UTC kickoff and approximately two-hour calendar slot", () => {
  assert.match(calendar(), /DTSTART:20261108T100000Z/);
  assert.match(calendar(), /DTEND:20261108T120000Z/);
  assert.match(calendar(), /LAST-MODIFIED:20261106T120000Z/);
});
check("Reminder fires one hour before kickoff", () => {
  assert.match(calendar(), /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT60M/);
});
check("Real home venue overrides the home team's default", () => {
  const changed = { ...fixture, stadium: "Another Ground" };
  assert.match(createMatchCalendar([changed], "https://fc-edinet.vercel.app", { now }), /LOCATION:Another Ground/);
});
check("No fictitious confirmed dates for postponed/finished/live/expired fixtures", () => {
  for (const status of ["postponed", "finished", "live"])
    assert.equal(isCalendarEligible({ ...fixture, status }, now), false);
  assert.equal(isCalendarEligible({ ...fixture, kickoff: "2026-11-06T00:00:00.000Z" }, now), false);
  assert.doesNotMatch(createMatchCalendar([{ ...fixture, status: "postponed" }], "https://fc-edinet.vercel.app", { now }), /BEGIN:VEVENT/);
});
check("Different future fixtures are sorted by kickoff and bounded in feed query", () => {
  const body = createMatchCalendar([{ ...fixture, id: 99, kickoff: "2026-11-10T10:00:00Z" }, fixture], "https://fc-edinet.vercel.app", { now });
  assert.ok(body.indexOf("UID:fc-edinet-match-124") < body.indexOf("UID:fc-edinet-match-99"));
  assert.match(read("app/api/calendar/route.ts"), /\.limit\(100\)/);
});
check("HTML, line breaks, comma, semicolon and backslash cannot inject ICS properties", () => {
  const body = createMatchCalendar([{ ...fixture, home: { name: "HOME\r\nBEGIN:VEVENT;X,\\" } }], "https://fc-edinet.vercel.app", { now });
  assert.equal((body.match(/BEGIN:VEVENT\r\n/g) || []).length, 1);
  assert.match(body, /\\nBEGIN:VEVENT\\;X\\,\\\\/);
  assert.equal(escapeIcsText("A\rB\nC"), "A\\nB\\nC");
});
check("UTF-8 iCalendar lines fold to 75 octets or less", () => {
  const long = foldIcsLine(`DESCRIPTION:${"Șтефан-Данилă;".repeat(20)}`);
  assert.ok(long.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75));
  assert.equal(long.replace(/\r\n /g, ""), `DESCRIPTION:${"Șтефан-Данилă;".repeat(20)}`);
});
check("Romanian calendar translation is available without depending on cookies", () => {
  const ro = createMatchCalendar([fixture], "https://fc-edinet.vercel.app", { now, locale: "ro" });
  assert.match(ro, /CALSCALE:GREGORIAN/);
  assert.match(ro, /Durata din calendar/);
  assert.match(read("app/api/calendar/route.ts"), /searchParams\.get\("lang"\) === "ro"/);
});
check("Calendar endpoint reads only public match fields and blocks invalid IDs", () => {
  const list = read("app/api/calendar/route.ts");
  const single = read("app/api/calendar/[id]/route.ts");
  for (const source of [list, single]) {
    assert.match(source, /createPublicClient\(\)/);
    assert.match(source, /Content-Type.*text\/calendar/);
    assert.match(source, /no-store/);
    assert.doesNotMatch(source, /service_role|SUPABASE_SECRET/);
  }
  assert.match(single, /\^\[1-9\]\\d\{0,15\}\$/);
  assert.match(single, /isCalendarEligible/);
  assert.match(single, /status: 409/);
});
check("Public calendar and match page link to calendar downloads", () => {
  assert.match(read("app/matches/page.tsx"), /\/api\/calendar\?lang=/);
  assert.match(read("app/matches/page.tsx"), /\/api\/calendar\/\$\{match\.id\}/);
  assert.match(read("app/matches/[id]/page.tsx"), /fanMatchHeroActions/);
  assert.match(read("app/matches/[id]/page.tsx"), /<MatchShareButton/);
});
check("Native sharing falls back to copying and never loads trackers", () => {
  const source = read("app/matches/MatchShareButton.tsx");
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /window\.prompt/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /facebook\.com\/sharer|analytics\.track|window\.location\.assign/);
});
check("New fan styles are route-scoped without additional global imports or !important", () => {
  const css = read("app/matches/fan-actions.css");
  assert.doesNotMatch(css, /!important/);
  assert.match(read("app/matches/page.tsx"), /import "\.\/fan-actions\.css"/);
  assert.match(read("app/matches/[id]/page.tsx"), /import "\.\.\/fan-actions\.css"/);
  assert.doesNotMatch(read("app/layout.tsx"), /fan-actions/);
});
check("Site version is consistent with new release and routes", () => {
  assert.equal(JSON.parse(read("package.json")).version, "2.30.13");
  assert.ok(read("lib/release.ts").includes(`RELEASE_VERSION = "${JSON.parse(read("package.json")).version}"`));
  assert.ok(fs.existsSync(path.join(root, "app/api/calendar/[id]/route.ts")));
});
console.log(`\nFan Experience QA: ${passed}/${passed + failed} passed.`);
if (failed) process.exitCode = 1;
