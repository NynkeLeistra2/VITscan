const BIJVOEGLIJK = [
  "vrolijke",
  "rustige",
  "scherpe",
  "warme",
  "heldere",
  "stevige",
  "zonnige",
  "frisse",
  "wijze",
  "dappere",
];

const ZELFSTANDIG = [
  "vos",
  "uil",
  "beer",
  "adelaar",
  "hert",
  "dolfijn",
  "vlinder",
  "leeuw",
  "kraanvogel",
  "otter",
];

/** Genereert een onthoudbare, anonieme respondentcode zonder naam of e-mail, bv. "warme-vos-42". */
export function genereerRespondentCode(): string {
  const bijvoeglijk = BIJVOEGLIJK[Math.floor(Math.random() * BIJVOEGLIJK.length)];
  const zelfstandig = ZELFSTANDIG[Math.floor(Math.random() * ZELFSTANDIG.length)];
  const getal = Math.floor(Math.random() * 90) + 10;
  return `${bijvoeglijk}-${zelfstandig}-${getal}`;
}
