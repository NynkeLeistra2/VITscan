"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startEnrollment, bevestigEnrollment, verwijderFactor } from "./actions";

interface BestaandeFactor {
  id: string;
  aangemaaktOp: string;
}

interface MfaInstellenFormProps {
  bestaandeFactor: BestaandeFactor | null;
}

export function MfaInstellenForm({ bestaandeFactor }: MfaInstellenFormProps) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCodeSvg: string;
    secret: string;
  } | null>(null);
  const [startFout, setStartFout] = useState<string | null>(null);
  const [bezigMetStarten, setBezigMetStarten] = useState(false);
  const [verwijderBezig, setVerwijderBezig] = useState(false);
  const [verwijderBevestigen, setVerwijderBevestigen] = useState(false);
  const [verwijderFout, setVerwijderFout] = useState<string | null>(null);

  const [bevestigState, bevestigAction, bevestigBezig] = useActionState(bevestigEnrollment, {
    fout: null,
  });
  // Ná een geslaagde bevestiging (bezig ging van true naar false, zonder
  // fout) de pagina verversen: de server-component leest dan de nu wél
  // bestaande, verified factor opnieuw. Ref i.p.v. state om de vorige
  // bezig-waarde te vergelijken zonder een extra render te forceren.
  const wasBezig = useRef(false);
  useEffect(() => {
    if (wasBezig.current && !bevestigBezig && !bevestigState.fout) {
      router.refresh();
    }
    wasBezig.current = bevestigBezig;
  }, [bevestigBezig, bevestigState.fout, router]);

  async function begin() {
    setStartFout(null);
    setBezigMetStarten(true);
    const resultaat = await startEnrollment();
    setBezigMetStarten(false);
    if (resultaat.fout || !resultaat.factorId || !resultaat.qrCodeSvg || !resultaat.secret) {
      setStartFout(resultaat.fout ?? "Starten is niet gelukt.");
      return;
    }
    setEnrollment({
      factorId: resultaat.factorId,
      qrCodeSvg: resultaat.qrCodeSvg,
      secret: resultaat.secret,
    });
  }

  async function verwijder() {
    if (!bestaandeFactor) return;
    setVerwijderFout(null);
    setVerwijderBezig(true);
    const resultaat = await verwijderFactor(bestaandeFactor.id);
    setVerwijderBezig(false);
    if (resultaat.fout) {
      setVerwijderFout(resultaat.fout);
      return;
    }
    router.refresh();
  }

  if (bestaandeFactor) {
    return (
      <div className="mt-6 rounded-lg border border-brand-salie/40 p-4">
        <p className="text-sm text-zinc-700">
          Authenticator-app gekoppeld sinds{" "}
          {new Date(bestaandeFactor.aangemaaktOp).toLocaleDateString("nl-NL")}.
        </p>
        {!verwijderBevestigen ? (
          <button
            type="button"
            onClick={() => setVerwijderBevestigen(true)}
            className="mt-3 text-sm text-red-600 underline"
          >
            Ontkoppelen
          </button>
        ) : (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p>
              Zonder authenticator-app is inloggen straks weer alleen met wachtwoord.
              Zeker weten?
            </p>
            {verwijderFout && <p className="mt-1 font-medium">{verwijderFout}</p>}
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                disabled={verwijderBezig}
                onClick={verwijder}
                className="font-medium text-red-700 underline disabled:opacity-50"
              >
                {verwijderBezig ? "Bezig..." : "Ja, ontkoppelen"}
              </button>
              <button
                type="button"
                onClick={() => setVerwijderBevestigen(false)}
                className="text-zinc-600 underline"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled={bezigMetStarten}
          onClick={begin}
          className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezigMetStarten ? "Bezig..." : "Authenticator-app koppelen"}
        </button>
        {startFout && <p className="mt-2 text-sm text-red-600">{startFout}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-zinc-700">
        Scan deze QR-code met je authenticator-app, of vul de code hieronder handmatig in.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data-URI, geen next/image nodig */}
      <img
        src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCodeSvg)}`}
        alt="QR-code voor authenticator-app"
        className="h-48 w-48"
      />
      <div>
        <p className="text-xs text-zinc-500">Kan je niet scannen? Vul deze sleutel handmatig in:</p>
        <code className="mt-1 block break-all rounded bg-zinc-100 p-2 text-xs">
          {enrollment.secret}
        </code>
      </div>

      <form action={bevestigAction} className="space-y-3">
        <input type="hidden" name="factorId" value={enrollment.factorId} />
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="code">
            Code uit je authenticator-app
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
          />
        </div>

        {bevestigState.fout && <p className="text-sm text-red-600">{bevestigState.fout}</p>}

        <button
          type="submit"
          disabled={bevestigBezig}
          className="h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bevestigBezig ? "Bezig..." : "Bevestigen"}
        </button>
      </form>
    </div>
  );
}
