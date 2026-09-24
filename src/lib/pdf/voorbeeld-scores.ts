import { alleStellingen } from "@/lib/stellingen";

/**
 * Vaste, verzonnen scores voor het voorbeeldrapport (zie genereerRapportPdf
 * met voorbeeld: true), per thema in de volgorde van de scan. Bewust als
 * losse constante i.p.v. willekeurige/seeded scores, zodat het voorbeeld-
 * rapport elke keer identiek is en Nynke weet wat een klant te zien krijgt.
 */
const VOORBEELD_SCORES: Record<string, number[]> = {
  plezier: [7, 7, 5, 8],
  voldoening: [8, 8, 7, 8, 9],
  competentie: [6, 5, 5],
  uitdaging: [5, 6, 4],
  autonomie: [4, 5, 3],
  vertrouwen: [6, 7, 6, 6, 7, 7],
  verbinding: [8, 7, 7, 8],
  waardering: [7, 6, 8, 7],
  zingeving: [9, 8, 9],
  duidelijkheid: [6, 5],
  fysieke_werkomgeving: [7, 6, 7],
  balans: [5, 6],
  fysieke_gezondheid: [7, 6, 7, 6],
  mentale_gezondheid: [7, 4, 7, 7],
  ontspanning: [4, 3, 6],
  financien: [7, 6, 8],
  persoonlijke_ontwikkeling: [8, 7, 6],
  familie_relaties: [9, 9],
  huis_leefomgeving: [9, 8, 9],
};

export function bouwVoorbeeldAntwoorden(): Record<string, number> {
  const antwoorden: Record<string, number> = {};
  const tellerPerThema: Record<string, number> = {};

  for (const stelling of alleStellingen()) {
    const scores = VOORBEELD_SCORES[stelling.themaId];
    if (!scores) {
      throw new Error(`Geen voorbeeldscore gevonden voor thema "${stelling.themaId}"`);
    }
    const index = tellerPerThema[stelling.themaId] ?? 0;
    const score = scores[index];
    if (score === undefined) {
      throw new Error(
        `Te weinig voorbeeldscores voor thema "${stelling.themaId}" (stelling ${index + 1} ontbreekt)`
      );
    }
    antwoorden[stelling.key] = score;
    tellerPerThema[stelling.themaId] = index + 1;
  }

  return antwoorden;
}
