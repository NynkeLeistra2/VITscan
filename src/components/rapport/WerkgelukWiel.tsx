import { scoreKleur } from "@/lib/scoring-config";
import {
  WIEL_SIZE,
  WIEL_CENTER,
  WIEL_INNER_RADIUS,
  WIEL_NUM_NIVEAUS,
  WIEL_NIVEAU_STAP,
  WIEL_LABEL_RADIUS,
  wielPunt,
  wielSegmentPad,
  wielSegmentHoek,
  wielLabelRegels,
} from "@/lib/wiel-geometrie";

export interface WerkgelukWielSegment {
  themaId: string;
  label: string;
  score: number;
}

interface WerkgelukWielProps {
  titel: string;
  segmenten: WerkgelukWielSegment[];
  gemiddelde: number;
}

export function WerkgelukWiel({ titel, segmenten, gemiddelde }: WerkgelukWielProps) {
  const aantal = segmenten.length;

  return (
    <div className="flex w-full flex-col items-center">
      <h3 className="text-lg font-semibold text-brand-violet">{titel}</h3>
      <svg
        viewBox={`0 0 ${WIEL_SIZE} ${WIEL_SIZE}`}
        className="mt-2 w-full max-w-[540px] overflow-visible drop-shadow-md"
      >
        {Array.from({ length: WIEL_NUM_NIVEAUS }, (_, i) => (
          <circle
            key={i}
            cx={WIEL_CENTER}
            cy={WIEL_CENTER}
            r={WIEL_INNER_RADIUS + (i + 1) * WIEL_NIVEAU_STAP}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {segmenten.map((segment, i) => {
          const { start, eind } = wielSegmentHoek(aantal, i);
          const buitenRadius = WIEL_INNER_RADIUS + segment.score * WIEL_NIVEAU_STAP;
          return (
            <path
              key={segment.themaId}
              d={wielSegmentPad(start, eind, buitenRadius)}
              fill={scoreKleur(segment.score)}
              opacity={0.85}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}

        {segmenten.map((segment, i) => {
          const { start, eind } = wielSegmentHoek(aantal, i);
          const labelHoek = (start + eind) / 2;
          const labelPunt = wielPunt(WIEL_LABEL_RADIUS, labelHoek);
          const regels = wielLabelRegels(segment.label.toUpperCase());
          return (
            <g key={segment.themaId}>
              {regels.map((regel, regelIndex) => (
                <text
                  key={regel}
                  x={labelPunt.x}
                  y={labelPunt.y + (regelIndex - (regels.length - 1) / 2) * 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill="#27272a"
                >
                  {regel}
                </text>
              ))}
            </g>
          );
        })}

        <circle
          cx={WIEL_CENTER}
          cy={WIEL_CENTER}
          r={WIEL_INNER_RADIUS - 10}
          fill="white"
          stroke="#e4e4e7"
          strokeWidth={1}
        />
        <text
          x={WIEL_CENTER}
          y={WIEL_CENTER - 6}
          textAnchor="middle"
          fontSize={38}
          fontWeight={700}
          fill={scoreKleur(gemiddelde)}
        >
          {gemiddelde.toFixed(1)}
        </text>
        <text x={WIEL_CENTER} y={WIEL_CENTER + 22} textAnchor="middle" fontSize={14} fill="#71717a">
          Gemiddelde
        </text>
      </svg>
    </div>
  );
}
