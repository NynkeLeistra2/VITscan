# CLAUDE.md — VIT-scan project

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

- 5-punts Likert (1–5) per stelling
- Themascore = gemiddelde stellingen, getoond op schaal 1–10
- Kleuren: groen ≥ 7,5 · oranje 5,5–7,4 · rood < 5,5 (configureerbaar in één config-bestand)
- Deelscores per deel + totale VIT-score

## Persoonlijk rapport

- Direct na afronden: overzicht (radar of staven), per thema score + duiding + reflectievragen + aanbevelingen afgestemd op scoreniveau (laag/midden/hoog)
- Rapportteksten staan in aparte contentbestanden (bijv. `content/rapportteksten/*.json`) zodat Nynke ze zonder code kan aanpassen
- Sluit af met uitnodiging om het gesprek aan te gaan; verwijs naar begeleiding door Nynke als neutrale derde

## Privacy (niet onderhandelbaar)

- Geen naam of e-mail verplicht; e-mail alleen optioneel voor toesturen rapport
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
