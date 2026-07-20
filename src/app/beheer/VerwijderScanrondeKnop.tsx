"use client";

import { useState, useTransition } from "react";
import { verwijderScanronde } from "./actions";

interface VerwijderScanrondeKnopProps {
  scanrondeId: string;
  scanrondeNaam: string;
}

export function VerwijderScanrondeKnop({ scanrondeId, scanrondeNaam }: VerwijderScanrondeKnopProps) {
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
    <div className="mt-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
      <p>
        Weet je zeker dat je &quot;{scanrondeNaam}&quot; wilt verwijderen? Dit verwijdert ook alle
        al ingevulde antwoorden voor deze scanronde en kan niet ongedaan gemaakt worden.
      </p>
      {fout && <p className="mt-1 font-medium">{fout}</p>}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          disabled={bezig}
          onClick={() =>
            startTransition(async () => {
              const resultaat = await verwijderScanronde(scanrondeId);
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
