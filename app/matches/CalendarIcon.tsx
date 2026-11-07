/** Small, consistent calendar glyph for fan-facing match actions. */
export default function CalendarIcon({ size = 16 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M7 3v4M17 3v4M3 10h18M9 16l2 2 4-4" />
  </svg>;
}
