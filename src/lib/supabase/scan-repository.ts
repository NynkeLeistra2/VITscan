import { supabase } from "./client";

/**
 * Schrijffuncties voor de scanflow. Gaan via RPC naar SECURITY DEFINER
 * database-functies (zie supabase/migrations/0008_scan_volledig_anoniem.sql)
 * in plaats van rechtstreeks `.insert()`/`.update()` op respondenten/
 * antwoorden -- die twee tabellen hebben met opzet geen enkele policy, dus
 * rechtstreekse toegang vanuit de browser bestaat niet meer (SECURITY.md
 * regel 2).
 *
 * Werkt met een toegangstoken in plaats van het respondent-id: startRespondent
 * maakt de rij aan en geeft het token terug, alle volgende aanroepen nemen
 * dat token aan. De rij zelf bevat geen naam, e-mailadres of code (meer) --
 * de scan is volledig anoniem, alleen het token identificeert een sessie,
 * en dat token leeft alleen in de browser van de deelnemer.
 */

export async function startRespondent(params: {
  scanrondeId: string;
  teamId: string | null;
  stellingenVersie: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("start_respondent", {
    p_scanronde_id: params.scanrondeId,
    p_team_id: params.teamId,
    p_stellingen_versie: params.stellingenVersie,
  });

  if (error) throw error;
  return data;
}

export async function slaAntwoordenOp(
  toegangstoken: string,
  antwoorden: Record<string, number>
): Promise<void> {
  if (Object.keys(antwoorden).length === 0) return;

  const { error } = await supabase.rpc("upsert_antwoorden", {
    p_token: toegangstoken,
    p_antwoorden: antwoorden,
  });

  if (error) throw error;
}

export async function rondRespondentAf(toegangstoken: string): Promise<void> {
  const { error } = await supabase.rpc("rond_respondent_af", {
    p_token: toegangstoken,
  });

  if (error) throw error;
}

/** Zelfbediening: de deelnemer verwijdert zijn eigen antwoorden, met zijn
 * eigen token. Geen login nodig -- het zijn zijn eigen gegevens. */
export async function verwijderMijnAntwoorden(toegangstoken: string): Promise<void> {
  const { error } = await supabase.rpc("verwijder_mijn_antwoorden", {
    p_token: toegangstoken,
  });

  if (error) throw error;
}
