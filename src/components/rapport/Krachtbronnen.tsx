import { algemeen, type KrachtbronnenBlok } from "@/lib/rapportteksten";

interface KrachtbronnenProps {
  blok: KrachtbronnenBlok;
}

export function Krachtbronnen({ blok }: KrachtbronnenProps) {
  return (
    <div className="mt-8 rounded-lg border border-brand-salie/50 bg-brand-ecru p-6">
      <h2 className="font-semibold text-zinc-900">{algemeen.krachtbronnen.titel}</h2>
      <p className="mt-2 text-sm text-zinc-700">{blok.themaRegel}</p>
      <p className="mt-3 text-zinc-700">{blok.tekst}</p>
      <p className="mt-4 font-medium text-zinc-900">Om over na te denken</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
        <li>{blok.vraag}</li>
      </ul>
    </div>
  );
}
