import Link from "next/link";

export function PublicLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <main className={compact ? "publicRouteState publicRouteStateCompact" : "publicRouteState"} aria-busy="true" aria-live="polite">
      <div className="container publicRouteStateInner">
        <div className="publicStateBrand" aria-hidden="true">
          <img src="/brand/fc-edinet-crest.png" alt="" />
          <span>FC EDINEȚ</span>
        </div>
        <div className="publicSkeleton publicSkeletonTitle" />
        <div className="publicSkeleton publicSkeletonLine" />
        <div className="publicSkeleton publicSkeletonLine short" />
        <div className="publicSkeletonGrid" aria-hidden="true">
          <div className="publicSkeletonCard" />
          <div className="publicSkeletonCard" />
          <div className="publicSkeletonCard" />
        </div>
      </div>
    </main>
  );
}

export function PublicMessageState({
  eyebrow = "FC EDINEȚ",
  title,
  text,
  actionLabel,
  actionHref,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="publicMessageState" role="status">
      <img src="/brand/fc-edinet-crest.png" alt="" aria-hidden="true" />
      <p className="eyebrow blue">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {actionLabel && actionHref && <Link className="secondaryButton" href={actionHref}>{actionLabel} <span aria-hidden="true">→</span></Link>}
    </div>
  );
}
