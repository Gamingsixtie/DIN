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
// AF) hoofdlettergevoelig. Zonder ingevulde map blijft alles gewone tekst.
// Alleen gebruiken binnen een client-component.

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export interface Bron {
  /** link naar de map met de 3sides-documenten (zonder bestandsnaam) */
  documentenBasis: string;
  /** link naar het Jira-bord */
  jira: string;
}

export interface BronDocument {
  id: string;
  /** bestandsnaam in de documentenmap */
  bestand: string;
  /** namen zoals ze in de teksten voorkomen (hoofdletterongevoelig) */
  namen: readonly string[];
  /** afkortingen zoals in de naslag (hoofdlettergevoelig) */
  afkortingen: readonly string[];
}

export const BRON_DOCUMENTEN: readonly BronDocument[] = [
  { id: "plan-van-aanpak", bestand: "Cito_-_Plan_van_Aanpak.pdf", namen: ["plan van aanpak"], afkortingen: ["PvA"] },
  {
    id: "meetinstrument",
    bestand: "0-meting_meetinstrument_-_WiP.pdf",
    namen: ["0-meting meetinstrument", "meetinstrument"],
    afkortingen: ["MI"],
  },
  {
    id: "adoptieframework",
    bestand: "Cito_DIN_Adoptie_Framework_-_WiP.pdf",
    namen: ["adoptieframework", "adoptie framework", "adoptie-framework"],
    afkortingen: ["AF"],
  },
  { id: "bv-dag", bestand: "BV-dag-229-final.pdf", namen: ["BV-dag"], afkortingen: [] },
  { id: "blueprint", bestand: "Blueprint_Klantreis_-_Draft.xlsx", namen: ["blueprint klantreis", "blueprint"], afkortingen: ["BP"] },
  {
    id: "tijdlijn",
    bestand: "Cito_-_Project_tijdlijn_-_Klant_in_zicht.xlsx",
    namen: ["project tijdlijn", "projecttijdlijn", "tijdlijn"],
    afkortingen: ["TL"],
  },
  {
    id: "datapunten",
    bestand: "Data_punten_ter_input_KPI.xlsx",
    namen: ["data punten ter input KPI", "datapunten", "data punten"],
    afkortingen: ["DP"],
  },
  { id: "data-tech", bestand: "Cito_Data_&_Tech.pdf", namen: ["Data & Tech"], afkortingen: [] },
  {
    id: "praatplaat-funnel",
    bestand: "Praatplaat_Marketing__Sales_funnel.pdf",
    // "praatplaten" (meervoud) wijst naar de funnel; het enkelvoud "praatplaat" is een soortnaam
    // ("Data & Tech (praatplaat, 1 pagina)") en bewust geen documentnaam.
    namen: ["praatplaat marketing & sales funnel", "praatplaat funnel", "praatplaten"],
    afkortingen: [],
  },
  {
    id: "praatplaat-proces",
    bestand: "Praatplaat_Marketing__Sales_proces.pdf",
    namen: ["praatplaat marketing & sales proces", "praatplaat proces", "praatplaat salesproces"],
    afkortingen: [],
  },
  { id: "evaluatie-kib", bestand: "Evaluatie_Klant_in_Beeld.xlsx", namen: ["evaluatie Klant in Beeld"], afkortingen: [] },
];

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

export const BronContext = createContext<Bron>({ documentenBasis: "", jira: "" });

export function BronProvider(p: { documentenBasis?: string; jira?: string; children: ReactNode }) {
  const documentenBasis = (p.documentenBasis ?? "").trim();
  const jira = (p.jira ?? "").trim();
  const waarde = useMemo(() => ({ documentenBasis, jira }), [documentenBasis, jira]);
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
 * Link naar een document in de documentenmap: `<basis>/<bestandsnaam>`, bij een pdf met
 * `#page=N` (N = het eerste getal van de paginaverwijzing). Zonder basis of onbekend
 * document: null.
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
  const anker = n && /\.pdf$/i.test(doc.bestand) ? "#page=" + n[0] : "";
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
// "tab v3", "tab KPI meetkader", 'tab "Kern Principes"'; eindigt bij · ; , : ( ) " of een punt met spatie
const TAB = `tab(?:blad)?\\s+(?:"[^"\\n]+"|[^\\s·;,:()"\\n][^·;,:()"\\n]*?)(?=\\s*(?:[·;,:()"\\n]|\\.\\s|\\.$|$))`;
const VERWIJZING = `(?:${PAGINA}|${RIJ}|${TAB})`;
// tussen naam en verwijzing: " van 3sides", " 3sides", " (", " (Excel, ", ", " of een spatie
const TUSSEN = "(?:\\s+(?:van\\s+)?3sides)?(?:\\s*\\((?:Excel|PDF)?,?\\s*|,\\s*|\\s+)";
const MET_VERWIJZING = new RegExp(`${GRENS_VOOR}(${NAAM})${GRENS_NA}(${TUSSEN})(${VERWIJZING})`, "gu");

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

/** Alle verwijzingen in een tekst, gesorteerd en zonder overlap. */
export function vindVerwijzingen(tekst: string): Verwijzing[] {
  const uit: Verwijzing[] = [];
  // (a) naam + pagina, rij of tabblad
  for (const m of tekst.matchAll(MET_VERWIJZING)) {
    const doc = documentBijNaam(m[1]);
    if (!doc) continue;
    const start = m.index ?? 0;
    let end = start + m[0].length;
    // geopend haakje in het fragment: het sluithaakje hoort erbij
    if (m[2].includes("(") && tekst.charAt(end) === ")") end += 1;
    const n = m[3].match(/\d+/);
    uit.push({ start, end, doc, pagina: /^(?:p|pp|blz)\./.test(m[3]) && n ? n[0] : null });
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
  return uit.sort((a, b) => a.start - b.start);
}

// ---------- weergave ----------

function Bronlink({ href, doc, pagina, children }: { href: string; doc: BronDocument; pagina: string | null; children: ReactNode }) {
  const titel = `Opent ${doc.bestand}${pagina ? " op pagina " + pagina : ""} (nieuw tabblad)`;
  return (
    <a className="ok-bron" href={href} target="_blank" rel="noopener noreferrer" title={titel}>
      {children}
      <span className="ok-bron-i" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

/** Tekst met de verwijzingen als links; alleen te gebruiken met een ingevulde basis. */
function verdeel(tekst: string, basis: string): ReactNode[] {
  const verwijzingen = vindVerwijzingen(tekst);
  if (verwijzingen.length === 0) return [tekst];
  const uit: ReactNode[] = [];
  let pos = 0;
  verwijzingen.forEach((v, i) => {
    const href = bronUrl(basis, v.doc, v.pagina);
    if (!href) return;
    if (v.start > pos) uit.push(tekst.slice(pos, v.start));
    uit.push(
      <Bronlink key={i} href={href} doc={v.doc} pagina={v.pagina}>
        {tekst.slice(v.start, v.end)}
      </Bronlink>
    );
    pos = v.end;
  });
  if (pos < tekst.length) uit.push(tekst.slice(pos));
  return uit;
}

function Bronlinks({ tekst }: { tekst: string }) {
  const { documentenBasis } = useContext(BronContext);
  const delen = useMemo(
    () => (documentenBasis && tekst ? verdeel(tekst, documentenBasis) : null),
    [tekst, documentenBasis]
  );
  if (!delen) return tekst;
  return <>{delen}</>;
}

/**
 * Tekst waarin verwijzingen naar 3sides-documenten links zijn geworden (zie boven).
 * Leest de map uit de BronContext bij het renderen; zonder map komt de tekst
 * ongewijzigd terug. Werkt ook op de delen van `metLabel` (label en rest apart).
 */
export function metBronlinks(tekst: string): ReactNode {
  if (!tekst) return tekst;
  return <Bronlinks tekst={tekst} />;
}

// Stijl van de links: Cito-blauw, gestippeld onderstreept, onderstreept bij hover,
// met een klein pijltje na de tekst. Staat in de provider, dus overal waar links kunnen komen.
export const BRON_CSS = `
.ok-bron{color:#003366;text-decoration:underline dotted rgba(0,51,102,.45);text-underline-offset:2px;text-decoration-thickness:1px;border-radius:2px}
.ok-bron:hover,.ok-bron:focus-visible{text-decoration:underline solid #003366;outline:none}
.ok-bron:focus-visible{box-shadow:0 0 0 2px rgba(0,51,102,.25)}
.ok-bron-i{display:inline-block;font-size:.72em;line-height:1;margin-left:.12em;vertical-align:.3em;opacity:.65;text-decoration:none}
.ok-bron:hover .ok-bron-i{opacity:1}
`;
