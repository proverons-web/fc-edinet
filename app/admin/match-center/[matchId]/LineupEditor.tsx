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
  onlySide,
}: {
  match: ClubMatch;
  players: Player[];
  settings: MatchLineupSetting[];
  entries: MatchLineupEntry[];
  events: MatchEvent[];
  onlySide?: "home" | "away";
}) {
  const side = onlySide ?? "home";
  const teamName = side === "home" ? match.home?.name ?? "Хозяева" : match.away?.name ?? "Гости";
  const starterCount = entries.filter((entry) => entry.side === side && entry.lineup_role === "starter").length;
  const subCount = entries.filter((entry) => entry.side === side && entry.lineup_role === "substitute").length;

  return (
    <section className="statisticsPanel matchLineupPanel matchCenterTeamColumn opponent" id="lineups">
      <div className="statisticsPanelHead matchCenterSectionHead">
        <div>
          <p className="eyebrow blue">{side === "home" ? "ХОЗЯЕВА" : "ГОСТИ"} • СОПЕРНИК</p>
          <h2>{teamName}</h2>
          <p>Введи состав соперника вручную. Сохранённые игроки сразу появятся в событиях матча.</p>
        </div>
        <span className={`statisticsState ${starterCount === 11 ? "complete" : starterCount > 0 ? "draft" : "empty"}`}>{starterCount}/11 • {subCount} запасных</span>
      </div>

      <div className="matchLineupTeams singleOpponent">
        {(!onlySide || onlySide === "home") && (
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
        )}
        {(!onlySide || onlySide === "away") && (
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
        )}
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
      {isClub && (
        <form action={importClubLineupFromPlayerStats} className="matchLineupImportAction">
          <input type="hidden" name="match_id" value={matchId} />
          <button className="rowAction muted" type="submit">↻ Из статистики игроков</button>
        </form>
      )}

      <form action={saveMatchLineup} className="matchLineupForm matchCenterOpponentUnifiedForm">
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="side" value={side} />

        <div className="matchCenterSquadMeta compact">
          <label className="fieldGroup">
            <span>Схема</span>
            <input name="formation" defaultValue={setting?.formation ?? ""} placeholder="4-3-3" maxLength={40} />
          </label>
          <label className="fieldGroup">
            <span>Тренер</span>
            <input name="coach_name" defaultValue={setting?.coach_name ?? ""} placeholder="Имя тренера" maxLength={160} />
          </label>
          <div className="matchCenterSquadSummary">
            <span><b>{starterCount}</b>/11 старт</span>
            <span><b>{subCount}</b> запасных</span>
          </div>
        </div>

        <LineupGroup
          title="Стартовый состав"
          role="starter"
          slots={11}
          map={starters}
          isClub={isClub}
          players={players}
          events={events}
          open
        />
        <details className="matchCenterBenchDetails" open={subCount > 0}>
          <summary>
            <span>Запасные</span>
            <small>{subCount} выбрано</small>
          </summary>
          <LineupGroup
            title=""
            role="substitute"
            slots={12}
            map={substitutes}
            isClub={isClub}
            players={players}
            events={events}
            bare
          />
        </details>

        <footer className="matchCenterUnifiedSaveBar compact matchCenterOpponentSaveBar">
          <div>
            <strong>Состав соперника</strong>
            <span>Пустые строки не сохраняются. После сохранения игроки доступны в событиях.</span>
          </div>
          <button className="primaryButton" type="submit">Сохранить</button>
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
  bare = false,
}: {
  title: string;
  role: "starter" | "substitute";
  slots: number;
  map: Map<number, MatchLineupEntry>;
  isClub: boolean;
  players: Player[];
  events: MatchEvent[];
  open?: boolean;
  bare?: boolean;
}) {
  const rows = (
    <div className="matchCenterSquadList matchCenterOpponentSquadList">
      {Array.from({ length: slots }, (_, index) => index + 1).map((slot) => {
        const entry = map.get(slot);
        const notes = entry ? substitutionNotes(entry, events) : [];
        const hasPlayer = Boolean(entry?.player_id || entry?.player_name?.trim());
        const positionClass = entry?.position ? `position-${entry.position}` : "position-empty";
        return (
          <div className={`matchCenterSquadCompactRow opponent-unified ${role} ${hasPlayer ? "filled" : "empty"} ${positionClass}`} key={`${role}-${slot}`}>
            <span className="matchCenterSquadSlot">{slot}</span>
            <div className="matchCenterPlayerPick opponent-pick">
              {isClub ? (
                <>
                  <select name={`${role}_${slot}_player_id`} defaultValue={entry?.player_id ?? ""}>
                    <option value="">— выбрать по фамилии —</option>
                    {players.map((player) => (
                      <option value={String(player.id)} key={player.id}>
                        {player.last_name} {player.first_name}{player.shirt_number != null ? ` · #${player.shirt_number}` : ""}{!player.is_active ? " · архив" : ""}
                      </option>
                    ))}
                  </select>
                  {!entry?.player_id && (
                    <input name={`${role}_${slot}_player_name`} defaultValue={entry?.player_name ?? ""} placeholder="ФИО вручную" maxLength={120} />
                  )}
                </>
              ) : (
                <div className="matchCenterOpponentIdentity">
                  <input
                    className="matchCenterOpponentNumber"
                    name={`${role}_${slot}_shirt_number`}
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={entry?.shirt_number ?? ""}
                    placeholder="#"
                    aria-label={`Номер игрока ${slot}`}
                  />
                  <input
                    className="matchCenterOpponentName"
                    name={`${role}_${slot}_player_name`}
                    defaultValue={entry?.player_name ?? ""}
                    placeholder="Фамилия Имя"
                    maxLength={120}
                  />
                </div>
              )}
            </div>
            {isClub && <input type="hidden" name={`${role}_${slot}_shirt_number`} value={entry?.shirt_number ?? ""} />}
            <select className="matchCenterCompactPosition" name={`${role}_${slot}_position`} defaultValue={entry?.position ?? ""} disabled={isClub && !hasPlayer}>
              <option value="">Позиция</option>
              {POSITION_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <label className="matchCenterCaptainToggle" title="Капитан">
              <input name={`${role}_${slot}_captain`} type="checkbox" defaultChecked={Boolean(entry?.is_captain)} disabled={isClub && !hasPlayer} />
              <span>C</span>
            </label>
            <div className="matchCenterAutoStats matchCenterOpponentEventNotes" aria-label="События игрока">
              {notes.length > 0 ? notes.map((note, noteIndex) => (
                <span className={note.tone} key={`${note.label}-${noteIndex}`}>{note.label}</span>
              )) : hasPlayer ? <span className="muted">из событий</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (bare) return rows;
  return (
    <div className="matchCenterSquadTableWrap compact matchCenterOpponentSquadWrap">
      {title && <h3>{title}</h3>}
      {rows}
    </div>
  );
}

