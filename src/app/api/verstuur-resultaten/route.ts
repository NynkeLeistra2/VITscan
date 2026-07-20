import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alleStellingen } from "@/lib/stellingen";
import { berekenScores } from "@/lib/scoring";
import { genereerRapportPdf } from "@/lib/pdf/rapport-pdf";
import { algemeen, totaalscoreTeksten } from "@/lib/rapportteksten";

// Kleur-emoji per band, in dezelfde volgorde als algemeen.totaalscoreNiveaus
// (laag naar hoog) — overgenomen uit de oude Lovable-workflow (surveyData.ts
// recommendations) zodat de bestaande n8n-workflow dit veld kan blijven lezen.
const NIVEAU_KLEUR_EMOJI = ["🔴", "🟠", "🟡", "🟢", "🟣"];

/**
 * Stuurt de resultaten van een afgeronde scan door naar Nynkes bestaande
 * n8n-workflow (zie project_vit_scan_email_webhook_scope in het geheugen):
 * die mailt het rapport naar de respondent (als die een e-mailadres
 * achterliet) en zet de resultaten in haar Google Sheet. Altijd server-side
 * (SECURITY.md regel 1) — de webhook-URL staat alleen in
 * `N8N_RESULTATEN_WEBHOOK_URL` (env, nooit client-side/`NEXT_PUBLIC_`).
 *
 * Dit is een secundaire integratie: als de webhook faalt, mag dat het eigen
 * rapport van de respondent niet breken. `ScanFlow.afronden()` wacht deze
 * aanroep niet af vóór het tonen van het rapport.
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
  naam: z.string().trim().max(200).nullable().optional().transform((v) => (v ? v : null)),
  email: z.string().trim().email().max(320).nullable().optional().transform((v) => (v ? v : null)),
  respondentCode: z.string().trim().min(1).max(100),
  openVraagAntwoord: z.string().trim().max(5000).nullable().optional().transform((v) => (v ? v : null)),
  // Alleen relevant bij scanrondes zonder vaste organisatiekoppeling (bv. een
  // algemene workshop-link) — de medewerker vult dan zelf in voor welk
  // bedrijf de scan is, puur om in de n8n-webhook/Google Sheet te zetten.
  // Wordt niet in Supabase bewaard.
  organisatie: z.string().trim().max(200).nullable().optional().transform((v) => (v ? v : null)),
});

// Zelfde best-effort in-memory rate limiting als /api/rapport-pdf (zie daar
// voor de beperkingen — geen Redis in Wave 1).
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

  try {
    const resultaat = berekenScores(input.antwoorden);
    const pdfBuffer = genereerRapportPdf({
      antwoorden: input.antwoorden,
      naam: input.naam,
      respondentCode: input.respondentCode,
    });

    // Veldnamen (step/name/categoryAverages/subcategoryAverages/pdfs.results)
    // zijn bewust gelijk aan wat de bestaande n8n-workflow van de oude
    // Lovable-scan al verwachtte, zodat die workflow blijft werken zonder
    // herbouw. `categoryAverages`/`subcategoryAverages` komen hier overeen
    // met deel-/themascores (categorie ↔ deel, subcategorie ↔ thema).
    const categoryAverages = Object.fromEntries(
      resultaat.deelScores.map((deel) => [deel.deelId, deel.score])
    );
    const subcategoryAverages = Object.fromEntries(
      resultaat.themaScores.map((thema) => [thema.themaId, thema.score])
    );

    // `answers` en `recommendation` in het exacte formaat van de oude
    // Lovable-workflow (zie werkgeluk-kompas-main/src/components/ResultsPage.tsx
    // en surveyData.ts) — die velden ontbraken hier, terwijl de bestaande
    // n8n-workflow (e-mail + Google Sheet) er mogelijk stappen op baseert.
    const answers = Object.entries(input.antwoorden).map(([questionId, score]) => ({
      questionId,
      score,
    }));

    const niveauIndex = algemeen.totaalscoreNiveaus.findIndex(
      (n) => resultaat.totaalScore >= n.minScore && resultaat.totaalScore <= n.maxScore
    );
    const niveau = totaalscoreTeksten(resultaat.totaalScore);
    const tips = [
      "Reflectievragen:",
      ...niveau.reflectievragen.map((v) => `• ${v}`),
      "",
      "Tips:",
      ...niveau.aanbevelingen.map((v) => `• ${v}`),
    ];
    const recommendation = {
      range: `${niveau.minScore.toFixed(1)}–${niveau.maxScore.toFixed(1)}`,
      color: NIVEAU_KLEUR_EMOJI[niveauIndex] ?? NIVEAU_KLEUR_EMOJI[NIVEAU_KLEUR_EMOJI.length - 1],
      title: niveau.titel,
      description: niveau.tekst,
      tips,
    };

    // START-call: maakt de rij in Google Sheets aan. Moet vóór de END-call
    // hieronder (die de rij zoekt en vult), en met exact hetzelfde
    // e-mailadres — vandaar dat `name`/`email` hier dezelfde variabelen zijn
    // als in de END-payload verderop (zie n8n-scan-koppeling-spec.md).
    // Dit is de vroegst mogelijke plek waarop naam én e-mail allebei bekend
    // zijn: e-mail wordt pas op het laatste scherm ingevuld, niet bij de
    // intro.
    const startPayload = {
      step: "start",
      name: input.naam,
      email: input.email,
      bedrijf: input.organisatie,
    };

    const startResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(startPayload),
    });

    if (!startResponse.ok) {
      // Niet fataal: de END-call hieronder wordt alsnog geprobeerd. Als de
      // START-call faalde vindt n8n straks geen rij, maar dat is niet erger
      // dan de situatie van vóór deze fix.
      console.error("n8n-webhook (start) gaf een foutstatus:", startResponse.status);
    }

    const payload = {
      step: "end",
      name: input.naam,
      email: input.email,
      bedrijf: input.organisatie,
      totalScore: resultaat.totaalScore,
      categoryAverages,
      subcategoryAverages,
      answers,
      recommendation,
      pdfs: {
        results: pdfBuffer.toString("base64"),
      },
      timestamp: new Date().toISOString(),
      // Aanvullende, nieuwe velden (geen equivalent in de oude workflow):
      respondentCode: input.respondentCode,
      openVraagAntwoord: input.openVraagAntwoord,
      deelScores: resultaat.deelScores,
      themaScores: resultaat.themaScores,
      antwoorden: input.antwoorden,
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
