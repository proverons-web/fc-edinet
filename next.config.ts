import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Restrict remote optimization to the exact public Supabase Storage host.
// Unknown image hosts still work via the native fallback in PublicImage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const trustedSupabaseImageHost = (() => {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === "https:" ? url.hostname : null;
  } catch { return null; }
})();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/webp"],
    deviceSizes: [360, 430, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [48, 64, 96, 128, 256, 320],
    qualities: [75],
    remotePatterns: trustedSupabaseImageHost
      ? [{ protocol: "https" as const, hostname: trustedSupabaseImageHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
