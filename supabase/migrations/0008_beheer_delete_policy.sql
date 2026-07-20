-- Zie 0007: authenticated (alleen Nynkes eigen account) kan al aanmaken.
-- Hier ook laten verwijderen, voor de "links verwijderen"-knop in /beheer.
-- Let op: respondenten/antwoorden hangen aan scanrondes met `on delete
-- cascade` (0001) — een scanronde verwijderen wist dus ook alle al
-- ingevulde antwoorden eronder. De beheerpagina waarschuwt hiervoor met een
-- bevestigingsstap.

create policy "authenticated kan scanrondes verwijderen" on scanrondes
  for delete to authenticated using (true);
