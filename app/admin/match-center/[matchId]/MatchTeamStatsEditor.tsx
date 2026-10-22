import type { ClubMatch, MatchTeamStatistic } from "@/lib/types";
import { saveMatchTeamStatistics } from "./actions";
import MatchCenterSubmitButton from "./MatchCenterSubmitButton";

function value(row: MatchTeamStatistic | null, key: keyof MatchTeamStatistic) {
  const current = row?.[key];
  return current == null ? "" : String(current);
}

function TeamColumn({
  side,
  teamName,
  row,
}: {
  side: "home" | "away";
  teamName: string;
  row: MatchTeamStatistic | null;
}) {
  const prefix = side === "home" ? "home" : "away";
  return (
    <div className="mc26TeamStatsColumn">
      <div className="mc26TeamStatsTitle">
        <span>{side === "home" ? "ХОЗЯЕВА" : "ГОСТИ"}</span>
        <strong>{teamName}</strong>
      </div>
      <div className="mc26TeamStatsFields">
        <StatField label="Владение, %" name={`${prefix}_possession_percent`} value={value(row, "possession_percent")} step="0.01" max="100" />
        <StatField label="Удары" name={`${prefix}_shots`} value={value(row, "shots")} max="100" />
        <StatField label="В створ" name={`${prefix}_shots_on_target`} value={value(row, "shots_on_target")} max="100" />
        <StatField label="xG" name={`${prefix}_expected_goals`} value={value(row, "expected_goals")} step="0.01" max="30" />
        <StatField label="Угловые" name={`${prefix}_corners`} value={value(row, "corners")} max="60" />
        <StatField label="Фолы" name={`${prefix}_fouls`} value={value(row, "fouls")} max="80" />
        <StatField label="Офсайды" name={`${prefix}_offsides`} value={value(row, "offsides")} max="40" />
        <StatField label="Сейвы" name={`${prefix}_saves`} value={value(row, "saves")} max="100" />
        <StatField label="ЖК" name={`${prefix}_yellow_cards`} value={value(row, "yellow_cards")} max="20" />
        <StatField label="КК" name={`${prefix}_red_cards`} value={value(row, "red_cards")} max="10" />
        <StatField label="Пасы" name={`${prefix}_passes_attempted`} value={value(row, "passes_attempted")} max="1500" />
        <StatField label="Точные пасы" name={`${prefix}_passes_completed`} value={value(row, "passes_completed")} max="1500" />
      </div>
      <label className="fieldGroup mc26TeamStatsNotes">
        <span>Заметка</span>
        <input name={`${prefix}_notes`} defaultValue={row?.notes ?? ""} maxLength={600} placeholder="Необязательно" />
      </label>
    </div>
  );
}

function StatField({ label, name, value: current, max, step = "1" }: { label: string; name: string; value: string; max: string; step?: string }) {
  return (
    <label className="fieldGroup mc26StatField">
      <span>{label}</span>
      <input type="number" name={name} min="0" max={max} step={step} defaultValue={current} placeholder="—" />
    </label>
  );
}

export default function MatchTeamStatsEditor({
  match,
  home,
  away,
}: {
  match: ClubMatch;
  home: MatchTeamStatistic | null;
  away: MatchTeamStatistic | null;
}) {
  return (
    <form action={saveMatchTeamStatistics} className="mc26TeamStatsForm">
      <input type="hidden" name="match_id" value={String(match.id)} />
      <div className="mc26TeamStatsGrid">
        <TeamColumn side="home" teamName={match.home?.name ?? "Хозяева"} row={home} />
        <TeamColumn side="away" teamName={match.away?.name ?? "Гости"} row={away} />
      </div>
      <div className="mc26SectionSaveBar">
        <p>Оставляй поле пустым, если показателя нет. Ноль используется только когда это реальное значение.</p>
        <MatchCenterSubmitButton className="primaryButton" pendingText="Сохранение…">Сохранить статистику команд</MatchCenterSubmitButton>
      </div>
    </form>
  );
}
