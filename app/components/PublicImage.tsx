import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Responsive images for media served from the club's public Supabase Storage.
 *
 * Only our public bucket URLs go through Next's image optimizer. Editorial
 * embeds hosted elsewhere retain a native img to avoid untrusted remote hosts,
 * and to preserve existing CMS URLs without adding wildcard remotePatterns.
 */
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
};

export function isOptimizablePublicImage(src: string): boolean {
  if (src.startsWith("/brand/")) return true;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const actual = new URL(src);
    const trusted = new URL(base);
    return actual.protocol === "https:"
      && actual.host === trusted.host
      && actual.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

export default function PublicImage({
  src, alt, width, height, sizes, className, style, eager = false,
}: Props) {
  if (isOptimizablePublicImage(src)) {
    return <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      {...(eager ? { fetchPriority: "high" as const } : {})}
    />;
  }

  // Native fallback for externally hosted pictures (newsrooms sometimes embed
  // image URLs outside the club's Supabase project).
  return <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={className}
    style={style}
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    {...(eager ? { fetchPriority: "high" as const } : {})}
  />;
}
