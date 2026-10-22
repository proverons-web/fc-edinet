import type { CSSProperties, ReactNode } from "react";
import { heroLayerVisible } from "@/lib/hero-builder";
import type { SitePageDesignSnapshot } from "@/lib/types";

export default function PageHeroShell({
  design,
  className,
  contentClassName = "container",
  contentImageUrl = null,
  showBackgroundMedia = false,
  children,
}: {
  design: SitePageDesignSnapshot;
  className: string;
  contentClassName?: string;
  contentImageUrl?: string | null;
  showBackgroundMedia?: boolean;
  children: ReactNode;
}) {
  const classTokens = className.split(/\s+/);
  const isGenericLandingHero = classTokens.includes("pageHero") && !classTokens.includes("publishingDraftPageHero");
  if (isGenericLandingHero) return null;

  const backgroundVisible = showBackgroundMedia && heroLayerVisible(design.layer_config, "background");
  const selectedDesktop = backgroundVisible
    ? design.background_mode === "custom"
      ? design.desktop_image_url
      : design.background_mode === "content"
        ? contentImageUrl
        : null
    : null;
  const selectedTablet = backgroundVisible
    ? design.background_mode === "custom"
      ? design.tablet_image_url || design.desktop_image_url
      : design.background_mode === "content"
        ? contentImageUrl
        : null
    : null;
  const selectedMobile = backgroundVisible
    ? design.background_mode === "custom"
      ? design.mobile_image_url || design.tablet_image_url || design.desktop_image_url
      : design.background_mode === "content"
        ? contentImageUrl
        : null
    : null;
  const desktopSrc = selectedDesktop || selectedTablet || selectedMobile;
  const tabletSrc = selectedTablet || desktopSrc || selectedMobile;
  const mobileSrc = selectedMobile || tabletSrc || desktopSrc;
  const hasMedia = Boolean(desktopSrc || tabletSrc || mobileSrc);

  const style = {
    "--page-hero-height-desktop": `${design.hero_height_desktop}px`,
    "--page-hero-height-tablet": `${design.hero_height_tablet}px`,
    "--page-hero-height-mobile": `${design.hero_height_mobile}px`,
    "--page-hero-content-width": `${design.content_width}px`,
    "--page-hero-overlay-alpha": String(design.overlay_opacity / 100),
    "--page-hero-desktop-x": `${design.desktop_position_x}%`,
    "--page-hero-desktop-y": `${design.desktop_position_y}%`,
    "--page-hero-desktop-zoom": String(design.desktop_zoom_percent / 100),
    "--page-hero-tablet-x": `${design.tablet_position_x}%`,
    "--page-hero-tablet-y": `${design.tablet_position_y}%`,
    "--page-hero-tablet-zoom": String(design.tablet_zoom_percent / 100),
    "--page-hero-mobile-x": `${design.mobile_position_x}%`,
    "--page-hero-mobile-y": `${design.mobile_position_y}%`,
    "--page-hero-mobile-zoom": String(design.mobile_zoom_percent / 100),
  } as CSSProperties;

  return (
    <section className={`${className} managedPageHero heroBuilderShell align-${design.text_alignment}`} style={style}>
      {hasMedia && desktopSrc && tabletSrc && mobileSrc && (
        <div className="managedPageHeroMedia" aria-hidden="true">
          <picture>
            <source media="(max-width: 680px)" srcSet={mobileSrc} />
            <source media="(max-width: 980px)" srcSet={tabletSrc} />
            <img
              className="managedPageHeroResponsive"
              src={desktopSrc}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>
      )}
      {hasMedia && <div className={`managedPageHeroOverlay ${design.overlay_style}`} aria-hidden="true" />}
      <div className={`${contentClassName} pageHeroContent`}>{children}</div>
    </section>
  );
}
