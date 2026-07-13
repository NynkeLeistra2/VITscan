/**
 * Kleurgrenzen voor scores op de 1-10-schaal. Één config-bestand, zoals
 * afgesproken in CLAUDE.md, zodat dit later instelbaar gemaakt kan worden
 * (Wave 2: per organisatie configureerbaar) zonder de scoring-logica aan te
 * raken.
 */
export const SCORE_GRENZEN = {
  groen: 7.5,
  oranje: 5.5,
} as const;

export type ScoreNiveau = "rood" | "oranje" | "groen";

export function bepaalNiveau(score: number): ScoreNiveau {
  if (score >= SCORE_GRENZEN.groen) return "groen";
  if (score >= SCORE_GRENZEN.oranje) return "oranje";
  return "rood";
}

export const NIVEAU_KLEUR: Record<ScoreNiveau, string> = {
  groen: "#16a34a",
  oranje: "#ea580c",
  rood: "#dc2626",
};
