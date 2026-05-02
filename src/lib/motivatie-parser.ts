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
