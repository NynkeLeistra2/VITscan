import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Ververst de Supabase-sessie op elk request en beveiligt `/beheer`: zonder
 * geldige sessie (en niet al op het inlogscherm) volgt een redirect naar
 * `/beheer/login` — fail closed (SECURITY.md regel 7).
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

  if (isBeheerRoute && !isLoginRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/beheer/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
