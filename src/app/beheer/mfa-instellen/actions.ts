"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * MFA-beheer voor het beheeraccount (authenticator-app). Draait allemaal via
 * de server-cookie-sessie (supabaseServerClient), niet via de losse
 * browser-client -- zo blijft de AAL-verhoging na het bevestigen van een
 * factor direct zichtbaar voor de server (middleware.ts leest dezelfde
 * cookies), in plaats van alleen in een client-side sessie te blijven
 * hangen die de server niet ziet.
 */

export interface MfaStartResultaat {
  fout: string | null;
  factorId: string | null;
  qrCodeSvg: string | null;
  secret: string | null;
}

export async function startEnrollment(): Promise<MfaStartResultaat> {
  const supabase = await supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) ingelogd.", factorId: null, qrCodeSvg: null, secret: null };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator-app",
  });

  if (error) {
    console.error("MFA-enrollment starten mislukt:", error.message);
    return { fout: `Starten is niet gelukt. ${error.message}`, factorId: null, qrCodeSvg: null, secret: null };
  }

  return {
    fout: null,
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function bevestigEnrollment(
  _voorheen: { fout: string | null },
  formData: FormData
): Promise<{ fout: string | null }> {
  const factorId = formData.get("factorId");
  const code = formData.get("code");
  if (typeof factorId !== "string" || typeof code !== "string" || !factorId || !code) {
    return { fout: "Vul de 6-cijferige code uit je authenticator-app in." };
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });

  if (error) {
    console.warn("MFA-enrollment bevestigen mislukt:", error.message);
    return { fout: "Code klopt niet (of is verlopen). Probeer het opnieuw met de nieuwste code." };
  }

  revalidatePath("/beheer/mfa-instellen");
  return { fout: null };
}

export async function verwijderFactor(factorId: string): Promise<{ fout: string | null }> {
  const supabase = await supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) ingelogd." };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("Verwijderen MFA-factor mislukt:", error.message);
    return { fout: `Verwijderen is niet gelukt. ${error.message}` };
  }

  revalidatePath("/beheer/mfa-instellen");
  return { fout: null };
}
