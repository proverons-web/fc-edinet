// Server-only aggregation of anonymous field samples, without personal data.
export type RumSample = {
  recorded_at: string;
  metric: string;
  value: number;
  route_key: string;
  device_type: string;
};

const thresholds: Record<string, { good: number; poor: number; unit: string }> = {
  LCP: { good: 2500, poor: 4000, unit: "мс" },
  INP: { good: 200, poor: 500, unit: "мс" },
  CLS: { good: 0.1, poor: 0.25, unit: "" },
  FCP: { good: 1800, poor: 3000, unit: "мс" },
  TTFB: { good: 800, poor: 1800, unit: "мс" },
};

export function percentile75(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = 0.75 * (sorted.length - 1);
  const first = Math.floor(rank);
  return sorted[first] + ((sorted[Math.ceil(rank)] ?? sorted[first]) - sorted[first]) * (rank - first);
}

export function summarizeRum(rows: RumSample[]) {
  const names = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
  const vitals = names.map((metric) => {
    const values = rows.filter((r) => r.metric === metric).map((r) => Number(r.value))
      .filter((v) => Number.isFinite(v) && v >= 0);
    const p75 = percentile75(values);
    const { good, poor, unit } = thresholds[metric];
    const rating = p75 == null || values.length < 10 ? "insufficient"
      : p75 <= good ? "good" : p75 > poor ? "poor" : "needs-improvement";
    return { metric, count: values.length, p75, unit, rating };
  });
  const devices = ["mobile", "tablet", "desktop"].map((device) => ({
    device, count: rows.filter((r) => r.device_type === device).length,
  }));
  const errors = rows.filter((r) => r.metric === "JS_ERROR" || r.metric === "UNHANDLED_REJECTION");
  const routeMap = new Map<string, { total: number; poor: number; errors: number }>();
  for (const row of rows) {
    const entry = routeMap.get(row.route_key) || { total: 0, poor: 0, errors: 0 };
    if (row.metric === "JS_ERROR" || row.metric === "UNHANDLED_REJECTION") entry.errors += 1;
    else {
      entry.total += 1;
      const rule = thresholds[row.metric];
      if (rule && row.value > rule.good) entry.poor += 1;
    }
    routeMap.set(row.route_key, entry);
  }
  const routes = [...routeMap.entries()]
    .map(([route, counts]) => ({ route, ...counts, badShare: counts.total ? counts.poor / counts.total : 0 }))
    .sort((a, b) => b.errors - a.errors || b.badShare - a.badShare || b.total - a.total)
    .slice(0, 10);
  return { vitals, devices, routes, errors: errors.length, samples: rows.length };
}
