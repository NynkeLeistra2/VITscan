import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alleStellingen } from "@/lib/stellingen";
import { genereerRapportPdf } from "@/lib/pdf/rapport-pdf";
import { supabase } from "@/lib/supabase/client";

/**
 * Stuurt het rapport van een afgeronde scan door naar Nynkes bestaande
 * n8n-workflow, die het mailt naar de deelnemer. Altijd server-side
 * (SECURITY.md regel 1). De webhook-URL staat alleen in
 * `N8N_RESULTATEN_WEBHOOK_URL` (env, nooit client-side/`NEXT_PUBLIC_`).
 *
 * De scan is volledig anoniem (zie 0008_scan_volledig_anoniem.sql): het
 * e-mailadres komt hier rechtstreeks uit de browser aan en gaat direct door
 * naar n8n, zonder ooit in Supabase te belanden. Naar n8n gaat alleen nog
 * wat nodig is om te mailen -- e-mailadres + PDF, geen losse antwoorden,
 * scores of naam. (Dat laatste raakt ook wat er in Nynkes Google Sheet
 * terechtkomt: die kreeg deze velden tot nu toe uit dit zelfde bericht.)
 *
 * `mag_rapport_versturen` (Postgres) is de poortwachter: zonder een geldig,
 * echt afgerond token stuurt deze route niets, en een token kan maar een
 * beperkt aantal keer gebruikt worden. Zonder die controle zou dit een open
 * kanaal zijn om namens contact@nynkeleistra.nl mail naar een willekeurig
 * adres te sturen.
 */

export const runtime = "nodejs";

const GELDIGE_STELLING_KEYS = new Set(alleStellingen().map((s) => s.key));

const RequestSchema = z.object({
  token: z.string().uuid(),
  antwoorden: z
    .record(z.string(), z.number().int().min(1).max(10))
    .refine((antwoorden) => Object.keys(antwoorden).length <= GELDIGE_STELLING_KEYS.size, {
      message: "Te veel antwoorden.",
    })
    .refine((antwoorden) => Object.keys(antwoorden).every((key) => GELDIGE_STELLING_KEYS.has(key)), {
      message: "Onbekende stelling-sleutel.",
    }),
  naam: z.string().trim().max(200).nullable().optional().transform((v) => (v ? v : null)),
  email: z.string().trim().email().max(320),
  // Puur om de PDF op te maken (kop met organisatienaam), wordt niet
  // doorgestuurd naar n8n en niet opgeslagen.
  organisatie: z.string().trim().max(200).nullable().optional().transform((v) => (v ? v : null)),
});

// Zelfde best-effort in-memory rate limiting als /api/rapport-pdf (zie daar
// voor de beperkingen, geen Redis in Wave 1) -- een extra laag naast
// mag_rapport_versturen, die per token telt in plaats van per ip.
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

  const webhookUrl = process.env.N8N_RESULTATEN_WEBHOOK_URL;
  if (!webhookUrl) {
    // Fail closed, maar zonder de respondent-flow te breken: dit is een
    // configuratiefout aan Nynkes kant, geen fout van de gebruiker.
    console.error("N8N_RESULTATEN_WEBHOOK_URL ontbreekt");
    return NextResponse.json({ error: "Doorsturen is niet geconfigureerd." }, { status: 500 });
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    const body = await request.json();
    input = RequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // Poortwachter: alleen doorgaan met een geldig, echt afgerond token dat
  // zijn verstuurlimiet (5 pogingen) nog niet heeft bereikt. Generieke
  // foutmelding, verklapt niet of het aan het token of de limiet lag
  // (SECURITY.md regel 7).
  const { data: magVersturen, error: poortError } = await supabase.rpc("mag_rapport_versturen", {
    p_token: input.token,
  });
  if (poortError || !magVersturen) {
    return NextResponse.json({ error: "Doorsturen is niet gelukt." }, { status: 403 });
  }

  try {
    const pdfBuffer = genereerRapportPdf({
      antwoorden: input.antwoorden,
      naam: input.naam,
      organisatieNaam: input.organisatie,
    });

    // Alleen wat nodig is om te mailen. Geen losse antwoorden, scores of
    // naam meer -- zie de bestandsdocumentatie hierboven.
    const payload = {
      email: input.email,
      pdfs: {
        results: pdfBuffer.toString("base64"),
      },
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("n8n-webhook gaf een foutstatus:", webhookResponse.status);
      return NextResponse.json({ error: "Doorsturen is niet gelukt." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Fout bij doorsturen naar n8n:", error);
    return NextResponse.json({ error: "Doorsturen is niet gelukt." }, { status: 500 });
  }
}
