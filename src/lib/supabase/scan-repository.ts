import { supabase } from "./client";

/**
 * Schrijffuncties voor de scanflow. Bewust alleen insert/update zonder
 * `.select()` erna: respondenten/antwoorden hebben geen select-policy (zie
 * supabase/migrations/0001_init_schema.sql), dus een representation-request
 * zou door RLS altijd leeg terugkomen. id's worden daarom altijd
 * client-side gegenereerd (crypto.randomUUID()) vóór het schrijven.
 */

export async function maakOfWerkRespondentBij(params: {
  respondentId: string;
  scanrondeId: string;
  teamId: string | null;
  respondentCode: string;
  stellingenVersie: string;
}): Promise<void> {
  const { error } = await supabase.from("respondenten").upsert(
    {
      id: params.respondentId,
      scanronde_id: params.scanrondeId,
      team_id: params.teamId,
      respondent_code: params.respondentCode,
      stellingen_versie: params.stellingenVersie,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function slaAntwoordenOp(
  respondentId: string,
  antwoorden: Record<string, number>
): Promise<void> {
  const rijen = Object.entries(antwoorden).map(([stellingKey, waarde]) => ({
    respondent_id: respondentId,
    stelling_key: stellingKey,
    waarde,
  }));

  if (rijen.length === 0) return;

  const { error } = await supabase
    .from("antwoorden")
    .upsert(rijen, { onConflict: "respondent_id,stelling_key" });

  if (error) throw error;
}

export async function rondRespondentAf(
  respondentId: string,
  openVraagAntwoord: string
): Promise<void> {
  const { error } = await supabase
    .from("respondenten")
    .update({
      afgerond_op: new Date().toISOString(),
      open_vraag_antwoord: openVraagAntwoord || null,
    })
    .eq("id", respondentId);

  if (error) throw error;
}
