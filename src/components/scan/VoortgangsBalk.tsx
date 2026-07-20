interface VoortgangsBalkProps {
  huidigeStapNummer: number;
  totaalStappen: number;
}

export function VoortgangsBalk({
  huidigeStapNummer,
  totaalStappen,
}: VoortgangsBalkProps) {
  const percentage = Math.round((huidigeStapNummer / totaalStappen) * 100);

  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-salie/25">
        <div
          className="h-full rounded-full bg-brand-amber transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Stap {huidigeStapNummer} van {totaalStappen}
      </p>
    </div>
  );
}
