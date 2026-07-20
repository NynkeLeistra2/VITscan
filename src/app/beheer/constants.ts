// "Verwijderen" is een soft delete: eerst dertig dagen in het archief
// (herstelbaar), pas daarna definitief weg — op verzoek van Nynke, als
// vangnet tegen een verkeerde klik. Losstaand bestand: een "use server"-
// module (zie actions.ts) mag alleen async functies exporteren, geen
// constantes.
export const ARCHIEF_BEWAARTERMIJN_DAGEN = 30;
