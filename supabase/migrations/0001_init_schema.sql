-- VIT-scan — initieel datamodel (Wave 1)
-- Entiteiten: organisatie, team, scanronde, respondent, antwoorden.
-- Wave 1 heeft geen auth/beheeromgeving: organisaties/teams/scanrondes worden
-- voorlopig handmatig aangemaakt (via deze SQL editor) door Nynke.

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

create table scanrondes (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references organisaties (id) on delete cascade,
  naam text not null,
  gestart_op timestamptz,
  gesloten_op timestamptz,
  created_at timestamptz not null default now()
);
create index scanrondes_organisatie_id_idx on scanrondes (organisatie_id);

-- Eén respondent = één invulling van één scanronde. respondent_code is een
-- door de medewerker zelf onthouden/herbruikbare code (geen naam/e-mail),
-- zodat een vervolgmeting later gekoppeld kan worden. team_id is nullable
-- omdat een link soms nog geen team vastlegt (dan wordt het in de intro
-- gevraagd — zie projectplan 3.1).
create table respondenten (
  id uuid primary key default gen_random_uuid(),
  scanronde_id uuid not null references scanrondes (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  respondent_code text not null,
  email text,
  stellingen_versie text not null,
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
  waarde smallint not null check (waarde between 1 and 5),
  created_at timestamptz not null default now(),
  unique (respondent_id, stelling_key)
);
create index antwoorden_respondent_id_idx on antwoorden (respondent_id);

-- Row Level Security
-- Wave 1 heeft geen auth, dus alles draait via de anon/publishable key.
-- Privacyregel (niet-onderhandelbaar, zie CLAUDE.md): individuele resultaten
-- zijn alléén voor de medewerker. Daarom is er GEEN select-policy op
-- respondenten/antwoorden: het persoonlijk rapport wordt direct na afronden
-- client-side opgebouwd uit de zojuist verzonden antwoorden, niet opnieuw
-- opgevraagd. Gebruik in de app dus geen `.select()` na een insert/update op
-- deze twee tabellen (dat faalt door RLS) — vraag `{ count: 'exact' }` of
-- niets terug.
-- organisaties/teams/scanrondes bevatten geen privacygevoelige data (alleen
-- namen), die mogen wel gelezen worden zodat de intro-pagina de juiste
-- organisatie/team/ronde-naam kan tonen.

alter table organisaties enable row level security;
create policy "organisaties zijn leesbaar" on organisaties for select using (true);

alter table teams enable row level security;
create policy "teams zijn leesbaar" on teams for select using (true);

alter table scanrondes enable row level security;
create policy "scanrondes zijn leesbaar" on scanrondes for select using (true);

alter table respondenten enable row level security;
create policy "respondent kan worden aangemaakt" on respondenten for insert with check (true);
create policy "respondent kan worden bijgewerkt" on respondenten for update using (true) with check (true);

alter table antwoorden enable row level security;
create policy "antwoord kan worden aangemaakt" on antwoorden for insert with check (true);
create policy "antwoord kan worden bijgewerkt" on antwoorden for update using (true) with check (true);
