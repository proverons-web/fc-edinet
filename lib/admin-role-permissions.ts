import type { UserRole } from "./types";

/** Whitelist for editor-side shortcuts. This is UI routing, not a substitute for RLS. */
export function canEditPublicPath(role: UserRole, pathname: string): boolean {
  if (role !== "admin" && role !== "editor") return false;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return false;
  if (pathname === "/" || pathname.startsWith("/club/") || pathname === "/club" || pathname === "/partners" || pathname === "/academy" || pathname === "/statistics") {
    return role === "admin";
  }
  return ["/news", "/media", "/team", "/staff", "/matches", "/standings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** No link is constructed from an arbitrary user-supplied URL. */
export function safePublicEditPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 450 || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("?") || raw.includes("#") || raw.includes("\\") || raw.includes("\0")) return null;
  const segments = raw.split("/").filter(Boolean);
  if (segments.some((value) => {
    try {
      const decoded = decodeURIComponent(value);
      return decoded === "." || decoded === ".." || /[\/\\\x00-\x1f]/.test(decoded) || !/^[\p{L}\p{N}_%.\-]+$/u.test(value);
    } catch { return true; }
  })) return null;
  return "/" + segments.join("/");
}
