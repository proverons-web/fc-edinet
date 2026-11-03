import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview|headlesschrome|phantomjs|playwright|puppeteer|curl|wget|python-requests|python\/|go-http-client|axios|okhttp/i;
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

function cleanDimension(value: unknown, max = 32) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

function cleanViewport(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 200 && n <= 10000 ? n : null;
}

function deviceType(width: number | null, userAgent: string) {
  if (width !== null) {
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function clientIp(request: Request) {
  // On Vercel use only the edge-controlled header, not a client-supplied
  // X-Forwarded-For fallback. Local development can use a test proxy header.
  const runningOnVercel = Boolean(process.env.VERCEL_ENV || process.env.VERCEL);
  const raw = runningOnVercel
    ? request.headers.get("x-vercel-forwarded-for") || ""
    : request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const ip = raw.split(",")[0]?.trim() || "";
  return isIP(ip) ? ip : null;
}

export async function POST(request: Request) {
  // Preview/development deployments are excluded from production audience statistics.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return new NextResponse(null, { status: 204 });

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return new NextResponse(null, { status: 403 });

  // Browser POSTs are same-origin. Validate Origin when present, including
  // scripted requests that omit Sec-Fetch-Site. Do not trust Origin as a bot
  // detector: the real visitor identity still comes from Vercel's edge.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      const expected = new URL(request.url);
      if (parsed.origin !== expected.origin) return new NextResponse(null, { status: 403 });
    } catch {
      return new NextResponse(null, { status: 403 });
    }
  }

  // An analytics hit is a small JSON object. Reject oversized submissions
  // before parsing to avoid unnecessary work from malformed/bulk requests.
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return new NextResponse(null, { status: 415 });
  const statedLength = Number(request.headers.get("content-length") || "0");
  if (statedLength > 2048) return new NextResponse(null, { status: 413 });

  const userAgent = request.headers.get("user-agent") || "";
  if (!userAgent || BOT_RE.test(userAgent)) return new NextResponse(null, { status: 204 });

  let body: {
    path?: unknown;
    referrer?: unknown;
    viewportWidth?: unknown;
    viewportHeight?: unknown;
    locale?: unknown;
  };
  try {
    const payload = await request.text();
    if (payload.length > 2048) return new NextResponse(null, { status: 413 });
    body = JSON.parse(payload);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid object");
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const path = cleanPath(body.path);
  const ip = clientIp(request);
  const salt = process.env.ANALYTICS_IP_SALT?.trim();
  if (!path || !ip || !salt) {
    if (process.env.NODE_ENV !== "production" && !salt) console.error("visitor analytics error: ANALYTICS_IP_SALT is not configured");
    return new NextResponse(null, { status: 204 });
  }

  // Privacy-preserving stable identifier: raw IP never leaves this request handler.
  const visitorHash = createHmac("sha256", salt).update(ip).digest("hex");
  const referrer = cleanReferrer(body.referrer, request);
  const viewportWidth = cleanViewport(body.viewportWidth);
  const viewportHeight = cleanViewport(body.viewportHeight);
  const locale = cleanDimension(body.locale, 16);
  const country = cleanDimension(request.headers.get("x-vercel-ip-country"), 2)?.toUpperCase() || null;
  const device = deviceType(viewportWidth, userAgent);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_site_visit_v4", {
    p_ingest_proof: salt,
    p_visitor_hash: visitorHash,
    p_path: path,
    p_referrer: referrer,
    p_country_code: country,
    p_device_type: device,
    p_viewport_width: viewportWidth,
    p_viewport_height: viewportHeight,
    p_locale: locale,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("visitor analytics error", error.message);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
