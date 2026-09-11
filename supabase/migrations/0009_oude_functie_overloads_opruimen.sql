-- 0008_scan_volledig_anoniem.sql herschreef start_respondent en
-- rond_respondent_af met een ANDERE parameterlijst. Postgres behandelt dat
-- als een nieuwe, losstaande functie (overloading), niet als een vervanging
-- van de oude -- "create or replace" verving dus niets en de oude versies
-- bleven naast de nieuwe bestaan, met hun oorspronkelijke uitvoerrechten
-- voor anon/authenticated. Beide oude versies verwijzen naar de kolommen
-- naam/email/respondent_code die niet meer bestaan (0008), zijn dus toch al
-- onbruikbaar, maar horen niet aanroepbaar te blijven staan.
drop function if exists public.start_respondent(uuid, uuid, text, text, text);
drop function if exists public.rond_respondent_af(uuid, text);
