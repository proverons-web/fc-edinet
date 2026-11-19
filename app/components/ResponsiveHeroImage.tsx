import { getImageProps } from "next/image";
import { isOptimizablePublicImage } from "@/app/components/PublicImage";

/**
 * Home Hero art direction: preserve each editorial image and its crop while
 * delivering viewport-sized, WebP-optimized derivatives for trusted assets.
 * Unrecognized remote hosts always use native src/srcSet without a wildcard
 * in next.config.ts. This is server-only and adds no client JavaScript.
 */
type Props = {
  desktop: string;
  tablet?: string | null;
  mobile?: string | null;
};

function sourceSet(src: string, width: number): string {
  if (!isOptimizablePublicImage(src)) return src;
  const { props } = getImageProps({
    src, alt: "", width, height: Math.round(width * 9 / 16),
    sizes: "100vw", quality: 75,
  });
  return props.srcSet || props.src;
}

export default function ResponsiveHeroImage({ desktop, tablet, mobile }: Props) {
  const optimizeDesktop = isOptimizablePublicImage(desktop);
  const desktopProps = optimizeDesktop
    ? getImageProps({
        src: desktop, alt: "", width: 1920, height: 1080,
        sizes: "100vw", quality: 75, loading: "eager", fetchPriority: "high",
      }).props
    : { src: desktop, alt: "", width: 1920, height: 1080,
        loading: "eager" as const, fetchPriority: "high" as const, decoding: "async" as const };

  return (
    <picture>
      {mobile && <source media="(max-width: 680px)" sizes="100vw" srcSet={sourceSet(mobile, 960)} />}
      {tablet && <source media="(max-width: 980px)" sizes="100vw" srcSet={sourceSet(tablet, 1280)} />}
      <img {...desktopProps} alt="" />
    </picture>
  );
}
