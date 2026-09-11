import { NextRequest, NextResponse } from "next/server";

/**
 * Extreem lichte logroute: wordt alleen aangeroepen als het doorsturen naar
 * n8n (/api/verstuur-resultaten) ook na de automatische herhaling nog
 * mislukt (zie verstuurResultatenMetRetry in ScanFlow.tsx). Doet verder
 * niets dan een regel in Cloudflare Workers Logs zetten, zodat dit zichtbaar
 * wordt zonder dat de respondent er iets van merkt. Geen lichaam meer nodig
 * sinds de scan anoniem is (0008_scan_volledig_anoniem.sql) -- er is niets
 * meer om mee te loggen dat niet zelf al een persoonsgegeven zou zijn
 * (bv. het e-mailadres of het token).
 *
 * Bewust geen zware imports (geen jsPDF/PDF-generatie): deze route bestaat
 * juist om zichtbaar te blijven op het moment dat een andere route tegen een
 * cold-start-CPU-limiet aanloopt, en mag dus zelf niet hetzelfde risico lopen.
 */

export const runtime = "nodejs";

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

  console.error("Doorsturen naar n8n definitief mislukt (na automatische herhaling).");

  return NextResponse.json({ ok: true });
}
