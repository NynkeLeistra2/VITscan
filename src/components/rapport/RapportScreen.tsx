import { berekenScores } from "@/lib/scoring";
import { algemeen, totaalscoreTeksten } from "@/lib/rapportteksten";
import { NIVEAU_KLEUR } from "@/lib/scoring-config";
import { ScoreBalk } from "./ScoreBalk";
import { ThemaDetail } from "./ThemaDetail";

interface RapportScreenProps {
  antwoorden: Record<string, number>;
  respondentCode: string;
}

export function RapportScreen({ antwoorden, respondentCode }: RapportScreenProps) {
  const resultaat = berekenScores(antwoorden);
  const totaalTeksten = totaalscoreTeksten(resultaat.totaalScore);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Jouw VIT-scan resultaat
        </h1>
        <p className="mt-2 text-zinc-600">{algemeen.overzichtIntro}</p>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-500">Jouw totale VIT-score</p>
        <p
          className="mt-1 text-5xl font-bold"
          style={{ color: NIVEAU_KLEUR[resultaat.totaalNiveau] }}
        >
          {resultaat.totaalScore.toFixed(1)}
        </p>
        <p className="mt-1 text-lg font-medium text-zinc-800">{totaalTeksten.titel}</p>
        <p className="mt-3 text-left text-zinc-700">{totaalTeksten.tekst}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {resultaat.deelScores.map((deel) => (
          <div key={deel.deelId} className="rounded-lg border border-zinc-200 p-4">
            <ScoreBalk label={deel.deelTitel} score={deel.score} niveau={deel.niveau} />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold text-zinc-900">Om over na te denken</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {totaalTeksten.reflectievragen.map((vraag) => (
              <li key={vraag}>{vraag}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">Wat kun je doen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {totaalTeksten.aanbevelingen.map((aanbeveling) => (
              <li key={aanbeveling}>{aanbeveling}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-900">Per thema</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Klik een thema open voor duiding, reflectievragen en aanbevelingen.
        </p>

        {resultaat.deelScores.map((deel) => (
          <div key={deel.deelId} className="mt-5">
            <p className="text-sm font-medium text-zinc-500">{deel.deelTitel}</p>
            <div className="mt-2 space-y-3">
              {resultaat.themaScores
                .filter((thema) => thema.deelId === deel.deelId)
                .map((thema) => (
                  <ThemaDetail key={thema.themaId} themaScore={thema} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="font-semibold text-zinc-900">{algemeen.afsluiting.titel}</h2>
        <p className="mt-2 text-zinc-700">{algemeen.afsluiting.tekst}</p>
      </div>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
        <p className="text-sm text-zinc-600">Jouw persoonlijke code:</p>
        <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
          {respondentCode}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Bewaar deze code voor een eventuele vervolgmeting.
        </p>
      </div>
    </div>
  );
}
