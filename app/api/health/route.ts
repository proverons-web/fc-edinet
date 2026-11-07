import { NextResponse } from "next/server";
import { RELEASE_VERSION } from "@/lib/release";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public *configuration/liveness* signal, not a live Supabase readiness check.
 * Detailed database status and internal configuration belong in /admin/diagnostics.
 * Do not accidentally publish API-key availability, model names or server internals.
 */
export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return NextResponse.json(
    {
      status: configured ? "ok" : "configuration_error",
      app: "fc-edinet",
      version: RELEASE_VERSION,
      check: "configuration_only",
      database: "not_checked",
      time: new Date().toISOString(),
    },
    {
      status: configured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
      },
    }
  );
}
