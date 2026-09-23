import { jsPDF } from "jspdf";
import { berekenScores } from "@/lib/scoring";
import { berekenVraagScores } from "@/lib/vraag-scores";
import {
  algemeen,
  bepaalKrachtbronnen,
  persoonlijkeSamenvatting,
  signalenVoorScores,
  totaalscoreTeksten,
  themaTeksten,
  type KrachtbronnenBlok,
} from "@/lib/rapportteksten";
import { formatRuweScore, formatScore, scoreKleur } from "@/lib/scoring-config";
import { tekenWiel } from "./wiel-tekenen";
import { LOGO_OFFICIEEL_BASE64, LOGO_ICOON_BASE64 } from "./logos";

/**
 * Server-only PDF-opbouw van het persoonlijk rapport. Zelfde diepte als het
 * scherm (RapportScreen): totaalscore + duiding, per thema score + duiding/
 * reflectievragen/aanbevelingen, afsluiting, geen losse stellingscores.
 * Geen respondent-code (meer) -- de scan is volledig anoniem, er is geen
 * label meer dat een rapport aan een persoon koppelt.
 *
 * Huisstijl (2026-07-20): zacht violet als hoofdkleur, amber en salie als
 * accenten, zelfde palet als de rest van de app (zie globals.css).
 */

const VIOLET: [number, number, number] = [107, 74, 122]; // brand-violet #6b4a7a
const VIOLET_DARK: [number, number, number] = [85, 57, 79]; // brand-violet-dark #55394f
const AMBER: [number, number, number] = [227, 178, 104]; // brand-amber #e3b268
const SALIE: [number, number, number] = [169, 183, 151]; // brand-salie #a9b797
const TEXT_DARK: [number, number, number] = [39, 39, 42]; // zinc-800
const TEXT_MUTED: [number, number, number] = [113, 113, 122]; // zinc-500
const WHITE: [number, number, number] = [255, 255, 255];

const WIEL_TITEL: Record<string, string> = {
  werkenergie: "Werkenergiewiel",
  persoonlijk_welzijn: "Levenswiel",
};

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

  pdf.setFillColor(...VIOLET);
  pdf.rect(0, 0, pageWidth, 8, "F");
  pdf.setFillColor(...AMBER);
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

  // Snapshot de tekstopmaak vóór het (kleine, grijze) paginanummer en zet
  // 'm daarna terug -- anders erft de eerstvolgende tekst na een
  // pagina-overgang per ongeluk dit kleine grijze lettertype (het bug die
  // opsommingen na een pagina-overgang klein en grijs liet ogen).
  const huidigeFontSize = pdf.getFontSize();
  const huidigFont = pdf.getFont();
  const huidigeKleur = pdf.getTextColor();

  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`${ctx.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });

  pdf.setFontSize(huidigeFontSize);
  pdf.setFont(huidigFont.fontName, huidigFont.fontStyle);
  pdf.setTextColor(huidigeKleur);
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

function drawAmberDivider(ctx: PdfCtx, y: number) {
  ctx.pdf.setDrawColor(...AMBER);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.line(ctx.margin, y, ctx.pageWidth - ctx.margin, y);
}

function drawSectionTitel(ctx: PdfCtx, titel: string) {
  checkPageBreak(ctx, 14);
  const { pdf, margin, contentWidth } = ctx;
  pdf.setFillColor(...VIOLET_DARK);
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

  // Klein salie accentblokje i.p.v. een volle merkkleurbalk, subtiele knipoog
  // naar Nynkes bestaande huisstijl (op haar verzoek terughoudend gebruikt).
  pdf.setFillColor(...SALIE);
  pdf.rect(margin, ctx.y - 4, 1.4, 6.5, "F");

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT_DARK);
  // Geen emoji in de PDF: jsPDF's standaardfont (WinAnsi) kan Unicode-emoji
  // niet renderen, dat levert rommelige tekens op i.p.v. het symbool.
  pdf.text(titel, margin + 5, ctx.y);

  pdf.setTextColor(scoreKleur(score));
  pdf.text(formatScore(score), ctx.pageWidth - margin, ctx.y, { align: "right" });

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
  if (items.length === 0) return;
  const { pdf, margin, contentWidth } = ctx;
  // Reserveer ruimte voor de kop én de eerste regel samen, zodat een kopje
  // nooit alleen onderaan een pagina blijft staan zonder tekst eronder.
  const eersteRegels = pdf.splitTextToSize(items[0], contentWidth - 6);
  const eersteItemHoogte = eersteRegels.length * 4.4 + 1;
  checkPageBreak(ctx, 8 + eersteItemHoogte);
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

/** Hoogte die drawParagraaf() zou innemen, zonder iets te tekenen. */
function hoogteParagraaf(ctx: PdfCtx, tekst: string): number {
  ctx.pdf.setFontSize(9.5);
  ctx.pdf.setFont("helvetica", "normal");
  const regels = ctx.pdf.splitTextToSize(tekst, ctx.contentWidth);
  return regels.length * 4.6 + 3;
}

/** Hoogte die drawLijst() zou innemen, zonder iets te tekenen. */
function hoogteLijst(ctx: PdfCtx, items: string[]): number {
  if (items.length === 0) return 0;
  ctx.pdf.setFontSize(9.5);
  ctx.pdf.setFont("helvetica", "normal");
  let hoogte = 5;
  for (const item of items) {
    const regels = ctx.pdf.splitTextToSize(item, ctx.contentWidth - 6);
    hoogte += regels.length * 4.4 + 1.5;
  }
  return hoogte + 2;
}

function drawSubcategorieKop(ctx: PdfCtx, titel: string) {
  const { pdf, margin } = ctx;
  checkPageBreak(ctx, 6);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(titel.toUpperCase(), margin, ctx.y);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...TEXT_DARK);
  ctx.y += 5;
}

function drawVraagRegel(ctx: PdfCtx, tekst: string, score: number | null) {
  const { pdf, margin, contentWidth, pageWidth } = ctx;
  const scoreBreedte = 10;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const regels = pdf.splitTextToSize(tekst, contentWidth - scoreBreedte);
  checkPageBreak(ctx, regels.length * 4.2 + 1.5);
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(regels, margin, ctx.y);
  pdf.setFont("helvetica", "bold");
  if (score != null) {
    pdf.setTextColor(scoreKleur(score));
  } else {
    pdf.setTextColor(...TEXT_MUTED);
  }
  pdf.text(score != null ? formatRuweScore(score) : "-", pageWidth - margin, ctx.y, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...TEXT_DARK);
  ctx.y += regels.length * 4.2 + 1.5;
}

/** Totale hoogte van het krachtbronnenblok (kop + thema-regel + tekst +
 * vraag), zodat het geheel vooraf op één pagina gereserveerd kan worden --
 * zie de aanroep in genereerRapportPdf(). */
function krachtbronnenBlokHoogte(ctx: PdfCtx, blok: KrachtbronnenBlok): number {
  return (
    12 + // drawSectionTitel
    hoogteParagraaf(ctx, blok.themaRegel) +
    hoogteParagraaf(ctx, blok.tekst) +
    hoogteLijst(ctx, [blok.vraag])
  );
}

export interface RapportPdfInput {
  antwoorden: Record<string, number>;
  naam: string | null;
  organisatieNaam?: string | null;
}

export function genereerRapportPdf({
  antwoorden,
  naam,
  organisatieNaam,
}: RapportPdfInput): Buffer {
  const resultaat = berekenScores(antwoorden);
  const totaalTeksten = totaalscoreTeksten(resultaat.totaalScore);
  const themaVragen = berekenVraagScores(antwoorden);
  const krachtbronnenBlok = bepaalKrachtbronnen(resultaat.themaScores);

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
    logoOfficieel: LOGO_OFFICIEEL_BASE64,
    logoIcoon: LOGO_ICOON_BASE64,
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
  pdf.setTextColor(...VIOLET_DARK);
  pdf.text(naam ? `Jouw VIT-scan resultaat, ${naam}` : "Jouw VIT-scan resultaat", pageWidth / 2, ctx.y, {
    align: "center",
  });
  ctx.y += 7;

  if (organisatieNaam) {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(organisatieNaam, pageWidth / 2, ctx.y, { align: "center" });
    ctx.y += 6;
  }

  drawAmberDivider(ctx, ctx.y);
  ctx.y += 8;

  drawParagraaf(ctx, algemeen.overzichtIntro);

  // Totaalscore-box
  const boxHoogte = 33;
  checkPageBreak(ctx, boxHoogte + 4);
  pdf.setFillColor(...VIOLET);
  pdf.roundedRect(margin, ctx.y, ctx.contentWidth, boxHoogte, 3, 3, "F");
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...WHITE);
  pdf.text(formatScore(resultaat.totaalScore), pageWidth / 2, ctx.y + 13, { align: "center" });
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(totaalTeksten.titel, pageWidth / 2, ctx.y + 21, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(220, 210, 226);
  pdf.text("Totaalscore van werkenergie en persoonlijk welzijn", pageWidth / 2, ctx.y + 27, {
    align: "center",
  });
  pdf.setTextColor(...TEXT_DARK);
  ctx.y += boxHoogte + 8;

  drawParagraaf(ctx, persoonlijkeSamenvatting(totaalTeksten.tekst, resultaat.themaScores));

  // Wielen: samen op één pagina, verticaal gecentreerd (pure jsPDF-
  // vectortekening, geen rasterlimiet).
  const wielBreedteMm = 95;
  const wielTitelBlokHoogte = 14; // titelregel + gap tot het wiel
  const wielGap = 10; // ruimte tussen de twee wielen
  addNewPage(ctx);
  const totaalWielBlokHoogte = 2 * (wielTitelBlokHoogte + wielBreedteMm) + wielGap;
  const beschikbareWielHoogte = pageHeight - BOTTOM_MARGIN - START_Y;
  ctx.y = START_Y + Math.max(0, (beschikbareWielHoogte - totaalWielBlokHoogte) / 2);

  for (const deel of resultaat.deelScores) {
    const segmenten = resultaat.themaScores
      .filter((t) => t.deelId === deel.deelId)
      .map((t) => ({ themaId: t.themaId, label: t.themaTitel, score: t.score }));

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...VIOLET_DARK);
    pdf.text(WIEL_TITEL[deel.deelId] ?? deel.deelTitel, pageWidth / 2, ctx.y, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_DARK);
    ctx.y += wielTitelBlokHoogte;

    tekenWiel(pdf, segmenten, deel.score, (pageWidth - wielBreedteMm) / 2, ctx.y, wielBreedteMm);
    ctx.y += wielBreedteMm + wielGap;
  }

  // Jouw krachtbronnen: direct na het levenswiel, alleen als er thema's met
  // een score van 7,5 of hoger zijn. Blijft altijd samen op één pagina
  // (kop, thema-regel, tekst én de vraag) -- reserveer eerst de totale
  // hoogte, spring pas naar een nieuwe pagina als het geheel niet past.
  if (krachtbronnenBlok) {
    checkPageBreak(ctx, krachtbronnenBlokHoogte(ctx, krachtbronnenBlok));
    drawSectionTitel(ctx, algemeen.krachtbronnen.titel);
    drawParagraaf(ctx, krachtbronnenBlok.themaRegel, { vetgedrukt: true });
    drawParagraaf(ctx, krachtbronnenBlok.tekst);
    drawLijst(ctx, "Om over na te denken", [krachtbronnenBlok.vraag]);
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
      // Reserveer de thema-titel én de eerste regel van de duiding samen,
      // zodat de titel nooit alleen onderaan een pagina blijft staan.
      pdf.setFontSize(9.5);
      pdf.setFont("helvetica", "normal");
      const eersteDuidingRegels = pdf.splitTextToSize(teksten.duiding, ctx.contentWidth);
      checkPageBreak(ctx, 10 + eersteDuidingRegels.length * 4.6 + 1);
      drawThemaHeader(ctx, thema.themaTitel, thema.score);
      drawParagraaf(ctx, teksten.duiding);
      if (teksten.reflectievragen.length > 0) {
        drawLijst(ctx, "Om over na te denken", teksten.reflectievragen);
      }
      const vraagScores =
        themaVragen.find((t) => t.themaId === thema.themaId)?.vragen.map((v) => v.score) ?? [];
      const signalen = signalenVoorScores(thema.themaId, thema.niveau, thema.score, vraagScores);
      if (signalen.length > 0) {
        drawLijst(ctx, "Wat opvalt", signalen);
      }
      ctx.y += 2;
    }
  }

  // Het algemene blok Om over na te denken / Wat kun je doen, gebaseerd op
  // de totaalscore (zelfde inhoud als voorheen bovenaan, alleen de plek
  // is verplaatst naar na "Per thema").
  drawLijst(ctx, "Om over na te denken", totaalTeksten.reflectievragen);
  drawLijst(ctx, "Wat kun je doen", totaalTeksten.aanbevelingen);

  // Afsluiting
  checkPageBreak(ctx, 30);
  drawSectionTitel(ctx, algemeen.afsluiting.titel);
  drawParagraaf(ctx, algemeen.afsluiting.tekst);

  ctx.y += 4;

  // Bijlage: score per vraag, zelfde groepering (hoofdthema > thema >
  // eventuele subcategorie) als het uitklapbare venster op het scherm.
  addNewPage(ctx);
  drawSectionTitel(ctx, "Bijlage: score per vraag");

  const deelIds = [...new Set(themaVragen.map((t) => t.deelId))];
  for (const deelId of deelIds) {
    const themasVanDeel = themaVragen.filter((t) => t.deelId === deelId);
    checkPageBreak(ctx, 12);
    pdf.setFontSize(10.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(themasVanDeel[0].deelTitel, margin, ctx.y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...TEXT_DARK);
    ctx.y += 7;

    for (const thema of themasVanDeel) {
      checkPageBreak(ctx, 10);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(thema.themaTitel, margin, ctx.y);
      pdf.setFont("helvetica", "normal");
      ctx.y += 6;

      let laatsteSubcategorie: string | null = null;
      for (const vraag of thema.vragen) {
        if (vraag.subcategorieTitel && vraag.subcategorieTitel !== laatsteSubcategorie) {
          drawSubcategorieKop(ctx, vraag.subcategorieTitel);
        }
        laatsteSubcategorie = vraag.subcategorieTitel;
        drawVraagRegel(ctx, vraag.tekst, vraag.score);
      }
      ctx.y += 3;
    }
  }

  ctx.y += 2;

  // Footer met contactgegevens (alleen op de laatste pagina)
  checkPageBreak(ctx, 24);
  drawAmberDivider(ctx, ctx.y);
  ctx.y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text("Nynke Leistra, Coaching en Advies", pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  pdf.text("contact@nynkeleistra.nl · www.nynkeleistra.nl", pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  pdf.text(`© ${new Date().getFullYear()} Nynke Leistra Coaching en Advies`, pageWidth / 2, ctx.y, {
    align: "center",
  });
  pdf.setTextColor(...TEXT_DARK);

  return Buffer.from(pdf.output("arraybuffer"));
}
