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
- **TypeScript-types**: handgeschreven in `src/lib/supabase/types.ts` (gespiegeld aan de migratie), omdat de Supabase CLI niet aan het project gelinkt kon worden zonder access token. Later te vervangen door `supabase gen types typescript`.
