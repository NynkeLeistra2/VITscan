-- Reparatie: insert/update-policies voor respondenten en antwoorden bleken
-- te ontbreken na de eerste migratie (RLS blokkeerde daardoor ook legitieme
-- inserts vanuit de app). Idempotent: veilig opnieuw te draaien.

drop policy if exists "respondent kan worden aangemaakt" on respondenten;
create policy "respondent kan worden aangemaakt" on respondenten for insert with check (true);

drop policy if exists "respondent kan worden bijgewerkt" on respondenten;
create policy "respondent kan worden bijgewerkt" on respondenten for update using (true) with check (true);

drop policy if exists "antwoord kan worden aangemaakt" on antwoorden;
create policy "antwoord kan worden aangemaakt" on antwoorden for insert with check (true);

drop policy if exists "antwoord kan worden bijgewerkt" on antwoorden;
create policy "antwoord kan worden bijgewerkt" on antwoorden for update using (true) with check (true);
