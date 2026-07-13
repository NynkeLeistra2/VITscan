import { NIVEAU_KLEUR, type ScoreNiveau } from "@/lib/scoring-config";

interface ScoreBalkProps {
  label: string;
  emoji?: string;
  score: number;
  niveau: ScoreNiveau;
}

export function ScoreBalk({ label, emoji, score, niveau }: ScoreBalkProps) {
  const percentage = Math.max(0, Math.min(100, (score / 10) * 100));
  const kleur = NIVEAU_KLEUR[niveau];

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-zinc-800">
          {emoji ? `${emoji} ` : ""}
          {label}
        </span>
        <span className="font-semibold" style={{ color: kleur }}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: kleur }}
        />
      </div>
    </div>
  );
}
