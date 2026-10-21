"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "fc_edinet_visitor_id";
const PRIVATE_PREFIXES = ["/admin", "/login", "/register", "/account", "/api"];

function visitorId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, value);
    return value;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function currentLocale() {
  const lang = document.documentElement.lang || navigator.language || "";
  return lang.toLowerCase().startsWith("ro") ? "ro" : lang.toLowerCase().startsWith("ru") ? "ru" : "other";
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (!pathname || PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const timer = window.setTimeout(() => {
      void fetch("/api/analytics/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visitorId: visitorId(),
          path: pathname,
          referrer: document.referrer || null,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          locale: currentLocale(),
        }),
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
