import { supabase } from "./client";

/**
 * Schrijffuncties voor de scanflow. Gaan via RPC naar SECURITY DEFINER
 * database-functies (zie supabase/migrations/0003_upsert_functies.sql) in
 * plaats van rechtstreeks `.insert()`/`.update()`/`.upsert()` op
 * respondenten/antwoorden.
 *
 * Waarom niet gewoon `.upsert()`: dat genereert `INSERT ... ON CONFLICT DO
 * UPDATE`, wat onder RLS SELECT-rechten vereist op de bestaande rij --
 * rechten die deze tabellen bewust niet hebben (privacyregel: individuele
 * antwoorden niet uitleesbaar via de API). En `.update(..., { count: 'exact'
 * })` gevolgd door `.insert()` bij count 0 werkt ook niet: PostgREST kan de
 * exacte count niet bepalen zonder select-recht en geeft dan altijd 0 terug,
 * ook als de rij al bestaat -- met een 409 (unique constraint) tot gevolg
 * zodra je een al opgeslagen antwoord probeert te overschrijven (bv. bij
 * "afronden", waar de volledige antwoordenset nog een keer wordt
 * aangeboden). De RPC-functies doen de upsert zelf, met eigenaarsrechten,
 * zonder dat de app ooit SELECT-toegang nodig heeft.
 */

export async function maakOfWerkRespondentBij(params: {
  respondentId: string;
  scanrondeId: string;
  teamId: string | null;
  respondentCode: string;
  stellingenVersie: string;
  naam: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("upsert_respondent", {
    p_respondent_id: params.respondentId,
    p_scanronde_id: params.scanrondeId,
    p_team_id: params.teamId,
    p_respondent_code: params.respondentCode,
    p_stellingen_versie: params.stellingenVersie,
    p_naam: params.naam,
  });

  if (error) throw error;
}

export async function slaAntwoordenOp(
  respondentId: string,
  antwoorden: Record<string, number>
): Promise<void> {
  if (Object.keys(antwoorden).length === 0) return;

  const { error } = await supabase.rpc("upsert_antwoorden", {
    p_respondent_id: respondentId,
    p_antwoorden: antwoorden,
  });

  if (error) throw error;
}

export async function rondRespondentAf(
  respondentId: string,
  email: string | null
): Promise<void> {
  const { error } = await supabase
    .from("respondenten")
    .update({
      afgerond_op: new Date().toISOString(),
      email,
    })
    .eq("id", respondentId);

  if (error) throw error;
}
