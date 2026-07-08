# Projectplan VIT-scan webapp

**Eigenaar:** Nynke Leistra Coaching en Advies
**Doel:** De VIT-scan als zelfstandige webapp, in twee waves gebouwd met Claude Code. Later te koppelen aan de online module (inlog op nynkeleistra.nl) en Plug&Pay.

---

## 1. Context

De VIT-scan meet vitaliteit en inzetbaarheid van medewerkers op 19 thema's, verdeeld over twee delen: **Werkenergie** (11 thema's) en **Persoonlijk Welzijn** (8 thema's). De scan draait nu binnen de website (Squarespace). Doel is een eigen applicatie die:

1. De scan afneemt (10–15 min, ~70 stellingen)
2. De medewerker direct een persoonlijk rapport geeft
3. De klant (HR/leidinggevende) een geanonimiseerd dashboard biedt op team- en organisatieniveau
4. Nynke als beheerder organisaties, teams en scanrondes laat beheren

**Waves:**

- **Wave 1 — De scan:** vragenlijst, scoring, persoonlijk rapport voor de medewerker
- **Wave 2 — Het dashboard:** geanonimiseerde team-/organisatierapportage voor de klant + beheeromgeving

---

## 2. Rollen

| Rol | Wat ziet/doet deze | Wave |
|---|---|---|
| **Medewerker** | Vult scan in via unieke link, ziet direct persoonlijk rapport (alleen zelf), kan rapport als PDF downloaden | 1 |
| **Klant (HR/leidinggevende)** | Dashboard met geanonimiseerde teamresultaten, voortgang invullingen, vergelijking over tijd (nulmeting vs. vervolgmeting) | 2 |
| **Beheerder (Nynke)** | Organisaties/teams aanmaken, scanrondes uitzetten, links genereren, alle dashboards inzien, adviesrapportage exporteren | 2 |

---

## 3. Wave 1 — De scan

### 3.1 Flow medewerker

1. Medewerker opent unieke link (per scanronde, per team). Geen account nodig; wel een anonieme respondent-code zodat een vervolgmeting mogelijk is.
2. Korte intro: wat is de scan, hoe lang duurt het, privacy-uitleg (rapport is alleen voor jou; werkgever ziet alleen anonieme teamcijfers).
3. Optioneel: enkele achtergrondvragen voor teamrapportage (bijv. team/afdeling als de link dat niet al bepaalt). **Geen naam of e-mail verplicht.** E-mail alleen optioneel, om het rapport toe te sturen.
4. Deel 1: Werkenergie (11 thema's). Deel 2: Persoonlijk Welzijn (8 thema's). Eén thema per scherm, voortgangsbalk, tussentijds opslaan (bij sluiten browser niet alles kwijt).
5. Afronden → direct persoonlijk rapport op scherm + PDF-download.

### 3.2 Antwoordschaal en scoring

- 5-punts Likertschaal per stelling: Helemaal oneens (1) – Oneens (2) – Neutraal (3) – Eens (4) – Helemaal eens (5).
- Themascore = gemiddelde van de stellingen binnen het thema, weergegeven als score 1–10 (of 1–5, keuze bij bouw).
- Kleurcodering: groen (goed), oranje (aandacht), rood (actie nodig). Grenswaarden instelbaar, startpunt: groen ≥ 7,5 / oranje 5,5–7,4 / rood < 5,5 (op 10-schaal).
- Totaalscores per deel (Werkenergie en Persoonlijk Welzijn) plus totale VIT-score.

De volledige stellingenlijst staat in `vit-scan-stellingen.json` (meegeleverd) — dit is de bron voor de bouw; stellingen zijn daar per thema geordend inclusief subcategorieën (bijv. Vertrouwen: psychologische veiligheid & communicatie / vertrouwen & respect).

### 3.3 Persoonlijk rapport

Per medewerker, direct na afronden:

- Overzichtspagina: totale VIT-score + twee deelscores, visueel (spinnenweb/radar of staafdiagram per thema)
- Per thema: score, kleur, korte duiding in Nynkes tone of voice (nuchter, warm, to the point, geen wollige taal)
- Reflectievragen per thema, afgestemd op de score (laag/midden/hoog krijgen andere vragen)
- Concrete aanbevelingen per thema, afgestemd op de score
- Afsluiting: stimulans om het gesprek aan te gaan (leidinggevende, HR of coach) + verwijzing naar begeleiding door Nynke als neutrale derde
- PDF-export in huisstijl

De teksten (duiding, reflectievragen, aanbevelingen per thema × scoreniveau) worden als aparte contentbestanden opgezet zodat Nynke ze zelf kan aanpassen zonder code.

### 3.4 Wave 1 buiten scope

Dashboard, logins voor klanten, betalingen, e-mailautomatisering.

---

## 4. Wave 2 — Het dashboard

### 4.1 Klantdashboard (HR/leidinggevende)

- Login per klantorganisatie
- Per scanronde: respons (x van y ingevuld), gemiddelde scores per thema op team- en organisatieniveau
- Kleurcodering en top-3 "vraagt aandacht" / top-3 "loopt goed"
- Vergelijking tussen metingen (nulmeting → vervolgmeting) en tussen teams (alleen bij voldoende respons)
- **Anonimiteitsregel:** teamresultaten alleen zichtbaar bij minimaal 5 (instelbaar) respondenten. Nooit individuele scores, nooit namen. Dit is de kern van het AVG-verhaal en van het vertrouwen van medewerkers.
- Export: adviesrapportage als PDF (basis die Nynke aanvult met persoonlijke duiding en advies)

### 4.2 Beheeromgeving (Nynke)

- Organisaties en teams aanmaken/beheren
- Scanrondes aanmaken → genereert unieke invullinks per team
- Overzicht respons per ronde, herinnering-teksten klaar om te versturen
- Instellingen: minimale groepsgrootte, kleurgrenzen, contentteksten rapport
- Alle klantdashboards inzien

### 4.3 Wave 2 buiten scope (latere fase)

Automatische e-mails, Plug&Pay-koppeling (facturatie blijft eerst handmatig), benchmarks tussen organisaties.

---

## 5. Techniek (advies)

- **Stack:** Next.js (React) + Supabase (database, auth, row level security) — veel voorbeeldcode, goed door Claude Code te bouwen en gratis te starten. Alternatief: Next.js + SQLite als alles op één server draait.
- **Hosting:** Vercel (gratis start), eigen subdomein **scan.nynkeleistra.nl** — oogt professioneel en integreert simpel met Squarespace (DNS-record + linken/embedden vanuit de module-pagina's).
- **PDF:** server-side generatie (bijv. react-pdf of Playwright print-to-PDF).
- **AVG:** data in EU-regio (Supabase EU), geen namen verplicht, respondent-codes i.p.v. identiteit, dataretentie instelbaar, verwerkersafspraken benoemen in offerte aan klanten.

### Integratie met huidige situatie

- Squarespace-module linkt naar scan.nynkeleistra.nl (of embed via iframe).
- Plug&Pay blijft de betaalkant; toegang tot scanrondes wordt in Wave 1–2 handmatig door Nynke aangemaakt na betaling. Automatische koppeling (webhook Plug&Pay → scanronde aanmaken) is een latere uitbreiding.

---

## 6. Stappenplan in Claude Code

**Wave 1**

1. Project opzetten (Next.js + database), `CLAUDE.md` en `vit-scan-stellingen.json` in de projectmap zetten
2. Datamodel: organisatie, team, scanronde, respondent, antwoorden
3. Scanflow bouwen (intro → stellingen per thema → afronden)
4. Scoring + persoonlijk rapport op scherm
5. Rapportteksten (duiding/reflectie/aanbevelingen) invoegen — Nynke levert of laat Claude Code eerste versies schrijven in haar tone of voice
6. PDF-export + huisstijl
7. Testen met proefronde (zelf + 2–3 testpersonen), daarna live op subdomein

**Wave 2**

8. Auth voor klanten en beheerder
9. Beheeromgeving (organisaties, teams, rondes, links)
10. Klantdashboard met anonimiteitsregel
11. Adviesrapportage-export
12. Vergelijken van metingen over tijd

---

## 7. Openstaande keuzes (beslis tijdens de bouw)

- Score weergeven als 1–10 of 1–5
- Radar-diagram of staven in het persoonlijk rapport
- Minimale groepsgrootte voor teamrapportage (advies: 5)
- Wel/geen optionele open vraag aan het einde van de scan ("Wat wil je nog kwijt?")
- Huisstijlkleuren en logo aanleveren voor rapport en app
