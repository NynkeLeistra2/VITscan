import { vitScanData } from "@/lib/stellingen";

const LABELS = vitScanData.meta.schaal.labels;
const WAARDEN = vitScanData.meta.schaal.waarden;

interface LikertVraagProps {
  tekst: string;
  waarde: number | undefined;
  onWijzig: (waarde: number) => void;
}

export function LikertVraag({ tekst, waarde, onWijzig }: LikertVraagProps) {
  return (
    <fieldset className="py-4">
      <legend className="text-base font-medium text-zinc-900">{tekst}</legend>
      <div className="mt-3 flex justify-between gap-2">
        {WAARDEN.map((optie, i) => {
          const geselecteerd = waarde === optie;
          return (
            <button
              key={optie}
              type="button"
              aria-pressed={geselecteerd}
              aria-label={LABELS[i]}
              onClick={() => onWijzig(optie)}
              className={`flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                geselecteerd
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-teal-400"
              }`}
            >
              {optie}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-500">
        <span>{LABELS[0]}</span>
        <span>{LABELS[LABELS.length - 1]}</span>
      </div>
    </fieldset>
  );
}
