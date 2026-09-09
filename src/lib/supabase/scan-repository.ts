import { supabase } from "./client";

/**
 * Schrijffuncties voor de scanflow. Gaan via RPC naar SECURITY DEFINER
 * database-functies (zie supabase/migrations/0002_scan_functies.sql) in
 * plaats van rechtstreeks `.insert()`/`.update()` op respondenten/
 * antwoorden -- die twee tabellen hebben met opzet geen enkele policy, dus
 * rechtstreekse toegang vanuit de browser bestaat niet meer (SECURITY.md
 * regel 2).
 *
 * Werkt met een toegangstoken in plaats van het respondent-id: startRespondent
 * maakt de rij aan en geeft het token terug, alle volgende aanroepen nemen
 * dat token aan. Zo kan niemand een andermans rij raden of overschrijven --
 * het respondent-id zelf speelt in de app geen rol meer.
 */

export async function startRespondent(params: {
  scanrondeId: string;
  teamId: string | null;
  respondentCode: string;
  stellingenVersie: string;
  naam: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("start_respondent", {
    p_scanronde_id: params.scanrondeId,
    p_team_id: params.teamId,
    p_respondent_code: params.respondentCode,
    p_stellingen_versie: params.stellingenVersie,
    p_naam: params.naam,
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

export async function rondRespondentAf(
  toegangstoken: string,
  email: string | null
): Promise<void> {
  const { error } = await supabase.rpc("rond_respondent_af", {
    p_token: toegangstoken,
    p_email: email,
  });

  if (error) throw error;
}
