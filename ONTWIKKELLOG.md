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
**Wave 1, stap 4 (scoring + rapport):** code klaar en gecommit — scoring-
engine, 19 thema-contentbestanden + totaalscore-content (Nynkes eigen
tekst verwerkt), `RapportScreen`. Typecheck/lint/`next build` slagen en de
scoringswiskunde is doorgerekend. **Nog niet in de browser bekeken — dat is
de eerstvolgende stap bij hervatten.**

## Status per 2026-07-16

**Wave 1, stap 4 (rapport) en stap 6 (PDF-export): volledig end-to-end getest** in de
browser — intro (met naam + persoonlijke code) → alle 65 stellingen → open vraag + e-mail →
rapport (Werkgelukwiel, Levenswiel, per-thema duiding/reflectievragen/aanbevelingen,
afsluiting) → PDF-download. Alle 19 rapportteksten + `algemeen.json` nagelezen op toon en
inhoud (past bij de stijl uit `CLAUDE.md`), geen aanpassingen nodig gebleken.

**Resultaten-webhook (e-mail + Google Sheet via n8n): nog steeds kapot.** De payload naar de
bestaande n8n-workflow miste twee velden die de oude Lovable-workflow altijd kreeg (`answers`
en `recommendation`) — toegevoegd in `src/app/api/verstuur-resultaten/route.ts`, afgeleid uit
`rapportteksten.ts`. Loste het niet op: de server-naar-n8n-aanroep geeft consistent
`{"ok":true}` (200 OK), maar er komt geen mail en geen Sheet-rij binnen. Het probleem zit dus
vermoedelijk verderop in de n8n-workflow zelf (uitgeschakelde node, verlopen Gmail/Sheets-
koppeling, verkeerd filter) — niet meer te diagnosticeren zonder toegang tot n8n's
executielogs. Nynke pakt dit zelf op.

**Deployment: live op Vercel.** https://vit-scan-self.vercel.app werkt publiek (Deployment
Protection/SSO stond standaard aan, is uitgezet). Custom domain `vit-scan.nynkeleistra.nl` is
toegevoegd aan het Vercel-project; wacht nog op een DNS A-record (`vit-scan → 76.76.21.21`)
dat Nynke zelf bij Strato/rzone.de moet toevoegen. Zie memory `project_vit_scan_vercel_
deployment` voor een valkuil die hierbij optrad (Framework Preset sprong op "Other" i.p.v.
"Next.js" bij handmatig aangemaakt project → alles 404'te) en memory `project_vit_scan_
cloudflare_blocker` voor waarom volledige Cloudflare-hosting (Nynkes voorkeur op termijn) nu
nog geblokkeerd is door de native `@resvg/resvg-js`-dependency in `src/lib/pdf/wiel-raster.ts`.

**Portaalpagina / workshop-link:** besproken, nog niet gebouwd. Eén scanronde-link werkt al
voor meerdere gelijktijdige respondenten (elke opener krijgt een eigen respondent-code) — geen
aparte feature nodig voor workshops. Een portaalpagina waarmee Nynke zelf scanrondes/klantlinks
kan aanmaken (i.p.v. handwerk in de Supabase SQL-editor) is nog niet gebouwd; vergt een vorm
van authenticatie (Supabase Auth, alleen voor Nynke) — bewust uitgesteld tot een volgende sessie.

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

## Hervatten: te doen (bijgewerkt 2026-07-16)

1. n8n-workflow zelf debuggen (execution-logs bekijken voor de teststuurmomenten, de node
   vinden die faalt en herstellen — zie "Resultaten-webhook" hierboven).
2. DNS A-record bij Strato toevoegen voor `vit-scan.nynkeleistra.nl` (`vit-scan → 76.76.21.21`)
   en verifiëren dat het domein het overneemt.
3. Portaalpagina bouwen waarmee Nynke zelf scanrondes/klantlinks kan aanmaken (met lichte
   auth, alleen voor haarzelf).
4. (Later, bewust apart gepland) Cloudflare-migratie: `@resvg/resvg-js` vervangen door de
   WASM-variant en de hele PDF-flow opnieuw testen voordat dit live gaat.
