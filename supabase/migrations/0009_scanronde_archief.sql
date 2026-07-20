-- "Verwijderen" in /beheer wordt een soft delete: eerst een maand in een
-- archief (herstelbaar), pas daarna definitief weg. Zie 0008 voor de
-- eerdere (nu vervangen) directe delete-policy — die blijft ook nodig, want
-- de definitieve opruiming na 30 dagen gebruikt nog steeds een echte delete.

alter table scanrondes add column gearchiveerd_op timestamptz;

-- Nodig om te kunnen archiveren/herstellen (update i.p.v. delete).
create policy "authenticated kan scanrondes bijwerken" on scanrondes
  for update to authenticated using (true) with check (true);
