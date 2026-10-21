import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "FC Edineț — match preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = publicClient();
  let match: any = null;

  if (supabase && /^\d+$/.test(id)) {
    const { data } = await supabase
      .from("matches")
      .select(`id,kickoff,status,home_score,away_score,round,stadium,
        home:teams!matches_home_team_id_fkey(name,short_name,logo_url,is_club),
        away:teams!matches_away_team_id_fkey(name,short_name,logo_url,is_club),
        competition:competitions!matches_competition_id_fkey(name)`)
      .eq("id", id)
      .maybeSingle();
    match = data;
  }

  const home = Array.isArray(match?.home) ? match.home[0] : match?.home;
  const away = Array.isArray(match?.away) ? match.away[0] : match?.away;
  const competition = Array.isArray(match?.competition) ? match.competition[0] : match?.competition;
  const homeName = home?.name || "FC Edineț";
  const awayName = away?.name || "MECI";
  const hasScore = match?.status === "finished" || match?.status === "live";
  const score = hasScore ? `${match?.home_score ?? 0} : ${match?.away_score ?? 0}` : "VS";
  const date = match?.kickoff
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }).format(new Date(match.kickoff))
    : "FC EDINEȚ";
  const crestBytes = await fs.readFile(path.join(process.cwd(), "public", "brand", "fc-edinet-crest.png"));
  const crest = `data:image/png;base64,${crestBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(135deg,#020e21 0%,#031a38 58%,#0755a5 100%)", color: "white", padding: "54px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -80, top: -110, width: 470, height: 470, border: "74px solid rgba(255,211,40,.08)", borderRadius: 999 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={crest} width="72" height="88" style={{ objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 2 }}>FC EDINEȚ</div>
              <div style={{ fontSize: 16, color: "#ffd328", marginTop: 4 }}>{competition?.name || "MECI"}</div>
            </div>
          </div>
          <div style={{ fontSize: 19, color: "rgba(255,255,255,.78)" }}>{date}</div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 42, zIndex: 2 }}>
          <TeamBlock name={homeName} logo={home?.logo_url} fallback={home?.short_name} />
          <div style={{ minWidth: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: score === "VS" ? 68 : 82, fontWeight: 900, letterSpacing: -2 }}>{score}</div>
            <div style={{ width: 84, height: 7, background: "#ffd328", marginTop: 18 }} />
          </div>
          <TeamBlock name={awayName} logo={away?.logo_url} fallback={away?.short_name} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2, fontSize: 18, color: "rgba(255,255,255,.74)" }}>
          <span>{[match?.round, match?.stadium].filter(Boolean).join(" • ") || "fc-edinet.vercel.app"}</span>
          <span style={{ color: "#ffd328", fontWeight: 800 }}>FC EDINEȚ • MECI</span>
        </div>
      </div>
    ),
    size
  );
}

function TeamBlock({ name, logo, fallback }: { name: string; logo?: string | null; fallback?: string | null }) {
  return (
    <div style={{ width: 350, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {logo ? (
        <img src={logo} width="122" height="122" style={{ objectFit: "contain" }} />
      ) : (
        <div style={{ width: 122, height: 122, borderRadius: 999, background: "rgba(255,255,255,.10)", border: "3px solid rgba(255,255,255,.20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900 }}>
          {(fallback || name).slice(0, 3).toUpperCase()}
        </div>
      )}
      <div style={{ fontSize: 31, fontWeight: 850, marginTop: 24, lineHeight: 1.05 }}>{name}</div>
    </div>
  );
}
