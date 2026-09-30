// Voortgangsbord: hoe ver we zijn per werkstroom, wat verstreken is, wat eraan komt,
// wat we nog van 3sides nodig hebben en waar de informatie staat (documenten, Jira).
// Voor het overleg: de stand op de dag van vandaag.
//
// Het blok bewaart zelf alleen de tekstuele delen (titel, per werkstroom de naam, wat
// 3sides als geleverd meldt en wat we nog nodig hebben, programmabreed nodig, legenda).
// Alles wat geteld wordt, komt uit het tijdlijn-blok in hetzelfde document (useBlok):
//   per werkstroom (tijdlijngroep met hetzelfde anker) het aantal onderdelen, afgerond,
//   loopt, niet gestart; "verstreken" = oplevermaand voorbij en niet op Afgerond gezet;
//   "komend" = oplevering binnen 60 dagen; voortgang = afgerond / totaal (loopt telt niet mee, wel zichtbaar als lichtere balk);
//   "op schema" = 1 − verstreken / opleveringen met datum.
// De koppelingen (documenten, Jira) komen van de werkstroomkaart met hetzelfde anker
// (useBlok("werkstromen")) en de vindplaatsen in de sessie (useBron).
// Afvinken van "nog nodig" werkt ook in weergavemodus: het vinkje gaat via zet() naar het
// document (de host bewaart het). Berekende delen zijn niet bewerkbaar.
// "Nog nodig" (per werkstroom en programmabreed) staat in weergave in twee groepjes: "Van
// 3sides" en "Door Cito" (regels die met "Cito:" beginnen, getoond zonder voorvoegsel);
// in bewerkmodus één lijst met het voorvoegsel zichtbaar. De werkstroomkaarten gebruiken
// dezelfde indeling (nodigGroepen).
// Werkt ook los van BewerkbaarDocument (eigen tabblad): links naar #tl-… en #wk-… worden
// dan ?stap=integratie&tab=analyse#… als het anker niet op de huidige pagina staat.

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";
import { Keuze, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { useBlok } from "@/components/bewerkbaar/doc-context";
import { metBronlinks, useBron, useBronUrl, paginaUit } from "@/components/bewerkbaar/bron-context";
import { maandDatum, tijdlijnRijen, voortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import type { TijdlijnRij, VoortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";

type Bord = BlokVan<"voortgangsbord">;
type BordWerkstroom = Bord["werkstromen"][number];
type Nodig = BordWerkstroom["nodig"][number];
type Tijdlijn = BlokVan<"tijdlijn">;
type Kaart = BlokVan<"werkstromen">["kaarten"][number];
type Koppeling = Kaart["koppelingen"][number];
type Domein = { id: string; label: string; kleur: string };

/** Eén onderdeel uit de tijdlijn met wat het bord erover weet. */
interface Onderdeel {
  rij: TijdlijnRij;
  soort: VoortgangSoort;
  /** oplevermaand als "okt 2026"; leeg zonder oplevering */
  maand: string;
  verstreken: boolean;
  komend: boolean;
}

interface Telling {
  totaal: number;
  afgerond: number;
  loopt: number;
  niet: number;
  verstreken: number;
  komend: number;
  /** opleveringen met een datum (noemer van "op schema") */
  metDatum: number;
}

/** De stand van één tijdlijngroep (werkstroom). */
interface GroepStand {
  anker: string;
  naam: string;
  domeinen: Domein[];
  onderdelen: Onderdeel[];
  telling: Telling;
}

/** Hoeveel dagen vooruit "komt eraan" kijkt. */
const HORIZON_DAGEN = 60;
const CITO = "#003366";
const NEUTRAAL = "#94a3b8";

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

function isLink(url: string): boolean {
  return /^https?:\/\/\S/i.test(url.trim());
}

function isJira(label: string): boolean {
  return label.trim().toLowerCase().startsWith("jira");
}

function dag00(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function plusDagen(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function ddmmjjjj(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Oplevermaand in woorden: het maandlabel uit de tijdlijn plus het jaar, bijv. "okt 2026". */
function maandLabel(tl: Tijdlijn, idx: number | null): string {
  if (idx === null) return "";
  const m = tekst((tl.maanden ?? [])[idx]).trim();
  const d = maandDatum(tl, idx);
  return Number.isNaN(d.getTime()) ? m : `${m} ${d.getFullYear()}`;
}

function legeTelling(): Telling {
  return { totaal: 0, afgerond: 0, loopt: 0, niet: 0, verstreken: 0, komend: 0, metDatum: 0 };
}

function telOp(t: Telling, o: Onderdeel) {
  t.totaal++;
  if (o.soort === "afgerond") t.afgerond++;
  else if (o.soort === "loopt") t.loopt++;
  else if (o.soort === "niet") t.niet++;
  if (o.rij.opleverDatum) t.metDatum++;
  if (o.verstreken) t.verstreken++;
  if (o.komend) t.komend++;
}

/** Voortgang 0..1: afgerond telt heel, loopt half; null zonder onderdelen. */
function voortgangPct(t: Telling): number | null {
  return t.totaal > 0 ? t.afgerond / t.totaal : null;
}

/** Op schema 0..1: het deel van de opleveringen met datum dat niet verstreken is; null zonder datums. */
function opSchema(t: Telling): number | null {
  return t.metDatum > 0 ? 1 - t.verstreken / t.metDatum : null;
}

function procent(x: number | null): string {
  return x === null ? "—" : Math.round(x * 100) + "%";
}

// ---------- nog nodig: van 3sides of door Cito ----------

/** Hint in bewerkmodus bij elke lijst "nog nodig" (bord en werkstroomkaart). */
export const CITO_HINT = "Begin een regel met 'Cito:' voor iets wat Cito zelf moet doen.";

/** De twee groepjes van "nog nodig", in deze volgorde. */
export const NODIG_GROEPEN = [
  { sleutel: "van3sides", kop: "Van 3sides" },
  { sleutel: "doorCito", kop: "Door Cito" },
] as const;

/** Voorvoegsel van een regel die Cito zelf moet doen: "Cito:" (hoofdletters en spaties rond de dubbele punt maken niet uit). */
const CITO_VOORVOEGSEL = /^\s*cito\s*:\s*/i;

/** De tekst zonder het voorvoegsel "Cito:" als de regel bij Cito hoort; anders null. */
export function citoTekst(s: string): string | null {
  const m = CITO_VOORVOEGSEL.exec(s);
  return m ? s.slice(m[0].length) : null;
}

/** Eén regel "nog nodig" in een groepje: het item, zijn plek in de oorspronkelijke lijst en de tekst om te tonen. */
export interface NodigRegel<T> {
  x: T;
  i: number;
  tekst: string;
}

/** De regels per groepje ("van3sides", "doorCito"). */
export type NodigGroepen<T> = Record<(typeof NODIG_GROEPEN)[number]["sleutel"], NodigRegel<T>[]>;

/**
 * Deelt "nog nodig" in: regels die met "Cito:" beginnen bij "Door Cito" (tekst zonder
 * voorvoegsel), de rest bij "Van 3sides". De index blijft die in de oorspronkelijke lijst,
 * zodat afvinken de oorspronkelijke regel raakt (het voorvoegsel blijft in de data).
 */
export function nodigGroepen<T>(items: readonly T[], tekstVan: (x: T) => string): NodigGroepen<T> {
  const uit: NodigGroepen<T> = { van3sides: [], doorCito: [] };
  items.forEach((x, i) => {
    const t = tekstVan(x);
    const cito = citoTekst(t);
    if (cito === null) uit.van3sides.push({ x, i, tekst: t });
    else uit.doorCito.push({ x, i, tekst: cito });
  });
  return uit;
}

/**
 * Alle onderdelen uit de tijdlijn, beoordeeld op de dag `vandaag`, gegroepeerd per
 * tijdlijngroep (op anker; zonder anker op naam). Volgorde als in de tijdlijn.
 */
function berekenStand(tl: Tijdlijn | null, vandaag: Date): { groepen: GroepStand[]; onderdelen: Onderdeel[] } {
  if (!tl) return { groepen: [], onderdelen: [] };
  const dag = dag00(vandaag);
  const grens = plusDagen(dag, HORIZON_DAGEN);
  const onderdelen: Onderdeel[] = tijdlijnRijen(tl).map((rij) => {
    const soort = voortgangSoort(rij.voortgang);
    const d = rij.opleverDatum;
    const open = soort !== "afgerond";
    return {
      rij,
      soort,
      maand: maandLabel(tl, rij.opleverIndex),
      verstreken: d !== null && open && d < dag,
      komend: d !== null && open && d >= dag && d <= grens,
    };
  });
  const groepen: GroepStand[] = [];
  const opSleutel = new Map<string, GroepStand>();
  for (const g of tl.groepen ?? []) {
    const anker = tekst(g.anker).trim();
    const naam = tekst(g.naam).trim();
    const sleutel = anker || "naam:" + naam;
    if (opSleutel.has(sleutel)) continue;
    const domeinen: Domein[] = [];
    for (const id of g.domeinen ?? []) {
      const d = domein(tekst(id));
      if (d && !domeinen.some((x) => x.id === d.id)) domeinen.push(d);
    }
    const stand: GroepStand = { anker, naam, domeinen, onderdelen: [], telling: legeTelling() };
    opSleutel.set(sleutel, stand);
    groepen.push(stand);
  }
  for (const o of onderdelen) {
    const stand = opSleutel.get(o.rij.groepAnker || "naam:" + o.rij.groepNaam);
    if (!stand) continue;
    stand.onderdelen.push(o);
    telOp(stand.telling, o);
  }
  return { groepen, onderdelen };
}

/** Kleur van een werkstroom: het eerste domein; alle vier = Cito-blauw; geen = grijs. */
function kleurVan(ds: Domein[]): string {
  if (ds.length === 0) return NEUTRAAL;
  return ds.length >= DOMEINEN.length ? CITO : ds[0].kleur;
}

/** Domeinstrook: één kleur of smalle banen naast elkaar. */
function strookBeeld(ds: Domein[]): string {
  if (ds.length === 0) return `linear-gradient(${NEUTRAAL}, ${NEUTRAAL})`;
  const w = 100 / ds.length;
  return "linear-gradient(to bottom, " + ds.map((d, i) => `${d.kleur} ${i * w}% ${(i + 1) * w}%`).join(", ") + ")";
}

/** Link naar een anker: op deze pagina met #, anders naar de analyse van stap 11 (nieuw tabblad). */
function doel(id: string, ankers: ReadonlySet<string>): { href: string; nieuw: boolean } {
  return ankers.has(id) ? { href: "#" + id, nieuw: false } : { href: "?stap=integratie&tab=analyse#" + id, nieuw: true };
}

function Doel({ id, ankers, cls, titel, children }: { id: string; ankers: ReadonlySet<string>; cls: string; titel: string; children: ReactNode }) {
  const d = doel(id, ankers);
  return (
    <a
      className={cls}
      href={d.href}
      title={d.nieuw ? titel + " (opent de analyse in een nieuw tabblad)" : titel}
      target={d.nieuw ? "_blank" : undefined}
      rel={d.nieuw ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

// ---------- kleine onderdelen ----------

function Vink() {
  return (
    <svg className="vb-vink-i" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1.5 5.5L4 8L8.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Statusteken van 3sides (+, +/-, -) als kleine gekleurde stip. */
function Stip({ status }: { status: string }) {
  const t = status.replace(/[−–—]/g, "-").replace(/\s+/g, "").toLowerCase();
  const soort = t === "+" ? "plus" : t === "+/-" || t === "+-" || t === "±" ? "plusmin" : t === "-" ? "min" : "";
  if (!soort) return null;
  const teken = soort === "plus" ? "+" : soort === "plusmin" ? "±" : "−";
  return (
    <span className={"vb-stip vb-stip-" + soort} role="img" aria-label={"status " + status.trim()} title={"status " + status.trim()}>
      {teken}
    </span>
  );
}

/** Teller bovenin. */
function Teller({ n, label, toon = "" }: { n: number; label: string; toon?: string }) {
  return (
    <div className={"vb-teller" + (toon ? " vb-teller-" + toon : "")}>
      <span className="vb-teller-n">{n}</span>
      <span className="vb-teller-l">{label}</span>
    </div>
  );
}

/** Voortgangsbalk: afgerond vol, loopt half zo zwaar (lichter), met het percentage ernaast. */
function Balk({ t, kleur }: { t: Telling; kleur: string }) {
  const pct = voortgangPct(t);
  const af = t.totaal > 0 ? t.afgerond / t.totaal : 0;
  const lo = t.totaal > 0 ? t.loopt / t.totaal : 0;
  const label = pct === null ? "geen onderdelen in de tijdlijn" : `${t.afgerond} van ${t.totaal} afgerond, ${t.loopt} loopt`;
  return (
    <div className="vb-balk" style={{ "--vb-k": kleur } as CSSProperties}>
      <div
        className="vb-balk-spoor"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct === null ? undefined : Math.round(pct * 100)}
        aria-label={"Voortgang: " + label}
      >
        <span className="vb-balk-af" style={{ width: `${af * 100}%` }} />
        <span className="vb-balk-lo" style={{ left: `${af * 100}%`, width: `${lo * 100}%` }} />
      </div>
      <span className="vb-balk-pct">{procent(pct)}</span>
      <span className="vb-balk-t">{label}</span>
    </div>
  );
}

/** Kolom met een kop en een korte lijst, of "geen". */
function Kolom({ kop, leeg, cls = "", children }: { kop: string; leeg: string; cls?: string; children?: ReactNode }) {
  const inhoud = Array.isArray(children) ? children.filter(Boolean) : children;
  const heeftInhoud = Array.isArray(inhoud) ? inhoud.length > 0 : !!inhoud;
  return (
    <div className={"vb-kolom " + cls}>
      <h5 className="vb-kk">{kop}</h5>
      {heeftInhoud ? <ul className="vb-lijst">{inhoud}</ul> : <p className="vb-leeg">{leeg}</p>}
    </div>
  );
}

/**
 * Regel in een lijst met onderdelen: naam · maand (· status). Met werkstroom (de lijsten
 * onderaan) op twee regels: de naam, daaronder werkstroom en maand.
 */
function OnderdeelRegel({ o, metWerkstroom = false, verstreken = false }: { o: Onderdeel; metWerkstroom?: boolean; verstreken?: boolean }) {
  const naam = <span className="vb-item-t">{metBronlinks(o.rij.activiteit || "Onderdeel zonder naam")}</span>;
  const rest = (
    <>
      {metWerkstroom && <span className="vb-item-w">{o.rij.groepNaam}</span>}
      <span className="vb-item-m">{o.maand}</span>
      {verstreken && <Stip status={o.rij.status} />}
    </>
  );
  const cls = "vb-item" + (verstreken ? " vb-item-verstreken" : "") + (metWerkstroom ? " vb-item-blok" : "");
  return (
    <li className={cls}>
      {naam}
      {metWerkstroom ? <span className="vb-item-sub">{rest}</span> : rest}
    </li>
  );
}

/**
 * Afvinkbare lijst "nog nodig". Het vinkje werkt in beide modi en gaat via zetLijst
 * naar het document, altijd op de oorspronkelijke regel. Weergave: in de groepjes "Van
 * 3sides" en "Door Cito" (elk alleen als er regels in staan; Cito-regels zonder het
 * voorvoegsel). Bewerkmodus: één lijst met het voorvoegsel zichtbaar, teksten aanpasbaar
 * met × en "+ regel", en de hint over "Cito:".
 */
function NodigLijst({ items, edit, zetLijst, ph }: { items: Nodig[]; edit: boolean; zetLijst: (fn: (xs: Nodig[]) => void) => void; ph: string }) {
  const vink = (i: number, aan: boolean) =>
    zetLijst((xs) => {
      if (xs[i]) xs[i].klaar = aan;
    });
  const regel = (x: Nodig, i: number, getoond: string) => {
    const klaar = x.klaar === true;
    return (
      <li key={i} className={"vb-nodig-item" + (klaar ? " vb-klaar" : "")}>
        <label className="vb-vink">
          <input
            type="checkbox"
            checked={klaar}
            onChange={(e) => vink(i, e.target.checked)}
            aria-label={(klaar ? "Afgevinkt: " : "Nog nodig: ") + (getoond.trim() || "zonder tekst")}
          />
          {edit ? (
            <V
              v={tekst(x.tekst)}
              on={(s) =>
                zetLijst((xs) => {
                  if (xs[i]) xs[i].tekst = s;
                })
              }
              edit
              ph={ph}
            />
          ) : (
            <span className="vb-vink-t">{metBronlinks(getoond)}</span>
          )}
        </label>
        {edit && <WegKnop titel="Regel verwijderen" on={() => zetLijst((xs) => void xs.splice(i, 1))} />}
      </li>
    );
  };

  if (!edit) {
    const groepen = nodigGroepen(items, (x) => tekst(x.tekst));
    return (
      <div className="vb-nodig-groepen">
        {NODIG_GROEPEN.map(({ sleutel, kop }) =>
          groepen[sleutel].length === 0 ? null : (
            <div key={sleutel} className="vb-nodig-groep">
              <h6 className="vb-groep-kop">{kop}</h6>
              <ul className="vb-lijst vb-nodig">{groepen[sleutel].map((r) => regel(r.x, r.i, r.tekst))}</ul>
            </div>
          )
        )}
      </div>
    );
  }
  return (
    <>
      <ul className="vb-lijst vb-nodig vb-nodig-edit">
        {items.map((x, i) => regel(x, i, tekst(x.tekst)))}
        <li>
          <PlusKnop label="+ regel" on={() => zetLijst((xs) => void xs.push({ tekst: "", klaar: false }))} />
        </li>
      </ul>
      <p className="vb-hint">{CITO_HINT}</p>
    </>
  );
}

/** Eén koppeling van de werkstroomkaart: link als er een adres is (eigen of via de vindplaatsen), anders gedempt. */
function Koppel({ kop }: { kop: Koppeling }) {
  const bronUrl = useBronUrl();
  const bron = useBron();
  const jira = isJira(kop.label);
  const eigen = tekst(kop.url).trim();
  const auto = jira ? bron.jira.trim() : (bronUrl(kop.label, paginaUit(kop.label)) ?? "");
  const url = eigen || auto;
  const label = tekst(kop.label).trim() || url;
  if (isLink(url)) {
    return (
      <a className={"vb-doc" + (jira ? " vb-doc-jira" : "")} href={url} target="_blank" rel="noopener noreferrer" title={url}>
        {label}
        <span className="vb-sr"> (opent in een nieuw tabblad)</span>
      </a>
    );
  }
  return (
    <span className="vb-doc vb-doc-leeg" title="Nog geen link">
      {label}
    </span>
  );
}

// ---------- werkstroom ----------

function Werkstroom(p: {
  w: BordWerkstroom;
  wi: number;
  stand: GroepStand | null;
  kaart: Kaart | null;
  edit: boolean;
  ankers: ReadonlySet<string>;
  ankerOpties: { waarde: string; label: string }[];
  zet: LosBlokProps<"voortgangsbord">["zet"];
}) {
  const { w, wi, stand, kaart, edit, ankers } = p;
  const anker = tekst(w.anker).trim();
  const ds = stand?.domeinen ?? (kaart?.domeinen ?? []).flatMap((id) => domein(id) ?? []);
  const kleur = kleurVan(ds);
  const stijl = { "--vb-k": kleur, "--vb-strook": strookBeeld(ds) } as CSSProperties;
  const naam = tekst(w.naam).trim() || stand?.naam || kaart?.naam || "Werkstroom zonder naam";
  const t = stand?.telling ?? legeTelling();
  const schema = opSchema(t);
  const verstreken = (stand?.onderdelen ?? []).filter((o) => o.verstreken);
  const komend = (stand?.onderdelen ?? []).filter((o) => o.komend).sort((a, b) => a.rij.opleverDatum!.getTime() - b.rij.opleverDatum!.getTime());
  const geleverd = (w.geleverd ?? []).map(tekst).filter((s) => s.trim() !== "");
  const kops = (kaart?.koppelingen ?? []).filter((k) => tekst(k.label).trim() !== "" || tekst(k.url).trim() !== "");
  const zetW = (fn: (x: BordWerkstroom) => void) =>
    p.zet((b) => {
      const x = b.werkstromen[wi];
      if (x) fn(x);
    });

  return (
    <li className="vb-ws" style={stijl} id={anker ? "vb-" + anker : undefined}>
      <div className="vb-ws-kop">
        <span className="vb-strook" aria-hidden="true" />
        <div className="vb-ws-naam">
          {edit ? (
            <div className="vb-ws-edit">
              <V v={tekst(w.naam)} on={(s) => zetW((x) => void (x.naam = s))} edit ph="Naam van de werkstroom" />
              <label className="vb-eb">
                <span className="ok-bl">Tijdlijngroep</span>
                <Keuze v={anker} opties={p.ankerOpties} on={(s) => zetW((x) => void (x.anker = s))} titel="Tijdlijngroep (anker) waar deze werkstroom bij hoort" />
              </label>
              <WegKnop titel="Werkstroom verwijderen" label="× werkstroom" on={() => p.zet((b) => void b.werkstromen.splice(wi, 1))} />
            </div>
          ) : anker && stand ? (
            <Doel id={"tl-" + anker} ankers={ankers} cls="vb-ws-link" titel="Naar de tijdlijn van deze werkstroom">
              {naam} <span aria-hidden="true">→</span>
            </Doel>
          ) : (
            <span className="vb-ws-link">{naam}</span>
          )}
          {!edit && stand && (
            <span className="vb-ws-sub">
              {t.totaal} {t.totaal === 1 ? "onderdeel" : "onderdelen"}
              {t.niet > 0 && ` · ${t.niet} niet gestart`}
              {schema !== null && ` · op schema ${procent(schema)}`}
            </span>
          )}
          {!edit && !stand && (
            <span className="vb-ws-sub vb-let-op">
              {anker ? `geen tijdlijngroep met anker "${anker}"` : "geen tijdlijngroep gekozen"}: voortgang te bepalen
            </span>
          )}
        </div>
        <Balk t={t} kleur={kleur} />
      </div>

      <div className="vb-ws-kolommen">
        <Kolom kop="Verstreken, niet afgerond" leeg={stand ? "geen" : "te bepalen"} cls="vb-kolom-verstreken">
          {verstreken.map((o, i) => (
            <OnderdeelRegel key={i} o={o} verstreken />
          ))}
        </Kolom>
        <Kolom kop={`Komt eraan (${HORIZON_DAGEN} dagen)`} leeg={stand ? "geen oplevering gepland" : "te bepalen"}>
          {komend.map((o, i) => (
            <OnderdeelRegel key={i} o={o} />
          ))}
        </Kolom>
        <div className="vb-kolom vb-kolom-nodig">
          <h5 className="vb-kk">Nog nodig</h5>
          {(w.nodig ?? []).length === 0 && !edit ? (
            <p className="vb-leeg">niets open</p>
          ) : (
            <NodigLijst
              items={w.nodig ?? []}
              edit={edit}
              zetLijst={(fn) => zetW((x) => fn((x.nodig ??= [])))}
              ph="Wat we nog van 3sides nodig hebben"
            />
          )}
        </div>
      </div>

      <div className="vb-ws-voet">
        <div className="vb-docs">
          <span className="vb-kk vb-kk-inline">Documenten en status</span>
          {kops.length === 0 && <span className="vb-leeg">nog geen documenten gekoppeld</span>}
          {kops.map((k, i) => (
            <Koppel key={i} kop={k} />
          ))}
          {anker && kaart && !edit && (
            <Doel id={"wk-" + anker} ankers={ankers} cls="vb-doc vb-doc-kaart" titel="Naar de werkstroomkaart">
              Werkstroomkaart <span aria-hidden="true">→</span>
            </Doel>
          )}
        </div>
        {(edit || geleverd.length > 0) && (
          <div className="vb-geleverd">
            <span className="vb-kk vb-kk-inline">Geleverd volgens 3sides</span>
            {edit ? (
              <ul className="ok-lijst-edit vb-geleverd-edit">
                {(w.geleverd ?? []).map((s, i) => (
                  <li key={i} className="ok-rij">
                    <V
                      v={tekst(s)}
                      on={(x) =>
                        zetW((n) => {
                          n.geleverd ??= [];
                          n.geleverd[i] = x;
                        })
                      }
                      edit
                      ph="Wat 3sides als geleverd meldt"
                    />
                    <WegKnop titel="Regel verwijderen" on={() => zetW((n) => void (n.geleverd ?? []).splice(i, 1))} />
                  </li>
                ))}
                <li>
                  <PlusKnop label="+ regel" on={() => zetW((n) => void (n.geleverd ??= []).push(""))} />
                </li>
              </ul>
            ) : (
              <span className="vb-geleverd-t">{geleverd.map((s, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {metBronlinks(s)}
                </span>
              ))}</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ---------- het blok ----------

export default function VoortgangsbordBlok({ b, edit, zet, ankers }: LosBlokProps<"voortgangsbord">) {
  const tl = useBlok("tijdlijn");
  const kaarten = useBlok("werkstromen")?.kaarten ?? [];
  const bron = useBron();
  const vandaag = new Date();
  const { groepen, onderdelen } = berekenStand(tl, vandaag);
  const werkstromen = b.werkstromen ?? [];
  const programmabreed = b.programmabreed ?? [];

  // Programmabreed: alle onderdelen uit de tijdlijn, ook van groepen die niet op het bord staan.
  const totaal = legeTelling();
  for (const o of onderdelen) telOp(totaal, o);
  const verstrekenAlle = onderdelen.filter((o) => o.verstreken);
  const dag = dag00(vandaag);
  const eerstvolgende = onderdelen
    .filter((o) => o.rij.opleverDatum !== null && o.soort !== "afgerond" && o.rij.opleverDatum >= dag)
    .sort((a, c) => a.rij.opleverDatum!.getTime() - c.rij.opleverDatum!.getTime())
    .slice(0, 5);

  const opAnker = new Map(groepen.filter((g) => g.anker).map((g) => [g.anker, g]));
  const kaartOpId = new Map(kaarten.map((k) => [tekst(k.id).trim(), k]));
  const eersteAnker = werkstromen.map((w) => tekst(w.anker).trim()).find((a) => a && opAnker.has(a)) ?? groepen.find((g) => g.anker)?.anker ?? "";
  const jira = bron.jira.trim();

  // Bewerkmodus: werkstroom toevoegen met een anker uit de tijdlijngroepen die nog niet op het bord staan.
  const opBord = new Set(werkstromen.map((w) => tekst(w.anker).trim()));
  const vrij = groepen.filter((g) => g.anker && !opBord.has(g.anker));
  const [nieuwAnker, setNieuwAnker] = useState("");
  const nieuwKeuze = vrij.some((g) => g.anker === nieuwAnker) ? nieuwAnker : (vrij[0]?.anker ?? "");
  const ankerOpties = (huidig: string) => {
    const opties = [{ waarde: "", label: "geen" }, ...groepen.filter((g) => g.anker).map((g) => ({ waarde: g.anker, label: `${g.naam} (${g.anker})` }))];
    if (huidig && !opAnker.has(huidig)) opties.push({ waarde: huidig, label: `${huidig} (geen tijdlijngroep)` });
    return opties;
  };

  const datum = vandaag.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="vb" aria-label={tekst(b.titel).trim() || "Voortgangsbord"}>
      <header className="vb-kop">
        <div className="vb-kop-t">
          <h4 className="vb-titel">
            <V v={tekst(b.titel)} on={(x) => zet((t) => void (t.titel = x))} edit={edit} ph="Titel van het bord" />
            {!edit && !tekst(b.titel).trim() && "Voortgangsbord"}
          </h4>
          <p className="vb-datum">
            Stand van <time dateTime={vandaag.toISOString().slice(0, 10)}>{datum}</time> ({ddmmjjjj(vandaag)}) · berekend uit de tijdlijn in dit document
          </p>
        </div>
        <div className="vb-knoppen">
          {isLink(jira) && (
            <a className="vb-knop vb-knop-vol" href={jira} target="_blank" rel="noopener noreferrer" title="Opent het Jira-bord in een nieuw tabblad">
              Jira-bord <span aria-hidden="true">↗</span>
            </a>
          )}
          {eersteAnker && (
            <Doel id={"tl-" + eersteAnker} ankers={ankers} cls="vb-knop" titel="Naar de tijdlijn">
              Tijdlijn <span aria-hidden="true">→</span>
            </Doel>
          )}
        </div>
      </header>

      {!tl && (
        <p className="vb-melding" role="status">
          Geen tijdlijn in dit document: de voortgang, wat verstreken is en wat eraan komt zijn te bepalen zodra de tijdlijn erin staat.
        </p>
      )}

      <div className="vb-tellers">
        <Teller n={totaal.totaal} label="onderdelen in de tijdlijn" />
        <Teller n={totaal.afgerond} label="afgerond" toon="groen" />
        <Teller n={totaal.verstreken} label="verstreken, niet afgerond" toon={totaal.verstreken > 0 ? "amber" : ""} />
        <Teller n={totaal.komend} label={`opleveringen komende ${HORIZON_DAGEN} dagen`} toon="blauw" />
      </div>

      <ul className="vb-werkstromen">
        {werkstromen.map((w, wi) => {
          const anker = tekst(w.anker).trim();
          return (
            <Werkstroom
              key={wi}
              w={w}
              wi={wi}
              stand={(anker && opAnker.get(anker)) || null}
              kaart={(anker && kaartOpId.get(anker)) || null}
              edit={edit}
              ankers={ankers}
              ankerOpties={ankerOpties(anker)}
              zet={zet}
            />
          );
        })}
        {werkstromen.length === 0 && !edit && (
          <li className="vb-leeg vb-leeg-blok">Nog geen werkstromen op het bord.</li>
        )}
        {edit && (
          <li className="vb-plus">
            {vrij.length > 0 && (
              <label className="vb-eb">
                <span className="ok-bl">Tijdlijngroep</span>
                <Keuze v={nieuwKeuze} opties={vrij.map((g) => ({ waarde: g.anker, label: `${g.naam} (${g.anker})` }))} on={setNieuwAnker} titel="Tijdlijngroep voor de nieuwe werkstroom" />
              </label>
            )}
            <PlusKnop
              label="+ werkstroom"
              on={() =>
                zet((t) => {
                  const g = opAnker.get(nieuwKeuze);
                  t.werkstromen.push({ anker: g?.anker ?? "", naam: g?.naam ?? "Nieuwe werkstroom", geleverd: [], nodig: [] });
                })
              }
            />
          </li>
        )}
      </ul>

      <div className="vb-onder">
        <div className="vb-paneel">
          <h5 className="vb-kk">Programmabreed nog nodig</h5>
          {programmabreed.length === 0 && !edit ? (
            <p className="vb-leeg">niets open</p>
          ) : (
            <NodigLijst
              items={programmabreed}
              edit={edit}
              zetLijst={(fn) => zet((t) => fn((t.programmabreed ??= [])))}
              ph="Wat we programmabreed nog van 3sides nodig hebben"
            />
          )}
        </div>
        <div className="vb-paneel">
          <h5 className="vb-kk">Eerstvolgende opleveringen</h5>
          {eerstvolgende.length === 0 ? (
            <p className="vb-leeg">{tl ? "geen opleveringen gepland" : "te bepalen"}</p>
          ) : (
            <ul className="vb-lijst">
              {eerstvolgende.map((o, i) => (
                <OnderdeelRegel key={i} o={o} metWerkstroom />
              ))}
            </ul>
          )}
        </div>
        <div className="vb-paneel vb-paneel-verstreken">
          <h5 className="vb-kk">Verstreken, niet afgerond (alle werkstromen)</h5>
          {verstrekenAlle.length === 0 ? (
            <p className="vb-leeg">{tl ? "geen" : "te bepalen"}</p>
          ) : (
            <ul className="vb-lijst">
              {verstrekenAlle.map((o, i) => (
                <OnderdeelRegel key={i} o={o} metWerkstroom verstreken />
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="vb-voet">
        <p className="vb-legenda-vast">
          Tellers per werkstroom uit de tijdlijngroep met hetzelfde anker, op de dag van vandaag. Voortgang = afgerond / onderdelen (wat loopt staat als lichtere balk, telt niet mee);
          op schema = het deel van de opleveringen met datum dat niet verstreken is. Verstreken = de oplevermaand is voorbij en het onderdeel staat in de
          tijdlijn niet op Afgerond; komt eraan = oplevering binnen {HORIZON_DAGEN} dagen. Zet een onderdeel in de tijdlijn op Afgerond en de tellers volgen.
        </p>
        {(edit || tekst(b.legenda).trim()) && (
          <V v={tekst(b.legenda)} on={(x) => zet((t) => void (t.legenda = x))} edit={edit} ml block cls="ok-legend vb-legenda" ph="Bron en toelichting (optioneel)" />
        )}
      </footer>
    </section>
  );
}

// Stijl; wordt samen met OK_CSS en DOC_CSS in het document gezet (BewerkbaarDocument).
// Los gebruikt (eigen tabblad): zet VOORTGANGSBORD_CSS en OK_CSS (voor .ok-in, .ok-knopje,
// .ok-bl) in de pagina en zet het blok in een element met de klasse "ok".
export const VOORTGANGSBORD_CSS = `
.vb{--vb-cito:#003366;--vb-rand:#e2e8f0;--vb-lijn:#edf1f5;--vb-amber:#b45309;--vb-rood:#b91c1c;--vb-groen:#047857;min-width:0;font-size:12px;line-height:1.45;color:var(--ink,#111827)}
.vb-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.vb-kop{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px 16px;margin-bottom:10px}
.vb-kop-t{min-width:0;flex:1 1 320px}
.vb-titel{font-size:15px;font-weight:800;letter-spacing:-.01em;color:var(--vb-cito);margin:0}
.vb-titel .ok-in{max-width:420px}
.vb-datum{margin:2px 0 0;font-size:11.5px;color:var(--ink2,#5b6573)}
.vb-datum time{font-weight:700;color:var(--ink,#111827)}
.vb-knoppen{display:flex;flex-wrap:wrap;gap:6px}
.vb-knop{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;border:1px solid var(--vb-cito);background:#fff;color:var(--vb-cito);font-size:11.5px;font-weight:700;text-decoration:none;white-space:nowrap}
.vb-knop:hover,.vb-knop:focus-visible{background:#eef3f9;outline:none}
.vb-knop:focus-visible{box-shadow:0 0 0 2px rgba(0,51,102,.3)}
.vb-knop-vol{background:var(--vb-cito);color:#fff}
.vb-knop-vol:hover,.vb-knop-vol:focus-visible{background:#0066cc;border-color:#0066cc}
.vb-melding{margin:0 0 10px;padding:8px 12px;border:1px solid #fcd34d;border-radius:10px;background:#fffbeb;color:#78350f;font-size:11.5px}
.vb-tellers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
.vb-teller{display:flex;flex-direction:column;gap:1px;min-width:0;padding:9px 12px;border:1px solid var(--vb-rand);border-radius:12px;background:#fff}
.vb-teller-n{font-size:22px;font-weight:800;line-height:1.1;letter-spacing:-.02em;color:var(--ink,#111827)}
.vb-teller-l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3,#9aa3b0);line-height:1.3}
.vb-teller-groen .vb-teller-n{color:var(--vb-groen)}
.vb-teller-blauw .vb-teller-n{color:var(--vb-cito)}
.vb-teller-amber{border-color:#fcd34d;background:#fffbeb}
.vb-teller-amber .vb-teller-n{color:var(--vb-amber)}
.vb-teller-amber .vb-teller-l{color:#92400e}
.vb-werkstromen{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}
.vb-ws{position:relative;min-width:0;padding:10px 14px 10px 18px;border:1px solid var(--vb-rand);border-radius:12px;background:#fff;overflow:hidden}
.vb-ws[id]{scroll-margin-top:80px}
.vb-strook{position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--vb-strook)}
.vb-ws-kop{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:6px 20px;align-items:center}
.vb-ws-naam{display:flex;flex-direction:column;gap:1px;min-width:0}
.vb-ws-link{font-size:13.5px;font-weight:800;line-height:1.3;color:var(--vb-cito);text-decoration:none;overflow-wrap:anywhere}
a.vb-ws-link:hover,a.vb-ws-link:focus-visible{text-decoration:underline;text-underline-offset:3px;outline:none}
.vb-ws-sub{font-size:11px;color:var(--ink2,#5b6573)}
.vb-let-op{color:var(--vb-amber)}
.vb-ws-edit{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.vb-ws-edit .ok-in{width:260px;max-width:100%}
.vb-eb{display:inline-flex;align-items:center;gap:6px}
.vb-eb .ok-keuze{width:auto;max-width:260px}
.vb-balk{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"spoor pct" "t t";align-items:center;gap:2px 10px;min-width:0}
.vb-balk-spoor{grid-area:spoor;position:relative;height:10px;border-radius:999px;background:var(--vb-lijn);overflow:hidden}
.vb-balk-af,.vb-balk-lo{position:absolute;top:0;bottom:0;left:0}
.vb-balk-af{background:var(--vb-k);border-radius:999px 0 0 999px}
.vb-balk-lo{background:color-mix(in srgb,var(--vb-k) 45%,#fff)}
.vb-balk-pct{grid-area:pct;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--ink,#111827);min-width:38px;text-align:right}
.vb-balk-t{grid-area:t;font-size:10.5px;color:var(--ink2,#5b6573)}
.vb-ws-kolommen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--vb-lijn)}
.vb-kolom{min-width:0}
.vb-kk{margin:0 0 4px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#9aa3b0)}
.vb-kk-inline{display:inline;margin:0 6px 0 0}
.vb-kolom-verstreken .vb-kk{color:var(--vb-amber)}
.vb-lijst{display:flex;flex-direction:column;gap:3px;margin:0;padding:0;list-style:none}
.vb-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;font-size:11.5px;line-height:1.4}
.vb-item-t{min-width:0;flex:1 1 140px;color:var(--ink,#111827)}
.vb-item-w{font-size:10.5px;color:var(--ink2,#5b6573)}
.vb-item-m{flex:none;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink2,#5b6573);white-space:nowrap}
.vb-item-blok{flex-direction:column;align-items:stretch;gap:0}
.vb-item-blok .vb-item-t{flex:none}
.vb-item-sub{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;font-size:10.5px;line-height:1.35}
.vb-item-sub .vb-item-w + .vb-item-m::before{content:"·";margin-right:6px;font-weight:400;color:var(--ink3,#9aa3b0)}
.vb-lijst > .vb-item-blok + .vb-item-blok{margin-top:2px;padding-top:4px;border-top:1px solid var(--vb-lijn)}
.vb-item-verstreken .vb-item-t{color:var(--vb-rood);font-weight:600}
.vb-item-verstreken .vb-item-m{color:var(--vb-amber)}
.vb-stip{flex:none;display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;font-size:10px;font-weight:800;line-height:1;color:#fff;align-self:center}
.vb-stip-plus{background:#059669}
.vb-stip-plusmin{background:#d97706}
.vb-stip-min{background:#dc2626}
.vb-leeg{margin:0;font-size:11.5px;font-style:italic;color:var(--ink3,#9aa3b0)}
.vb-leeg-blok{padding:10px 14px;border:1px dashed #cbd5e1;border-radius:12px}
.vb-nodig-item{display:flex;align-items:flex-start;gap:6px}
.vb-vink{display:flex;align-items:flex-start;gap:7px;flex:1;min-width:0;cursor:pointer;font-size:11.5px;line-height:1.4}
.vb-vink input{flex:none;margin:2px 0 0;width:14px;height:14px;accent-color:var(--vb-cito);cursor:pointer}
.vb-vink-t{min-width:0;color:var(--ink,#111827)}
.vb-klaar .vb-vink-t{text-decoration:line-through;color:var(--ink3,#9aa3b0)}
.vb-klaar .vb-vink-t .ok-bron{color:inherit}
.vb-nodig-edit .vb-vink .ok-in{flex:1}
.vb-nodig-groepen{display:flex;flex-direction:column;gap:7px}
.vb-groep-kop{display:flex;align-items:center;gap:6px;margin:0 0 3px;font-size:9px;font-weight:800;line-height:1.3;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#9aa3b0)}
.vb-groep-kop::after{content:"";flex:1;height:1px;background:var(--vb-lijn)}
.vb-hint{margin:5px 0 0;font-size:10.5px;line-height:1.4;color:var(--ink2,#5b6573)}
.vb-ws-voet{display:flex;flex-direction:column;gap:5px;margin-top:10px;padding-top:8px;border-top:1px solid var(--vb-lijn)}
.vb-docs{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-width:0}
.vb-doc{display:inline-flex;align-items:center;gap:4px;max-width:100%;min-width:0;padding:2px 8px;border-radius:6px;border:1px solid color-mix(in srgb,var(--vb-cito) 38%,#fff);background:#fff;color:var(--vb-cito);font-size:10.5px;font-weight:600;line-height:1.35;text-decoration:none;overflow-wrap:anywhere}
a.vb-doc:hover,a.vb-doc:focus-visible{background:#eef3f9;border-color:var(--vb-cito);outline:none}
a.vb-doc:focus-visible{box-shadow:0 0 0 2px rgba(0,51,102,.3)}
a.vb-doc-jira{background:var(--vb-cito);border-color:var(--vb-cito);color:#fff}
a.vb-doc-jira:hover,a.vb-doc-jira:focus-visible{background:#0066cc;border-color:#0066cc}
.vb-doc-leeg{border-style:dashed;border-color:#cbd5e1;background:#f8fafc;color:#64748b;font-weight:500}
.vb-doc-kaart{border-color:transparent;background:transparent;font-weight:700}
.vb-geleverd{font-size:11px;color:var(--ink2,#5b6573)}
.vb-geleverd-t{color:var(--ink3,#9aa3b0)}
.vb-geleverd-edit{margin-top:4px}
.vb-plus{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 14px;border:1px dashed #cbd5e1;border-radius:12px}
.vb-onder{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.vb-paneel{min-width:0;padding:10px 14px;border:1px solid var(--vb-rand);border-radius:12px;background:#fff}
.vb-paneel-verstreken .vb-kk{color:var(--vb-amber)}
.vb-voet{margin-top:10px}
.vb-legenda-vast{margin:0;font-size:10px;line-height:1.45;color:var(--ink3,#9aa3b0)}
.vb-legenda{white-space:pre-line}
@keyframes vb-doel{from{background-color:#dbe7f5}}
.vb-ws:target{animation:vb-doel 2.2s ease-out}
@media (prefers-reduced-motion:reduce){.vb-ws:target{animation:none}}
@media (max-width:900px){
.vb-ws-kolommen,.vb-onder{grid-template-columns:1fr}
.vb-ws-kop{grid-template-columns:1fr}
}
@media (max-width:640px){
.vb-tellers{grid-template-columns:repeat(2,minmax(0,1fr))}
.vb-teller-n{font-size:19px}
.vb-ws{padding:9px 12px 9px 16px}
}
`;
