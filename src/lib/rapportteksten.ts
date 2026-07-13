import type { ScoreNiveau } from "./scoring-config";

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
