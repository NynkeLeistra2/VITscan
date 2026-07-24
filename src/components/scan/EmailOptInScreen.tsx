import { ScanFooter } from "./ScanFooter";

const EMAIL_PATROON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailOptInScreenProps {
  email: string;
  onEmailWijzig: (email: string) => void;
  emailOptIn: boolean;
  onEmailOptInWijzig: (optIn: boolean) => void;
  emailVerplicht: boolean;
  onVorige: () => void;
  onVerder: () => void;
  bezig: boolean;
}

export function EmailOptInScreen({
  email,
  onEmailWijzig,
  emailOptIn,
  onEmailOptInWijzig,
  emailVerplicht,
  onVorige,
  onVerder,
  bezig,
}: EmailOptInScreenProps) {
  const wilEmail = emailVerplicht || emailOptIn;
  const emailGeldig = EMAIL_PATROON.test(email.trim());
  const kanVerder = !wilEmail || emailGeldig;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
      <h2 className="text-xl font-semibold text-zinc-900">Bijna klaar</h2>

      <div className="mt-4">
        {!emailVerplicht && (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={emailOptIn}
              onChange={(e) => onEmailOptInWijzig(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-salie/40 text-brand-violet focus:ring-brand-violet"
            />
            <span className="text-sm text-zinc-700">
              Stuur mij dit rapport ook per e-mail
            </span>
          </label>
        )}

        {wilEmail && (
          <div className="mt-3">
            {emailVerplicht && (
              <label className="text-sm font-medium text-zinc-700" htmlFor="email">
                E-mailadres
              </label>
            )}
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailWijzig(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              className="mt-1 w-full rounded-lg border border-brand-salie/40 p-3 text-zinc-900 focus:border-brand-violet focus:outline-none"
            />
            {email.trim().length > 0 && !emailGeldig && (
              <p className="mt-1 text-sm text-red-600">
                Vul een geldig e-mailadres in.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onVorige}
          disabled={bezig}
          className="h-12 flex-1 rounded-lg border border-brand-salie/40 font-medium text-zinc-700 transition-colors hover:bg-brand-ecru disabled:cursor-not-allowed disabled:opacity-50"
        >
          Vorige
        </button>
        <button
          type="button"
          onClick={onVerder}
          disabled={bezig || !kanVerder}
          className="h-12 flex-1 rounded-lg bg-brand-violet font-medium text-white transition-colors hover:bg-brand-violet-dark disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {bezig ? "Bezig..." : "Afronden"}
        </button>
      </div>

      <ScanFooter />
    </div>
  );
}
