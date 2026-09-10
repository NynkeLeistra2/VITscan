import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Ververst de Supabase-sessie op elk request en beveiligt `/beheer`: zonder
 * geldige sessie (en niet al op het inlogscherm) volgt een redirect naar
 * `/beheer/login` — fail closed (SECURITY.md regel 7). Met een gekoppelde
 * authenticator-app geldt dat ook als de sessie wel bestaat maar nog op
 * aal1 staat (bv. een oude sessie van vóór het koppelen, of iemand die
 * /beheer/mfa-controleren probeert over te slaan): dan mag alleen die
 * controleerpagina (en login/wachtwoord-instellen) bereikt worden.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Ontbrekende Supabase-omgevingsvariabelen in middleware");
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isBeheerRoute = request.nextUrl.pathname.startsWith("/beheer");
  const isLoginRoute = request.nextUrl.pathname.startsWith("/beheer/login");
  // Wachtwoord-instellen verwerkt een herstel-link (uit de e-mail) volledig
  // client-side, vóórdat er een sessie is die de server hier al kan zien —
  // moet dus net als /beheer/login bereikbaar zijn zonder sessie.
  const isWachtwoordInstellenRoute = request.nextUrl.pathname.startsWith(
    "/beheer/wachtwoord-instellen"
  );
  const isMfaControlerenRoute = request.nextUrl.pathname.startsWith("/beheer/mfa-controleren");
  const isUitzonderingsRoute = isLoginRoute || isWachtwoordInstellenRoute || isMfaControlerenRoute;

  if (isBeheerRoute && !isUitzonderingsRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/beheer/login";
    return NextResponse.redirect(loginUrl);
  }

  if (isBeheerRoute && !isUitzonderingsRoute && user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const mfaUrl = request.nextUrl.clone();
      mfaUrl.pathname = "/beheer/mfa-controleren";
      return NextResponse.redirect(mfaUrl);
    }
  }

  return response;
}
