import type { CSSProperties, ReactNode } from "react";
import type { SitePageDesignSnapshot } from "@/lib/types";

export default function PageHeroShell({
  design,
  className,
  contentClassName = "container",
  children,
}: {
  design: SitePageDesignSnapshot;
  className: string;
  contentClassName?: string;
  contentImageUrl?: string | null;
  children: ReactNode;
}) {
  const style = {
    "--page-hero-content-width": `${design.content_width}px`,
  } as CSSProperties;

  return (
    <section className={`${className} managedPageHero imageFreePageHero align-${design.text_alignment}`} style={style}>
      <div className={`${contentClassName} pageHeroContent`}>{children}</div>
    </section>
  );
}
