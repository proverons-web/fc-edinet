"use client";

import { useMemo, useState } from "react";
import type { MatchEventType } from "@/lib/types";

export type EventParticipantOption = {
  teamId: string;
  ref: string;
  label: string;
  kind?: "player" | "coach";
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
  quickSearch = false,
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
  quickSearch?: boolean;
}) {
  const [eventType, setEventType] = useState<MatchEventType>(defaults.event_type ?? "goal");
  const [teamId, setTeamId] = useState(String(defaults.team_id ?? homeTeamId));
  const initialPlayerRef = defaults.player_id ? `db:${defaults.player_id}` : defaults.player_name ? `manual:${defaults.player_name}` : "";
  const initialRelatedRef = defaults.related_player_id ? `db:${defaults.related_player_id}` : defaults.related_player_name ? `manual:${defaults.related_player_name}` : "";
  const [playerRef, setPlayerRef] = useState(initialPlayerRef);
  const [relatedRef, setRelatedRef] = useState(initialRelatedRef);
  const [playerSearch, setPlayerSearch] = useState("");
  const [relatedSearch, setRelatedSearch] = useState("");

  const teamParticipants = useMemo(() => participants.filter((item) => item.teamId === teamId), [participants, teamId]);
  const cardEvent = eventType === "yellow_card" || eventType === "red_card";
  const available = useMemo(
    () => teamParticipants.filter((item) => item.kind !== "coach" || cardEvent),
    [teamParticipants, cardEvent],
  );
  const relatedAvailable = useMemo(() => teamParticipants.filter((item) => item.kind !== "coach"), [teamParticipants]);
  const matchingPrimary = useMemo(() => available.filter((item) =>
    item.ref === playerRef || item.label.toLocaleLowerCase("ru-RU").includes(playerSearch.trim().toLocaleLowerCase("ru-RU")),
  ), [available, playerSearch, playerRef]);
  const matchingRelated = useMemo(() => relatedAvailable.filter((item) =>
    (item.ref === relatedRef || item.label.toLocaleLowerCase("ru-RU").includes(relatedSearch.trim().toLocaleLowerCase("ru-RU"))) && item.ref !== playerRef,
  ), [relatedAvailable, relatedSearch, relatedRef, playerRef]);
  const hasCurrentPlayer = playerRef && available.some((item) => item.ref === playerRef);
  const hasCurrentRelated = relatedRef && relatedAvailable.some((item) => item.ref === relatedRef);

  const primaryLabel = eventType === "substitution" ? "Кто ушёл с поля" : cardEvent ? "Игрок / тренер" : "Игрок";
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
        <select
          name="event_type"
          value={eventType}
          onChange={(event) => {
            const nextType = event.target.value as MatchEventType;
            setEventType(nextType);
            const nextIsCard = nextType === "yellow_card" || nextType === "red_card";
            if (!nextIsCard && participants.some((item) => item.ref === playerRef && item.kind === "coach")) {
              setPlayerRef("");
            }
          }}
        >
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
            setPlayerSearch("");
            setRelatedSearch("");
          }}
        >
          <option value={homeTeamId}>Хозяева · {homeTeamName}</option>
          <option value={awayTeamId}>Гости · {awayTeamName}</option>
        </select>
      </label>
      <label className="fieldGroup compactMinuteField">
        <span>Минута</span>
        <input name="minute" type="number" min={0} max={130} step={1} defaultValue={defaults.minute ?? 0} data-select-on-click="true" />
      </label>
      <label className="fieldGroup compactMinuteField">
        <span>+ время</span>
        <input name="stoppage_minute" type="number" min={0} max={30} step={1} defaultValue={defaults.stoppage_minute ?? 0} placeholder="0" data-select-on-click="true" />
      </label>
      <div className="fieldGroup matchEventParticipantField">
        <span>{primaryLabel}</span>
        {quickSearch && available.length > 0 && <input
          type="search"
          className="mc297PlayerSearch"
          aria-label="Поиск игрока для события"
          placeholder="Поиск по фамилии или номеру"
          value={playerSearch}
          onChange={(event) => setPlayerSearch(event.target.value)}
          autoComplete="off"
        />}
        {quickSearch && playerSearch.trim() && <small className="mc298SearchCount" role="status">
          Найдено: {available.filter((item) => item.label.toLocaleLowerCase("ru-RU").includes(playerSearch.trim().toLocaleLowerCase("ru-RU"))).length}
        </small>}
        <select name="player_ref" aria-label={primaryLabel} value={playerRef} onChange={(event) => { setPlayerRef(event.target.value); setPlayerSearch(""); }}>
          <option value="">— не выбран —</option>
          {!hasCurrentPlayer && playerRef && <option value={playerRef}>Сохранённый игрок</option>}
          {(quickSearch ? matchingPrimary : available).map((item) => <option value={item.ref} key={`${item.teamId}-${item.ref}`}>{item.label}</option>)}
        </select>
        {available.length === 0 && <small>Сначала сохрани состав этой команды.</small>}
      </div>
      <div className={`fieldGroup matchEventParticipantField ${relatedNeeded ? "active" : ""}`}>
        <span>{relatedLabel}</span>
        {quickSearch && relatedNeeded && relatedAvailable.length > 0 && <input
          type="search"
          className="mc297PlayerSearch"
          aria-label="Поиск второго игрока"
          placeholder="Поиск второго игрока"
          value={relatedSearch}
          onChange={(event) => setRelatedSearch(event.target.value)}
          autoComplete="off"
        />}
        {quickSearch && relatedNeeded && relatedSearch.trim() && <small className="mc298SearchCount" role="status">
          Найдено: {relatedAvailable.filter((item) => item.ref !== playerRef && item.label.toLocaleLowerCase("ru-RU").includes(relatedSearch.trim().toLocaleLowerCase("ru-RU"))).length}
        </small>}
        {eventType === "substitution" && Boolean(playerRef) && playerRef === relatedRef ? <small className="mc298ParticipantWarning" role="alert">Выбери другого игрока: нельзя заменить футболиста самим собой.</small> : null}
        <select name="related_player_ref" aria-label={relatedLabel} value={relatedRef} onChange={(event) => { setRelatedRef(event.target.value); setRelatedSearch(""); }}>
          <option value="">— не выбран —</option>
          {!hasCurrentRelated && relatedRef && <option value={relatedRef}>Сохранённый игрок</option>}
          {(quickSearch ? matchingRelated : relatedAvailable.filter((item) => item.ref !== playerRef)).map((item) => <option value={item.ref} key={`${item.teamId}-${item.ref}`}>{item.label}</option>)}
        </select>
      </div>
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
