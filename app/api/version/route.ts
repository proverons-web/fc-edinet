import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      app: "fc-edinet",
      version: "2.1.5",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      deployment:
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL ||
        null,
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
