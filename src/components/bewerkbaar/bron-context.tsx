// Vindplaatsen van de 3sides-documenten (stap 11): een context met de map waarin de
// documenten staan en de link naar het Jira-bord, plus `metBronlinks`, dat verwijzingen
// in een tekst omzet in links naar het document op die pagina:
//   (a) documentnaam + paginaverwijzing of tabblad: "plan van aanpak p. 10–11",
//       "meetinstrument p. 5 en 11–12", "blueprint, tab KPI meetkader", "TL rij 7",
//       "meetinstrument van 3sides (p. 11)"; de link staat op het hele fragment en
//       wijst (bij een pdf) naar de eerste genoemde pagina (#page=N);
//   (b) een kale documentnaam alleen als los item in een opsomming met " · "
//       ("Tijdlijn · praatplaten"), of als bronvermelding tussen haakjes ("(TL)",
//       "(tijdlijn; stappenplan)"), zodat gewone zinnen niet vol links komen.
//       Opsommingen van werkstromen ("Klantreizen · Adoptieframework") blijven tekst.
// Namen zijn hoofdletterongevoelig; de afkortingen uit de naslag (PvA, MI, TL, DP, BP,
// AF) hoofdlettergevoelig.
// Zonder ingevulde map (maar wel binnen een BronProvider, dus in stap 11) wijst een
// documentverwijzing naar het naslag-tabblad bij dat document (?stap=integratie&tab=kern
// #sec-doc-N, nieuw tabblad); staat het naslag op deze pagina, dan naar #sec-doc-N zelf.
// Met ingevulde map wint de echte documentlink. Buiten een provider blijft alles tekst.
// Daarnaast wordt "deel N" (N = 1 t/m 15) een link naar de sectie waarvan de titel met
// "N ·" begint; de sectiekaart daarvoor komt uit de SectieContext, die het document vult.
// Staat een deel niet op de pagina (een uitsnede van de analyse, zoals het tabblad
// Evaluatie 3sides: `elders` in de sectiekaart), dan opent de link de analyse bij dat deel:
// zonder herladen via de DeelEldersContext, en als gewone link naar ?tab=analyse#sec-<id>.
// Alleen gebruiken binnen een client-component.

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export interface Bron {
  /** link naar de map met de 3sides-documenten (zonder bestandsnaam) */
  documentenBasis: string;
  /** link naar het Jira-bord */
  jira: string;
  /** zonder map: documentverwijzingen linken naar het naslag-tabblad (alleen binnen een provider) */
  naslagTerugval: boolean;
  /** het naslag-tabblad staat op deze pagina: link naar #sec-doc-N zonder nieuw tabblad */
  naslagHier: boolean;
}

export interface BronDocument {
  id: string;
  /** bestandsnaam in de documentenmap */
  bestand: string;
  /** namen zoals ze in de teksten voorkomen (hoofdletterongevoelig) */
  namen: readonly string[];
  /** afkortingen zoals in de naslag (hoofdlettergevoelig) */
  afkortingen: readonly string[];
  /** nummer van het document in het naslag-tabblad (sectie #sec-doc-N) */
  naslag: number;
  /** pdf: pagina waarop een link zonder paginanummer opent (bijv. om een misleidend voorblad over te slaan) */
  startpagina?: number;
  /** korte waarschuwing in de tooltip van elke link naar dit document */
  opmerking?: string;
}

/** Link naar het naslag-tabblad van stap 11 (zonder anker); relatief aan de sessiepagina. */
export const NASLAG_TAB = "?stap=integratie&tab=kern";

/** Link naar het tabblad Analyse van stap 11 (zonder anker); relatief aan de sessiepagina. */
export const ANALYSE_TAB_LINK = "?stap=integratie&tab=analyse";

export const BRON_DOCUMENTEN: readonly BronDocument[] = [
  { id: "plan-van-aanpak", bestand: "Cito_-_Plan_van_Aanpak.pdf", namen: ["plan van aanpak"], afkortingen: ["PvA"], naslag: 1 },
  {
    id: "meetinstrument",
    bestand: "0-meting_meetinstrument_-_WiP.pdf",
    namen: ["0-meting meetinstrument", "meetinstrument"],
    afkortingen: ["MI"],
    naslag: 3,
    // Het voorblad heet "0-meting Adoptie Framework", in dezelfde opmaak als het adoptieframework;
    // zonder paginanummer openen we daarom op p. 2 (de keten van strategie naar uitvoering).
    startpagina: 2,
    opmerking: 'Let op: het voorblad heet "0-meting Adoptie Framework"; dit is het meetinstrument, niet het adoptieframework.',
  },
  {
    id: "adoptieframework",
    bestand: "Cito_DIN_Adoptie_Framework_-_WiP.pdf",
    namen: ["adoptieframework", "adoptie framework", "adoptie-framework"],
    afkortingen: ["AF"],
    naslag: 6,
  },
  { id: "bv-dag", bestand: "BV-dag-229-final.pdf", namen: ["BV-dag"], afkortingen: [], naslag: 10 },
  {
    id: "blueprint",
    bestand: "Blueprint_Klantreis_-_Draft.xlsx",
    namen: ["blueprint klantreis", "blueprint"],
    afkortingen: ["BP"],
    naslag: 5,
  },
  {
    id: "tijdlijn",
    bestand: "Cito_-_Project_tijdlijn_-_Klant_in_zicht.xlsx",
    namen: ["project tijdlijn", "projecttijdlijn", "tijdlijn"],
    afkortingen: ["TL"],
    naslag: 2,
  },
  {
    id: "datapunten",
    bestand: "Data_punten_ter_input_KPI.xlsx",
    namen: ["data punten ter input KPI", "datapuntenlijst", "datapunten", "data punten"],
    afkortingen: ["DP"],
    naslag: 4,
  },
  { id: "data-tech", bestand: "Cito_Data_&_Tech.pdf", namen: ["Data & Tech"], afkortingen: [], naslag: 7 },
  {
    id: "praatplaat-funnel",
    bestand: "Praatplaat_Marketing__Sales_funnel.pdf",
    // Het meervoud "praatplaten" is geen documentnaam: het zijn er twee (funnel en proces), dus
    // noem ze los. Het enkelvoud "praatplaat" is een soortnaam ("Data & Tech (praatplaat, 1 pagina)").
    namen: ["praatplaat marketing & sales funnel", "praatplaat funnel"],
    afkortingen: [],
    naslag: 8,
  },
  {
    id: "praatplaat-proces",
    bestand: "Praatplaat_Marketing__Sales_proces.pdf",
    namen: ["praatplaat marketing & sales proces", "praatplaat proces", "praatplaat salesproces"],
    afkortingen: [],
    naslag: 9,
  },
  { id: "evaluatie-kib", bestand: "Evaluatie_Klant_in_Beeld.xlsx", namen: ["evaluatie Klant in Beeld"], afkortingen: [], naslag: 11 },
];

/** Element-id van het document in het naslag-tabblad. */
export function naslagAnker(doc: BronDocument): string {
  return "sec-doc-" + doc.naslag;
}

/**
 * Namen van de werkstromen die samenvallen met een documentnaam of ernaast staan.
 * Een opsomming waarin zo'n naam staat, is een lijst werkstromen, geen bronvermelding.
 */
const WERKSTROOM_NAMEN = new Set([
  "klantreizen",
  "centrale datavoorziening klantcontact",
  "0-meting",
  "technologielandschap",
  "succes meten",
  "cito blueprint klantreis",
  "quick wins",
]);

// ---------- context ----------

export const BronContext = createContext<Bron>({
  documentenBasis: "",
  jira: "",
  naslagTerugval: false,
  naslagHier: false,
});

/**
 * Standaard vindplaats van de 3sides-documenten: de openbare bucket "3sides-documenten" in
 * Supabase Storage (geüpload met scripts/upload-3sides-documenten.cjs). Een ingevulde map
 * in "Vindplaatsen" gaat voor.
 */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const STANDAARD_DOCUMENTEN_BASIS = SUPABASE_URL
  ? SUPABASE_URL.replace(/\/+$/, "") + "/storage/v1/object/public/3sides-documenten"
  : "";

export function BronProvider(p: {
  documentenBasis?: string;
  jira?: string;
  /** het naslag-tabblad staat op deze pagina (tab "kern") */
  naslagHier?: boolean;
  children: ReactNode;
}) {
  const documentenBasis = (p.documentenBasis ?? "").trim() || STANDAARD_DOCUMENTEN_BASIS;
  const jira = (p.jira ?? "").trim();
  const naslagHier = p.naslagHier === true;
  const waarde = useMemo<Bron>(
    () => ({ documentenBasis, jira, naslagTerugval: true, naslagHier }),
    [documentenBasis, jira, naslagHier]
  );
  return (
    <BronContext.Provider value={waarde}>
      <style>{BRON_CSS}</style>
      {p.children}
    </BronContext.Provider>
  );
}

/** De vindplaatsen uit de dichtstbijzijnde provider (leeg zonder provider). */
export function useBron(): Bron {
  return useContext(BronContext);
}

// ---------- sectiekaart ("deel N") ----------

export interface SectieKaart {
  /** nummer uit de titel ("4 · Het meetmodel" → 4) */
  nummer: number;
  /** id van de sectie (element #sec-<id>) */
  id: string;
  /** het deel staat niet op deze pagina (uitsnede): "deel N" opent de analyse bij dat deel */
  elders?: boolean;
}

/** Secties waarvan de titel met "N ·" begint, als kaart nummer → id (eerste wint bij dubbele nummers). */
export function sectieKaart(secties: readonly { id: string; titel: string }[]): SectieKaart[] {
  const uit: SectieKaart[] = [];
  const gezien = new Set<number>();
  for (const s of secties) {
    const m = s.titel.match(/^\s*(\d{1,2})\s*·/);
    if (!m) continue;
    const nummer = Number(m[1]);
    if (gezien.has(nummer)) continue;
    gezien.add(nummer);
    uit.push({ nummer, id: s.id });
  }
  return uit;
}

const GEEN_SECTIES: readonly SectieKaart[] = [];

export const SectieContext = createContext<readonly SectieKaart[]>(GEEN_SECTIES);

/**
 * Opent de analyse bij een anker ("sec-verder") zonder de pagina te herladen; voor "deel N"
 * naar een deel dat niet op deze pagina staat (`elders`). Zonder provider (null) werkt de
 * link als gewone link naar het tabblad Analyse.
 */
export const DeelEldersContext = createContext<((anker: string) => void) | null>(null);

/**
 * Het document waar een naslagdeel over gaat (sectie "doc-3" → het meetinstrument). Daarin
 * verwijzen kale paginanummers ("Uitgelicht doel (p. 4)") naar dat document. Buiten zo'n
 * deel: null, en dan blijft een kale verwijzing tekst.
 */
export const SectieDocumentContext = createContext<BronDocument | null>(null);

/** Het document bij een sectie-id uit het naslag ("doc-N", zie `naslagAnker`), anders null. */
export function documentVanSectie(id: string): BronDocument | null {
  return BRON_DOCUMENTEN.find((d) => naslagAnker(d) === "sec-" + id) ?? null;
}

/** Het document vult hiermee de sectiekaart, zodat "deel N" in de teksten een link wordt. */
export function SectieProvider(p: { secties: readonly SectieKaart[]; children: ReactNode }) {
  return <SectieContext.Provider value={p.secties}>{p.children}</SectieContext.Provider>;
}

// "deel 4", "Deel 12"; in "deel 4 tot en met 7" alleen "deel 4". Geen letter of cijfer ervoor
// ("onderdeel 4" telt niet) en geen cijfer erna.
const DEEL = /(?<![\p{L}\p{N}])[Dd]eel\s(1[0-5]|[1-9])(?!\p{N})/gu;

interface DeelVerwijzing {
  start: number;
  end: number;
  nummer: number;
}

/** "deel N"-verwijzingen in een tekst (ongeacht of de sectie bestaat). */
export function vindDeelVerwijzingen(tekst: string): DeelVerwijzing[] {
  const uit: DeelVerwijzing[] = [];
  for (const m of tekst.matchAll(DEEL)) {
    const start = m.index ?? 0;
    uit.push({ start, end: start + m[0].length, nummer: Number(m[1]) });
  }
  return uit;
}

/** `bronUrl` gebonden aan de map uit de context: (document, pagina?) → link of null. */
export function useBronUrl(): (document: string | BronDocument, pagina?: string | number | null) => string | null {
  const { documentenBasis } = useContext(BronContext);
  return useCallback(
    (document: string | BronDocument, pagina?: string | number | null) => bronUrl(documentenBasis, document, pagina),
    [documentenBasis]
  );
}

// ---------- links bouwen ----------

function normaliseer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map-link zonder slash aan het eind; een Windows-pad wordt een file-link. */
export function normaliseerBasis(basis: string): string {
  let b = basis.trim();
  if (!b) return "";
  if (/^[a-zA-Z]:[\\/]/.test(b)) b = "file:///" + b.replace(/\\/g, "/");
  return b.replace(/[\\/]+$/, "");
}

/** Document waarvan de tekst precies de naam of afkorting is ("tijdlijn", "TL", "Tijdlijn."). */
export function exactDocument(tekst: string): BronDocument | null {
  const t = tekst.trim().replace(/\.$/, "").trim();
  if (!t) return null;
  const tl = normaliseer(t);
  for (const d of BRON_DOCUMENTEN) {
    if (d.afkortingen.includes(t)) return d;
    if (d.namen.some((n) => n.toLowerCase() === tl)) return d;
  }
  return null;
}

/**
 * Document bij een naam, afkorting, id of bestandsnaam, ook als de tekst met de naam
 * begint ("Adoptieframework (PDF)", "Tijdlijn (Excel, tab v3)"). Langste naam wint.
 */
export function zoekDocument(tekst: string): BronDocument | null {
  const t = tekst.trim();
  if (!t) return null;
  const tl = normaliseer(t);
  for (const d of BRON_DOCUMENTEN) if (d.id === tl || d.bestand.toLowerCase() === tl) return d;
  const exact = exactDocument(t);
  if (exact) return exact;
  let beste: { d: BronDocument; len: number } | null = null;
  const grens = (s: string, i: number) => !/[\p{L}\p{N}]/u.test(s.charAt(i));
  for (const d of BRON_DOCUMENTEN) {
    for (const n of d.namen) {
      const nl = n.toLowerCase();
      if (tl.startsWith(nl) && grens(tl, nl.length) && (!beste || nl.length > beste.len)) beste = { d, len: nl.length };
    }
    for (const a of d.afkortingen) {
      if (t.startsWith(a) && grens(t, a.length) && (!beste || a.length > beste.len)) beste = { d, len: a.length };
    }
  }
  return beste?.d ?? null;
}

/**
 * Paginanummer uit een verwijzing: "p. 12–13" → "12", "plan van aanpak p. 5 en 11" → "5";
 * null als er geen "p. N" (of "pp.", "blz.") in staat. Gebruik dit voor labels als
 * "0-meting meetinstrument (PDF)", waar het eerste getal geen pagina is.
 */
export function paginaUit(tekst: string): string | null {
  const m = tekst.match(/(?<![\p{L}\p{N}])(?:p|pp|blz)\.\s?(\d+)/u);
  return m ? m[1] : null;
}

/**
 * Link naar een document in de documentenmap: `<basis>/<bestandsnaam>`, bij een pdf met
 * `#page=N` (N = het eerste getal in `pagina`; geef een verwijzing door via `paginaUit`).
 * Zonder basis of onbekend document: null.
 */
export function bronUrl(
  basis: string,
  document: string | BronDocument,
  pagina?: string | number | null
): string | null {
  const b = normaliseerBasis(basis);
  if (!b) return null;
  const doc = typeof document === "string" ? zoekDocument(document) : document;
  if (!doc) return null;
  const n = pagina === null || pagina === undefined ? null : String(pagina).match(/\d+/);
  const p = n ? n[0] : doc.startpagina ? String(doc.startpagina) : null;
  const anker = p && /\.pdf$/i.test(doc.bestand) ? "#page=" + p : "";
  return b + "/" + encodeURIComponent(doc.bestand) + anker;
}

// ---------- verwijzingen herkennen ----------

/** Hoofdletterongevoelig patroon voor een naam; spaties = willekeurige witruimte. */
function ci(naam: string): string {
  return naam
    .split("")
    .map((c) => {
      if (/[a-z]/i.test(c)) return `[${c.toLowerCase()}${c.toUpperCase()}]`;
      if (c === " ") return "\\s+";
      return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
}

/** Naam of afkorting → document, voor een gevonden naam in de tekst. */
const OP_NAAM = new Map<string, BronDocument>();
for (const d of BRON_DOCUMENTEN) {
  for (const n of d.namen) OP_NAAM.set(n.toLowerCase(), d);
  for (const a of d.afkortingen) OP_NAAM.set(a, d);
}

/** Alle namen en afkortingen, langste eerst (de alternatie kiest de eerste die past). */
const NAAM_PATRONEN = BRON_DOCUMENTEN.flatMap((d) => [
  ...d.namen.map((n) => ({ tekst: n, patroon: ci(n) })),
  ...d.afkortingen.map((a) => ({ tekst: a, patroon: a })),
])
  .sort((a, b) => b.tekst.length - a.tekst.length)
  .map((x) => x.patroon);

const NAAM = "(?:" + NAAM_PATRONEN.join("|") + ")";
const GRENS_VOOR = "(?<![\\p{L}\\p{N}])";
const GRENS_NA = "(?![\\p{L}\\p{N}])";
const BEREIK = "\\d+(?:\\s?[–—-]\\s?\\d+)?";
// "p. 10", "p. 10–11", "p. 5 en 11–12", "p. 2–4, 6 en 8–10", "p. 10 en p. 15"
const PAGINA = `(?:p|pp|blz)\\.\\s?${BEREIK}(?:(?:,\\s?|\\s+en\\s+(?:(?:p|pp|blz)\\.\\s?)?)${BEREIK})*`;
// "rij 8", "rij 22, 34, 28"
const RIJ = `rij\\s?${BEREIK}(?:,\\s?${BEREIK})*`;
// "tab v3", "tab KPI meetkader", 'tab "Kern Principes"'; een naam zonder aanhalingstekens eindigt bij
// · ; , : ( ) " of een punt met spatie (met aanhalingstekens is het sluitteken de grens)
const TAB = `tab(?:blad)?\\s+(?:"[^"\\n]+"|[^\\s·;,:()"\\n][^·;,:()"\\n]*?(?=\\s*(?:[·;,:()"\\n]|\\.\\s|\\.$|$)))`;
// "tab Klantreis fasen, rij 24" is één verwijzing
const VERWIJZING = `(?:${PAGINA}|${RIJ}|${TAB}(?:,\\s?${RIJ})?)`;
// tussen naam en verwijzing: " van 3sides", " 3sides", " (", " (Excel, ", ", " of een spatie
const TUSSEN = "(?:\\s+(?:van\\s+)?3sides)?(?:\\s*\\((?:Excel|PDF)?,?\\s*|,\\s*|\\s+)";
const MET_VERWIJZING = new RegExp(`${GRENS_VOOR}(${NAAM})${GRENS_NA}(${TUSSEN})(${VERWIJZING})`, "gu");
/** Een documentnaam of afkorting ergens in een tekst (zonder paginaverwijzing). */
const NAAM_LOS = new RegExp(`${GRENS_VOOR}${NAAM}${GRENS_NA}`, "u");
/** Een pagina-, rij- of tabverwijzing zonder documentnaam ervoor: "(p. 7)", "rij 23", 'tab "Competenties"'. */
const KALE_VERWIJZING = new RegExp(`${GRENS_VOOR}${VERWIJZING}`, "gu");

interface Verwijzing {
  start: number;
  end: number;
  doc: BronDocument;
  pagina: string | null;
}

function documentBijNaam(naam: string): BronDocument | null {
  return OP_NAAM.get(naam) ?? OP_NAAM.get(normaliseer(naam)) ?? null;
}

/** Stukken van een tekst tussen de scheidingstekens, met hun positie. */
function stukken(tekst: string, scheider: RegExp, vanaf = 0): { start: number; end: number }[] {
  const uit: { start: number; end: number }[] = [];
  let pos = 0;
  for (const m of tekst.matchAll(scheider)) {
    uit.push({ start: vanaf + pos, end: vanaf + (m.index ?? 0) });
    pos = (m.index ?? 0) + m[0].length;
  }
  uit.push({ start: vanaf + pos, end: vanaf + tekst.length });
  return uit;
}

/** Kale documentnamen in de items van een opsomming (alleen als er geen werkstroomnaam tussen staat). */
function kaleItems(tekst: string, items: { start: number; end: number }[]): Verwijzing[] {
  const teksten = items.map((i) => tekst.slice(i.start, i.end));
  if (teksten.some((t) => WERKSTROOM_NAMEN.has(normaliseer(t).replace(/\.$/, "")))) return [];
  const uit: Verwijzing[] = [];
  items.forEach((i, k) => {
    const doc = exactDocument(teksten[k]);
    if (!doc) return;
    const links = teksten[k].length - teksten[k].trimStart().length;
    const kern = teksten[k].trim().replace(/\.$/, "").trimEnd();
    uit.push({ start: i.start + links, end: i.start + links + kern.length, doc, pagina: null });
  });
  return uit;
}

/**
 * Alle verwijzingen in een tekst, gesorteerd en zonder overlap. Met `standaard` (de tekst staat
 * in een naslagdeel over één document) wijst een kale verwijzing als "(p. 7)" of "rij 23" naar
 * dat document; een verwijzing met een documentnaam ervoor gaat voor.
 */
export function vindVerwijzingen(tekst: string, standaard: BronDocument | null = null): Verwijzing[] {
  const uit: Verwijzing[] = [];
  // (a) naam + pagina, rij of tabblad
  for (const m of tekst.matchAll(MET_VERWIJZING)) {
    const doc = documentBijNaam(m[1]);
    if (!doc) continue;
    const start = m.index ?? 0;
    let end = start + m[0].length;
    // geopend haakje in het fragment: het sluithaakje hoort erbij. Staat er nog iets tussen
    // ("tijdlijn (tab v3, stand 28-09)"), dan loopt de link door tot het sluithaakje; staat
    // daar een ander document ("tijdlijn (rij 8; PvA p. 4)"), dan is alleen de naam de link.
    if (m[2].includes("(")) {
      const sluit = tekst.indexOf(")", end);
      const rest = sluit < 0 ? "" : tekst.slice(end, sluit);
      if (sluit >= 0 && !rest.includes("(") && !NAAM_LOS.test(rest)) end = sluit + 1;
      else end = start + m[1].length;
    }
    uit.push({ start, end, doc, pagina: paginaUit(m[3]) });
  }
  // (b) kale naam als los item in een " · "-opsomming …
  const opsomming = stukken(tekst, /\s+·\s+/g);
  const kandidaten = opsomming.length >= 2 ? kaleItems(tekst, opsomming) : [];
  // … of als bronvermelding tussen haakjes: "(TL)", "(tijdlijn; stappenplan)"
  for (const m of tekst.matchAll(/\(([^()]*)\)/g)) {
    kandidaten.push(...kaleItems(tekst, stukken(m[1], /\s*[;,·]\s*/g, (m.index ?? 0) + 1)));
  }
  for (const k of kandidaten) {
    if (!uit.some((v) => k.start < v.end && v.start < k.end)) uit.push(k);
  }
  // (c) kale pagina-, rij- of tabverwijzing in een naslagdeel over één document
  if (standaard) {
    for (const m of tekst.matchAll(KALE_VERWIJZING)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (!uit.some((v) => start < v.end && v.start < end)) uit.push({ start, end, doc: standaard, pagina: paginaUit(m[0]) });
    }
  }
  return uit.sort((a, b) => a.start - b.start);
}

// ---------- weergave ----------

/** Link naar het document zelf (nieuw tabblad). */
/** Het pijltje na een link, vast aan het laatste woord: nooit alleen op een nieuwe regel. */
function MetPijl({ children }: { children: ReactNode }) {
  const pijl = (
    <span className="ok-bron-i" aria-hidden="true">
      ↗
    </span>
  );
  if (typeof children !== "string") return <>{children}{pijl}</>;
  const i = children.trimEnd().lastIndexOf(" ");
  if (i < 0) return <span className="ok-nw">{children}{pijl}</span>;
  return (
    <>
      {children.slice(0, i + 1)}
      <span className="ok-nw">
        {children.slice(i + 1)}
        {pijl}
      </span>
    </>
  );
}

function Bronlink({ href, doc, pagina, children }: { href: string; doc: BronDocument; pagina: string | null; children: ReactNode }) {
  const titel = bronTitel(doc, pagina);
  return (
    <a className="ok-bron" href={href} target="_blank" rel="noopener noreferrer" title={titel}>
      <MetPijl>{children}</MetPijl>
    </a>
  );
}

/** Tooltip bij een documentlink: bestand, pagina en (als die er is) de waarschuwing bij het document. */
export function bronTitel(doc: BronDocument, pagina?: string | number | null): string {
  const p = pagina ?? (/\.pdf$/i.test(doc.bestand) ? doc.startpagina ?? null : null);
  return `Opent ${doc.bestand}${p ? " op pagina " + p : ""} (nieuw tabblad)${doc.opmerking ? ". " + doc.opmerking : ""}`;
}

/** "Plan van aanpak" → "Naslag: plan van aanpak" (de eerste naam van het document). */
function naslagTitel(doc: BronDocument): string {
  return "Naslag: " + doc.namen[0];
}

/**
 * Terugval zonder map: link naar het naslag-tabblad bij dat document. Staat het naslag
 * op deze pagina, dan een gewone anker-link; anders opent het in een nieuw tabblad.
 */
function Naslaglink({ doc, hier, children }: { doc: BronDocument; hier: boolean; children: ReactNode }) {
  const anker = "#" + naslagAnker(doc);
  if (hier) {
    return (
      <a className="ok-bron ok-bron-naslag" href={anker} title={naslagTitel(doc)}>
        {children}
      </a>
    );
  }
  return (
    <a
      className="ok-bron ok-bron-naslag"
      href={NASLAG_TAB + anker}
      target="_blank"
      rel="noopener noreferrer"
      title={naslagTitel(doc) + " (nieuw tabblad)"}
    >
      <MetPijl>{children}</MetPijl>
    </a>
  );
}

/**
 * "deel 4" → link naar de sectie op deze pagina. Staat het deel niet op de pagina (`elders`),
 * dan naar de analyse bij dat deel: een gewone klik wisselt van tabblad zonder herladen (via
 * de DeelEldersContext); in een nieuw venster of zonder provider werkt de link zelf.
 */
function Deellink({ id, nummer, elders, children }: { id: string; nummer: number; elders: boolean; children: ReactNode }) {
  const naarElders = useContext(DeelEldersContext);
  if (elders) {
    return (
      <a
        className="ok-deel ok-deel-elders"
        href={ANALYSE_TAB_LINK + "#sec-" + id}
        title={`Naar deel ${nummer} in de analyse`}
        onClick={(e) => {
          if (!naarElders || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          naarElders("sec-" + id);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a className="ok-deel" href={"#sec-" + id} title={`Naar deel ${nummer}`}>
      {children}
    </a>
  );
}

type Stuk =
  /** href = link naar het document (met map); null = terugval naar het naslag */
  | { soort: "doc"; start: number; end: number; doc: BronDocument; pagina: string | null; href: string | null }
  | { soort: "deel"; start: number; end: number; id: string; nummer: number; elders: boolean }
  /** expliciete verwijzing [[…]] die geen document is: tekst zonder haken */
  | { soort: "plat"; start: number; end: number; weergave: string };

/**
 * Tekst met de verwijzingen als links. Documentverwijzingen: met map naar het document,
 * anders (met terugval) naar het naslag; "deel N" naar de sectie uit de kaart. Bij
 * overlap wint de documentverwijzing. Zonder link blijft het fragment tekst.
 */
function verdeel(
  tekst: string,
  bron: Bron,
  secties: readonly SectieKaart[],
  standaard: BronDocument | null
): ReactNode[] {
  const stukken: Stuk[] = [];
  // Expliciet: [[Plan van aanpak]] of [[meetinstrument p. 12]] wordt altijd een link (zonder haken).
  const expliciet: { start: number; end: number; binnen: string }[] = [];
  for (const m of tekst.matchAll(/\[\[([^\]]+)\]\]/g)) {
    expliciet.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, binnen: m[1] });
  }
  for (const x of expliciet) {
    const doc = zoekDocument(x.binnen);
    if (!doc || !(bron.documentenBasis !== "" || bron.naslagTerugval)) {
      stukken.push({ soort: "plat", start: x.start, end: x.end, weergave: x.binnen });
      continue;
    }
    const pagina = paginaUit(x.binnen);
    const href = bron.documentenBasis ? bronUrl(bron.documentenBasis, doc, pagina) : null;
    stukken.push({ soort: "doc", start: x.start, end: x.end, doc, pagina, href });
  }
  const inExpliciet = (s: number, e: number) => expliciet.some((x) => s < x.end && x.start < e);
  if (bron.documentenBasis !== "" || bron.naslagTerugval) {
    for (const v of vindVerwijzingen(tekst, standaard)) {
      if (inExpliciet(v.start, v.end)) continue;
      const href = bron.documentenBasis ? bronUrl(bron.documentenBasis, v.doc, v.pagina) : null;
      if (!href && !bron.naslagTerugval) continue;
      stukken.push({ soort: "doc", ...v, href });
    }
  }
  if (secties.length > 0) {
    for (const d of vindDeelVerwijzingen(tekst)) {
      const s = secties.find((x) => x.nummer === d.nummer);
      if (!s) continue;
      if (stukken.some((v) => d.start < v.end && v.start < d.end)) continue;
      stukken.push({ soort: "deel", start: d.start, end: d.end, id: s.id, nummer: d.nummer, elders: s.elders === true });
    }
  }
  if (stukken.length === 0) return [tekst];
  stukken.sort((a, b) => a.start - b.start);
  const uit: ReactNode[] = [];
  let pos = 0;
  stukken.forEach((v, i) => {
    if (v.start > pos) uit.push(tekst.slice(pos, v.start));
    if (v.soort === "plat") {
      uit.push(v.weergave);
      pos = v.end;
      return;
    }
    const ruw = tekst.slice(v.start, v.end);
    const fragment = ruw.startsWith("[[") && ruw.endsWith("]]") ? ruw.slice(2, -2) : ruw;
    if (v.soort === "deel") {
      uit.push(
        <Deellink key={i} id={v.id} nummer={v.nummer} elders={v.elders}>
          {fragment}
        </Deellink>
      );
    } else {
      uit.push(
        v.href ? (
          <Bronlink key={i} href={v.href} doc={v.doc} pagina={v.pagina}>
            {fragment}
          </Bronlink>
        ) : (
          <Naslaglink key={i} doc={v.doc} hier={bron.naslagHier}>
            {fragment}
          </Naslaglink>
        )
      );
    }
    pos = v.end;
  });
  if (pos < tekst.length) uit.push(tekst.slice(pos));
  return uit;
}

function Bronlinks({ tekst }: { tekst: string }) {
  const bron = useContext(BronContext);
  const secties = useContext(SectieContext);
  const standaard = useContext(SectieDocumentContext);
  const actief = tekst !== "" && (bron.documentenBasis !== "" || bron.naslagTerugval || secties.length > 0);
  const delen = useMemo(
    () => (actief ? verdeel(tekst, bron, secties, standaard) : null),
    [actief, tekst, bron, secties, standaard]
  );
  if (!delen) return tekst;
  return <>{delen}</>;
}

/**
 * Tekst waarin verwijzingen naar 3sides-documenten en naar "deel N" links zijn geworden
 * (zie boven). Leest de map en de sectiekaart uit de contexten bij het renderen; buiten
 * een provider komt de tekst ongewijzigd terug. Werkt ook op de delen van `metLabel`
 * (label en rest apart).
 */
export function metBronlinks(tekst: string): ReactNode {
  if (!tekst) return tekst;
  return <Bronlinks tekst={tekst} />;
}

// Stijl van de links: Cito-blauw, gestippeld onderstreept, onderstreept bij hover,
// met een klein pijltje na de tekst (documentlinks en naslag in een nieuw tabblad).
// Deel-links (.ok-deel) springen binnen de pagina en hebben geen pijltje.
// Staat in de provider, dus overal waar links kunnen komen.
export const BRON_CSS = `
.ok-bron,.ok-deel{color:#003366;text-decoration:underline dotted rgba(0,51,102,.45);text-underline-offset:2px;text-decoration-thickness:1px;border-radius:2px}
.ok-bron:hover,.ok-bron:focus-visible,.ok-deel:hover,.ok-deel:focus-visible{text-decoration:underline solid #003366;outline:none}
.ok-bron:focus-visible,.ok-deel:focus-visible{box-shadow:0 0 0 2px rgba(0,51,102,.25)}
.ok-bron-i{display:inline-block;font-size:.72em;line-height:1;margin-left:.12em;vertical-align:.3em;opacity:.65;text-decoration:none}
.ok-bron:hover .ok-bron-i{opacity:1}
.ok-nw{white-space:nowrap}
`;
