# Beslissingen VIT-scan

Korte log van keuzes tijdens de bouw. Zie `VIT-scan-projectplan.md` voor het volledige plan.

## Wave 1, stap 1 — Project opzetten (2026-07-08)

- **Package manager:** npm (standaard, geen extra installatie nodig).
- **Supabase:** bestaand project van Nynke gebruikt (EU-regio), URL en publishable key in `.env.local` (niet gecommit).
- **Git:** repo geïnitialiseerd in de projectroot; `werkgeluk-kompas-main` (los, ongerelateerd Lovable/Vite-project dat al in de map stond) is uitgesloten via `.gitignore` en blijft alleen lokaal staan.
- **Stellingen-JSON:** `vit-scan-stellingen.json` verplaatst naar `src/content/vit-scan-stellingen.json` zodat de app 'm rechtstreeks kan importeren (`resolveJsonModule`). Blijft de enige bron voor stellingen.
- **Scaffold:** `create-next-app` met TypeScript, Tailwind, App Router, ESLint, `src/`-map en `@/*`-alias.
