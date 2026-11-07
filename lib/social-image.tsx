import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import { SOCIAL_IMAGE_SIZE, socialDate, socialFontSize, socialPhotoDataUrl, socialText } from "@/lib/social-preview";

type Props = {
  category: string;
  title: string;
  photoUrl?: string | null;
  date?: string | null;
  subtitle?: string | null;
};

/** Consistent 1200x630 social card; falls back to the club color treatment. */
export async function createSocialImage({ category, title, photoUrl, date, subtitle }: Props): Promise<ImageResponse> {
  const [photo, crestBytes] = await Promise.all([
    socialPhotoDataUrl(photoUrl),
    fs.readFile(path.join(process.cwd(), "public", "brand", "fc-edinet-crest.png")),
  ]);
  const crest = `data:image/png;base64,${crestBytes.toString("base64")}`;
  const headline = socialText(title || "FC Edineț", 130);
  const header = socialText(category, 40).toUpperCase();
  const footer = socialText(subtitle, 54);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "row", background: "#061730", color: "#fff", position: "relative", overflow: "hidden" }}>
      <div style={{ width: "64%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "46px 45px 48px 59px", background: "linear-gradient(140deg,#05182f 0%,#06366b 100%)", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, top: -140, width: 450, height: 450, border: "64px solid rgba(255,211,40,.045)", borderRadius: "50%" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 18, zIndex: 1 }}>
          <img src={crest} alt="FC Edineț" width="65" height="76" style={{ objectFit: "contain" }}/>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 29, fontWeight: 900, letterSpacing: .4 }}>FC EDINEȚ</div>
            <div style={{ fontSize: 18, color: "#ffd328", fontWeight: 700, marginTop: 4 }}>{header || "FC EDINEȚ"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", zIndex: 1, paddingRight: 10 }}>
          <div style={{ width: 70, height: 7, background: "#ffd328", marginBottom: 24 }}/>
          <div style={{ fontSize: socialFontSize(headline), fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5, overflowWrap: "break-word" }}>{headline}</div>
          {footer && <div style={{ marginTop: 20, fontSize: 22, opacity: .78 }}>{footer}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18, opacity: .82, zIndex: 1 }}>
          <div>{socialDate(date)}</div><div>fc-edinet.vercel.app</div>
        </div>
      </div>
      <div style={{ width: "36%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "linear-gradient(145deg,#05529e,#031329)", position: "relative", borderLeft: "7px solid #ffd328" }}>
        {photo ? <img src={photo} alt="" width="440" height="630" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}/> : <img src={crest} alt="" width="265" height="315" style={{ objectFit: "contain", opacity: .75 }}/>} 
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 10, background: "#ffd328" }}/>
    </div>,
    SOCIAL_IMAGE_SIZE,
  );
}
