-- Bewaartermijn, technisch afgedwongen (niet als afspraak, maar als iets
-- dat de database zelf elke nacht uitvoert): afgeronde scans 3 maanden na
-- afronden verwijderd, niet-afgeronde/lege respondenten na 30 dagen. Voor
-- het opruimen verdwijnt, blijft er per scanronde een geanonimiseerd
-- overzicht staan (aantal deelnemers + gemiddelde score per thema) zodat
-- het groepsrapport altijd nog te maken is — geen namen, mails,
-- respondent-codes of losse antwoorden.
--
-- Alleen afgeronde respondenten tellen mee in dat overzicht: een
-- niet-afgeronde/lege poging (bv. iemand die de link opende en meteen
-- wegklikte) voegt niets zinnigs toe aan een groepsrapport en verdwijnt
-- dus spoorloos.

create extension if not exists pg_cron;

create table scanronde_samenvattingen (
  scanronde_id uuid primary key references scanrondes (id) on delete cascade,
  aantal_deelnemers integer not null default 0,
  laatst_bijgewerkt_op timestamptz not null default now()
);

alter table scanronde_samenvattingen enable row level security;
create policy "authenticated kan samenvattingen lezen" on scanronde_samenvattingen
  for select to authenticated using (auth.uid() is not null);

-- Eén rij per scanronde × thema. Som + aantal in plaats van een kant-en-klaar
-- gemiddelde, zodat een volgende opruimronde voor dezelfde scanronde er
-- gewoon bovenop kan tellen (gemiddelde = som_scores / aantal_scores, uit te
-- rekenen op het moment dat het groepsrapport gemaakt wordt).
create table scanronde_thema_samenvattingen (
  scanronde_id uuid not null references scanrondes (id) on delete cascade,
  thema_id text not null,
  som_scores numeric not null default 0,
  aantal_scores integer not null default 0,
  primary key (scanronde_id, thema_id)
);

alter table scanronde_thema_samenvattingen enable row level security;
create policy "authenticated kan thema-samenvattingen lezen" on scanronde_thema_samenvattingen
  for select to authenticated using (auth.uid() is not null);

-- Handmatig verlengen vanuit /beheer (de kolom nu, de knop volgt in fase 3
-- samen met de rest van de frontend-aanpassing): zolang dit veld in de
-- toekomst ligt, slaat de opruimfunctie alle respondenten van deze
-- scanronde over, ongeacht hun eigen individuele termijn.
alter table scanrondes add column bewaartermijn_verlengd_tot timestamptz;

create or replace function public.verleng_bewaartermijn(p_scanronde_id uuid, p_aantal_maanden integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet toegestaan.';
  end if;
  if p_aantal_maanden not in (1, 3) then
    raise exception 'Alleen verlengen met 1 of 3 maanden.';
  end if;

  update scanrondes
  set bewaartermijn_verlengd_tot =
    greatest(coalesce(bewaartermijn_verlengd_tot, now()), now())
    + (p_aantal_maanden::text || ' months')::interval
  where id = p_scanronde_id;
end;
$$;

revoke all on function public.verleng_bewaartermijn(uuid, integer) from public;
grant execute on function public.verleng_bewaartermijn(uuid, integer) to authenticated;

-- De opruimfunctie zelf. Per scanronde die iets te verwijderen heeft: eerst
-- optellen bij het overzicht, dan verwijderen (in die volgorde, zodat een
-- onderbreking halverwege nooit tot verlies zonder overzicht leidt).
create or replace function public.ruim_verlopen_respondenten_op()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scanronde_id uuid;
begin
  for v_scanronde_id in
    select distinct r.scanronde_id
    from respondenten r
    join scanrondes s on s.id = r.scanronde_id
    where (
      (r.afgerond_op is not null and r.afgerond_op < now() - interval '3 months')
      or (r.afgerond_op is null and r.gestart_op < now() - interval '30 days')
    )
    and (s.bewaartermijn_verlengd_tot is null or s.bewaartermijn_verlengd_tot < now())
  loop
    insert into scanronde_samenvattingen (scanronde_id, aantal_deelnemers, laatst_bijgewerkt_op)
    select v_scanronde_id, count(*), now()
    from respondenten r
    where r.scanronde_id = v_scanronde_id
      and r.afgerond_op is not null
      and r.afgerond_op < now() - interval '3 months'
    having count(*) > 0
    on conflict (scanronde_id) do update set
      aantal_deelnemers = scanronde_samenvattingen.aantal_deelnemers + excluded.aantal_deelnemers,
      laatst_bijgewerkt_op = now();

    -- thema_gemiddelde per respondent eerst (zelfde rekenwijze als het
    -- persoonlijk rapport, zie berekenScores in src/lib/scoring.ts), dan
    -- die gemiddelden optellen -- zodat het straks uit te rekenen
    -- groepsgemiddelde het gemiddelde van de thema-scores per persoon is,
    -- niet het gemiddelde van alle losse stellingen samen.
    insert into scanronde_thema_samenvattingen (scanronde_id, thema_id, som_scores, aantal_scores)
    select v_scanronde_id, thema_id, sum(thema_gemiddelde), count(*)
    from (
      select
        r.id as respondent_id,
        split_part(a.stelling_key, '.', 2) as thema_id,
        avg(a.waarde) as thema_gemiddelde
      from antwoorden a
      join respondenten r on r.id = a.respondent_id
      where r.scanronde_id = v_scanronde_id
        and r.afgerond_op is not null
        and r.afgerond_op < now() - interval '3 months'
      group by r.id, split_part(a.stelling_key, '.', 2)
    ) per_respondent_thema
    group by thema_id
    on conflict (scanronde_id, thema_id) do update set
      som_scores = scanronde_thema_samenvattingen.som_scores + excluded.som_scores,
      aantal_scores = scanronde_thema_samenvattingen.aantal_scores + excluded.aantal_scores;

    -- Antwoorden gaan automatisch mee via on delete cascade.
    delete from respondenten r
    where r.scanronde_id = v_scanronde_id
      and (
        (r.afgerond_op is not null and r.afgerond_op < now() - interval '3 months')
        or (r.afgerond_op is null and r.gestart_op < now() - interval '30 days')
      );
  end loop;
end;
$$;

revoke all on function public.ruim_verlopen_respondenten_op() from public;

-- Elke nacht om 03:00 UTC. Idempotent: een herhaalde deploy van deze
-- migratie plant de job niet dubbel.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ruim-verlopen-respondenten-op') then
    perform cron.unschedule('ruim-verlopen-respondenten-op');
  end if;
end;
$$;

select cron.schedule(
  'ruim-verlopen-respondenten-op',
  '0 3 * * *',
  $$ select public.ruim_verlopen_respondenten_op(); $$
);
