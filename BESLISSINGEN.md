# Beslissingen VIT-scan

Korte log van keuzes tijdens de bouw. Zie `VIT-scan-projectplan.md` voor het volledige plan.

## Wave 1, stap 1 — Project opzetten (2026-07-08)

- **Package manager:** npm (standaard, geen extra installatie nodig).
- **Supabase:** bestaand project van Nynke gebruikt (EU-regio), URL en publishable key in `.env.local` (niet gecommit).
- **Git:** repo geïnitialiseerd in de projectroot; `werkgeluk-kompas-main` (los, ongerelateerd Lovable/Vite-project dat al in de map stond) is uitgesloten via `.gitignore` en blijft alleen lokaal staan.
- **Stellingen-JSON:** `vit-scan-stellingen.json` verplaatst naar `src/content/vit-scan-stellingen.json` zodat de app 'm rechtstreeks kan importeren (`resolveJsonModule`). Blijft de enige bron voor stellingen.
- **Scaffold:** `create-next-app` met TypeScript, Tailwind, App Router, ESLint, `src/`-map en `@/*`-alias.

## Wave 1, stap 2 — Datamodel (2026-07-08)

- **Vijf tabellen**, exact zoals in het stappenplan genoemd: `organisaties`, `teams`, `scanrondes`, `respondenten`, `antwoorden`. SQL staat in `supabase/migrations/0001_init_schema.sql`.
- **Toegepast op de live database** door Nynke via de Supabase SQL Editor. Geverifieerd via de REST API: alle vijf tabellen bereikbaar (200, lege set), en `respondenten`/`antwoorden` bevestigd afgeschermd door RLS (geen select-policy). `organisaties`/`teams`/`scanrondes` hebben nog geen insert-policy voor de anon-key — die worden bewust alleen via de SQL Editor/beheeromgeving (Wave 2) aangemaakt, niet vanuit de publieke app.
- **`respondent_code`**: door de medewerker zelf te onthouden/hergebruiken code (geen naam/e-mail), uniek per scanronde, zodat een vervolgmeting later gekoppeld kan worden zonder identiteit vast te leggen.
- **`stelling_key`**: positioneel opgebouwd als `<deelId>.<themaId>.<index>` (index doorlopend over eventuele subcategorieën), gegenereerd door `src/lib/stellingen.ts`. Geen stellingtekst in de database — `vit-scan-stellingen.json` blijft de enige bron.
- **`meta.versie`** toegevoegd aan `vit-scan-stellingen.json` (start op `1.0.0`) en vastgelegd per respondent (`respondenten.stellingen_versie`). Als de volgorde/inhoud van stellingen ooit wijzigt: versie ophogen, anders raken oude `stelling_key`-waarden onvergelijkbaar met nieuwe.
- **Privacy → RLS:** individuele resultaten zijn alléén voor de medewerker (niet-onderhandelbaar, zie CLAUDE.md). Daarom is er bewust géén select-policy op `respondenten`/`antwoorden` — de anon-key mag alleen insert/update, nooit lezen. Het persoonlijk rapport wordt straks client-side opgebouwd uit de net verzonden antwoorden, niet opnieuw uit de database opgehaald. `organisaties`/`teams`/`scanrondes` zijn wel leesbaar (alleen namen, niet privacygevoelig) zodat de introscherm de juiste namen kan tonen.
- **TypeScript-types**: handgeschreven in `src/lib/supabase/types.ts` (gespiegeld aan de migratie), omdat de Supabase CLI niet aan het project gelinkt kon worden zonder access token. Later te vervangen door `supabase gen types typescript`. De `Relationships`-arrays zijn nodig zodat embedded selects (bv. `organisaties(naam)`) typechecken.

## Wave 1, stap 3 — Scanflow (2026-07-08)

- **Route:** `/scan/[scanrondeId]` met optionele `?team=<teamId>` query param. Geen aparte route per team (`/scan/[id]/[teamId]`) en geen team-kiezer in de intro — dat is een bewuste scope-cut voor Wave 1 omdat er nog geen beheeromgeving is om links te genereren. Nynke deelt voorlopig zelf de samengestelde link (zie `supabase/seed_testdata.sql` voor hoe je de id's opzoekt). `teams.id`/`respondenten.team_id` blijven nullable, dus dit is later zonder migratie uit te breiden.
- **Respondent-id client-side gegenereerd** (`crypto.randomUUID()`) vóórdat er iets naar Supabase geschreven wordt. Nodig omdat `respondenten`/`antwoorden` geen select-policy hebben (zie stap 2) — een insert met `.select()` zou door RLS altijd leeg terugkomen, dus de app moet het id al kennen vóór het schrijven.
- **Eén scherm per thema** (19 in totaal) in een enkele client-component (`ScanFlow`) i.p.v. een aparte route per thema; past bij "tussentijds opslaan" en is eenvoudiger voor mobiel. Voortgang + antwoorden staan in `localStorage` (sleutel per scanronde+team), dus een paginaherlading verliest niets. Antwoorden worden ook per afgerond thema naar Supabase geüpsert (niet per klik) om het aantal requests te beperken.
- **Open vraag** ("Wat wil je nog kwijt?") is altijd aanwezig maar optioneel — beslissing uit de openstaande-keuzes-lijst, klaargezet in `respondenten.open_vraag_antwoord`.
- **Afronden-scherm is nu een placeholder** ("Bedankt, je rapport volgt"). Het echte persoonlijk rapport met scoring is stap 4.
- **Niet getest met echte data:** de anon-key kan geen rijen in `organisaties`/`teams`/`scanrondes` aanmaken (terecht, door RLS — geverifieerd met een losse curl-test). Om de happy path te testen: draai `supabase/seed_testdata.sql` in de Supabase SQL Editor en open de link die de laatste query oplevert. Wel al getest: build, typecheck, lint (allemaal schoon) en het foutpad bij een ongeldige/niet-bestaande link.

## Wave 1, stap 3 — Schrijven naar respondenten/antwoorden via RPC i.p.v. upsert (2026-07-10)

- **Probleem:** zowel `.upsert()` (401, vereist SELECT-recht onder RLS voor
  `ON CONFLICT DO UPDATE`) als de tussentijdse update-dan-insert-aanpak (409,
  `.update(..., { count: 'exact' })` geeft zonder select-policy altijd
  `count: 0` terug, ook als de rij al bestaat) bleken onbetrouwbaar zonder
  select-policy op `respondenten`/`antwoorden` — en die policy komt er
  bewust niet (privacyregel, zie stap 2).
- **Oplossing:** `SECURITY DEFINER`-databasefuncties `upsert_respondent` en
  `upsert_antwoorden` (`supabase/migrations/0003_upsert_functies.sql`) die de
  upsert zelf uitvoeren met eigenaarsrechten (bypassen dus RLS voor de
  schrijfactie), maar exposen alleen die ene smalle actie — er komt geen
  SELECT op de tabellen bij. `scan-repository.ts` roept ze aan via
  `supabase.rpc(...)`. `upsert_antwoorden` accepteert de volledige
  antwoordenset als jsonb-object in één call, dus ook minder requests dan de
  vorige aanpak (was één losse request per stelling).
- **Geverifieerd** met een los Node-testscript rechtstreeks tegen de
  productiedatabase (niet gecommit, alleen ter verificatie gebruikt), incl.
  het scenario waarbij dezelfde antwoordenset twee keer wordt opgeslagen
  (zoals bij afronden gebeurt).

## Aandachtspunt voor Wave 1, stap 4 — PDF-export (nog te bouwen)

- **jsPDF-kwetsbaarheid (CVE-2025-68428 / GHSA-f8cm-6447-x5h2):** de Node.js-bouwversie van jsPDF (`<4.0.0`) laat willekeurige bestanden van de server inlezen via `loadFile`/`addImage`/`addFont`/`html` als daar een door de gebruiker beïnvloed pad in terechtkomt. Niet van toepassing op de oude Lovable-scan (die gebruikt jsPDF alleen in de browser, geen serverbestandssysteem om te lekken). **Wél relevant hier**, omdat de PDF-export in dit project server-side gebeurt (zie CLAUDE.md). Bij het bouwen van die stap: gebruik jsPDF `^4.0.0` of hoger, en geef nooit een pad/bestandsnaam aan `addImage`/`addFont`/`html` mee dat (ook maar gedeeltelijk) is opgebouwd uit gebruikersinvoer.
