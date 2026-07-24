"use client";

import { useEffect, useRef, useState } from "react";
import { themaLijst, type StellingRef, type ThemaMetStellingen } from "@/lib/stellingen";
import {
  laadSessie,
  nieuweSessie,
  opslaanSessie,
  type ScanSessie,
} from "@/lib/scan-sessie";
import {
  maakOfWerkRespondentBij,
  rondRespondentAf,
  slaAntwoordenOp,
} from "@/lib/supabase/scan-repository";
import type { ScanrondeContext } from "@/lib/supabase/scanronde";
import { IntroScreen } from "./IntroScreen";
import { StellingScreen } from "./StellingScreen";
import { OpenVraagScreen } from "./OpenVraagScreen";
import { VoortgangsBalk } from "./VoortgangsBalk";
import { RapportScreen } from "@/components/rapport/RapportScreen";

interface StellingStap {
  thema: ThemaMetStellingen;
  stelling: StellingRef;
  toonSubcategorie: boolean;
  laatsteVanThema: boolean;
}

/** Eén stap per stelling (i.p.v. per thema), gegroepeerd in themavolgorde,
 * zodat we nog steeds één keer per afgerond thema kunnen opslaan. */
const STELLING_STAPPEN: StellingStap[] = themaLijst().flatMap((thema) =>
  thema.stellingen.map((stelling, i) => ({
    thema,
    stelling,
    toonSubcategorie:
      stelling.subcategorieTitel !== null &&
      stelling.subcategorieTitel !== (thema.stellingen[i - 1]?.subcategorieTitel ?? null),
    laatsteVanThema: i === thema.stellingen.length - 1,
  }))
);
const OPEN_VRAAG_STAP = STELLING_STAPPEN.length + 1;
const AFGEROND_STAP = STELLING_STAPPEN.length + 2;

const RETRY_WACHTTIJD_MS = 700;

async function verstuurNaarN8n(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/verstuur-resultaten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`status ${response.status}`);
}

/**
 * Vuur-en-vergeet doorsturen naar n8n, met één automatische herhaling na een
 * korte wachttijd: een koude Cloudflare Worker-instantie kan de eerste keer
 * tegen de CPU-tijdslimiet aanlopen (zie ONTWIKKELLOG), een tweede, inmiddels
 * warme poging lukt dan meestal wel. Blokkeert nooit `afronden()` — de
 * respondent ziet zijn rapport altijd meteen, deze functie wordt bewust niet
 * afgewacht door de aanroeper.
 */
async function verstuurResultatenMetRetry(payload: Record<string, unknown>): Promise<void> {
  try {
    await verstuurNaarN8n(payload);
    return;
  } catch {
    // eerste poging mislukt, val door naar de herhaling hieronder
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_WACHTTIJD_MS));

  try {
    await verstuurNaarN8n(payload);
  } catch {
    // Ook de herhaling mislukt: geen respondent-blokkerende actie meer
    // mogelijk, wel een kort seintje naar een extreem lichte logroute zodat
    // dit zichtbaar wordt in Cloudflare Workers Logs (zie
    // /api/verstuur-resultaten-mislukt — bewust geen zware imports daar).
    fetch("/api/verstuur-resultaten-mislukt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respondentCode: payload.respondentCode }),
    }).catch(() => {});
  }
}

interface ScanFlowProps {
  context: ScanrondeContext;
}

export function ScanFlow({ context }: ScanFlowProps) {
  const [sessie, setSessie] = useState<ScanSessie | null>(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const autoVolgendeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoVolgendeTimer.current) clearTimeout(autoVolgendeTimer.current);
    };
  }, []);

  useEffect(() => {
    // localStorage is alleen client-side beschikbaar; deze eenmalige sync na
    // mount is de correcte, hydration-veilige plek om 'm te lezen (vandaar
    // de expliciete uitzondering op de set-state-in-effect-regel hieronder).
    const bestaande = laadSessie(context.scanrondeId, context.teamId);
    const geladenSessie = bestaande ?? nieuweSessie();
    if (!bestaande) {
      opslaanSessie(context.scanrondeId, context.teamId, geladenSessie);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessie(geladenSessie);
  }, [context.scanrondeId, context.teamId]);

  if (!sessie) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-zinc-500">
        Laden...
      </div>
    );
  }

  function bijwerken(wijziging: Partial<ScanSessie>) {
    setSessie((huidige) => {
      if (!huidige) return huidige;
      const nieuwe = { ...huidige, ...wijziging };
      opslaanSessie(context.scanrondeId, context.teamId, nieuwe);
      return nieuwe;
    });
  }

  /** Navigatie die niet via het antwoord-auto-advance loopt (Vorige-knop,
   * open vraag): annuleert een eventueel nog lopende auto-advance-timer,
   * anders schiet je na "Vorige" alsnog een stap verder. */
  function gaNaarStap(stapIndex: number) {
    if (autoVolgendeTimer.current) {
      clearTimeout(autoVolgendeTimer.current);
      autoVolgendeTimer.current = null;
    }
    bijwerken({ stapIndex });
  }

  async function start() {
    setFoutmelding(null);
    setBezig(true);
    try {
      await maakOfWerkRespondentBij({
        respondentId: sessie!.respondentId,
        scanrondeId: context.scanrondeId,
        teamId: context.teamId,
        respondentCode: sessie!.respondentCode,
        stellingenVersie: sessie!.stellingenVersie,
        naam: sessie!.naam.trim() || null,
      });
      bijwerken({ stapIndex: 1 });
    } catch {
      setFoutmelding(
        "Het is niet gelukt om te starten. Controleer je internetverbinding en probeer het opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  function antwoordWijzig(stellingKey: string, waarde: number) {
    const nieuweAntwoorden = { ...sessie!.antwoorden, [stellingKey]: waarde };
    bijwerken({ antwoorden: nieuweAntwoorden });

    if (autoVolgendeTimer.current) clearTimeout(autoVolgendeTimer.current);
    const huidigeStapIndex = sessie!.stapIndex;
    autoVolgendeTimer.current = setTimeout(() => {
      autoVolgendeTimer.current = null;
      stellingVolgende(huidigeStapIndex, nieuweAntwoorden);
    }, 400);
  }

  async function stellingVolgende(
    huidigeStapIndex: number,
    antwoorden: Record<string, number>
  ) {
    setFoutmelding(null);
    const stap = STELLING_STAPPEN[huidigeStapIndex - 1];
    const volgendeStap =
      huidigeStapIndex < STELLING_STAPPEN.length ? huidigeStapIndex + 1 : OPEN_VRAAG_STAP;

    if (!stap.laatsteVanThema) {
      bijwerken({ stapIndex: volgendeStap });
      return;
    }

    setBezig(true);
    try {
      const antwoordenVoorThema = Object.fromEntries(
        stap.thema.stellingen.map((s) => [s.key, antwoorden[s.key]])
      );
      await slaAntwoordenOp(sessie!.respondentId, antwoordenVoorThema);
      bijwerken({ stapIndex: volgendeStap });
    } catch {
      setFoutmelding(
        "Opslaan is niet gelukt. Controleer je internetverbinding en probeer het opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  async function afronden() {
    setFoutmelding(null);
    setBezig(true);
    try {
      await slaAntwoordenOp(sessie!.respondentId, sessie!.antwoorden);
      const emailVoorOpslag =
        context.emailVerplicht || sessie!.emailOptIn ? sessie!.email.trim() : "";
      await rondRespondentAf(
        sessie!.respondentId,
        sessie!.openVraagAntwoord,
        emailVoorOpslag || null
      );
      // Secundaire integratie (e-mail + Google Sheet via n8n): bewust niet
      // afgewacht/geblokkeerd op, een storing hierin mag de respondent
      // nooit het zicht op het eigen rapport ontnemen. Eén automatische
      // herhaling bij falen, zie verstuurResultatenMetRetry hierboven.
      verstuurResultatenMetRetry({
        antwoorden: sessie!.antwoorden,
        naam: sessie!.naam.trim() || null,
        email: emailVoorOpslag || null,
        respondentCode: sessie!.respondentCode,
        openVraagAntwoord: sessie!.openVraagAntwoord,
        organisatie: context.organisatieNaam || null,
      }).catch(() => {});
      bijwerken({ stapIndex: AFGEROND_STAP, afgerond: true });
    } catch {
      setFoutmelding(
        "Afronden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  if (sessie.afgerond || sessie.stapIndex === AFGEROND_STAP) {
    return (
      <RapportScreen
        antwoorden={sessie.antwoorden}
        respondentCode={sessie.respondentCode}
        naam={sessie.naam.trim()}
        organisatieNaam={context.organisatieNaam}
      />
    );
  }

  if (sessie.stapIndex === 0) {
    return (
      <IntroScreen
        organisatieNaam={context.organisatieNaam}
        teamNaam={context.teamNaam}
        respondentCode={sessie.respondentCode}
        naam={sessie.naam}
        onNaamWijzig={(naam) => bijwerken({ naam })}
        emailVerplicht={context.emailVerplicht}
        onStart={start}
        bezig={bezig}
        foutmelding={foutmelding}
      />
    );
  }

  if (sessie.stapIndex === OPEN_VRAAG_STAP) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-xl px-6 pt-6">
          <VoortgangsBalk
            huidigeStapNummer={OPEN_VRAAG_STAP}
            totaalStappen={OPEN_VRAAG_STAP}
          />
          {foutmelding && (
            <p className="mt-3 text-sm text-red-600">{foutmelding}</p>
          )}
        </div>
        <OpenVraagScreen
          waarde={sessie.openVraagAntwoord}
          onWijzig={(waarde) => bijwerken({ openVraagAntwoord: waarde })}
          email={sessie.email}
          onEmailWijzig={(email) => bijwerken({ email })}
          emailOptIn={sessie.emailOptIn}
          onEmailOptInWijzig={(emailOptIn) => bijwerken({ emailOptIn })}
          emailVerplicht={context.emailVerplicht}
          onVorige={() => gaNaarStap(STELLING_STAPPEN.length)}
          onVerder={afronden}
          bezig={bezig}
        />
      </div>
    );
  }

  const stap = STELLING_STAPPEN[sessie.stapIndex - 1];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pt-6">
        <VoortgangsBalk
          huidigeStapNummer={sessie.stapIndex}
          totaalStappen={OPEN_VRAAG_STAP}
        />
        {foutmelding && (
          <p className="mt-3 text-sm text-red-600">{foutmelding}</p>
        )}
      </div>
      <StellingScreen
        thema={stap.thema}
        stelling={stap.stelling}
        toonSubcategorie={stap.toonSubcategorie}
        waarde={sessie.antwoorden[stap.stelling.key]}
        onAntwoordWijzig={(waarde) => antwoordWijzig(stap.stelling.key, waarde)}
        onVorige={() => gaNaarStap(sessie.stapIndex - 1)}
        toontVorige={sessie.stapIndex > 1}
        bezig={bezig}
      />
    </div>
  );
}
