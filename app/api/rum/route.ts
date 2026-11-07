import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { RELEASE_VERSION } from "@/lib/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTES = new Set([
  "/", "/news", "/news/:slug", "/matches", "/matches/:id",
  "/team", "/team/:slug", "/standings", "/statistics", "/club",
  "/club/history", "/club/history/:slug", "/club/seasons", "/club/seasons/:slug",
  "/club/archive", "/club/hall-of-fame", "/media", "/media/:slug",
  "/academy", "/partners",
]);
const METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB", "JS_ERROR", "UNHANDLED_REJECTION"]);
const DEVICES = new Set(["mobile", "tablet", "desktop"]);

const empty = () => new NextResponse(null, {
  status: 204,
  headers: { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" },
});

export async function POST(request: Request) {
  // This endpoint is deliberately best-effort; failure must never block navigation.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return empty();
  const salt = process.env.ANALYTICS_IP_SALT?.trim();
  if (!salt || !isSupabaseAdminConfigured()) return empty();

  if (request.headers.get("sec-fetch-site") === "cross-site") return empty();
  const origin = request.headers.get("origin");
  if (!origin) return empty();
  try { if (new URL(origin).host !== new URL(request.url).host) return empty(); }
  catch { return empty(); }

  if (Number(request.headers.get("content-length") || 0) > 1024) return empty();
  const agent = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|preview|headless|playwright|puppeteer|curl|wget/i.test(agent)) return empty();

  try {
    const raw = await request.text();
    if (raw.length > 1024) return empty();
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return empty();
    const { metric, value, route, device } = payload as Record<string, unknown>;
    if (typeof metric !== "string" || !METRICS.has(metric)) return empty();
    if (typeof route !== "string" || !ROUTES.has(route)) return empty();
    if (typeof device !== "string" || !DEVICES.has(device)) return empty();
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 120000) return empty();
    if ((metric === "CLS" && value > 10) || (metric.endsWith("ERROR") && value !== 1) ||
        (metric === "UNHANDLED_REJECTION" && value !== 1)) return empty();

    // Only the edge-controlled header is trusted in production. No raw IP is stored.
    const supplied = process.env.VERCEL_ENV || process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")
      : request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const ip = supplied?.split(",")[0]?.trim() || "";
    if (!isIP(ip)) return empty();
    const hour = new Date().toISOString().slice(0, 13);
    const hash = createHmac("sha256", salt).update(`rum:${hour}:${ip}`).digest("hex");

    const client = createAdminClient(); // server-only key, never exposed to visitors
    const { error } = await client.rpc("record_rum_sample_v1", {
      p_client_hash: hash,
      p_route_key: route,
      p_metric: metric,
      p_value: Math.round(value * 1000) / 1000,
      p_device_type: device,
      p_release: RELEASE_VERSION,
    });
    if (error && process.env.NODE_ENV !== "production") console.warn("RUM sample rejected:", error.code);
  } catch { /* Non-critical telemetry is never a reason to fail a page request. */ }
  return empty();
}
