import { headers } from "next/headers";
import { supabaseServerClient } from "@/lib/supabase/server";
import { BeheerForm } from "./BeheerForm";
import { VerwijderScanrondeKnop } from "./VerwijderScanrondeKnop";
import { logout } from "./actions";

interface OrganisatieMetLijsten {
  id: string;
  naam: string;
  teams: { id: string; naam: string }[];
  scanrondes: { id: string; naam: string; email_verplicht: boolean }[];
}

export default async function BeheerPagina() {
  const supabase = await supabaseServerClient();
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const { data } = await supabase
    .from("organisaties")
    .select("id, naam, teams(id, naam), scanrondes(id, naam, email_verplicht)")
    .order("naam");

  const organisaties = (data ?? []) as OrganisatieMetLijsten[];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Beheer — VIT-scan</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-zinc-500 underline hover:text-zinc-700">
            Uitloggen
          </button>
        </form>
      </div>

      <h2 className="mt-8 text-lg font-medium text-zinc-900">Nieuwe scanronde</h2>
      <BeheerForm organisaties={organisaties.map(({ id, naam }) => ({ id, naam }))} />

      <h2 className="mt-10 text-lg font-medium text-zinc-900">Bestaande links</h2>
      {organisaties.length === 0 && (
        <p className="mt-2 text-sm text-zinc-500">Nog geen organisaties.</p>
      )}
      <div className="mt-4 space-y-6">
        {organisaties.map((org) => (
          <div key={org.id} className="rounded-lg border border-zinc-200 p-4">
            <p className="font-medium text-zinc-900">{org.naam}</p>
            {org.scanrondes.length === 0 && (
              <p className="mt-1 text-sm text-zinc-500">Nog geen scanronde.</p>
            )}
            <ul className="mt-2 space-y-3">
              {org.scanrondes.map((ronde) => (
                <li key={ronde.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-zinc-700">
                      {ronde.naam}
                      {ronde.email_verplicht && (
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                          e-mail verplicht
                        </span>
                      )}
                    </p>
                    <VerwijderScanrondeKnop scanrondeId={ronde.id} scanrondeNaam={ronde.naam} />
                  </div>
                  <LinkRegel url={`${origin}/scan/${ronde.id}`} label="Algemene link" />
                  {org.teams.map((team) => (
                    <LinkRegel
                      key={team.id}
                      url={`${origin}/scan/${ronde.id}?team=${team.id}`}
                      label={`Team ${team.naam}`}
                    />
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkRegel({ url, label }: { url: string; label: string }) {
  return (
    <p className="mt-1 break-all font-mono text-xs text-zinc-500">
      {label}: <span className="text-zinc-700">{url}</span>
    </p>
  );
}
