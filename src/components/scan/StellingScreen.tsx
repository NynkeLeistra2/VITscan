import type { StellingRef, ThemaMetStellingen } from "@/lib/stellingen";
import { AntwoordSchaal } from "./AntwoordSchaal";

interface StellingScreenProps {
  thema: ThemaMetStellingen;
  stelling: StellingRef;
  toonSubcategorie: boolean;
  waarde: number | undefined;
  onAntwoordWijzig: (waarde: number) => void;
  onVorige: () => void;
  toontVorige: boolean;
  bezig: boolean;
}

export function StellingScreen({
  thema,
  stelling,
  toonSubcategorie,
  waarde,
  onAntwoordWijzig,
  onVorige,
  toontVorige,
  bezig,
}: StellingScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-zinc-900">
          {thema.themaEmoji} {thema.themaTitel}
        </h2>
        {toonSubcategorie && stelling.subcategorieTitel && (
          <p className="mt-1 text-base font-medium text-zinc-500">
            {stelling.subcategorieTitel}
          </p>
        )}
      </div>

      <p className="mt-10 text-center text-2xl font-medium leading-relaxed text-zinc-900">
        {stelling.tekst}
      </p>

      <div className="mt-10">
        <AntwoordSchaal waarde={waarde} onWijzig={onAntwoordWijzig} disabled={bezig} />
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        {toontVorige ? (
          <button
            type="button"
            onClick={onVorige}
            disabled={bezig}
            className="h-12 rounded-lg border border-zinc-300 px-6 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vorige
          </button>
        ) : (
          <span />
        )}
        {bezig && (
          <p className="text-sm text-zinc-400">Bezig met opslaan...</p>
        )}
      </div>
    </div>
  );
}
