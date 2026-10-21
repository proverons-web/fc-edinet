import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "FC Edineț — official football club";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const crestBytes = await fs.readFile(path.join(process.cwd(), "public", "brand", "fc-edinet-crest.png"));
  const crest = `data:image/png;base64,${crestBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "linear-gradient(135deg,#020e21 0%,#031a38 52%,#0755a5 100%)", color: "white", padding: "64px 78px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: 999, right: -90, top: -115, border: "76px solid rgba(255,211,40,.08)" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 14, background: "#ffd328" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 62, zIndex: 2 }}>
          <div style={{ width: 285, height: 330, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.06)", border: "2px solid rgba(255,255,255,.12)" }}>
            <img src={crest} width="230" height="280" style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 650 }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 5, color: "#ffd328" }}>FC EDINEȚ • MOLDOVA</div>
            <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -4, lineHeight: .92, marginTop: 24 }}>FC EDINEȚ</div>
            <div style={{ fontSize: 29, lineHeight: 1.25, color: "rgba(255,255,255,.80)", marginTop: 30 }}>Football • Edineț • Moldova</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
