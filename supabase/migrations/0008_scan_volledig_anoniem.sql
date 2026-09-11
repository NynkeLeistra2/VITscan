-- De scan volledig anoniem maken: geen enkel gegeven meer in de database dat
-- een antwoord naar een persoon terug kan leiden. Zie
-- BESLISSINGEN.md voor de volledige toelichting en het voorstel dat hieraan
-- voorafging.
--
-- Drie testrijen (frisse-leeuw-61, vrolijke-vos-37, rustige-vlinder-74)
-- hebben al een e-mailadres van Nynke zelf staan -- die verdwijnen hier ook
-- mee, met haar akkoord.

-- ---------------------------------------------------------------------------
-- 1. Kolommen weg: naam, email, respondent_code, en de al ongebruikte
--    open_vraag_antwoord. Wat overblijft: id, toegangstoken, scanronde_id,
--    team_id, stellingen_versie, gestart_op, afgerond_op, created_at -- geen
--    van die kan iemand aan een persoon koppelen.
alter table respondenten
  drop column naam,
  drop column email,
  drop column respondent_code,
  drop column open_vraag_antwoord;

-- Teller voor het versturen van het rapport per mail (zie
-- mag_rapport_versturen hieronder). Puur een getal, geen persoonsgegeven.
alter table respondenten
  add column rapport_mail_pogingen integer not null default 0;

-- ---------------------------------------------------------------------------
-- 2. start_respondent zonder code/naam-parameters.
create or replace function public.start_respondent(
  p_scanronde_id uuid,
  p_team_id uuid,
  p_stellingen_versie text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_venster interval := interval '10 minutes';
  v_limiet integer;
  v_nu timestamptz := now();
  v_aantal integer;
  v_token uuid;
begin
  select coalesce(start_limiet_per_ip, 20)
  into v_limiet
  from scanrondes
  where id = p_scanronde_id and gearchiveerd_op is null;

  if v_limiet is null then
    raise exception 'Deze scanronde bestaat niet (meer).';
  end if;

  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'onbekend'),
    ',', 1
  );

  insert into rate_limit_start_respondent (ip, scanronde_id, venster_begin, aantal)
  values (v_ip, p_scanronde_id, v_nu, 1)
  on conflict (ip, scanronde_id) do update set
    aantal = case
      when rate_limit_start_respondent.venster_begin < v_nu - v_venster then 1
      else rate_limit_start_respondent.aantal + 1
    end,
    venster_begin = case
      when rate_limit_start_respondent.venster_begin < v_nu - v_venster then v_nu
      else rate_limit_start_respondent.venster_begin
    end
  returning aantal into v_aantal;

  if v_aantal > v_limiet then
    raise exception 'Te veel pogingen om te starten, probeer het over een paar minuten opnieuw.';
  end if;

  insert into respondenten (scanronde_id, team_id, stellingen_versie)
  values (p_scanronde_id, p_team_id, p_stellingen_versie)
  returning toegangstoken into v_token;

  return v_token;
end;
$$;

revoke all on function public.start_respondent(uuid, uuid, text) from public;
grant execute on function public.start_respondent(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. rond_respondent_af zet alleen nog afgerond_op. Het e-mailadres gaat
--    voortaan rechtstreeks van de browser naar de mailroute, nooit via de
--    database.
create or replace function public.rond_respondent_af(p_token uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update respondenten
  set afgerond_op = now()
  where toegangstoken = p_token
    and afgerond_op is null;
$function$;

revoke all on function public.rond_respondent_af(uuid) from public;
grant execute on function public.rond_respondent_af(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. mag_rapport_versturen: poortwachter voor de mailroute
-- (/api/verstuur-resultaten). Zonder dit zou die route een open kanaal zijn
-- om namens contact@nynkeleistra.nl mail naar een willekeurig, door de
-- aanvrager zelf opgegeven adres te sturen. Twee dingen tegelijk, atomisch
-- in één update (voorkomt een race tussen controleren en tellen):
--   - het token moet bestaan en bij een echt afgeronde respondent horen;
--   - een teller per respondent (max. 5) voorkomt dat één geldig token
--     (van iemands eigen, echte scan) gebruikt wordt om steeds een ánder
--     e-mailadres te bestoken.
create or replace function public.mag_rapport_versturen(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mag boolean;
begin
  update respondenten
  set rapport_mail_pogingen = rapport_mail_pogingen + 1
  where toegangstoken = p_token
    and afgerond_op is not null
    and rapport_mail_pogingen < 5
  returning true into v_mag;

  return coalesce(v_mag, false);
end;
$$;

revoke all on function public.mag_rapport_versturen(uuid) from public;
grant execute on function public.mag_rapport_versturen(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Zelf je gegevens laten verwijderen -- de deelnemer zelf, met zijn eigen
--    token, geen login nodig (het zijn zijn eigen gegevens). Vervangt
--    verwijder_respondent (zie 6): met naam/mail/code weg is er ook voor
--    Nynke geen gegeven meer om één specifieke persoon uit de groep te
--    pikken -- dit wordt de enige weg om één respondent te verwijderen.
create or replace function public.verwijder_mijn_antwoorden(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from respondenten where toegangstoken = p_token;
$$;

revoke all on function public.verwijder_mijn_antwoorden(uuid) from public;
grant execute on function public.verwijder_mijn_antwoorden(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. verwijder_respondent (0003_verwijder_respondent.sql) zocht op
--    scanronde_id + respondent_code -- die kolom bestaat niet meer, en er is
--    ook geen ander gegeven meer waarmee Nynke één respondent zou kunnen
--    aanwijzen. Vervalt.
drop function if exists public.verwijder_respondent(uuid, text);
