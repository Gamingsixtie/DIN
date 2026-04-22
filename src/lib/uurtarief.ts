// Uurtarief-indexatie — eenvoudige compounding berekening.
// Default: basisTarief €70 (referentiejaar 2020) × 1.05^6 (naar 2026) ≈ €94.
// User prefereert iets hogere indexatie zodat begroting niet onderschat wordt.

export const DEFAULT_BASIS_TARIEF = 70;
export const DEFAULT_REFERENTIEJAAR = 2020;
export const DEFAULT_INDEXATIE_PCT = 0.05;

export function berekenGeindexeerdTarief(
  basis: number,
  referentiejaar: number,
  indexatiePct: number,
  huidigJaar: number
): number {
  const jaren = Math.max(0, huidigJaar - referentiejaar);
  return Math.round(basis * Math.pow(1 + indexatiePct, jaren));
}

/** Geeft een tarief per jaar over een reeks (handig voor meerjarige begroting). */
export function tariefPerJaar(
  basis: number,
  referentiejaar: number,
  indexatiePct: number,
  startJaar: number,
  aantalJaren: number
): Array<{ jaar: number; uurtarief: number }> {
  const result: Array<{ jaar: number; uurtarief: number }> = [];
  for (let i = 0; i < aantalJaren; i++) {
    const jaar = startJaar + i;
    result.push({ jaar, uurtarief: berekenGeindexeerdTarief(basis, referentiejaar, indexatiePct, jaar) });
  }
  return result;
}
