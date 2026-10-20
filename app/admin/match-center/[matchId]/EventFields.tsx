"use client";

import { useMemo, useState } from "react";
import type { MatchEventType } from "@/lib/types";

export type EventParticipantOption = {
  teamId: string;
  ref: string;
  label: string;
};

const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Гол",
  own_goal: "Автогол",
  penalty_goal: "Гол с пенальти",
  penalty_miss: "Пенальти не реализован",
  yellow_card: "Жёлтая карточка",
  red_card: "Красная карточка",
  substitution: "Замена",
  var: "VAR",
  injury: "Травма",
  other: "Другое",
};

export default function EventFields({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  participants,
  defaults,
  compact = false,
}: {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  participants: EventParticipantOption[];
  defaults: {
    event_type?: MatchEventType;
    team_id?: string | number | null;
    player_id?: string | null;
    player_name?: string | null;
    related_player_id?: string | null;
    related_player_name?: string | null;
    minute?: number;
    stoppage_minute?: number;
    description?: string | null;
    sort_order?: number;
  };
  compact?: boolean;
}) {
  const [eventType, setEventType] = useState<MatchEventType>(defaults.event_type ?? "goal");
  const [teamId, setTeamId] = useState(String(defaults.team_id ?? homeTeamId));
  const initialPlayerRef = defaults.player_id ? `db:${defaults.player_id}` : defaults.player_name ? `manual:${defaults.player_name}` : "";
  const initialRelatedRef = defaults.related_player_id ? `db:${defaults.related_player_id}` : defaults.related_player_name ? `manual:${defaults.related_player_name}` : "";
  const [playerRef, setPlayerRef] = useState(initialPlayerRef);
  const [relatedRef, setRelatedRef] = useState(initialRelatedRef);

  const available = useMemo(() => participants.filter((item) => item.teamId === teamId), [participants, teamId]);
  const hasCurrentPlayer = playerRef && available.some((item) => item.ref === playerRef);
  const hasCurrentRelated = relatedRef && available.some((item) => item.ref === relatedRef);

  const primaryLabel = eventType === "substitution" ? "Кто ушёл с поля" : "Игрок";
  const relatedLabel = eventType === "substitution"
    ? "Кто вышел на поле"
    : eventType === "goal" || eventType === "penalty_goal"
      ? "Ассистент (если был)"
      : "Связанный игрок";
  const relatedNeeded = eventType === "substitution" || eventType === "goal" || eventType === "penalty_goal";

  return (
    <div className={`matchEventFields ${compact ? "compact" : ""}`}>
      <label className="fieldGroup">
        <span>Тип события</span>
        <select name="event_type" value={eventType} onChange={(event) => setEventType(event.target.value as MatchEventType)}>
          {Object.entries(EVENT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className="fieldGroup">
        <span>Команда</span>
        <select
          name="team_id"
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setPlayerRef("");
            setRelatedRef("");
          }}
        >
          <option value={homeTeamId}>Хозяева · {homeTeamName}</option>
          <option value={awayTeamId}>Гости · {awayTeamName}</option>
        </select>
      </label>
      <label className="fieldGroup compactMinuteField">
        <span>Минута</span>
        <input name="minute" type="number" min={0} max={130} step={1} defaultValue={defaults.minute ?? 0} />
      </label>
      <label className="fieldGroup compactMinuteField">
        <span>+ время</span>
        <input name="stoppage_minute" type="number" min={0} max={30} step={1} defaultValue={defaults.stoppage_minute ?? 0} placeholder="0" />
      </label>
      <label className="fieldGroup matchEventParticipantField">
        <span>{primaryLabel}</span>
        <select name="player_ref" value={playerRef} onChange={(event) => setPlayerRef(event.target.value)}>
          <option value="">— не выбран —</option>
          {!hasCurrentPlayer && playerRef && <option value={playerRef}>Сохранённый игрок</option>}
          {available.map((item) => <option value={item.ref} key={`${item.teamId}-${item.ref}`}>{item.label}</option>)}
        </select>
        {available.length === 0 && <small>Сначала сохрани состав этой команды.</small>}
      </label>
      <label className={`fieldGroup matchEventParticipantField ${relatedNeeded ? "active" : ""}`}>
        <span>{relatedLabel}</span>
        <select name="related_player_ref" value={relatedRef} onChange={(event) => setRelatedRef(event.target.value)}>
          <option value="">— не выбран —</option>
          {!hasCurrentRelated && relatedRef && <option value={relatedRef}>Сохранённый игрок</option>}
          {available.filter((item) => item.ref !== playerRef).map((item) => <option value={item.ref} key={`${item.teamId}-${item.ref}`}>{item.label}</option>)}
        </select>
      </label>
      <label className="fieldGroup matchEventDescription">
        <span>Комментарий</span>
        <input name="description" maxLength={500} defaultValue={defaults.description ?? ""} placeholder="Необязательно" />
      </label>
      <label className="fieldGroup matchEventSortOrder">
        <span>Порядок</span>
        <input name="sort_order" type="number" min={-1000} max={1000} step={1} defaultValue={defaults.sort_order ?? 0} />
      </label>
    </div>
  );
}
