"use client";

import { useActionState, useState } from "react";
import { maakScanrondeAan, type MaakScanrondeState } from "./actions";

interface BeheerFormProps {
  organisaties: { id: string; naam: string }[];
}

const BEGINSTAAT: MaakScanrondeState = { fout: null, link: null };

export function BeheerForm({ organisaties }: BeheerFormProps) {
  const [state, formAction, bezig] = useActionState(maakScanrondeAan, BEGINSTAAT);
  const [organisatieId, setOrganisatieId] = useState(
    organisaties.length > 0 ? organisaties[0].id : "__nieuw__"
  );

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-lg border border-zinc-200 p-4">
      <div>
        <label className="text-sm font-medium text-zinc-700" htmlFor="organisatieId">
          Organisatie
        </label>
        <select
          id="organisatieId"
          name="organisatieId"
          value={organisatieId}
          onChange={(e) => setOrganisatieId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-zinc-900 focus:border-teal-500 focus:outline-none"
        >
          {organisaties.map((org) => (
            <option key={org.id} value={org.id}>
              {org.naam}
            </option>
          ))}
          <option value="__nieuw__">+ Nieuwe organisatie</option>
        </select>
      </div>

      {organisatieId === "__nieuw__" && (
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="nieuweOrganisatieNaam">
            Naam nieuwe organisatie
          </label>
          <input
            id="nieuweOrganisatieNaam"
            name="nieuweOrganisatieNaam"
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-zinc-900 focus:border-teal-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-zinc-700" htmlFor="scanrondeNaam">
          Naam scanronde
        </label>
        <input
          id="scanrondeNaam"
          name="scanrondeNaam"
          type="text"
          required
          placeholder="Bijv. VIT-scan Q1 2026"
          className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-zinc-900 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700" htmlFor="teamNaam">
          Team (optioneel)
        </label>
        <input
          id="teamNaam"
          name="teamNaam"
          type="text"
          placeholder="Laat leeg voor geen team-indeling"
          className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-zinc-900 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="emailVerplicht" className="h-4 w-4 rounded border-zinc-300 text-teal-600" />
        E-mail verplicht voor deze scanronde
      </label>

      {state.fout && <p className="text-sm text-red-600">{state.fout}</p>}

      {state.link && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
          <p className="text-sm text-teal-900">Klaar. Dit is de link voor deze klant:</p>
          <p className="mt-1 break-all font-mono text-sm text-teal-950">{state.link}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="h-12 w-full rounded-lg bg-teal-600 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {bezig ? "Bezig..." : "Scanronde aanmaken"}
      </button>
    </form>
  );
}
