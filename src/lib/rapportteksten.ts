import { SCORE_GRENZEN, type ScoreNiveau } from "./scoring-config";
import type { ThemaScoreResultaat } from "./scoring";

import algemeenData from "@/content/rapportteksten/algemeen.json";
import plezier from "@/content/rapportteksten/plezier.json";
import voldoening from "@/content/rapportteksten/voldoening.json";
import competentie from "@/content/rapportteksten/competentie.json";
import uitdaging from "@/content/rapportteksten/uitdaging.json";
import autonomie from "@/content/rapportteksten/autonomie.json";
import vertrouwen from "@/content/rapportteksten/vertrouwen.json";
import verbinding from "@/content/rapportteksten/verbinding.json";
import waardering from "@/content/rapportteksten/waardering.json";
import zingeving from "@/content/rapportteksten/zingeving.json";
import duidelijkheid from "@/content/rapportteksten/duidelijkheid.json";
import fysieke_werkomgeving from "@/content/rapportteksten/fysieke_werkomgeving.json";
import balans from "@/content/rapportteksten/balans.json";
import fysieke_gezondheid from "@/content/rapportteksten/fysieke_gezondheid.json";
import mentale_gezondheid from "@/content/rapportteksten/mentale_gezondheid.json";
import ontspanning from "@/content/rapportteksten/ontspanning.json";
import financien from "@/content/rapportteksten/financien.json";
import persoonlijke_ontwikkeling from "@/content/rapportteksten/persoonlijke_ontwikkeling.json";
import familie_relaties from "@/content/rapportteksten/familie_relaties.json";
import huis_leefomgeving from "@/content/rapportteksten/huis_leefomgeving.json";

export interface ThemaTekstNiveau {
  duiding: string;
  reflectievragen: string[];
  aanbevelingen: string[];
}

export interface ThemaTeksten {
  themaId: string;
  niveaus: Record<ScoreNiveau, ThemaTekstNiveau>;
  /** Signaalzinnen, in dezelfde volgorde als de stellingen van dit thema
   * (zie src/lib/stellingen.ts) -- zie signalenVoorScores(). */
  signalen: string[];
}

export interface KrachtbronnenTeksten {
  titel: string;
  metLageThemas: { tekst: string; vraag: string };
  zonderLageThemas: { tekst: string; vraag: string };
}

export interface TotaalscoreNiveau {
  minScore: number;
  maxScore: number;
  titel: string;
  tekst: string;
  reflectievragen: string[];
  aanbevelingen: string[];
}

const THEMA_TEKSTEN: Record<string, ThemaTeksten> = {
  plezier,
  voldoening,
  competentie,
  uitdaging,
  autonomie,
  vertrouwen,
  verbinding,
  waardering,
  zingeving,
  duidelijkheid,
  fysieke_werkomgeving,
  balans,
  fysieke_gezondheid,
  mentale_gezondheid,
  ontspanning,
  financien,
  persoonlijke_ontwikkeling,
  familie_relaties,
  huis_leefomgeving,
};

export function themaTeksten(themaId: string): ThemaTeksten {
  const teksten = THEMA_TEKSTEN[themaId];
  if (!teksten) {
    throw new Error(`Geen rapportteksten gevonden voor thema "${themaId}"`);
  }
  return teksten;
}

export const algemeen: {
  overzichtIntro: string;
  totaalscoreNiveaus: TotaalscoreNiveau[];
  afsluiting: { titel: string; tekst: string };
  krachtbronnen: KrachtbronnenTeksten;
} = algemeenData;

/** Zoekt de tekstblok dat bij de totaalscore hoort (5 bandbreedtes, zie
 * src/content/rapportteksten/algemeen.json — losstaand van de eenvoudigere
 * rood/oranje/groen-indeling die per thema wordt gebruikt). */
export function totaalscoreTeksten(totaalScore: number): TotaalscoreNiveau {
  const niveau = algemeen.totaalscoreNiveaus.find(
    (n) => totaalScore >= n.minScore && totaalScore <= n.maxScore
  );
  return niveau ?? algemeen.totaalscoreNiveaus[algemeen.totaalscoreNiveaus.length - 1];
}

/**
 * Signaalzinnen voor de stellingen binnen een thema met een score van 4 of
 * lager, laagste score eerst. `scores` moet dezelfde volgorde/lengte hebben
 * als de stellingen van het thema (zie berekenVraagScores() in
 * src/lib/vraag-scores.ts, die dezelfde thema-/stellingenlijst gebruikt).
 */
export function signalenVoorScores(themaId: string, scores: (number | null)[]): string[] {
  const { signalen } = themaTeksten(themaId);
  return signalen
    .map((zin, i) => ({ zin, score: scores[i] }))
    .filter((item): item is { zin: string; score: number } => item.score != null && item.score <= 4)
    .sort((a, b) => a.score - b.score)
    .map((item) => item.zin);
}

export interface KrachtbronnenBlok {
  themas: { themaId: string; themaTitel: string; score: number }[];
  tekst: string;
  vraag: string;
}

const WERKENERGIE_DEEL_ID = "werkenergie";

/**
 * Bouwt het blok "Jouw krachtbronnen": alle thema's met een score van 7,5 of
 * hoger. Geeft null als geen enkel thema zo hoog scoort (dan vervalt het
 * blok). Bij thema's onder de 5,5 wordt de vraag aangevuld met het thema met
 * de laagste score (bij gelijke stand: het thema uit Werkenergie), zie
 * src/content/rapportteksten/algemeen.json.
 */
export function bepaalKrachtbronnen(themaScores: ThemaScoreResultaat[]): KrachtbronnenBlok | null {
  const krachtbronnen = themaScores.filter((t) => t.score >= SCORE_GRENZEN.groen);
  if (krachtbronnen.length === 0) return null;

  const heeftLageThemas = themaScores.some((t) => t.score < SCORE_GRENZEN.oranje);
  const variant = heeftLageThemas
    ? algemeen.krachtbronnen.metLageThemas
    : algemeen.krachtbronnen.zonderLageThemas;

  let vraag = variant.vraag;
  if (heeftLageThemas) {
    const laagsteScore = Math.min(...themaScores.map((t) => t.score));
    const kandidaten = themaScores.filter((t) => t.score === laagsteScore);
    const laagsteThema = kandidaten.find((t) => t.deelId === WERKENERGIE_DEEL_ID) ?? kandidaten[0];
    vraag = variant.vraag.replace("{laagsteThema}", laagsteThema.themaTitel);
  }

  return {
    themas: krachtbronnen.map((t) => ({ themaId: t.themaId, themaTitel: t.themaTitel, score: t.score })),
    tekst: variant.tekst,
    vraag,
  };
}
