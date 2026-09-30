// Werkstroomkaarten (stap 11 "Programma × 3sides"): per werkstroom één kaart met het
// plan van aanpak, ingepast in het Doelen-Inspanningennetwerk (DIN). Vaste opbouw, op
// elke kaart op dezelfde plek: kop (naam, 3sides-naam, domeinen, leads, bron) →
// Waarom → Resultaten → Planning → Onderdelen in de tijdlijn → In het DIN → Nog nodig →
// Documenten en status. Waar de browser het kan (CSS subgrid) staan de onderdelen van
// kaarten naast elkaar ook op dezelfde hoogte.
//
// Twee onderdelen komen uit andere blokken in hetzelfde document (DocContext):
// - Onderdelen in de tijdlijn: de regels van de tijdlijngroep met anker = id van de kaart,
//   in de volgorde van de tijdlijn. Per onderdeel één regel: naam, maandbereik (▶ start →
//   ⚑ oplevering; jaartal alleen buiten het eerste jaar van de tijdlijn; "start te
//   bepalen" of "oplevering te bepalen" waar de tijdlijn geen maand noemt), status (+,
//   +/-, -) als stip en voortgang (Loopt, Niet gestart, Afgerond) als in de tijdlijn.
//   Oplevermaand voorbij en niet op Afgerond (op de dag van vandaag): rood, "verstreken".
//   Onderaan de link naar de hele tijdlijn (#tl-<id>). Staat er geen tijdlijn in het
//   document, dan valt het onderdeel weg; heeft alleen deze kaart geen groep, dan blijft
//   zijn rij leeg, zodat de onderdelen eronder op gelijke hoogte blijven met de buren.
// - Nog nodig: de regels "nodig" van de werkstroom met hetzelfde anker in het
//   voortgangsbord, afvinkbaar in weergave- én bewerkmodus (het vinkje gaat via useDocZet
//   naar het bord; de app bewaart het). Zonder bord of zonder regels: de eigen lijst
//   `aanvullen` van de kaart. In beide gevallen in de groepjes "Van 3sides" en "Door
//   Cito" (regels die met "Cito:" beginnen), zoals op het voortgangsbord.
// Element-id "wk-<id>" is het linkdoel van de DIN-plaat en de tijdlijn. Onderaan, bij
// "Documenten en status", staan de koppelingen naar de 3sides-documenten en het Jira-bord
// als chips (met url een link in een nieuw tabblad, zonder url gedempt).
// Bewerkmodus: alle teksten en regels zijn aanpasbaar, koppelingen (naam + url) ook;
// per kaart vink je de domeinen aan (kleurband en chips volgen), kaarten voeg je toe
// (+ kaart) en haal je weg (×). Het id van een kaart is het linkdoel (#wk-<id>) voor de
// DIN-plaat en de tijdlijn: een nieuwe kaart krijgt een uniek id afgeleid van de naam;
// in bewerkmodus staat het als "Anker" bij de kaart en kun je het aanpassen. De
// onderdelen uit de tijdlijn en de teksten uit het voortgangsbord pas je daar aan.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BewerkbaarDocument as DocData, DocBlok } from "@/lib/schemas";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";
import { Lijst, PlusKnop, V, WegKnop, metLabel } from "@/components/bewerkbaar/velden";
import { metBronlinks, useBron, useBronUrl, paginaUit, zoekDocument } from "@/components/bewerkbaar/bron-context";
import { Leads } from "@/components/bewerkbaar/leads";
import { useBlok, useDocZet } from "@/components/bewerkbaar/doc-context";
import { tijdlijnRijen, voortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import type { VoortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import { CITO_HINT, NODIG_GROEPEN, citoTekst, nodigGroepen } from "@/components/bewerkbaar/blokken/VoortgangsbordBlok";
import type { NodigGroepen, NodigRegel } from "@/components/bewerkbaar/blokken/VoortgangsbordBlok";

type Blok = BlokVan<"werkstromen">;
type Kaart = Blok["kaarten"][number];
type Koppeling = Kaart["koppelingen"][number];
type Tijdlijn = BlokVan<"tijdlijn">;
type Nodig = BlokVan<"voortgangsbord">["werkstromen"][number]["nodig"][number];
type Domein = { id: string; label: string; kleur: string };
/** Past een kopie van één kaart aan; de wijziging gaat via het blok naar boven. */
type ZetKaart = (fn: (k: Kaart) => void) => void;
type StatusSoort = "plus" | "plusmin" | "min" | "leeg" | "anders";

/** Eén onderdeel van de werkstroom uit de tijdlijn, klaar om op de kaart te tonen. */
interface Onderdeel {
  naam: string;
  /** startmaand (▶), bijv. "jul" of "jan 2027"; null = start te bepalen */
  start: string | null;
  /** oplevermaand (⚑), bijv. "okt" of "mei 2027"; null = oplevering te bepalen */
  oplevering: string | null;
  /** in de tijdlijn is voor dit onderdeel geen enkele maand gemarkeerd */
  zonderMaand: boolean;
  voortgang: string;
  soort: VoortgangSoort;
  status: string;
  /** de oplevermaand is voorbij en het onderdeel staat niet op Afgerond */
  verstreken: boolean;
}

/** De regels "nodig" uit het voortgangsbord voor één kaart, met het afvinken. */
interface BordNodig {
  items: Nodig[];
  /** vinkt regel i (index in het bord) aan of uit; null = kan hier niet (buiten het document) */
  vink: ((i: number, aan: boolean) => void) | null;
}

const CITO = "#003366";
const NEUTRAAL = "#64748b";
/** Rijen per kaart in het raster (subgrid): kop + zes onderdelen; met de tijdlijn één meer. */
const RIJEN = 7;
const NIEUWE_NAAM = "Nieuwe werkstroom";
const STATUS_TEKEN: Record<StatusSoort, string> = { plus: "+", plusmin: "±", min: "−", leeg: "", anders: "" };
/** Zero-width space (U+200B): geeft een stip zonder teken toch een tekstbasislijn. */
const ZONDER_TEKEN = String.fromCharCode(8203);

/** "Adoptie en gedrag" → "adoptie-en-gedrag": kleine letters en koppeltekens, zonder accenten. */
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Id dat niet botst met de bezette ids: basis, basis-2, basis-3, … */
function uniekId(basis: string, bezet: ReadonlySet<string>): string {
  if (!bezet.has(basis)) return basis;
  for (let n = 2; ; n++) if (!bezet.has(`${basis}-${n}`)) return `${basis}-${n}`;
}

/** Een getypt anker: kleine letters, cijfers en koppeltekens (een koppelteken aan het eind mag tijdens het typen). */
function ankerTekst(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");
}

// Wijzigingen aan het blok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegKaartToe(n: Blok) {
  n.kaarten.push({
    id: uniekId(slug(NIEUWE_NAAM), new Set(n.kaarten.map((k) => k.id))),
    naam: NIEUWE_NAAM,
    bijnaam: "",
    domeinen: [],
    leads: "",
    bron: "",
    waarom: "",
    resultaten: [],
    planning: [],
    dinPad: [],
    aanvullen: [],
    koppelingen: [],
  });
}

/** Vinkt een domein aan of uit; de lijst houdt de outside-in volgorde van DOMEINEN. */
function zetKaartDomein(k: Kaart, id: string, aan: boolean) {
  const gekozen = new Set(k.domeinen);
  if (aan) gekozen.add(id);
  else gekozen.delete(id);
  const bekend = DOMEINEN.map((d) => d.id).filter((x) => gekozen.has(x));
  const overig = k.domeinen.filter((x) => !domein(x) && gekozen.has(x));
  k.domeinen = [...bekend, ...overig];
}

// Kleur per DIN-niveau, herkend aan het woord vóór de dubbele punt in "In het DIN"
// ("Vermogen: eenduidige funnelprocessen"). Zelfde kleuren als de lagen van de
// kapstok elders in het document.
const NIVEAUS: { woorden: string[]; kleur: string }[] = [
  { woorden: ["inspanning"], kleur: "#b45309" },
  { woorden: ["vermogen"], kleur: "#0e7490" },
  { woorden: ["baat", "baten"], kleur: "#0066cc" },
  { woorden: ["doel"], kleur: CITO },
];

function niveauKleur(prefix: string): string {
  const t = prefix.trim().toLowerCase();
  if (!t) return NEUTRAAL;
  return NIVEAUS.find((n) => n.woorden.some((w) => t.startsWith(w)))?.kleur ?? NEUTRAAL;
}

/** "Vermogen: eenduidige funnelprocessen" → { prefix: "Vermogen", rest: "eenduidige funnelprocessen" }. */
function splitsSchakel(s: string): { prefix: string; rest: string } {
  const i = s.indexOf(":");
  if (i > 0 && i <= 32) return { prefix: s.slice(0, i).trim(), rest: s.slice(i + 1).trim() };
  return { prefix: "", rest: s.trim() };
}

/** De bekende domeinen van een kaart, zonder dubbele, in de volgorde van de kaart. */
function domeinenVan(ids: string[]): Domein[] {
  const uit: Domein[] = [];
  for (const id of ids) {
    const d = domein(id);
    if (d && !uit.some((x) => x.id === d.id)) uit.push(d);
  }
  return uit;
}

/**
 * Accentkleur van een kaart (waarom-streep, vinkjes, planning): de kleur van het eerste
 * domein. Bouwt de werkstroom in alle domeinen, dan Cito-blauw, zoals op de DIN-plaat.
 */
function accentKleur(doms: Domein[]): string {
  if (doms.length === 0) return NEUTRAAL;
  if (DOMEINEN.every((d) => doms.some((x) => x.id === d.id))) return CITO;
  return doms[0].kleur;
}

/** Inline-stijl met één CSS-variabele; de CSS leidt er rand, tint en tekstkleur van af. */
function kleurVar(naam: string, kleur: string): CSSProperties {
  return { [naam]: kleur } as CSSProperties;
}

const heeft = (s: string) => s.trim() !== "";

/** Alleen een url die met http:// of https:// begint, wordt als link getoond. */
function isLink(url: string): boolean {
  return /^https?:\/\/\S/i.test(url.trim());
}

/** Koppelingen naar Jira ("Jira-bord: …") krijgen een eigen, herkenbare stijl. */
function isJira(label: string): boolean {
  return label.trim().toLowerCase().startsWith("jira");
}

/**
 * De koppelingen van een kaart, altijd als array. Sessies die vóór dit veld zijn
 * opgeslagen, hebben het nog niet; in bewerkmodus wordt het dan op de kopie aangemaakt.
 */
function koppelingenVan(k: Kaart): Koppeling[] {
  return (k.koppelingen ??= []);
}

// ---------- uit de tijdlijn en het voortgangsbord ----------

/** Tekstveld dat in oudere opslag kan ontbreken. */
function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

/** Status zoals de tijdlijn die kent: +, +/-, - of leeg; een andere waarde is "anders". */
function statusSoort(s: string): StatusSoort {
  const t = s.replace(/[−–—]/g, "-").replace(/\s+/g, "").toLowerCase();
  if (t === "" || t === "geen") return "leeg";
  if (t === "+") return "plus";
  if (t === "+/-" || t === "+-" || t === "±") return "plusmin";
  if (t === "-") return "min";
  return "anders";
}

/** Is deze maandcel een start (▶)? Zelfde herkenning als de tijdlijn: "start" of "▶". */
function isStart(cel: string | undefined): boolean {
  const t = tekst(cel).replace(/[︎️]/g, "").trim().toLowerCase();
  return t === "start" || t === "▶";
}

/** Jaarlabel bij elke maand van de tijdlijn, uit `jaren` (bijv. 6 × "2026", 6 × "2027"). */
function jaarPerMaand(tl: Tijdlijn): string[] {
  const n = (tl.maanden ?? []).length;
  const uit = Array.from({ length: n }, () => "");
  let van = 0;
  for (const j of tl.jaren ?? []) {
    if (van >= n) break;
    const aantal = Math.min(Math.max(0, Math.floor(j.maanden)), n - van);
    for (let i = van; i < van + aantal; i++) uit[i] = tekst(j.label).trim();
    van += aantal;
  }
  return uit;
}

/**
 * Start- en oplevermaand in woorden (null waar de tijdlijn geen maand noemt). Het jaartal
 * staat er alleen bij buiten het eerste jaar van de tijdlijn ("dec → mei 2027"); liggen
 * start en oplevering in hetzelfde latere jaar, dan één keer achteraan ("jan → feb 2027").
 */
function maandBereik(
  tl: Tijdlijn,
  jaren: string[],
  start: number | null,
  oplevering: number | null
): { start: string | null; oplevering: string | null } {
  const maanden = tl.maanden ?? [];
  const eersteJaar = jaren[0] ?? "";
  const maand = (i: number) => tekst(maanden[i]).trim() || `maand ${i + 1}`;
  const jaar = (i: number) => {
    const j = jaren[i] ?? "";
    return j !== "" && j !== eersteJaar && !/\d{4}/.test(maand(i)) ? j : "";
  };
  const voluit = (i: number) => (jaar(i) ? `${maand(i)} ${jaar(i)}` : maand(i));
  if (start !== null && oplevering !== null && jaar(start) !== "" && jaar(start) === jaar(oplevering)) {
    return { start: maand(start), oplevering: voluit(oplevering) };
  }
  return {
    start: start === null ? null : voluit(start),
    oplevering: oplevering === null ? null : voluit(oplevering),
  };
}

/**
 * De onderdelen uit de tijdlijn per anker (= id van de werkstroomkaart), in de volgorde
 * van de tijdlijn en beoordeeld op de dag `vandaag` (00:00). Een groep zonder regels geeft
 * een lege lijst; groepen zonder anker tellen niet mee. De planning (maanden, oplevering,
 * opleverdatum) komt uit tijdlijnRijen, zodat kaart, tijdlijn en voortgangsbord gelijk rekenen.
 */
function onderdelenPerAnker(tl: Tijdlijn, vandaag: Date): Map<string, Onderdeel[]> {
  // tijdlijnRijen loopt in dezelfde volgorde door de groepen en hun regels als hieronder
  const rijen = tijdlijnRijen(tl);
  const jaren = jaarPerMaand(tl);
  const uit = new Map<string, Onderdeel[]>();
  let k = 0;
  for (const g of tl.groepen ?? []) {
    const anker = tekst(g.anker).trim();
    let lijst = anker ? uit.get(anker) : undefined;
    if (anker && !lijst) {
      lijst = [];
      uit.set(anker, lijst);
    }
    for (const regel of g.rijen ?? []) {
      const r = rijen[k++];
      if (!lijst || !r) continue;
      const soort = voortgangSoort(r.voortgang);
      // startIndex is de ▶-cel of, zonder start, de eerste gemarkeerde maand: alleen een ▶ telt als start
      const start = r.startIndex !== null && isStart((regel.cellen ?? [])[r.startIndex]) ? r.startIndex : null;
      const bereik = maandBereik(tl, jaren, start, r.opleverIndex);
      lijst.push({
        naam: r.activiteit,
        start: bereik.start,
        oplevering: bereik.oplevering,
        zonderMaand: r.startIndex === null,
        voortgang: r.voortgang,
        soort,
        status: r.status,
        verstreken: r.opleverDatum !== null && soort !== "afgerond" && r.opleverDatum < vandaag,
      });
    }
  }
  return uit;
}

/** Eerste blok van een type in (een kopie van) het document, zoals useBlok het vindt. */
function eersteBlok<T extends DocBlok["type"]>(d: DocData, type: T): Extract<DocBlok, { type: T }> | null {
  for (const s of d.secties) {
    for (const b of s.blokken) if (b.type === type) return b as Extract<DocBlok, { type: T }>;
  }
  return null;
}

/** Vinkt in (een kopie van) het document regel i van "nodig" aan of uit, bij de werkstroom met dit anker in het voortgangsbord. */
function vinkInBord(d: DocData, anker: string, i: number, aan: boolean) {
  const bord = eersteBlok(d, "voortgangsbord");
  const w = (bord?.werkstromen ?? []).find((x) => tekst(x.anker).trim() === anker);
  const regel = w?.nodig?.[i];
  if (regel) regel.klaar = aan;
}

/** De tekst zoals die getoond wordt: zonder het voorvoegsel "Cito:". */
function getoondeTekst(s: string): string {
  return citoTekst(s) ?? s;
}

// ---------- onderdelen ----------

/** Eén onderdeel van de kaart: klein kopje met daaronder de inhoud. */
function Deel(p: { titel: string; children: ReactNode; open?: boolean }) {
  return (
    <div className="wk-deel">
      <h5 className={"wk-l" + (p.open ? " wk-l-open" : "")}>{p.titel}</h5>
      {p.children}
    </div>
  );
}

/** Niet gesourcet of nog niet ingevuld: expliciet tonen, nooit leeg laten. */
function Leeg({ tekst = "te bepalen" }: { tekst?: string }) {
  return <p className="wk-leeg">{tekst}</p>;
}

/** Tekstveld met een klein label ervoor (bewerkmodus). */
function Veld(p: { label: string; v: string; on: (s: string) => void; ph: string }) {
  return (
    <label className="wk-veld">
      <span className="wk-veld-l">{p.label}</span>
      <V v={p.v} on={p.on} edit ph={p.ph} />
    </label>
  );
}

function Resultaten({ items }: { items: string[] }) {
  const zichtbaar = items.filter(heeft);
  if (zichtbaar.length === 0) return <Leeg />;
  return (
    <ul className="wk-res">
      {zichtbaar.map((s, i) => (
        <li key={i}>{metLabel(s)}</li>
      ))}
    </ul>
  );
}

/** Tijdbalk: pillen (wanneer) verbonden door een lijn, met eronder wat er dan gebeurt. */
function Planning({ stappen }: { stappen: Kaart["planning"] }) {
  const zichtbaar = stappen.filter((s) => heeft(s.wanneer) || heeft(s.wat));
  if (zichtbaar.length === 0) return <Leeg />;
  return (
    <div className="wk-plan">
      <ol className={"wk-stap" + (zichtbaar.length >= 4 ? " wk-stap-veel" : "")}>
        {zichtbaar.map((s, i) => (
          <li key={i}>
            <span className="wk-stap-pil">{heeft(s.wanneer) ? s.wanneer : "te bepalen"}</span>
            {heeft(s.wat) && <span className="wk-stap-wat">{s.wat}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanningBewerken({ stappen, zetK }: { stappen: Kaart["planning"]; zetK: ZetKaart }) {
  return (
    <ol className="ok-lijst-edit">
      {stappen.map((s, i) => (
        <li key={i} className="ok-rij">
          <V
            v={s.wanneer}
            on={(x) => zetK((n) => void (n.planning[i].wanneer = x))}
            edit
            cls="wk-wanneer"
            ph="Wanneer, bijv. Q3 2026"
          />
          <V v={s.wat} on={(x) => zetK((n) => void (n.planning[i].wat = x))} edit ml ph="Wat er dan gebeurt" />
          <WegKnop titel="Stap verwijderen" on={() => zetK((n) => void n.planning.splice(i, 1))} />
        </li>
      ))}
      <li>
        <PlusKnop label="+ stap" on={() => zetK((n) => void n.planning.push({ wanneer: "", wat: "" }))} />
      </li>
    </ol>
  );
}

/** Keten van inspanning via vermogen naar baat: chips met pijlen, kleur per DIN-niveau. */
function DinPad({ pad }: { pad: string[] }) {
  const schakels = pad.filter(heeft).map(splitsSchakel);
  if (schakels.length === 0) return <Leeg />;
  return (
    <ol className="wk-pad">
      {schakels.map((s, i) => (
        <li key={i}>
          {i > 0 && (
            <span className="wk-pijl" aria-hidden="true">
              →
            </span>
          )}
          <span className="wk-schakel" style={kleurVar("--wk-s", niveauKleur(s.prefix))}>
            {s.prefix && (
              <>
                <span className="wk-schakel-p">{s.prefix}</span>
                <span className="wk-sr">: </span>
              </>
            )}
            {s.rest && <span>{s.rest}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DinPadBewerken({ pad, zetK }: { pad: string[]; zetK: ZetKaart }) {
  return (
    <>
      <ul className="ok-lijst-edit">
        {pad.map((s, i) => (
          <li key={i} className="ok-rij">
            <span
              className="wk-staal"
              style={kleurVar("--wk-s", niveauKleur(splitsSchakel(s).prefix))}
              aria-hidden="true"
            />
            <V
              v={s}
              on={(x) => zetK((n) => void (n.dinPad[i] = x))}
              edit
              ph="bijv. Vermogen: eenduidige funnelprocessen"
            />
            <WegKnop titel="Schakel verwijderen" on={() => zetK((n) => void n.dinPad.splice(i, 1))} />
          </li>
        ))}
        <li>
          <PlusKnop label="+ schakel" on={() => zetK((n) => void n.dinPad.push(""))} />
        </li>
      </ul>
      <p className="wk-hint">
        De kleur volgt het woord vóór de dubbele punt: Inspanning, Vermogen, Baten of Doel.
      </p>
    </>
  );
}

/**
 * "Van 3sides" en "Door Cito" onder elkaar, elk met een klein kopje en alleen als het
 * groepje regels heeft; de regels zelf tekent `regels`.
 */
function Groepjes<T>({ groepen, regels }: { groepen: NodigGroepen<T>; regels: (rs: NodigRegel<T>[]) => ReactNode }) {
  return (
    <div className="wk-groepen">
      {NODIG_GROEPEN.map(({ sleutel, kop }) =>
        groepen[sleutel].length === 0 ? null : (
          <div key={sleutel} className="wk-groep">
            <h6 className="wk-groep-kop">{kop}</h6>
            {regels(groepen[sleutel])}
          </div>
        )
      )}
    </div>
  );
}

/** De groepjes zonder regels zonder tekst (bijv. een net toegevoegde, nog lege regel). */
function metTekst<T>(g: NodigGroepen<T>): NodigGroepen<T> {
  return { van3sides: g.van3sides.filter((r) => heeft(r.tekst)), doorCito: g.doorCito.filter((r) => heeft(r.tekst)) };
}

/** De eigen lijst van de kaart (zonder regels in het voortgangsbord): amber chips, in groepjes. */
function Aanvullen({ items }: { items: string[] }) {
  const groepen = metTekst(nodigGroepen(items, (s) => s));
  if (groepen.van3sides.length + groepen.doorCito.length === 0) return <Leeg tekst="Geen open punten" />;
  return (
    <Groepjes
      groepen={groepen}
      regels={(rs) => (
        <ul className="wk-open">
          {rs.map((r) => (
            <li key={r.i}>{r.tekst}</li>
          ))}
        </ul>
      )}
    />
  );
}

/**
 * De regels "nodig" uit het voortgangsbord, afvinkbaar, in groepjes. Het vinkje gaat naar
 * de oorspronkelijke regel in het bord; afgevinkt = doorgestreept en gedempt.
 */
function NodigLijst({ nodig }: { nodig: BordNodig }) {
  const groepen = metTekst(nodigGroepen(nodig.items, (x) => tekst(x.tekst)));
  return (
    <Groepjes
      groepen={groepen}
      regels={(rs) => (
        <ul className="wk-nodig">
          {rs.map((r) => {
            const klaar = r.x.klaar === true;
            return (
              <li key={r.i} className={"wk-nodig-r" + (klaar ? " wk-nodig-klaar" : "")}>
                <label className="wk-vink-r">
                  <input
                    type="checkbox"
                    checked={klaar}
                    disabled={!nodig.vink}
                    onChange={(e) => nodig.vink?.(r.i, e.target.checked)}
                  />
                  <span className="wk-vink-t">{metBronlinks(r.tekst)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    />
  );
}

/** Statusstip met het teken, als in de tijdlijn; leeg = open grijze stip. */
function Stip({ status }: { status: string }) {
  const soort = statusSoort(status);
  const label = soort === "leeg" ? "geen status" : "status " + status.trim();
  return (
    <span className={"wk-stip wk-stip-" + soort} role="img" aria-label={label} title={label}>
      {/* zonder teken een onzichtbaar teken, zodat alle stippen op dezelfde lijn staan */}
      {STATUS_TEKEN[soort] || ZONDER_TEKEN}
    </span>
  );
}

/** Vinkje in het label Afgerond. */
function VinkIcoon() {
  return (
    <svg className="wk-vg-vink" width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="M1.5 5.5L4 8L8.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Voortgang als klein label, in de kleuren van de tijdlijn; leeg = niets. */
function Voortgang({ o }: { o: Onderdeel }) {
  const v = o.voortgang.trim();
  if (!v) return null;
  if (o.soort === "afgerond") {
    return (
      <span className="wk-vg wk-vg-af">
        <VinkIcoon />
        {v}
      </span>
    );
  }
  return <span className={"wk-vg" + (o.soort === "niet" ? " wk-vg-niet" : "")}>{v}</span>;
}

/** Maandbereik "jul → okt"; waar de tijdlijn geen maand noemt: "te bepalen". */
function Bereik({ o }: { o: Onderdeel }) {
  if (o.zonderMaand) return <span className="wk-tl-tb">start en oplevering te bepalen</span>;
  return (
    <>
      {o.start ?? <span className="wk-tl-tb">start te bepalen</span>}{" "}
      <span className="wk-tl-pijl" aria-hidden="true">
        →
      </span>
      <span className="wk-sr">tot</span>{" "}
      <span className={o.verstreken ? "wk-tl-rood" : undefined}>
        {o.oplevering ?? <span className="wk-tl-tb">oplevering te bepalen</span>}
      </span>
    </>
  );
}

/** Eén onderdeel: naam, maandbereik, status en voortgang op één regel (smal: twee regels). */
function OnderdeelRegel({ o }: { o: Onderdeel }) {
  return (
    <li className={"wk-tl-r" + (o.verstreken ? " wk-tl-verstreken" : "")}>
      <span className="wk-tl-naam">
        {metBronlinks(o.naam || "Onderdeel zonder naam")}
        {o.verstreken && (
          <>
            <span className="wk-sr">, </span>
            <span className="wk-tl-tag">verstreken</span>
          </>
        )}
      </span>
      <span className="wk-tl-m">
        <Bereik o={o} />
      </span>
      <span className="wk-tl-st">
        <Stip status={o.status} />
        <Voortgang o={o} />
      </span>
    </li>
  );
}

/**
 * Onderdelen in de tijdlijn. onderdelen null = deze kaart heeft geen tijdlijngroep (alleen
 * in bewerkmodus getoond, met een hint); link = href naar de hele tijdlijn of null.
 */
function TijdlijnDeel({ onderdelen, edit, kaartId, link }: { onderdelen: Onderdeel[] | null; edit: boolean; kaartId: string; link: string | null }) {
  return (
    <Deel titel="Onderdelen in de tijdlijn">
      {onderdelen === null ? (
        <p className="wk-hint wk-hint-los">
          {kaartId
            ? `Nog geen tijdlijngroep bij deze kaart: kies in de tijdlijn bij een groep de kaart "${kaartId}".`
            : "Geef de kaart een anker om er een tijdlijngroep aan te koppelen."}
        </p>
      ) : onderdelen.length === 0 ? (
        <Leeg tekst="Nog geen onderdelen in de tijdlijn" />
      ) : (
        <div className="wk-tl">
          <ul className="wk-tl-lijst">
            {onderdelen.map((o, i) => (
              <OnderdeelRegel key={i} o={o} />
            ))}
          </ul>
        </div>
      )}
      {edit && onderdelen !== null && (
        <p className="wk-hint">Uit de tijdlijn; onderdelen, maanden en voortgang pas je daar aan.</p>
      )}
      {link && (
        <p className="wk-voet">
          <a className="wk-link" href={link}>
            Hele tijdlijn <span aria-hidden="true">↓</span>
          </a>
        </p>
      )}
    </Deel>
  );
}

/**
 * Nog nodig: de regels uit het voortgangsbord (afvinkbaar) of, zonder bord of zonder
 * regels, de eigen lijst van de kaart. Het kopje is amber zolang er iets open staat.
 * Bewerkmodus: de eigen lijst blijft bewerkbaar (één lijst, "Cito:" zichtbaar) met hints.
 */
function NodigDeel({ k, edit, zetK, nodig, bordLink }: { k: Kaart; edit: boolean; zetK: ZetKaart; nodig: BordNodig | null; bordLink: string | null }) {
  const open = nodig
    ? nodig.items.some((x) => x.klaar !== true && heeft(getoondeTekst(tekst(x.tekst))))
    : k.aanvullen.some((s) => heeft(getoondeTekst(s)));
  return (
    <Deel titel="Nog nodig" open={open}>
      {nodig && <NodigLijst nodig={nodig} />}
      {edit ? (
        <>
          {nodig && (
            <p className="wk-hint wk-hint-kop">
              Deze regels komen uit het voortgangsbord; teksten pas je daar aan. De eigen lijst hieronder toont de kaart alleen als het bord
              geen regels voor deze werkstroom heeft.
            </p>
          )}
          <Lijst items={k.aanvullen} edit ml={false} on={(items) => zetK((n) => void (n.aanvullen = items))} />
          <p className="wk-hint">
            {nodig ? "" : "Heeft het voortgangsbord regels voor deze werkstroom, dan toont de kaart die in plaats van deze lijst. "}
            {CITO_HINT}
          </p>
        </>
      ) : (
        !nodig && <Aanvullen items={k.aanvullen} />
      )}
      {!edit && nodig && bordLink && (
        <p className="wk-voet">
          <a className="wk-link" href={bordLink}>
            Voortgangsbord <span aria-hidden="true">↓</span>
          </a>
        </p>
      )}
    </Deel>
  );
}

/** Klein link-icoon (pijl uit een kader): dit document opent in een nieuw tabblad. */
function LinkIcoon() {
  return (
    <svg className="wk-doc-icoon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.5 3.5H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13.5h7a1.5 1.5 0 0 0 1.5-1.5V9.5M9 2.5h4.5V7M13.5 2.5 7.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Klein bord-icoon (drie kolommen): de koppeling naar het Jira-bord met de status. */
function BordIcoon() {
  return (
    <svg className="wk-doc-icoon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="1.5" y="2" width="3.4" height="12" rx="1" fill="currentColor" />
      <rect x="6.3" y="2" width="3.4" height="8" rx="1" fill="currentColor" />
      <rect x="11.1" y="2" width="3.4" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Eén koppeling als chip. Met een http(s)-url een link (nieuw tabblad), zonder url
 * gedempt: nooit een link zonder adres. Jira-koppelingen krijgen een bord-icoon en,
 * met url, een gevulde chip zodat de status-link opvalt.
 */
function DocChip({ kop }: { kop: Koppeling }) {
  const jira = isJira(kop.label);
  // eigen url gaat voor; anders de vindplaats: Jira uit de instelling, documenten via de naam in het label
  const bronUrl = useBronUrl();
  const bron = useBron();
  const eigen = kop.url.trim();
  const auto = jira ? bron.jira.trim() : (bronUrl(kop.label, paginaUit(kop.label)) ?? "");
  const url = eigen || auto;
  // tooltip: het adres, plus de waarschuwing bij het document (bijv. het voorblad van het meetinstrument)
  const opmerking = !jira && !eigen ? zoekDocument(kop.label)?.opmerking : undefined;
  const titel = opmerking ? url + ". " + opmerking : url;
  const tekst = heeft(kop.label) ? kop.label.trim() : url;
  const cls = "wk-doc" + (jira ? " wk-doc-jira" : "");
  if (isLink(url)) {
    return (
      <a className={cls} href={url} target="_blank" rel="noopener noreferrer" title={titel}>
        {jira ? <BordIcoon /> : <LinkIcoon />}
        <span className="wk-doc-t">{tekst}</span>
        <span className="wk-sr"> (opent in een nieuw tabblad)</span>
      </a>
    );
  }
  return (
    <span
      className={cls + " wk-doc-leeg"}
      title={url ? "Geen link: de url moet met http:// of https:// beginnen" : "Nog geen link"}
    >
      {jira && <BordIcoon />}
      <span className="wk-doc-t">{tekst}</span>
    </span>
  );
}

/**
 * Documenten en status: de koppelingen als chips en, als laatste in dezelfde rij, de
 * link naar de tijdlijn (tijdlijn = href, of null als het anker er niet is).
 */
function Koppelingen({ kops, tijdlijn }: { kops: Koppeling[]; tijdlijn: string | null }) {
  const zichtbaar = kops.filter((x) => heeft(x.label) || heeft(x.url));
  return (
    <ul className="wk-docs">
      {zichtbaar.length === 0 && (
        <li>
          <Leeg tekst="Nog geen documenten gekoppeld" />
        </li>
      )}
      {zichtbaar.map((x, i) => (
        <li key={i}>
          <DocChip kop={x} />
        </li>
      ))}
      {tijdlijn && (
        <li className="wk-docs-tl">
          <a className="wk-link" href={tijdlijn}>
            Planning in de tijdlijn <span aria-hidden="true">↓</span>
          </a>
        </li>
      )}
    </ul>
  );
}

/** Bewerkmodus: per koppeling naam en url naast elkaar, met × en "+ koppeling". */
function KoppelingenBewerken({ kops, zetK }: { kops: Koppeling[]; zetK: ZetKaart }) {
  return (
    <ul className="ok-lijst-edit">
      {kops.map((x, i) => {
        const url = x.url.trim();
        const letOp = url !== "" && !isLink(url);
        const hint = url === "" ? "link toevoegen" : letOp ? "Geen link: de url moet met http:// of https:// beginnen" : "";
        return (
          <li key={i} className="wk-doc-edit">
            <div className="ok-rij">
              <V
                v={x.label}
                on={(s) =>
                  zetK((n) => {
                    const kop = koppelingenVan(n)[i];
                    if (kop) kop.label = s;
                  })
                }
                edit
                cls="wk-doc-label"
                ph="Document, bijv. Plan van aanpak p. 10–11"
              />
              <V
                v={x.url}
                on={(s) =>
                  zetK((n) => {
                    const kop = koppelingenVan(n)[i];
                    if (kop) kop.url = s;
                  })
                }
                edit
                cls="wk-doc-url"
                ph="https://…"
              />
              <WegKnop titel="Koppeling verwijderen" on={() => zetK((n) => void koppelingenVan(n).splice(i, 1))} />
            </div>
            {hint && <p className={"wk-doc-hint" + (letOp ? " wk-doc-hint-let-op" : "")}>{hint}</p>}
          </li>
        );
      })}
      <li>
        <PlusKnop label="+ koppeling" on={() => zetK((n) => void koppelingenVan(n).push({ label: "", url: "" }))} />
      </li>
    </ul>
  );
}

/** Bewerkmodus: per DIN-domein een vinkje; de kleurband en de chips van de kaart volgen. */
function DomeinVinkjes({ k, zetK }: { k: Kaart; zetK: ZetKaart }) {
  return (
    <div className="wk-veld wk-vinken-rij" role="group" aria-label="Domeinen">
      <span className="wk-veld-l">Domeinen</span>
      <div className="wk-vinken">
        {DOMEINEN.map((d) => (
          <label key={d.id} className="wk-vink" style={kleurVar("--wk-d", d.kleur)}>
            <input
              type="checkbox"
              checked={k.domeinen.includes(d.id)}
              onChange={(e) => {
                const aan = e.target.checked;
                zetK((n) => zetKaartDomein(n, d.id, aan));
              }}
            />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------- kaart ----------

function WerkstroomKaart({
  k,
  edit,
  zetK,
  tijdlijnLink,
  metTijdlijn,
  onderdelen,
  nodig,
  bordLink,
  ankerDubbel,
  onWeg,
}: {
  k: Kaart;
  edit: boolean;
  zetK: ZetKaart;
  /** "#tl-<id>" als de tijdlijngroep in het document staat en we niet aan het bewerken zijn; anders null */
  tijdlijnLink: string | null;
  /** het raster heeft de rij "Onderdelen in de tijdlijn" (zelfde plek op elke kaart) */
  metTijdlijn: boolean;
  /** de onderdelen uit de tijdlijngroep van deze kaart; null = geen groep */
  onderdelen: Onderdeel[] | null;
  /** de regels "nodig" uit het voortgangsbord; null = geen bord of geen regels (dan de eigen lijst) */
  nodig: BordNodig | null;
  /** "#vb-<id>": de werkstroom op het voortgangsbord (weergavemodus); anders null */
  bordLink: string | null;
  /** een andere kaart in het blok heeft hetzelfde id (bewerkmodus: waarschuwen) */
  ankerDubbel: boolean;
  /** deze kaart weghalen (bewerkmodus) */
  onWeg: () => void;
}) {
  const kopId = useId();
  const doms = domeinenVan(k.domeinen);
  const band = doms.length > 0 ? doms.map((d) => d.kleur) : [NEUTRAAL];

  return (
    <article
      id={heeft(k.id) ? "wk-" + k.id : undefined}
      className="wk-kaart"
      style={kleurVar("--wk-k", accentKleur(doms))}
      aria-labelledby={kopId}
    >
      {/* domeinkleurband; valt buiten het raster (absoluut) */}
      <div className="wk-band" aria-hidden="true">
        {band.map((kleur, i) => (
          <span key={i} style={{ background: kleur }} />
        ))}
      </div>

      {/* rij 1: kop */}
      <div className="wk-kop">
        <div className="wk-kop-r">
          <div className="wk-titel">
            <h4 id={kopId} className="wk-naam">
              <V
                v={k.naam}
                on={(x) => zetK((n) => void (n.naam = x))}
                edit={edit}
                ph="Naam van de werkstroom"
              />
            </h4>
            {!edit && heeft(k.bijnaam) && (
              <p className="wk-bijnaam">
                <b>3sides:</b> {k.bijnaam}
              </p>
            )}
          </div>
          {doms.length > 0 && (
            <ul className="wk-dom" aria-label="Domeinen">
              {doms.map((d) => (
                <li key={d.id} className="wk-dchip" style={kleurVar("--wk-d", d.kleur)}>
                  {d.label}
                </li>
              ))}
            </ul>
          )}
          {edit && <WegKnop titel="Kaart verwijderen" on={onWeg} />}
        </div>
        {edit ? (
          <div className="wk-meta-edit">
            <DomeinVinkjes k={k} zetK={zetK} />
            <Veld
              label="3sides"
              v={k.bijnaam}
              on={(x) => zetK((n) => void (n.bijnaam = x))}
              ph="Zo heet de werkstroom bij 3sides"
            />
            <Veld
              label="Leads"
              v={k.leads}
              on={(x) => zetK((n) => void (n.leads = x))}
              ph="bijv. Cito-lead · 3sides-lead"
            />
            <Veld
              label="Bron"
              v={k.bron}
              on={(x) => zetK((n) => void (n.bron = x))}
              ph="bijv. Plan van aanpak p. 10–11"
            />
            <Veld
              label="Anker"
              v={k.id}
              on={(x) => zetK((n) => void (n.id = ankerTekst(x)))}
              ph="bijv. marketing"
            />
            <p className={"wk-hint wk-anker-hint" + (ankerDubbel ? " wk-doc-hint-let-op" : "")}>
              {ankerDubbel
                ? "Dit anker is al in gebruik bij een andere kaart; kies een uniek anker."
                : heeft(k.id)
                  ? `Linkdoel #wk-${k.id}: hierop linken de DIN-plaat en de tijdlijn.`
                  : "Zonder anker kunnen de DIN-plaat en de tijdlijn niet naar deze kaart linken."}
            </p>
          </div>
        ) : (
          (heeft(k.leads) || heeft(k.bron)) && (
            <p className="wk-meta">
              {heeft(k.leads) && <Leads tekst={k.leads} />}
              {heeft(k.bron) && (
                <span className="wk-bron">
                  <span className="wk-bron-l">Bron</span>
                  {metBronlinks(k.bron)}
                </span>
              )}
            </p>
          )
        )}
      </div>

      {/* rij 2 en verder: de onderdelen, op elke kaart in dezelfde rij */}
      <Deel titel="Waarom">
        {edit ? (
          <V
            v={k.waarom}
            on={(x) => zetK((n) => void (n.waarom = x))}
            edit
            ml
            ph="Waarom deze werkstroom, in één zin"
          />
        ) : heeft(k.waarom) ? (
          <p className="wk-waarom">{metBronlinks(k.waarom)}</p>
        ) : (
          <Leeg />
        )}
      </Deel>

      <Deel titel="Resultaten">
        {edit ? (
          <Lijst items={k.resultaten} edit on={(items) => zetK((n) => void (n.resultaten = items))} />
        ) : (
          <Resultaten items={k.resultaten} />
        )}
      </Deel>

      <Deel titel="Planning">
        {edit ? <PlanningBewerken stappen={k.planning} zetK={zetK} /> : <Planning stappen={k.planning} />}
      </Deel>

      {/* zonder eigen tijdlijngroep blijft de rij leeg, zodat de onderdelen eronder gelijk blijven met de buren */}
      {metTijdlijn &&
        (onderdelen !== null || edit ? (
          <TijdlijnDeel
            onderdelen={onderdelen}
            edit={edit}
            kaartId={k.id.trim()}
            link={onderdelen !== null ? tijdlijnLink : null}
          />
        ) : (
          <div className="wk-deel-leeg" aria-hidden="true" />
        ))}

      <Deel titel="In het DIN">
        {edit ? <DinPadBewerken pad={k.dinPad} zetK={zetK} /> : <DinPad pad={k.dinPad} />}
      </Deel>

      <NodigDeel k={k} edit={edit} zetK={zetK} nodig={nodig} bordLink={bordLink} />

      <Deel titel="Documenten en status">
        {edit ? (
          <KoppelingenBewerken kops={k.koppelingen ?? []} zetK={zetK} />
        ) : (
          // de link naar de tijdlijn staat onder de onderdelen; alleen zonder dat onderdeel hier
          <Koppelingen kops={k.koppelingen ?? []} tijdlijn={onderdelen === null ? tijdlijnLink : null} />
        )}
      </Deel>
    </article>
  );
}

// ---------- het blok ----------

export default function WerkstroomKaartenBlok({ b, edit, zet, ankers }: LosBlokProps<"werkstromen">) {
  // Andere blokken in hetzelfde document: de tijdlijn (onderdelen) en het voortgangsbord (nog nodig).
  const tl = useBlok("tijdlijn");
  const bord = useBlok("voortgangsbord");
  const zetDoc = useDocZet();
  if (!edit && b.kaarten.length === 0) return null;

  const nu = new Date();
  const perAnker = tl ? onderdelenPerAnker(tl, new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())) : null;
  const onderdelenVan = (k: Kaart): Onderdeel[] | null => {
    const id = k.id.trim();
    return (id && perAnker?.get(id)) || null;
  };
  // De rij "Onderdelen in de tijdlijn" staat er zodra een kaart een tijdlijngroep heeft;
  // in bewerkmodus zodra er een tijdlijn is (kaarten zonder groep krijgen dan een hint).
  const metTijdlijn = perAnker !== null && (edit || b.kaarten.some((k) => onderdelenVan(k) !== null));

  const nodigVan = (k: Kaart): BordNodig | null => {
    const id = k.id.trim();
    if (!bord || !id) return null;
    const w = (bord.werkstromen ?? []).find((x) => tekst(x.anker).trim() === id);
    const items = w?.nodig ?? [];
    if (!items.some((x) => heeft(getoondeTekst(tekst(x.tekst))))) return null;
    return { items, vink: zetDoc ? (i, aan) => zetDoc((d) => vinkInBord(d, id, i, aan)) : null };
  };

  return (
    <>
      {b.kaarten.length > 0 && (
        <div className={"wk-raster" + (metTijdlijn ? " wk-raster-tl" : "")}>
          {b.kaarten.map((k, ki) => {
            const id = k.id.trim();
            const nodig = nodigVan(k);
            return (
              <WerkstroomKaart
                key={ki}
                k={k}
                edit={edit}
                zetK={(fn) =>
                  zet((n) => {
                    const x = n.kaarten[ki];
                    if (x) fn(x);
                  })
                }
                tijdlijnLink={!edit && id && ankers.has("tl-" + id) ? "#tl-" + id : null}
                metTijdlijn={metTijdlijn}
                onderdelen={onderdelenVan(k)}
                nodig={nodig}
                bordLink={!edit && nodig ? "#vb-" + id : null}
                ankerDubbel={edit && heeft(k.id) && b.kaarten.some((x, xi) => xi !== ki && x.id === k.id)}
                onWeg={() => zet((n) => void n.kaarten.splice(ki, 1))}
              />
            );
          })}
        </div>
      )}
      {edit && (
        <div className="wk-plus">
          <PlusKnop label="+ kaart" on={() => zet(voegKaartToe)} />
        </div>
      )}
    </>
  );
}

// ---------- stijl ----------

/**
 * Staande planning (smalle kaart of veel stappen): pil links, tekst ernaast, lijn
 * verticaal. De pilkolom is zo breed als de breedste pil (subgrid, hooguit de helft);
 * zonder subgrid een vaste breedte.
 */
function staand(s: string): string {
  return (
    `${s}{grid-auto-flow:row;grid-template-columns:fit-content(50%) minmax(0,1fr);gap:10px}` +
    `${s} > li{grid-column:1 / -1;display:grid;grid-template-columns:104px minmax(0,1fr);grid-template-columns:subgrid;column-gap:10px;align-items:start}` +
    `${s} > li:not(:last-child)::after{top:12px;bottom:-10px;left:13px;right:auto;width:2px;height:auto}`
  );
}

// Altijd binnen het document (wrapper "ok okd"); alle klassen met prefix wk-.
// Raster: twee kolommen op desktop, één op een smal scherm (min(100%, …) voorkomt
// zijwaarts scrollen); nooit meer dan twee kolommen. Kaartkleur via --wk-k (accent),
// domeinchips via --wk-d, DIN-schakels via --wk-s. Tekstkleuren zijn donkerder
// gemengd dan de domeinkleur, zodat ook kleine tekst goed leesbaar blijft.
export const WERKSTROOM_CSS = `
.okd .wk-raster{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,max(360px,calc(50% - 7px))),1fr));gap:14px}
.okd .wk-kaart{--wk-k:${NEUTRAAL};position:relative;display:flex;flex-direction:column;gap:14px;min-width:0;overflow:hidden;background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:12px;padding:20px 18px 16px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 14px -8px rgba(15,23,42,.14);scroll-margin-top:80px}
.okd .wk-deel-leeg{display:none}
@supports (grid-template-rows:subgrid){.okd .wk-kaart{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:subgrid;grid-row:span ${RIJEN}}.okd .wk-raster-tl > .wk-kaart{grid-row:span ${RIJEN + 1}}.okd .wk-deel-leeg{display:block}}
.okd .wk-kaart:target{box-shadow:0 0 0 2px var(--wk-k),0 8px 24px -10px rgba(15,23,42,.3)}
.okd .wk-band{position:absolute;top:0;left:0;right:0;height:6px;display:flex;gap:2px}
.okd .wk-band > span{flex:1 1 0}
.okd .wk-kop{container:wkkop / inline-size;display:flex;flex-direction:column;gap:8px;min-width:0}
.okd .wk-kop-r{display:flex;align-items:flex-start;gap:6px 12px}
.okd .wk-titel{flex:1 1 auto;min-width:0}
.okd .wk-naam{font-size:17px;font-weight:800;line-height:1.25;letter-spacing:-.01em;color:${CITO}}
.okd .wk-naam .ok-in{font-size:15px;font-weight:700;letter-spacing:0}
.okd .wk-bijnaam{margin-top:2px;font-size:12px;line-height:1.4;color:#64748b}
.okd .wk-bijnaam b{font-weight:600}
.okd .wk-dom{flex:0 1 auto;max-width:58%;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;padding-top:2px}
.okd .wk-dchip{font-size:10.5px;font-weight:700;line-height:1.5;white-space:nowrap;padding:1px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--wk-d) 40%,#fff);background:color-mix(in srgb,var(--wk-d) 10%,#fff);color:color-mix(in srgb,var(--wk-d) 75%,#000)}
.okd .wk-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:12px;line-height:1.45;color:#475569}
.okd .wk-bron{display:inline-flex;align-items:baseline;gap:5px;max-width:100%;font-size:10.5px;font-weight:600;line-height:1.5;color:#475569;background:#fff;border:1px solid #cbd5e1;border-radius:5px;padding:0 7px}
.okd .wk-bron-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
@container wkkop (max-width:419px){.okd .wk-kop-r{flex-direction:column}.okd .wk-dom{max-width:none;justify-content:flex-start}}
.okd .wk-deel{min-width:0;border-top:1px solid #edf1f5;padding-top:10px}
.okd .wk-l{font-size:9.5px;font-weight:800;line-height:1.3;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:7px}
.okd .wk-l-open{color:#b45309}
.okd .wk-leeg{font-size:12.5px;font-style:italic;line-height:1.45;color:#64748b}
.okd .wk-waarom{font-size:14px;font-weight:500;line-height:1.5;color:#0f172a;border-left:3px solid var(--wk-k);padding:1px 0 1px 10px;white-space:pre-line}
.okd .wk-res{display:flex;flex-direction:column;gap:5px}
.okd .wk-res > li{position:relative;padding-left:18px;font-size:13px;line-height:1.45;color:#1e293b;white-space:pre-line}
.okd .wk-res > li::before{content:"";position:absolute;left:1px;top:4.5px;width:10px;height:10px;border-radius:3px;border:1.5px solid var(--wk-k);background:color-mix(in srgb,var(--wk-k) 14%,#fff)}
.okd .wk-res b{color:#0f172a}
.okd .wk-plan{container:wkplan / inline-size}
.okd .wk-stap{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);column-gap:12px}
.okd .wk-stap > li{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.okd .wk-stap > li:not(:last-child)::after{content:"";position:absolute;z-index:0;top:11px;left:12px;right:-12px;height:2px;border-radius:2px;background:color-mix(in srgb,var(--wk-k) 30%,#e2e8f0)}
.okd .wk-stap-pil{position:relative;z-index:1;justify-self:start;max-width:100%;font-size:11.5px;font-weight:800;line-height:1.3;padding:3px 10px;border-radius:999px;border:1.5px solid var(--wk-k);background:color-mix(in srgb,var(--wk-k) 10%,#fff);color:color-mix(in srgb,var(--wk-k) 75%,#000)}
.okd .wk-stap-wat{font-size:12.5px;line-height:1.4;color:#334155;white-space:pre-line}
@container wkplan (max-width:299px){${staand(".okd .wk-stap")}}
@container wkplan (max-width:519px){${staand(".okd .wk-stap.wk-stap-veel")}}
.okd .wk-pad{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.okd .wk-pad > li{display:flex;align-items:center;gap:6px;max-width:100%;min-width:0}
.okd .wk-pijl{flex:none;font-size:13px;font-weight:700;line-height:1;color:#5f6b7a}
.okd .wk-schakel{display:inline-flex;flex-wrap:wrap;align-items:baseline;column-gap:5px;max-width:100%;min-width:0;padding:3px 9px;border-radius:7px;border:1px solid color-mix(in srgb,var(--wk-s) 32%,#fff);background:color-mix(in srgb,var(--wk-s) 9%,#fff);color:color-mix(in srgb,var(--wk-s) 75%,#000);font-size:12.5px;font-weight:600;line-height:1.35}
.okd .wk-schakel-p{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.okd .wk-open{display:flex;flex-wrap:wrap;gap:5px}
.okd .wk-open > li{max-width:100%;font-size:11.5px;font-weight:600;line-height:1.35;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:3px 9px}
.okd .wk-groepen{display:flex;flex-direction:column;gap:9px}
.okd .wk-groep-kop{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:9px;font-weight:800;line-height:1.3;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.okd .wk-groep-kop::after{content:"";flex:1;height:1px;background:#edf1f5}
.okd .wk-nodig{display:flex;flex-direction:column;gap:5px}
.okd .wk-vink-r{display:flex;align-items:flex-start;gap:8px;min-width:0;cursor:pointer;font-size:12.5px;line-height:1.4;color:#1e293b}
.okd .wk-vink-r input{flex:none;width:14px;height:14px;margin:2px 0 0;accent-color:${CITO};cursor:pointer}
.okd .wk-vink-r:has(input:disabled){cursor:default}
.okd .wk-vink-r input:disabled{cursor:default}
.okd .wk-vink-t{min-width:0}
.okd .wk-nodig-klaar .wk-vink-t{text-decoration:line-through;text-decoration-color:#94a3b8;color:#9aa3b0}
.okd .wk-nodig-klaar .wk-vink-t .ok-bron{color:inherit}
.okd .wk-voet{display:flex;justify-content:flex-end;margin-top:7px}
.okd .wk-hint-los{margin-top:0}
.okd .wk-hint-kop{margin:8px 0 6px}
.okd .wk-tl{container:wktl / inline-size}
.okd .wk-tl-lijst{display:grid;grid-template-columns:minmax(0,1fr) auto auto;column-gap:14px}
.okd .wk-tl-r{grid-column:1 / -1;display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-columns:subgrid;align-items:baseline;margin:0 -6px;padding:5px 6px;border-top:1px solid #f1f5f9}
.okd .wk-tl-r:first-child{border-top:0}
.okd .wk-tl-r:hover{background:#f8fafc}
.okd .wk-tl-naam{min-width:0;font-size:12.5px;line-height:1.4;color:#1e293b}
.okd .wk-tl-m{font-size:11px;font-weight:600;line-height:1.4;color:#475569;white-space:nowrap}
.okd .wk-tl-pijl{font-weight:500;color:#5f6b7a}
.okd .wk-tl-tb{font-style:italic;font-weight:500;color:#64748b}
.okd .wk-tl-st{display:flex;align-items:baseline;gap:5px;min-width:0;white-space:nowrap}
.okd .wk-tl-verstreken,.okd .wk-tl-verstreken:hover{background:#fef2f2}
.okd .wk-tl-verstreken .wk-tl-naam{font-weight:600;color:#b91c1c}
.okd .wk-tl-rood{color:#b91c1c}
.okd .wk-tl-tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid #fca5a5;border-radius:999px;background:#fff;font-size:9px;font-weight:800;line-height:1.5;text-transform:uppercase;letter-spacing:.06em;color:#b91c1c;white-space:nowrap;vertical-align:1px}
.okd .wk-stip{flex:none;display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;font-size:10px;font-weight:800;line-height:1;color:#fff}
.okd .wk-stip-plus{background:#059669}
.okd .wk-stip-plusmin{background:#d97706}
.okd .wk-stip-min{background:#dc2626}
.okd .wk-stip-anders{background:#94a3b8}
.okd .wk-stip-leeg{width:11px;height:11px;margin:0 2px;background:#fff;box-shadow:inset 0 0 0 1.5px #cbd5e1}
.okd .wk-vg{font-size:10.5px;line-height:1.25;font-weight:600;color:#111827}
.okd .wk-vg-niet{font-weight:400;color:#5b6573}
.okd .wk-vg-af{display:inline-block;padding:1px 6px 1px 4px;border:1px solid #a7f3d0;border-radius:999px;background:#ecfdf5;font-size:10px;font-weight:700;color:#047857}
.okd .wk-vg-vink{margin-right:3px;vertical-align:-1px}
@container wktl (max-width:399px){.okd .wk-tl-lijst{display:flex;flex-direction:column}.okd .wk-tl-r{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}.okd .wk-tl-naam{flex:1 1 100%}}
.okd .wk-docs{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px}
.okd .wk-docs > li{display:flex;max-width:100%;min-width:0}
.okd .wk-doc{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;font-size:11.5px;font-weight:600;line-height:1.35;padding:3px 9px;border-radius:7px;border:1px solid color-mix(in srgb,${CITO} 38%,#fff);background:#fff;color:${CITO};text-decoration:none}
.okd .wk-doc-t{min-width:0}
.okd .wk-doc-icoon{flex:none;width:11px;height:11px}
.okd a.wk-doc:hover,.okd a.wk-doc:focus-visible{background:#eef3f9;border-color:${CITO}}
.okd a.wk-doc:focus-visible{outline:2px solid #0066cc;outline-offset:2px}
.okd a.wk-doc-jira{background:${CITO};border-color:${CITO};color:#fff}
.okd a.wk-doc-jira:hover,.okd a.wk-doc-jira:focus-visible{background:#0066cc;border-color:#0066cc}
.okd .wk-doc-leeg{border-style:dashed;border-color:#cbd5e1;background:#f8fafc;color:#64748b;font-weight:500}
.okd .wk-docs-tl{margin-left:auto;padding-left:8px}
.okd .wk-link{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:${CITO};text-decoration:none;border-radius:4px}
.okd .wk-link:hover{text-decoration:underline;text-underline-offset:3px}
.okd .wk-link:focus-visible{outline:2px solid #0066cc;outline-offset:2px}
.okd .wk-doc-edit{container:wkdoc / inline-size;display:flex;flex-direction:column;gap:3px}
.okd .wk-doc-edit .ok-in{min-width:0}
.okd .ok-rij > .ok-in.wk-doc-url{flex:1.3}
@container wkdoc (max-width:319px){.okd .wk-doc-edit .ok-rij{flex-wrap:wrap}.okd .ok-rij > .ok-in.wk-doc-label{flex:1 1 100%}}
.okd .wk-doc-hint{font-size:10.5px;line-height:1.4;color:#64748b;padding-left:2px}
.okd .wk-doc-hint-let-op{color:#b45309;font-weight:600}
.okd .wk-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.okd .wk-veld{display:flex;align-items:center;gap:6px;min-width:0}
.okd .wk-veld > .ok-in{flex:1;min-width:0}
.okd .wk-veld-l{flex:none;min-width:46px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.okd .wk-meta-edit{display:flex;flex-direction:column;gap:5px}
.okd .wk-vinken-rij{align-items:flex-start}
.okd .wk-vinken-rij > .wk-veld-l{padding-top:4px}
.okd .wk-vinken{display:flex;flex-wrap:wrap;gap:4px 6px;min-width:0}
.okd .wk-vink{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;line-height:1.5;white-space:nowrap;cursor:pointer;color:color-mix(in srgb,var(--wk-d) 75%,#000);background:color-mix(in srgb,var(--wk-d) 8%,#fff);border:1px solid color-mix(in srgb,var(--wk-d) 35%,#fff);border-radius:999px;padding:1px 9px 1px 6px}
.okd .wk-vink input{margin:0;accent-color:var(--wk-d);cursor:pointer}
.okd .wk-vink:has(input:checked){background:color-mix(in srgb,var(--wk-d) 16%,#fff);border-color:var(--wk-d)}
.okd .wk-kop-r > .ok-knopje{flex:none;margin-top:2px}
.okd .wk-anker-hint{margin-top:0}
.okd .wk-plus{display:flex}
.okd .ok-rij > .ok-in.wk-wanneer{flex:0 0 108px}
.okd .wk-staal{flex:none;width:10px;height:10px;margin-top:7px;border-radius:3px;background:var(--wk-s)}
.okd .wk-hint{margin-top:6px;font-size:10.5px;line-height:1.4;color:#64748b}
@media print{.okd .wk-kaart{box-shadow:none;break-inside:avoid}}
`;
