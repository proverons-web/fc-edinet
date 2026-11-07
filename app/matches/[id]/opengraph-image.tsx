import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { matchScoreText } from "@/lib/public-match-integrity";
import { socialTeamLogoDataUrl, socialTeamNameFont } from "@/lib/social-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "FC Edineț — meci";
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
  const awayName = away?.name || "—";
  const score = matchScoreText(match || {});
  // Normalize team logos to small transparent PNGs for reliable Satori rendering.
  // If storage is down, show the club crest or a readable initials fallback.
  const [homeLogo, awayLogo] = await Promise.all([
    socialTeamLogoDataUrl(home?.logo_url),
    socialTeamLogoDataUrl(away?.logo_url),
  ]);
  const date = match?.status === "postponed" ? "МАТЧ ПЕРЕНЕСЁН" :
    match?.status === "cancelled" ? "МАТЧ ОТМЕНЁН" : match?.kickoff
      ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Chisinau" }).format(new Date(match.kickoff))
      : "FC EDINEȚ";
  const crestBytes = await fs.readFile(path.join(process.cwd(), "public", "brand", "fc-edinet-crest.png"));
  const crest = `data:image/png;base64,${crestBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(135deg,#020e21 0%,#031a38 58%,#0755a5 100%)", color: "white", padding: "54px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -80, top: -110, width: 470, height: 470, border: "74px solid rgba(255,211,40,.08)", borderRadius: 999 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: 2 }}>FC EDINEȚ</div>
            <div style={{ fontSize: 17, color: "#ffd328", marginTop: 5 }}>{competition?.name || "FC EDINEȚ"}</div>
          </div>
          <div style={{ fontSize: 19, color: "rgba(255,255,255,.78)" }}>{date}</div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22, zIndex: 2 }}>
          <TeamBlock name={homeName} logo={homeLogo || (home?.is_club ? crest : null)} fallback={home?.short_name} />
          <div style={{ width: 252, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: score === "VS" ? 73 : 89, fontWeight: 900, letterSpacing: -2, whiteSpace: "nowrap" }}>{score}</div>
            <div style={{ width: 90, height: 7, background: "#ffd328", marginTop: 20 }} />
          </div>
          <TeamBlock name={awayName} logo={awayLogo || (away?.is_club ? crest : null)} fallback={away?.short_name} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2, fontSize: 18, color: "rgba(255,255,255,.74)" }}>
          <span>{[match?.round, match?.stadium].filter(Boolean).join(" • ") || "fc-edinet.vercel.app"}</span>
          <span style={{ color: "#ffd328", fontWeight: 800 }}>FC EDINEȚ</span>
        </div>
      </div>
    ),
    size
  );
}

/** Equal-sized badge slots preserve each team's logo proportions. */
function TeamBlock({ name, logo, fallback }: { name: string; logo?: string | null; fallback?: string | null }) {
  const letters = (fallback || name).trim().slice(0, 3).toUpperCase();
  return (
    <div style={{ width: 316, minWidth: 316, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ width: 214, height: 214, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,12,29,.26)", border: "2px solid rgba(255,255,255,.19)" }}>
        {logo ? (
          <img alt={name} src={logo} width={178} height={178} style={{ width: 178, height: 178, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 178, height: 178, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 48, fontWeight: 900, letterSpacing: 2 }}>
            {letters}
          </div>
        )}
      </div>
      <div style={{ width: 310, minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: socialTeamNameFont(name), fontWeight: 800, marginTop: 20, lineHeight: 1.08, textAlign: "center" }}>
        {name}
      </div>
    </div>
  );
}
