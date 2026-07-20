"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function BeheerLoginPagina() {
  const [state, formAction, bezig] = useActionState(login, { fout: null });

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
      </form>
    </div>
  );
}
