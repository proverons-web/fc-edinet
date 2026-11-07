import type { Competition, CompetitionType } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
export const competitionTypes: CompetitionType[] = ["league", "cup", "friendly", "other"];
const labels: Record<Locale, Record<CompetitionType, string>> = {
  ru: { league:"Чемпионат",cup:"Кубок",friendly:"Товарищеские",other:"Другие" },
  ro: { league:"Campionat",cup:"Cupă",friendly:"Amicale",other:"Alte competiții" },
};
export function competitionTypeLabel(kind: CompetitionType | null | undefined, lang: Locale) {
  return labels[lang][kind && competitionTypes.includes(kind) ? kind : "league"];
}
export function competitionName(c: Pick<Competition,"name"|"name_ro"> | null | undefined, lang: Locale) {
  return (lang === "ro" && c?.name_ro?.trim()) || c?.name || "";
}
export function competitionSlug(s: string) {
  return s.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90);
}
