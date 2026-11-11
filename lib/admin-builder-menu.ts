import type { SiteMenuItem } from "./site-builder";

/** Flatten a two-level menu in render order, preserving orphaned items. */
export function organizeMenu<T extends Pick<SiteMenuItem, "id" | "parent_id">>(items: T[]): T[] {
  const parents = items.filter((item) => !item.parent_id);
  const visited = new Set<number>();
  const result: T[] = [];
  for (const parent of parents) {
    result.push(parent);
    visited.add(parent.id);
    for (const child of items.filter((item) => item.parent_id === parent.id)) {
      result.push(child);
      visited.add(child.id);
    }
  }
  for (const item of items) if (!visited.has(item.id)) result.push(item);
  return result;
}

/** Reorder inside one parent. Never move an item into another menu level. */
export function reorderSibling<T extends Pick<SiteMenuItem, "id" | "parent_id">>(
  items: T[], id: number, direction: -1 | 1
): T[] {
  const ordered = organizeMenu(items);
  const current = ordered.find((item) => item.id === id);
  if (!current) return ordered;
  const siblings = ordered.filter((item) => (item.parent_id ?? null) === (current.parent_id ?? null));
  const index = siblings.findIndex((item) => item.id === id);
  const target = siblings[index + direction];
  if (!target) return ordered;
  const from = ordered.findIndex((item) => item.id === id);
  const to = ordered.findIndex((item) => item.id === target.id);
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return organizeMenu(ordered);
}

/** Drag-and-drop ordering only; parent assignment is handled by the menu form. */
export function dropSibling<T extends Pick<SiteMenuItem, "id" | "parent_id">>(
  items: T[], fromId: number | null, targetId: number
): T[] {
  const ordered = organizeMenu(items);
  const from = ordered.find((item) => item.id === fromId);
  const target = ordered.find((item) => item.id === targetId);
  if (!from || !target || from.id === target.id || (from.parent_id ?? null) !== (target.parent_id ?? null)) return ordered;
  const fromIndex = ordered.findIndex((item) => item.id === from.id);
  const toIndex = ordered.findIndex((item) => item.id === target.id);
  ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, from);
  return organizeMenu(ordered);
}
