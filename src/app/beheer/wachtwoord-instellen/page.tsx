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
 */
export default function WachtwoordInstellenPagina() {
  const [klaarMetLaden, setKlaarMetLaden] = useState(false);
  const [heeftHerstelSessie, setHeeftHerstelSessie] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gelukt, setGelukt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHeeftHerstelSessie(data.session !== null);
      setKlaarMetLaden(true);
    });
  }, []);

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
