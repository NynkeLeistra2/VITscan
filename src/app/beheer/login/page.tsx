"use client";

import { useActionState, useState, type FormEvent } from "react";
import { login } from "./actions";
import { supabase } from "@/lib/supabase/client";

export default function BeheerLoginPagina() {
  const [state, formAction, bezig] = useActionState(login, { fout: null });
  const [modus, setModus] = useState<"inloggen" | "wachtwoord-vergeten">("inloggen");
  const [herstelEmail, setHerstelEmail] = useState("");
  const [herstelBezig, setHerstelBezig] = useState(false);
  const [herstelBericht, setHerstelBericht] = useState<string | null>(null);

  // Rate limiting op deze route loopt via Supabase's eigen Auth-API (dit
  // gaat rechtstreeks naar hun servers, niet via een eigen route) --
  // SECURITY.md regel 4 is dus al gedekt, niet iets om hier zelf te bouwen.
  async function verstuurHerstelLink(event: FormEvent) {
    event.preventDefault();
    setHerstelBezig(true);
    await supabase.auth.resetPasswordForEmail(herstelEmail.trim(), {
      redirectTo: `${window.location.origin}/beheer/wachtwoord-instellen`,
    });
    // Zelfde melding of het adres nu wel of niet bestaat -- nooit
    // verklappen welke e-mailadressen een account hebben (SECURITY.md
    // regel 7). Supabase's eigen resetPasswordForEmail doet dit ook al zo.
    setHerstelBericht(
      "Als dit adres een account heeft, is er net een e-mail verstuurd met een link om een nieuw wachtwoord te kiezen."
    );
    setHerstelBezig(false);
  }

  if (modus === "wachtwoord-vergeten") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <h1 className="text-xl font-semibold text-zinc-900">Wachtwoord vergeten</h1>
        <p className="mt-1 text-sm text-zinc-500">Alleen voor Nynke.</p>

        <form onSubmit={verstuurHerstelLink} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="herstel-email">
              E-mailadres
            </label>
            <input
              id="herstel-email"
              type="email"
              required
              autoComplete="username"
              value={herstelEmail}
              onChange={(e) => setHerstelEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
            />
          </div>

          {herstelBericht && <p className="text-sm text-zinc-700">{herstelBericht}</p>}

          <button
            type="submit"
            disabled={herstelBezig}
            className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {herstelBezig ? "Bezig..." : "Verstuur reset-link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setModus("inloggen");
              setHerstelBericht(null);
            }}
            className="w-full text-center text-sm text-zinc-600 underline"
          >
            Terug naar inloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold text-zinc-900">Inloggen: beheer</h1>
      <p className="mt-1 text-sm text-zinc-500">Alleen voor Nynke.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="email">
            E-mailadres
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="wachtwoord">
            Wachtwoord
          </label>
          <input
            id="wachtwoord"
            name="wachtwoord"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>

        {state.fout && <p className="text-sm text-red-600">{state.fout}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezig ? "Bezig..." : "Inloggen"}
        </button>
        <button
          type="button"
          onClick={() => setModus("wachtwoord-vergeten")}
          className="w-full text-center text-sm text-zinc-600 underline"
        >
          Wachtwoord vergeten?
        </button>
      </form>
    </div>
  );
}
