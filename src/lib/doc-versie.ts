// Versies van bewerkbare documenten (stap 11): welke voorsteltekst ligt onder een
// opgeslagen versie, en wat tonen we als de voorsteltekst intussen is bijgewerkt?
//
// Een opgeslagen document (session.documenten[sleutel]) gaat via mergeDocument voor op
// de standaard (src/lib/*-default.ts). Zonder meer zou elke opslag, ook alleen een vinkje
// in het voortgangsbord, nieuwe voorsteltekst voorgoed tegenhouden. Daarom:
// - vingerafdruk(doc): korte hash van de tekstinhoud, zonder de "levende gegevens" die de
//   gebruiker in weergave bijhoudt (vinkjes, afgeronde onderdelen, ingevulde links);
// - bij elke opslag gaat `basis` mee: de vingerafdruk van de voorsteltekst waarop de
//   opgeslagen versie is gebaseerd;
// - oplossen(std, opgeslagen): heeft de gebruiker sinds die basis geen tekst veranderd,
//   dan nemen we de nieuwe voorsteltekst automatisch over, met de levende gegevens
//   (overnemen); heeft hij wel eigen tekst, dan tonen we zijn versie en een melding.
//
// Let op: wie de normalisatie hieronder verandert, verandert alle vingerafdrukken. Bereken
// dan BEKENDE_BASISSEN opnieuw, anders krijgt elke opgeslagen versie de melding.

import type { BewerkbaarDocument, DocBlok } from "@/lib/schemas";
import { kloon, mergeDocument } from "@/lib/bewerkbaar-document";

/**
 * Vingerafdrukken van eerdere voorstelversies, voor documenten die zijn opgeslagen vóór
 * dit mechanisme (zonder `basis`). Is de vingerafdruk van zo'n document er een van, dan
 * weten we op welke voorsteltekst het rust en dat er geen eigen tekst in zit.
 */
export const BEKENDE_BASISSEN: ReadonlySet<string> = new Set<string>([
  // analyse (integratie-3sides), voorsteltekst van commit 7bfae78 (30-09-2026); gelijk aan het
  // opgeslagen document in de live sessie (verschil alleen in sleutelvolgorde en lege velden)
  "0xrpn9e125elv8",
  // naslag (kern-3sides), voorsteltekst van commit 7bfae78 (30-09-2026)
  "0xrh9y0061v6p3",
]);

// ---------- vingerafdruk ----------

/**
 * Levende gegevens per bloktype: in weergave bijgehouden, geen voorsteltekst. Krijgt een
 * blok een nieuw veld dat de gebruiker in weergave zet, zet het dan hier en in `overnemen`;
 * anders telt het als eigen tekst en krijgt de sessie de melding.
 */
const LEVEND: Partial<Record<DocBlok["type"], string>> = {
  voortgangsbord: "klaar", // vinkjes bij "nog nodig" en "programmabreed"
  tijdlijn: "voortgang", // Loopt, Niet gestart, Afgerond per onderdeel
  werkstromen: "url", // ingevulde links bij de koppelingen van de werkstroomkaarten
};

/** Kopie van een JSON-waarde zonder de sleutel `weg`, op elke diepte. */
function zonderSleutel(x: unknown, weg: string): unknown {
  if (Array.isArray(x)) return x.map((y) => zonderSleutel(y, weg));
  if (x && typeof x === "object") {
    const uit: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) if (k !== weg) uit[k] = zonderSleutel(v, weg);
    return uit;
  }
  return x;
}

/** Het document zonder `basis` en zonder levende gegevens in de blokken. */
function alleenTekst(doc: Partial<BewerkbaarDocument>): unknown {
  const uit: Record<string, unknown> = { ...doc };
  delete uit.basis;
  if (Array.isArray(doc.secties)) {
    uit.secties = doc.secties.map((s) => {
      if (!s || !Array.isArray(s.blokken)) return s;
      return {
        ...s,
        blokken: s.blokken.map((b) => {
          const weg = b && LEVEND[b.type];
          return weg ? zonderSleutel(b, weg) : b;
        }),
      };
    });
  }
  return uit;
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/**
 * Genormaliseerde waarde; undefined = leeg en weg te laten. Strings getrimd; lege strings,
 * false, lege lijsten, lege objecten, null en undefined vallen weg als eigenschap. In een
 * lijst blijft een lege waarde als null staan, zodat de plek telt (bijv. lege maandcellen).
 */
function normaal(x: unknown): Json | undefined {
  if (x === null || x === undefined) return undefined;
  if (typeof x === "string") {
    const t = x.trim();
    return t === "" ? undefined : t;
  }
  if (typeof x === "boolean") return x ? true : undefined;
  if (typeof x === "number") return Number.isFinite(x) ? x : undefined;
  if (Array.isArray(x)) return x.length === 0 ? undefined : x.map((y) => normaal(y) ?? null);
  if (typeof x === "object") {
    const uit: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(x)) {
      const n = normaal(v);
      if (n !== undefined) uit[k] = n;
    }
    return Object.keys(uit).length > 0 ? uit : undefined;
  }
  return undefined;
}

/** Vaste tekstvorm: sleutels gesorteerd, los van de volgorde waarin ze zijn opgeslagen. */
function vasteVorm(x: Json): string {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(vasteVorm).join(",") + "]";
  return (
    "{" +
    Object.keys(x)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + vasteVorm(x[k]))
      .join(",") +
    "}"
  );
}

/** FNV-1a, 64 bits, over de UTF-8-bytes; in base36 (14 tekens). */
function fnv1a64(tekst: string): string {
  const bytes = new TextEncoder().encode(tekst);
  // offset 0xcbf29ce484222325 in vier delen van 16 bits, laagste eerst
  let h0 = 0x2325;
  let h1 = 0x8422;
  let h2 = 0x9ce4;
  let h3 = 0xcbf2;
  for (let i = 0; i < bytes.length; i++) {
    h0 ^= bytes[i];
    // vermenigvuldigen met het priemgetal 0x100000001b3 = 2^40 + 0x1b3 (modulo 2^64)
    const t0 = h0 * 0x1b3;
    let t1 = h1 * 0x1b3;
    let t2 = h2 * 0x1b3 + (h0 << 8);
    let t3 = h3 * 0x1b3 + (h1 << 8);
    t1 += t0 >>> 16;
    h0 = t0 & 0xffff;
    t2 += t1 >>> 16;
    h1 = t1 & 0xffff;
    t3 += t2 >>> 16;
    h2 = t2 & 0xffff;
    h3 = t3 & 0xffff;
  }
  const hoog = h3 * 0x10000 + h2;
  const laag = h1 * 0x10000 + h0;
  return hoog.toString(36).padStart(7, "0") + laag.toString(36).padStart(7, "0");
}

/**
 * Vingerafdruk van de tekstinhoud van een document. Gelijk voor twee documenten met
 * dezelfde teksten, ook als het ene (opgeslagen) extra lege velden of een andere
 * sleutelvolgorde heeft. Telt niet mee: `basis` en de levende gegevens (vinkjes in het
 * voortgangsbord, voortgang van tijdlijnonderdelen, links bij de werkstroomkaarten).
 */
export function vingerafdruk(doc: Partial<BewerkbaarDocument>): string {
  return fnv1a64(vasteVorm(normaal(alleenTekst(doc)) ?? null));
}

// ---------- overnemen ----------

const sleutel = (s: string | undefined) => (s ?? "").trim();

/** Wachtrij per sleutel: dubbele sleutels worden in volgorde gekoppeld. */
class Rij<T> {
  private m = new Map<string, T[]>();
  zet(k: string, v: T) {
    const r = this.m.get(k);
    if (r) r.push(v);
    else this.m.set(k, [v]);
  }
  pak(k: string): T | undefined {
    return this.m.get(k)?.shift();
  }
}

/** Alle blokken van één type, over alle secties heen. */
function blokkenVan<T extends DocBlok["type"]>(
  doc: Partial<BewerkbaarDocument> | null | undefined,
  type: T
): Extract<DocBlok, { type: T }>[] {
  const uit: Extract<DocBlok, { type: T }>[] = [];
  for (const s of doc?.secties ?? []) {
    for (const b of s?.blokken ?? []) if (b?.type === type) uit.push(b as Extract<DocBlok, { type: T }>);
  }
  return uit;
}

const isAfgerond = (v: string | undefined) => sleutel(v).toLowerCase() === "afgerond";

/**
 * De nieuwe voorsteltekst met de levende gegevens uit de oude versie:
 * - vinkjes in het voortgangsbord (werkstroom op anker, regel op tekst; programmabreed op tekst);
 * - "Afgerond" bij tijdlijnonderdelen (groep op anker, onderdeel op activiteit);
 * - ingevulde links bij de koppelingen van de werkstroomkaarten (kaart op id, koppeling op label).
 * Eigen tekstwijzigingen uit de oude versie vervallen. `basis` = vingerafdruk van de nieuwe.
 */
export function overnemen(
  nieuw: BewerkbaarDocument,
  oud: Partial<BewerkbaarDocument> | null | undefined
): BewerkbaarDocument {
  const doc = kloon(nieuw);

  const vinkjes = new Rij<boolean>();
  const vinkjesBreed = new Rij<boolean>();
  for (const b of blokkenVan(oud, "voortgangsbord")) {
    for (const w of b.werkstromen ?? [])
      for (const x of w.nodig ?? []) vinkjes.zet(sleutel(w.anker) + "\n" + sleutel(x.tekst), x.klaar === true);
    for (const x of b.programmabreed ?? []) vinkjesBreed.zet(sleutel(x.tekst), x.klaar === true);
  }
  const voortgang = new Rij<string>();
  for (const b of blokkenVan(oud, "tijdlijn"))
    for (const g of b.groepen ?? [])
      for (const r of g.rijen ?? [])
        voortgang.zet(sleutel(g.anker || g.naam) + "\n" + sleutel(r.activiteit), sleutel(r.voortgang));
  const links = new Rij<string>();
  for (const b of blokkenVan(oud, "werkstromen"))
    for (const k of b.kaarten ?? [])
      for (const kop of k.koppelingen ?? []) links.zet(sleutel(k.id) + "\n" + sleutel(kop.label), sleutel(kop.url));

  for (const b of blokkenVan(doc, "voortgangsbord")) {
    for (const w of b.werkstromen)
      for (const x of w.nodig) if (vinkjes.pak(sleutel(w.anker) + "\n" + sleutel(x.tekst))) x.klaar = true;
    for (const x of b.programmabreed) if (vinkjesBreed.pak(sleutel(x.tekst))) x.klaar = true;
  }
  for (const b of blokkenVan(doc, "tijdlijn"))
    for (const g of b.groepen)
      for (const r of g.rijen) {
        const v = voortgang.pak(sleutel(g.anker || g.naam) + "\n" + sleutel(r.activiteit));
        if (v !== undefined && isAfgerond(v)) r.voortgang = v;
      }
  for (const b of blokkenVan(doc, "werkstromen"))
    for (const k of b.kaarten)
      for (const kop of k.koppelingen ?? []) {
        const url = links.pak(sleutel(k.id) + "\n" + sleutel(kop.label));
        if (url) kop.url = url;
      }

  doc.basis = vingerafdruk(nieuw);
  return doc;
}

// ---------- oplossen ----------

export interface DocVersie {
  /** het document zoals het getoond wordt */
  doc: BewerkbaarDocument;
  /**
   * standaard   = niets opgeslagen;
   * actueel     = opgeslagen op de huidige voorsteltekst (of er tekstueel gelijk aan);
   * overgenomen = nieuwere voorsteltekst automatisch overgenomen: de sessie had geen eigen tekst;
   * eigen       = eigen tekst op een oudere of onbekende voorsteltekst: melding tonen.
   */
  stand: "standaard" | "actueel" | "overgenomen" | "eigen";
  /** vingerafdruk van de voorsteltekst waarop `doc` rust; bij opslaan meegeven (undefined = onbekend) */
  basis: string | undefined;
  /** vingerafdruk van de huidige voorsteltekst */
  standaard: string;
  /** de opgeslagen versie heeft tekst die afwijkt van de huidige voorsteltekst */
  eigenTekst: boolean;
}

/**
 * Bepaalt wat er getoond wordt van een document met standaard `std` en opgeslagen versie
 * `opgeslagen` (session.documenten[sleutel]). Schrijft niets: een automatisch overgenomen
 * voorsteltekst wordt bewaard bij de volgende wijziging.
 */
export function oplossen(
  std: BewerkbaarDocument,
  opgeslagen?: Partial<BewerkbaarDocument> | null
): DocVersie {
  const afdrukStd = vingerafdruk(std);
  if (!opgeslagen) {
    return { doc: mergeDocument(std), stand: "standaard", basis: afdrukStd, standaard: afdrukStd, eigenTekst: false };
  }
  const afdruk = vingerafdruk(opgeslagen);
  if (opgeslagen.basis === afdrukStd || afdruk === afdrukStd) {
    return {
      doc: mergeDocument(std, opgeslagen),
      stand: "actueel",
      basis: afdrukStd,
      standaard: afdrukStd,
      eigenTekst: afdruk !== afdrukStd,
    };
  }
  const eigenBasis = opgeslagen.basis ?? (BEKENDE_BASISSEN.has(afdruk) ? afdruk : undefined);
  if (afdruk === eigenBasis) {
    return { doc: overnemen(std, opgeslagen), stand: "overgenomen", basis: afdrukStd, standaard: afdrukStd, eigenTekst: false };
  }
  return { doc: mergeDocument(std, opgeslagen), stand: "eigen", basis: eigenBasis, standaard: afdrukStd, eigenTekst: true };
}

/** Het document zoals het in de sessie wordt opgeslagen: een kopie met `basis` (of zonder, als die onbekend is). */
export function metBasis(doc: BewerkbaarDocument, basis: string | undefined): BewerkbaarDocument {
  const uit = kloon(doc);
  if (basis) uit.basis = basis;
  else delete uit.basis;
  return uit;
}
