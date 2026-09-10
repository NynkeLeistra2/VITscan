-- Speciaal voor de keep-alive workflow in NynkeLeistra2/databasequery-: een
-- kleine, doelbewuste functie die alleen bestaat om aan te tonen dat de
-- database leeft, los van app-logica die later kan veranderen.
--
-- Waarom niet gewoon de kale PostgREST-rootroute (/rest/v1/) bevragen, zoals
-- de workflow tot nu toe deed: dat is mogelijk geen echte databasequery
-- (kan uit een gecachete schema-beschrijving komen) en telt dan niet als
-- activiteit voor Supabase's pauzeer-detectie. Deze functie doet wel een
-- echte SELECT op een echte tabel. `scanrondes` bevat geen persoonsgegevens
-- (alleen namen/instellingen van scanrondes zelf, geen respondentgegevens),
-- en het aantal alleen wordt teruggegeven, nooit de inhoud -- er komt dus
-- nooit een persoonsgegeven doorheen, ook niet toevallig.
--
-- SECURITY DEFINER, want scanrondes heeft geen publieke leesrechten meer:
-- zonder dat zou dit voor anon altijd 0 teruggeven (RLS blokkeert het),
-- nog steeds een echte query, maar minder nuttig als signaal dat de
-- database er nog normaal bij staat.
create or replace function public.keep_alive_ping()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from scanrondes;
$$;

revoke all on function public.keep_alive_ping() from public;
grant execute on function public.keep_alive_ping() to anon;
