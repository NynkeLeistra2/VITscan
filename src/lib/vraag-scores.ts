import { themaLijst } from "./stellingen";

export interface VraagScore {
  key: string;
  tekst: string;
  subcategorieTitel: string | null;
  score: number | null;
}

export interface ThemaVraagScores {
  themaId: string;
  themaTitel: string;
  themaEmoji?: string;
  deelId: string;
  deelTitel: string;
  vragen: VraagScore[];
}

/**
 * Losse stellingscores per thema, voor de uitklapbare "score per vraag"
 * (RapportScreen) en de gelijknamige bijlage in het PDF-rapport. Los van
 * berekenScores(): die middelt alleen, hier gaat het juist om de losse
 * antwoorden.
 */
export function berekenVraagScores(antwoorden: Record<string, number>): ThemaVraagScores[] {
  return themaLijst().map((thema) => ({
    themaId: thema.themaId,
    themaTitel: thema.themaTitel,
    themaEmoji: thema.themaEmoji,
    deelId: thema.deelId,
    deelTitel: thema.deelTitel,
    vragen: thema.stellingen.map((s) => ({
      key: s.key,
      tekst: s.tekst,
      subcategorieTitel: s.subcategorieTitel,
      score: antwoorden[s.key] ?? null,
    })),
  }));
}
