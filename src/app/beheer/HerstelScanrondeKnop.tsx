"use client";

import { useState, useTransition } from "react";
import { herstelScanronde } from "./actions";

export function HerstelScanrondeKnop({ scanrondeId }: { scanrondeId: string }) {
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={bezig}
        onClick={() =>
          startTransition(async () => {
            const resultaat = await herstelScanronde(scanrondeId);
            if (resultaat.fout) setFout(resultaat.fout);
          })
        }
        className="text-xs font-medium text-brand-violet underline hover:text-brand-violet-dark disabled:opacity-50"
      >
        {bezig ? "Bezig..." : "Herstellen"}
      </button>
      {fout && <p className="mt-1 text-xs text-red-600">{fout}</p>}
    </div>
  );
}
