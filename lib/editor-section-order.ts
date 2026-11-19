/**
 * Keyboard and pointer reordering for Page Builder Pro.
 * The hero is the page's structural header: it must remain first.
 * The helpers never mutate their inputs or discard a section.
 */
export function moveBuilderSection<T extends { key: string }>(
  sections: readonly T[], key: string, direction: -1 | 1,
): T[] {
  const copy = [...sections];
  const from = copy.findIndex((section) => section.key === key);
  const to = from + direction;
  if (from < 0 || key === "hero" || to < 0 || to >= copy.length || copy[to]?.key === "hero") return copy;
  [copy[from], copy[to]] = [copy[to], copy[from]];
  return copy;
}

export function dropBuilderSection<T extends { key: string }>(
  sections: readonly T[], moving: string | null, target: string,
): T[] {
  const copy = [...sections];
  if (!moving || moving === target || moving === "hero" || target === "hero") return copy;
  const from = copy.findIndex((section) => section.key === moving);
  const to = copy.findIndex((section) => section.key === target);
  if (from < 0 || to < 0) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
