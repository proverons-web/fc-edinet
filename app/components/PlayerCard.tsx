import Link from "next/link";
import type { Player } from "@/lib/types";
import { positionLabelsI18n, publicText, type Locale } from "@/lib/i18n";

export default function PlayerCard({ player, locale = "ru" }: { player: Player; locale?: Locale }) {
  const fullName = `${player.first_name} ${player.last_name}`.trim();
  const text = publicText[locale].team;

  return (
    <Link href={`/team/${player.slug}`} className="playerCard playerCardLink">
      {player.photo_url ? (
        <div className="playerPhoto playerPhotoReal"><img src={player.photo_url} alt={fullName} loading="lazy" decoding="async" /></div>
      ) : (
        <div className="playerPhoto playerPhotoPlaceholder">
          <img className="playerPhotoPlaceholderCrest" src="/brand/fc-edinet-crest.png" alt="" aria-hidden="true" />
        </div>
      )}
      <span className="number">{player.shirt_number ?? "—"}</span>
      <div className="playerInfo">
        <span className="playerCardPosition">{positionLabelsI18n[locale][player.position] ?? player.position}</span>
        <h3><span>{player.first_name}</span><strong>{player.last_name}</strong></h3>
        <div className="playerCardMeta">
          <span>{player.nationality || "FC Edineț"}</span>
          <b>{text.profile} <i aria-hidden="true">→</i></b>
        </div>
      </div>
    </Link>
  );
}
