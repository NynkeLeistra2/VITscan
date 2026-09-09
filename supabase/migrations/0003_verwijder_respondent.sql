-- AVG-recht op verwijdering van één deelnemer (opdracht fase 2, punt 7).
-- Nu kan dit alleen met de hand in de SQL Editor; deze functie doet het
-- veilig vanuit een ingelogde sessie.
--
-- Neemt scanronde_id + respondent_code aan (het label dat Nynke ook echt
-- heeft als iemand vraagt om verwijdering, bv. "dappere-dolfijn-17"), niet
-- het interne rijid — dat is nergens uitleesbaar via de app (geen
-- SELECT-policy op respondenten, met opzet, zie 0001_init_schema.sql).
--
-- SECURITY DEFINER-functies omzeilen RLS, dus de identiteitscheck moet in
-- de functie zelf staan, niet alleen in de grant (SECURITY.md regel 2):
-- identiteit komt uit de sessie (auth.uid()), niet uit wat de aanroeper
-- meestuurt. `on delete cascade` op antwoorden.respondent_id (0001) ruimt
-- de bijbehorende antwoorden vanzelf mee op.
create or replace function public.verwijder_respondent(
  p_scanronde_id uuid,
  p_respondent_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet toegestaan.';
  end if;

  delete from respondenten
  where scanronde_id = p_scanronde_id
    and respondent_code = p_respondent_code;
end;
$$;

revoke all on function public.verwijder_respondent(uuid, text) from public;
grant execute on function public.verwijder_respondent(uuid, text) to authenticated;
