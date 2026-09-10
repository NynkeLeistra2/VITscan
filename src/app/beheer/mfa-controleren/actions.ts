"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";

// Zelfde patroon als /beheer/login/actions.ts: eigen rate limiting per
// route (SECURITY.md regel 4), strenger voor deze inlog-gevoelige stap dan
// een gewone actie.
const RATE_LIMIT_VENSTER_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
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

export async function controleerMfaCode(
  _voorheen: { fout: string | null },
  formData: FormData
): Promise<{ fout: string | null }> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "onbekend";
  const generiekeFout = "Code klopt niet (of is verlopen). Probeer het opnieuw.";

  if (!magVerder(ip)) {
    console.warn("Rate limit overschreden voor /beheer/mfa-controleren, ip:", ip);
    return { fout: generiekeFout };
  }

  const code = formData.get("code");
  if (typeof code !== "string" || !code.trim()) {
    return { fout: generiekeFout };
  }

  const supabase = await supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/beheer/login");
  }

  const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
  const factor = factorData?.totp.find((f) => f.status === "verified");
  if (factorError || !factor) {
    // Geen geverifieerde factor (meer): niets te controleren, terug naar
    // login zodat het proces daar opnieuw bepaalt wat nodig is.
    redirect("/beheer/login");
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: code.trim(),
  });

  if (error) {
    console.warn("MFA-controle mislukt voor /beheer/mfa-controleren, ip:", ip);
    return { fout: generiekeFout };
  }

  redirect("/beheer");
}
