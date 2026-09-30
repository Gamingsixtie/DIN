// Tijdlijn (Gantt) van een projecttijdlijn, letterlijk uit de bron (bijv. de
// projecttijdlijn-Excel van 3sides). Per werkstroom een groep met een kop (naam, naam
// bij 3sides, domeinstrook); per onderdeel van de werkstroom één balk over de maanden:
//   ▶ = start · balk = loopt · ruit = oplevering (daar eindigt de balk);
//   geen start gemarkeerd → het begin vervaagt; geen oplevering → het eind vervaagt,
//   of de balk loopt als pijl door na de laatste maand.
// Standlijn gestippeld met label: zonder ingestelde maand (nu leeg of "vandaag") op de
// dag van vandaag (maand plus de positie binnen de maand, label "vandaag dd-mm"), anders
// aan de rechterrand van de gekozen maand met het eigen label. Jaargrens als sterkere
// lijn, status (+, +/-, -) als gekleurde stip met het teken, voortgang (Loopt, Niet
// gestart, Afgerond) als klein label; een afgerond onderdeel krijgt een vollere balk.
// Balkkleur = het eerste domein van de werkstroom; alle vier de domeinen = Cito-blauw.
// Bewerkmodus: teksten aanpasbaar, een maandcel klik je door (leeg → start → loopt →
// oplevering → leeg), regels en groepen (werkstromen) toevoegen en verwijderen; per
// groep vink je de domeinen aan (kleur van strook en balken volgt) en kies je de
// werkstroomkaart waar de groep bij hoort (anker); de maanden liggen vast.
// Eigen scrollcontainer (min. ca. 920px breed) waarin de onderdeelkolom blijft staan;
// de pagina zelf scrolt nooit zijwaarts. Past de tijdlijn niet in beeld (telefoon), dan
// schuift de container in weergave bij het openen naar de standlijn.
// Voor andere blokken (het voortgangsbord): `tijdlijnRijen` en `maandDatum` onderaan.

import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import type { BewerkbaarDocument as DocData } from "@/lib/schemas";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";
import { Keuze, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { metBronlinks } from "@/components/bewerkbaar/bron-context";

type Tijdlijn = BlokVan<"tijdlijn">;
type Groep = Tijdlijn["groepen"][number];
/** Past een kopie van één groep aan; de wijziging gaat via het blok naar boven. */
type ZetGroep = (fn: (g: Groep) => void) => void;
type Cel = "" | "start" | "loopt" | "oplevering";
type Domein = { id: string; label: string; kleur: string };
type Jaar = { label: string; van: number; aantal: number };
/** Aaneengesloten reeks niet-lege maanden (van en tot inclusief). */
type Loop = { van: number; tot: number };
type Plan = {
  eerste: number;
  laatste: number;
  lopen: Loop[];
  starts: number[];
  opleveringen: number[];
  /** de eerste niet-lege cel is een start */
  startGemarkeerd: boolean;
  /** de eerste niet-lege cel is "loopt" */
  looptAl: boolean;
  /** oplevering: eindigt met een oplevering · door: loopt door na de laatste maand · open: eind niet gemarkeerd */
  eind: "oplevering" | "door" | "open";
};
type StatusSoort = "plus" | "plusmin" | "min" | "leeg" | "anders";
/** Waar de standlijn staat: positie op de maandschaal (0..1), de maand (of −1 buiten het bereik) en het label. */
type Stand = { frac: number; idx: number; label: string; vandaag: boolean };
export type VoortgangSoort = "afgerond" | "loopt" | "niet" | "anders";

const CITO = "#003366";
const NEUTRAAL = "#64748b";

/** Voortgang zoals de tijdlijn die kent; een andere (oude) waarde blijft als eigen keuze staan. */
const VOORTGANG_OPTIES: readonly string[] = ["", "Loopt", "Niet gestart", "Afgerond"];

// Nederlandse maandnamen en -afkortingen (ook de Engelse uit de Excel) → maandnummer 0..11.
const MAAND_NUMMERS: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mrt: 2, maa: 2, mar: 2, maart: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  aug: 7, augustus: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Volgorde bij het doorklikken van een maandcel in bewerkmodus. */
const VOLGENDE: Record<Cel, Cel> = { "": "start", start: "loopt", loopt: "oplevering", oplevering: "" };
const CEL_NAAM: Record<Cel, string> = { "": "leeg", start: "start", loopt: "loopt", oplevering: "oplevering" };
// Ook de tekens en termen uit de Excel herkennen (▶ Start, ⟳, ⚑ Delivery).
const CEL_ALIAS = new Map<string, Cel>([
  ["start", "start"],
  ["▶", "start"],
  ["loopt", "loopt"],
  ["⟳", "loopt"],
  ["oplevering", "oplevering"],
  ["delivery", "oplevering"],
  ["⚑", "oplevering"],
]);
const STATUS_TEKEN: Record<StatusSoort, string> = { plus: "+", plusmin: "±", min: "−", leeg: "", anders: "" };

/** Tekstveld dat in oudere opslag kan ontbreken. */
function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

function celVan(v: string | undefined): Cel {
  return CEL_ALIAS.get(tekst(v).replace(/[︎️]/g, "").trim().toLowerCase()) ?? "";
}

/** Percentage met hooguit vier decimalen, voor posities op de maandschaal. */
function pct(x: number): string {
  return `${Math.round(x * 1e6) / 1e4}%`;
}

function jaarIndeling(jaren: Tijdlijn["jaren"], n: number): Jaar[] {
  const uit: Jaar[] = [];
  let van = 0;
  for (const j of jaren ?? []) {
    if (van >= n) break;
    const aantal = Math.min(Math.max(0, Math.floor(j.maanden)), n - van);
    if (aantal === 0) continue;
    uit.push({ label: tekst(j.label), van, aantal });
    van += aantal;
  }
  return uit;
}

function planVan(cellen: Cel[]): Plan | null {
  const eerste = cellen.findIndex((c) => c !== "");
  if (eerste < 0) return null;
  let laatste = cellen.length - 1;
  while (cellen[laatste] === "") laatste--;
  const lopen: Loop[] = [];
  for (let i = eerste; i <= laatste; i++) {
    if (cellen[i] === "") continue;
    const vorige = lopen[lopen.length - 1];
    if (vorige && vorige.tot === i - 1) vorige.tot = i;
    else lopen.push({ van: i, tot: i });
  }
  const bij = (soort: Cel) => cellen.flatMap((c, i) => (c === soort ? [i] : []));
  return {
    eerste,
    laatste,
    lopen,
    starts: bij("start"),
    opleveringen: bij("oplevering"),
    startGemarkeerd: cellen[eerste] === "start",
    looptAl: cellen[eerste] === "loopt",
    eind: cellen[laatste] === "oplevering" ? "oplevering" : laatste === cellen.length - 1 ? "door" : "open",
  };
}

/** De planning in woorden, bijv. ["start jul 2026", "oplevering okt 2026"]; ongemarkeerd = "te bepalen". */
function planDelen(p: Plan, maand: (i: number) => string, n: number): string[] {
  const reeks = (xs: number[]) => xs.map(maand).join(" en ");
  const delen = [p.starts.length > 0 ? "start " + reeks(p.starts) : "start te bepalen"];
  if (p.starts.length === 0 && p.looptAl) delen.push("loopt vanaf " + maand(p.eerste));
  delen.push(p.opleveringen.length > 0 ? "oplevering " + reeks(p.opleveringen) : "oplevering te bepalen");
  if (p.eind === "door") delen.push("loopt door na " + maand(n - 1));
  return delen;
}

function statusSoort(s: string): StatusSoort {
  const t = s.replace(/[−–—]/g, "-").replace(/\s+/g, "").toLowerCase();
  if (t === "" || t === "geen") return "leeg";
  if (t === "+") return "plus";
  if (t === "+/-" || t === "+-" || t === "±") return "plusmin";
  if (t === "-") return "min";
  return "anders";
}

/** Soort voortgang van een onderdeel: Afgerond, Loopt, Niet gestart of iets anders (ook leeg). */
export function voortgangSoort(v: string | undefined): VoortgangSoort {
  const t = tekst(v).trim().toLowerCase();
  if (t === "afgerond" || t === "gereed" || t === "klaar" || t === "done" || t === "completed") return "afgerond";
  if (t === "loopt" || t === "in uitvoering" || t === "running" || t === "in progress") return "loopt";
  if (t === "niet gestart" || t === "not started") return "niet";
  return "anders";
}

/** Keuzes voor de voortgang; een afwijkende bestaande waarde blijft kiesbaar. */
function voortgangOpties(huidig: string): { waarde: string; label: string }[] {
  const opties = VOORTGANG_OPTIES.map((v) => ({ waarde: v, label: v || "geen" }));
  const h = huidig.trim();
  if (h && !VOORTGANG_OPTIES.includes(h)) opties.push({ waarde: h, label: h });
  return opties;
}

// ---------- maanden als datums ----------

/** Maandnummer (0..11) bij een maandlabel als "jul", "sept", "maart" of "jul 2026"; −1 als onbekend. */
function maandNummer(label: string | undefined): number {
  const m = tekst(label).trim().toLowerCase().match(/^[a-z]+/);
  return m ? (MAAND_NUMMERS[m[0]] ?? -1) : -1;
}

/** Jaartal bij maand i uit `jaren` (label "2026" → 2026); NaN als het er niet uit te halen is. */
function jaarNummer(jaren: Tijdlijn["jaren"], n: number, i: number): number {
  const label = jaarIndeling(jaren, n).find((j) => i >= j.van && i < j.van + j.aantal)?.label;
  const m = label?.match(/\d{4}/);
  return m ? Number(m[0]) : NaN;
}

/** Eerste dag van maand `index` van de tijdlijn (jaar uit `jaren`); ongeldige datum als het niet te bepalen is. */
export function maandDatum(b: Tijdlijn, index: number): Date {
  const maanden = b.maanden ?? [];
  const jaar = jaarNummer(b.jaren, maanden.length, index);
  const maand = maandNummer(maanden[index]);
  if (!Number.isFinite(jaar) || maand < 0) return new Date(NaN);
  return new Date(jaar, maand, 1);
}

/** Laatste dag van de maand waarin `d` valt (lokale tijd, 00:00). */
function laatsteDag(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** dd-mm van een datum, zoals in het label van de standlijn. */
function ddmm(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}`;
}

/**
 * Waar de standlijn staat. `nu` leeg of "vandaag": de dag van vandaag, in de maand op
 * de positie dag/aantal dagen; vóór of na het bereik aan de linker- of rechterrand.
 * `nu` een maandlabel: de rechterrand van die maand, met `nuLabel`. "geen": geen lijn.
 */
function standlijn(b: Tijdlijn, maanden: string[], n: number, vandaag: Date): Stand | null {
  const sleutel = tekst(b.nu).trim().toLowerCase();
  if (n === 0 || sleutel === "geen") return null;
  if (sleutel !== "" && sleutel !== "vandaag") {
    const idx = maanden.findIndex((m) => m.trim().toLowerCase() === sleutel);
    if (idx < 0) return null;
    return { frac: (idx + 1) / n, idx, label: tekst(b.nuLabel).trim(), vandaag: false };
  }
  const label = "vandaag " + ddmm(vandaag);
  const dag = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  const datums = maanden.map((_, i) => maandDatum(b, i));
  const idx = datums.findIndex((d) => !Number.isNaN(d.getTime()) && d.getFullYear() === dag.getFullYear() && d.getMonth() === dag.getMonth());
  if (idx >= 0) {
    const dagen = laatsteDag(dag).getDate();
    return { frac: (idx + dag.getDate() / dagen) / n, idx, label, vandaag: true };
  }
  const geldig = datums.filter((d) => !Number.isNaN(d.getTime()));
  if (geldig.length === 0) return null;
  // buiten het bereik: vóór de eerste maand links, na de laatste rechts
  return dag < geldig[0] ? { frac: 0, idx: -1, label, vandaag: true } : { frac: 1, idx: n, label, vandaag: true };
}

// ---------- voor andere blokken ----------

/** Eén onderdeel van een werkstroom uit de tijdlijn, met de planning als indexen en datum. */
export interface TijdlijnRij {
  /** plek in de tijdlijn: groep en regel (om de voortgang terug te schrijven) */
  groepIndex: number;
  rijIndex: number;
  groepAnker: string;
  groepNaam: string;
  /** naam van het onderdeel */
  activiteit: string;
  /** maand van de start (de ▶-cel, anders de eerste gemarkeerde maand); null zonder markering */
  startIndex: number | null;
  /** maand van de oplevering (de laatste ⚑-cel); null zonder oplevering */
  opleverIndex: number | null;
  /** de laatste gemarkeerde cel is "loopt" en er is geen oplevering */
  loopt: boolean;
  voortgang: string;
  status: string;
  /** laatste dag van de oplevermaand; null zonder oplevering of zonder bruikbaar jaar */
  opleverDatum: Date | null;
}

/** Alle onderdelen van alle groepen, in de volgorde van de tijdlijn. */
export function tijdlijnRijen(b: Tijdlijn): TijdlijnRij[] {
  const n = (b.maanden ?? []).length;
  const uit: TijdlijnRij[] = [];
  (b.groepen ?? []).forEach((g, groepIndex) => {
    (g.rijen ?? []).forEach((rij, rijIndex) => {
      const cellen = Array.from({ length: n }, (_, i) => celVan((rij.cellen ?? [])[i]));
      const plan = planVan(cellen);
      const opleverIndex = plan && plan.opleveringen.length > 0 ? plan.opleveringen[plan.opleveringen.length - 1] : null;
      const eerste = maandDatum(b, opleverIndex ?? 0);
      uit.push({
        groepIndex,
        rijIndex,
        groepAnker: tekst(g.anker).trim(),
        groepNaam: tekst(g.naam).trim(),
        activiteit: tekst(rij.activiteit).trim(),
        startIndex: plan ? (plan.starts[0] ?? plan.eerste) : null,
        opleverIndex,
        loopt: plan !== null && opleverIndex === null && cellen[plan.laatste] === "loopt",
        voortgang: tekst(rij.voortgang).trim(),
        status: tekst(rij.status).trim(),
        opleverDatum: opleverIndex !== null && !Number.isNaN(eerste.getTime()) ? laatsteDag(eerste) : null,
      });
    });
  });
  return uit;
}

/**
 * Zet de voortgang van één onderdeel in (een kopie van) het document: in de eerste tijdlijn,
 * zoals useBlok die vindt. Voor het voortgangsbord, dat de tijdlijn leest maar niet zelf is.
 */
export function zetVoortgang(d: DocData, groepIndex: number, rijIndex: number, waarde: string): void {
  for (const s of d.secties ?? []) {
    for (const b of s.blokken ?? []) {
      if (b.type !== "tijdlijn") continue;
      const rij = b.groepen?.[groepIndex]?.rijen?.[rijIndex];
      if (rij) rij.voortgang = waarde;
      return;
    }
  }
}

/** De drie standen die je in weergave kunt kiezen. */
const VOORTGANG_KEUZES = ["Niet gestart", "Loopt", "Afgerond"] as const;

/**
 * Voortgang direct aanpassen, ook buiten de bewerkmodus: een keuzelijst in de vorm van het
 * statuslabel (Niet gestart, Loopt, Afgerond). De wijziging gaat meteen naar de sessie; het
 * voortgangsbord en de werkstroomkaarten rekenen mee. `cls` geeft de stijl (tijdlijn of bord).
 */
export function VoortgangKeuze({ waarde, on, onderdeel, cls }: { waarde: string; on: (x: string) => void; onderdeel: string; cls: string }) {
  const h = waarde.trim();
  const soort = voortgangSoort(h);
  const lijst: string[] = [...VOORTGANG_KEUZES];
  if (h && !lijst.includes(h)) lijst.push(h);
  return (
    <select
      className={cls + " " + cls + "-" + soort}
      value={h}
      onChange={(e) => on(e.target.value)}
      aria-label={"Voortgang van " + onderdeel}
      title="Voortgang aanpassen; wordt meteen bewaard"
    >
      {!h && <option value="">—</option>}
      {lijst.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** Stijl van de keuzelijst; `k` is de klasse (tl-vk of vb-vk). */
export function voortgangKeuzeCss(k: string): string {
  const pijl =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%235f6b7a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  return `
.${k}{appearance:none;-webkit-appearance:none;flex:none;max-width:100%;font:inherit;font-size:11px;font-weight:600;line-height:1.35;padding:2px 22px 2px 9px;border:1px solid #cbd5e1;border-radius:999px;background:#fff ${pijl} no-repeat right 7px center/9px 6px;color:var(--ink2,#4a5565);cursor:pointer}
.${k}:hover{border-color:#94a3b8}
.${k}:focus-visible{outline:2px solid rgba(0,51,102,.35);outline-offset:1px}
.${k}-afgerond{background-color:#ecfdf5;border-color:#a7f3d0;color:#047857;font-weight:700}
.${k}-loopt{border-color:#94a3b8;color:var(--ink,#111827);font-weight:700}
`;
}

function domeinenVan(g: Groep): Domein[] {
  const uit: Domein[] = [];
  for (const id of g.domeinen ?? []) {
    const d = domein(tekst(id));
    if (d && !uit.some((x) => x.id === d.id)) uit.push(d);
  }
  return uit;
}

// Wijzigingen aan de opbouw (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegGroepToe(t: Tijdlijn) {
  t.groepen.push({ naam: "Nieuwe werkstroom", bijnaam: "", anker: "", domeinen: [], rijen: [] });
}

/** Vinkt een domein aan of uit; de lijst houdt de outside-in volgorde van DOMEINEN. */
function zetGroepDomein(g: Groep, id: string, aan: boolean) {
  const huidig = (g.domeinen ?? []).map(tekst);
  const gekozen = new Set(huidig);
  if (aan) gekozen.add(id);
  else gekozen.delete(id);
  const bekend = DOMEINEN.map((d) => d.id).filter((x) => gekozen.has(x));
  const overig = huidig.filter((x) => !domein(x) && gekozen.has(x));
  g.domeinen = [...bekend, ...overig];
}

/** Keuzes voor het anker van een groep: geen, de werkstroomkaarten in het document, en het huidige anker als dat nergens bij hoort. */
function ankerOpties(huidig: string, ankers: ReadonlySet<string>): { waarde: string; label: string }[] {
  const kaarten = [...ankers].filter((a) => a.startsWith("wk-")).map((a) => a.slice(3)).sort();
  const opties = [{ waarde: "", label: "geen" }, ...kaarten.map((id) => ({ waarde: id, label: id }))];
  if (huidig && !kaarten.includes(huidig)) opties.push({ waarde: huidig, label: `${huidig} (geen kaart)` });
  return opties;
}

/** Bewerkmodus: per DIN-domein een vinkje; strook en balkkleur van de groep volgen. */
function DomeinVinkjes({ g, zetG }: { g: Groep; zetG: ZetGroep }) {
  const gekozen = new Set((g.domeinen ?? []).map(tekst));
  return (
    <span className="tl-vinken" role="group" aria-label="Domeinen">
      {DOMEINEN.map((d) => (
        <label key={d.id} className="tl-vink" style={{ "--tl-vk": d.kleur } as CSSProperties}>
          <input
            type="checkbox"
            checked={gekozen.has(d.id)}
            onChange={(e) => {
              const aan = e.target.checked;
              zetG((n) => zetGroepDomein(n, d.id, aan));
            }}
          />
          {d.label}
        </label>
      ))}
    </span>
  );
}

/** Balkkleur: het eerste domein van de werkstroom; alle vier de domeinen = Cito-blauw. */
function balkKleur(ds: Domein[]): string {
  if (ds.length === 0) return NEUTRAAL;
  return ds.length >= DOMEINEN.length ? CITO : ds[0].kleur;
}

/** Domeinstrook links van de groep: één kleur, of smalle banen naast elkaar per domein. */
function strook(ds: Domein[]): { breedte: number; beeld: string } {
  if (ds.length === 0) return { breedte: 6, beeld: "linear-gradient(#cbd5e1, #cbd5e1)" };
  const w = ds.length === 1 ? 6 : ds.length === 2 ? 3 : 2;
  const banen = ds.map((d, i) => `${d.kleur} ${i * w}px ${(i + 1) * w}px`).join(", ");
  return { breedte: w * ds.length, beeld: `linear-gradient(to right, ${banen})` };
}

/**
 * Achtergrond van de maandbaan in elke regel: een haarlijn per maand, een sterkere lijn
 * op de jaargrens en een lichte tint tot aan de standlijn (positie 0..1 op de schaal).
 */
function raster(n: number, grenzen: number[], nuFrac: number | null): string {
  if (n <= 0) return "none";
  const lijnen = (posities: number[], dikte: number, kleur: string) =>
    "linear-gradient(to right, " +
    posities
      .map((i) => {
        const p = pct(i / n);
        return `transparent ${p}, ${kleur} ${p} calc(${p} + ${dikte}px), transparent calc(${p} + ${dikte}px)`;
      })
      .join(", ") +
    ")";
  const lagen: string[] = [];
  if (grenzen.length > 0) lagen.push(lijnen(grenzen, 2, "var(--tl-jaar)"));
  lagen.push(lijnen(Array.from({ length: n }, (_, i) => i), 1, "var(--tl-lijn)"));
  if (nuFrac !== null && nuFrac > 0) {
    const p = pct(nuFrac);
    lagen.push(`linear-gradient(to right, var(--tl-verleden) ${p}, transparent ${p})`);
  }
  return lagen.join(", ");
}

// ---------- kleine onderdelen ----------

/** Statusstip met het teken; leeg = grijze open stip. */
function Stip({ status }: { status: string }) {
  const soort = statusSoort(status);
  const label = soort === "leeg" ? "geen status" : "status " + status.trim();
  return (
    <span className={"tl-stip tl-stip-" + soort} role="img" aria-label={label} title={label}>
      {STATUS_TEKEN[soort]}
    </span>
  );
}

/** ▶ start: driehoek met een witte rand, iets hoger dan de balk zodat hij er los van leest. */
function Driehoek({ style, los = false }: { style?: CSSProperties; los?: boolean }) {
  return (
    <svg
      className={los ? "tl-mk-los" : "tl-mk tl-mk-start"}
      style={style}
      width="16"
      height="20"
      viewBox="-2 -2 16 20"
      aria-hidden="true"
    >
      <path d="M0 0L12 8L0 16Z" />
    </svg>
  );
}

/** Oplevering: ruit met een witte rand. */
function Ruit({ style, los = false }: { style?: CSSProperties; los?: boolean }) {
  return (
    <svg
      className={los ? "tl-mk-los" : "tl-mk tl-mk-ruit"}
      style={style}
      width="18"
      height="18"
      viewBox="-2 -2 18 18"
      aria-hidden="true"
    >
      <path d="M7 0L14 7L7 14L0 7Z" />
    </svg>
  );
}

/**
 * De balk van één onderdeel: loopt van de eerste tot de laatste gemarkeerde maand.
 * Lege maanden daartussen worden een dunne verbindingslijn. Posities zijn relatief
 * binnen de balk (de .tl-greep beslaat precies die maanden).
 */
function Balk(p: {
  plan: Plan;
  n: number;
  naam: string;
  maand: (i: number) => string;
  /** voortgang: niet gestart (gearceerd) of afgerond (voller, donkerder) */
  soort: VoortgangSoort;
  edit: boolean;
}) {
  const { plan, n } = p;
  const w = plan.laatste - plan.eerste + 1;
  const rel = (i: number) => pct((i - plan.eerste) / w);
  const delen = planDelen(plan, p.maand, n);
  const laatste = plan.lopen.length - 1;
  // Tooltip rechts uitlijnen als de balk vooral in de tweede helft ligt, zodat hij in beeld blijft.
  const rechts = plan.eerste + w / 2 > n / 2;
  const toon = p.soort === "niet" ? " tl-niet" : p.soort === "afgerond" ? " tl-af" : "";
  return (
    <div
      className={"tl-greep" + toon}
      role="img"
      aria-label={`Onderdeel ${p.naam}: ${delen.join(", ")}${p.soort === "afgerond" ? ", afgerond" : ""}`}
      style={{ left: pct(plan.eerste / n), width: pct(w / n) }}
    >
      {plan.lopen.map((l, li) => {
        const door = li === laatste && plan.eind === "door";
        const vaagL = li === 0 && !plan.startGemarkeerd;
        const vaagR = li === laatste && plan.eind === "open";
        const vaag = vaagL && vaagR ? " tl-vaag-lr" : vaagL ? " tl-vaag-l" : vaagR ? " tl-vaag-r" : "";
        return (
          <span
            key={"b" + li}
            className={"tl-balk" + (door ? " tl-door" : "") + vaag}
            style={{
              left: `calc(${rel(l.van)} + 3px)`,
              width: `calc(${pct((l.tot - l.van + 1) / w)} - ${door ? 3 : 6}px)`,
            }}
          />
        );
      })}
      {plan.lopen.slice(1).map((l, li) => {
        const vorige = plan.lopen[li];
        return (
          <span
            key={"v" + li}
            className="tl-verbind"
            style={{
              left: `calc(${rel(vorige.tot + 1)} - 3px)`,
              width: `calc(${pct((l.van - vorige.tot - 1) / w)} + 6px)`,
            }}
          />
        );
      })}
      {plan.starts.map((i) => (
        <Driehoek key={"s" + i} style={{ left: rel(i) }} />
      ))}
      {/* midden 9px vóór het eind van de maand: de ruit (18px incl. rand) blijft binnen de maand */}
      {plan.opleveringen.map((i) => (
        <Ruit key={"o" + i} style={{ left: `calc(${rel(i + 1)} - 9px)` }} />
      ))}
      {!p.edit && (
        <span className={"tl-tip" + (rechts ? " tl-tip-r" : "")}>
          <b>{delen.join(" · ")}</b>
          {p.naam}
        </span>
      )}
    </div>
  );
}

// ---------- het blok ----------

export default function TijdlijnBlok({ b, edit, zet, ankers }: LosBlokProps<"tijdlijn">) {
  const legendaId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const maanden = (b.maanden ?? []).map(tekst);
  const groepen = b.groepen ?? [];
  const n = maanden.length;
  // Standlijn: op de dag van vandaag, of aan de rechterrand van de ingestelde maand.
  const nuSleutel = tekst(b.nu).trim().toLowerCase();
  const stand = standlijn(b, maanden, n, new Date());
  const nuIdx = stand?.idx ?? -1;
  const nuFrac = stand?.frac ?? null;
  const nuLabel = stand?.label ?? "";

  // Past de tijdlijn niet in beeld (telefoon), dan in weergave de scrollcontainer zo zetten
  // dat de standlijn ongeveer midden in het zichtbare deel van de maanden staat: rechts van
  // de vaste onderdeelkolom, die er sticky overheen ligt. Alleen scrollLeft, niet vloeiend;
  // de pagina scrolt niet mee. Bij het openen en als de stand verandert.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (edit || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const nu = scroller.querySelector<HTMLElement>(".tl-nu");
    if (!nu) return;
    const vast = scroller.querySelector<HTMLElement>(".tl-akt")?.offsetWidth ?? 0;
    const x = nu.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollLeft = Math.max(0, x - (vast + scroller.clientWidth) / 2);
  }, [edit, nuFrac]);

  if (!edit && (n === 0 || groepen.length === 0)) return null;

  const jaren = jaarIndeling(b.jaren, n);
  const jaarVan = (i: number) => jaren.find((j) => i >= j.van && i < j.van + j.aantal)?.label ?? "";
  const maand = (i: number) => `${maanden[i] ?? ""} ${jaarVan(i)}`.trim();
  const grenzen = jaren.map((j) => j.van).filter((i) => i > 0 && i < n);
  // een maand is voorbij als hij helemaal links van de standlijn ligt
  const voorbij = (i: number) => nuFrac !== null && (i + 1) / n <= nuFrac + 1e-9;

  // Per regel de genormaliseerde cellen en het plan, en wat de legenda moet tonen.
  const vlag = { niet: false, af: false, vaag: false, door: false };
  const regels = groepen.map((g) =>
    (g.rijen ?? []).map((rij) => {
      const cellen = Array.from({ length: n }, (_, i) => celVan((rij.cellen ?? [])[i]));
      const plan = planVan(cellen);
      if (plan) {
        const soort = voortgangSoort(rij.voortgang);
        if (soort === "niet") vlag.niet = true;
        if (soort === "afgerond") vlag.af = true;
        if (!plan.startGemarkeerd || plan.eind === "open") vlag.vaag = true;
        if (plan.eind === "door") vlag.door = true;
      }
      return { cellen, plan };
    })
  );
  const gebruikt = new Set<string>();
  let alleVier = false;
  for (const g of groepen) {
    const ds = domeinenVan(g);
    for (const d of ds) gebruikt.add(d.id);
    if (ds.length >= DOMEINEN.length) alleVier = true;
  }
  const domeinSleutel = DOMEINEN.filter((d) => gebruikt.has(d.id));

  // Keuze voor de standlijn: vandaag (automatisch), een maand, of geen lijn.
  const nuOpties = [
    { waarde: "", label: "vandaag (automatisch)" },
    ...maanden.flatMap((m, i) => (m !== "" && maanden.indexOf(m) === i ? [{ waarde: m, label: maand(i) }] : [])),
    { waarde: "geen", label: "geen standlijn" },
  ];
  const nuKeuze = nuSleutel === "geen" ? "geen" : stand && !stand.vandaag ? maanden[stand.idx] : "";

  const tStijl = {
    "--tl-n": String(Math.max(n, 1)),
    "--tl-raster": raster(n, grenzen, nuFrac),
    ...(nuFrac !== null ? { "--tl-nu": String(nuFrac) } : {}),
  } as CSSProperties;
  const tKlasse = "tl-t" + (edit ? " tl-edit" : "") + (nuFrac !== null && nuLabel ? " tl-met-nu" : "");
  // Label van de standlijn binnen het beeld houden: dicht bij de rechterrand naar links, bij de linkerrand naar rechts.
  const nuKlasse =
    "tl-nu" +
    (nuFrac !== null && nuFrac > 1 - 0.5 / n ? " tl-nu-rand" : "") +
    (nuFrac !== null && nuFrac < 0.5 / n ? " tl-nu-links" : "");

  return (
    <div className="tl">
      {(edit || b.titel) && (
        <h4 className="okd-bt">
          <V
            v={tekst(b.titel)}
            on={(x) => zet((t) => void (t.titel = x))}
            edit={edit}
            ph="Titel van de tijdlijn (optioneel)"
          />
        </h4>
      )}
      <figure className="tl-paneel">
        {edit && (
          <div className="tl-edit-balk">
            <label className="tl-eb">
              <span className="ok-bl">Standlijn</span>
              <Keuze
                v={nuKeuze}
                opties={nuOpties}
                on={(x) => zet((t) => void (t.nu = x))}
                titel="Waar de standlijn staat: vandaag, een maand, of geen"
              />
            </label>
            {nuKeuze !== "" && nuKeuze !== "geen" ? (
              <label className="tl-eb">
                <span className="ok-bl">Label</span>
                <V
                  v={tekst(b.nuLabel)}
                  on={(x) => zet((t) => void (t.nuLabel = x))}
                  edit
                  ph="bijv. stand 28-09"
                />
              </label>
            ) : (
              nuKeuze === "" && <span className="tl-eb-hint">Label: {stand?.label ?? "vandaag"} (volgt de dag van vandaag).</span>
            )}
            <span className="tl-eb-hint">
              Klik op een maand om de markering te wisselen: leeg → start → loopt → oplevering → leeg.
            </span>
          </div>
        )}

        <div className="tl-scroll" ref={scrollRef}>
          <div
            role="table"
            aria-label={tekst(b.titel) || "Tijdlijn"}
            aria-describedby={legendaId}
            className={tKlasse}
            style={tStijl}
          >
            <div role="rowgroup" className="tl-kopgroep">
              <div role="row" className="tl-r tl-kop">
                <div role="columnheader" className="tl-kh tl-akt">
                  Onderdeel
                </div>
                <div role="columnheader" className="tl-kh tl-kh-st">
                  <span className="tl-kh-t">Status</span>
                </div>
                <div role="columnheader" className="tl-kh tl-schaal">
                  <span className="tl-sr">
                    {n > 0 ? `Planning per maand, ${maand(0)} tot en met ${maand(n - 1)}` : "Planning"}
                  </span>
                  {jaren.length > 0 && (
                    <div className="tl-jaren" aria-hidden="true">
                      {jaren.map((j, ji) => (
                        <div
                          key={ji}
                          className={"tl-jaar" + (j.van > 0 ? " tl-jg" : "")}
                          style={{ gridColumn: `${j.van + 1} / span ${j.aantal}` }}
                        >
                          <span>{j.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="tl-maanden" aria-hidden="true">
                    {maanden.map((m, i) => (
                      <div
                        key={i}
                        className={
                          "tl-maand" +
                          (grenzen.includes(i) ? " tl-jg" : "") +
                          (voorbij(i) ? " tl-vl" : "") +
                          (i === nuIdx ? " tl-nu-m" : "")
                        }
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {groepen.map((g, gi) => {
              const ds = domeinenVan(g);
              const st = strook(ds);
              const gStijl = {
                "--tl-k": balkKleur(ds),
                "--tl-sg": st.beeld,
                "--tl-sb": st.breedte + "px",
              } as CSSProperties;
              const anker = tekst(g.anker).trim();
              const doel = anker ? "wk-" + anker : "";
              // Alleen een link als de werkstroomkaart in het document staat, anders een dode link.
              const link = !edit && doel !== "" && ankers.has(doel);
              const bijnaam = tekst(g.bijnaam).trim();
              const domTekst = ds.map((d) => d.label).join(", ");
              const rijen = g.rijen ?? [];
              const zetG: ZetGroep = (fn) =>
                zet((t) => {
                  const x = t.groepen[gi];
                  if (x) fn(x);
                });
              return (
                <div
                  key={gi}
                  role="rowgroup"
                  id={anker ? "tl-" + anker : undefined}
                  className="tl-groep"
                  style={gStijl}
                >
                  <div role="row" className="tl-r tl-gkop">
                    <div role="rowheader" aria-colspan={3} className="tl-gkop-cel">
                      <div className="tl-gkop-in">
                        <span
                          className="tl-strook"
                          aria-hidden="true"
                          title={domTekst ? "Domeinen: " + domTekst : undefined}
                        />
                        {edit ? (
                          <span className="tl-gkop-edit">
                            <span className="tl-gkop-velden">
                              <V
                                v={tekst(g.naam)}
                                on={(x) => zetG((n) => void (n.naam = x))}
                                edit
                                ph="Naam van de werkstroom"
                              />
                              <V
                                v={tekst(g.bijnaam)}
                                on={(x) => zetG((n) => void (n.bijnaam = x))}
                                edit
                                ph="Naam bij 3sides (optioneel)"
                              />
                              <label className="tl-eb">
                                <span className="ok-bl">Kaart</span>
                                <Keuze
                                  v={anker}
                                  opties={ankerOpties(anker, ankers)}
                                  on={(x) => zetG((n) => void (n.anker = x))}
                                  titel="Werkstroomkaart waar deze groep bij hoort"
                                />
                              </label>
                              <WegKnop
                                titel="Groep verwijderen"
                                label="× groep"
                                on={() => zet((t) => void t.groepen.splice(gi, 1))}
                              />
                            </span>
                            <DomeinVinkjes g={g} zetG={zetG} />
                          </span>
                        ) : (
                          <>
                            {link ? (
                              <a className="tl-gnaam" href={"#" + doel} title="Naar de werkstroomkaart">
                                {g.naam} <span aria-hidden="true">→</span>
                              </a>
                            ) : (
                              <span className="tl-gnaam">{g.naam}</span>
                            )}
                            {bijnaam && (
                              <span className="tl-bijnaam">
                                {/^3sides\b/i.test(bijnaam) ? bijnaam : "3sides: " + bijnaam}
                              </span>
                            )}
                            {domTekst && <span className="tl-sr">, domeinen: {domTekst}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {rijen.map((rij, ri) => {
                    const regel = regels[gi]?.[ri];
                    const plan = regel?.plan ?? null;
                    const cellen = regel?.cellen ?? [];
                    const voortgang = tekst(rij.voortgang);
                    const soort = voortgangSoort(voortgang);
                    const naam = tekst(rij.activiteit).trim() || "Onderdeel zonder naam";
                    return (
                      <div key={ri} role="row" className="tl-r tl-rij">
                        <div role="rowheader" className="tl-akt">
                          <span className="tl-strook" aria-hidden="true" />
                          {edit ? (
                            <div className="ok-rij">
                              <V
                                v={tekst(rij.activiteit)}
                                on={(x) => zet((t) => void (t.groepen[gi].rijen[ri].activiteit = x))}
                                edit
                                ml
                                ph="Onderdeel"
                              />
                              <WegKnop
                                titel="Regel verwijderen"
                                on={() => zet((t) => void t.groepen[gi].rijen.splice(ri, 1))}
                              />
                            </div>
                          ) : (
                            metBronlinks(rij.activiteit)
                          )}
                        </div>

                        <div role="cell" className={edit ? "tl-st tl-st-edit" : "tl-st"}>
                          {edit ? (
                            <>
                              <div className="tl-st-rij">
                                <Stip status={tekst(rij.status)} />
                                <V
                                  v={tekst(rij.status)}
                                  on={(x) => zet((t) => void (t.groepen[gi].rijen[ri].status = x))}
                                  edit
                                  ph="+ · +/- · -"
                                />
                              </div>
                              <Keuze
                                v={voortgang}
                                opties={voortgangOpties(voortgang)}
                                on={(x) => zet((t) => void (t.groepen[gi].rijen[ri].voortgang = x))}
                                titel="Voortgang: Loopt, Niet gestart of Afgerond"
                              />
                            </>
                          ) : (
                            <>
                              <Stip status={tekst(rij.status)} />
                              <VoortgangKeuze
                                cls="tl-vk"
                                waarde={voortgang}
                                onderdeel={naam}
                                on={(x) => zet((t) => void (t.groepen[gi].rijen[ri].voortgang = x))}
                              />
                            </>
                          )}
                        </div>

                        <div role="cell" className="tl-spoor">
                          {plan ? (
                            <Balk plan={plan} n={n} naam={naam} maand={maand} soort={soort} edit={edit} />
                          ) : (
                            <span className="tl-sr">geen maand gemarkeerd</span>
                          )}
                          {edit && (
                            <div className="tl-knoppen">
                              {cellen.map((c, ci) => {
                                const volgende = CEL_NAAM[VOLGENDE[c]];
                                return (
                                  <button
                                    key={ci}
                                    type="button"
                                    className="tl-cel"
                                    title={`${maand(ci)}: ${CEL_NAAM[c]} (klik: ${volgende})`}
                                    aria-label={`${naam}, ${maand(ci)}: ${CEL_NAAM[c]}. Klik voor ${volgende}.`}
                                    onClick={() =>
                                      zet((t) => {
                                        const r = t.groepen[gi].rijen[ri];
                                        while (r.cellen.length < n) r.cellen.push("");
                                        r.cellen[ci] = VOLGENDE[celVan(r.cellen[ci])];
                                      })
                                    }
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {edit && (
                    <div role="row" className="tl-r tl-plusrij">
                      <div role="cell" className="tl-akt">
                        <span className="tl-strook" aria-hidden="true" />
                        <PlusKnop
                          label="+ regel"
                          on={() =>
                            zetG(
                              (n) =>
                                void n.rijen.push({
                                  activiteit: "",
                                  cellen: maanden.map(() => ""),
                                  voortgang: "",
                                  status: "",
                                })
                            )
                          }
                        />
                      </div>
                      <div role="cell" />
                      <div role="cell" />
                    </div>
                  )}
                </div>
              );
            })}

            {edit && (
              <div role="rowgroup" className="tl-groep tl-groep-plus">
                <div role="row" className="tl-r tl-plusrij">
                  <div role="cell" className="tl-akt">
                    <PlusKnop label="+ groep" on={() => zet(voegGroepToe)} />
                  </div>
                  <div role="cell" />
                  <div role="cell" />
                </div>
              </div>
            )}

            {nuFrac !== null && (
              <div className={nuKlasse} aria-hidden="true">
                {nuLabel && <span className="tl-nu-label">{nuLabel}</span>}
              </div>
            )}
          </div>
        </div>

        <figcaption className="tl-voet" id={legendaId}>
          <div className="tl-sleutel">
            <span className="tl-sl">
              <Driehoek los /> start
            </span>
            <span className="tl-sl">
              <i className="tl-sw" aria-hidden="true" /> loopt
            </span>
            <span className="tl-sl">
              <Ruit los /> oplevering
            </span>
            {vlag.niet && (
              <span className="tl-sl">
                <i className="tl-sw tl-sw-niet" aria-hidden="true" /> niet gestart
              </span>
            )}
            {vlag.af && (
              <span className="tl-sl">
                <i className="tl-sw tl-sw-af" aria-hidden="true" /> afgerond
              </span>
            )}
            {vlag.vaag && (
              <span className="tl-sl">
                <i className="tl-sw tl-sw-vaag" aria-hidden="true" /> start of oplevering te bepalen
              </span>
            )}
            {vlag.door && (
              <span className="tl-sl">
                <i className="tl-sw tl-sw-door" aria-hidden="true" /> loopt door na {maand(n - 1)}
              </span>
            )}
            {nuFrac !== null && (
              <span className="tl-sl">
                <i className="tl-sw-nu" aria-hidden="true" /> {nuLabel || "standlijn"}
              </span>
            )}
          </div>
          <div className="tl-sleutel">
            <span className="tl-sl">
              <span className="tl-sl-kop">Status</span>
              <Stip status="+" />
              <Stip status="+/-" />
              <Stip status="-" />
              <Stip status="" /> geen
            </span>
            {domeinSleutel.length > 0 && (
              <span className="tl-sl-groep">
                <span className="tl-sl-kop">Domein</span>
                {domeinSleutel.map((d) => (
                  <span key={d.id} className="tl-sl">
                    <i className="tl-dom" style={{ background: d.kleur }} aria-hidden="true" /> {d.label}
                  </span>
                ))}
                {alleVier && (
                  <span className="tl-sl">
                    <i className="tl-dom" style={{ background: CITO }} aria-hidden="true" /> alle vier
                  </span>
                )}
              </span>
            )}
          </div>
          {(edit || b.legenda) && (
            <V
              v={tekst(b.legenda)}
              on={(x) => zet((t) => void (t.legenda = x))}
              edit={edit}
              ml
              block
              cls="ok-legend tl-legenda"
              ph="Bron en toelichting (optioneel)"
            />
          )}
        </figcaption>
      </figure>
    </div>
  );
}

// Stijl; wordt samen met OK_CSS en DOC_CSS in het document gezet (BewerkbaarDocument).
// Maatvoering in CSS-variabelen: --tl-a (onderdeel), --tl-s (status), --tl-m (min.
// breedte per maand) en --tl-n (aantal maanden, inline). De balken, de standlijn en
// het raster rekenen met dezelfde variabelen, zodat alles op de maandkolommen valt.
// Lagen binnen .tl-t: balk 1 · standlijn 2 · markering 3 · vaste kolom 4 · knoppen 5 · tooltip 6.
// Anker #tl-<anker>: scroll-margin 80px (zelfde als de werkstroomkaarten); wint bewust van
// de algemene regel .okd [id^="tl-"] in DOC_CSS.
export const TIJDLIJN_CSS = voortgangKeuzeCss("tl-vk") + `
.tl{--tl-cito:#003366;--tl-rand:#e2e8f0;--tl-lijn:#edf1f5;--tl-jaar:#b6c2d0;--tl-hover:#f6f8fb;--tl-verleden:rgba(0,51,102,.035);min-width:0}
.tl-paneel{margin:0;min-width:0;background:#fff;border:1px solid var(--tl-rand);border-radius:12px;padding:10px 12px}
.tl-scroll{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:2px;container-type:inline-size}
.tl-t{--tl-a:264px;--tl-s:134px;--tl-m:46px;--tl-kt:6px;position:relative;isolation:isolate;min-width:calc(var(--tl-a) + var(--tl-s) + var(--tl-n) * var(--tl-m));font-size:11.5px;line-height:1.35;color:var(--ink,#111827)}
.tl-t.tl-met-nu{--tl-kt:24px}
.tl-t.tl-edit{--tl-a:284px;--tl-s:156px}
.tl-r{display:grid;grid-template-columns:var(--tl-a) var(--tl-s) minmax(0,1fr)}
.tl-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.tl-kh{display:flex;align-items:flex-end;padding:var(--tl-kt) 8px 6px;background:#fff;box-shadow:inset 0 -1px 0 var(--tl-rand);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#5f6b7a)}
.tl-schaal{display:block;position:relative;padding:var(--tl-kt) 0 0;text-transform:none;letter-spacing:0}
.tl-jaren,.tl-maanden,.tl-knoppen{display:grid;grid-template-columns:repeat(var(--tl-n),minmax(0,1fr))}
.tl-jaar{padding:0 6px 3px;font-size:10.5px;font-weight:800;letter-spacing:.02em;color:var(--ink,#111827);white-space:nowrap}
.tl-jaar.tl-jg{padding-left:8px;box-shadow:inset 2px 0 0 var(--tl-jaar)}
.tl-jaar > span{position:sticky;left:calc(var(--tl-a) + 6px);display:inline-block}
.tl-maand{padding:2px 0 6px;text-align:center;font-size:10px;font-weight:600;color:var(--ink2,#4a5565);box-shadow:inset 1px 0 0 var(--tl-lijn);white-space:nowrap}
.tl-maand.tl-jg{box-shadow:inset 2px 0 0 var(--tl-jaar)}
.tl-maand.tl-vl{background:var(--tl-verleden)}
.tl-maand.tl-nu-m{color:var(--tl-cito);font-weight:800}
.tl-akt{position:sticky;left:0;z-index:4;min-width:0;background:#fff;box-shadow:inset -1px 0 0 var(--tl-rand)}
.tl-kh.tl-akt{padding-left:18px;box-shadow:inset -1px 0 0 var(--tl-rand),inset 0 -1px 0 var(--tl-rand)}
.tl-rij > .tl-akt,.tl-plusrij > .tl-akt{padding:7px 10px 7px 18px}
.tl-groep{--tl-kb:color-mix(in srgb,var(--tl-k) 84%,#fff);--tl-kd:color-mix(in srgb,var(--tl-k) 76%,#000);--tl-kg:color-mix(in srgb,var(--tl-k) 6%,#fff);position:relative}
.tl-t > .tl-groep[id]{scroll-margin-top:80px}
.tl-gkop{background:var(--tl-kg)}
.tl-gkop-cel{grid-column:1/-1;min-width:0}
.tl-gkop-cel,.tl-gkop-in{box-shadow:inset 0 1px 0 var(--tl-rand)}
.tl-kopgroep + .tl-groep .tl-gkop-cel,.tl-kopgroep + .tl-groep .tl-gkop-in{box-shadow:none}
.tl-gkop-in{position:sticky;left:0;z-index:4;display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:1px 10px;max-width:100cqw;padding:8px 12px 7px 18px;background:var(--tl-kg)}
.tl-gnaam{font-size:12.5px;font-weight:800;line-height:1.3;color:var(--tl-cito)}
a.tl-gnaam{text-decoration:none}
a.tl-gnaam:hover,a.tl-gnaam:focus-visible{text-decoration:underline}
.tl-bijnaam{font-size:11px;color:var(--ink2,#4a5565)}
.tl-gkop-edit{display:flex;flex-direction:column;gap:6px;min-width:0}
.tl-gkop-velden{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.tl-gkop-edit .ok-in{width:260px;max-width:100%}
.tl-vinken{display:flex;flex-wrap:wrap;gap:4px 6px}
.tl-vink{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;line-height:1.5;white-space:nowrap;cursor:pointer;color:color-mix(in srgb,var(--tl-vk) 75%,#000);background:color-mix(in srgb,var(--tl-vk) 8%,#fff);border:1px solid color-mix(in srgb,var(--tl-vk) 35%,#fff);border-radius:999px;padding:1px 9px 1px 6px}
.tl-vink input{margin:0;accent-color:var(--tl-vk);cursor:pointer}
.tl-vink:has(input:checked){background:color-mix(in srgb,var(--tl-vk) 16%,#fff);border-color:var(--tl-vk)}
.tl-groep-plus .tl-akt{box-shadow:inset -1px 0 0 var(--tl-rand),inset 0 1px 0 var(--tl-rand)}
.tl-strook{position:absolute;left:0;top:0;bottom:0;width:var(--tl-sb);background:var(--tl-sg)}
.tl-gkop-in > .tl-strook{top:1px}
.tl-kopgroep + .tl-groep .tl-gkop-in > .tl-strook{top:0}
.tl-rij > *,.tl-plusrij > *{box-shadow:inset 0 1px 0 var(--tl-lijn)}
.tl-rij > .tl-akt,.tl-plusrij > .tl-akt{box-shadow:inset -1px 0 0 var(--tl-rand),inset 0 1px 0 var(--tl-lijn)}
.tl-rij:hover{background:var(--tl-hover)}
.tl-rij:hover > .tl-akt{background:var(--tl-hover)}
.tl-st{display:flex;align-items:center;gap:6px;min-width:0;padding:6px 8px}
.tl-st > .tl-vk{flex:0 1 auto;min-width:0}
.tl-st-edit{flex-direction:column;align-items:stretch;gap:4px}
.tl-st-rij{display:flex;align-items:center;gap:6px}
.tl-st-rij > .ok-in{flex:1;min-width:0}
.tl-stip{flex:none;display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;font-size:11px;font-weight:800;line-height:1;color:#fff}
.tl-stip-plus{background:#059669}
.tl-stip-plusmin{background:#d97706}
.tl-stip-min{background:#dc2626}
.tl-stip-anders{background:#94a3b8}
.tl-stip-leeg{width:13px;height:13px;margin:2px;background:#fff;box-shadow:inset 0 0 0 1.5px #cbd5e1}
.tl-vg{font-size:10.5px;line-height:1.25;font-weight:600;color:var(--ink,#111827)}
.tl-vg-niet{font-weight:400;color:var(--ink2,#4a5565)}
.tl-vg-af{display:inline-flex;align-items:center;gap:3px;padding:1px 6px 1px 4px;border-radius:999px;background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;font-size:10px;font-weight:700;white-space:nowrap}
.tl-vink-af{flex:none}
.tl-st-edit .ok-keuze{width:100%}
.tl-spoor{position:relative;min-height:34px;background-image:var(--tl-raster)}
.tl-edit .tl-spoor{background-color:#fffcf0}
.tl-greep{position:absolute;top:0;bottom:0}
.tl-edit .tl-greep{pointer-events:none}
.tl-balk{position:absolute;top:50%;z-index:1;height:12px;margin-top:-6px;border-radius:4px;background:var(--tl-kb)}
.tl-niet .tl-balk{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--tl-k) 32%,#fff) 0 3px,color-mix(in srgb,var(--tl-k) 12%,#fff) 3px 6px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tl-k) 40%,#fff)}
.tl-af .tl-balk{height:14px;margin-top:-7px;background:var(--tl-k)}
.tl-af .tl-verbind{background:var(--tl-k)}
.tl-door{border-radius:4px 0 0 4px;clip-path:polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%)}
.tl-vaag-l{-webkit-mask-image:linear-gradient(to right,transparent,#000 min(24px,45%));mask-image:linear-gradient(to right,transparent,#000 min(24px,45%))}
.tl-vaag-r{-webkit-mask-image:linear-gradient(to left,transparent,#000 min(24px,45%));mask-image:linear-gradient(to left,transparent,#000 min(24px,45%))}
.tl-vaag-lr{-webkit-mask-image:linear-gradient(to right,transparent,#000 min(24px,35%),#000 max(100% - 24px,65%),transparent);mask-image:linear-gradient(to right,transparent,#000 min(24px,35%),#000 max(100% - 24px,65%),transparent)}
.tl-verbind{position:absolute;top:50%;z-index:1;height:2px;margin-top:-1px;background:var(--tl-kb);opacity:.6}
.tl-greep:hover .tl-balk{filter:brightness(1.07) saturate(1.12)}
.tl-mk{position:absolute;top:50%;z-index:3;color:var(--tl-kd);overflow:visible;pointer-events:none}
.tl-mk-start{transform:translateY(-50%)}
.tl-mk-ruit{transform:translate(-50%,-50%)}
.tl-mk path,.tl-mk-los path{fill:currentColor;stroke:#fff;stroke-width:3;stroke-linejoin:round;paint-order:stroke}
.tl-tip{position:absolute;left:0;bottom:calc(50% + 11px);z-index:6;width:max-content;max-width:min(260px,90cqw);padding:6px 9px;border:1px solid var(--tl-rand);border-radius:8px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.13);font-size:11px;line-height:1.4;color:var(--ink2,#4a5565);overflow-wrap:normal;opacity:0;visibility:hidden;transform:translateY(3px);transition:opacity .12s ease,transform .12s ease,visibility 0s linear .12s;pointer-events:none}
.tl-tip-r{left:auto;right:0}
.tl-tip b{display:block;margin-bottom:1px;font-weight:700;color:var(--ink,#111827)}
.tl-greep:hover .tl-tip{opacity:1;visibility:visible;transform:none;transition-delay:0s}
.tl-nu{position:absolute;top:0;bottom:0;left:calc(var(--tl-a) + var(--tl-s) + (100% - var(--tl-a) - var(--tl-s)) * var(--tl-nu));z-index:2;width:0;pointer-events:none}
.tl-nu::before{content:"";position:absolute;top:0;bottom:0;left:-1px;width:2px;background:repeating-linear-gradient(to bottom,var(--tl-cito) 0 5px,transparent 5px 9px);filter:drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)}
.tl-met-nu .tl-nu::before{top:19px}
.tl-nu-label{position:absolute;top:1px;left:0;transform:translateX(-50%);padding:1px 8px;border-radius:999px;background:var(--tl-cito);box-shadow:0 0 0 2px #fff;color:#fff;font-size:9.5px;font-weight:700;line-height:1.5;letter-spacing:.02em;white-space:nowrap}
.tl-nu-rand::before{left:-2px}
.tl-nu-rand .tl-nu-label{transform:translateX(-100%)}
.tl-nu-links::before{left:0}
.tl-nu-links .tl-nu-label{transform:none}
.tl-knoppen{position:absolute;inset:0;z-index:5}
.tl-cel{display:block;margin:0;padding:0;border:0;border-radius:4px;background:transparent;cursor:pointer}
.tl-cel:hover{background:rgba(245,158,11,.16)}
.tl-cel:focus-visible{outline:2px solid var(--tl-cito);outline-offset:-2px}
.tl-edit-balk{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed var(--tl-rand)}
.tl-eb{display:inline-flex;align-items:center;gap:6px}
.tl-eb .ok-in{width:150px}
.tl-eb .ok-keuze{width:auto}
.tl-eb-hint{font-size:10.5px;line-height:1.4;color:var(--ink2,#4a5565)}
.tl-voet{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.tl-sleutel{display:flex;flex-wrap:wrap;align-items:center;gap:5px 14px;font-size:10.5px;line-height:1.4;color:var(--ink2,#4a5565)}
.tl-sl{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.tl-sl-groep{display:inline-flex;flex-wrap:wrap;align-items:center;gap:5px 12px}
.tl-sl-kop{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#5f6b7a)}
.tl-sleutel .tl-stip{width:15px;height:15px;font-size:10px}
.tl-sleutel .tl-stip-leeg{width:11px;height:11px}
.tl-sw{display:inline-block;flex:none;width:24px;height:10px;border-radius:3px;background:#94a3b8}
.tl-sw-niet{background:repeating-linear-gradient(135deg,#cbd5e1 0 3px,#eef2f6 3px 6px);box-shadow:inset 0 0 0 1px #cbd5e1}
.tl-sw-af{height:12px;background:#475569}
.tl-sw-vaag{-webkit-mask-image:linear-gradient(to right,transparent,#000 75%);mask-image:linear-gradient(to right,transparent,#000 75%)}
.tl-sw-door{border-radius:3px 0 0 3px;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 50%,calc(100% - 6px) 100%,0 100%)}
.tl-sw-nu{display:inline-block;flex:none;width:2px;height:14px;background:repeating-linear-gradient(to bottom,var(--tl-cito) 0 4px,transparent 4px 7px)}
.tl-mk-los{flex:none;height:13px;width:auto;color:#475569;overflow:visible}
.tl-dom{display:inline-block;flex:none;width:10px;height:10px;border-radius:2px}
.tl-legenda{white-space:pre-line}
@keyframes tl-doel{from{background-color:#dbe7f5}}
.tl-groep:target > .tl-gkop,.tl-groep:target .tl-gkop-in{animation:tl-doel 2.2s ease-out}
@media (prefers-reduced-motion:reduce){.tl-groep:target > .tl-gkop,.tl-groep:target .tl-gkop-in{animation:none}.tl-tip{transition:none}}
@media (max-width:640px){
.tl-t{--tl-a:150px;--tl-s:30px;--tl-m:40px}
.tl-t.tl-edit{--tl-a:210px;--tl-s:140px}
.tl-rij > .tl-akt,.tl-plusrij > .tl-akt{padding-left:15px}
.tl-t:not(.tl-edit) .tl-st{justify-content:center;padding:6px 0}
.tl-t:not(.tl-edit) .tl-kh-st{padding-left:0;padding-right:0}
.tl-t:not(.tl-edit) .tl-vg,.tl-t:not(.tl-edit) .tl-kh-t{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tl-t:not(.tl-edit) .tl-vk{display:none}
}
`;
