"use client";

import { useState, useTransition } from "react";
import { zetBoostIngeschakeld } from "./actions";

interface BoostToggleProps {
  scanrondeId: string;
  ingeschakeld: boolean;
}

export function BoostToggle({ scanrondeId, ingeschakeld }: BoostToggleProps) {
  const [waarde, setWaarde] = useState(ingeschakeld);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();

  function wijzig(nieuweWaarde: boolean) {
    setFout(null);
    const vorigeWaarde = waarde;
    setWaarde(nieuweWaarde);
    startTransition(async () => {
      const resultaat = await zetBoostIngeschakeld(scanrondeId, nieuweWaarde);
      if (resultaat.fout) {
        setWaarde(vorigeWaarde);
        setFout(resultaat.fout);
      }
    });
  }

  return (
    <div className="mt-1">
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={waarde}
          disabled={bezig}
          onChange={(e) => wijzig(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-brand-salie/40 text-brand-violet"
        />
        Boost je werkgeluk aanbieden na het rapport
      </label>
      {fout && <p className="mt-1 text-xs text-red-600">{fout}</p>}
    </div>
  );
}
