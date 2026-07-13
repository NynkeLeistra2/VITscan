import { themaLijst } from "./stellingen";
import { bepaalNiveau, type ScoreNiveau } from "./scoring-config";

export interface ThemaScoreResultaat {
  themaId: string;
  themaTitel: string;
  themaEmoji?: string;
  deelId: string;
  score: number;
  niveau: ScoreNiveau;
}

export interface DeelScoreResultaat {
  deelId: string;
  deelTitel: string;
  score: number;
  niveau: ScoreNiveau;
}

export interface ScoreResultaat {
  themaScores: ThemaScoreResultaat[];
  deelScores: DeelScoreResultaat[];
  totaalScore: number;
  totaalNiveau: ScoreNiveau;
}

function gemiddelde(waarden: number[]): number {
  if (waarden.length === 0) return 0;
  const som = waarden.reduce((a, b) => a + b, 0);
  return Math.round((som / waarden.length) * 10) / 10;
}

/**
 * Berekent alle scores client-side uit de antwoorden van de sessie (geen
 * herbevraging van de database — respondenten/antwoorden hebben bewust geen
 * select-policy, zie supabase/migrations/0001_init_schema.sql).
 *
 * Themascore = gemiddelde van de stellingen binnen het thema (al op schaal
 * 1-10). Deelscore = gemiddelde van de themascores binnen dat deel (niet
 * van de losse stellingen, zodat een deel met veel kleine thema's niet
 * zwaarder meetelt). Totale VIT-score = gemiddelde van de twee deelscores,
 * zodat Werkenergie en Persoonlijk Welzijn even zwaar wegen ondanks het
 * verschil in aantal thema's (11 vs. 8).
 */
export function berekenScores(antwoorden: Record<string, number>): ScoreResultaat {
  const themas = themaLijst();

  const themaScores: ThemaScoreResultaat[] = themas.map((thema) => {
    const waarden = thema.stellingen
      .map((s) => antwoorden[s.key])
      .filter((w): w is number => typeof w === "number");
    const score = gemiddelde(waarden);
    return {
      themaId: thema.themaId,
      themaTitel: thema.themaTitel,
      themaEmoji: thema.themaEmoji,
      deelId: thema.deelId,
      score,
      niveau: bepaalNiveau(score),
    };
  });

  const deelIds = [...new Set(themas.map((t) => t.deelId))];
  const deelScores: DeelScoreResultaat[] = deelIds.map((deelId) => {
    const themaInDeel = themaScores.filter((t) => t.deelId === deelId);
    const deelTitel = themas.find((t) => t.deelId === deelId)!.deelTitel;
    const score = gemiddelde(themaInDeel.map((t) => t.score));
    return { deelId, deelTitel, score, niveau: bepaalNiveau(score) };
  });

  const totaalScore = gemiddelde(deelScores.map((d) => d.score));

  return {
    themaScores,
    deelScores,
    totaalScore,
    totaalNiveau: bepaalNiveau(totaalScore),
  };
}
