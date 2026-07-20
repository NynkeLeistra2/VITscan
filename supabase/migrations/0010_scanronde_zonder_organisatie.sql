-- Nynke wil in /beheer ook een link kunnen aanmaken zonder organisatienaam
-- (bv. voor een workshop waar ze geen bedrijfsnaam wil tonen). organisatie_id
-- was tot nu toe verplicht (0001); dat wordt hier losgelaten.

alter table scanrondes alter column organisatie_id drop not null;
