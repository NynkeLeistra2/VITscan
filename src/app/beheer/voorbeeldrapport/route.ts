import { NextResponse } from "next/server";
import { genereerRapportPdf } from "@/lib/pdf/rapport-pdf";
import { bouwVoorbeeldAntwoorden } from "@/lib/pdf/voorbeeld-scores";

/**
 * Voorbeeldrapport met vaste, verzonnen scores, voor Nynke om te delen met
 * potentiële klanten. Valt onder src/middleware.ts (matcher "/beheer/:path*"),
 * dus alleen bereikbaar met een ingelogde, MFA-geverifieerde sessie
 * (SECURITY.md regel 2, dezelfde bewezen route als de rest van /beheer).
 * Geen Supabase, geen mailroute, geen echte deelnemersgegevens.
 */

export const runtime = "nodejs";

export async function GET() {
  const pdfBuffer = genereerRapportPdf({
    antwoorden: bouwVoorbeeldAntwoorden(),
    naam: null,
    organisatieNaam: null,
    voorbeeld: true,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="vit-scan-voorbeeldrapport.pdf"',
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
