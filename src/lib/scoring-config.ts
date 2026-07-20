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

/**
 * Fijnmazige kleurschaal voor visuele elementen (wiel, scorebalk, cijfer) —
 * los van ScoreNiveau/bepaalNiveau hierboven, die de (grovere) rood/oranje/
 * groen-tekstselectie per thema blijven aansturen (zie rapportteksten.ts).
 * Overgenomen uit werkgeluk-kompas-main (WheelChart.tsx) zodat bijvoorbeeld
 * een 7.3 er duidelijk positief uitziet i.p.v. oranje.
 */
export function scoreKleur(score: number): string {
  if (score < 2) return "#8B0000";
  if (score < 3) return "#FF0000";
  if (score < 4) return "#FF4500";
  if (score < 5) return "#FFA500";
  if (score < 6) return "#FFB74D";
  if (score < 7) return "#FFD700";
  if (score < 8) return "#32CD32";
  if (score < 9) return "#228B22";
  if (score < 10) return "#006400";
  return "#4B0082";
}
