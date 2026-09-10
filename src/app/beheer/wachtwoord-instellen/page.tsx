"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

const MINIMUM_LENGTE = 8;

/**
 * Vangt de herstel-link uit de e-mail op (verstuurd via
 * resetPasswordForEmail op /beheer/login). supabase-js verwerkt de link
 * (code/token in de URL) automatisch bij het laden van deze pagina en zet
 * daarna een tijdelijke, alléén-client-side sessie -- vandaar dat deze
 * pagina in middleware.ts is uitgezonderd van de normale /beheer-sessiecheck
 * (die leest alleen server-cookies, en deze sessie staat alleen in de
 * browser). Na het opslaan van het nieuwe wachtwoord dus terug naar
 * /beheer/login voor een normale, server-herkende inlogsessie.
 *
 * Met een gekoppelde authenticator-app is de herstel-sessie uit de e-mail
 * zelf niet genoeg: die staat op aal1 (bewezen met alleen het mailadres),
 * terwijl het wachtwoord wijzigen aal2 vereist zodra er een geverifieerde
 * MFA-factor bestaat. Zonder deze stap zou updateUser() dan mislukken met
 * een aal2-foutmelding, precies zoals bij Loopbaankompas -- dus eerst de
 * code uit de authenticator-app vragen als dat nodig is, dan pas het
 * wachtwoordformulier tonen.
 */
export default function WachtwoordInstellenPagina() {
  const [klaarMetLaden, setKlaarMetLaden] = useState(false);
  const [heeftHerstelSessie, setHeeftHerstelSessie] = useState(false);

  const [mfaVereist, setMfaVereist] = useState(false);
  const [mfaVoltooid, setMfaVoltooid] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFout, setMfaFout] = useState<string | null>(null);
  const [mfaBezig, setMfaBezig] = useState(false);

  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gelukt, setGelukt] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessieData } = await supabase.auth.getSession();
      if (!sessieData.session) {
        setKlaarMetLaden(true);
        return;
      }
      setHeeftHerstelSessie(true);

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factorData } = await supabase.auth.mfa.listFactors();
        const factor = factorData?.totp.find((f) => f.status === "verified");
        if (factor) {
          setMfaVereist(true);
          setMfaFactorId(factor.id);
        }
      }
      setKlaarMetLaden(true);
    })();
  }, []);

  async function controleerMfaCode(event: FormEvent) {
    event.preventDefault();
    setMfaFout(null);
    if (!mfaFactorId) return;

    setMfaBezig(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });
    setMfaBezig(false);

    if (error) {
      setMfaFout("Code klopt niet (of is verlopen). Probeer het opnieuw.");
      return;
    }
    setMfaVoltooid(true);
  }

  async function opslaan(event: FormEvent) {
    event.preventDefault();
    setFout(null);

    if (wachtwoord.length < MINIMUM_LENGTE) {
      setFout(`Kies een wachtwoord van minstens ${MINIMUM_LENGTE} tekens.`);
      return;
    }
    if (wachtwoord !== bevestiging) {
      setFout("De twee wachtwoorden komen niet overeen.");
      return;
    }

    setBezig(true);
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });
    setBezig(false);

    if (error) {
      setFout("Opslaan is niet gelukt. Vraag een nieuwe link aan en probeer het opnieuw.");
      return;
    }

    setGelukt(true);
  }

  if (!klaarMetLaden) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">Laden...</div>
    );
  }

  if (!heeftHerstelSessie) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Link verlopen of ongeldig</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Vraag op de inlogpagina een nieuwe reset-link aan.
        </p>
        <a href="/beheer/login" className="mt-4 text-sm text-brand-violet underline">
          Naar inloggen
        </a>
      </div>
    );
  }

  if (mfaVereist && !mfaVoltooid) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <h1 className="text-xl font-semibold text-zinc-900">Extra beveiliging</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Vul eerst de code uit je authenticator-app in, dan kun je daarna een nieuw wachtwoord
          instellen.
        </p>

        <form onSubmit={controleerMfaCode} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="mfa-code">
              Code
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
            />
          </div>

          {mfaFout && <p className="text-sm text-red-600">{mfaFout}</p>}

          <button
            type="submit"
            disabled={mfaBezig}
            className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {mfaBezig ? "Bezig..." : "Bevestigen"}
          </button>
        </form>
      </div>
    );
  }

  if (gelukt) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Wachtwoord gewijzigd</h1>
        <p className="mt-3 text-sm text-zinc-600">Je kunt nu inloggen met je nieuwe wachtwoord.</p>
        <a href="/beheer/login" className="mt-4 text-sm text-brand-violet underline">
          Naar inloggen
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold text-zinc-900">Nieuw wachtwoord instellen</h1>

      <form onSubmit={opslaan} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="wachtwoord">
            Nieuw wachtwoord
          </label>
          <input
            id="wachtwoord"
            type="password"
            required
            minLength={MINIMUM_LENGTE}
            autoComplete="new-password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="bevestiging">
            Herhaal wachtwoord
          </label>
          <input
            id="bevestiging"
            type="password"
            required
            minLength={MINIMUM_LENGTE}
            autoComplete="new-password"
            value={bevestiging}
            onChange={(e) => setBevestiging(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>

        {fout && <p className="text-sm text-red-600">{fout}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezig ? "Bezig..." : "Wachtwoord opslaan"}
        </button>
      </form>
    </div>
  );
}
