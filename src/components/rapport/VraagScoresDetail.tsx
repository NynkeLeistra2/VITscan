"use client";

import { useState } from "react";
import { formatRuweScore, scoreKleur } from "@/lib/scoring-config";
import type { ThemaVraagScores } from "@/lib/vraag-scores";

interface VraagScoresDetailProps {
  themaVragen: ThemaVraagScores[];
}

export function VraagScoresDetail({ themaVragen }: VraagScoresDetailProps) {
  const [open, setOpen] = useState(false);
  const deelIds = [...new Set(themaVragen.map((t) => t.deelId))];

  return (
    <div className="mt-10 rounded-lg border border-brand-salie/40">
      <button
        type="button"
        onClick={() => setOpen((huidige) => !huidige)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-zinc-900">Bekijk je score per vraag</span>
        <span className="text-zinc-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-brand-salie/30 px-4 py-4">
          {deelIds.map((deelId) => (
            <div key={deelId} className="mt-4 first:mt-0">
              <p className="text-sm font-semibold text-zinc-500">
                {themaVragen.find((t) => t.deelId === deelId)?.deelTitel}
              </p>

              {themaVragen
                .filter((t) => t.deelId === deelId)
                .map((thema) => {
                  let laatsteSubcategorie: string | null | undefined;
                  return (
                    <div key={thema.themaId} className="mt-3">
                      <p className="font-medium text-zinc-900">
                        {thema.themaEmoji} {thema.themaTitel}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {thema.vragen.map((vraag) => {
                          const toonSubcategorie =
                            vraag.subcategorieTitel && vraag.subcategorieTitel !== laatsteSubcategorie;
                          laatsteSubcategorie = vraag.subcategorieTitel;
                          return (
                            <li key={vraag.key}>
                              {toonSubcategorie && (
                                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                                  {vraag.subcategorieTitel}
                                </p>
                              )}
                              <div className="flex items-start justify-between gap-3 py-1 text-sm">
                                <span className="text-zinc-700">{vraag.tekst}</span>
                                <span
                                  className="shrink-0 font-semibold"
                                  style={{ color: vraag.score != null ? scoreKleur(vraag.score) : undefined }}
                                >
                                  {vraag.score != null ? formatRuweScore(vraag.score) : "–"}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
