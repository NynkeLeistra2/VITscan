-- Correctie op 0002-0005: alle functies daarin kregen bij het aanmaken
-- automatisch EXECUTE voor anon (en authenticated), ook de functies die
-- alleen voor Nynkes ingelogde sessie bedoeld waren.
--
-- Oorzaak: Supabase heeft standaard een regel op het schema `public` die
-- zegt "geef EXECUTE op elke nieuwe functie aan anon, authenticated en
-- service_role" (te zien via `select * from pg_default_acl`). Die regel
-- vuurt op het moment dat de functie wordt aangemaakt, dus vóórdat de
-- `revoke ... from public` in dezelfde migratie ooit draait. En "from
-- public" haalt niets weg wat rechtstreeks aan `anon` is gegeven -- `public`
-- en `anon` zijn twee verschillende rollen. Dit was dus geen tikfout in één
-- statement, maar iets dat voor elke nieuwe functie in dit project blijft
-- gebeuren totdat de standaardregel zelf wordt aangepast.
--
-- Twee dingen hieronder: (1) de standaardregel aanpassen zodat een nieuwe
-- functie vanaf nu geen EXECUTE voor anon meer krijgt totdat dat expliciet
-- gegeven wordt (fase 3 en later profiteren hier automatisch van mee), en
-- (2) de al aangemaakte functies corrigeren die alleen voor authenticated
-- bedoeld waren. De functies die anon wél mogen aanroepen
-- (haal_scan_context, start_respondent, upsert_antwoorden,
-- rond_respondent_af) blijven ongewijzigd: die kregen toen al een
-- expliciete "grant ... to anon" en die klopt nog steeds.
alter default privileges in schema public revoke execute on functions from anon;

revoke execute on function public.zet_start_limiet(uuid, integer) from anon;
revoke execute on function public.verwijder_respondent(uuid, text) from anon;
revoke execute on function public.verleng_bewaartermijn(uuid, integer) from anon;
revoke execute on function public.ruim_verlopen_respondenten_op() from anon;
revoke execute on function public.scanronde_deelnemers_aantal(uuid) from anon;
revoke execute on function public.scanronde_thema_gemiddelden(uuid) from anon;
