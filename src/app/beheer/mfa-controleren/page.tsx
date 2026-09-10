"use client";

import { useActionState } from "react";
import { controleerMfaCode } from "./actions";

export default function MfaControlerenPagina() {
  const [state, formAction, bezig] = useActionState(controleerMfaCode, { fout: null });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold text-zinc-900">Extra beveiliging</h1>
      <p className="mt-1 text-sm text-zinc-500">Vul de code uit je authenticator-app in.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>

        {state.fout && <p className="text-sm text-red-600">{state.fout}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezig ? "Bezig..." : "Bevestigen"}
        </button>
      </form>
    </div>
  );
}
