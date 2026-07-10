import { genereerRespondentCode } from "./respondent-code";
import { STELLINGEN_VERSIE } from "./stellingen";

export interface ScanSessie {
  respondentId: string;
  respondentCode: string;
  stellingenVersie: string;
  /** stelling_key -> waarde (1-5) */
  antwoorden: Record<string, number>;
  openVraagAntwoord: string;
  afgerond: boolean;
  /** Index in de platte stappenlijst (0 = intro), zodat herladen hervat waar je was. */
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
    return JSON.parse(ruw) as ScanSessie;
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
    respondentId: crypto.randomUUID(),
    respondentCode: genereerRespondentCode(),
    stellingenVersie: STELLINGEN_VERSIE,
    antwoorden: {},
    openVraagAntwoord: "",
    afgerond: false,
    stapIndex: 0,
  };
}
