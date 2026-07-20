import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Stuurt het "Boost je werkgeluk"-evaluatieformulier (public/evaluatie.html)
 * door naar een eigen n8n-webhook, die Nynke een e-mail stuurt naar
 * contact@nynkeleistra.nl met de antwoorden. Altijd server-side
 * (SECURITY.md regel 1), de webhook-URL staat alleen in
 * `N8N_EVALUATIE_WEBHOOK_URL` (env, nooit client-side/`NEXT_PUBLIC_`).
 *
 * Bewust een andere, nieuwe webhook dan N8N_RESULTATEN_WEBHOOK_URL: dit is
 * feedback/review-tekst, geen scanresultaten, en hoeft niet in dezelfde
 * Google Sheet-flow terecht te komen.
 */

export const runtime = "nodejs";

const VeldSchema = z.string().trim().max(4000).optional().transform((v) => (v ? v : null));

const RequestSchema = z.object({
  naam: VeldSchema,
  voldeedAanVerwachtingen: VeldSchema,
  getwijfeld: VeldSchema,
  belangrijksteResultaat: VeldSchema,
  tevredenheid: z.number().int().min(1).max(10).nullable().optional(),
  watMoetVeranderen: VeldSchema,
  eigenOmschrijving: VeldSchema,
  review: VeldSchema,
});

// Zelfde best-effort in-memory rate limiting als /api/verstuur-resultaten
// (geen Redis in Wave 1).
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
    return NextResponse.json({ error: "Te veel verzoeken, probeer het later opnieuw." }, { status: 429 });
  }

  const webhookUrl = process.env.N8N_EVALUATIE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("N8N_EVALUATIE_WEBHOOK_URL ontbreekt");
    return NextResponse.json({ error: "Versturen is niet geconfigureerd." }, { status: 500 });
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    const body = await request.json();
    input = RequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  try {
    const payload = {
      ...input,
      timestamp: new Date().toISOString(),
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("n8n-evaluatie-webhook gaf een foutstatus:", webhookResponse.status);
      return NextResponse.json({ error: "Versturen is niet gelukt." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Fout bij versturen evaluatie naar n8n:", error);
    return NextResponse.json({ error: "Versturen is niet gelukt." }, { status: 500 });
  }
}
