-- Reparatie: upsert van respondenten/antwoorden via .update()+.insert() bleek
-- onbetrouwbaar. `update(..., { count: 'exact' })` geeft in deze opzet
-- (bewust geen select-policy, zie migratie 0001) altijd count 0 terug, ook
-- als de rij al bestaat -- PostgREST kan de exacte count niet bepalen zonder
-- select-recht. Gevolg: de app probeerde bij elke herhaalde save alsnog een
-- insert te doen op een rij die al bestond -> 409 (unique constraint) bij
-- "afronden", waar alle 19 thema's nog een keer worden aangeboden.
--
-- Oplossing: SECURITY DEFINER functies die de upsert zelf uitvoeren. Zo'n
-- functie draait met de rechten van de eigenaar (bypassed dus RLS voor de
-- schrijfactie zelf), maar exposet alleen deze ene, smalle actie -- er komt
-- geen SELECT op de tabellen bij. De privacyregel (individuele antwoorden
-- niet leesbaar via de API) blijft dus intact.

create or replace function upsert_respondent(
  p_respondent_id uuid,
  p_scanronde_id uuid,
  p_team_id uuid,
  p_respondent_code text,
  p_stellingen_versie text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into respondenten (id, scanronde_id, team_id, respondent_code, stellingen_versie)
  values (p_respondent_id, p_scanronde_id, p_team_id, p_respondent_code, p_stellingen_versie)
  on conflict (id) do update set
    scanronde_id = excluded.scanronde_id,
    team_id = excluded.team_id,
    respondent_code = excluded.respondent_code,
    stellingen_versie = excluded.stellingen_versie;
$$;

revoke all on function upsert_respondent(uuid, uuid, uuid, text, text) from public;
grant execute on function upsert_respondent(uuid, uuid, uuid, text, text) to anon, authenticated;

-- p_antwoorden: jsonb object zoals { "1.1.0": 3, "1.1.1": 5, ... } (stelling_key -> waarde)
create or replace function upsert_antwoorden(
  p_respondent_id uuid,
  p_antwoorden jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into antwoorden (respondent_id, stelling_key, waarde)
  select p_respondent_id, key, value::smallint
  from jsonb_each_text(p_antwoorden)
  on conflict (respondent_id, stelling_key) do update set waarde = excluded.waarde;
$$;

revoke all on function upsert_antwoorden(uuid, jsonb) from public;
grant execute on function upsert_antwoorden(uuid, jsonb) to anon, authenticated;
