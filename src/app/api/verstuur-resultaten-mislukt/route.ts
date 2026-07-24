import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Extreem lichte logroute: wordt alleen aangeroepen als het doorsturen naar
 * n8n (/api/verstuur-resultaten) ook na de automatische herhaling nog
 * mislukt (zie verstuurResultatenMetRetry in ScanFlow.tsx). Doet verder
 * niets dan een regel in Cloudflare Workers Logs zetten, zodat dit zichtbaar
 * wordt zonder dat de respondent er iets van merkt.
 *
 * Bewust geen zware imports (geen jsPDF/PDF-generatie): deze route bestaat
 * juist om zichtbaar te blijven op het moment dat een andere route tegen een
 * cold-start-CPU-limiet aanloopt, en mag dus zelf niet hetzelfde risico lopen.
 */

export const runtime = "nodejs";

const RequestSchema = z.object({
  respondentCode: z.string().trim().min(1).max(100),
});

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

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "onbekend";
  if (!magVerder(ip)) {
    return NextResponse.json({ error: "Te veel verzoeken." }, { status: 429 });
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    const body = await request.json();
    input = RequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  console.error(
    "Doorsturen naar n8n definitief mislukt (na automatische herhaling), respondentCode:",
    input.respondentCode
  );

  return NextResponse.json({ ok: true });
}
