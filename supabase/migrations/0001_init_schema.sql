-- VIT-scan — datamodel voor het nieuwe EU-project (eu-west-1, Ierland).
--
-- Dit project start zonder data (zie
-- Opdrachten Claude Code/opdracht-verhuizen-en-schrijfrechten.md): er is
-- geen dump uit het oude Zürich-project nodig, dus deze migratie zet het
-- schema in één keer in de beveiligde eindvorm neer. Geen tussenstap met
-- open policies die later gerepareerd wordt, zoals in de git-historie van
-- het oude project (zie oudere commits voor die tussenstappen) — hier staat
-- de eindvorm er meteen: geen publieke schrijfrechten op
-- respondenten/antwoorden, geen publieke leesrechten op
-- organisaties/teams/scanrondes. Zie SECURITY.md regel 2, 6, 7 en 10.

create extension if not exists pgcrypto;

create table organisaties (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references organisaties (id) on delete cascade,
  naam text not null,
  created_at timestamptz not null default now()
);
create index teams_organisatie_id_idx on teams (organisatie_id);

-- organisatie_id is nullable: een scanronde kan ook zonder organisatienaam
-- bestaan (bv. een workshop waar Nynke geen bedrijfsnaam wil tonen).
create table scanrondes (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid references organisaties (id) on delete cascade,
  naam text not null,
  gestart_op timestamptz,
  gesloten_op timestamptz,
  email_verplicht boolean not null default false,
  boost_ingeschakeld boolean not null default true,
  gearchiveerd_op timestamptz,
  -- Nog niet actief, alleen de kolom (zie opdracht fase 2, punt 8): later
  -- instelbaar vanuit /beheer. Staat hij op false, dan worden de
  -- individuele antwoorden na afronden verwijderd en blijft alleen het
  -- geaggregeerde groepsrapport over. De logica en de knop daarvoor volgen
  -- pas na akkoord op het opruim-voorstel.
  individuele_gegevens_bewaren boolean not null default true,
  created_at timestamptz not null default now()
);
create index scanrondes_organisatie_id_idx on scanrondes (organisatie_id);

-- Eén respondent = één invulling van één scanronde.
-- respondent_code: leesbaar label (bv. "dappere-dolfijn-17"), geen geheim,
--   wel uniek per scanronde — zodat een medewerker het zelf kan onthouden.
-- toegangstoken: het echte geheim. De scan werkt vanaf deze migratie met dit
--   token in plaats van met het rijid, zodat niemand een andermans rij kan
--   raden of overschrijven (dat was het lek dat deze verhuizing dichtzet,
--   zie SECURITY.md regel 2). Wordt aangemaakt door start_respondent()
--   (0002_scan_functies.sql) en blijft alleen bij de browser van de
--   respondent — nooit in een link, log of doorgestuurd bericht.
create table respondenten (
  id uuid primary key default gen_random_uuid(),
  scanronde_id uuid not null references scanrondes (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  respondent_code text not null,
  toegangstoken uuid not null default gen_random_uuid() unique,
  email text,
  naam text,
  stellingen_versie text not null,
  -- Ongebruikt: de open vraag is uit de scanflow gehaald (commit 574be05).
  -- Kolom blijft staan voor eventuele toekomstige terugkeer, geen functie
  -- schrijft er (nog) naar.
  open_vraag_antwoord text,
  gestart_op timestamptz not null default now(),
  afgerond_op timestamptz,
  created_at timestamptz not null default now(),
  unique (scanronde_id, respondent_code)
);
create index respondenten_scanronde_id_idx on respondenten (scanronde_id);
create index respondenten_team_id_idx on respondenten (team_id);

-- stelling_key is positioneel en verwijst naar de stellingen in
-- src/content/vit-scan-stellingen.json, formaat: "<deelId>.<themaId>.<index>"
-- (index = 0-based volgorde van de stelling binnen het thema, doorlopend
-- over eventuele subcategorieën). Zie src/lib/stellingen.ts.
create table antwoorden (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null references respondenten (id) on delete cascade,
  stelling_key text not null,
  waarde smallint not null check (waarde between 1 and 10),
  created_at timestamptz not null default now(),
  unique (respondent_id, stelling_key)
);
create index antwoorden_respondent_id_idx on antwoorden (respondent_id);

-- Row Level Security
--
-- Privacyregel (CLAUDE.md): individuele resultaten zijn alléén voor de
-- medewerker. respondenten/antwoorden krijgen daarom GEEN policy — niet
-- voor anon, niet voor authenticated, geen SELECT, geen INSERT, geen
-- UPDATE, geen DELETE. Alle toegang loopt via de SECURITY DEFINER-functies
-- in 0002_scan_functies.sql, die zelf op het token controleren. Fail
-- closed: zonder policy is een RLS-tabel standaard dicht (SECURITY.md
-- regel 7). Dit vervangt de open "for insert/update ... using (true)"
-- policies uit het oude project.
alter table respondenten enable row level security;
alter table antwoorden enable row level security;

-- organisaties/teams/scanrondes: de scanpagina heeft de organisatie-/team-/
-- rondenaam nodig, maar niet meer via een publieke SELECT (die maakte
-- Nynkes klantenlijst voor iedereen met de anon-sleutel opvraagbaar). Dat
-- gaat vanaf nu via haal_scan_context() (0002_scan_functies.sql), die alleen
-- de velden teruggeeft die de introscreen nodig heeft voor precies één
-- scanronde/team. Lezen via de tabel zelf is alleen nog voor Nynkes
-- beheerscherm: to authenticated, met een expliciete auth.uid()-toets in de
-- policy in plaats van alleen op de rol te vertrouwen (SECURITY.md regel 2).
alter table organisaties enable row level security;
create policy "authenticated kan organisaties lezen" on organisaties
  for select to authenticated using (auth.uid() is not null);
create policy "authenticated kan organisaties aanmaken" on organisaties
  for insert to authenticated with check (auth.uid() is not null);
create policy "authenticated kan organisaties verwijderen" on organisaties
  for delete to authenticated using (auth.uid() is not null);

alter table teams enable row level security;
create policy "authenticated kan teams lezen" on teams
  for select to authenticated using (auth.uid() is not null);
create policy "authenticated kan teams aanmaken" on teams
  for insert to authenticated with check (auth.uid() is not null);

alter table scanrondes enable row level security;
create policy "authenticated kan scanrondes lezen" on scanrondes
  for select to authenticated using (auth.uid() is not null);
create policy "authenticated kan scanrondes aanmaken" on scanrondes
  for insert to authenticated with check (auth.uid() is not null);
create policy "authenticated kan scanrondes bijwerken" on scanrondes
  for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
create policy "authenticated kan scanrondes verwijderen" on scanrondes
  for delete to authenticated using (auth.uid() is not null);
