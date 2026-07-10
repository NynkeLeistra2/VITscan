interface OpenVraagScreenProps {
  waarde: string;
  onWijzig: (waarde: string) => void;
  onVorige: () => void;
  onVerder: () => void;
  bezig: boolean;
}

export function OpenVraagScreen({
  waarde,
  onWijzig,
  onVorige,
  onVerder,
  bezig,
}: OpenVraagScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
      <h2 className="text-xl font-semibold text-zinc-900">
        Wat wil je nog kwijt?
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Optioneel — laat leeg als je niets wilt toevoegen.
      </p>

      <textarea
        value={waarde}
        onChange={(e) => onWijzig(e.target.value)}
        rows={6}
        className="mt-4 w-full rounded-lg border border-zinc-300 p-3 text-zinc-900 focus:border-teal-500 focus:outline-none"
        placeholder="Typ hier je toelichting..."
      />

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onVorige}
          disabled={bezig}
          className="h-12 flex-1 rounded-lg border border-zinc-300 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Vorige
        </button>
        <button
          type="button"
          onClick={onVerder}
          disabled={bezig}
          className="h-12 flex-1 rounded-lg bg-teal-600 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezig ? "Bezig..." : "Afronden"}
        </button>
      </div>
    </div>
  );
}
