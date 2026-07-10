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

export interface ThemaMetStellingen {
  deelId: string;
  deelTitel: string;
  themaId: string;
  themaTitel: string;
  themaEmoji?: string;
  toelichting?: string;
  stellingen: StellingRef[];
}

export const STELLINGEN_VERSIE = vitScanData.meta.versie;

/**
 * Bouwt de thema-/stellingenlijst één keer op uit vit-scan-stellingen.json.
 * De `key` per stelling is positioneel: als de volgorde of inhoud van
 * stellingen wijzigt, verschuiven de keys en worden oude antwoorden
 * onvergelijkbaar met nieuwe — verhoog dan meta.versie.
 */
function bouwThemaLijst(): ThemaMetStellingen[] {
  const lijst: ThemaMetStellingen[] = [];

  for (const deel of vitScanData.delen) {
    for (const thema of deel.themas) {
      const stellingen: StellingRef[] = [];
      let index = 0;
      const voegToe = (tekst: string, subcategorieTitel: string | null) => {
        stellingen.push({
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

      lijst.push({
        deelId: deel.id,
        deelTitel: deel.titel,
        themaId: thema.id,
        themaTitel: thema.titel,
        themaEmoji: thema.emoji,
        toelichting: thema.toelichting,
        stellingen,
      });
    }
  }

  return lijst;
}

const THEMA_LIJST = bouwThemaLijst();

export function themaLijst(): ThemaMetStellingen[] {
  return THEMA_LIJST;
}

export function alleStellingen(): StellingRef[] {
  return THEMA_LIJST.flatMap((thema) => thema.stellingen);
}

export { vitScanData };
