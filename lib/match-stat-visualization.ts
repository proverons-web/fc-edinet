/** Presentation-only meter widths. A missing statistic is never treated as zero. */
export function compareMatchStat(home: number | null, away: number | null): {
  comparable: boolean;
  homePercent: number;
  awayPercent: number;
} {
  if (home == null || away == null || !Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
    return { comparable: false, homePercent: 0, awayPercent: 0 };
  }
  // Each independent half is scaled against the larger known value.
  // 5:5 yields 100% / 100%, not misleading 50% / 50% half-bars.
  const max = Math.max(home, away, 1);
  return { comparable: true, homePercent: (home / max) * 100, awayPercent: (away / max) * 100 };
}
