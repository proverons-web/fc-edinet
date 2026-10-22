import { NextResponse } from "next/server";
import { RELEASE_API_VERSION, RELEASE_NAME, RELEASE_VERSION } from "@/lib/release";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: RELEASE_VERSION,
      apiVersion: RELEASE_API_VERSION,
      release: RELEASE_NAME,
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
