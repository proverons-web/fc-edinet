import Link from "next/link";

const items = [
  ["about", "О клубе", "/admin/club/about"],
  ["history", "История", "/admin/club/history"],
  ["stadium", "Стадион", "/admin/club/stadium"],
  ["leadership", "Руководство", "/admin/club/leadership"],
  ["achievements", "Достижения", "/admin/club/achievements"],
  ["archive", "Архивные фото", "/admin/club/archive"],
  ["hall-of-fame", "Зал славы", "/admin/club/hall-of-fame"],
] as const;

export default function AdminClubNav({ active }: { active?: string }) {
  return <nav className="adminClubNav" aria-label="Разделы клуба">
    <Link href="/admin/club" className={!active ? "active" : ""}>Обзор</Link>
    {items.map(([key,label,href]) => <Link key={key} href={href} className={active===key ? "active" : ""}>{label}</Link>)}
  </nav>;
}
