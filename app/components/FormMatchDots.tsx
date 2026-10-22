"use client";

import Link from "next/link";
import type { ClubMatch } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

const CLUB_LOGO = "/brand/fc-edinet-crest.png";

type Props = {
  matches: ClubMatch[];
  locale: Locale;
};

function teamLogo(team: ClubMatch["home"]) {
  return team?.logo_url || (team?.is_club ? CLUB_LOGO : null);
}

function teamName(team: ClubMatch["home"], locale: Locale) {
  return team?.short_name || team?.name || (locale === "ro" ? "Echipă" : "Команда");
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-MD" : "ru-MD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(new Date(value));
}

export default function FormMatchDots({ matches, locale }: Props) {
  if (!matches.length) return <span className="fcV215NoData">—</span>;

  return (
    <>
      {matches.map((match, index) => {
        const clubIsHome = Boolean(match.home?.is_club);
        const gf = Number((clubIsHome ? match.home_score : match.away_score) ?? 0);
        const ga = Number((clubIsHome ? match.away_score : match.home_score) ?? 0);
        const result = gf > ga ? "W" : gf === ga ? "D" : "L";
        const label = result === "W" ? (locale === "ro" ? "V" : "В") : result === "D" ? (locale === "ro" ? "E" : "Н") : (locale === "ro" ? "Î" : "П");
        const resultText = result === "W"
          ? (locale === "ro" ? "Victorie" : "Победа")
          : result === "D"
            ? (locale === "ro" ? "Egal" : "Ничья")
            : (locale === "ro" ? "Înfrângere" : "Поражение");
        const homeLogo = teamLogo(match.home);
        const awayLogo = teamLogo(match.away);

        return (
          <span key={match.id} className={`fcV215FormDotWrap is-index-${index}`}>
            <Link
              href={`/matches/${match.id}`}
              className={`fcV215FormDot is-${result.toLowerCase()}`}
              aria-label={`${resultText}: ${teamName(match.home, locale)} ${match.home_score}:${match.away_score} ${teamName(match.away, locale)}`}
            >
              {label}
            </Link>
            <span className="fcV215FormPopover" role="tooltip">
              <span className="fcV215FormPopoverMeta">
                <b>{match.competition?.name || "Liga 2"}</b>
                <em>{match.round || formatDate(match.kickoff, locale)}</em>
              </span>
              <span className="fcV215FormPopoverTeams">
                <span className="fcV215FormPopoverTeam">
                  {homeLogo ? <img src={homeLogo} alt="" /> : <i>{teamName(match.home, locale).slice(0, 3).toUpperCase()}</i>}
                  <strong>{teamName(match.home, locale)}</strong>
                  <small>{clubIsHome ? (locale === "ro" ? "ACASĂ" : "ДОМА") : (locale === "ro" ? "GAZDE" : "ХОЗЯЕВА")}</small>
                </span>
                <span className="fcV215FormPopoverScore">
                  <small>{formatDate(match.kickoff, locale)}</small>
                  <strong>{match.home_score}:{match.away_score}</strong>
                  <em>{resultText}</em>
                </span>
                <span className="fcV215FormPopoverTeam">
                  {awayLogo ? <img src={awayLogo} alt="" /> : <i>{teamName(match.away, locale).slice(0, 3).toUpperCase()}</i>}
                  <strong>{teamName(match.away, locale)}</strong>
                  <small>{!clubIsHome ? (locale === "ro" ? "DEPLASARE" : "В ГОСТЯХ") : (locale === "ro" ? "OASPEȚI" : "ГОСТИ")}</small>
                </span>
              </span>
            </span>
          </span>
        );
      })}
    </>
  );
}
