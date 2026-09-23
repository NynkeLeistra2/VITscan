"use client";

import { useState } from "react";
import { formatScore, scoreKleur } from "@/lib/scoring-config";
import type { ThemaScoreResultaat } from "@/lib/scoring";
import { signalenVoorScores, themaTeksten } from "@/lib/rapportteksten";

interface ThemaDetailProps {
  themaScore: ThemaScoreResultaat;
  /** Losse stellingscores van dit thema, in dezelfde volgorde als de
   * signalen in het rapportteksten-databestand (zie signalenVoorScores()). */
  vraagScores: (number | null)[];
}

export function ThemaDetail({ themaScore, vraagScores }: ThemaDetailProps) {
  const [open, setOpen] = useState(false);
  const teksten = themaTeksten(themaScore.themaId).niveaus[themaScore.niveau];
  const signalen = signalenVoorScores(themaScore.themaId, themaScore.niveau, themaScore.score, vraagScores);
  const kleur = scoreKleur(themaScore.score);
  const percentage = Math.max(0, Math.min(100, (themaScore.score / 10) * 100));

  return (
    <div className="rounded-lg border border-brand-salie/40">
      <button
        type="button"
        onClick={() => setOpen((huidige) => !huidige)}
        className="w-full px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-zinc-900">
            {themaScore.themaEmoji} {themaScore.themaTitel}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: kleur }}>
              {formatScore(themaScore.score)}
            </span>
            <span className="text-zinc-400">{open ? "−" : "+"}</span>
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-salie/20">
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, backgroundColor: kleur }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-brand-salie/30 px-4 py-4 text-sm text-zinc-700">
          <p>{teksten.duiding}</p>

          {teksten.reflectievragen.length > 0 && (
            <>
              <p className="mt-4 font-medium text-zinc-900">Om over na te denken</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {teksten.reflectievragen.map((vraag) => (
                  <li key={vraag}>{vraag}</li>
                ))}
              </ul>
            </>
          )}

          {signalen.length > 0 && (
            <>
              <p className="mt-4 font-medium text-zinc-900">Wat opvalt</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {signalen.map((signaal) => (
                  <li key={signaal}>{signaal}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
