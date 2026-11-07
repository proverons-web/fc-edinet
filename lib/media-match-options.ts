import type { SupabaseClient } from "@supabase/supabase-js";

export async function mediaMatchOptions(supabase: SupabaseClient) {
  const { data } = await supabase.from("matches")
    .select("id,kickoff,home:teams!matches_home_team_id_fkey(name),away:teams!matches_away_team_id_fkey(name)")
    .order("kickoff", { ascending: false }).limit(150);
  return (data ?? []).map((match) => {
    const home = match.home as unknown as { name: string } | null;
    const away = match.away as unknown as { name: string } | null;
    const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Chisinau" }).format(new Date(match.kickoff));
    return { id: String(match.id), label: `${date} · ${home?.name ?? "—"} — ${away?.name ?? "—"}` };
  });
}
