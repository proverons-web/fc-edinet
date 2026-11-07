/**
 * Low-impact, read-only smoke test for a *deployed* FC Edineț site.
 * This is an HTTP availability/response-header check, NOT Web Vitals/RUM.
 * No credentials, user identifiers or admin URLs are requested.
 */
export const PUBLIC_CHECKS = Object.freeze([
  { path: "/api/version", kind: "version" },
  { path: "/api/health", kind: "health" },
  { path: "/", kind: "html" },
  { path: "/news", kind: "html" },
  { path: "/matches", kind: "html" },
  { path: "/team", kind: "html" },
  { path: "/standings", kind: "html" },
  { path: "/media", kind: "html" },
  { path: "/club/history", kind: "html" },
  { path: "/club/seasons", kind: "html" },
]);

export function validateBaseUrl(raw) {
  const base = new URL(raw);
  if (base.username || base.password || base.search || base.hash) {
    throw new Error("Base URL must not include credentials, query or fragment");
  }
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) {
    throw new Error("Only HTTPS or local HTTP endpoints are allowed");
  }
  if (base.pathname !== "/") throw new Error("Base URL must point to the domain root");
  return base.origin;
}

export async function checkRoute(base, check, expectedVersion, timeoutMs = 10000, fetcher = fetch) {
  const url = `${base}${check.path}`;
  const started = performance.now();
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: check.kind === "html" ? "text/html" : "application/json" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const headerLatencyMs = Math.round(performance.now() - started);
    const type = response.headers.get("content-type") || "";
    const finalUrl = new URL(response.url || url);
    let error = "";
    if (finalUrl.origin !== base) error = "unexpected cross-origin redirect";
    else if (!response.ok) error = `HTTP ${response.status}`;
    else if (check.kind === "html" && !type.includes("text/html")) error = `unexpected content-type: ${type || "missing"}`;
    else if (check.kind !== "html") {
      if (!type.includes("application/json")) error = `unexpected content-type: ${type || "missing"}`;
      else {
        try {
          const payload = await response.json();
          if (check.kind === "version" && (payload.ok !== true || payload.version !== expectedVersion)) {
            error = `expected v${expectedVersion}; received ${String(payload.version ?? "missing")}`;
          }
          if (check.kind === "health" && payload.status !== "ok") {
            error = "health configuration is not ok";
          }
        } catch { error = "invalid JSON response"; }
      }
    }
    // Public HTML is not downloaded unnecessarily after checking headers.
    if (check.kind === "html") await response.body?.cancel().catch(() => undefined);
    return { path: check.path, ok: !error, httpStatus: response.status, headerLatencyMs, error: error || null };
  } catch (e) {
    // Deliberately do not leak full URLs, sensitive request headers, server data.
    const reason = e?.name === "TimeoutError" || e?.name === "AbortError" ? "timeout" : "network error";
    return { path: check.path, ok: false, httpStatus: null, headerLatencyMs: Math.round(performance.now() - started), error: reason };
  }
}

export async function runProductionHealth({ baseUrl, expectedVersion, timeoutMs = 10000, fetcher = fetch, checks = PUBLIC_CHECKS }) {
  const base = validateBaseUrl(baseUrl);
  if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) throw new Error("Invalid expected version");
  const results = [];
  // Only two read-only requests at once, to avoid adding load to the production site.
  for (let i = 0; i < checks.length; i += 2) {
    results.push(...await Promise.all(checks.slice(i, i + 2).map(c => checkRoute(base, c, expectedVersion, timeoutMs, fetcher))));
  }
  return {
    site: base,
    expectedVersion,
    checkedAt: new Date().toISOString(),
    scope: "public HTTP status, content-type, and approximate time-to-headers; not LCP/INP/CLS",
    passed: results.filter(x => x.ok).length,
    total: results.length,
    results,
  };
}
