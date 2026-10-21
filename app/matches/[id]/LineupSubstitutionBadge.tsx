"use client";

import { useRef } from "react";

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function LineupSubstitutionBadge({
  outgoing,
  incoming,
  tooltip,
}: {
  outgoing: string;
  incoming: string;
  tooltip: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  function clear(team: Element | null) {
    team?.querySelectorAll<HTMLElement>(".premiumLineupRow.is-sub-out, .premiumLineupRow.is-sub-in").forEach((row) => {
      row.classList.remove("is-sub-out", "is-sub-in");
    });
  }

  function highlight() {
    const team = ref.current?.closest(".premiumLineupTeam") ?? null;
    clear(team);
    const out = normalizeName(outgoing);
    const incomingName = normalizeName(incoming);
    team?.querySelectorAll<HTMLElement>(".premiumLineupRow[data-player-name]").forEach((row) => {
      const name = normalizeName(row.dataset.playerName || "");
      if (out && name === out) row.classList.add("is-sub-out");
      if (incomingName && name === incomingName) row.classList.add("is-sub-in");
    });
  }

  function reset() {
    clear(ref.current?.closest(".premiumLineupTeam") ?? null);
  }

  return (
    <i
      ref={ref}
      className="substitution"
      data-tooltip={tooltip}
      onMouseEnter={highlight}
      onMouseLeave={reset}
      onFocus={highlight}
      onBlur={reset}
      tabIndex={0}
      aria-label={tooltip}
    >
      ⇄
    </i>
  );
}
