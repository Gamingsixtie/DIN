// Hulpmiddel voor weergave in Stap 8 (BerekeningenStep). Doet GEEN
// component-extractie tot een tabel — die is onbetrouwbaar omdat motivatie-
// tekst proza is met samenvattingen + uitsplitsingen door elkaar (dubbel-
// tellingen onvermijdelijk).
//
// In plaats daarvan: detecteer alle euro-bedragen + per-jaar-markeringen
// zodat de UI ze visueel kan markeren in de tekst. Dat is eerlijk:
// stuurgroep ziet exact welke getallen de AI heeft genoemd, zonder
// kunstmatige reconstructie van een componenten-tabel.

export interface EuroMatch {
  /** Volledige match-tekst, bv. "€ 37.500" of "€ 55.000–€ 70.000". */
  raw: string;
  /** Lage waarde (= mid als geen bereik). */
  low: number;
  /** Hoge waarde. */
  high: number;
  /** Begin-index in de bron-tekst. */
  index: number;
  /** Lengte in tekens. */
  length: number;
  /** Direct na het bedrag: "per jaar" / "/jaar" / "/jr" / "p.j." */
  isPerJaar: boolean;
  /** "Vanaf jaar N" gevonden in directe omgeving. */
  vanafJaar: number | null;
}

/** Parse Nederlands euro-token naar integer. */
function parseEuro(token: string): number {
  const cleaned = token.replace(/[€\s.]/g, "").replace(",", ".");
  if (/[Kk]$/.test(cleaned)) return Math.round(parseFloat(cleaned.replace(/[Kk]$/, "")) * 1000);
  if (/[Mm]$/.test(cleaned)) return Math.round(parseFloat(cleaned.replace(/[Mm]$/, "")) * 1_000_000);
  return Math.round(parseFloat(cleaned));
}

/** Vind alle euro-bedragen in een tekst, met context-info. */
export function findEuroMatches(text: string): EuroMatch[] {
  if (!text) return [];
  const numberPart = "(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d+)?[KkMm]?";
  const reRange = new RegExp(`€\\s*(${numberPart})\\s*[–\\-—]\\s*€?\\s*(${numberPart})`, "g");
  const reSingle = new RegExp(`€\\s*(${numberPart})`, "g");

  const out: EuroMatch[] = [];

  let m: RegExpExecArray | null;
  while ((m = reRange.exec(text)) !== null) {
    const low = parseEuro(m[1]);
    const high = parseEuro(m[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high > 0) {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 50);
      const isPerJaar = /^[\s]*(?:per\s*jaar|\/\s*(?:jaar|jr)|p\.\s*j\.)/i.test(after);
      const around = text.slice(Math.max(0, m.index - 80), Math.min(text.length, m.index + m[0].length + 80));
      const vanafMatch = around.match(/vanaf\s+jaar\s+(\d+)/i);
      out.push({
        raw: m[0],
        low: Math.min(low, high),
        high: Math.max(low, high),
        index: m.index,
        length: m[0].length,
        isPerJaar,
        vanafJaar: vanafMatch ? parseInt(vanafMatch[1], 10) : null,
      });
    }
  }

  while ((m = reSingle.exec(text)) !== null) {
    const overlaps = out.some((r) => m!.index >= r.index && m!.index < r.index + r.length);
    if (overlaps) continue;
    const v = parseEuro(m[1]);
    if (!Number.isFinite(v) || v <= 0) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 50);
    const isPerJaar = /^[\s]*(?:per\s*jaar|\/\s*(?:jaar|jr)|p\.\s*j\.)/i.test(after);
    const around = text.slice(Math.max(0, m.index - 80), Math.min(text.length, m.index + m[0].length + 80));
    const vanafMatch = around.match(/vanaf\s+jaar\s+(\d+)/i);
    out.push({
      raw: m[0],
      low: v,
      high: v,
      index: m.index,
      length: m[0].length,
      isPerJaar,
      vanafJaar: vanafMatch ? parseInt(vanafMatch[1], 10) : null,
    });
  }

  return out.sort((a, b) => a.index - b.index);
}

/** Splits motivatie in inleiding + dossier-onderbouwing. */
export function splitMotivatie(motivatie: string): {
  inleiding: string;
  onderbouwing: string;
} {
  const idx = motivatie.search(/Dossier[-\s]onderbouwing:/i);
  if (idx === -1) return { inleiding: motivatie.trim(), onderbouwing: "" };
  return {
    inleiding: motivatie.slice(0, idx).trim(),
    onderbouwing: motivatie
      .slice(idx)
      .replace(/^Dossier[-\s]onderbouwing:\s*/i, "")
      .trim(),
  };
}

/**
 * Render een tekst-fragment als HTML-vriendelijke segmenten waarin euro-
 * bedragen visueel gemarkeerd kunnen worden. UI gebruikt dit om de tekst
 * te tonen met inline highlights voor elke €X.
 */
export interface TextSegment {
  /** Type: tekst of euro-bedrag. */
  type: "text" | "euro";
  /** De inhoud. */
  content: string;
  /** Voor euro-segmenten: parsed waarde + per-jaar info. */
  euro?: EuroMatch;
}

export function segmentText(text: string): TextSegment[] {
  if (!text) return [];
  const matches = findEuroMatches(text);
  if (matches.length === 0) return [{ type: "text", content: text }];

  const out: TextSegment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) {
      out.push({ type: "text", content: text.slice(cursor, m.index) });
    }
    out.push({ type: "euro", content: m.raw, euro: m });
    cursor = m.index + m.length;
  }
  if (cursor < text.length) {
    out.push({ type: "text", content: text.slice(cursor) });
  }
  return out;
}

// ============================================================================
// parseBreakdown — extraheer hoofdtotaal + sub-componenten met Σ-check
// ============================================================================
//
// Doel: voor een kostenraming/motivatie-tekst de logische opbouw vinden:
//   - hoofdtotaal eenmalig (eerste range vóór "structureel"-marker)
//   - hoofdtotaal structureel/jr (eerste range ná "structureel"-marker)
//   - per blok: sub-componenten (genoemde bedragen vóór omsluitend einde)
//   - filter "bevestigende" bedragen: "(mid €X)", "(middenpunt €X)",
//     "(circa €X)", "(p.m. €X)" — die zijn niet additief
//   - filter "context"-bedragen: nadrukkelijk in haakjes met context-woorden
//     zoals "(85 gebruikers ... ~€63K)" — die zijn deel van de uitsplitsing
//   - filter "worst-case-plafond"-bedragen
//
// Σ-check: |hoofdtotaal − Σsubs| moet redelijk klein zijn. Het verschil
// wordt gerapporteerd als "buffer / overhead" en uitgelegd in de UI.

export interface BreakdownComponent {
  /** Korte beschrijving (~tekst vóór het bedrag, geknipt op leesbaarheid). */
  naam: string;
  /** Lage waarde (= mid als geen bereik). */
  bedragLow: number;
  /** Hoge waarde. */
  bedragHigh: number;
  /** Onbewerkt bedrag-tekst. */
  bedragRaw: string;
  /** Voor structureel: per jaar; anders eenmalig. */
  isPerJaar: boolean;
  /** "Vanaf jaar N" als gevonden. */
  vanafJaar: number | null;
  /** Berekening / formule indien herkenbaar uit de tekst — bijvoorbeeld
   *  "20 dagen × € 800 (Cito-benchmark)" of "85 medewerkers". */
  formule: string | null;
  /** Volledig fragment voor debug/UI-tooltip. */
  rauwFragment: string;
}

export interface BreakdownSection {
  /** "Eenmalig" of "Structureel per jaar". */
  label: "eenmalig" | "structureel";
  /** Hoofdtotaal-bandbreedte. */
  hoofdtotaalLow: number;
  hoofdtotaalHigh: number;
  /** Sub-componenten waarvan bedragen zijn herkend. */
  subComponenten: BreakdownComponent[];
  /** Σ van sub-componenten (low / high). */
  somSubsLow: number;
  somSubsHigh: number;
  /** Verschil hoofdtotaal − Σsubs (positief = buffer/overhead, negatief = subs > hoofd). */
  bufferLow: number;
  bufferHigh: number;
  /** Σ-check: verschil < 25% van hoofdtotaal én > 0 (= positieve buffer = OK). */
  sluitNetjesAan: boolean;
  /** Tekst-fragment van dit deel. */
  rauwTekst: string;
  /**
   * Letterlijke buffer-context als de bron-tekst die noemt
   * (bv. "PM-buffer van 30% (worst-case plafond circa €830K)" voor CRM).
   * Null als de tekst geen expliciete buffer-vermelding bevat.
   */
  bufferContext: string | null;
}

export interface ParsedBreakdown {
  eenmalig: BreakdownSection | null;
  structureel: BreakdownSection | null;
  /** True als geen enkele section iets opleverde. */
  unparsed: boolean;
}

/** Detecteer of een euro-match "bevestigend" is (geen additieve sub-component). */
function isBevestigendBedrag(text: string, m: EuroMatch): boolean {
  const before = text.slice(Math.max(0, m.index - 30), m.index);
  // Patronen die wijzen op bevestiging i.p.v. additie:
  //   "(middenpunt circa €X)" / "(mid €X)" / "(midden €X)" / "(circa €X)"
  //   "ca. €X" / "circa €X" alleen valt niet onder bevestiging
  if (/\(\s*(?:middenpunt|midden|mid)\s+(?:circa\s+)?$/i.test(before)) return true;
  if (/\(\s*(?:p\.m\.|pm)\s+$/i.test(before)) return true;
  // "naar boven afgerond €X" / "afgerond €X" / "totaal €X" — vaak samenvattend
  if (/(?:naar\s+boven\s+)?afgerond\s+$/i.test(before)) return true;
  return false;
}

/** Detecteer "worst-case plafond"-bedragen die geen additieve sub zijn. */
function isWorstCaseBedrag(text: string, m: EuroMatch): boolean {
  const before = text.slice(Math.max(0, m.index - 60), m.index);
  if (/worst[-\s]case\s+plafond\s+(?:circa\s+)?$/i.test(before)) return true;
  if (/maximaal[-\s]plafond\s+(?:circa\s+)?$/i.test(before)) return true;
  return false;
}

/** Knip een naam-fragment af op leesbare lengte. */
function knipContext(rawNaam: string): string {
  let n = rawNaam.trim();
  // Verwijder leading prefixes iteratief — er kunnen er meerdere zijn
  for (let i = 0; i < 5; i++) {
    const before = n;
    n = n
      .replace(/^[,;:.()\s—–-]+/, "")
      // Trigger-woorden uit de begroting-prompt:
      .replace(/^(?:de\s+)?(?:totale|eenmalige?|structurele?)\s+(?:out-of-pocket\s+)?(?:kosten\s+)?/i, "")
      .replace(/^(?:kosten\s+)?(?:omvat(?:ten)?|bestaat(?:\s+uit)?|bestaande\s+uit|dit\s+omvat|waaronder|waarvan(?:\s+circa)?|inclusief|incl\.?)\s+/i, "")
      // Filler-woorden
      .replace(/^(?:en|plus|of|met|voor|via|aan|op|bij|tot)\s+/i, "")
      // Vage prefixen
      .replace(/^(?:circa|ca\.?|±|~|p\.m\.|pm)\s+/i, "")
      // Article
      .replace(/^(?:de|het|een)\s+/i, "")
      // NB-prefix (interne uren / opportunity-kosten)
      .replace(/^NB[:\s]+/i, "");
    if (n === before) break;
  }
  n = n.replace(/[,;:.\s—–-]+$/, "").trim();
  // Geen afkapping meer — directeur wil de hele naam zien, niet "training en
  // adoptie-begeleiding voor 85 medewerkers inclusief externe…".
  return n;
}

/** Pak de tekst-context vóór een euro-match (= component-naam). */
function vindNaamVoorEuro(text: string, euroIdx: number, vorigEinde: number): string {
  const start = Math.max(vorigEinde, 0);
  const slice = text.slice(start, euroIdx);
  // Knip op laatste echte scheidingsteken: ", " | "; " | " (" | " — " | ". " | " en " | " plus "
  const splits = [...slice.matchAll(/[,;]\s+|\s+\(|\s+—\s+|\.\s+|\s+en\s+|\s+plus\s+/gi)];
  if (splits.length === 0) return knipContext(slice);
  const last = splits[splits.length - 1];
  const naam = slice.slice((last.index ?? 0) + last[0].length);
  return knipContext(naam);
}

/**
 * Extract een formule/berekening uit de tekst rondom een sub-component.
 *
 * Voorbeelden van patronen:
 *   - "20 dagen × € 800 (Cito-benchmark)"   → expliciete formule
 *   - "9 lg × € 4.000"                       → expliciete formule
 *   - "twee blokken à circa € 31.500"        → à-variant
 *   - "85 medewerkers"                       → alleen aantal-cue
 *   - "1.500-2.500 consultanturen"           → alleen aantal-cue (range)
 */
function extractFormule(
  naam: string,
  haakInhoud: string,
  omgeving: string,
): string | null {
  void omgeving; // omgeving niet meer gebruikt — voorkomt lekkage van formules tussen sub-componenten
  const eenheden =
    "dagen?|uur|uren|maanden|gebruikers?|medewerkers?|deelnemers?|leidinggevenden?|lg|personen|integraties?|sessies?|kringen|blokken|FTE|fte|stuks?|consultanturen|trainers?|sectoren?|klantgesprekken|klanten";
  // Zoekgebieden in volgorde van prioriteit (alleen naam + haakInhoud,
  // niet de bredere omgeving — anders lekken formules van naburige subs)
  const bronnen = [naam, haakInhoud];

  // Patroon 1: "X (range mogelijk) eenheid × € Y" — expliciete multiplicatie
  const reMultExpliciet = new RegExp(
    `(\\d+(?:[.,]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?)\\s+(${eenheden})\\b\\s*[×x]\\s*€\\s*([\\d.,Kk]+(?:\\s*[-–]\\s*€?\\s*[\\d.,Kk]+)?)`,
    "i",
  );
  for (const tekst of bronnen) {
    const m = tekst.match(reMultExpliciet);
    if (m) return `${m[1]} ${m[2]} × € ${m[3]}`;
  }

  // Patroon 2: "X eenheid à € Y" / "X eenheid à circa € Y"
  const reAVariant = new RegExp(
    `(\\d+(?:[.,]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?|twee|drie|vier|vijf|zes|zeven|acht|negen|tien)\\s+(${eenheden})\\s+à\\s+(?:circa\\s+)?€\\s*([\\d.,Kk]+)`,
    "i",
  );
  for (const tekst of bronnen) {
    const m = tekst.match(reAVariant);
    if (m) return `${m[1]} ${m[2]} à € ${m[3]}`;
  }

  // Patroon 3: alleen aantal-cue (bv. "85 medewerkers", "1.500-2.500 consultanturen")
  const reAantal = new RegExp(
    `(\\d+(?:[.,]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?)\\s+(${eenheden})\\b`,
    "i",
  );
  for (const tekst of bronnen) {
    const m = tekst.match(reAantal);
    if (m) {
      // Probeer ook een tarief-cue uit de omgeving op te pikken
      const reTarief = new RegExp(
        `€\\s*([\\d.,Kk]+(?:\\s*[-–]\\s*€?\\s*[\\d.,Kk]+)?)\\s*\\/\\s*(dag|uur|gebruiker|medewerker|maand|jaar|persoon|stuk|blok)`,
        "i",
      );
      const tariefM = haakInhoud.match(reTarief) ?? omgeving.match(reTarief);
      if (tariefM) {
        return `${m[1]} ${m[2]} × € ${tariefM[1]}/${tariefM[2]}`;
      }
      return `${m[1]} ${m[2]}`;
    }
  }

  // Patroon 4: "X maanden × € Y/maand" / "X tot Y maanden" met dagprijs
  const reMaanden = /(\d+(?:[-–]\d+)?)\s*(?:tot\s+)?(\d+\s+)?maanden?/i;
  for (const tekst of bronnen) {
    const m = tekst.match(reMaanden);
    if (m) return `${m[0]}`;
  }

  return null;
}

/** Splits tekst in eenmalig + structureel deel op marker-woord. */
function splitsBlokken(text: string): { eenmalig: string; structureel: string } {
  // Multiple markers possible. Pak de eerste die voorafgaat door punt/puntkomma:
  // "; structureel ..." / ". Structureel ..." / ", plus structureel ..."
  // Negeer "structureel" wanneer als bijvoeglijk naamwoord vóór een ander woord
  const re = /[;.]\s+(?:plus\s+)?(?=[Ss]tructureel\b)|,?\s+plus\s+(?=[Ss]tructureel\b)/g;
  const m = re.exec(text);
  if (!m || m.index === undefined) {
    return { eenmalig: text, structureel: "" };
  }
  return {
    eenmalig: text.slice(0, m.index).trim(),
    structureel: text.slice(m.index + m[0].length).trim(),
  };
}

/**
 * Detecteer of een haakjes-fragment een sub-component is i.p.v. een
 * bevestiging / interne-uren-aftrek / worst-case.
 */
function isSubComponentHaakje(haakInhoud: string): boolean {
  const inhoud = haakInhoud.toLowerCase();
  // Bevestigend (niet-additief)
  if (/\b(?:middenpunt|midden|mid)\b/.test(inhoud)) return false;
  // Worst-case plafond
  if (/worst[-\s]case|maximaal[-\s]plafond/.test(inhoud)) return false;
  // Interne-uren-aftrek (uit "NB:" zinnen)
  if (/(?:opportunity[-\s]kosten|interne\s+uren|interne\s+capaciteit|schaduwkosten)/.test(inhoud)) return false;
  // Moet wél een euro bevatten
  if (!/€/.test(inhoud)) return false;
  return true;
}

/**
 * Bouw een BreakdownSection uit een tekst-blok via haakjes-detection.
 *
 * Strategie:
 *   1. Pak hoofdtotaal = eerste bedrag dat NIET tussen haakjes staat
 *      (= inline range "€455K – €680K", niet "(€250K)").
 *   2. Sub-componenten = elk "naam (€bedrag)"-patroon, met naam = tekst
 *      vóór de haak (geknipt op laatste komma/" en "/" plus ").
 *   3. Filter haakjes met "middenpunt", "worst-case", "opportunity-kosten",
 *      "interne uren" — die zijn niet additief.
 */
function bouwSection(
  blok: string,
  label: "eenmalig" | "structureel",
): BreakdownSection | null {
  if (!blok.trim()) return null;

  // Stap 1: vind hoofdtotaal = eerste bedrag dat NIET binnen haakjes valt
  const allEuros = findEuroMatches(blok);
  if (allEuros.length === 0) return null;

  // Bouw lijst van haak-ranges in de tekst
  const haakRanges: Array<{ start: number; end: number; inhoud: string }> = [];
  const haakRe = /\(([^()]+)\)/g;
  let hm: RegExpExecArray | null;
  while ((hm = haakRe.exec(blok)) !== null) {
    haakRanges.push({ start: hm.index, end: hm.index + hm[0].length, inhoud: hm[1] });
  }
  function valtBinnenHaak(idx: number): number {
    return haakRanges.findIndex((h) => idx >= h.start && idx < h.end);
  }

  // Hoofdtotaal: eerste euro NIET in haak, NIET bevestigend, NIET worst-case
  const hoofd = allEuros.find(
    (e) =>
      valtBinnenHaak(e.index) === -1 &&
      !isBevestigendBedrag(blok, e) &&
      !isWorstCaseBedrag(blok, e),
  );
  if (!hoofd) return null;

  // Stap 2: sub-componenten via haakjes-patronen.
  // We loopen door de haakjes in volgorde en gebruiken `prevHaakEnd` zodat
  // de naam vóór een haak alleen wordt gepakt uit de tekst tussen de vorige
  // haak en de huidige — zo voorkomen we dat eerdere onderdelen in de naam
  // van een latere component lekken.
  const subComponenten: BreakdownComponent[] = [];
  let prevHaakEnd = 0;
  for (const haak of haakRanges) {
    const isSubHaak = isSubComponentHaakje(haak.inhoud);
    if (!isSubHaak) {
      // Bij niet-sub-haakje (bv. middenpunt/worst-case): update prevHaakEnd
      // zodat de NEXT sub-naam niet uit dit haakje pakt.
      prevHaakEnd = haak.end;
      continue;
    }

    const eurosInHaak = findEuroMatches(haak.inhoud);
    if (eurosInHaak.length === 0) {
      prevHaakEnd = haak.end;
      continue;
    }
    const e = eurosInHaak[0];

    // Naam = tekst tussen prevHaakEnd en haak.start, geknipt op laatste
    // komma/puntkomma/" plus "/period/em-dash. NIET op " en " (anders raak je
    // delen kwijt zoals "implementatie en dashboardbouw").
    const voorHaak = blok.slice(prevHaakEnd, haak.start).replace(/[\s,;]+$/, "");
    const splitMatches = [...voorHaak.matchAll(/[,;]\s+|\s+plus\s+|\.\s+|\s+—\s+|\s+–\s+/gi)];
    const naamStart = splitMatches.length
      ? (splitMatches[splitMatches.length - 1].index ?? 0) +
        splitMatches[splitMatches.length - 1][0].length
      : 0;
    const rawNaam = voorHaak.slice(naamStart).trim();
    const naam = knipContext(rawNaam);
    prevHaakEnd = haak.end;
    if (!naam) continue;

    // Vanaf-jaar detectie in directe omgeving (kan ook BUITEN haak staan)
    const around = blok.slice(
      Math.max(0, haak.start - 60),
      Math.min(blok.length, haak.end + 30),
    );
    const vanafMatch = around.match(/vanaf\s+jaar\s+(\d+)/i);
    const vanafJaar = vanafMatch ? parseInt(vanafMatch[1], 10) : e.vanafJaar;

    // Formule-detectie: zoek "X eenheid × € Y", "X eenheid à € Y", of
    // alleen "X eenheid" (= aantal-cue) in de naam + haak-inhoud.
    const formule = extractFormule(naam, haak.inhoud, around);

    subComponenten.push({
      naam,
      bedragLow: e.low,
      bedragHigh: e.high,
      bedragRaw: e.raw,
      isPerJaar: e.isPerJaar || label === "structureel",
      vanafJaar,
      formule,
      rauwFragment: blok.slice(Math.max(0, haak.start - 60), haak.end).trim(),
    });
  }

  // Σ-check
  const somSubsLow = subComponenten.reduce((s, c) => s + c.bedragLow, 0);
  const somSubsHigh = subComponenten.reduce((s, c) => s + c.bedragHigh, 0);
  const bufferLow = hoofd.low - somSubsLow;
  const bufferHigh = hoofd.high - somSubsHigh;

  // Σ-check: subs moeten ongeveer kloppen met hoofdtotaal. Buffer (positief
  // of klein-negatief) binnen 25% = "sluit netjes aan".
  const grootste = Math.max(Math.abs(bufferLow), Math.abs(bufferHigh));
  const ref = (hoofd.low + hoofd.high) / 2;
  const sluitNetjesAan =
    ref > 0 && subComponenten.length > 0 && grootste <= ref * 0.25 && bufferLow >= -ref * 0.05;

  // Buffer-context detectie: zoek expliciete buffer-vermeldingen in de tekst.
  // Bv. "met een PM-buffer van 30%" / "buffer van X%" / "worst-case plafond €Y"
  let bufferContext: string | null = null;
  const bufferRegexes: RegExp[] = [
    /met\s+(?:een\s+)?PM[-\s]?buffer\s+van\s+(\d+(?:[.,]\d+)?)\s*%[^.]*\([^)]*€[^)]+\)/i,
    /met\s+(?:een\s+)?PM[-\s]?buffer\s+van\s+(\d+(?:[.,]\d+)?)\s*%/i,
    /met\s+(?:een\s+)?(?:risico[-\s]?)?buffer\s+van\s+(\d+(?:[.,]\d+)?)\s*%/i,
    /(\d+(?:[.,]\d+)?)\s*%\s+(?:PM[-\s]?buffer|risicobuffer)/i,
    /worst[-\s]case\s+plafond\s+(?:circa\s+)?€\s*[\d.,Kk]+/i,
  ];
  for (const re of bufferRegexes) {
    const m = blok.match(re);
    if (m) {
      bufferContext = m[0].trim();
      break;
    }
  }

  return {
    label,
    hoofdtotaalLow: hoofd.low,
    hoofdtotaalHigh: hoofd.high,
    subComponenten,
    somSubsLow,
    somSubsHigh,
    bufferLow,
    bufferHigh,
    sluitNetjesAan,
    rauwTekst: blok,
    bufferContext,
  };
}

export function parseBreakdown(text: string | undefined | null): ParsedBreakdown {
  const raw = (text ?? "").trim();
  if (!raw) return { eenmalig: null, structureel: null, unparsed: true };

  const { eenmalig: eenmaligTekst, structureel: structureelTekst } = splitsBlokken(raw);
  const eenmalig = bouwSection(eenmaligTekst, "eenmalig");
  const structureel = bouwSection(structureelTekst, "structureel");

  return {
    eenmalig,
    structureel,
    unparsed: !eenmalig && !structureel,
  };
}
