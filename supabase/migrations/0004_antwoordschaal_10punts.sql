-- Antwoordschaal per stelling gaat van 5-punts Likert naar direct 1-10, zodat
-- de themascore (gemiddelde van de stellingen) al op de gewenste 1-10-schaal
-- staat zonder omrekening. Zie CLAUDE.md (Scoring) en
-- src/content/vit-scan-stellingen.json (meta.schaal, versie opgehoogd naar
-- 2.0.0 -- oude 1-5-antwoorden zijn niet vergelijkbaar met nieuwe 1-10-
-- antwoorden).

alter table antwoorden drop constraint antwoorden_waarde_check;
alter table antwoorden add constraint antwoorden_waarde_check check (waarde between 1 and 10);
