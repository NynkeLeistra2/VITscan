"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ARCHIEF_BEWAARTERMIJN_DAGEN } from "./constants";

// PostgrestError serialiseert niet vanzelf leesbaar via console.error (het
// object erft van Error, waarvan `message` niet-enumerable is) — daarom hier
// expliciet de velden uitlezen zodat de echte oorzaak (bv. RLS-foutcode
// 42501) in de logs zichtbaar is i.p.v. "{}". Dit is een intern
// beheerscherm (alleen voor Nynke, achter login), dus de technische details
// mogen ook gewoon in de foutmelding op het scherm.
function foutDetail(error: PostgrestError): string {
  return `${error.message} (code: ${error.code}${error.hint ? `, hint: ${error.hint}` : ""})`;
}

export interface MaakScanrondeState {
  fout: string | null;
  link: string | null;
}

const FormSchema = z.object({
  organisatieId: z.string().trim().min(1),
  nieuweOrganisatieNaam: z.string().trim().max(200).optional(),
  scanrondeNaam: z.string().trim().min(1).max(200),
  emailVerplicht: z.boolean(),
  teamNaam: z.string().trim().max(200).optional(),
});

async function bepaalOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function maakScanrondeAan(
  _voorheen: MaakScanrondeState,
  formData: FormData
): Promise<MaakScanrondeState> {
  const supabase = await supabaseServerClient();

  // Extra check naast de middleware: server actions kunnen ook los van de
  // pagina aangeroepen worden (SECURITY.md regel 2, fail closed).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) ingelogd. Log opnieuw in.", link: null };
  }

  const parsed = FormSchema.safeParse({
    organisatieId: formData.get("organisatieId"),
    nieuweOrganisatieNaam: formData.get("nieuweOrganisatieNaam") || undefined,
    scanrondeNaam: formData.get("scanrondeNaam"),
    emailVerplicht: formData.get("emailVerplicht") === "on",
    teamNaam: formData.get("teamNaam") || undefined,
  });

  if (!parsed.success) {
    return { fout: "Vul in elk geval een organisatie en een naam voor de scanronde in.", link: null };
  }

  const input = parsed.data;

  let organisatieId = input.organisatieId;
  if (organisatieId === "__nieuw__") {
    if (!input.nieuweOrganisatieNaam) {
      return { fout: "Vul een naam voor de nieuwe organisatie in.", link: null };
    }
    const { data: organisatie, error } = await supabase
      .from("organisaties")
      .insert({ naam: input.nieuweOrganisatieNaam })
      .select("id")
      .single();
    if (error || !organisatie) {
      console.error("Aanmaken organisatie mislukt:", error && foutDetail(error));
      return {
        fout: `Aanmaken van de organisatie is niet gelukt.${error ? ` ${foutDetail(error)}` : ""}`,
        link: null,
      };
    }
    organisatieId = organisatie.id;
  }

  const { data: scanronde, error: scanrondeError } = await supabase
    .from("scanrondes")
    .insert({
      organisatie_id: organisatieId,
      naam: input.scanrondeNaam,
      email_verplicht: input.emailVerplicht,
    })
    .select("id")
    .single();
  if (scanrondeError || !scanronde) {
    console.error("Aanmaken scanronde mislukt:", scanrondeError && foutDetail(scanrondeError));
    return {
      fout: `Aanmaken van de scanronde is niet gelukt.${scanrondeError ? ` ${foutDetail(scanrondeError)}` : ""}`,
      link: null,
    };
  }

  let teamId: string | null = null;
  if (input.teamNaam) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ organisatie_id: organisatieId, naam: input.teamNaam })
      .select("id")
      .single();
    if (teamError) {
      console.error("Aanmaken team mislukt:", foutDetail(teamError));
      return {
        fout: `De scanronde is aangemaakt, maar het team niet: ${foutDetail(teamError)}`,
        link: null,
      };
    }
    teamId = team?.id ?? null;
  }

  const origin = await bepaalOrigin();
  const link = `${origin}/scan/${scanronde.id}${teamId ? `?team=${teamId}` : ""}`;

  revalidatePath("/beheer");
  return { fout: null, link };
}

export async function archiveerScanronde(scanrondeId: string): Promise<{ fout: string | null }> {
  const supabase = await supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) ingelogd. Log opnieuw in." };
  }

  // Soft delete: de link stopt meteen met werken (zie haalScanrondeContext),
  // maar de data blijft nog ARCHIEF_BEWAARTERMIJN_DAGEN staan zodat dit
  // hersteld kan worden bij een verkeerde klik.
  const { error } = await supabase
    .from("scanrondes")
    .update({ gearchiveerd_op: new Date().toISOString() })
    .eq("id", scanrondeId);
  if (error) {
    console.error("Archiveren scanronde mislukt:", foutDetail(error));
    return { fout: `Verwijderen is niet gelukt. ${foutDetail(error)}` };
  }

  revalidatePath("/beheer");
  return { fout: null };
}

export async function herstelScanronde(scanrondeId: string): Promise<{ fout: string | null }> {
  const supabase = await supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { fout: "Je bent niet (meer) ingelogd. Log opnieuw in." };
  }

  const { error } = await supabase
    .from("scanrondes")
    .update({ gearchiveerd_op: null })
    .eq("id", scanrondeId);
  if (error) {
    console.error("Herstellen scanronde mislukt:", foutDetail(error));
    return { fout: `Herstellen is niet gelukt. ${foutDetail(error)}` };
  }

  revalidatePath("/beheer");
  return { fout: null };
}

/**
 * Ruimt scanrondes op die langer dan ARCHIEF_BEWAARTERMIJN_DAGEN geleden
 * gearchiveerd zijn (definitieve delete, cascade naar respondenten/
 * antwoorden). Geen aparte cron in Wave 1 — wordt bij elke load van
 * /beheer aangeroepen ("opruimen bij bezoek"), voldoende voor het lage
 * bezoekvolume van deze pagina.
 */
export async function ruimVerlopenArchiefOp(): Promise<void> {
  const supabase = await supabaseServerClient();
  const grens = new Date();
  grens.setDate(grens.getDate() - ARCHIEF_BEWAARTERMIJN_DAGEN);

  const { error } = await supabase
    .from("scanrondes")
    .delete()
    .lt("gearchiveerd_op", grens.toISOString());
  if (error) {
    console.error("Opruimen verlopen archief mislukt:", foutDetail(error));
  }
}

export async function logout(): Promise<void> {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
  redirect("/beheer/login");
}
