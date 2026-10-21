import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview/i;
const PRIVATE_PREFIXES = ["/admin", "/login", "/register", "/account", "/api"];

function cleanPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "/";
  if (!path.startsWith("/")) return null;
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path.slice(0, 500) || "/";
}

function cleanReferrer(value: unknown, request: Request) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    const requestHost = request.headers.get("host")?.toLowerCase();
    if (requestHost && url.host.toLowerCase() === requestHost) return null;
    return url.hostname.replace(/^www\./i, "").slice(0, 500);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return new NextResponse(null, { status: 403 });

  const userAgent = request.headers.get("user-agent") || "";
  if (!userAgent || BOT_RE.test(userAgent)) return new NextResponse(null, { status: 204 });

  let body: { visitorId?: unknown; path?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
  const path = cleanPath(body.path);
  if (!visitorId || visitorId.length > 120 || !path) return new NextResponse(null, { status: 204 });

  const visitorHash = createHash("sha256").update(visitorId).digest("hex");
  const referrer = cleanReferrer(body.referrer, request);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_site_visit", {
    p_visitor_hash: visitorHash,
    p_path: path,
    p_referrer: referrer,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("visitor analytics error", error.message);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
