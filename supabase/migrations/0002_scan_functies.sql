-- Functies waarmee de scan (anon-sleutel) schrijft en leest. Vervangen: geen
-- rechtstreekse INSERT/UPDATE/SELECT meer op respondenten/antwoorden/
-- organisaties/teams/scanrondes vanuit de browser — alles loopt via deze
-- SECURITY DEFINER-functies, die zelf controleren wie er aan de knoppen zit
-- in plaats van dat aan te nemen (SECURITY.md regel 2).
--
-- Volgorde in de scanflow: haal_scan_context (intro, nog geen token) →
-- start_respondent (klik op starten, maakt het token) → upsert_antwoorden
-- (per thema, met token) → rond_respondent_af (afronden, met token).

-- ---------------------------------------------------------------------------
-- 1. haal_scan_context: leesrechten voor de introscreen, zonder dat
--    organisaties/scanrondes/teams publiek doorzoekbaar zijn. Werkt op de
--    twee id's die al in de link staan (scanronde-id, optioneel team-id) —
--    er is op dit moment nog geen token, dat bestaat pas na starten. Omdat
--    de functie maar één specifieke ronde/team teruggeeft (en niets als de
--    combinatie niet klopt), blijft de klantenlijst zelf ontoegankelijk.
create or replace function public.haal_scan_context(
  p_scanronde_id uuid,
  p_team_id uuid default null
)
returns table (
  scanronde_naam text,
  organisatie_naam text,
  team_naam text,
  email_verplicht boolean,
  boost_ingeschakeld boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.naam,
    o.naam,
    t.naam,
    s.email_verplicht,
    s.boost_ingeschakeld
  from scanrondes s
  left join organisaties o on o.id = s.organisatie_id
  left join teams t
    on t.id = p_team_id
    and t.organisatie_id = s.organisatie_id
  where s.id = p_scanronde_id
    and s.gearchiveerd_op is null
    and (p_team_id is null or t.id is not null);
$$;

revoke all on function public.haal_scan_context(uuid, uuid) from public;
grant execute on function public.haal_scan_context(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rate limiting voor start_respondent: een kleine, op zichzelf staande
-- teltabel, geen persoonsgegevens. IP komt uit de request-headers die
-- Supabase/PostgREST als GUC beschikbaar stelt (niet uit de
-- databaseverbinding zelf, die loopt via een gedeelde pooler). Zonder die
-- header valt alles terug op het "ip" 'onbekend' — dan geldt het limiet
-- voor dat verkeer gezamenlijk, wat nog steeds beschermt tegen een script
-- dat de header weglaat, maar wél betekent dat we dit in fase 4 moeten
-- controleren met een echt verzoek (zie testplan).
--
-- Geteld per (ip, scanronde) in plaats van per ip alleen: een groep die in
-- één ruimte achter hetzelfde ip een heel andere scanronde start, mag het
-- budget van deze scanronde niet al opgebruikt hebben. Voor een workshop
-- waar veel deelnemers wél tegelijk dezelfde scanronde starten vanaf
-- hetzelfde ip, kan het limiet per scanronde omhoog (zie
-- scanrondes.start_limiet_per_ip / zet_start_limiet hieronder) — anders is
-- dit een bekende beperking die zich meldt met een duidelijke foutmelding,
-- niet met een stille mislukking.
create table public.rate_limit_start_respondent (
  ip text not null,
  scanronde_id uuid not null,
  venster_begin timestamptz not null,
  aantal integer not null,
  primary key (ip, scanronde_id)
);

-- Geen RLS-policy nodig: deze tabel wordt alleen door start_respondent()
-- zelf aangeraakt (SECURITY DEFINER), nooit rechtstreeks door anon/
-- authenticated. RLS staat toch aan, voor het geval dat later verandert.
alter table public.rate_limit_start_respondent enable row level security;

-- Verruimen vanuit /beheer (de functie nu, de knop volgt in fase 3): een
-- ondergrens van 1 voorkomt per ongeluk de bescherming helemaal
-- uitschakelen, een bovengrens van 500 voorkomt een tikfout (bv. een 0
-- vergeten) die de bescherming juist zinloos streng maakt.
create or replace function public.zet_start_limiet(p_scanronde_id uuid, p_limiet integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet toegestaan.';
  end if;
  if p_limiet < 1 or p_limiet > 500 then
    raise exception 'Limiet moet tussen 1 en 500 liggen.';
  end if;

  update scanrondes set start_limiet_per_ip = p_limiet where id = p_scanronde_id;
end;
$$;

revoke all on function public.zet_start_limiet(uuid, integer) from public;
grant execute on function public.zet_start_limiet(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. start_respondent: maakt de respondent pas aan als de deelnemer echt op
--    "beginnen" klikt (niet bij het laden van de introscreen — dat voorkomt
--    lege rijen bij herladen). Geeft het toegangstoken terug; dat is vanaf
--    hier het enige dat de browser gebruikt om zichzelf te identificeren.
--    Weigert op een gearchiveerde scanronde en is rate-limited.
create or replace function public.start_respondent(
  p_scanronde_id uuid,
  p_team_id uuid,
  p_respondent_code text,
  p_stellingen_versie text,
  p_naam text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_venster interval := interval '10 minutes';
  -- Standaard, ruim genoeg voor een workshop achter één wifi-aansluiting/
  -- NAT (meerdere mensen delen dan hetzelfde ip), streng genoeg tegen een
  -- script dat massaal rijen aanmaakt. Per scanronde te verruimen via
  -- scanrondes.start_limiet_per_ip / zet_start_limiet().
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

  insert into respondenten (scanronde_id, team_id, respondent_code, stellingen_versie, naam)
  values (p_scanronde_id, p_team_id, p_respondent_code, p_stellingen_versie, p_naam)
  returning toegangstoken into v_token;

  return v_token;
end;
$$;

revoke all on function public.start_respondent(uuid, uuid, text, text, text) from public;
grant execute on function public.start_respondent(uuid, uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. upsert_antwoorden: slaat antwoorden op voor de respondent die bij dit
--    token hoort. Doet niets — geen foutmelding, gewoon nul rijen — als het
--    token niet bestaat of de scan al is afgerond. Vorm exact zoals
--    afgesproken in de opdracht.
create or replace function public.upsert_antwoorden(p_token uuid, p_antwoorden jsonb)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into antwoorden (respondent_id, stelling_key, waarde)
  select r.id, e.key, e.value::smallint
  from respondenten r
  cross join jsonb_each_text(p_antwoorden) as e
  where r.toegangstoken = p_token
    and r.afgerond_op is null
  on conflict (respondent_id, stelling_key) do update set waarde = excluded.waarde;
$function$;

revoke all on function public.upsert_antwoorden(uuid, jsonb) from public;
grant execute on function public.upsert_antwoorden(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. rond_respondent_af: zet afgerond_op en slaat het e-mailadres op (alleen
--    als de respondent dat invulde/opt-in gaf — dat bepaalt de app, niet
--    deze functie). Idempotent door de `afgerond_op is null`-voorwaarde:
--    een tweede aanroep met een al afgeronde respondent verandert niets,
--    dus een afgeronde scan is niet meer te wijzigen.
create or replace function public.rond_respondent_af(p_token uuid, p_email text default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update respondenten
  set afgerond_op = now(),
      email = p_email
  where toegangstoken = p_token
    and afgerond_op is null;
$function$;

revoke all on function public.rond_respondent_af(uuid, text) from public;
grant execute on function public.rond_respondent_af(uuid, text) to anon, authenticated;
