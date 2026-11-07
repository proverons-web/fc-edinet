import fs from "node:fs";
import assert from "node:assert/strict";
import { extractYouTubeId, videoKindLabel, isVideoKind } from "../lib/media-video.ts";
const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const checks = [
  ["Schema adds video-to-match FK", () => read("database/075_media_match_videos.sql").includes("REFERENCES public.matches(id) ON DELETE SET NULL")],
  ["Schema adds category check", () => read("database/075_media_match_videos.sql").includes("media_videos_kind_check")],
  ["SQL migration retains old videos", () => !/\bDROP TABLE\b|\bDELETE FROM\b/i.test(read("database/075_media_match_videos.sql"))],
  ["New video form has match selection", () => read("app/components/MediaVideoForm.tsx").includes('name="match_id"')],
  ["New video form has category", () => read("app/components/MediaVideoForm.tsx").includes('name="video_kind"')],
  ["Editor form exists", () => read("app/components/MediaVideoEditorForm.tsx").includes("useActionState(updateVideo")],
  ["Editor route is protected", () => read("app/admin/media/videos/[id]/edit/page.tsx").includes("await requireEditor()")],
  ["Server validates chosen match", () => read("app/admin/media/actions.ts").includes("await validateMatchSelection(supabase, formData.get(\"match_id\"))")],
  ["Server validates video kind", () => read("app/admin/media/actions.ts").includes("if (!isVideoKind(videoKind))")],
  ["Server rejects non-YouTube links", () => extractYouTubeId("https://youtube.com.attacker.com/watch?v=dQw4w9WgXcQ") === null],
  ["Server extracts watch ID", () => extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20") === "dQw4w9WgXcQ"],
  ["Server extracts shorts ID", () => extractYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ") === "dQw4w9WgXcQ"],
  ["Server rejects bad ID", () => extractYouTubeId("https://youtu.be/short") === null],
  ["Category translates RU/RO", () => videoKindLabel("highlights", "ru") === "Обзор матча" && videoKindLabel("highlights", "ro") === "Rezumat video"],
  ["Unknown category safely handled", () => !isVideoKind("hack") && videoKindLabel("hack", "ru") === "Видео"],
  ["Public query filters unpublished videos", () => read("app/matches/[id]/page.tsx").includes('.eq("match_id", id).eq("is_published", true)')],
  ["Public match has video section", () => read("app/matches/[id]/page.tsx").includes('id="match-videos"')],
  ["Media index links to edit route", () => read("app/admin/media/page.tsx").includes('/admin/media/videos/${video.id}/edit')],
  ["Media page links to match", () => read("app/components/ManagedPageCanvas.tsx").includes('href={`/matches/${video.match_id}`}')],
  ["Version constant updated", () => read("lib/release.ts").includes('RELEASE_VERSION = "2.30.4"')],
  ["Package updated", () => JSON.parse(read("package.json")).version === "2.30.4"],
];
let pass=0;
for(const [name, fn] of checks) { const ok = fn(); assert.ok(ok,name); console.log(`PASS ${name}`); pass++; }
console.log(`Video Match Center v2.30.4: ${pass}/${checks.length} checks passed.`);
