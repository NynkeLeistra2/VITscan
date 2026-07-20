"use client";

import { useState } from "react";
import { scoreKleur } from "@/lib/scoring-config";
import type { ThemaScoreResultaat } from "@/lib/scoring";
import { themaTeksten } from "@/lib/rapportteksten";

interface ThemaDetailProps {
  themaScore: ThemaScoreResultaat;
}

export function ThemaDetail({ themaScore }: ThemaDetailProps) {
  const [open, setOpen] = useState(false);
  const teksten = themaTeksten(themaScore.themaId).niveaus[themaScore.niveau];
  const kleur = scoreKleur(themaScore.score);
  const percentage = Math.max(0, Math.min(100, (themaScore.score / 10) * 100));

  return (
    <div className="rounded-lg border border-zinc-200">
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
              {themaScore.score.toFixed(1)}
            </span>
            <span className="text-zinc-400">{open ? "−" : "+"}</span>
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${percentage}%`, backgroundColor: kleur }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 py-4 text-sm text-zinc-700">
          <p>{teksten.duiding}</p>

          <p className="mt-4 font-medium text-zinc-900">Om over na te denken</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {teksten.reflectievragen.map((vraag) => (
              <li key={vraag}>{vraag}</li>
            ))}
          </ul>

          <p className="mt-4 font-medium text-zinc-900">Wat kun je doen</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {teksten.aanbevelingen.map((aanbeveling) => (
              <li key={aanbeveling}>{aanbeveling}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
