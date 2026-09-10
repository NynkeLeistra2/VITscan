import { supabaseServerClient } from "@/lib/supabase/server";
import { MfaInstellenForm } from "./MfaInstellenForm";

export default async function MfaInstellenPagina() {
  const supabase = await supabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const bestaandeFactor = data?.totp.find((f) => f.status === "verified") ?? null;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Inlogbeveiliging</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Koppel een authenticator-app (bv. Google Authenticator, 1Password) aan je
        beheeraccount. Na het koppelen vraagt inloggen altijd om de code uit die app.
      </p>

      <MfaInstellenForm
        bestaandeFactor={
          bestaandeFactor ? { id: bestaandeFactor.id, aangemaaktOp: bestaandeFactor.created_at } : null
        }
      />

      <a href="/beheer" className="mt-8 inline-block text-sm text-zinc-500 underline">
        Terug naar beheer
      </a>
    </div>
  );
}
