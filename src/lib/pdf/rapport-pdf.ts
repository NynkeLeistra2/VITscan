import { jsPDF } from "jspdf";
import fs from "node:fs";
import path from "node:path";
import { berekenScores } from "@/lib/scoring";
import { algemeen, totaalscoreTeksten, themaTeksten } from "@/lib/rapportteksten";
import { scoreKleur } from "@/lib/scoring-config";
import { rasterizeWiel } from "./wiel-raster";

/**
 * Server-only PDF-opbouw van het persoonlijk rapport. Zelfde diepte als het
 * scherm (RapportScreen): totaalscore + duiding, per thema score + duiding/
 * reflectievragen/aanbevelingen, afsluiting + persoonlijke code — geen losse
 * stellingscores.
 *
 * Huisstijl: teal (zelfde als de site) als hoofdkleur, met een subtiele knipoog
 * naar Nynkes bestaande merkkleuren (donkergroen/goud) in dunne accentlijnen,
 * op uitdrukkelijk verzoek een stuk terughoudender dan de oude Lovable-PDF.
 */

const TEAL: [number, number, number] = [13, 148, 136]; // teal-600
const TEAL_DARK: [number, number, number] = [15, 118, 110]; // teal-700
const GOLD: [number, number, number] = [236, 189, 0]; // Nynkes goud-accent
const BRAND_GREEN: [number, number, number] = [0, 52, 41]; // Nynkes donkergroen
const TEXT_DARK: [number, number, number] = [39, 39, 42]; // zinc-800
const TEXT_MUTED: [number, number, number] = [113, 113, 122]; // zinc-500
const WHITE: [number, number, number] = [255, 255, 255];

const WIEL_TITEL: Record<string, string> = {
  werkenergie: "Werkgelukwiel",
  persoonlijk_welzijn: "Levenswiel",
};

function leesLogoBase64(bestandsnaam: string): string {
  const buffer = fs.readFileSync(path.join(process.cwd(), "public", bestandsnaam));
  return buffer.toString("base64");
}

interface PdfCtx {
  pdf: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  logoOfficieel: string;
  logoIcoon: string;
  pageNumber: number;
  y: number;
}

const START_Y = 22;
const BOTTOM_MARGIN = 24;

function drawPageChrome(ctx: PdfCtx) {
  const { pdf, pageWidth, pageHeight, logoIcoon } = ctx;

  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, pageWidth, 8, "F");
  pdf.setFillColor(...GOLD);
  pdf.rect(0, 8, pageWidth, 1, "F");

  const iconSize = 8;
  pdf.addImage(
    `data:image/png;base64,${logoIcoon}`,
    "PNG",
    pageWidth - iconSize - 10,
    pageHeight - iconSize - 8,
    iconSize,
    iconSize,
    "logo-icoon",
    "MEDIUM"
  );

  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`${ctx.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
}

function addNewPage(ctx: PdfCtx) {
  ctx.pdf.addPage();
  ctx.pageNumber += 1;
  drawPageChrome(ctx);
  ctx.y = START_Y;
}

function checkPageBreak(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.pageHeight - BOTTOM_MARGIN) {
    addNewPage(ctx);
  }
}

function drawGoldDivider(ctx: PdfCtx, y: number) {
  ctx.pdf.setDrawColor(...GOLD);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.line(ctx.margin, y, ctx.pageWidth - ctx.margin, y);
}

function drawSectionTitel(ctx: PdfCtx, titel: string) {
  checkPageBreak(ctx, 14);
  const { pdf, margin, contentWidth } = ctx;
  pdf.setFillColor(...TEAL_DARK);
  pdf.roundedRect(margin, ctx.y - 5.5, contentWidth, 9, 1.5, 1.5, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...WHITE);
  pdf.text(titel, margin + 4, ctx.y + 0.5);
  pdf.setTextColor(...TEXT_DARK);
  pdf.setFont("helvetica", "normal");
  ctx.y += 12;
}

function drawThemaHeader(ctx: PdfCtx, titel: string, score: number) {
  checkPageBreak(ctx, 10);
  const { pdf, margin } = ctx;

  // Klein groen accentblokje i.p.v. een volle merkkleurbalk, subtiele knipoog
  // naar Nynkes bestaande huisstijl (op haar verzoek terughoudend gebruikt).
  pdf.setFillColor(...BRAND_GREEN);
  pdf.rect(margin, ctx.y - 4, 1.4, 6.5, "F");

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT_DARK);
  // Geen emoji in de PDF: jsPDF's standaardfont (WinAnsi) kan Unicode-emoji
  // niet renderen, dat levert rommelige tekens op i.p.v. het symbool.
  pdf.text(titel, margin + 5, ctx.y);

  pdf.setTextColor(scoreKleur(score));
  pdf.text(score.toFixed(1), ctx.pageWidth - margin, ctx.y, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...TEXT_DARK);
  ctx.y += 7;
}

function drawParagraaf(ctx: PdfCtx, tekst: string, opties?: { vetgedrukt?: boolean; kleur?: [number, number, number] }) {
  const { pdf, margin, contentWidth } = ctx;
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", opties?.vetgedrukt ? "bold" : "normal");
  pdf.setTextColor(...(opties?.kleur ?? TEXT_DARK));
  const regels = pdf.splitTextToSize(tekst, contentWidth);
  checkPageBreak(ctx, regels.length * 4.6 + 2);
  pdf.text(regels, margin, ctx.y);
  ctx.y += regels.length * 4.6 + 3;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...TEXT_DARK);
}

function drawLijst(ctx: PdfCtx, kopTekst: string, items: string[]) {
  const { pdf, margin, contentWidth } = ctx;
  checkPageBreak(ctx, 8);
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(kopTekst, margin, ctx.y);
  ctx.y += 5;
  pdf.setFont("helvetica", "normal");

  const tekstX = margin + 6;
  for (const item of items) {
    const regels = pdf.splitTextToSize(item, contentWidth - 6);
    checkPageBreak(ctx, regels.length * 4.4 + 1);
    pdf.text("•", margin + 2, ctx.y);
    pdf.text(regels, tekstX, ctx.y);
    ctx.y += regels.length * 4.4 + 1.5;
  }
  ctx.y += 2;
}

export interface RapportPdfInput {
  antwoorden: Record<string, number>;
  naam: string | null;
  respondentCode: string;
}

export function genereerRapportPdf({ antwoorden, naam, respondentCode }: RapportPdfInput): Buffer {
  const resultaat = berekenScores(antwoorden);
  const totaalTeksten = totaalscoreTeksten(resultaat.totaalScore);

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;

  const ctx: PdfCtx = {
    pdf,
    pageWidth,
    pageHeight,
    margin,
    contentWidth: pageWidth - margin * 2,
    logoOfficieel: leesLogoBase64("nynke-logo-pdf.png"),
    logoIcoon: leesLogoBase64("nynke-logo-n.png"),
    pageNumber: 1,
    y: START_Y,
  };

  drawPageChrome(ctx);

  // Titelblok
  const logoBreedte = 46;
  const logoHoogte = logoBreedte * (700 / 1226);
  pdf.addImage(
    `data:image/png;base64,${ctx.logoOfficieel}`,
    "PNG",
    (pageWidth - logoBreedte) / 2,
    ctx.y,
    logoBreedte,
    logoHoogte,
    "logo-officieel",
    "MEDIUM"
  );
  ctx.y += logoHoogte + 8;

  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEAL_DARK);
  pdf.text(naam ? `Jouw VIT-scan resultaat, ${naam}` : "Jouw VIT-scan resultaat", pageWidth / 2, ctx.y, {
    align: "center",
  });
  ctx.y += 7;
  drawGoldDivider(ctx, ctx.y);
  ctx.y += 8;

  drawParagraaf(ctx, algemeen.overzichtIntro);

  // Totaalscore-box
  const boxHoogte = 28;
  checkPageBreak(ctx, boxHoogte + 4);
  pdf.setFillColor(...TEAL);
  pdf.roundedRect(margin, ctx.y, ctx.contentWidth, boxHoogte, 3, 3, "F");
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...WHITE);
  pdf.text(resultaat.totaalScore.toFixed(1), pageWidth / 2, ctx.y + 13, { align: "center" });
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(totaalTeksten.titel, pageWidth / 2, ctx.y + 21, { align: "center" });
  pdf.setTextColor(...TEXT_DARK);
  ctx.y += boxHoogte + 8;

  drawParagraaf(ctx, totaalTeksten.tekst);
  drawLijst(ctx, "Om over na te denken", totaalTeksten.reflectievragen);
  drawLijst(ctx, "Wat kun je doen", totaalTeksten.aanbevelingen);

  // Wielen
  for (const deel of resultaat.deelScores) {
    const segmenten = resultaat.themaScores
      .filter((t) => t.deelId === deel.deelId)
      .map((t) => ({ themaId: t.themaId, label: t.themaTitel, score: t.score }));

    const wielBreedteMm = 85;
    const wielPixels = 800;
    const png = rasterizeWiel(segmenten, deel.score, wielPixels);
    const wielHoogteMm = wielBreedteMm; // vierkant

    checkPageBreak(ctx, wielHoogteMm + 12);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...TEAL_DARK);
    pdf.text(WIEL_TITEL[deel.deelId] ?? deel.deelTitel, pageWidth / 2, ctx.y, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_DARK);
    ctx.y += 5;

    pdf.addImage(
      `data:image/png;base64,${png.toString("base64")}`,
      "PNG",
      (pageWidth - wielBreedteMm) / 2,
      ctx.y,
      wielBreedteMm,
      wielHoogteMm,
      `wiel-${deel.deelId}`,
      "MEDIUM"
    );
    ctx.y += wielHoogteMm + 8;
  }

  // Per thema
  addNewPage(ctx);
  drawSectionTitel(ctx, "Per thema");

  for (const deel of resultaat.deelScores) {
    checkPageBreak(ctx, 12);
    pdf.setFontSize(10.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(deel.deelTitel, margin, ctx.y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_DARK);
    ctx.y += 7;

    const themasVanDeel = resultaat.themaScores.filter((t) => t.deelId === deel.deelId);
    for (const thema of themasVanDeel) {
      const teksten = themaTeksten(thema.themaId).niveaus[thema.niveau];
      drawThemaHeader(ctx, thema.themaTitel, thema.score);
      drawParagraaf(ctx, teksten.duiding);
      drawLijst(ctx, "Om over na te denken", teksten.reflectievragen);
      drawLijst(ctx, "Wat kun je doen", teksten.aanbevelingen);
      ctx.y += 2;
    }
  }

  // Afsluiting
  checkPageBreak(ctx, 30);
  drawSectionTitel(ctx, algemeen.afsluiting.titel);
  drawParagraaf(ctx, algemeen.afsluiting.tekst);

  // Persoonlijke code
  checkPageBreak(ctx, 24);
  ctx.y += 4;
  drawGoldDivider(ctx, ctx.y);
  ctx.y += 8;
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text("Jouw persoonlijke code:", pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 6;
  pdf.setFontSize(13);
  pdf.setFont("courier", "bold");
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(respondentCode, pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 6;
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...TEXT_MUTED);
  const codeUitleg = pdf.splitTextToSize(
    "Bewaar deze code. Bij een vervolgmeting kun je 'm gebruiken om je resultaten te laten koppelen, in overleg met Nynke.",
    ctx.contentWidth - 40
  );
  pdf.text(codeUitleg, pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += codeUitleg.length * 4.2 + 6;

  // Footer met contactgegevens (alleen op de laatste pagina)
  checkPageBreak(ctx, 24);
  drawGoldDivider(ctx, ctx.y);
  ctx.y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text("Nynke Leistra – Coaching en Advies", pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  pdf.text("contact@nynkeleistra.nl · www.nynkeleistra.nl", pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  pdf.text(`© ${new Date().getFullYear()} Nynke Leistra Coaching en Advies`, pageWidth / 2, ctx.y, {
    align: "center",
  });
  pdf.setTextColor(...TEXT_DARK);

  return Buffer.from(pdf.output("arraybuffer"));
}
