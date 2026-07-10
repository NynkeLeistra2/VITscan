import { haalScanrondeContext } from "@/lib/supabase/scanronde";
import { ScanFlow } from "@/components/scan/ScanFlow";

interface ScanPageProps {
  params: Promise<{ scanrondeId: string }>;
  searchParams: Promise<{ team?: string }>;
}

export default async function ScanPage({ params, searchParams }: ScanPageProps) {
  const { scanrondeId } = await params;
  const { team } = await searchParams;

  const context = await haalScanrondeContext(scanrondeId, team ?? null);

  if (!context) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          Deze link is niet (meer) geldig
        </h1>
        <p className="mt-3 max-w-sm text-zinc-600">
          Controleer of je de juiste link hebt, of vraag een nieuwe aan bij je
          leidinggevende, HR of Nynke Leistra.
        </p>
      </div>
    );
  }

  return <ScanFlow context={context} />;
}
