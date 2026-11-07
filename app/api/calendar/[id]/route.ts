import { createPublicClient } from "@/lib/supabase/public";
import { createMatchCalendar, isCalendarEligible, type CalendarFixture } from "@/lib/match-calendar";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!/^[1-9]\d{0,15}$/.test(id)) return new Response("Invalid match", { status: 400 });
  const db = createPublicClient();
  const { data, error } = await db.from("matches")
    .select(`id,kickoff,updated_at,status,stadium,round,
      home:teams!matches_home_team_id_fkey(name,home_stadium),
      away:teams!matches_away_team_id_fkey(name),
      competition:competitions!matches_competition_id_fkey(name)`)
    .eq("id", id).maybeSingle();
  if (error) return new Response("Calendar temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!data) return new Response("Match not found", { status: 404 });
  const fixture = data as unknown as CalendarFixture;
  if (!isCalendarEligible(fixture)) return new Response("Match does not have a confirmed future kickoff", { status: 409 });
  const locale = new URL(request.url).searchParams.get("lang") === "ro" ? "ro" : "ru";
  const calendar = createMatchCalendar([fixture], getSiteUrl(), { locale });
  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="fc-edinet-match-${id}.ics"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
