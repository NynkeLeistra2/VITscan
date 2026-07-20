-- Maakt "e-mail verplicht" instelbaar per scanronde: aan voor betalende
-- klanten (Nynke wil hen kunnen opvolgen), uit voor workshops (drempel
-- verlagen). Wave 1 heeft geen beheer-UI, dus Nynke zet dit zelf handmatig
-- via de Supabase SQL editor bij het aanmaken van een scanronde, net als
-- organisaties/teams/scanrondes (zie 0001_init_schema.sql).
alter table scanrondes
  add column email_verplicht boolean not null default false;
