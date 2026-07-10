-- Testdata voor de proefronde (stap 7 van het stappenplan). Draai dit in de
-- Supabase SQL Editor. Haal na het draaien de scanronde-id op (zie query
-- onderaan) om de testlink samen te stellen:
-- https://<jouw-domein>/scan/<scanronde-id>?team=<team-id>

with nieuwe_organisatie as (
  insert into organisaties (naam) values ('Testorganisatie') returning id
),
nieuw_team as (
  insert into teams (organisatie_id, naam)
  select id, 'Testteam' from nieuwe_organisatie
  returning id, organisatie_id
)
insert into scanrondes (organisatie_id, naam, gestart_op)
select organisatie_id, 'Proefronde', now() from nieuw_team
returning id as scanronde_id, organisatie_id;

-- Haal de link-onderdelen op:
select
  o.naam as organisatie,
  t.id as team_id,
  t.naam as team,
  s.id as scanronde_id,
  s.naam as scanronde
from scanrondes s
join organisaties o on o.id = s.organisatie_id
join teams t on t.organisatie_id = o.id
where o.naam = 'Testorganisatie';
