import vitScanData from "@/content/vit-scan-stellingen.json";

export interface StellingRef {
  /** Positionele sleutel "<deelId>.<themaId>.<index>", gebruikt als antwoorden.stelling_key in de database. */
  key: string;
  tekst: string;
  deelId: string;
  deelTitel: string;
  themaId: string;
  themaTitel: string;
  subcategorieTitel: string | null;
}

export const STELLINGEN_VERSIE = vitScanData.meta.versie;

/**
 * Alle stellingen plat geslagen, in vaste JSON-volgorde. De `key` per stelling
 * is positioneel: als de volgorde of inhoud van stellingen in
 * vit-scan-stellingen.json wijzigt, verschuiven de keys en worden oude
 * antwoorden onvergelijkbaar met nieuwe — verhoog dan meta.versie.
 */
export function alleStellingen(): StellingRef[] {
  const refs: StellingRef[] = [];

  for (const deel of vitScanData.delen) {
    for (const thema of deel.themas) {
      let index = 0;
      const voegToe = (tekst: string, subcategorieTitel: string | null) => {
        refs.push({
          key: `${deel.id}.${thema.id}.${index}`,
          tekst,
          deelId: deel.id,
          deelTitel: deel.titel,
          themaId: thema.id,
          themaTitel: thema.titel,
          subcategorieTitel,
        });
        index += 1;
      };

      for (const tekst of thema.stellingen ?? []) voegToe(tekst, null);
      for (const sub of thema.subcategorieen ?? []) {
        for (const tekst of sub.stellingen) voegToe(tekst, sub.titel);
      }
    }
  }

  return refs;
}

export { vitScanData };
