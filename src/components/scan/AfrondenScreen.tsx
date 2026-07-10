interface AfrondenScreenProps {
  respondentCode: string;
}

export function AfrondenScreen({ respondentCode }: AfrondenScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Bedankt!</h1>
      <p className="mt-3 text-zinc-600">
        Je antwoorden zijn opgeslagen. Je persoonlijke rapport volgt hier
        binnenkort.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
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
