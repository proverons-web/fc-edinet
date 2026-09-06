"use client";

import { useActionState, useState } from "react";
import {
  saveStandings,
  type StandingsState,
} from "@/app/admin/standings/actions";
import type {
  ClubTeam,
  Competition,
  StandingEntry,
} from "@/lib/types";

const initialState: StandingsState = {};

export default function StandingsAdminForm({
  competition,
  teams,
  standings,
}: {
  competition: Competition;
  teams: ClubTeam[];
  standings: StandingEntry[];
}) {
  const [state, action, pending] = useActionState(
    saveStandings,
    initialState
  );

  const byTeam = new Map(
    standings.map((entry) => [String(entry.team_id), entry])
  );

  return (
    <form action={action} className="standingsAdminForm">
      <input
        type="hidden"
        name="competition_id"
        value={String(competition.id)}
      />

      <div className="standingsAdminHead">
        <div>
          <p className="eyebrow blue">ТУРНИР</p>
          <h2>
            {competition.name}
            {competition.season ? ` · ${competition.season}` : ""}
          </h2>
          <p>
            Очки считаются автоматически: 3 за победу, 1 за ничью.
          </p>
        </div>

        <button
          className="primaryButton standingsSave"
          type="submit"
          disabled={pending}
        >
          {pending ? "Сохраняем..." : "Сохранить таблицу"}
        </button>
      </div>

      {state.error && <div className="formError">{state.error}</div>}
      {state.success && <div className="formSuccess">{state.success}</div>}

      <div className="standingsAdminTableWrap">
        <table className="standingsAdminTable">
          <thead>
            <tr>
              <th>Участник</th>
              <th>Команда</th>
              <th>В</th>
              <th>Н</th>
              <th>П</th>
              <th>ЗМ</th>
              <th>ПМ</th>
              <th>± очки</th>
              <th>И</th>
              <th>РМ</th>
              <th>О</th>
            </tr>
          </thead>

          <tbody>
            {teams.map((team) => (
              <StandingAdminRow
                key={team.id}
                team={team}
                entry={byTeam.get(String(team.id)) ?? null}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="standingsAdminHint">
        Галочка «Участник» определяет, входит ли команда именно в этот
        чемпионат. Поэтому клубы из кубка или товарищеских матчей можно
        хранить в базе, не добавляя их в Liga 2.
      </p>
    </form>
  );
}

function StandingAdminRow({
  team,
  entry,
}: {
  team: ClubTeam;
  entry: StandingEntry | null;
}) {
  const [active, setActive] = useState(Boolean(entry));
  const [wins, setWins] = useState(entry?.wins ?? 0);
  const [draws, setDraws] = useState(entry?.draws ?? 0);
  const [losses, setLosses] = useState(entry?.losses ?? 0);
  const [gf, setGf] = useState(entry?.goals_for ?? 0);
  const [ga, setGa] = useState(entry?.goals_against ?? 0);
  const [adjustment, setAdjustment] = useState(
    entry?.points_adjustment ?? 0
  );

  const played = wins + draws + losses;
  const difference = gf - ga;
  const points = wins * 3 + draws + adjustment;

  return (
    <tr className={`${active ? "" : "inactive"} ${team.is_club ? "club" : ""}`}>
      <td>
        <input type="hidden" name="team_id" value={String(team.id)} />
        <input
          className="standingsParticipant"
          type="checkbox"
          name={`participant_${team.id}`}
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
      </td>

      <td>
        <div className="standingsTeamCell">
          <TeamMark team={team} />
          <div>
            <strong>{team.name}</strong>
            {team.is_club && <small>FC Edineț</small>}
          </div>
        </div>
      </td>

      <StatInput
        name={`wins_${team.id}`}
        value={wins}
        setValue={setWins}
        disabled={!active}
      />
      <StatInput
        name={`draws_${team.id}`}
        value={draws}
        setValue={setDraws}
        disabled={!active}
      />
      <StatInput
        name={`losses_${team.id}`}
        value={losses}
        setValue={setLosses}
        disabled={!active}
      />
      <StatInput
        name={`gf_${team.id}`}
        value={gf}
        setValue={setGf}
        disabled={!active}
      />
      <StatInput
        name={`ga_${team.id}`}
        value={ga}
        setValue={setGa}
        disabled={!active}
      />
      <StatInput
        name={`adjustment_${team.id}`}
        value={adjustment}
        setValue={setAdjustment}
        disabled={!active}
        signed
      />

      <td className="computed">{active ? played : "—"}</td>
      <td className="computed">
        {active ? (difference > 0 ? `+${difference}` : difference) : "—"}
      </td>
      <td className="computed points">{active ? points : "—"}</td>
    </tr>
  );
}

function StatInput({
  name,
  value,
  setValue,
  disabled,
  signed = false,
}: {
  name: string;
  value: number;
  setValue: (value: number) => void;
  disabled: boolean;
  signed?: boolean;
}) {
  return (
    <td>
      <input
        className="standingStatInput"
        type="number"
        name={name}
        min={signed ? -100 : 0}
        max={signed ? 100 : 999}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          setValue(Number.isFinite(next) ? next : 0);
        }}
      />
    </td>
  );
}

function TeamMark({ team }: { team: ClubTeam }) {
  if (team.logo_url) {
    return <img className="standingsAdminLogo" src={team.logo_url} alt="" />;
  }

  return (
    <span className={`standingsAdminFallback ${team.is_club ? "club" : ""}`}>
      {(team.short_name || team.name).slice(0, 3).toUpperCase()}
    </span>
  );
}
