# VIT-scan rapportteksten per scoreniveau

Dit bestand beschrijft de teksten en de logica van het individuele VIT-scan
rapport zoals de app ze nu opbouwt (scherm én PDF). Het is de leesbare
tegenhanger van `src/content/rapportteksten/*.json` (bron van de teksten)
en `src/lib/rapportteksten.ts` (bron van de logica).

## Spelregels

### Niveau per thema

Elk thema krijgt een tekst die past bij de hoogte van de themascore
(gemiddelde van de stellingen binnen dat thema, op 1 decimaal). Hoe hoger
de score, hoe minder erbij staat.

| Niveau | Themascore | Wat er in het rapport staat |
|---|---|---|
| Laag | lager dan 5,5 | Tekst, twee reflectievragen |
| Midden | 5,5 tot en met 7,4 | Tekst, één reflectievraag |
| Hoog | 7,5 en hoger | Eén korte tekst, geen vragen. Het thema komt ook in het blok Jouw krachtbronnen |

Er staan geen acties/aanbevelingen meer per thema. De reflectievragen
staan onder het kopje "Om over na te denken".

### Signaalregel

- Bij een thema op niveau **midden** of **hoog**: elke stelling met een
  score van 4 of lager krijgt een eigen signaalzin.
- Bij een thema op niveau **laag**: alleen de stellingen van 4 of lager
  die minstens 1 punt onder de themascore liggen, maximaal twee.
- Zes vaste "zorgsignalen" verschijnen op elk niveau altijd zodra ze 4 of
  lager scoren, ook bij laag en ook als ze niet minstens 1 punt onder de
  themascore liggen. Ze tellen niet mee voor het maximum van twee:
  - Fysieke gezondheid: "Ik voel me vrij van stress gerelateerde fysieke klachten."
  - Mentale gezondheid: "Ik voel mij mentaal gezond."
  - Mentale gezondheid: "Ik voel me vrij van stress gerelateerde mentale klachten."
  - Ontspanning: vrije tijd: "Ik slaap goed en krijg voldoende slaap."
  - Financiën: omgaan met geld: "Ik hoef me geen zorgen te maken of ik wel rond kan komen."
  - Huis en leefomgeving: "Ik voel me veilig in mijn huis en omgeving."
- De laagste score staat bovenaan.
- De signaalzinnen staan per thema onder het kopje **Wat opvalt**.

### Volgorde van het rapport

1. Introtekst, het paarse blok met de totaalscore (score, niveau-titel,
   het label "Totaalscore van werkenergie en persoonlijk welzijn"), en
   direct daaronder de samenvatting: de niveautekst bij de totaalscore met
   de persoonlijke zin verwerkt (zie hieronder). In de PDF staat hier
   direct onder ook al het Werkenergiewiel (pagina 1).
2. In de PDF: het Levenswiel op een nieuwe pagina, met daaronder — nog
   altijd op diezelfde pagina — het blok Jouw krachtbronnen (pagina 2). Op
   het scherm staan beide wielen gewoon na elkaar, gevolgd door het
   krachtbronnenblok; daar bestaat geen paginabegrip.
3. Per thema.
4. Het blok **Aan de slag**: het algemene Om over na te denken/Wat kun je
   doen, gebaseerd op de totaalscore (zie "Opening bij de totaalscore"
   hieronder voor de inhoud per niveau). Een dunne lijn boven de titel,
   geen volle kopbalk.
5. En nu?
6. Bijlage met scores per vraag.

### Persoonlijke zin in de samenvatting

Na de eerste zin van de niveautekst bij de totaalscore worden, waar van
toepassing, één of twee zinnen ingevoegd. De genoemde thema-namen staan
vetgedrukt.

- **"Je haalt de meeste energie uit [A] en [B]."** — de twee hoogste
  thema's met een score van 7,5 of hoger (hoogste eerst). Is er precies
  één zo'n thema, dan wordt alleen dat thema genoemd. Zijn er geen, dan
  vervalt deze zin.
- **"Het meest schuurt het bij [C] en [D]."** — de twee laagste thema's
  onder de 5,5 (laagste eerst), zelfde regels voor 1 of 0 thema's.
- Zijn er geen thema's onder de 5,5, dan komt in plaats daarvan:
  **"De meeste ruimte voor groei zit bij [C] en [D]."** voor de twee
  laagste thema's onder de 7,5 (zelfde regels; valt weg als die er ook
  niet zijn).
- Bij een gelijke stand tussen thema's gaat een thema uit Werkenergie
  voor een thema uit Persoonlijk Welzijn, en anders geldt de volgorde van
  de scan.
- Dit is vaste logica in de code (`persoonlijkeSamenvattingDelen` in
  `src/lib/rapportteksten.ts`), niet via de Anthropic API.

### Opening bij de totaalscore

5 bandbreedtes (los van de rood/oranje/groen-indeling per thema), elk met
een titel, een tekst (waar de persoonlijke zin na de eerste zin wordt
ingevoegd), reflectievragen en aanbevelingen. Deze reflectievragen en
aanbevelingen vormen samen het blok **Aan de slag** dat na "Per thema"
verschijnt. Bij elk niveau is de eerste reflectievraag vast:
**"Welke verbanden zie je? Welke thema's beïnvloeden elkaar?"** — de
overige vragen en de aanbevelingen staan in
`src/content/rapportteksten/algemeen.json` en verschillen per
bandbreedte (1,0–2,9 "Zeer laag werkgeluk", 3,0–5,4 "Laag werkgeluk",
5,5–6,9 "Gemiddeld werkgeluk", 7,0–8,9 "Hoog werkgeluk", 9,0–10,0 "Zeer
hoog werkgeluk").

### Afsluiting

Vaste titel "En nu?" met een vaste tekst die uitnodigt tot het gesprek
(met leidinggevende, HR, of iemand van buitenaf). Zie
`src/content/rapportteksten/algemeen.json`.

### Blok Jouw krachtbronnen

Alle thema's met een score van 7,5 of hoger komen samen in één blok.
Scoort geen enkel thema zo hoog, dan vervalt het blok. In de PDF blijft
dit blok altijd samen met het levenswiel op één pagina (kop, thema-regel,
tekst én de vraag).

- **Regel onder de kop:** de namen van de thema's met hun score, bijv.
  "Zingeving (8,7), Fysieke werkomgeving (8,0), Familie en relaties
  (9,5), Huis en leefomgeving (9,7)". Zijn het er meer dan zes, dan
  vervangt één zin de opsomming: "Al je thema's scoren 7,5 of hoger."
  (als dat voor alle thema's geldt) of "Veel van je thema's scoren 7,5 of
  hoger." (anders).
- **Tekst als er ook thema's onder 5,5 zijn:** "Hier haal je energie uit.
  Dat is een stevige basis, zeker nu andere onderdelen schuren."
  Vraag: "Kijk eens naar je krachtbronnen en naar waar het schuurt. Hoe
  kunnen jouw krachtbronnen je helpen bij de thema's waar het niet zo
  lekker loopt?"
- **Tekst als er geen thema's onder 5,5 zijn:** "Hier haal je energie
  uit. Het loont om te weten waarom dit zo goed werkt."
  Vraag: "Wat heb je nodig om dit vast te houden als het drukker wordt?"

### Voorbeeldrapport

Onder "Voorbeeldrapport downloaden" op `/beheer` staat een PDF met vaste,
verzonnen scores (`src/lib/pdf/voorbeeld-scores.ts`), voor Nynke om te
delen met potentiële klanten. Zelfde opbouw als het echte rapport, met
twee verschillen:

- Geen signaalzinnen per stelling, op één uitzondering na: bij Mentale
  gezondheid staat altijd de signaalzin van "Ik voel me vrij van stress
  gerelateerde mentale klachten", met eronder in kleinere cursieve tekst
  "In het rapport van deelnemers staat dit bij elke stelling die laag
  scoort."
- Geen bijlage met scores per vraag.

Bovenaan staat "Voorbeeldrapport", onderaan bij de contactgegevens "Dit
rapport is gemaakt met fictieve scores." Zie `RapportPdfInput.voorbeeld`
in `src/lib/pdf/rapport-pdf.ts`.

## Werkenergie, deel 1

### Plezier

**Laag** Je hebt op dit moment weinig plezier in je werk. Werk dat je
niet leuk vindt, kost meer energie dan je denkt, ook als je het goed
doet.

- Vraag: Wanneer had je voor het laatst echt plezier in je werk, en wat
  was er toen anders?
- Vraag: Ligt het vooral aan de inhoud van je werk of aan de sfeer om je
  heen?

**Midden** Er zijn momenten van plezier, maar het is niet
vanzelfsprekend. Je voelt het verschil tussen goede en minder goede dagen
duidelijk.

- Vraag: Wat maakt dat de ene dag wel plezierig is en de andere niet?

**Hoog** Je hebt plezier in je werk en in de mensen om je heen. Dat
maakt de dagen lichter.

**Wat opvalt**

- Het werk zelf spreekt je weinig aan. Kijk of er taken zijn die beter
  bij je passen, binnen of buiten je huidige functie.
- Je hebt weinig plezier in wat je doet. Speelt dat al langer, onderzoek
  dan waar het vandaan komt.
- De sfeer in je team is niet goed. Dat merk je elke werkdag. Vaak
  speelt het bij meer mensen, dus maak het bespreekbaar.
- De sfeer in de organisatie ervaar je als niet goed. Kijk wat je
  daarvan merkt in je eigen werk en wat je zelf kunt beïnvloeden.

### Voldoening

**Laag** Je werk geeft je weinig energie en aan het einde van de dag
houd je weinig voldoening over. Dat put je op den duur uit.

- Vraag: Wat kost je op een werkdag de meeste energie?
- Vraag: Wanneer had je voor het laatst het gevoel dat je iets goeds had
  gedaan?

**Midden** Je werk geeft je soms energie, maar niet altijd. Er zijn
dagen dat je voldaan naar huis gaat en dagen dat het vooral moeten is.

- Vraag: Wat is het verschil tussen een dag waarop je voldaan naar huis
  gaat en een dag waarop dat niet zo is?

**Hoog** Je werk geeft je energie en je zit regelmatig in je kracht.

**Wat opvalt**

- Je voelt je weinig geïnspireerd op je werk. Waar haalde je eerder je
  inspiratie uit?
- Je werk geeft je weinig energie. Let op dat het niet ongemerkt ook je
  vrije tijd opslokt.
- Je werkdruk voelt niet hanteerbaar. Wacht niet tot het vanzelf
  rustiger wordt, maar bespreek het met je leidinggevende.
- Je komt weinig in een flow. Vaak komt dat door veel onderbrekingen of
  door werk dat niet goed bij je past.
- Je gaat zelden voldaan naar huis. Kijk of dat komt door te veel werk
  of door werk dat je weinig oplevert.

### Competentie

**Laag** Je hebt het gevoel dat je kwaliteiten en talenten nu
onvoldoende worden ingezet, of dat je werk niet goed aansluit bij wat je
kunt. Dat is frustrerend.

- Vraag: Welke van je kwaliteiten komen in je huidige werk het minste
  tot hun recht?
- Vraag: Wat zou er moeten veranderen zodat je vaker kan doen waar je
  goed in bent?

**Midden** Je kunt een deel van je kwaliteiten kwijt in je werk, maar
nog niet alles.

- Vraag: Welk talent van jou blijft nu het meest liggen?

**Hoog** Je kunt in je werk doen waar je goed in bent en je voelt je
bekwaam.

**Wat opvalt**

- Je komt weinig toe aan het werk waar je het beste in bent. Weet je
  leidinggevende welk werk dat is?
- Je voelt je niet vaardig genoeg voor je werk. Dat vraagt om iets
  anders dan meer ruimte. Bespreek welke scholing, begeleiding of
  inwerktijd je nodig hebt.
- Je kwaliteiten worden weinig benut. Maak voor jezelf helder welke dat
  zijn, zodat je ze ook kunt benoemen.

### Uitdaging

**Laag** Je ervaart nu weinig uitdaging en ziet weinig ruimte om te
groeien. Dat kan op termijn leiden tot onderprikkeling en afhaken.

- Vraag: Mis je uitdaging in de inhoud van je werk, of vooral in
  doorgroeimogelijkheden?
- Vraag: Wat zou voor jou een reële volgende stap zijn?

**Midden** Je werk biedt je af en toe uitdaging, maar op sommige punten
heb je het gevoel dat je stilstaat.

- Vraag: Wat zou jou op dit moment iets nieuws laten leren?

**Hoog** Je werk daagt je uit en je ziet ruimte om je te blijven
ontwikkelen.

**Wat opvalt**

- Je werk daagt je weinig uit. Te weinig uitdaging kost op den duur net
  zoveel energie als te veel.
- Je ziet weinig mogelijkheden om te groeien. Vraag na wat er wel kan,
  ook als het niet vanzelf wordt aangeboden.
- Je krijgt weinig kansen om te leren buiten je eigen functie. Denk aan
  meelopen, een project of een training.

### Autonomie

**Laag** Je ervaart weinig vrijheid en ruimte om je werk naar eigen
inzicht te doen. Dat knelt, zeker als je weet dat het anders zou kunnen.

- Vraag: Waar voel je de beperking het sterkst: in beslissingen, in
  werkwijze, of in invloed op besluiten?
- Vraag: Wat zou er minimaal moeten veranderen om meer ruimte te voelen?

**Midden** Je hebt een redelijke mate van vrijheid in je werk, maar op
sommige punten mis je ruimte of invloed.

- Vraag: Waar zou meer ruimte het meeste verschil maken?

**Hoog** Je hebt ruimte om je werk naar eigen inzicht te doen en je
hebt invloed.

**Wat opvalt**

- Je ervaart weinig vrijheid in je werk. Kijk waar die vrijheid wel zit,
  ook als het klein is.
- Je hebt weinig ruimte om je werk naar eigen inzicht te doen. Zijn de
  kaders te strak, of is onduidelijk wat binnen de kaders mag?
- Je ervaart weinig invloed op je werk en de organisatie. Vraag waar
  jouw inbreng welkom is.

### Vertrouwen

**Laag** Je voelt je niet vrij om open te zijn en het vertrouwen in en
met collega's staat onder druk. Dat maakt samenwerken zwaarder dan
nodig.

- Vraag: Wat gebeurt er (of is er gebeurd) waardoor je je mening niet
  vrij deelt?
- Vraag: Is dit met specifieke mensen, of voelt het breder in het team?

**Midden** Het vertrouwen in je team is er grotendeels, maar niet
altijd. Soms houd je je mening voor je of twijfel je hoe iets valt.

- Vraag: Bij wie of in welke situaties houd je je het meest in?

**Hoog** Je voelt je vrij om te zeggen wat je denkt en je vertrouwt je
collega's.

**Wat opvalt** (stellingen: eerst Psychologische veiligheid &
communicatie, dan Vertrouwen & respect)

- Je deelt je mening niet makkelijk als die afwijkt. Zo blijven goede
  ideeën en zorgen liggen.
- Je ideeën worden volgens jou weinig serieus genomen. Benoem wat je
  daarvan merkt, en bij wie.
- Je bent bang voor kritiek of afwijzing als je open bent. Dat is zwaar
  om elke dag mee te dragen. Bespreek het met je leidinggevende of een
  vertrouwenspersoon.
- Je hebt het gevoel dat collega's je weinig vertrouwen. Is er iets
  gebeurd, of speelt dit al langer?
- Je hebt weinig vertrouwen in je collega's. Gaat dat over het hele team
  of over een paar mensen?
- Je voelt je weinig gerespecteerd door collega's. Dat hoef je niet te
  accepteren. Bespreek het met je leidinggevende of een
  vertrouwenspersoon.

## Werkenergie, deel 2

### Verbinding

**Laag** Je voelt weinig verbinding met je collega's, je leidinggevende
of de organisatie. Je werkt er, maar je hoort er niet echt bij.

- Vraag: Met wie of wat voel je je het minst verbonden?
- Vraag: Is dat altijd zo geweest, of is er iets veranderd?

**Midden** Er is verbinding, maar niet overal even sterk. Met sommige
mensen of onderdelen voel je meer afstand.

- Vraag: Waar voel je de meeste verbinding, en waar het minst?

**Hoog** Je voelt je verbonden met je collega's en met waar de
organisatie voor staat.

**Wat opvalt**

- Je voelt weinig verbinding met de koers van de organisatie. Weet je
  waar de organisatie naartoe wil? Vraag ernaar.
- Je voelt je niet thuis en kunt niet helemaal jezelf zijn. Dat kost
  elke dag energie.
- Je voelt je weinig verbonden met je collega's. Een kort gesprek
  buiten het werk om kan al verschil maken.
- Je ervaart weinig verbinding vanuit je leidinggevende. Wat heb je van
  hem of haar nodig? Dat mag je vragen.

### Waardering

**Laag** Je voelt je weinig gewaardeerd in je werk. Dat raakt je
motivatie, ook als je het werk zelf leuk vindt.

- Vraag: Welke waardering mis je het meest: persoonlijk, financieel of
  steun van collega's?
- Vraag: Weet je leidinggevende wat waardering voor jou betekent?

**Midden** Je voelt je op onderdelen gewaardeerd, maar niet overal.

- Vraag: Welke vorm van waardering zou voor jou nu het meeste verschil
  maken?

**Hoog** Je voelt je gewaardeerd, persoonlijk en in wat je bijdraagt.
Dat gevoel van ertoe doen versterkt je motivatie.

**Wat opvalt**

- Je ervaart weinig persoonlijke waardering. Het helpt om zelf te
  benoemen wat je nodig hebt.
- Je ervaart weinig financiële waardering. Bespreek dit op een moment
  dat ervoor bedoeld is, zoals je jaargesprek, en bereid het goed voor.
- Je hebt niet het gevoel dat je ertoe doet. Neem dat serieus en praat
  erover met iemand die je vertrouwt.
- Je ervaart weinig steun van collega's. Vraag zelf om hulp als je die
  nodig hebt. Dat doorbreekt vaak het patroon.

### Zingeving

**Laag** Je ervaart je werk op dit moment als weinig zinvol. Dan wordt
het moeilijk om er energie in te blijven steken.

- Vraag: Wat maakte je werk eerder wel zinvol, of wat zou het zinvol
  maken?
- Vraag: Mis je zin in het werk zelf, of zie je het effect van je werk
  niet meer?

**Midden** Je werk heeft betekenis voor je, maar dat gevoel is niet
altijd even sterk.

- Vraag: Wanneer voel je het sterkst dat je werk ertoe doet?

**Hoog** Je ervaart je werk als zinvol en voelt je van toegevoegde
waarde.

**Wat opvalt**

- Je ervaart je werk als weinig zinvol. Dat is vaak een reden om verder
  te kijken dan je huidige functie.
- Je voelt je weinig van toegevoegde waarde binnen de organisatie.
  Vraag na hoe er naar jouw bijdrage gekeken wordt.
- Je hebt het gevoel weinig toe te voegen voor de mensen met wie je
  werkt. Vraag hen eens wat jouw werk voor hen betekent.

### Duidelijkheid

**Laag** Het is voor jou onduidelijk wat er van je verwacht wordt en
hoe de rollen liggen. Dat maakt je werk onnodig zwaar en onzeker.

- Vraag: Op welk vlak mis je vooral duidelijkheid: taken,
  verantwoordelijkheden, of verwachtingen?
- Vraag: Wat zou jou helpen om hier meer grip op te krijgen?

**Midden** Het is grotendeels duidelijk wat er van je verwacht wordt,
maar niet op alle punten.

- Vraag: Op welk vlak mis je vooral duidelijkheid: taken,
  verantwoordelijkheden, of verwachtingen?

**Hoog** Je weet wat er van je verwacht wordt en de rollen zijn helder.

**Wat opvalt**

- Je weet niet goed wat er van je verwacht wordt. Vraag je
  leidinggevende om dit concreet te maken, het liefst op papier.
- De rollen in de organisatie zijn voor jou onduidelijk. Dat zorgt vaak
  voor dubbel werk of werk dat blijft liggen.

### Fysieke werkomgeving

**Laag** Je werkomgeving ondersteunt je onvoldoende. Dat merk je
misschien niet direct, maar het kost je elke dag energie.

- Vraag: Wat stoort je het meest aan je werkplek: geluid, licht, ruimte
  of iets anders?
- Vraag: Wat heb je nodig om goed je werk te kunnen doen?

**Midden** Je werkomgeving is redelijk op orde, maar er zijn punten die
beter kunnen.

- Vraag: Welke aanpassing aan je werkplek zou het meeste verschil maken?

**Hoog** Je werkomgeving ondersteunt je goed en voelt comfortabel.

**Wat opvalt**

- Je werkplek ondersteunt je slecht in je werk. Vraag om een
  aanpassing, dat is een redelijke vraag.
- Je voelt je niet op je gemak in je werkomgeving. Ligt dat aan de
  plek, of aan wat er om je heen gebeurt?
- Je werkomgeving draagt weinig bij aan hoe je je voelt. Denk aan
  licht, rust en een plek om even op adem te komen.

## Persoonlijk welzijn, deel 1

### Balans

**Laag** Werk en privé voelen niet in balans en ook emotioneel voel je
weinig rust. Dat vraagt aandacht, want dit tast je herstel aan.

- Vraag: Waar zit de disbalans vooral: in tijd, in energie, of in
  hoofd bezig blijven?
- Vraag: Wat zou als eerste moeten veranderen om meer balans te voelen?

**Midden** Werk en privé zijn redelijk in balans, maar het kost
geregeld moeite om dat zo te houden.

- Vraag: Waar zit de disbalans vooral: in tijd, in energie, of in
  hoofd bezig blijven?

**Hoog** Werk en privé zijn in balans en je ervaart rust.

**Wat opvalt**

- Werk en privé zijn uit balans. Trekt werk steeds je vrije tijd in,
  bespreek dat dan met je leidinggevende.
- Je ervaart weinig emotionele rust in je privéleven. Dat neem je ook
  mee naar je werk. Een gesprek met iemand die je vertrouwt of met een
  coach kan helpen.

### Fysieke gezondheid

**Laag** Je voelt je fysiek niet goed. Je lichaam geeft aan dat er iets
moet veranderen.

- Vraag: Hoe lang voel je je al zo?
- Vraag: Wat heeft je lichaam op dit moment het meest nodig: rust,
  beweging of iets anders?

**Midden** Je gezondheid is redelijk op orde, maar je voelt je niet
altijd fit.

- Vraag: Wat zou je structureel meer aandacht willen geven?

**Hoog** Je voelt je fysiek gezond en je besteedt er aandacht aan.

**Wat opvalt**

- Je voelt je fysiek niet gezond. Loop je hier al langer mee rond, ga
  dan langs je huisarts.
- Je hebt lichamelijke klachten die met stress te maken hebben (zorgsignaal:
  telt altijd mee, ook bij laag). Neem dat serieus, ook als de rest goed
  voelt. Bespreek het met je huisarts of bedrijfsarts.
- Je hebt weinig aandacht voor je fysieke gezondheid. Wat schiet er als
  eerste bij in als het druk is?
- Je beweegt te weinig. Plan beweegmomenten net zo vast in als
  werkafspraken.

### Mentale gezondheid

**Laag** Je voelt je mentaal niet goed. Dat verdient aandacht, liever
nu dan later.

- Vraag: Hoe lang voel je je al zo?
- Vraag: Met wie kun je hierover praten?

**Midden** Je mentale gezondheid is wisselend. Op sommige momenten
voel je je stevig, op andere minder.

- Vraag: Wat helpt jou om je veerkracht te herstellen?

**Hoog** Je voelt je mentaal stevig en kunt tegen een stootje.

**Wat opvalt**

- Je voelt je mentaal niet gezond (zorgsignaal). Praat erover met
  iemand die je vertrouwt en met je huisarts.
- Je hebt mentale klachten die met stress te maken hebben (zorgsignaal).
  Neem dit serieus, ook als de rest goed voelt. Bespreek het met je
  huisarts of bedrijfsarts, voordat het zwaarder wordt.
- Je voelt weinig veerkracht om tegenslagen op te vangen. Wat of wie
  geeft je steun als het tegenzit?
- Je hebt weinig aandacht voor je mentale gezondheid. Welk moment in de
  week kan echt van jou zijn?

### Ontspanning: vrije tijd

**Laag** Je kan werk moeilijk loslaten, hebt weinig ontspanning en de
slaap laat te wensen over. Dat is een combinatie die uitputting in de
hand werkt.

- Vraag: Wat houdt je vast als je probeert los te laten na werktijd?
- Vraag: Wat zou je slaap of ontspanning het meest ten goede komen?

**Midden** Je hebt ontspanning in je week, maar niet altijd genoeg.
Soms blijft werk in je hoofd zitten of schiet je slaap erbij in.

- Vraag: Wat houdt je vast als je probeert los te laten na werktijd?

**Hoog** Je kunt werk goed loslaten, je ontspant en je slaapt goed.

**Wat opvalt**

- Je kunt werk moeilijk loslaten. Zo herstel je niet echt, ook niet in
  het weekend.
- Je hebt te weinig ontspanning in je week. Plan het in, anders schuift
  het steeds op.
- Je slaapt slecht of te weinig (zorgsignaal). Dat raakt je energie, je
  humeur en je concentratie. Houdt het aan, bespreek het dan met je
  huisarts.

## Persoonlijk welzijn, deel 2

### Financiën: omgaan met geld

**Laag** Geld geeft je op dit moment zorgen. Dat neem je mee naar je
werk en naar huis, ook als je er niet over praat.

- Vraag: Wat geeft je de meeste zorgen: rondkomen, of een onverwachte
  uitgave?
- Vraag: Heb je overzicht over wat er binnenkomt en uitgaat?

**Midden** Je financiën zijn redelijk op orde, maar geven je niet
altijd rust.

- Vraag: Wat zou jou meer financiële rust geven?

**Hoog** Je hebt je financiën op orde en dat geeft je rust.

**Wat opvalt**

- Je bent niet tevreden over je financiën. Kijk wat je zelf kunt
  veranderen en waar je hulp bij nodig hebt.
- Een onverwachte uitgave zou je in de problemen brengen. Een kleine
  buffer, als dat kan, geeft al rust.
- Je maakt je zorgen of je rond kunt komen (zorgsignaal). Dat geeft veel
  spanning. Je hoeft dit niet alleen op te lossen: je gemeente biedt
  gratis hulp bij geldzorgen.

### Persoonlijke ontwikkeling

**Laag** Je ervaart weinig richting in je leven en je komt weinig toe
aan je eigen groei.

- Vraag: Wat zou je graag anders zien in hoe je leven nu loopt?
- Vraag: Wat weet je al over je sterke kanten, en wat nog niet?

**Midden** Er is af en toe ruimte voor je eigen ontwikkeling, maar het
is niet structureel.

- Vraag: Wat zou jou helpen om hier vaker tijd voor te maken?

**Hoog** Je geeft richting aan je leven en je weet waar je sterk in
bent.

**Wat opvalt**

- Je hebt het gevoel dat je weinig richting geeft aan je leven. Sta
  stil bij wat je zelf wilt, los van wat er van je verwacht wordt.
- Je weet niet goed wat je sterke kanten zijn. Vraag feedback aan
  iemand die je goed kent.
- Je neemt weinig tijd voor je eigen groei. Wat schuift er steeds voor?

### Familie en relaties

**Laag** Je ervaart weinig steun van de mensen om je heen, of het
contact kost je energie. Dan wordt het zwaarder om tegenslagen op te
vangen.

- Vraag: Bij wie kun je terecht als het tegenzit?
- Vraag: Welk contact kost je nu de meeste energie?

**Midden** Je hebt steun van mensen om je heen, maar sommige contacten
vragen ook energie.

- Vraag: Welke mensen geven je energie, en welke kosten het?

**Hoog** Je ervaart steun vanuit je familie en vrienden en het contact
voelt zorgeloos. Dat is een sterke basis om op terug te vallen.

**Wat opvalt**

- Je ervaart weinig steun van de mensen die belangrijk voor je zijn. Is
  er iemand, ook buiten familie en vrienden, bij wie je terecht kunt?
- Het contact met mensen om je heen voelt niet zorgeloos. Relaties die
  veel spanning geven, kosten ook energie op je werk.

### Huis en leefomgeving

**Laag** Je voelt je niet goed thuis in je woonomgeving. Juist de plek
waar je zou moeten opladen, geeft je nu weinig rust.

- Vraag: Wat maakt dat je thuis niet tot rust komt?
- Vraag: Is het iets wat je zelf kunt veranderen, of heb je er hulp bij
  nodig?

**Midden** Je woont redelijk prettig, maar thuis is niet altijd een
plek waar je tot rust komt.

- Vraag: Wat zou je thuis meer rust geven?

**Hoog** Je voelt je thuis en veilig in je woonomgeving en komt er tot
rust. Dat is een belangrijke basis onder je welzijn.

**Wat opvalt**

- Je voelt je niet prettig op de plek waar je woont. Dat kost meer
  energie dan je misschien denkt.
- Je komt thuis niet tot rust. Kijk wat er nodig is om thuis weer op te
  kunnen laden.
- Je voelt je niet veilig in je huis of omgeving (zorgsignaal). Praat
  hierover met iemand die je vertrouwt of met je huisarts. Voel je je
  thuis niet veilig door iemand in je omgeving, dan kun je gratis en
  anoniem bellen met Veilig Thuis: 0800 2000.
