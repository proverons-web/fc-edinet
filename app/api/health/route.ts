import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return NextResponse.json(
    {
      status: supabaseConfigured ? "ok" : "configuration_error",
      app: "fc-edinet",
      version: "1.8.0",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      supabaseConfigured,
      authProxy: "bypassed",
      time: new Date().toISOString(),
    },
    {
      status: supabaseConfigured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
