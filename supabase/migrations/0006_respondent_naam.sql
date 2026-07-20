-- Optioneel naamveld voor respondenten: op verzoek van Nynke kan een
-- medewerker aan het begin van de scan zelf een naam invullen, zodat die
-- zichzelf op het rapport herkent i.p.v. alleen aan de respondent-code. Net
-- als e-mail blijft dit optioneel en is er GEEN select-policy op
-- respondenten (zie 0001_init_schema.sql) — de naam is dus nooit uitleesbaar
-- via de anon-key/API, alleen rechtstreeks door Nynke in de database. De
-- privacyregel blijft daarmee intact: individuele resultaten (incl. naam)
-- zijn alléén voor de medewerker, nooit gekoppeld zichtbaar voor de
-- werkgever/teamrapportage.
alter table respondenten
  add column if not exists naam text;

drop function if exists upsert_respondent(uuid, uuid, uuid, text, text);

create or replace function upsert_respondent(
  p_respondent_id uuid,
  p_scanronde_id uuid,
  p_team_id uuid,
  p_respondent_code text,
  p_stellingen_versie text,
  p_naam text default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into respondenten (id, scanronde_id, team_id, respondent_code, stellingen_versie, naam)
  values (p_respondent_id, p_scanronde_id, p_team_id, p_respondent_code, p_stellingen_versie, p_naam)
  on conflict (id) do update set
    scanronde_id = excluded.scanronde_id,
    team_id = excluded.team_id,
    respondent_code = excluded.respondent_code,
    stellingen_versie = excluded.stellingen_versie,
    naam = excluded.naam;
$$;

revoke all on function upsert_respondent(uuid, uuid, uuid, text, text, text) from public;
grant execute on function upsert_respondent(uuid, uuid, uuid, text, text, text) to anon, authenticated;
