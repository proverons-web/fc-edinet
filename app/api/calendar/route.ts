import { createPublicClient } from "@/lib/supabase/public";
import { createMatchCalendar, type CalendarFixture } from "@/lib/match-calendar";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** Public subscription feed. Calendar apps refresh this address periodically. */
export async function GET(request: Request) {
  const db = createPublicClient();
  const { data, error } = await db.from("matches")
    .select(`id,kickoff,updated_at,status,stadium,round,original_kickoff,schedule_reason_ru,schedule_reason_ro,
      home:teams!matches_home_team_id_fkey(name,home_stadium),
      away:teams!matches_away_team_id_fkey(name),
      competition:competitions!matches_competition_id_fkey(name)`)
    .or(`and(status.eq.scheduled,kickoff.gte.${new Date().toISOString()}),and(status.in.(postponed,cancelled),updated_at.gte.${new Date(Date.now()-90*24*60*60*1000).toISOString()})`)
    .order("kickoff", { ascending: true }).limit(100);
  if (error) return new Response("Calendar temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  const locale = new URL(request.url).searchParams.get("lang") === "ro" ? "ro" : "ru";
  const calendar = createMatchCalendar((data ?? []) as unknown as CalendarFixture[], getSiteUrl(), { locale, includeStatusChanges:true });
  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="fc-edinet-fixtures.ics"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
