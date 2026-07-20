"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";

// Zelfde best-effort in-memory rate limiting als /api/verstuur-resultaten
// (geen Redis in Wave 1) — hier strenger, want een login-route is gevoeliger
// (SECURITY.md regel 4).
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

export async function login(
  _voorheen: { fout: string | null },
  formData: FormData
): Promise<{ fout: string | null }> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "onbekend";

  // Generieke foutmelding in alle gevallen (fail closed, SECURITY.md regel 7):
  // nooit verklappen of een account bestaat, of dat het om rate limiting gaat.
  const generiekeFout = "Inloggen is niet gelukt. Controleer je gegevens en probeer het opnieuw.";

  if (!magVerder(ip)) {
    console.warn("Rate limit overschreden voor /beheer/login, ip:", ip);
    return { fout: generiekeFout };
  }

  const email = formData.get("email");
  const wachtwoord = formData.get("wachtwoord");
  if (typeof email !== "string" || typeof wachtwoord !== "string" || !email || !wachtwoord) {
    return { fout: generiekeFout };
  }

  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: wachtwoord,
  });

  if (error) {
    console.warn("Mislukte inlogpoging voor /beheer/login, ip:", ip);
    return { fout: generiekeFout };
  }

  redirect("/beheer");
}
