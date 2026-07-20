/**
 * Geometrie voor het Werkgelukwiel/Levenswiel, los van React zodat zowel de
 * schermcomponent (`WerkgelukWiel.tsx`) als de server-side PDF-generator
 * (die een losstaande SVG-string nodig heeft, geen JSX) dezelfde berekening
 * gebruiken — voorkomt dat de twee weergaven uit elkaar gaan lopen.
 */
export const WIEL_SIZE = 440;
export const WIEL_CENTER = WIEL_SIZE / 2;
export const WIEL_OUTER_RADIUS = WIEL_CENTER - 60;
export const WIEL_INNER_RADIUS = 60;
export const WIEL_NUM_NIVEAUS = 10;
export const WIEL_NIVEAU_STAP = (WIEL_OUTER_RADIUS - WIEL_INNER_RADIUS) / WIEL_NUM_NIVEAUS;
export const WIEL_LABEL_RADIUS = WIEL_OUTER_RADIUS + 30;
export const WIEL_GAP_DEG = 1.5;

export function wielPunt(r: number, hoekGraden: number): { x: number; y: number } {
  const rad = (Math.PI / 180) * hoekGraden;
  return { x: WIEL_CENTER + r * Math.sin(rad), y: WIEL_CENTER - r * Math.cos(rad) };
}

export function wielSegmentPad(startHoek: number, eindHoek: number, buitenRadius: number): string {
  const p1 = wielPunt(WIEL_INNER_RADIUS, startHoek);
  const p2 = wielPunt(buitenRadius, startHoek);
  const p3 = wielPunt(buitenRadius, eindHoek);
  const p4 = wielPunt(WIEL_INNER_RADIUS, eindHoek);
  const grootBoog = eindHoek - startHoek > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${buitenRadius} ${buitenRadius} 0 ${grootBoog} 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${WIEL_INNER_RADIUS} ${WIEL_INNER_RADIUS} 0 ${grootBoog} 0 ${p1.x} ${p1.y} Z`;
}

/** Hoekbereik (met tussenruimte) van segment `index` van in totaal `aantal` segmenten. */
export function wielSegmentHoek(aantal: number, index: number): { start: number; eind: number } {
  const hoekPerSegment = 360 / aantal;
  return {
    start: index * hoekPerSegment + WIEL_GAP_DEG / 2,
    eind: (index + 1) * hoekPerSegment - WIEL_GAP_DEG / 2,
  };
}

/** Knipt een label in korte regels zodat lange thema-namen niet over hun
 * buren heen lopen. */
export function wielLabelRegels(label: string): string[] {
  const woorden = label.split(" ");
  const regels: string[] = [];
  let huidigeRegel = "";
  for (const woord of woorden) {
    if (huidigeRegel.length + woord.length + 1 <= 11) {
      huidigeRegel += (huidigeRegel ? " " : "") + woord;
    } else {
      if (huidigeRegel) regels.push(huidigeRegel);
      huidigeRegel = woord;
    }
  }
  if (huidigeRegel) regels.push(huidigeRegel);
  return regels;
}
