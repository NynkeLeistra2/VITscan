interface IntroScreenProps {
  organisatieNaam: string;
  teamNaam: string | null;
  respondentCode: string;
  onStart: () => void;
  bezig: boolean;
  foutmelding: string | null;
}

export function IntroScreen({
  organisatieNaam,
  teamNaam,
  respondentCode,
  onStart,
  bezig,
  foutmelding,
}: IntroScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900">VIT-scan</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {organisatieNaam}
        {teamNaam ? ` · ${teamNaam}` : ""}
      </p>

      <div className="mt-6 space-y-4 text-zinc-700">
        <p>
          Deze scan meet hoe het met je energie en welzijn in je werk gaat.
          Het invullen duurt 10 tot 15 minuten.
        </p>
        <p>
          Je antwoorden zijn van jou: het rapport dat je straks direct te
          zien krijgt, is alleen voor jou. Je werkgever ziet nooit
          individuele antwoorden, alleen geanonimiseerde teamcijfers.
        </p>
        <p>Een naam of e-mailadres is niet nodig.</p>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Jouw persoonlijke code:</p>
        <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
          {respondentCode}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Onthoud deze code — hiermee kun je straks een vervolgmeting
          koppelen zonder dat je jezelf hoeft te identificeren.
        </p>
      </div>

      {foutmelding && (
        <p className="mt-4 text-sm text-red-600">{foutmelding}</p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={bezig}
        className="mt-8 h-12 w-full rounded-lg bg-teal-600 font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {bezig ? "Bezig..." : "Start de scan"}
      </button>
    </div>
  );
}
