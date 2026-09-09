import { supabase } from "./client";

export interface ScanrondeContext {
  scanrondeId: string;
  scanrondeNaam: string;
  organisatieNaam: string;
  teamId: string | null;
  teamNaam: string | null;
  emailVerplicht: boolean;
  boostIngeschakeld: boolean;
}

/**
 * Haalt de gegevens op die nodig zijn om de introscherm te tonen, via de
 * functie haal_scan_context (zie supabase/migrations/0002_scan_functies.sql)
 * in plaats van een rechtstreekse SELECT op organisaties/scanrondes/teams --
 * die drie tabellen hebben geen publieke leesrechten meer (dat maakte
 * Nynkes klantenlijst opvraagbaar voor iedereen met de anon-sleutel).
 *
 * Er is op dit moment nog geen toegangstoken (dat ontstaat pas bij het
 * starten van de scan): de functie werkt op de twee id's die al in de link
 * staan. Geeft `null` bij een ongeldige/ingetrokken link (onbekende
 * scanronde, gearchiveerde scanronde, of een team dat niet bij deze
 * organisatie hoort) -- de functie geeft dan gewoon geen rij terug.
 */
export async function haalScanrondeContext(
  scanrondeId: string,
  teamId: string | null
): Promise<ScanrondeContext | null> {
  const { data, error } = await supabase
    .rpc("haal_scan_context", {
      p_scanronde_id: scanrondeId,
      p_team_id: teamId,
    })
    .maybeSingle();

  if (error || !data) return null;

  return {
    scanrondeId,
    scanrondeNaam: data.scanronde_naam,
    organisatieNaam: data.organisatie_naam ?? "",
    teamId,
    teamNaam: data.team_naam,
    emailVerplicht: data.email_verplicht,
    boostIngeschakeld: data.boost_ingeschakeld,
  };
}
