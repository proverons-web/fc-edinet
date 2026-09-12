import type { CSSProperties, ReactNode } from "react";
import type { SitePageDesignSnapshot } from "@/lib/types";

export default function PageHeroShell({
  design,
  className,
  contentClassName = "container",
  contentImageUrl = null,
  children,
}: {
  design: SitePageDesignSnapshot;
  className: string;
  contentClassName?: string;
  contentImageUrl?: string | null;
  children: ReactNode;
}) {
  const selectedDesktop = design.background_mode === "custom"
    ? design.desktop_image_url
    : design.background_mode === "content"
      ? contentImageUrl
      : null;
  const selectedMobile = design.background_mode === "custom"
    ? design.mobile_image_url || design.desktop_image_url
    : design.background_mode === "content"
      ? contentImageUrl
      : null;
  const desktopSrc = selectedDesktop || selectedMobile;
  const mobileSrc = selectedMobile || selectedDesktop;
  const hasMedia = Boolean(desktopSrc || mobileSrc);

  const style = {
    "--page-hero-height-desktop": `${design.hero_height_desktop}px`,
    "--page-hero-height-mobile": `${design.hero_height_mobile}px`,
    "--page-hero-content-width": `${design.content_width}px`,
    "--page-hero-overlay-alpha": String(design.overlay_opacity / 100),
    "--page-hero-desktop-x": `${design.desktop_position_x}%`,
    "--page-hero-desktop-y": `${design.desktop_position_y}%`,
    "--page-hero-desktop-zoom": String(design.desktop_zoom_percent / 100),
    "--page-hero-mobile-x": `${design.mobile_position_x}%`,
    "--page-hero-mobile-y": `${design.mobile_position_y}%`,
    "--page-hero-mobile-zoom": String(design.mobile_zoom_percent / 100),
  } as CSSProperties;

  return (
    <section className={`${className} managedPageHero align-${design.text_alignment}`} style={style}>
      {hasMedia && desktopSrc && mobileSrc && (
        <div className="managedPageHeroMedia" aria-hidden="true">
          <img className="managedPageHeroDesktop" src={desktopSrc} alt="" />
          <img className="managedPageHeroMobile" src={mobileSrc} alt="" />
        </div>
      )}
      {hasMedia && <div className={`managedPageHeroOverlay ${design.overlay_style}`} aria-hidden="true" />}
      <div className={`${contentClassName} managedPageHeroInner`}>{children}</div>
    </section>
  );
}
