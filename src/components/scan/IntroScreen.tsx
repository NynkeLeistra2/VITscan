import Image from "next/image";
import { ScanFooter } from "./ScanFooter";

interface IntroScreenProps {
  organisatieNaam: string;
  teamNaam: string | null;
  respondentCode: string;
  naam: string;
  onNaamWijzig: (naam: string) => void;
  organisatie: string;
  onOrganisatieWijzig: (organisatie: string) => void;
  emailVerplicht: boolean;
  onStart: () => void;
  bezig: boolean;
  foutmelding: string | null;
}

export function IntroScreen({
  organisatieNaam,
  teamNaam,
  respondentCode,
  naam,
  onNaamWijzig,
  organisatie,
  onOrganisatieWijzig,
  emailVerplicht,
  onStart,
  bezig,
  foutmelding,
}: IntroScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
      <Image
        src="/nynke-logo-pdf.png"
        alt="Nynke Leistra Coaching en Advies"
        width={175}
        height={100}
        className="h-12 w-auto self-start"
        priority
      />
      <h1 className="mt-3 text-2xl font-semibold text-brand-violet">VIT-scan</h1>
      <p className="mt-1 text-sm text-brand-oudroze">
        {organisatieNaam}
        {teamNaam ? ` · ${teamNaam}` : ""}
      </p>

      <div className="mt-6 space-y-4 text-zinc-700">
        <p>
          Deze scan meet hoe het met je energie en welzijn in je werk gaat.
          Het invullen duurt 10 tot 15 minuten.
        </p>
        <p>
          Je antwoorden zijn van jou: het rapport dat je straks direct te
          zien krijgt, is alleen voor jou. Je werkgever ziet nooit
          individuele antwoorden, alleen geanonimiseerde teamcijfers.
        </p>
        <p>
          Een naam invullen is niet nodig, je herkent je rapport ook aan je
          persoonlijke code hieronder. Wil je wel je naam erop, dan kan dat.
          {emailVerplicht
            ? " We vragen straks ook je e-mailadres, zodat je het rapport ook per e-mail ontvangt."
            : " Aan het einde kun je optioneel ook je e-mailadres achterlaten om het rapport toegestuurd te krijgen."}
        </p>
      </div>

      <div className="mt-6">
        <label className="text-sm font-medium text-zinc-700" htmlFor="naam">
          Je naam (optioneel)
        </label>
        <input
          id="naam"
          type="text"
          value={naam}
          onChange={(e) => onNaamWijzig(e.target.value)}
          placeholder="Bijv. Jan Jansen"
          className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-zinc-700" htmlFor="organisatie">
          Organisatie (optioneel)
        </label>
        <input
          id="organisatie"
          type="text"
          value={organisatie}
          onChange={(e) => onOrganisatieWijzig(e.target.value)}
          placeholder="Bijv. je werkgever, als die hierboven nog niet genoemd wordt"
          className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
        />
      </div>

      <div className="mt-6 rounded-lg border border-brand-salie/40 bg-brand-ecru p-4">
        <p className="text-sm text-zinc-600">Jouw persoonlijke code:</p>
        <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">
          {respondentCode}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Bewaar deze code. Bij een vervolgmeting kun je &apos;m gebruiken om je
          resultaten te laten koppelen, in overleg met Nynke.
        </p>
      </div>

      {foutmelding && (
        <p className="mt-4 text-sm text-red-600">{foutmelding}</p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={bezig}
        className="mt-8 h-12 w-full rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {bezig ? "Bezig..." : "Start de scan"}
      </button>

      <ScanFooter />
    </div>
  );
}
