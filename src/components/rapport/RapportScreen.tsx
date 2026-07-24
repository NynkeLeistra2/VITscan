"use client";

import { useState } from "react";
import { berekenScores } from "@/lib/scoring";
import { algemeen, totaalscoreTeksten } from "@/lib/rapportteksten";
import { scoreKleur } from "@/lib/scoring-config";
import { ThemaDetail } from "./ThemaDetail";
import { WerkgelukWiel } from "./WerkgelukWiel";
import { ScanFooter } from "@/components/scan/ScanFooter";

interface RapportScreenProps {
  antwoorden: Record<string, number>;
  respondentCode: string;
  naam: string;
}

const WIEL_TITEL: Record<string, string> = {
  werkenergie: "Werkgelukwiel",
  persoonlijk_welzijn: "Levenswiel",
};

function bestandsnaamUitHeader(contentDisposition: string | null, fallback: string): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function RapportScreen({ antwoorden, respondentCode, naam }: RapportScreenProps) {
  const resultaat = berekenScores(antwoorden);
  const totaalTeksten = totaalscoreTeksten(resultaat.totaalScore);
  const [pdfBezig, setPdfBezig] = useState(false);
  const [pdfFoutmelding, setPdfFoutmelding] = useState<string | null>(null);

  /**
   * Geeft de zojuist berekende thema-scores door aan de losstaande,
   * self-contained opdrachtenpagina (public/opdrachten.html, het werkboek
   * "Als alles klopt") via localStorage, bewust geen URL-parameters, want
   * die belanden in server-/CDN-logs en dit zijn privacygevoelige
   * welzijnsscores. De opdrachtenpagina leest de sleutel uit en wist 'm
   * meteen weer.
   */
  function gaNaarBoost() {
    try {
      const scores = Object.fromEntries(
        resultaat.themaScores.map((thema) => [thema.themaId, thema.score])
      );
      window.localStorage.setItem("boost-opdrachten-scores", JSON.stringify(scores));
      // Alleen de huidige (rapport-)URL, geen scores of andere persoonsgegevens,
      // zodat de opdrachtenpagina een knop "Terug naar je rapport" kan tonen.
      window.localStorage.setItem("boost-rapport-url", window.location.href);
    } catch {
      // Geen opslag beschikbaar (bv. privénavigatie): de opdrachtenpagina
      // werkt dan gewoon met lege gele vakjes en zonder terugknop.
    }
    window.location.assign("/opdrachten.html");
  }

  async function downloadPdf() {
    setPdfFoutmelding(null);
    setPdfBezig(true);
    try {
      const response = await fetch("/api/rapport-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          antwoorden,
          naam: naam.trim() || null,
          respondentCode,
        }),
      });

      if (!response.ok) throw new Error("PDF-download mislukt");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bestandsnaamUitHeader(
        response.headers.get("Content-Disposition"),
        "vit-scan-resultaat.pdf"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setPdfFoutmelding(
        "Het downloaden van je rapport is niet gelukt. Controleer je internetverbinding en probeer het opnieuw."
      );
    } finally {
      setPdfBezig(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {naam ? `Jouw VIT-scan resultaat, ${naam}` : "Jouw VIT-scan resultaat"}
        </h1>
        <p className="mt-2 text-zinc-600">{algemeen.overzichtIntro}</p>
      </div>

      <div className="mt-8 rounded-xl border border-brand-salie/40 bg-brand-ecru p-6 text-center">
        <p className="text-sm font-medium text-zinc-500">Jouw totale VIT-score</p>
        <p
          className="mt-1 text-5xl font-bold"
          style={{ color: scoreKleur(resultaat.totaalScore) }}
        >
          {resultaat.totaalScore.toFixed(1)}
        </p>
        <p className="mt-1 text-lg font-medium text-zinc-800">{totaalTeksten.titel}</p>
        <p className="mt-3 text-left text-zinc-700">{totaalTeksten.tekst}</p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-10">
        {resultaat.deelScores.map((deel) => (
          <WerkgelukWiel
            key={deel.deelId}
            titel={WIEL_TITEL[deel.deelId] ?? deel.deelTitel}
            gemiddelde={deel.score}
            segmenten={resultaat.themaScores
              .filter((thema) => thema.deelId === deel.deelId)
              .map((thema) => ({
                themaId: thema.themaId,
                label: thema.themaTitel,
                score: thema.score,
              }))}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold text-zinc-900">Om over na te denken</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {totaalTeksten.reflectievragen.map((vraag) => (
              <li key={vraag}>{vraag}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">Wat kun je doen</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {totaalTeksten.aanbevelingen.map((aanbeveling) => (
              <li key={aanbeveling}>{aanbeveling}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-900">Per thema</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Klik een thema open voor duiding, reflectievragen en aanbevelingen.
        </p>

        {resultaat.deelScores.map((deel) => (
          <div key={deel.deelId} className="mt-5">
            <p className="text-sm font-medium text-zinc-500">{deel.deelTitel}</p>
            <div className="mt-2 space-y-3">
              {resultaat.themaScores
                .filter((thema) => thema.deelId === deel.deelId)
                .map((thema) => (
                  <ThemaDetail key={thema.themaId} themaScore={thema} />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-brand-oudroze/50 bg-brand-ecru p-6">
        <h2 className="font-semibold text-zinc-900">{algemeen.afsluiting.titel}</h2>
        <p className="mt-2 text-zinc-700">{algemeen.afsluiting.tekst}</p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={downloadPdf}
          disabled={pdfBezig}
          className="h-12 w-full max-w-xs rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {pdfBezig ? "Rapport wordt gemaakt..." : "Download rapport (PDF)"}
        </button>
        <button
          type="button"
          onClick={gaNaarBoost}
          className="h-12 w-full max-w-xs rounded-lg border-2 border-brand-violet font-medium text-brand-violet transition-colors hover:bg-brand-violet hover:text-white"
        >
          Ga naar Boost je werkgeluk
        </button>
      </div>
      {pdfFoutmelding && (
        <p className="mt-3 text-center text-sm text-red-600">{pdfFoutmelding}</p>
      )}

      <div className="mt-8 rounded-lg border border-brand-salie/40 bg-brand-ecru p-4 text-center">
        <p className="text-sm text-zinc-600">Jouw persoonlijke code:</p>
        <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
          {respondentCode}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Bewaar deze code. Bij een vervolgmeting kun je &apos;m gebruiken om je
          resultaten te laten koppelen, in overleg met Nynke.
        </p>
      </div>

      <ScanFooter />
    </div>
  );
}
