import { NIVEAU_KLEUR, type ScoreNiveau } from "@/lib/scoring-config";

export interface WerkgelukWielSegment {
  themaId: string;
  label: string;
  score: number;
  niveau: ScoreNiveau;
}

interface WerkgelukWielProps {
  titel: string;
  segmenten: WerkgelukWielSegment[];
  gemiddelde: number;
  gemiddeldeNiveau: ScoreNiveau;
}

const SIZE = 440;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 150;
const INNER_RADIUS = 96;
const LABEL_RADIUS = 168;
const GAP_DEG = 2.5;

function punt(r: number, hoekGraden: number) {
  const rad = (Math.PI / 180) * hoekGraden;
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) };
}

function segmentPad(startHoek: number, eindHoek: number) {
  const p1 = punt(OUTER_RADIUS, startHoek);
  const p2 = punt(OUTER_RADIUS, eindHoek);
  const p3 = punt(INNER_RADIUS, eindHoek);
  const p4 = punt(INNER_RADIUS, startHoek);
  const grootBoog = eindHoek - startHoek > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${grootBoog} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${grootBoog} 0 ${p4.x} ${p4.y} Z`;
}

/** Kiest tekst-uitlijning en verticale nudge op basis van de hoek, zodat
 * labels rondom de cirkel netjes van het middelpunt af wijzen i.p.v. erover
 * heen te lopen. */
function labelUitlijning(hoek: number): { anchor: "start" | "middle" | "end"; dy: number } {
  const genormaliseerd = ((hoek % 360) + 360) % 360;
  if (genormaliseerd > 15 && genormaliseerd < 165) return { anchor: "start", dy: 4 };
  if (genormaliseerd > 195 && genormaliseerd < 345) return { anchor: "end", dy: 4 };
  if (genormaliseerd <= 15 || genormaliseerd >= 345) return { anchor: "middle", dy: -4 };
  return { anchor: "middle", dy: 12 };
}

export function WerkgelukWiel({
  titel,
  segmenten,
  gemiddelde,
  gemiddeldeNiveau,
}: WerkgelukWielProps) {
  const aantal = segmenten.length;
  const anglePer = 360 / aantal;

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold text-zinc-900">{titel}</h3>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mt-2 w-full max-w-[380px] overflow-visible"
      >
        {segmenten.map((segment, i) => {
          const start = i * anglePer + GAP_DEG / 2;
          const eind = (i + 1) * anglePer - GAP_DEG / 2;
          const labelHoek = (start + eind) / 2;
          const labelPunt = punt(LABEL_RADIUS, labelHoek);
          const { anchor, dy } = labelUitlijning(labelHoek);
          return (
            <g key={segment.themaId}>
              <path d={segmentPad(start, eind)} fill={NIVEAU_KLEUR[segment.niveau]} />
              <text
                x={labelPunt.x}
                y={labelPunt.y + dy}
                textAnchor={anchor}
                fontSize={9.5}
                fontWeight={600}
                fill="#3f3f46"
              >
                {segment.label.toUpperCase()}
              </text>
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_RADIUS - 4}
          fill="white"
          stroke="#e4e4e7"
          strokeWidth={1}
        />
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          fontSize={34}
          fontWeight={700}
          fill={NIVEAU_KLEUR[gemiddeldeNiveau]}
        >
          {gemiddelde.toFixed(1)}
        </text>
        <text x={CENTER} y={CENTER + 20} textAnchor="middle" fontSize={13} fill="#71717a">
          Gemiddelde
        </text>
      </svg>
    </div>
  );
}
