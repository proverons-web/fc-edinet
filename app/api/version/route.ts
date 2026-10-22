import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "2.28.2";

export async function GET() {
  return NextResponse.json(
    {
      app: "fc-edinet",
      version: VERSION,
      apiVersion: `v${VERSION}`,
      release: `FC Edineț v${VERSION}`,
      databaseNavigationMigration: "061",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      deployment:
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL ||
        null,
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
