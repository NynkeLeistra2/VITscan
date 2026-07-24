import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alleStellingen } from "@/lib/stellingen";
import { genereerRapportPdf } from "@/lib/pdf/rapport-pdf";

/**
 * Genereert het persoonlijk VIT-scan-rapport als PDF, server-side (zie
 * CLAUDE.md). Neemt de antwoorden aan die de client al in-memory heeft
 * (zelfde bron als het scherm) — er wordt niets uit Supabase gelezen, dat
 * past bij de privacyregel dat respondenten/antwoorden geen select-policy
 * hebben (zie supabase/migrations/0001_init_schema.sql).
 */

export const runtime = "nodejs";

const GELDIGE_STELLING_KEYS = new Set(alleStellingen().map((s) => s.key));

const RequestSchema = z.object({
  antwoorden: z
    .record(z.string(), z.number().int().min(1).max(10))
    .refine((antwoorden) => Object.keys(antwoorden).length <= GELDIGE_STELLING_KEYS.size, {
      message: "Te veel antwoorden.",
    })
    .refine((antwoorden) => Object.keys(antwoorden).every((key) => GELDIGE_STELLING_KEYS.has(key)), {
      message: "Onbekende stelling-sleutel.",
    }),
  naam: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  respondentCode: z.string().trim().min(1).max(100),
  organisatie: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

// Best-effort in-memory rate limiting per IP. Geen persistente store (Wave 1
// heeft nog geen Redis/Upstash), dus dit reset bij een cold start van de
// serverless-functie — beter dan niets, geen garantie op elke request onder
// hoge load/multi-instance (zie SECURITY.md regel 4).
const RATE_LIMIT_VENSTER_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map<string, { count: number; resetOp: number }>();

function magVerder(ip: string): boolean {
  const nu = Date.now();
  const bestaand = rateLimitStore.get(ip);
  if (!bestaand || nu > bestaand.resetOp) {
    rateLimitStore.set(ip, { count: 1, resetOp: nu + RATE_LIMIT_VENSTER_MS });
    return true;
  }
  if (bestaand.count >= RATE_LIMIT_MAX) return false;
  bestaand.count += 1;
  return true;
}

function bestandsnaam(naam: string | null, respondentCode: string): string {
  const basis = naam ?? respondentCode;
  const veilig = basis
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `vit-scan-resultaat-${veilig || "rapport"}.pdf`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "onbekend";
  if (!magVerder(ip)) {
    return NextResponse.json({ error: "Te veel verzoeken, probeer het later opnieuw." }, { status: 429 });
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    const body = await request.json();
    input = RequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  try {
    const pdfBuffer = genereerRapportPdf({
      antwoorden: input.antwoorden,
      naam: input.naam,
      respondentCode: input.respondentCode,
      organisatieNaam: input.organisatie,
    });
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bestandsnaam(input.naam, input.respondentCode)}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Fout bij genereren PDF:", error);
    // Generieke foutmelding — geen stack traces/interne details naar de
    // gebruiker (SECURITY.md regel 7, fail closed).
    return NextResponse.json({ error: "Het genereren van de PDF is niet gelukt." }, { status: 500 });
  }
}
