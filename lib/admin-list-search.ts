/** Shared, server-side list search for the administrator's working screens. */
export function parseAdminQuery(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return (single ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function adminListHref(path: string, args: { status?: string; sort?: string; focus?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (args.status && args.status !== "all") params.set("status", args.status);
  if (args.sort && args.sort !== "number") params.set("sort", args.sort);
  if (args.focus && args.focus !== "all") params.set("focus", args.focus);
  const q = parseAdminQuery(args.q);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function adminTextMatches(q: string, ...parts: (string | number | null | undefined)[]): boolean {
  const normalized = parseAdminQuery(q).toLocaleLowerCase("ru");
  if (!normalized) return true;
  return parts.filter((part) => part !== null && part !== undefined)
    .join(" ").toLocaleLowerCase("ru").includes(normalized);
}
