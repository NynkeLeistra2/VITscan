import type { ThemaMetStellingen } from "@/lib/stellingen";
import { LikertVraag } from "./LikertVraag";

interface ThemaScreenProps {
  thema: ThemaMetStellingen;
  antwoorden: Record<string, number>;
  onAntwoordWijzig: (stellingKey: string, waarde: number) => void;
  onVorige: () => void;
  onVolgende: () => void;
  toontVorige: boolean;
  volgendeLabel: string;
  bezig: boolean;
}

export function ThemaScreen({
  thema,
  antwoorden,
  onAntwoordWijzig,
  onVorige,
  onVolgende,
  toontVorige,
  volgendeLabel,
  bezig,
}: ThemaScreenProps) {
  const alleBeantwoord = thema.stellingen.every(
    (stelling) => antwoorden[stelling.key] !== undefined
  );

  const stellingenMetKop = thema.stellingen.map((stelling, i) => ({
    stelling,
    toonSubcategorie:
      stelling.subcategorieTitel !== null &&
      stelling.subcategorieTitel !==
        (thema.stellingen[i - 1]?.subcategorieTitel ?? null),
  }));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h2 className="text-xl font-semibold text-zinc-900">
        {thema.themaEmoji} {thema.themaTitel}
      </h2>
      {thema.toelichting && (
        <p className="mt-1 text-sm text-zinc-500">{thema.toelichting}</p>
      )}

      <div className="mt-2 divide-y divide-zinc-100">
        {stellingenMetKop.map(({ stelling, toonSubcategorie }) => (
          <div key={stelling.key}>
            {toonSubcategorie && stelling.subcategorieTitel && (
              <p className="pt-4 text-sm font-medium text-zinc-500">
                {stelling.subcategorieTitel}
              </p>
            )}
            <LikertVraag
              tekst={stelling.tekst}
              waarde={antwoorden[stelling.key]}
              onWijzig={(waarde) => onAntwoordWijzig(stelling.key, waarde)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        {toontVorige && (
          <button
            type="button"
            onClick={onVorige}
            disabled={bezig}
            className="h-12 flex-1 rounded-lg border border-zinc-300 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vorige
          </button>
        )}
        <button
          type="button"
          onClick={onVolgende}
          disabled={!alleBeantwoord || bezig}
          className="h-12 flex-1 rounded-lg bg-teal-600 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {volgendeLabel}
        </button>
      </div>
    </div>
  );
}
