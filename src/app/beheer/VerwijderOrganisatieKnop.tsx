"use client";

import { useState, useTransition } from "react";
import { verwijderOrganisatie } from "./actions";

interface VerwijderOrganisatieKnopProps {
  organisatieId: string;
  organisatieNaam: string;
}

export function VerwijderOrganisatieKnop({ organisatieId, organisatieNaam }: VerwijderOrganisatieKnopProps) {
  const [bevestigen, setBevestigen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();

  if (!bevestigen) {
    return (
      <button
        type="button"
        onClick={() => setBevestigen(true)}
        className="text-xs text-red-600 underline hover:text-red-700"
      >
        Verwijderen
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
      <p>Weet je zeker dat je &quot;{organisatieNaam}&quot; wilt verwijderen?</p>
      {fout && <p className="mt-1 font-medium">{fout}</p>}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          disabled={bezig}
          onClick={() =>
            startTransition(async () => {
              const resultaat = await verwijderOrganisatie(organisatieId);
              if (resultaat.fout) {
                setFout(resultaat.fout);
              } else {
                setBevestigen(false);
              }
            })
          }
          className="font-medium text-red-700 underline disabled:opacity-50"
        >
          {bezig ? "Bezig..." : "Ja, verwijderen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBevestigen(false);
            setFout(null);
          }}
          className="text-zinc-600 underline"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
