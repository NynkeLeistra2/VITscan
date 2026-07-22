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

## Wave 1, stap 4 — Antwoordschaal naar 1-10 (2026-07-10)

- **Wijziging:** stellingen worden nu direct op een schaal van 1-10
  beantwoord i.p.v. een 5-punts Likert-schaal. Themascore (gemiddelde van de
  stellingen) staat daardoor al op de gewenste 1-10-schaal, geen omrekening
  meer nodig.
- **Schaal blijft data-gedreven:** `meta.schaal` in
  `vit-scan-stellingen.json` bevat nu `waarden: [1..10]` en alleen twee
  labels (voor de uitersten, i.p.v. één label per punt) — `AntwoordSchaal`
  (hernoemd van `LikertVraag`) leest dit nog steeds dynamisch uit, dus een
  toekomstige schaalwijziging vereist alleen een JSON-aanpassing.
- **`meta.versie` opgehoogd naar 2.0.0** — oude 1-5-antwoorden zijn
  betekenisverschillend van nieuwe 1-10-antwoorden, dus niet vergelijkbaar
  (zelfde principe als bij wijziging van stellingvolgorde/-inhoud).
- **UI:** 10 knoppen op één rij was te krap voor mobiel (touch targets), dus
  `AntwoordSchaal` toont een grid van 5 kolommen x 2 rijen i.p.v. één rij.
- **Database:** `antwoorden.waarde`-constraint verruimd van 1-5 naar 1-10
  (`supabase/migrations/0004_antwoordschaal_10punts.sql`). Bestaande
  testdata (waarden 1-5) valt binnen de nieuwe, ruimere grens, dus geen
  opschoning nodig.

## Wave 1, stap 4 — Eén stelling per scherm (2026-07-10)

- **Wijziging:** i.p.v. alle stellingen van een thema op één scherm, nu één
  stelling per scherm (64 in totaal, over 19 thema's). `ScanFlow.tsx` bouwt
  hiervoor één keer een platte `STELLING_STAPPEN`-lijst (thema + stelling +
  of het de laatste van het thema is), en `sessie.stapIndex` wijst nu naar
  een stelling i.p.v. een thema.
- **Opslaan blijft per afgerond thema** (niet per stelling), om het aantal
  Supabase-requests te beperken zoals eerder besloten (stap 3) — de trigger
  ligt nu bij het verlaten van de láátste stelling van een thema i.p.v. bij
  een aparte "volgende thema"-knop.
- **`ThemaScreen` vervangen door `StellingScreen`**: toont thema-titel/emoji
  + eventuele subcategorie als context boven de ene stelling.
- **Opmaak van `AntwoordSchaal` en `StellingScreen`** is qua stijl
  overgenomen uit `werkgeluk-kompas-main` (`ScaleInput`/`QuestionCard`/
  `WerkgelukScan`, ter referentie bekeken, niet gekopieerd als code/
  dependency): labels boven de schaal, knoppen in een `flex flex-wrap
  justify-center`-rij (dus naast elkaar waar er ruimte is, wrapt vanzelf op
  smalle schermen), geselecteerde knop met lichte scale-animatie. Zie ook
  `project_lovable_decoupling` in het geheugen — dit is puur visuele
  inspiratie, geen overname van de Lovable-stack of -workflow.
- **Auto-advance toegevoegd** (alsnog, op verzoek): een klik op een cijfer
  slaat het antwoord op en springt na 400ms door naar de volgende stelling —
  geen aparte "Volgende"-knop meer, alleen nog "Vorige". Een lopende
  auto-advance-timer wordt geannuleerd zodra je handmatig navigeert (Vorige,
  of een nieuwe klik binnen die 400ms), anders zou je na "Vorige" alsnog een
  stap verder geschoten worden. Tijdens het opslaan (bij de laatste stelling
  van een thema) zijn de antwoordknoppen tijdelijk uitgeschakeld.
- **Antwoordknoppen op één rij, altijd** (`flex` zonder wrap, knoppen
  `flex-1 min-w-0`): passen zich aan de beschikbare breedte aan i.p.v. te
  wrappen naar een tweede rij op smallere schermen.
- **Layout breder/groter**: alle scanschermen van `max-w-md` (448px) naar
  `max-w-xl` (576px), plus grotere tekst/knoppen op het stellingscherm. Het
  stellingscherm zelf is daarna nog verder verbreed naar `max-w-3xl`
  (768px, incl. de voortgangsbalk erboven), zodat een gemiddelde stelling op
  één regel past. Intro/open vraag/afronden blijven op `max-w-xl` — beter
  leesbaar voor lopende tekst dan een brede kolom.

## Wave 1, stap 4 — Scoring + persoonlijk rapport op scherm (2026-07-13)

- **Scoring** (`src/lib/scoring.ts`, `src/lib/scoring-config.ts`): themascore =
  gemiddelde van de stellingen binnen het thema (al op schaal 1-10).
  Deelscore = gemiddelde van de thémascores binnen dat deel (niet van de
  losse stellingen, anders telt een deel met veel kleine thema's zwaarder
  mee). Totale VIT-score = gemiddelde van de twee deelscores, zodat
  Werkenergie en Persoonlijk Welzijn even zwaar wegen ondanks het verschil
  in aantal thema's (11 vs. 8). Kleurgrenzen (groen ≥7,5 / oranje 5,5-7,4 /
  rood <5,5) in één config-bestand, zoals CLAUDE.md vraagt.
- **Twee lagen rapportteksten**, met een eigen structuur en bron:
  1. **Per thema** (`src/content/rapportteksten/<themaId>.json`, 19
     bestanden): duiding + 2 reflectievragen + 2 aanbevelingen per
     rood/oranje/groen-niveau. Eerste versie door Claude geschreven in
     Nynkes tone of voice, gebaseerd op de exacte stellingen per thema —
     Nynke controleert en past aan waar nodig.
  2. **Totaalscore** (`src/content/rapportteksten/algemeen.json`,
     `totaalscoreNiveaus`): 5 bandbreedtes (1,0-2,9 / 3,0-5,4 / 5,5-6,9 /
     7,0-8,9 / 9,0-10,0), tekst + reflectievragen + aanbevelingen
     **letterlijk overgenomen van Nynkes eigen aangeleverde tekst**, alleen
     de ondergrens van de middelste band gecorrigeerd van "5,0" naar "5,5"
     (rekenkundige inconsistentie met de aangrenzende banden: elke band
     begint waar de vorige eindigt +0,1). Deze bandbreedte-indeling is
     bewust losstaand van de eenvoudigere rood/oranje/groen-indeling die
     per thema gebruikt wordt — twee verschillende granulariteiten voor
     twee verschillende doelen (groot verhaal vs. detail per thema).
  3. Beide lagen samen op het rapportscherm: het totaalscore-verhaal
     bovenaan (breed, altijd zichtbaar), de per-thema duiding in een
     uitklapbare lijst per thema (voorkomt een enorm lang scherm bij 19
     thema's).
- **Rapport wordt client-side opgebouwd** uit `sessie.antwoorden` (niet
  opnieuw uit de database gehaald — zie privacyregel in migratie 0001).
- **`RapportScreen`/`ScoreBalk`/`ThemaDetail`** vervangen de oude
  `AfrondenScreen`-placeholder. Visualisatie: staafdiagram (geen radar) —
  eenvoudiger te bouwen zonder extra dependency en net zo goed toegestaan
  volgens het projectplan ("radar of staven, keuze bij bouw").
- **Geverifieerd zonder live browsersessie** (Nynke was afwezig tijdens het
  bouwen): typecheck, lint, productiebuild (`next build`) slagen allemaal;
  alle 19 thema-id's uit `vit-scan-stellingen.json` hebben exact een
  bijpassend contentbestand (kruiscontrole via script); scoringswiskunde
  handmatig doorgerekend met een testset antwoorden. **Nog te doen: een
  keer echt doorklikken in de browser** om het rapport visueel te
  beoordelen.

## Wave 1, stap 4 — Optioneel naamveld op introscherm (2026-07-13)

- **Aanleiding:** Nynke wilde dat een medewerker zichzelf op het rapport
  herkent (niet alleen aan de respondent-code). Dit botste met de
  oorspronkelijke privacyregel in CLAUDE.md ("geen naam verplicht, en er
  wordt ook nooit naar gevraagd") — expliciet voorgelegd en samen bijgesteld:
  naam vragen mag, zolang het optioneel blijft en nooit gekoppeld zichtbaar
  wordt voor de werkgever/teamrapportage.
- **Opslag:** naam wordt, net als e-mail, opgeslagen bij de respondent
  (`respondenten.naam`, migratie `0006_respondent_naam.sql`) via de
  bestaande `upsert_respondent`-RPC (nieuwe optionele `p_naam`-parameter).
  Geen nieuwe select-policy nodig — blijft binnen de bestaande
  privacy-grens (niet uitleesbaar via anon-key/API).
- **UI:** tekstveld op `IntroScreen` (vóór de respondent-code), placeholder
  "Bijv. Jan Jansen", altijd optioneel. Op `RapportScreen` verschijnt de
  naam in de titel ("Jouw VIT-scan resultaat, {naam}") als die is ingevuld,
  anders ongewijzigd.
- **CLAUDE.md bijgewerkt** om de nieuwe afspraak te reflecteren.

## Wave 1, stap 4 — Kleurschaal + leesbaarheid wiel bijgesteld (2026-07-13)

- **`scoreKleur`** (visuele 10-staps schaal, `src/lib/scoring-config.ts`):
  de band 6,0-6,99 gaf `#ADFF2F` (yellowgreen), wat voor een middenscore als
  6,3 te groen oogde. Band 6,x is nu geel (`#FFD700`, overgenomen van de
  band eronder) en band 5,x is een lichtere oranje (`#FFB74D`) i.p.v.
  hetzelfde geel — geeft een duidelijkere opbouw donker oranje → licht
  oranje → geel → groen naarmate de score stijgt. Alleen deze twee banden
  aangepast, de rest van de schaal (incl. de losstaande rood/oranje/groen-
  duiding in `bepaalNiveau`) ongewijzigd.
- **`WerkgelukWiel`**: labels rond het wiel waren te klein (9px-equivalent in
  de SVG, op mobiel door schaling van de viewBox zelfs nog kleiner en
  nauwelijks leesbaar). Font vergroot (9 → 13, gecentreerd cijfer 34 → 38),
  regelafstand en labelradius navenant aangepast zodat labels niet over hun
  buren heen lopen bij zowel het 11-segment- als het 8-segment-wiel.
- **Wielen bleken vast te zitten op 300px** ongeacht `max-w-[...]`: de svg
  had geen expliciete breedte/hoogte, en de omliggende wrapper-div
  (`flex flex-col items-center`) kromp daardoor naar de browser-default
  intrinsieke SVG-afmeting (300×150) i.p.v. de beschikbare breedte te
  gebruiken — een pre-existing bug, los van de labelgrootte. Opgelost door
  de wrapper-div `w-full` te geven; `max-w` op de svg zelf werkt nu pas echt.
  Tegelijk `max-w` verhoogd van 420px naar 540px op verzoek van Nynke
  ("mogen in het geheel wel wat groter").

## Wave 1, stap 4 — Copy persoonlijke code eerlijker gemaakt (2026-07-13)

- **Probleem gesignaleerd:** de tekst bij de respondent-code beloofde dat de
  medewerker de code "kan gebruiken om een vervolgmeting te koppelen", maar
  er is nergens in de app een invoerveld waar een terugkerende respondent
  die code kan invoeren — bij een nieuwe scanronde wordt altijd een verse,
  willekeurige code gegenereerd. De koppeling is (bewust, zie stap 2) alleen
  infrastructuur voor Wave 2, niet iets wat de medewerker nu zelf kan
  activeren.
- **Opgelost door de tekst aan te passen** (op zowel `IntroScreen` als
  `RapportScreen`) i.p.v. de invoerstap nu al te bouwen: "Bewaar deze code.
  Bij een vervolgmeting kun je 'm gebruiken om je resultaten te laten
  koppelen, in overleg met Nynke." — eerlijk over dat dit via Nynke loopt,
  niet iets wat de app zelf automatisch afhandelt.

## Wave 1, stap 4 — PDF-export van het persoonlijk rapport (2026-07-14)

- **Server-side, zoals CLAUDE.md voorschrijft**: nieuwe route
  `POST /api/rapport-pdf` (`export const runtime = "nodejs"`, nodig voor
  `fs`/native binaries) bouwt de PDF met `jsPDF` (`^4.2.1`, dus na de eerder
  gesignaleerde CVE-2025-68428 gefixed) uit antwoorden die de client al
  in-memory heeft — geen Supabase-leesactie nodig, past bij de privacyregel
  dat `respondenten`/`antwoorden` geen select-policy hebben.
- **Wielen als afbeelding in de PDF**: de wielgeometrie (`punt`/`segmentPad`/
  `labelRegels`/constanten) is verplaatst van `WerkgelukWiel.tsx` naar
  `src/lib/wiel-geometrie.ts`, zodat zowel de React-component als de nieuwe
  server-side SVG-string-builder (`src/lib/pdf/wiel-raster.ts`) exact
  dezelfde berekening gebruiken. Rasterisatie naar PNG via `@resvg/resvg-js`
  (native binary, geen headless browser nodig).
- **Lettertype gebundeld i.p.v. systeemfonts**: `resvg` valt zonder eigen
  fontbestand terug op systeemfonts, en Vercel's serverless Node-omgeving
  heeft geen desktop-fonts zoals Arial — zonder fix zouden wiel-labels in
  productie onzichtbaar/leeg blijven (lokaal op Windows viel dit niet op,
  Arial is daar wél aanwezig). Opgelost door **Roboto** (Apache 2.0, statisch
  TTF Regular+Bold) te bundelen onder `src/lib/pdf/fonts/` en expliciet aan
  `resvg` mee te geven (`loadSystemFonts: false`). Documenttekst zelf
  gebruikt jsPDF's ingebouwde Helvetica (geen embedding nodig, altijd
  beschikbaar).
- **Geen emoji in de PDF**: thema-emoji (bv. 😊 bij "Plezier") renderen
  correct op het scherm maar worden door jsPDF's standaardfont (WinAnsi-only)
  omgezet in onleesbare tekens. De oude Lovable-PDF liet emoji om dezelfde
  reden ook al weg uit de PDF-tekst (wel op het scherm) — zelfde aanpak hier.
- **Bestandsgrootte-bug gevonden en opgelost**: een eerste testversie woog
  **12MB** voor 7 pagina's. Oorzaak: `pdf.addImage()` embedt zonder het
  `compression`-argument de rauwe, ongecomprimeerde bitmap (bv. 1080×1080×3
  bytes voor het logo-icoon), i.p.v. de brondata te comprimeren. Met
  `compression: "MEDIUM"` (+ een expliciete `alias` zodat jsPDF's
  cache het icoon-logo, dat op elke pagina staat, maar één keer opslaat) ging
  dit terug naar **~530KB**.
- **Huisstijl**: teal (zelfde als de site) als hoofdkleur, met een bewust
  terughoudende knipoog naar Nynkes bestaande merkkleuren — dunne gouden
  accentlijnen (dividers) en een klein donkergroen accentblokje per
  thema-header, i.p.v. de volle groen/goud-koppen van de oude Lovable-PDF
  (expliciet "subtieler" gevraagd).
- **Inhoud**: zelfde diepte als het scherm (totaalscore + duiding, per thema
  score + duiding/reflectievragen/aanbevelingen, afsluiting, persoonlijke
  code) — geen losse stellingscores zoals de oude Lovable-PDF had.
- **Logo's**: `public/nynke-logo-pdf.png` (officieel logo, titelpagina) en
  nieuw toegevoegd `public/nynke-logo-n.png` (N-icoon, klein rechtsonder op
  elke pagina) — aangeleverd door Nynke via de `logo/`-map.
- **Beveiliging** (SECURITY.md): input server-side gevalideerd met Zod
  (antwoorden moeten bekende stelling-keys zijn met waarde 1-10, aantal
  begrensd op het totaal aantal stellingen, naam/respondentCode aan
  lengtelimieten gebonden); generieke foutmeldingen zonder stack traces;
  best-effort in-memory rate limiting per IP (10 requests/10 min) — geen
  Redis/Upstash in Wave 1, dus geen garantie bij meerdere serverless-
  instanties, maar beter dan niets zolang er nog geen auth is.
- **`next.config.ts`**: `serverExternalPackages: ["@resvg/resvg-js"]`
  toegevoegd — Turbopack kan de native binary van dit pakket niet in een
  ESM-chunk bundelen; gecontroleerd dat Next's file-tracing de font-
  bestanden, logo's én de native binary automatisch meeneemt in de
  gedeployde functie (`.next/server/app/api/rapport-pdf/route.js.nft.json`).
- **`html2canvas` verwijderd**: hoorde bij de client-side aanpak van de oude
  Lovable-PDF, niet nodig nu de PDF server-side wordt opgebouwd.

## Wave 1, stap 5 — n8n-koppeling, organisatieveld en beheerpagina (2026-07-20)

- **Start+end webhook-call**: de bestaande n8n-workflow verwacht eerst een
  `step: "start"`-call (maakt de Sheets-rij aan) vóór de al bestaande
  `step: "end"`-call (vult 'm, maakt PDF, mailt) — zonder start-call vond de
  workflow nooit een rij. Beide calls zitten nu server-side achter elkaar in
  `/api/verstuur-resultaten` (awaited, dus gegarandeerde volgorde), met
  identiek `name`/`email` zodat n8n de rij terugvindt. Dit gebeurt pas bij
  "Afronden", niet al bij de intro: e-mail is in deze app pas op het laatste
  scherm bekend, niet bij de start van de scan.
- **`organisatie`/`bedrijf`-veld**: medewerker kan op het introscherm
  optioneel een organisatienaam invullen (voor scanrondes zonder specifieke
  klantkoppeling, bv. een algemene workshop-link); valt terug op de
  organisatienaam die al bij de scanronde hoort als het veld leeg blijft.
  Alleen doorgestuurd naar de n8n-webhook (veld `bedrijf`), niet opgeslagen
  in Supabase.
- **`/beheer`: stukje Wave 2 bewust vervroegd**, op expliciet verzoek van
  Nynke — ze wil zelf klantlinks (organisatie + scanronde + optioneel team)
  kunnen aanmaken zonder daarvoor code aan te hoeven passen. Dit is bewust
  **niet** de volledige Wave 2-beheeromgeving/dashboard uit het projectplan;
  alleen aanmaken + de link tonen, geen rapportage. Beveiligd met Supabase
  Auth (`@supabase/ssr`, sessie in httpOnly-cookies) — één account voor
  Nynke zelf, publieke sign-up staat uit. RLS: insert op
  `organisaties`/`teams`/`scanrondes` alleen voor rol `authenticated`
  (migratie `0007`); lezen blijft zoals in stap 2 publiek. Nynkes account en
  de migratie moeten handmatig in de Supabase SQL Editor/dashboard gezet
  worden (geen service-role-key lokaal beschikbaar om dit te scripten).
- **`middleware.ts` hoort in `src/`**, niet in de projectroot, omdat dit
  project de `src/`-structuur gebruikt — een verkeerde plek zorgde eerst
  stilzwijgend voor een niet-werkende toegangscontrole op `/beheer` (geen
  foutmelding, de pagina laadde gewoon zonder sessie-check).
- **Organisatienaam-fallback**: het `bedrijf`-veld in de webhook-payload
  gebruikte eerst alléén wat de medewerker zelf intypte; als dat leeg bleef
  (het gangbare geval bij een scanronde met een vaste klantkoppeling) kwam er
  niets in de Google Sheet-kolom terecht. Valt nu terug op
  `context.organisatieNaam` (de organisatie die al bij de scanronde hoort)
  als het medewerkersveld leeg is.
- **Scanronde verwijderen** vanuit `/beheer`, met bevestigingsstap: de
  cascade (0001) verwijdert dan ook alle al ingevulde antwoorden voor die
  ronde, dat kan niet ongedaan gemaakt worden. RLS: delete op `scanrondes`
  alleen voor `authenticated` (migratie `0008`).

## Wave 1, stap 6 — Boost-opdrachtenpagina "Als alles klopt" (2026-07-20)

- **Losstaand statisch bestand** (`public/opdrachten.html`, geen React/
  build-stap) i.p.v. een Next.js-route — bewust op Nynkes verzoek: één
  self-contained HTML-bestand dat zij later zelf met een teksteditor kan
  aanpassen. Nadeel: de 19 subcategorieën staan hier hardcoded en los van
  `vit-scan-stellingen.json` — bij een toekomstige wijziging daar moet dit
  bestand handmatig mee-bijgewerkt worden.
- **Scores via localStorage, niet via URL-parameters**: de scan-scores zijn
  al client-side bekend zodra het rapport toont (`RapportScreen.tsx`,
  `berekenScores()`). Bewust geen query-string, want Vercel logt
  request-URL's inclusief query — bij privacygevoelige welzijnsdata
  (mentale gezondheid, financiën) wil je dat niet. De opdrachtenpagina leest
  de sleutel (`boost-opdrachten-scores`) eenmalig uit en wist 'm meteen;
  ontbreekt hij, dan werkt de pagina gewoon met lege gele vakjes.
- **Niets naar een server**: eigen antwoorden van de deelnemer (cijfers +
  reflectietekst) blijven in een aparte localStorage-sleutel
  (`boost-opdrachten-antwoorden`) zodat een ongelukje met verversen niet
  alles wist, maar dit verlaat de browser nooit. "Opslaan als PDF" gaat via
  de ingebouwde printfunctie van de browser (`window.print()` + print-
  stylesheet), geen losse PDF-library nodig.
- **Scope v1**: alleen Stap 1 uit het werkboek (twee mindmaps + wonder-
  reflectie). Stap 2 (gevoelsdoelen/belemmerende factoren), Stap 3 (Cirkel
  van Invloed) en de BONUS (Intuïst-talenttypes) zijn bewust nog niet
  gebouwd.
- **Knop op het rapportscherm** ("Ga naar Boost je werkgeluk") naast de
  PDF-downloadknop.

## Wave 1, stap 7 — Stap 2/3/BONUS Boost + evaluatiepagina (2026-07-20)

- **Stap 2 (Gevoelsdoelen), Stap 3 (Actie) en BONUS (Talenttypes)** alsnog
  toegevoegd aan `public/opdrachten.html`, als 3 extra stappen in dezelfde
  stap-navigatie (in totaal 5). Audio-oefening (SoundCloud) ingesloten via
  iframe, met een gewone link ernaast als de embed niet laadt. Stap 3 leest
  de gevoelsdoelen die in stap 2 zijn ingevuld (uit dezelfde localStorage,
  sleutel `boost-opdrachten-velden`) en genereert daar automatisch een
  actie-blok per gevoelsdoel voor.
- **BONUS-talenttypes** als eenvoudige tekst-kaartjes met een kleurbolletje,
  bewust géén Intuïst®-artwork nagemaakt (dat is hun merk/ontwerp).
- **Evaluatieformulier op een aparte pagina** (`public/evaluatie.html`),
  bewust wél naar een server: Nynke wil een e-mailmelding met de antwoorden.
  Dit is dus een uitzondering op "niets naar een server" die voor de rest
  van de opdrachtenpagina geldt (dat gaat over privacygevoelige
  welzijnsdata; dit is feedback/review-tekst die ze zelf wil ontvangen).
  Nieuwe server-route `/api/boost-evaluatie` (zelfde patroon als
  `/api/verstuur-resultaten`: zod-validatie, rate limiting, generieke
  foutmeldingen) stuurt door naar een nieuwe, aparte n8n-webhook
  (`N8N_EVALUATIE_WEBHOOK_URL`, nog door Nynke aan te maken/te vullen) die
  een e-mail naar contact@nynkeleistra.nl moet sturen.

## Wave 1, stap 7 — Doorlopende test + fixes Boost-flow (2026-07-22)

- **Bug: gevoelsdoelen verschenen pas na page-reload op Stap 4 (Actie).** De
  stap-secties van `public/opdrachten.html` worden één keer bij het laden
  van de pagina opgebouwd; `toonStap()` wisselde alleen zichtbaarheid, dus
  een gevoelsdoel dat je zonder herladen net op Stap 2 had ingevuld, stond
  nog niet in de al gebouwde actie-blokken van Stap 4. Opgelost door de
  vaste gevoelsdoel-blokken te isoleren in een eigen container
  (`vasteBlokkenContainer`, los van de zelf toe te voegen `extraBlokkenContainer`)
  en die opnieuw op te bouwen (`ververVasteGevoelsdoelen()`) telkens als de
  gebruiker naar die stap navigeert. Veld-id's per gevoelsdoel blijven
  stabiel, dus opnieuw opbouwen verliest geen al ingevulde subdoelen.
  Tegelijk het automatisch toegevoegde lege startblok (verschijnt alleen
  als er nog geen enkel gevoelsdoel is) laten opruimen zodra er alsnog een
  vast gevoelsdoel bijkomt en dat startblok nog leeg is.
- **SoundCloud-oefening stond op Private** (bezoekers kregen "You have not
  provided a valid SoundCloud URL" te zien) en de **n8n-evaluatiewebhook gaf
  404** (workflow stond nog op inactief) — beide door Nynke zelf in
  SoundCloud/n8n gefixed, geen code-wijziging nodig. Evaluatieformulier
  end-to-end getest met een echte testinzending (server-log ging van 502
  naar 200).
- **Cirkel-van-Invloed-tekstlijst vervangen door afbeelding**
  (`public/cirkel-van-invloed.png`, aangeleverd door Nynke) op Stap 4
  ("Tijd voor actie"), i.p.v. de twee losse WEL/GEEN-invloed-lijstjes.
- **Titel "Als alles klopt" alleen bij opdracht 1** (de twee mindmap-stappen
  Werkenergie/Persoonlijk Welzijn) — dat is de naam van die ene opdracht uit
  het werkboek, niet van het hele programma. Stap 2 (Gevoelsdoelen), Stap 3
  (Actie) en BONUS tonen nu "Boost je werkgeluk" boven aan de pagina.
- **Knoplabel bij Actie → BONUS**: "Naar volgende opdracht" wordt "Naar
  bonus" op de voorlaatste stap, zodat duidelijk is wat je te wachten staat.
- **Vercel-koppeling was losgeraakt**: de deploy voor bovenstaande wijzigingen
  kwam niet op gang, ook niet na een push — bleek dat de GitHub-koppeling in
  Vercel (Project → Settings → Git) niet meer actief was, zonder foutmelding
  of deployment-poging. Nynke heeft 'm opnieuw gekoppeld; daarna alsnog een
  (lege) commit gepusht om de eerste deploy op de hersteld koppeling te
  triggeren. Reconnecten alleen pakt gemiste commits niet met terugwerkende
  kracht op.
- **"Gevoelsdoel"-invoerveld bij zelf toegevoegde actie-blokken** (Stap 4,
  de blokken zonder vast gevoelsdoel uit stap 2) had geen styling: het
  label was niet vetgedrukt en het tekstvak raakte de labeltekst. Kwam
  doordat dit ene mini-veld als enige geen CSS-klasse kreeg (de generieke
  `maakMiniVeld()`-helper zet die alleen bij meerregelige velden). Eigen
  klasse `gevoelsdoel-veld` toegevoegd met dezelfde opmaak (vet label,
  ruimte eronder, volle breedte) als de rest van de velden in dat blok.

## Wave 1, stap 7 — Echte Intuïst®-kaartjes in BONUS (2026-07-22)

- **Eerdere beslissing (stap 7, 2026-07-20) teruggedraaid**: toen bewust
  géén Intuïst-artwork nagemaakt vanwege merk-/auteursrecht. Nynke heeft nu
  expliciet bevestigd dat haar Intuïst-licentie digitale/publieke
  reproductie van de kaartjes toestaat, dus alsnog de echte kaartafbeeldingen
  gebruikt i.p.v. de tekst-kaartjes met kleurbolletje.
- **Bron**: 12 losse foto's van de fysieke kaarten (WhatsApp-camera, door
  Nynke aangeleverd), niet uit de PDF geknipt (geen PDF-tools beschikbaar
  in deze omgeving). Eén kaart is gewijzigd t.o.v. de oude PDF-grid: "Held"
  is in Nynkes huidige kaartenset vervangen door "Doorzetter".
- **Nabewerking met `sharp`** (al aanwezig in `node_modules` als transitieve
  dependency, geen nieuwe package nodig): rechtgezet (de meeste foto's waren
  zijwaarts, op één na die al recht stond — per kaart gecontroleerd, niet
  blind dezelfde rotatie toegepast), witruimte weggesneden (`trim`), licht
  gescherpt. Verwerkingsscript niet gecommit (eenmalig gebruikt, resultaat
  staat in `public/talenttypes/`).
- **Formaat**: eerste versie als PNG (~17MB totaal voor 12 kaarten) was veel
  te zwaar voor de mobiel-eerst eis uit CLAUDE.md. Verkleind naar max
  900px breed en geëxporteerd als JPEG (kwaliteit 82) — ~0,5MB totaal, geen
  zichtbaar kwaliteitsverlies op het scherm omdat de kaarten in de grid
  nooit breder dan ~350px getoond worden.
- **`talent-bol`/`talent-naam`-CSS (kleurbolletje + tekstlabel) vervangen**
  door `talent-afbeelding` (de kaartfoto zelf bevat de naam al, dus geen
  apart tekstlabel meer nodig). `TALENTTYPES`-array in `opdrachten.html`
  heeft geen `kleur`-veld meer, alleen `id`/`label` (label blijft staan
  voor de `alt`-tekst van de afbeelding).
