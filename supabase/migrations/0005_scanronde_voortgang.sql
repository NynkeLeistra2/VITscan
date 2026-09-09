-- Leesfuncties voor /beheer: hoeveel mensen hebben de scan (al) afgerond,
-- en wat is de gemiddelde score per thema — zonder dat er ooit een los
-- antwoord, naam, e-mailadres of respondent-code uitkomt. respondenten/
-- antwoorden hebben met opzet geen policy (0001_init_schema.sql), dus dit
-- is de enige weg naar deze cijfers.
--
-- Anders dan scanronde_samenvattingen/scanronde_thema_samenvattingen
-- (0004_bewaartermijn.sql), die pas gevuld worden als de bewaartermijn
-- verstrijkt (3 maanden na afronden), rekenen deze functies live over de
-- respondenten die er nu nog staan — dus ook bruikbaar tijdens een lopende
-- scanronde, meteen na de eerste ingevulde reacties. Voor een scanronde die
-- al deels is opgeruimd, tel je de uitkomst van deze functie en van de
-- samenvattingstabellen bij elkaar op voor het volledige groepsrapport
-- (bouw ik in fase 3 samen met het rapportscherm).
create or replace function public.scanronde_deelnemers_aantal(p_scanronde_id uuid)
returns table (aantal_gestart integer, aantal_afgerond integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::integer as aantal_gestart,
    count(*) filter (where afgerond_op is not null)::integer as aantal_afgerond
  from respondenten
  where scanronde_id = p_scanronde_id;
$$;

revoke all on function public.scanronde_deelnemers_aantal(uuid) from public;
grant execute on function public.scanronde_deelnemers_aantal(uuid) to authenticated;

-- Gemiddelde per thema, alleen over afgeronde respondenten (een halverwege
-- gestopte scan heeft geen volledige thema-scores en zou het gemiddelde
-- scheeftrekken). Zelfde rekenwijze als het persoonlijk rapport
-- (berekenScores in src/lib/scoring.ts): eerst het gemiddelde per thema per
-- persoon, dan het gemiddelde van die gemiddelden over de groep — niet het
-- gemiddelde van alle losse stellingen samen.
create or replace function public.scanronde_thema_gemiddelden(p_scanronde_id uuid)
returns table (thema_id text, gemiddelde numeric, aantal_deelnemers integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    thema_id,
    round(avg(thema_gemiddelde), 1) as gemiddelde,
    count(*)::integer as aantal_deelnemers
  from (
    select
      r.id as respondent_id,
      split_part(a.stelling_key, '.', 2) as thema_id,
      avg(a.waarde) as thema_gemiddelde
    from antwoorden a
    join respondenten r on r.id = a.respondent_id
    where r.scanronde_id = p_scanronde_id
      and r.afgerond_op is not null
    group by r.id, split_part(a.stelling_key, '.', 2)
  ) per_respondent_thema
  group by thema_id;
$$;

revoke all on function public.scanronde_thema_gemiddelden(uuid) from public;
grant execute on function public.scanronde_thema_gemiddelden(uuid) to authenticated;
