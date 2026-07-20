import { genereerRespondentCode } from "./respondent-code";
import { STELLINGEN_VERSIE } from "./stellingen";

export interface ScanSessie {
  respondentId: string;
  respondentCode: string;
  stellingenVersie: string;
  /** Optioneel: zodat de medewerker zichzelf op het rapport herkent i.p.v. alleen de respondent-code. */
  naam: string;
  /** Optioneel: alleen relevant bij scanrondes zonder vaste organisatiekoppeling (bv. een algemene workshop-link), zodat de webhook toch weet voor welk bedrijf dit is. Wordt niet in Supabase bewaard, alleen doorgestuurd naar de n8n-webhook. */
  organisatie: string;
  /** stelling_key -> waarde (1-10) */
  antwoorden: Record<string, number>;
  openVraagAntwoord: string;
  email: string;
  /** Standaard aan: mensen kunnen 'm uitzetten als ze geen rapport per e-mail willen. */
  emailOptIn: boolean;
  afgerond: boolean;
  /** Index in de platte stappenlijst (0 = intro, 1 per stelling, dan open vraag/afgerond), zodat herladen hervat waar je was. */
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
    const sessie = JSON.parse(ruw) as ScanSessie;
    // Sessies opgeslagen vóór introductie van het naam-/organisatieveld hebben dit nog niet.
    return { ...sessie, naam: sessie.naam ?? "", organisatie: sessie.organisatie ?? "" };
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
    naam: "",
    organisatie: "",
    antwoorden: {},
    openVraagAntwoord: "",
    email: "",
    emailOptIn: true,
    afgerond: false,
    stapIndex: 0,
  };
}
