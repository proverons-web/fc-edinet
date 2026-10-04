import type {
  ClubMatch,
  MatchEvent,
  MatchLineupEntry,
  MatchLineupSetting,
  Player,
} from "@/lib/types";
import { importClubLineupFromPlayerStats, saveMatchLineup } from "./actions";

const POSITION_OPTIONS = [
  ["goalkeeper", "ВР"],
  ["defender", "ЗАЩ"],
  ["midfielder", "ПЗ"],
  ["forward", "НАП"],
] as const;

function minuteLabel(event: MatchEvent) {
  return `${event.minute}${event.stoppage_minute > 0 ? `+${event.stoppage_minute}` : ""}′`;
}

function sameParticipant(entry: MatchLineupEntry, id: string | null, name: string | null) {
  if (entry.player_id && id) return String(entry.player_id) === String(id);
  if (!entry.player_id && entry.player_name && name) {
    return entry.player_name.trim().toLowerCase() === name.trim().toLowerCase();
  }
  return false;
}

function substitutionNotes(entry: MatchLineupEntry, events: MatchEvent[]) {
  const notes: { label: string; tone: "in" | "out" }[] = [];
  for (const event of events) {
    if (event.event_type !== "substitution") continue;
    if (sameParticipant(entry, event.player_id, event.player_name)) {
      notes.push({ label: `↓ ${minuteLabel(event)}`, tone: "out" });
    }
    if (sameParticipant(entry, event.related_player_id, event.related_player_name)) {
      notes.push({ label: `↑ ${minuteLabel(event)}`, tone: "in" });
    }
  }
  return notes;
}

function entryMap(entries: MatchLineupEntry[], side: "home" | "away", role: "starter" | "substitute") {
  const map = new Map<number, MatchLineupEntry>();
  entries
    .filter((entry) => entry.side === side && entry.lineup_role === role)
    .forEach((entry) => map.set(entry.slot_number, entry));
  return map;
}

export default function LineupEditor({
  match,
  players,
  settings,
  entries,
  events,
}: {
  match: ClubMatch;
  players: Player[];
  settings: MatchLineupSetting[];
  entries: MatchLineupEntry[];
  events: MatchEvent[];
}) {
  return (
    <section className="statisticsPanel matchLineupPanel" id="lineups">
      <div className="statisticsPanelHead">
        <div>
          <p className="eyebrow blue">v2.3.7 • СОСТАВЫ</p>
          <h2>Стартовые составы и запасные</h2>
          <p>
            Заполни старт, скамейку, схему и капитана для обеих команд. Замены из таймлайна автоматически отмечаются рядом с игроками.
          </p>
        </div>
        <span className="matchCenterVersionBadge">
          {entries.filter((entry) => entry.lineup_role === "starter").length} в старте
        </span>
      </div>

      <div className="matchLineupTeams">
        <TeamLineup
          side="home"
          teamName={match.home?.name ?? "Хозяева"}
          teamId={match.home_team_id}
          isClub={Boolean(match.home?.is_club)}
          players={players}
          setting={settings.find((row) => row.side === "home") ?? null}
          entries={entries}
          events={events.filter((event) => String(event.team_id) === String(match.home_team_id))}
          matchId={String(match.id)}
        />
        <TeamLineup
          side="away"
          teamName={match.away?.name ?? "Гости"}
          teamId={match.away_team_id}
          isClub={Boolean(match.away?.is_club)}
          players={players}
          setting={settings.find((row) => row.side === "away") ?? null}
          entries={entries}
          events={events.filter((event) => String(event.team_id) === String(match.away_team_id))}
          matchId={String(match.id)}
        />
      </div>
    </section>
  );
}

function TeamLineup({
  side,
  teamName,
  isClub,
  players,
  setting,
  entries,
  events,
  matchId,
}: {
  side: "home" | "away";
  teamName: string;
  teamId: string | number;
  isClub: boolean;
  players: Player[];
  setting: MatchLineupSetting | null;
  entries: MatchLineupEntry[];
  events: MatchEvent[];
  matchId: string;
}) {
  const starters = entryMap(entries, side, "starter");
  const substitutes = entryMap(entries, side, "substitute");
  const starterCount = starters.size;
  const subCount = substitutes.size;

  return (
    <article className={`matchLineupTeam ${isClub ? "club" : "opponent"}`}>
      <header className="matchLineupTeamHead">
        <div>
          <small>{side === "home" ? "HOME" : "AWAY"}{isClub ? " • FC EDINEȚ" : ""}</small>
          <h3>{teamName}</h3>
          <span>{starterCount}/11 старт • {subCount} запасных</span>
        </div>
        {isClub && (
          <form action={importClubLineupFromPlayerStats}>
            <input type="hidden" name="match_id" value={matchId} />
            <button className="rowAction muted" type="submit">↻ Из статистики игроков</button>
          </form>
        )}
      </header>

      <form action={saveMatchLineup} className="matchLineupForm">
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="side" value={side} />

        <div className="matchLineupMeta">
          <label className="fieldGroup">
            <span>Схема</span>
            <input name="formation" defaultValue={setting?.formation ?? ""} placeholder="4-3-3" maxLength={40} />
          </label>
          <label className="fieldGroup">
            <span>Тренер</span>
            <input name="coach_name" defaultValue={setting?.coach_name ?? ""} placeholder="Имя тренера" maxLength={160} />
          </label>
        </div>

        <LineupGroup
          title="Стартовые 11"
          role="starter"
          slots={11}
          map={starters}
          isClub={isClub}
          players={players}
          events={events}
          open
        />
        <LineupGroup
          title="Запасные"
          role="substitute"
          slots={12}
          map={substitutes}
          isClub={isClub}
          players={players}
          events={events}
        />

        <footer className="matchLineupFooter">
          <span>Пустые строки не сохраняются. Для соперника достаточно имени игрока.</span>
          <button className="primaryButton" type="submit">Сохранить состав</button>
        </footer>
      </form>
    </article>
  );
}

function LineupGroup({
  title,
  role,
  slots,
  map,
  isClub,
  players,
  events,
  open = false,
}: {
  title: string;
  role: "starter" | "substitute";
  slots: number;
  map: Map<number, MatchLineupEntry>;
  isClub: boolean;
  players: Player[];
  events: MatchEvent[];
  open?: boolean;
}) {
  const filled = [...map.values()].length;
  return (
    <details className="matchLineupGroup" open={open}>
      <summary>
        <strong>{title}</strong>
        <span>{filled}/{slots}</span>
      </summary>
      <div className="matchLineupRows">
        {Array.from({ length: slots }, (_, index) => index + 1).map((slot) => {
          const entry = map.get(slot);
          const notes = entry ? substitutionNotes(entry, events) : [];
          return (
            <div className={`matchLineupRow ${entry ? "filled" : ""}`} key={`${role}-${slot}`}>
              <span className="matchLineupSlot">{slot}</span>
              <div className="matchLineupPlayerField">
                {isClub ? (
                  <>
                    <select name={`${role}_${slot}_player_id`} defaultValue={entry?.player_id ?? ""}>
                      <option value="">— выбрать игрока —</option>
                      {players.map((player) => (
                        <option value={String(player.id)} key={player.id}>
                          {player.shirt_number != null ? `#${player.shirt_number} ` : ""}{player.first_name} {player.last_name}{!player.is_active ? " · архив" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      name={`${role}_${slot}_player_name`}
                      defaultValue={entry?.player_id ? "" : entry?.player_name ?? ""}
                      placeholder="или имя вручную"
                      maxLength={120}
                    />
                  </>
                ) : (
                  <input name={`${role}_${slot}_player_name`} defaultValue={entry?.player_name ?? ""} placeholder="Имя игрока" maxLength={120} />
                )}
              </div>
              <input
                className="matchLineupNumber"
                name={`${role}_${slot}_shirt_number`}
                type="number"
                min={0}
                max={99}
                defaultValue={entry?.shirt_number ?? ""}
                placeholder="#"
              />
              <select className="matchLineupPosition" name={`${role}_${slot}_position`} defaultValue={entry?.position ?? ""}>
                <option value="">Поз.</option>
                {POSITION_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <label className="matchLineupCaptain">
                <input name={`${role}_${slot}_captain`} type="checkbox" defaultChecked={Boolean(entry?.is_captain)} />
                <span>C</span>
              </label>
              <div className="matchLineupSubNotes">
                {notes.map((note, noteIndex) => <span className={note.tone} key={`${note.label}-${noteIndex}`}>{note.label}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
