// Werkstroomkaarten (stap 11 "Programma × 3sides"): per werkstroom één kaart met het
// plan van aanpak, ingepast in het Doelen-Inspanningennetwerk (DIN). Vaste opbouw, op
// elke kaart op dezelfde plek: kop (naam, 3sides-naam, domeinen, leads, bron) →
// Waarom → Resultaten → Planning → In het DIN → Nog aanvullen → Documenten en status.
// Waar de browser het kan (CSS subgrid) staan de onderdelen van kaarten naast elkaar
// ook op dezelfde hoogte.
// Element-id "wk-<id>" is het linkdoel van de DIN-plaat. Onderaan, bij "Documenten en
// status", staan de koppelingen naar de 3sides-documenten en het Jira-bord als chips
// (met url een link in een nieuw tabblad, zonder url gedempt) en als laatste de link
// naar de tijdlijn (#tl-<id>) als die in het document staat.
// Bewerkmodus: alle teksten en regels zijn aanpasbaar, koppelingen (naam + url) ook;
// id en domeinen liggen vast en kaarten toevoegen of verwijderen kan niet.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";
import { Lijst, PlusKnop, V, WegKnop, metLabel } from "@/components/bewerkbaar/velden";

type Kaart = BlokVan<"werkstromen">["kaarten"][number];
type Koppeling = Kaart["koppelingen"][number];
type Domein = { id: string; label: string; kleur: string };
/** Past een kopie van één kaart aan; de wijziging gaat via het blok naar boven. */
type ZetKaart = (fn: (k: Kaart) => void) => void;

const CITO = "#003366";
const NEUTRAAL = "#64748b";
/** Rijen per kaart in het raster (subgrid): kop + zes onderdelen. */
const RIJEN = 7;

// Kleur per DIN-niveau, herkend aan het woord vóór de dubbele punt in "In het DIN"
// ("Vermogen: eenduidige funnelprocessen"). Zelfde kleuren als de lagen van de
// kapstok elders in het document.
const NIVEAUS: { woorden: string[]; kleur: string }[] = [
  { woorden: ["inspanning"], kleur: "#b45309" },
  { woorden: ["vermogen"], kleur: "#0891b2" },
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

function Aanvullen({ items }: { items: string[] }) {
  const zichtbaar = items.filter(heeft);
  if (zichtbaar.length === 0) return <Leeg tekst="Geen open punten" />;
  return (
    <ul className="wk-open">
      {zichtbaar.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
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
  const url = kop.url.trim();
  const tekst = heeft(kop.label) ? kop.label.trim() : url;
  const cls = "wk-doc" + (jira ? " wk-doc-jira" : "");
  if (isLink(url)) {
    return (
      <a className={cls} href={url} target="_blank" rel="noopener noreferrer" title={url}>
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

// ---------- kaart ----------

function WerkstroomKaart({
  k,
  edit,
  zetK,
  tijdlijn,
}: {
  k: Kaart;
  edit: boolean;
  zetK: ZetKaart;
  /** link naar de tijdlijn tonen (het anker bestaat en we zijn niet aan het bewerken) */
  tijdlijn: boolean;
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
        </div>
        {edit ? (
          <div className="wk-meta-edit">
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
          </div>
        ) : (
          (heeft(k.leads) || heeft(k.bron)) && (
            <p className="wk-meta">
              {heeft(k.leads) && <span>{k.leads}</span>}
              {heeft(k.bron) && (
                <span className="wk-bron">
                  <span className="wk-bron-l">Bron</span>
                  {k.bron}
                </span>
              )}
            </p>
          )
        )}
      </div>

      {/* rij 2 t/m 6: de onderdelen */}
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
          <p className="wk-waarom">{k.waarom}</p>
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

      <Deel titel="In het DIN">
        {edit ? <DinPadBewerken pad={k.dinPad} zetK={zetK} /> : <DinPad pad={k.dinPad} />}
      </Deel>

      <Deel titel="Nog aanvullen" open>
        {edit ? (
          <Lijst
            items={k.aanvullen}
            edit
            ml={false}
            on={(items) => zetK((n) => void (n.aanvullen = items))}
          />
        ) : (
          <Aanvullen items={k.aanvullen} />
        )}
      </Deel>

      <Deel titel="Documenten en status">
        {edit ? (
          <KoppelingenBewerken kops={k.koppelingen ?? []} zetK={zetK} />
        ) : (
          <Koppelingen kops={k.koppelingen ?? []} tijdlijn={tijdlijn ? "#tl-" + k.id : null} />
        )}
      </Deel>
    </article>
  );
}

// ---------- het blok ----------

export default function WerkstroomKaartenBlok({ b, edit, zet, ankers }: LosBlokProps<"werkstromen">) {
  if (b.kaarten.length === 0) return null;
  return (
    <div className="wk-raster">
      {b.kaarten.map((k, ki) => (
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
          tijdlijn={!edit && heeft(k.id) && ankers.has("tl-" + k.id)}
        />
      ))}
    </div>
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
@supports (grid-template-rows:subgrid){.okd .wk-kaart{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:subgrid;grid-row:span ${RIJEN}}}
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
.okd .wk-pijl{flex:none;font-size:13px;font-weight:700;line-height:1;color:#94a3b8}
.okd .wk-schakel{display:inline-flex;flex-wrap:wrap;align-items:baseline;column-gap:5px;max-width:100%;min-width:0;padding:3px 9px;border-radius:7px;border:1px solid color-mix(in srgb,var(--wk-s) 32%,#fff);background:color-mix(in srgb,var(--wk-s) 9%,#fff);color:color-mix(in srgb,var(--wk-s) 75%,#000);font-size:12.5px;font-weight:600;line-height:1.35}
.okd .wk-schakel-p{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
.okd .wk-open{display:flex;flex-wrap:wrap;gap:5px}
.okd .wk-open > li{max-width:100%;font-size:11.5px;font-weight:600;line-height:1.35;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:3px 9px}
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
.okd .ok-rij > .ok-in.wk-wanneer{flex:0 0 108px}
.okd .wk-staal{flex:none;width:10px;height:10px;margin-top:7px;border-radius:3px;background:var(--wk-s)}
.okd .wk-hint{margin-top:6px;font-size:10.5px;line-height:1.4;color:#64748b}
@media print{.okd .wk-kaart{box-shadow:none;break-inside:avoid}}
`;
