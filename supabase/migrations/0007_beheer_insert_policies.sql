-- Vervroegd stukje Wave 2 (zie BESLISSINGEN.md): Nynke kan nu zelf via een
-- ingelogde beheerpagina (/beheer) organisaties, teams en scanrondes
-- aanmaken. Tot nu toe was hier geen insert-policy voor (zie 0001, ze werden
-- handmatig aangemaakt) — dat blijft ook zo voor iedereen zonder sessie
-- (anon key): alleen de rol `authenticated` (dus alleen ingelogde gebruikers,
-- in de praktijk alleen Nynkes eigen account) mag aanmaken. Lezen blijft
-- publiek zoals in 0001, dat verandert hier niet.

create policy "authenticated kan organisaties aanmaken" on organisaties
  for insert to authenticated with check (true);

create policy "authenticated kan teams aanmaken" on teams
  for insert to authenticated with check (true);

create policy "authenticated kan scanrondes aanmaken" on scanrondes
  for insert to authenticated with check (true);
