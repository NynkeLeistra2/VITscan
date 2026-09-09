import { genereerRespondentCode } from "./respondent-code";
import { STELLINGEN_VERSIE } from "./stellingen";

export interface ScanSessie {
  /**
   * Null tot startRespondent() geslaagd is (klik op "beginnen"): pas dan
   * bestaat er een respondent-rij en dus een token. Vóór dat moment is er
   * niets om mee te schrijven, alleen lokale antwoorden in deze sessie.
   */
  toegangstoken: string | null;
  respondentCode: string;
  stellingenVersie: string;
  /** Optioneel: zodat de medewerker zichzelf op het rapport herkent i.p.v. alleen de respondent-code. */
  naam: string;
  /** stelling_key -> waarde (1-10) */
  antwoorden: Record<string, number>;
  email: string;
  /** Standaard aan: mensen kunnen 'm uitzetten als ze geen rapport per e-mail willen. */
  emailOptIn: boolean;
  afgerond: boolean;
  /** Index in de platte stappenlijst (0 = intro, 1 per stelling, dan e-mailstap/afgerond), zodat herladen hervat waar je was. */
  stapIndex: number;
}

function opslagSleutel(scanrondeId: string, teamId: string | null): string {
  return `vit-scan:${scanrondeId}:${teamId ?? "geen-team"}`;
}

/** Haalt een lopende sessie op uit localStorage, zodat bij herladen niets verloren gaat. */
export function laadSessie(
  scanrondeId: string,
  teamId: string | null
): ScanSessie | null {
  if (typeof window === "undefined") return null;

  const ruw = window.localStorage.getItem(opslagSleutel(scanrondeId, teamId));
  if (!ruw) return null;

  try {
    const sessie = JSON.parse(ruw) as ScanSessie & { respondentId?: string };
    // Sessie van vóór de verhuizing naar het nieuwe project: had een
    // respondent-id (rechtstreeks, geen token) dat verwijst naar een rij in
    // de oude database. Die rij bestaat straks niet meer -- niets aan te
    // hervatten, dus behandel als "geen sessie" zodat er een nieuwe met een
    // echt token wordt gestart.
    if ("respondentId" in sessie && !("toegangstoken" in sessie)) return null;
    // Sessies opgeslagen vóór introductie van het naamveld hebben dit nog niet.
    return { ...sessie, naam: sessie.naam ?? "" };
  } catch {
    return null;
  }
}

export function opslaanSessie(
  scanrondeId: string,
  teamId: string | null,
  sessie: ScanSessie
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    opslagSleutel(scanrondeId, teamId),
    JSON.stringify(sessie)
  );
}

export function nieuweSessie(): ScanSessie {
  return {
    toegangstoken: null,
    respondentCode: genereerRespondentCode(),
    stellingenVersie: STELLINGEN_VERSIE,
    naam: "",
    antwoorden: {},
    email: "",
    emailOptIn: true,
    afgerond: false,
    stapIndex: 0,
  };
}
