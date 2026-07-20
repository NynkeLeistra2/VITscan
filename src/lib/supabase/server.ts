import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Ontbrekende Supabase-omgevingsvariabelen: NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

/**
 * Supabase-client voor server components/server actions in `/beheer`: leest
 * de sessie uit httpOnly-cookies (SECURITY.md regel 3), zodat RLS-policies
 * met `to authenticated` de ingelogde gebruiker herkennen.
 */
export async function supabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Genegeerd: een server component mag geen cookies zetten, alleen
          // server actions/route handlers. De middleware ververst de sessie
          // dan bij het volgende request.
        }
      },
    },
  });
}
