"use client";

import { useState, type CSSProperties } from "react";

export default function NewsCoverImage({ src, alt, width, height, className, style, eager }: {
  src: string; alt: string; width: number; height: number; className?: string; style?: CSSProperties; eager: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  return <img src={failed ? "/brand/fc-edinet-crest.png" : src} alt={alt} width={width} height={height}
    className={className} style={failed ? { ...style, objectFit: "contain", transform: "none" } : style}
    loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : undefined}
    onError={() => { if (!failed) setFailedSrc(src); }} />;
}
