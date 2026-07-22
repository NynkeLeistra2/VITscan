-- Verwijderen van een lege organisatie vanuit /beheer (nooit gebruikte
-- links die per ongeluk als organisatie zijn aangemaakt). De server action
-- staat dit alleen toe als de organisatie geen enkele scanronde heeft (ook
-- niet gearchiveerd), dus geen cascade-risico op respondenten/antwoorden.
-- Zie 0007/0008 voor hetzelfde patroon bij scanrondes.

create policy "authenticated kan organisaties verwijderen" on organisaties
  for delete to authenticated using (true);
