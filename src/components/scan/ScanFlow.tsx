"use client";

import { useEffect, useState } from "react";
import { themaLijst } from "@/lib/stellingen";
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
import { ThemaScreen } from "./ThemaScreen";
import { OpenVraagScreen } from "./OpenVraagScreen";
import { AfrondenScreen } from "./AfrondenScreen";
import { VoortgangsBalk } from "./VoortgangsBalk";

const THEMAS = themaLijst();
const OPEN_VRAAG_STAP = THEMAS.length + 1;
const AFGEROND_STAP = THEMAS.length + 2;

interface ScanFlowProps {
  context: ScanrondeContext;
}

export function ScanFlow({ context }: ScanFlowProps) {
  const [sessie, setSessie] = useState<ScanSessie | null>(null);
  const [bezig, setBezig] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

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
    bijwerken({
      antwoorden: { ...sessie!.antwoorden, [stellingKey]: waarde },
    });
  }

  async function themaVolgende(themaIndex: number) {
    setFoutmelding(null);
    setBezig(true);
    try {
      const thema = THEMAS[themaIndex];
      const antwoordenVoorThema = Object.fromEntries(
        thema.stellingen.map((s) => [s.key, sessie!.antwoorden[s.key]])
      );
      await slaAntwoordenOp(sessie!.respondentId, antwoordenVoorThema);
      const volgendeStap =
        themaIndex < THEMAS.length - 1 ? themaIndex + 2 : OPEN_VRAAG_STAP;
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
      await rondRespondentAf(sessie!.respondentId, sessie!.openVraagAntwoord);
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
    return <AfrondenScreen respondentCode={sessie.respondentCode} />;
  }

  if (sessie.stapIndex === 0) {
    return (
      <IntroScreen
        organisatieNaam={context.organisatieNaam}
        teamNaam={context.teamNaam}
        respondentCode={sessie.respondentCode}
        onStart={start}
        bezig={bezig}
        foutmelding={foutmelding}
      />
    );
  }

  if (sessie.stapIndex === OPEN_VRAAG_STAP) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-md px-6 pt-6">
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
          onVorige={() => bijwerken({ stapIndex: THEMAS.length })}
          onVerder={afronden}
          bezig={bezig}
        />
      </div>
    );
  }

  const themaIndex = sessie.stapIndex - 1;
  const thema = THEMAS[themaIndex];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        <VoortgangsBalk
          huidigeStapNummer={sessie.stapIndex}
          totaalStappen={OPEN_VRAAG_STAP}
        />
        {foutmelding && (
          <p className="mt-3 text-sm text-red-600">{foutmelding}</p>
        )}
      </div>
      <ThemaScreen
        thema={thema}
        antwoorden={sessie.antwoorden}
        onAntwoordWijzig={antwoordWijzig}
        onVorige={() => bijwerken({ stapIndex: sessie.stapIndex - 1 })}
        onVolgende={() => themaVolgende(themaIndex)}
        toontVorige={sessie.stapIndex > 1}
        volgendeLabel={bezig ? "Bezig..." : "Volgende"}
        bezig={bezig}
      />
    </div>
  );
}
