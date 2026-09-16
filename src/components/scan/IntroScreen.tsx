import Image from "next/image";
import { ScanFooter } from "./ScanFooter";

interface IntroScreenProps {
  organisatieNaam: string;
  teamNaam: string | null;
  naam: string;
  onNaamWijzig: (naam: string) => void;
  emailVerplicht: boolean;
  onStart: () => void;
  bezig: boolean;
  foutmelding: string | null;
}

export function IntroScreen({
  organisatieNaam,
  teamNaam,
  naam,
  onNaamWijzig,
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
      {(organisatieNaam || teamNaam) && (
        <p className="mt-1 text-lg font-bold text-brand-violet-dark">
          {organisatieNaam}
          {teamNaam ? ` · ${teamNaam}` : ""}
        </p>
      )}

      <div className="mt-6 space-y-4 text-zinc-700">
        <p>
          Deze scan meet hoe het met je energie en welzijn in je werk gaat.
          Het invullen duurt 10 tot 15 minuten.
        </p>
        <p>
          Je antwoorden zijn van jou: het rapport dat je straks direct te
          zien krijgt, is alleen voor jou. Er wordt niets opgeslagen waarmee
          een antwoord naar jou persoonlijk te herleiden is: geen naam,
          geen e-mailadres. Je werkgever ziet nooit individuele antwoorden,
          alleen geanonimiseerde teamcijfers.
        </p>
        <p>
          Een naam invullen is niet nodig. Wil je 'm toch op je rapport,
          vul hem dan hieronder in. Die naam wordt nergens opgeslagen,
          alleen gebruikt om dit scherm en je PDF te maken.
          {emailVerplicht
            ? " We vragen straks ook je e-mailadres om het rapport per e-mail te versturen; ook dat bewaren we niet."
            : " Aan het einde kun je optioneel ook je e-mailadres achterlaten om het rapport toegestuurd te krijgen. Ook dat bewaren we niet."}
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
