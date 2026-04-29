// Parser voor dossierKostenraming-tekst uit business-case Q&A.
// Doel: voorkomen dat de begrotings-AI dossier-bedragen comprimeert om in
// jaarlijksBudget × aantalJaren te passen. We berekenen server-side het
// realistische totaal (eenmalig + structureel × jaren) en forceren
// aantalJaren = ceil(totaal / jaarlijksBudget) — bedragen blijven heilig.

export interface ParsedDossierRaming {
  eenmaligLow: number;
  eenmaligHigh: number;
  eenmaligMid: number;
  structureelLowPerJr: number;
  structureelHighPerJr: number;
  structureelMidPerJr: number;
  /** True als parser niets vond — dan is fallback op kwalitatieve schatting nodig. */
  unparsed: boolean;
  /** Originele tekst voor debug / logging. */
  source: string;
}

/**
 * Convert een Nederlands euro-bedrag naar integer.
 * Ondersteunt: "€550K", "€125.000", "975K", "1,5M", "60K".
 */
function parseEuroToken(token: string): number {
  const cleaned = token.replace(/[€\s.]/g, "").replace(",", ".");
  if (/[Kk]$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/[Kk]$/, "")) * 1000);
  }
  if (/[Mm]$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/[Mm]$/, "")) * 1_000_000);
  }
  // Pure cijfers (NL duizendtal-punten zijn al verwijderd)
  return Math.round(parseFloat(cleaned));
}

/**
 * Vind alle euro-bandbreedtes (low-high) in tekst, met index zodat
 * context (woorden eromheen) opgehaald kan worden.
 *
 * Matcht: "€550K–€750K", "€125.000–€160.000", "€75.000 – €100.000".
 */
function findRanges(text: string): Array<{ low: number; high: number; index: number; raw: string }> {
  // Bedrag-pattern: € optioneel, getal met punten/komma's, optioneel K/M.
  const numberPart = "(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d+)?[KkMm]?";
  const re = new RegExp(
    `€\\s*(${numberPart})\\s*[–\\-]\\s*€?\\s*(${numberPart})`,
    "g"
  );
  const out: Array<{ low: number; high: number; index: number; raw: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const low = parseEuroToken(m[1]);
    const high = parseEuroToken(m[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high > 0) {
      out.push({ low: Math.min(low, high), high: Math.max(low, high), index: m.index, raw: m[0] });
    }
  }
  return out;
}

/**
 * Bepaal of een range "structureel per jaar" is op basis van context-woorden
 * in een venster van ~80 tekens vóór en ná de match.
 */
function isStructureelPerJaar(text: string, index: number, raw: string): boolean {
  const startNa = index + raw.length;
  const eindNa = Math.min(text.length, startNa + 30);
  const na = text.slice(startNa, eindNa).toLowerCase();
  return /\bper\s*jaar\b|\/\s*(?:jaar|jr)\b|\bp\.\s*j\.\b/.test(na);
}

/**
 * Hoofdfunctie: parse een dossier-kostenraming-tekst.
 *
 * Heuristiek:
 *  - Eerste range = eenmalig totaal (over de looptijd)
 *  - Ranges met "per jaar"-context = structureel/jr
 *  - Overige uitsplitsingen worden genegeerd (zouden anders dubbeltellen)
 */
export function parseDossierRaming(text: string | undefined | null): ParsedDossierRaming {
  const source = (text ?? "").trim();
  const empty: ParsedDossierRaming = {
    eenmaligLow: 0,
    eenmaligHigh: 0,
    eenmaligMid: 0,
    structureelLowPerJr: 0,
    structureelHighPerJr: 0,
    structureelMidPerJr: 0,
    unparsed: true,
    source,
  };
  if (!source) return empty;

  const ranges = findRanges(source);
  if (ranges.length === 0) return empty;

  // Splits in structureel-per-jaar vs eenmalig (eerste niet-structurele = totaal)
  const structureel = ranges.filter((r) => isStructureelPerJaar(source, r.index, r.raw));
  const eenmaligCandidates = ranges.filter((r) => !isStructureelPerJaar(source, r.index, r.raw));

  const eenmalig = eenmaligCandidates[0]; // eerste = totaal
  const struc = structureel[0]; // eerste = structureel/jr

  const eenmaligLow = eenmalig?.low ?? 0;
  const eenmaligHigh = eenmalig?.high ?? 0;
  const structureelLowPerJr = struc?.low ?? 0;
  const structureelHighPerJr = struc?.high ?? 0;

  return {
    eenmaligLow,
    eenmaligHigh,
    eenmaligMid: Math.round((eenmaligLow + eenmaligHigh) / 2),
    structureelLowPerJr,
    structureelHighPerJr,
    structureelMidPerJr: Math.round((structureelLowPerJr + structureelHighPerJr) / 2),
    unparsed: !eenmalig && !struc,
    source,
  };
}

/**
 * Bereken totaal benodigd budget voor een set inspanningen, gegeven het
 * aantal jaren waarin structurele kosten meelopen.
 *
 * Eenmalig wordt 1× geteld; structureel × structureleJaren (typisch =
 * aantalJaren - 1, want het laatste jaar is meestal afronding/borging).
 */
export function totaalBenodigdBudget(
  ramingen: ParsedDossierRaming[],
  structureleJaren: number,
  variant: "low" | "mid" | "high" = "mid"
): number {
  let totaal = 0;
  for (const r of ramingen) {
    const eenmalig =
      variant === "low" ? r.eenmaligLow : variant === "high" ? r.eenmaligHigh : r.eenmaligMid;
    const structureelPerJr =
      variant === "low"
        ? r.structureelLowPerJr
        : variant === "high"
        ? r.structureelHighPerJr
        : r.structureelMidPerJr;
    totaal += eenmalig + structureelPerJr * Math.max(0, structureleJaren);
  }
  return totaal;
}

/**
 * Bereken minimaal aantal jaren dat nodig is om alle inspanningen volledig
 * binnen het jaarlijks budget te realiseren. Iteratief: bij meer jaren lopen
 * structurele kosten ook langer door, dus dit moet convergeren.
 *
 * Cap op `maxJaren` — daarboven betekent het dat budget structureel te krap is.
 */
export function berekenMinimumJaren(
  ramingen: ParsedDossierRaming[],
  jaarlijksBudgetEuro: number,
  variant: "low" | "mid" | "high" = "mid",
  maxJaren: number = 15
): { jaren: number; totaalEuro: number; capped: boolean } {
  if (jaarlijksBudgetEuro <= 0) return { jaren: maxJaren, totaalEuro: 0, capped: true };
  // Start met 2 jaar en verhoog tot het past
  for (let n = 2; n <= maxJaren; n++) {
    const totaal = totaalBenodigdBudget(ramingen, n - 1, variant); // structureel loopt n-1 jaar mee
    const benodigdPerJaarGemiddeld = totaal / n;
    if (benodigdPerJaarGemiddeld <= jaarlijksBudgetEuro) {
      return { jaren: n, totaalEuro: totaal, capped: false };
    }
  }
  // Niet gevonden binnen cap
  const totaalCapped = totaalBenodigdBudget(ramingen, maxJaren - 1, variant);
  return { jaren: maxJaren, totaalEuro: totaalCapped, capped: true };
}

/**
 * Genereer een bondige Nederlandstalige uitleg over budget-haalbaarheid.
 * Wordt getoond als banner als optimaal-scenario gecapt zou worden of als
 * jaarlijksBudget onvoldoende is om binnen redelijke termijn af te ronden.
 */
export function budgetAdvies(opts: {
  jaarlijksBudgetEuro: number;
  ramingen: Array<{ titel: string; raming: ParsedDossierRaming }>;
  doelJaren?: number; // standaard 5 — wat de gebruiker waarschijnlijk wil
}): {
  totaalRealistisch: number;
  benodigdJaarlijksVoorDoeltermijn: number;
  tekortPerJaar: number;
  uitlegMd: string;
  meestKostbareInspanning?: { titel: string; eenmaligLow: number; eenmaligHigh: number };
} {
  const doelJaren = opts.doelJaren ?? 5;
  const ramingen = opts.ramingen.map((x) => x.raming);
  const totaalMid = totaalBenodigdBudget(ramingen, doelJaren - 1, "mid");
  const totaalLow = totaalBenodigdBudget(ramingen, doelJaren - 1, "low");

  const benodigdPerJaar = Math.ceil(totaalMid / doelJaren / 1000) * 1000;
  const tekort = Math.max(0, benodigdPerJaar - opts.jaarlijksBudgetEuro);

  // Vind grootste eenmalige post (meestal CRM/data) — onderbouwt het advies
  const sorted = [...opts.ramingen].sort(
    (a, b) => b.raming.eenmaligMid - a.raming.eenmaligMid
  );
  const top = sorted[0];

  const uitlegMd = [
    `**Realistisch totaal**: €${totaalMid.toLocaleString("nl-NL")} (ondergrens €${totaalLow.toLocaleString("nl-NL")}) over ${doelJaren} jaar.`,
    `Bij €${opts.jaarlijksBudgetEuro.toLocaleString("nl-NL")}/jaar duurt afronding **${Math.ceil(totaalMid / opts.jaarlijksBudgetEuro)} jaar**.`,
    `Voor afronding in ${doelJaren} jaar is **€${benodigdPerJaar.toLocaleString("nl-NL")}/jaar** nodig — dat is **€${tekort.toLocaleString("nl-NL")}/jaar méér** dan het huidige budget.`,
    top
      ? `Hoofdoorzaak: **${top.titel}** kost alleen al €${top.raming.eenmaligLow.toLocaleString("nl-NL")}–€${top.raming.eenmaligHigh.toLocaleString("nl-NL")} eenmalig${top.raming.structureelMidPerJr > 0 ? ` plus €${top.raming.structureelLowPerJr.toLocaleString("nl-NL")}–€${top.raming.structureelHighPerJr.toLocaleString("nl-NL")}/jaar structureel` : ""}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    totaalRealistisch: totaalMid,
    benodigdJaarlijksVoorDoeltermijn: benodigdPerJaar,
    tekortPerJaar: tekort,
    uitlegMd,
    meestKostbareInspanning: top
      ? {
          titel: top.titel,
          eenmaligLow: top.raming.eenmaligLow,
          eenmaligHigh: top.raming.eenmaligHigh,
        }
      : undefined,
  };
}
