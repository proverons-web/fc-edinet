import Link from "next/link";
import type { Player } from "@/lib/types";
import { positionLabels } from "@/lib/types";

export default function PlayerCard({ player }: { player: Player }) {
  const fullName = `${player.first_name} ${player.last_name}`.trim();

  return (
    <Link href={`/team/${player.slug}`} className="playerCard playerCardLink">
      {player.photo_url ? (
        <div className="playerPhoto playerPhotoReal">
          <img src={player.photo_url} alt={fullName} />
        </div>
      ) : (
        <div className="playerPhoto">ФОТО ИГРОКА</div>
      )}

      <span className="number">{player.shirt_number ?? "—"}</span>

      <div className="playerInfo">
        <small>{positionLabels[player.position] ?? player.position}</small>
        <h3>{fullName}</h3>
        {player.nationality && <p>{player.nationality}</p>}
      </div>
    </Link>
  );
}
