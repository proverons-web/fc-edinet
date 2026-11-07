"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

// Route templates only: no slugs, account paths, query strings or personal data.
const PUBLIC_ROUTE_KEYS = new Set([
  "/", "/news", "/news/:slug", "/matches", "/matches/:id",
  "/team", "/team/:slug", "/standings", "/statistics", "/club",
  "/club/history", "/club/history/:slug", "/club/seasons", "/club/seasons/:slug",
  "/club/archive", "/club/hall-of-fame", "/media", "/media/:slug",
  "/academy", "/partners",
]);
const VITALS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
const observed = new Set<string>();
let sentCount = 0;
let errorCount = 0;

function routeKey(path: string): string | null {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (PUBLIC_ROUTE_KEYS.has(clean)) return clean;
  const parts = clean.split("/").filter(Boolean);
  const root = parts[0];
  if (parts.length === 2 && ["news", "matches", "team", "media"].includes(root)) {
    return root === "matches" && !/^\d+$/.test(parts[1]) ? null : `/${root}/${root === "matches" ? ":id" : ":slug"}`;
  }
  if (parts[0] === "club" && parts.length === 3 && ["history", "seasons"].includes(parts[1])) {
    return `/club/${parts[1]}/:slug`;
  }
  return null;
}

function device() {
  return window.innerWidth < 768 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop";
}

function postMetric(metric: string, value: number, onceKey: string) {
  if (sentCount >= 16 || !Number.isFinite(value) || value < 0 || value > 120000) return;
  const route = routeKey(window.location.pathname);
  if (!route || observed.has(onceKey)) return;
  observed.add(onceKey);
  sentCount += 1;
  const data = JSON.stringify({ metric, value: Math.round(value * 1000) / 1000, route, device: device() });
  try {
    // Beacon survives navigation; no session identifiers, cookies or error text in payload.
    if (navigator.sendBeacon && navigator.sendBeacon("/api/rum", new Blob([data], { type: "application/json" }))) return;
    void fetch("/api/rum", {
      method: "POST", headers: { "content-type": "application/json" },
      body: data, keepalive: true, credentials: "omit",
    }).catch(() => undefined);
  } catch { /* Monitoring must never interfere with the site. */ }
}

// Stable callback: Next.js recommends registering the Web Vitals callback once.
function onWebVital(metric: { id: string; name: string; value: number }) {
  if (!VITALS.has(metric.name)) return;
  postMetric(metric.name, metric.value, `vital:${metric.id}`);
}

export default function RealUserMetrics() {
  useReportWebVitals(onWebVital);

  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (errorCount >= 3) return;
      // Do not count browser extension and cross-origin errors as errors of FC Edineț.
      try { if (event.filename && new URL(event.filename, location.href).origin !== location.origin) return; }
      catch { return; }
      errorCount += 1;
      postMetric("JS_ERROR", 1, `error:${errorCount}`);
    }
    function onUnhandledRejection() {
      if (errorCount >= 3) return;
      errorCount += 1;
      postMetric("UNHANDLED_REJECTION", 1, `error:${errorCount}`);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  return null;
}
