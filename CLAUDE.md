# CLAUDE.md — VIT-scan project

## Security — verplicht

Lees en volg @SECURITY.md bij elke wijziging. Deze regels gelden altijd,
ook als er niet om gevraagd wordt. Kernprincipe: deny by default, fail closed.

## Wat is dit project

Webapp voor de VIT-scan van Nynke Leistra Coaching en Advies: een vragenlijst die vitaliteit en inzetbaarheid van medewerkers meet op 19 thema's (11 × Werkenergie, 8 × Persoonlijk Welzijn). Zie `VIT-scan-projectplan.md` voor het volledige plan en `src/content/vit-scan-stellingen.json` voor alle stellingen — dat JSON-bestand is de enige bron voor vragen; hardcode nooit stellingen in componenten.

## Waves

- **Wave 1 (nu):** scanflow + scoring + persoonlijk rapport voor de medewerker (incl. PDF-export). Geen login, geen dashboard.
- **Wave 2 (later):** klantdashboard (geanonimiseerd, team-/organisatieniveau), beheeromgeving voor Nynke, auth.

Bouw Wave 1 zo dat Wave 2 erop kan aansluiten: sla antwoorden op met respondent-code, team-id en scanronde-id, ook al wordt dat nu nog niet getoond.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (EU-regio) voor database; in Wave 1 volstaat opslag van responses, in Wave 2 komt auth + row level security
- PDF-export server-side
- Hosting: Vercel, later op subdomein scan.nynkeleistra.nl

## Scoring

- Schaal 1–10 per stelling (geen 5-punts Likert; alleen de uitersten hebben een tekstlabel, zie `meta.schaal` in `vit-scan-stellingen.json`)
- Themascore = gemiddelde stellingen (staat al op schaal 1–10, geen omrekening nodig)
- Kleuren, twee aparte schalen in `src/lib/scoring-config.ts`:
  - `bepaalNiveau`/`ScoreNiveau` (rood/oranje/groen, groen ≥ 7,5 · oranje 5,5–7,4 · rood < 5,5):
    stuurt welke duiding/reflectievragen/aanbevelingen per thema getoond worden
    (3 niveaus per thema in `content/rapportteksten/*.json`, laag/midden/hoog)
  - `scoreKleur` (10-staps, per heel scorepunt): puur visuele kleur voor het
    wiel, de scorebalk en het cijfer, zodat bijvoorbeeld een 7.3 er duidelijk
    positief uitziet i.p.v. oranje. Niet gekoppeld aan de teksten hierboven.
- Deelscores per deel + totale VIT-score

## Persoonlijk rapport

- Direct na afronden: overzicht (radar of staven), per thema score + duiding + reflectievragen + aanbevelingen afgestemd op scoreniveau (laag/midden/hoog)
- Rapportteksten staan in aparte contentbestanden (bijv. `content/rapportteksten/*.json`) zodat Nynke ze zonder code kan aanpassen
- Sluit af met uitnodiging om het gesprek aan te gaan; verwijs naar begeleiding door Nynke als neutrale derde

## Privacy (niet onderhandelbaar)

- Naam is optioneel (net als e-mail): op de introscreen kan de medewerker een
  naam invullen zodat die zichzelf op het rapport herkent, maar dit is nooit
  verplicht — bij leeg laten toont het rapport de respondent-code. Een
  ingevulde naam wordt opgeslagen bij de respondent (zelfde privacyniveau als
  e-mail: geen select-policy, dus nooit uitleesbaar via de app/API, alleen
  rechtstreeks door Nynke in de database) en nooit gekoppeld getoond in
  teamrapportage. E-mail is standaard optioneel (checkbox "stuur mij dit
  rapport ook per e-mail", standaard aangevinkt), maar kan per scanronde
  verplicht gesteld worden via `scanrondes.email_verplicht` (bijv. voor
  betalende klanten; workshops blijven optioneel)
- Individuele resultaten zijn alléén voor de medewerker
- Teamrapportage (Wave 2) alleen geaggregeerd en bij minimaal 5 respondenten (instelbaar)
- Data in EU

## Tone of voice

Nederlands. Nuchter, warm, concreet, to the point. Geen wollige taal, geen jargon. De medewerker in regie: teksten stimuleren zelfinzicht en actie, veroordelen nooit. Voorbeeld van de stijl: "Je voelt het wel, maar kunt het niet hard maken." Aanspreekvorm: je/jij.

## Werkafspraken

- Alle UI-teksten in het Nederlands
- Mobiel-eerst: de scan wordt vaak op telefoons ingevuld
- Tussentijds opslaan: bij herladen van de pagina gaat niets verloren
- Commit per afgeronde stap; leg keuzes kort vast in `BESLISSINGEN.md`
