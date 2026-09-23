import { SCORE_GRENZEN, formatScore, type ScoreNiveau } from "./scoring-config";
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

/** "Thema A" of "Thema A en Thema B" (max. 2 namen); null als de lijst leeg is. */
function themaNamenZin(themas: { themaTitel: string }[]): string | null {
  if (themas.length === 0) return null;
  if (themas.length === 1) return themas[0].themaTitel;
  return `${themas[0].themaTitel} en ${themas[1].themaTitel}`;
}

/**
 * De 1-2 persoonlijke zinnen voor in de samenvatting, gebaseerd op de
 * thema-scores. Bij gelijke stand winnen thema's uit Werkenergie en
 * daarna de scanvolgorde -- dat volgt vanzelf uit een stabiele sort op de
 * al in scanvolgorde opgebouwde `themaScores`-array (zie stellingen.ts),
 * dus geen aparte tiebreak-code nodig.
 */
export function persoonlijkeSamenvattingZinnen(themaScores: ThemaScoreResultaat[]): string[] {
  const zinnen: string[] = [];

  const hoog = [...themaScores]
    .filter((t) => t.score >= SCORE_GRENZEN.groen)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const hoogNamen = themaNamenZin(hoog);
  if (hoogNamen) zinnen.push(`Je haalt de meeste energie uit ${hoogNamen}.`);

  const laag = [...themaScores]
    .filter((t) => t.score < SCORE_GRENZEN.oranje)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  const laagNamen = themaNamenZin(laag);
  if (laagNamen) {
    zinnen.push(`Het meest schuurt het bij ${laagNamen}.`);
  } else {
    const groei = [...themaScores]
      .filter((t) => t.score < SCORE_GRENZEN.groen)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
    const groeiNamen = themaNamenZin(groei);
    if (groeiNamen) zinnen.push(`De meeste ruimte voor groei zit bij ${groeiNamen}.`);
  }

  return zinnen;
}

/**
 * Voegt de persoonlijke zinnen (zie hierboven) toe direct na de eerste zin
 * van de niveautekst bij de totaalscore. Splitst op het eerste zinseinde
 * (. ! of ?); is er geen duidelijk zinseinde, dan komen de persoonlijke
 * zinnen erachteraan.
 */
export function persoonlijkeSamenvatting(tekst: string, themaScores: ThemaScoreResultaat[]): string {
  const zinnen = persoonlijkeSamenvattingZinnen(themaScores);
  if (zinnen.length === 0) return tekst;

  const eersteZinMatch = tekst.match(/^(.*?[.!?])(\s+|$)/);
  if (!eersteZinMatch) return `${tekst} ${zinnen.join(" ")}`.trim();

  const eersteZin = eersteZinMatch[1];
  const rest = tekst.slice(eersteZinMatch[0].length).trim();
  return [eersteZin, ...zinnen, rest].filter(Boolean).join(" ");
}

/**
 * Zes stellingen die altijd hun signaalzin tonen zodra ze 4 of lager scoren,
 * op elk niveau, en die niet meetellen voor het maximum van twee bij een
 * laag thema (zie signalenVoorScores() en docs: vit-scan-rapportteksten.md).
 * Positioneel gekoppeld aan themaId + index in vit-scan-stellingen.json,
 * dezelfde volgorde als de `signalen` array per thema-json.
 */
const ZORGSIGNAAL_POSITIES = new Set([
  "fysieke_gezondheid:1", // Ik voel me vrij van stress gerelateerde fysieke klachten.
  "mentale_gezondheid:0", // Ik voel mij mentaal gezond.
  "mentale_gezondheid:1", // Ik voel me vrij van stress gerelateerde mentale klachten.
  "ontspanning:2", // Ik slaap goed en krijg voldoende slaap.
  "financien:2", // Ik hoef me geen zorgen te maken of ik wel rond kan komen.
  "huis_leefomgeving:2", // Ik voel me veilig in mijn huis en omgeving.
]);

/**
 * Signaalzinnen voor de stellingen binnen een thema, laagste score eerst.
 * `scores` moet dezelfde volgorde/lengte hebben als de stellingen van het
 * thema (zie berekenVraagScores() in src/lib/vraag-scores.ts).
 *
 * Bij midden en hoog: elke stelling met score ≤ 4.
 * Bij laag: alleen stellingen ≤ 4 die minstens 1 punt onder de themascore
 * liggen, maximaal twee. De zes zorgsignalen (ZORGSIGNAAL_POSITIES)
 * verschijnen bij laag altijd als ze ≤ 4 scoren, ook als ze niet minstens 1
 * punt onder de themascore liggen, en tellen niet mee voor dat maximum.
 */
export function signalenVoorScores(
  themaId: string,
  niveau: ScoreNiveau,
  themaScore: number,
  scores: (number | null)[]
): string[] {
  const { signalen } = themaTeksten(themaId);
  const kandidaten = signalen
    .map((zin, i) => ({ zin, score: scores[i], i }))
    .filter((item): item is { zin: string; score: number; i: number } => item.score != null && item.score <= 4);

  if (niveau !== "rood") {
    return kandidaten.sort((a, b) => a.score - b.score).map((item) => item.zin);
  }

  const isZorgsignaal = (i: number) => ZORGSIGNAAL_POSITIES.has(`${themaId}:${i}`);
  const zorgsignalen = kandidaten.filter((item) => isZorgsignaal(item.i));
  const overig = kandidaten
    .filter((item) => !isZorgsignaal(item.i) && themaScore - item.score >= 1 - 1e-9)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  return [...zorgsignalen, ...overig]
    .sort((a, b) => a.score - b.score)
    .map((item) => item.zin);
}

export interface KrachtbronnenBlok {
  themas: { themaId: string; themaTitel: string; score: number }[];
  /** Kant-en-klare regel onder de kop: opsomming "Thema (score), ..." of,
   * bij meer dan zes thema's, de vervangende zin. Zelfde tekst voor scherm
   * en PDF. */
  themaRegel: string;
  tekst: string;
  vraag: string;
}

const WERKENERGIE_DEEL_ID = "werkenergie";
const KRACHTBRONNEN_OPSOMMING_MAX = 6;

/**
 * Bouwt het blok "Jouw krachtbronnen": alle thema's met een score van 7,5 of
 * hoger. Geeft null als geen enkel thema zo hoog scoort (dan vervalt het
 * blok). Bij thema's onder de 5,5 wordt de vraag aangevuld met het thema met
 * de laagste score (bij gelijke stand: het thema uit Werkenergie), zie
 * src/content/rapportteksten/algemeen.json. Bij meer dan zes thema's ≥7,5
 * vervangt één zin de opsomming ("Al je thema's..." of "Veel van je
 * thema's...").
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

  const themaRegel =
    krachtbronnen.length > KRACHTBRONNEN_OPSOMMING_MAX
      ? krachtbronnen.length === themaScores.length
        ? "Al je thema's scoren 7,5 of hoger."
        : "Veel van je thema's scoren 7,5 of hoger."
      : krachtbronnen.map((t) => `${t.themaTitel} (${formatScore(t.score)})`).join(", ");

  return {
    themas: krachtbronnen.map((t) => ({ themaId: t.themaId, themaTitel: t.themaTitel, score: t.score })),
    themaRegel,
    tekst: variant.tekst,
    vraag,
  };
}
