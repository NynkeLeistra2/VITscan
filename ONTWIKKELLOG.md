# Ontwikkellog VIT-scan

Statusverslag om een sessie te kunnen onderbreken en later weer op te pakken.
Voor de "waarom" achter keuzes: zie `BESLISSINGEN.md`. Voor het totaalplan:
zie `VIT-scan-projectplan.md`.

## Status per 2026-07-10

**Wave 1, stap 1 (project opzetten):** klaar.
**Wave 1, stap 2 (datamodel):** klaar, migratie toegepast.
**Wave 1, stap 3 (scanflow):** code klaar en gecommit (intro → 19
thema-schermen → open vraag → afronden-placeholder). Build/typecheck/lint
zijn schoon. **Blijft hangen op end-to-end testen — zie blocker hieronder.**

## Openstaande blocker: RLS blokkeert inserts op respondenten/antwoorden

**Wat er misging:** bij het testen van de schrijfacties die de app gebruikt
(respondent aanmaken, antwoorden opslaan) gaf Supabase steeds:

```
{"code":"42501","message":"new row violates row-level security policy for table \"respondenten\""}
```

**Wat we al geprobeerd hebben:**
1. Migratie `0001_init_schema.sql` was al toegepast (tabellen + policies voor
   `organisaties`/`teams`/`scanrondes` werken aantoonbaar — select lukt,
   insert wordt terecht geweigerd zonder policy).
2. Vermoeden: het laatste stuk van migratie 1 (de insert/update-policies voor
   `respondenten` en `antwoorden`) is nooit (volledig) uitgevoerd.
3. Reparatiescript `0002_fix_respondenten_antwoorden_policies.sql` aangemaakt
   (drop-if-exists + opnieuw create van die vier policies) en door Nynke
   gedraaid in de SQL Editor — meldde "Success. No rows returned".
4. **Test daarna herhaald: nog steeds dezelfde 42501-fout.** De fix lijkt dus
   niet het gewenste effect te hebben gehad, of is ergens anders misgegaan.

**Volgende stap (nog niet afgerond):** we wilden de daadwerkelijke policies
in de database opvragen met:

```sql
select tablename, policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where tablename in ('respondenten', 'antwoorden')
order by tablename, cmd;
```

Kopiëren van het resultaat uit de Supabase SQL Editor naar de chat lukte
herhaaldelijk niet (tekst kwam steeds afgebroken/door elkaar aan). **Volgende
keer: vraag een screenshot van het resultaat in plaats van copy-paste.**

## Testgegevens (al aangemaakt in de database)

Via `supabase/seed_testdata.sql`:
- Organisatie: "Testorganisatie"
- Team: "Testteam" — `team_id = dbaa632d-b3e2-4071-b7a5-82782eca8637`
- Scanronde: "Proefronde" — `scanronde_id = c51814f7-461f-4a98-9ca1-a992c4f6bbe0`
- Testlink: `/scan/c51814f7-461f-4a98-9ca1-a992c4f6bbe0?team=dbaa632d-b3e2-4071-b7a5-82782eca8637`

Deze hoeven niet opnieuw aangemaakt te worden.

## Hervatten: te doen

1. Screenshot van de `pg_policies`-query (hierboven) opvragen bij Nynke.
2. Op basis daarvan de echte oorzaak vinden (ontbrekende policy, verkeerde
   rol, restrictive policy, of iets anders) en corrigeren.
3. Zodra insert werkt: de volledige schrijf-testreeks herhalen (respondent
   aanmaken → antwoorden opslaan → afronden → select nog steeds geblokkeerd)
   — het script daarvoor staat al klaar (curl-commando's, zie chatgeschiedenis
   sessie 2026-07-10).
4. Daarna: happy path ook echt in de browser doorklikken (niet alleen via
   API-simulatie).
5. Task-tracker stap 15 ("Scanflow end-to-end testen") afronden en
   `BESLISSINGEN.md` bijwerken met de uiteindelijke oorzaak/oplossing.
6. Door naar Wave 1, stap 4: scoring + persoonlijk rapport.
