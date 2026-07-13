# Security-regels — verplicht bij elke ontwikkeling

Deze app wordt gebouwd met AI door iemand zonder formele dev-achtergrond.
Jij (Claude Code) bent verantwoordelijk voor security-by-default: pas deze
regels toe bij ELKE wijziging, zonder dat erom gevraagd wordt.
Kernprincipe: **bij twijfel deur dicht — deny by default, fail closed.**

## Vaste regels bij elke wijziging

1. **Secrets nooit in de code.** API-keys, tokens en wachtwoorden alleen in
   environment variables, server-side. Nooit in frontend/browser-code, nooit
   in git (check .gitignore). Externe API-calls (OpenAI, Claude, Stripe)
   lopen altijd via een server-route, nooit rechtstreeks vanuit de browser.
2. **Toegangscontrole server-side.** Bij elke route/endpoint met een ID of
   gebruikersdata: check dat de ingelogde gebruiker eigenaar is (geen IDOR).
   Identiteit komt uit de sessie/JWT, nooit uit de request body.
   Admin-acties worden aan de serverkant gecontroleerd, niet alleen verborgen
   in de frontend.
3. **Geen zelfgebouwde authenticatie.** Gebruik een bewezen platform (Clerk,
   Supabase Auth, Auth0, Firebase). Sessietokens in httpOnly-cookies, nooit
   in localStorage.
4. **Rate limiting op alle API-routes**, strenger op gevoelige routes
   (login, reset, AI-calls, betalingen). Server-side, niet alleen frontend.
5. **Input valideren server-side** met een schema-library (bijv. Zod).
   Geparametriseerde queries, geen string-concatenatie. User-content
   sanitizen tegen XSS. Input naar AI-modellen filteren op prompt injection.
6. **CORS dicht:** alleen eigen frontend-domein(en), geen wildcard `*`.
7. **Fail closed:** bij een fout of crash wordt toegang geweigerd, nooit
   verleend. Foutmeldingen naar gebruikers zijn generiek (geen stack traces,
   paden of db-details).
8. **Logging:** logins, mislukte logins, fouten en toegang tot gevoelige
   data worden gelogd. Nooit wachtwoorden of tokens in logs.
9. **Dependencies:** alleen officiële pakketten, lockfile committen,
   `npm audit` draaien bij het toevoegen van pakketten. Geen verzonnen of
   verlaten pakketten.
10. **Indien Supabase:** RLS aan op elke tabel, policies met WITH CHECK,
    identiteit via `auth.uid()`, service-role-key nooit client-side,
    storage buckets afgeschermd.

## Werkwijze

- Raakt een wijziging auth, API-routes, database, uploads of externe
  diensten? Benoem dan expliciet in je antwoord welke van bovenstaande
  regels van toepassing zijn en hoe je eraan voldoet.
- Signaleer het proactief als een gevraagde feature een van deze regels
  schendt — bouw dan de veilige variant en leg in gewone taal uit waarom.
- Vóór elke deploy: draai een korte check op secrets in code, HTTPS,
  generieke foutmeldingen, rate limiting, CORS, RLS (indien Supabase),
  logging en env-variabelen. Rapporteer groen/oranje/rood.
- Volledige audit (periodiek of vóór grote release): gebruik de
  Comprehensive Audit-prompt uit `Security-Promptset.html` (stap 4).

Bron: Security-Promptset "Je app deployen & veilig maken" — Expand With AI,
gebaseerd op OWASP Top 10 (2025).
