import Link from "next/link";
import type { Player } from "@/lib/types";
import { positionLabelsI18n, publicText, type Locale } from "@/lib/i18n";

export default function PlayerCard({ player, locale = "ru" }: { player: Player; locale?: Locale }) {
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const text = publicText[locale].team;

  return (
    <Link href={`/team/${player.slug}`} className="playerCard playerCardLink">
      {player.photo_url ? (
        <div className="playerPhoto playerPhotoReal"><img src={player.photo_url} alt={fullName} /></div>
      ) : (
        <div className="playerPhoto">{text.photo}</div>
      )}
      <span className="number">{player.shirt_number ?? "—"}</span>
      <div className="playerInfo">
        <small>{positionLabelsI18n[locale][player.position] ?? player.position}</small>
        <h3>{fullName}</h3>
        {player.nationality && <p>{player.nationality}</p>}
      </div>
    </Link>
  );
}
