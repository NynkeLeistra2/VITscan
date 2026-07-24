import { alleStellingen } from "@/lib/stellingen";
import { RapportScreen } from "@/components/rapport/RapportScreen";

function mockAntwoorden(): Record<string, number> {
  const stellingen = alleStellingen();
  const antwoorden: Record<string, number> = {};
  let seed = 7;
  for (const stelling of stellingen) {
    seed = (seed * 48271) % 2147483647;
    antwoorden[stelling.key] = 1 + (seed % 10);
  }
  return antwoorden;
}

export default function PreviewRapportPage() {
  return (
    <RapportScreen
      antwoorden={mockAntwoorden()}
      respondentCode="PREVIEW-01"
      naam=""
      organisatieNaam=""
    />
  );
}
