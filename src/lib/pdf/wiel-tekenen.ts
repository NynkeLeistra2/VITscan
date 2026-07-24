import type { jsPDF } from "jspdf";
import { scoreKleur } from "@/lib/scoring-config";
import {
  WIEL_SIZE,
  WIEL_CENTER,
  WIEL_INNER_RADIUS,
  WIEL_NUM_NIVEAUS,
  WIEL_NIVEAU_STAP,
  WIEL_LABEL_RADIUS,
  wielPunt,
  wielSegmentHoek,
  wielLabelRegels,
} from "@/lib/wiel-geometrie";

/** Marge rond de 0..WIEL_SIZE-tekenruimte zodat labels bij de horizontale
 * uitersten (bv. "COMPETENTIE") niet worden afgesneden. */
const VIEWBOX_MARGE = 50;
/** 1 mm in PDF-punten (pt) — jsPDF's `setFontSize` werkt altijd in pt, ook
 * als het document zelf in mm is opgezet. */
const PT_PER_MM = 72 / 25.4;

/** #e4e4e7 op wit gemengd op 50% (was CSS `opacity: 0.5`) — jsPDF's
 * context2d ondersteunt `globalAlpha` niet betrouwbaar (genegeerd, geen
 * transparency graphics state in de output), dus vooraf geplatte kleuren
 * i.p.v. opacity. */
const NIVEAU_CIRKEL_KLEUR = "#f1f1f3";

export interface WielSegment {
  themaId: string;
  label: string;
  score: number;
}

function naarCanvasRad(compassGraden: number): number {
  return ((compassGraden - 90) * Math.PI) / 180;
}

/** Mengt een `#rrggbb`-kleur met wit op de gevraagde dekking, ter vervanging
 * van CSS/SVG `opacity` (zie NIVEAU_CIRKEL_KLEUR hierboven). */
function mengMetWit(hex: string, alpha: number): string {
  const kanaal = (start: number) => parseInt(hex.slice(start, start + 2), 16);
  const meng = (waarde: number) => Math.round(waarde * alpha + 255 * (1 - alpha));
  const naarHex = (waarde: number) => waarde.toString(16).padStart(2, "0");
  return `#${naarHex(meng(kanaal(1)))}${naarHex(meng(kanaal(3)))}${naarHex(meng(kanaal(5)))}`;
}

function hexNaarRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/**
 * Tekent het werkgeluk-/levenswiel rechtstreeks als PDF-vectorvormen op de
 * gegeven pagina, via jsPDF's `context2d` (canvas-achtige API, onderdeel van
 * jsPDF zelf — geen externe/native library nodig). Vervangt de vorige
 * aanpak (SVG opbouwen en met `@resvg/resvg-js` naar een PNG rasterizen):
 * die native binary kan niet op Cloudflare Workers draaien, dit wél.
 *
 * Schaalt de "SVG-pixel"-geometrie uit `wiel-geometrie.ts` (dezelfde
 * geometrie als de React-component op het scherm) lineair naar het
 * mm-vierkant (x, y, breedteMm) op de pagina.
 */
export function tekenWiel(
  pdf: jsPDF,
  segmenten: WielSegment[],
  gemiddelde: number,
  x: number,
  y: number,
  breedteMm: number
): void {
  const viewBoxStart = -VIEWBOX_MARGE;
  const viewBoxSize = WIEL_SIZE + VIEWBOX_MARGE * 2;
  const schaal = breedteMm / viewBoxSize;

  const naarMmX = (pxX: number) => x + (pxX - viewBoxStart) * schaal;
  const naarMmY = (pxY: number) => y + (pxY - viewBoxStart) * schaal;
  const naarMmR = (pxR: number) => pxR * schaal;
  const naarPt = (pxFontSize: number) => pxFontSize * schaal * PT_PER_MM;

  const ctx2d = pdf.context2d;
  const cx = naarMmX(WIEL_CENTER);
  const cy = naarMmY(WIEL_CENTER);
  const aantal = segmenten.length;

  // Niveaucirkels (10 concentrische referentieringen)
  ctx2d.lineWidth = 0.3;
  ctx2d.strokeStyle = NIVEAU_CIRKEL_KLEUR;
  for (let i = 0; i < WIEL_NUM_NIVEAUS; i++) {
    const r = WIEL_INNER_RADIUS + (i + 1) * WIEL_NIVEAU_STAP;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, naarMmR(r), 0, Math.PI * 2, false);
    ctx2d.stroke();
  }

  // Segmenten (donut-taartpunten), zelfde randgeometrie als de vorige
  // SVG-path: buitenboog (start -> eind) + rechte lijn + binnenboog
  // (eind -> start, tegengesteld) + automatisch sluitende rechte lijn.
  segmenten.forEach((segment) => {
    const index = segmenten.indexOf(segment);
    const { start, eind } = wielSegmentHoek(aantal, index);
    const buitenRadius = WIEL_INNER_RADIUS + segment.score * WIEL_NIVEAU_STAP;

    ctx2d.beginPath();
    ctx2d.arc(cx, cy, naarMmR(buitenRadius), naarCanvasRad(start), naarCanvasRad(eind), false);
    ctx2d.arc(cx, cy, naarMmR(WIEL_INNER_RADIUS), naarCanvasRad(eind), naarCanvasRad(start), true);
    ctx2d.closePath();
    ctx2d.fillStyle = mengMetWit(scoreKleur(segment.score), 0.85);
    ctx2d.fill();
    ctx2d.lineWidth = 0.5;
    ctx2d.strokeStyle = "#ffffff";
    ctx2d.stroke();
  });

  // Middencirkel (wit, met dunne rand) bovenop het midden van de segmenten
  ctx2d.beginPath();
  ctx2d.arc(cx, cy, naarMmR(WIEL_INNER_RADIUS - 10), 0, Math.PI * 2, false);
  ctx2d.fillStyle = "#ffffff";
  ctx2d.fill();
  ctx2d.lineWidth = 0.3;
  ctx2d.strokeStyle = "#e4e4e7";
  ctx2d.stroke();

  // --- Tekst: via pdf.text() (niet via context2d) zodat dezelfde
  // standaardfont (helvetica) als de rest van het document gebruikt wordt. ---
  segmenten.forEach((segment) => {
    const index = segmenten.indexOf(segment);
    const { start, eind } = wielSegmentHoek(aantal, index);
    const labelHoek = (start + eind) / 2;
    const labelPunt = wielPunt(WIEL_LABEL_RADIUS, labelHoek);
    const regels = wielLabelRegels(segment.label.toUpperCase());

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(naarPt(13));
    pdf.setTextColor(39, 39, 42);
    regels.forEach((regel, regelIndex) => {
      const pxY = labelPunt.y + (regelIndex - (regels.length - 1) / 2) * 14;
      pdf.text(regel, naarMmX(labelPunt.x), naarMmY(pxY), { align: "center", baseline: "middle" });
    });
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(naarPt(38));
  pdf.setTextColor(...hexNaarRgb(scoreKleur(gemiddelde)));
  pdf.text(gemiddelde.toFixed(1), naarMmX(WIEL_CENTER), naarMmY(WIEL_CENTER - 6), { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(naarPt(14));
  pdf.setTextColor(113, 113, 122);
  pdf.text("Gemiddelde", naarMmX(WIEL_CENTER), naarMmY(WIEL_CENTER + 22), { align: "center" });
}
