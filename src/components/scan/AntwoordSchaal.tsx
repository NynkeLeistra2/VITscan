import { vitScanData } from "@/lib/stellingen";

const LABELS = vitScanData.meta.schaal.labels;
const WAARDEN = vitScanData.meta.schaal.waarden;

interface AntwoordSchaalProps {
  waarde: number | undefined;
  onWijzig: (waarde: number) => void;
  disabled?: boolean;
}

export function AntwoordSchaal({ waarde, onWijzig, disabled }: AntwoordSchaalProps) {
  return (
    <div>
      <div className="flex justify-between text-base text-zinc-500">
        <span>{LABELS[0]}</span>
        <span>{LABELS[LABELS.length - 1]}</span>
      </div>
      <div className="mt-3 flex gap-2">
        {WAARDEN.map((optie, i) => {
          const geselecteerd = waarde === optie;
          const eindLabel =
            i === 0 ? LABELS[0] : i === WAARDEN.length - 1 ? LABELS[LABELS.length - 1] : null;
          return (
            <button
              key={optie}
              type="button"
              aria-pressed={geselecteerd}
              aria-label={eindLabel ?? `Waarde ${optie} van ${WAARDEN.length}`}
              onClick={() => onWijzig(optie)}
              disabled={disabled}
              className={`flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:text-base ${
                geselecteerd
                  ? "border-brand-violet bg-brand-violet text-white shadow"
                  : "border-brand-salie/40 bg-white text-zinc-700 hover:border-brand-violet"
              }`}
            >
              {optie}
            </button>
          );
        })}
      </div>
    </div>
  );
}
