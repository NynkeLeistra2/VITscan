# Ontwikkellog VIT-scan

Statusverslag om een sessie te kunnen onderbreken en later weer op te pakken.
Voor de "waarom" achter keuzes: zie `BESLISSINGEN.md`. Voor het totaalplan:
zie `VIT-scan-projectplan.md`.

## Status per 2026-07-10

**Wave 1, stap 1 (project opzetten):** klaar.
**Wave 1, stap 2 (datamodel):** klaar, migratie toegepast.
**Wave 1, stap 3 (scanflow):** klaar en end-to-end getest in de browser
(intro → stellingen → open vraag → afronden-placeholder), inclusief de
RLS/upsert-blockers hieronder — allebei opgelost en geverifieerd.
**Wave 1, stap 4 (scoring + rapport):** nog te doen. Voorbereidende
UI/datamodel-wijziging al doorgevoerd en getest: antwoordschaal 1-10
(i.p.v. 5-punts Likert) en één stelling per scherm met auto-advance — zie
`BESLISSINGEN.md` voor details. Themascore = gemiddelde van de stellingen,
staat al op schaal 1-10, geen omrekening meer nodig.

## RLS-blocker: opgelost (2026-07-10)

De oorspronkelijke 42501-fout bleek écht verholpen door reparatiemigratie
`0002_fix_respondenten_antwoorden_policies.sql` (bevestigd via een
screenshot van `pg_policies`: de vier insert/update-policies staan er correct
op). De eerdere "nog steeds dezelfde fout"-waarneming kwam waarschijnlijk
door een afgekapte testlink (team-id werd per ongeluk ingekort bij
copy-paste), niet door de policies zelf.

## Nieuw gevonden + opgelost: 401 door `.upsert()` onder RLS

Na de RLS-fix gaf de app nog een 401 bij "Start de scan". Oorzaak:
`.upsert()` genereert `INSERT ... ON CONFLICT DO UPDATE`, en die clausule
vereist onder Postgres RLS **SELECT-rechten** op de bestaande rij (om het
conflict te kunnen evalueren) — rechten die `respondenten`/`antwoorden`
bewust niet hebben (privacyregel: individuele antwoorden niet uitleesbaar
via de API). Opgelost in `src/lib/supabase/scan-repository.ts`: eerst
`.update()` met `{ count: 'exact' }`, en alleen bij `count === 0` alsnog
`.insert()`. Dat vereist geen SELECT-policy.

## 409 Conflict op antwoorden bij afronden: opgelost (2026-07-10)

**Oorzaak gevonden en bevestigd met een los testscript:** `.update(...,
{ count: 'exact' })` geeft in deze opzet (bewust geen select-policy op
`respondenten`/`antwoorden`) **altijd `count: 0` terug, ook als de rij al
bestaat** — PostgREST kan de exacte affected-row-count niet betrouwbaar
doorgeven zonder select-recht. Gevolg: de update-dan-insert-aanpak uit de
vorige fix probeerde bij elke herhaalde save alsnog een `insert` te doen op
een rij die al bestond → 409 (unique constraint). Dat gebeurde massaal bij
"afronden", omdat `afronden()` de volledige, opgebouwde antwoordenset van
alle 19 thema's nog een keer aanbiedt (grotendeels al eerder per thema
opgeslagen).

**Oplossing:** twee `SECURITY DEFINER`-databasefuncties
(`supabase/migrations/0003_upsert_functies.sql`: `upsert_respondent`,
`upsert_antwoorden`) die de upsert zelf uitvoeren met eigenaarsrechten
(bypassen dus RLS voor de schrijfactie), zonder dat de app ooit
SELECT-toegang nodig heeft — de privacyregel blijft intact. `src/lib/supabase
/scan-repository.ts` roept nu `supabase.rpc(...)` aan i.p.v. handmatig
`.update()`/`.insert()`/`.upsert()`. `upsert_antwoorden` accepteert de hele
antwoordenset als één jsonb-object, dus ook geen aparte requests per
stelling meer (was `Promise.all` over losse update/insert-paren).

Migratie door Nynke gedraaid in de SQL Editor ("Success. No rows
returned"). Geverifieerd met een los Node-script tegen de echte database
(incl. het exacte "hele set nogmaals opslaan"-scenario van `afronden()`):
alle stappen slagen zonder fouten.

Bevestigd in de browser: happy path (incl. antwoorden boven de 5, na het
draaien van migratie `0004_antwoordschaal_10punts.sql` die de
waarde-constraint verruimt naar 1-10) loopt door zonder foutmelding.

## Testgegevens (al aangemaakt in de database)

Via `supabase/seed_testdata.sql`:
- Organisatie: "Testorganisatie"
- Team: "Testteam" — `team_id = dbaa632d-b3e2-4071-b7a5-82782eca8637`
- Scanronde: "Proefronde" — `scanronde_id = c51814f7-461f-4a98-9ca1-a992c4f6bbe0`
- Testlink: `/scan/c51814f7-461f-4a98-9ca1-a992c4f6bbe0?team=dbaa632d-b3e2-4071-b7a5-82782eca8637`

Deze hoeven niet opnieuw aangemaakt te worden.

## Hervatten: te doen

1. Wave 1, stap 4 bouwen: scoring (themascore, deelscores, totale VIT-score,
   kleurgrenzen) + persoonlijk rapport (overzicht + per thema duiding/
   reflectievragen/aanbevelingen uit contentbestanden) + PDF-export
   (let op de jsPDF-kwetsbaarheid, zie `BESLISSINGEN.md`).
2. Let bij het testen op nieuwe respondenten/localStorage-sessies: de
   testlink hierboven kan nog een oude, afgeronde sessie in `localStorage`
   hebben staan van eerdere tests — open in dat geval een incognito-venster.
