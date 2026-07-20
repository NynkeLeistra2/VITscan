import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
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

const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");
const FONT_FAMILY = "Roboto";
/** Marge rond de 0..WIEL_SIZE-viewBox zodat labels bij de horizontale
 * uitersten (bv. "COMPETENTIE") niet worden afgesneden — resvg kent geen
 * `overflow: visible` zoals de browser, dus de viewBox moet zelf groot
 * genoeg zijn. */
const VIEWBOX_MARGE = 50;

export interface WielRasterSegment {
  themaId: string;
  label: string;
  score: number;
}

/** Server-only: bouwt dezelfde wielgeometrie als `WerkgelukWiel.tsx` op als
 * losstaande SVG-string (i.p.v. JSX), voor gebruik in de PDF. */
function renderWielSvg(segmenten: WielRasterSegment[], gemiddelde: number): string {
  const aantal = segmenten.length;

  const niveauCirkels = Array.from({ length: WIEL_NUM_NIVEAUS }, (_, i) => {
    const r = WIEL_INNER_RADIUS + (i + 1) * WIEL_NIVEAU_STAP;
    return `<circle cx="${WIEL_CENTER}" cy="${WIEL_CENTER}" r="${r}" fill="none" stroke="#e4e4e7" stroke-width="1" opacity="0.5" />`;
  }).join("");

  const segmentPaden = segmenten
    .map((segment, i) => {
      const { start, eind } = wielSegmentHoek(aantal, i);
      const buitenRadius = WIEL_INNER_RADIUS + segment.score * WIEL_NIVEAU_STAP;
      return `<path d="${wielSegmentPad(start, eind, buitenRadius)}" fill="${scoreKleur(segment.score)}" opacity="0.85" stroke="white" stroke-width="2" />`;
    })
    .join("");

  const labels = segmenten
    .map((segment, i) => {
      const { start, eind } = wielSegmentHoek(aantal, i);
      const labelHoek = (start + eind) / 2;
      const labelPunt = wielPunt(WIEL_LABEL_RADIUS, labelHoek);
      const regels = wielLabelRegels(segment.label.toUpperCase());
      return regels
        .map((regel, regelIndex) => {
          const y = labelPunt.y + (regelIndex - (regels.length - 1) / 2) * 14;
          return `<text x="${labelPunt.x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="#27272a" font-family="${FONT_FAMILY}">${escapeXml(regel)}</text>`;
        })
        .join("");
    })
    .join("");

  const viewBoxStart = -VIEWBOX_MARGE;
  const viewBoxSize = WIEL_SIZE + VIEWBOX_MARGE * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxStart} ${viewBoxStart} ${viewBoxSize} ${viewBoxSize}">
    <rect x="${viewBoxStart}" y="${viewBoxStart}" width="${viewBoxSize}" height="${viewBoxSize}" fill="white" />
    ${niveauCirkels}
    ${segmentPaden}
    ${labels}
    <circle cx="${WIEL_CENTER}" cy="${WIEL_CENTER}" r="${WIEL_INNER_RADIUS - 10}" fill="white" stroke="#e4e4e7" stroke-width="1" />
    <text x="${WIEL_CENTER}" y="${WIEL_CENTER - 6}" text-anchor="middle" font-size="38" font-weight="700" fill="${scoreKleur(gemiddelde)}" font-family="${FONT_FAMILY}">${gemiddelde.toFixed(1)}</text>
    <text x="${WIEL_CENTER}" y="${WIEL_CENTER + 22}" text-anchor="middle" font-size="14" fill="#71717a" font-family="${FONT_FAMILY}">Gemiddelde</text>
  </svg>`;
}

function escapeXml(waarde: string): string {
  return waarde.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rasterizet het wiel naar een PNG-buffer op de gevraagde pixelbreedte
 * (hoogte volgt automatisch, het wiel is vierkant), voor gebruik met
 * jsPDF's `addImage`. Lettertype wordt expliciet gebundeld (i.p.v. op
 * systeemfonts te vertrouwen) zodat dit ook op een serverless omgeving
 * zonder desktop-fonts (Vercel) goed rendert. */
export function rasterizeWiel(
  segmenten: WielRasterSegment[],
  gemiddelde: number,
  pixelBreedte: number
): Buffer {
  const svg = renderWielSvg(segmenten, gemiddelde);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: pixelBreedte },
    background: "white",
    font: {
      fontFiles: [
        path.join(FONT_DIR, "Roboto-Regular.ttf"),
        path.join(FONT_DIR, "Roboto-Bold.ttf"),
      ],
      loadSystemFonts: false,
      defaultFontFamily: FONT_FAMILY,
    },
  });
  return resvg.render().asPng();
}
