import { supabase } from "./client";

export interface ScanrondeContext {
  scanrondeId: string;
  scanrondeNaam: string;
  organisatieNaam: string;
  teamId: string | null;
  teamNaam: string | null;
}

/**
 * Haalt de gegevens op die nodig zijn om de introscherm te tonen. Geeft
 * `null` bij een ongeldige/ingetrokken link (onbekende scanronde of team dat
 * niet bij deze organisatie hoort).
 */
export async function haalScanrondeContext(
  scanrondeId: string,
  teamId: string | null
): Promise<ScanrondeContext | null> {
  const { data: scanronde, error: scanrondeError } = await supabase
    .from("scanrondes")
    .select("id, naam, organisatie_id, organisaties(naam)")
    .eq("id", scanrondeId)
    .maybeSingle();

  if (scanrondeError || !scanronde) return null;

  let teamNaam: string | null = null;
  if (teamId) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, naam, organisatie_id")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError || !team || team.organisatie_id !== scanronde.organisatie_id) {
      return null;
    }
    teamNaam = team.naam;
  }

  return {
    scanrondeId: scanronde.id,
    scanrondeNaam: scanronde.naam,
    organisatieNaam: scanronde.organisaties?.naam ?? "",
    teamId,
    teamNaam,
  };
}
