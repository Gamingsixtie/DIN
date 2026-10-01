// Stroomplaat (stap 11): kolommen naast elkaar met items als afgeronde vakken (kleurstreep
// links, naam en subregel) en tussen de kolommen zachte bogen van item naar item op basis
// van de verbindingen. Bijvoorbeeld "werkstromen bouwen, kernprincipes meten": de vier
// werkstromen → de vier domeinen van het vermogen → de vijf kernprincipes. De kleur van een
// item is een domein-id (cultuur, mens, data, processen; kleur uit DOMEINEN) of een hex-kleur.
// De bogen worden na het renderen gemeten (useLayoutEffect + ResizeObserver) en in een SVG
// over de kolommen getekend; wie met de muis (of het toetsenbord) op een item staat, ziet
// zijn verbindingen oplichten en de rest dimmen. Is de plaat smal (container < 620 px),
// dan staan de kolommen onder elkaar zonder bogen en staat per item "verbonden met: …".
// Bewerkmodus: kop en sub per kolom, naam, sub en kleur per item; kolommen en items
// toevoegen en weghalen; verbindingen als lijst "van → naar" met twee keuzelijsten.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Keuze, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"stroomplaat">;
type Kolom = Blok["kolommen"][number];
type Item = Kolom["items"][number];
type Pad = { van: string; naar: string; d: string; kleur: string };

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NEUTRAAL = "#64748b";
/** Containerbreedte (px) waaronder de kolommen onder elkaar staan, zonder bogen. */
const SMAL = 620;
const NIEUW_ITEM = "Nieuw item";
const EIGEN = "eigen";

const KLEUR_OPTIES: { waarde: string; label: string }[] = [
  ...DOMEINEN.map((d) => ({ waarde: d.id, label: d.label })),
  { waarde: EIGEN, label: "Eigen kleur" },
];

/** Kleur van een item: domein-id → domeinkleur, hex → hex, anders neutraal grijs. */
function itemKleur(kleur: string): string {
  const d = domein(kleur);
  if (d) return d.kleur;
  const t = kleur.trim();
  return HEX.test(t) ? t : NEUTRAAL;
}

/** Kleur als #rrggbb, wat een kleurkiezer (input type=color) verlangt. */
function hex6(kleur: string): string {
  const t = itemKleur(kleur).toLowerCase();
  if (t.length === 7) return t;
  if (t.length === 4) return "#" + [1, 2, 3].map((i) => t[i] + t[i]).join("");
  if (t.length === 9) return t.slice(0, 7);
  return NEUTRAAL;
}

/** "Klant begrijpen" → "klant-begrijpen". */
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniekId(basis: string, bezet: ReadonlySet<string>): string {
  const b = basis || "item";
  if (!bezet.has(b)) return b;
  for (let n = 2; ; n++) if (!bezet.has(`${b}-${n}`)) return `${b}-${n}`;
}

function alleItems(b: Blok): { item: Item; kolom: Kolom }[] {
  return b.kolommen.flatMap((kolom) => kolom.items.map((item) => ({ item, kolom })));
}

/** Namen van de items die met dit item verbonden zijn (beide richtingen, zonder dubbelen). */
function verbondenMet(b: Blok, id: string): string[] {
  const namen = new Map<string, string>();
  for (const { item } of alleItems(b)) namen.set(item.id, item.naam);
  const uit: string[] = [];
  for (const [van, naar] of b.verbindingen) {
    const ander = van === id ? naar : naar === id ? van : null;
    if (ander === null) continue;
    const naam = namen.get(ander);
    if (naam && !uit.includes(naam)) uit.push(naam);
  }
  return uit;
}

// Wijzigingen aan het blok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegKolomToe(n: Blok) {
  n.kolommen.push({ kop: "Nieuwe kolom", sub: "", items: [] });
}

function voegItemToe(n: Blok, k: number) {
  const bezet = new Set(alleItems(n).map((x) => x.item.id));
  n.kolommen[k].items.push({ id: uniekId(slug(NIEUW_ITEM), bezet), naam: NIEUW_ITEM, kleur: "", sub: "" });
}

/** Haalt een item weg, met zijn verbindingen. */
function verwijderItem(n: Blok, k: number, i: number) {
  const id = n.kolommen[k].items[i]?.id;
  n.kolommen[k].items.splice(i, 1);
  n.verbindingen = n.verbindingen.filter(([van, naar]) => van !== id && naar !== id);
}

/** Haalt een kolom weg, met de verbindingen van al zijn items. */
function verwijderKolom(n: Blok, k: number) {
  const ids = new Set(n.kolommen[k].items.map((x) => x.id));
  n.kolommen.splice(k, 1);
  n.verbindingen = n.verbindingen.filter(([van, naar]) => !ids.has(van) && !ids.has(naar));
}

/** Nieuwe verbinding: van het eerste item van kolom 1 naar het eerste van kolom 2 (als die er zijn). */
function voegVerbindingToe(n: Blok) {
  const van = n.kolommen[0]?.items[0]?.id ?? "";
  const naar = n.kolommen[1]?.items[0]?.id ?? "";
  n.verbindingen.push([van, naar]);
}

function Verbindingen({ b, zet }: { b: Blok; zet: LosBlokProps<"stroomplaat">["zet"] }) {
  const basis = alleItems(b).map(({ item, kolom }) => ({
    waarde: item.id,
    label: (kolom.kop ? kolom.kop + ": " : "") + (item.naam || item.id),
  }));
  const opties = (id: string) =>
    basis.some((o) => o.waarde === id) ? basis : [{ waarde: id, label: id ? "(onbekend) " + id : "— kies —" }, ...basis];
  return (
    <div className="sp-verb">
      <div className="sp-verb-kop">Verbindingen (van → naar)</div>
      {b.verbindingen.map(([van, naar], i) => (
        <div key={i} className="sp-verb-rij">
          <Keuze v={van} opties={opties(van)} on={(x) => zet((m) => void (m.verbindingen[i][0] = x))} titel="Van" />
          <span className="sp-verb-pijl" aria-hidden="true">
            →
          </span>
          <Keuze v={naar} opties={opties(naar)} on={(x) => zet((m) => void (m.verbindingen[i][1] = x))} titel="Naar" />
          <WegKnop titel="Verbinding verwijderen" on={() => zet((m) => void m.verbindingen.splice(i, 1))} />
        </div>
      ))}
      <PlusKnop label="+ verbinding" on={() => zet(voegVerbindingToe)} />
    </div>
  );
}

export default function StroomPlaatBlok({ b, edit, zet }: LosBlokProps<"stroomplaat">) {
  const ref = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [paden, setPaden] = useState<Pad[]>([]);
  const [maat, setMaat] = useState({ w: 0, h: 0 });
  const [smal, setSmal] = useState(false);
  const [actief, setActief] = useState<string | null>(null);

  // Meet na elke render de posities van de items en teken de bogen; opnieuw bij een
  // andere grootte van de container (ResizeObserver).
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const meet = () => {
      const cr = c.getBoundingClientRect();
      const w = c.clientWidth;
      const h = c.clientHeight;
      const smalNu = w < SMAL;
      setSmal(smalNu);
      if (smalNu) {
        setPaden([]);
        return;
      }
      const kleuren = new Map<string, string>();
      for (const { item } of alleItems(b)) kleuren.set(item.id, itemKleur(item.kleur ?? ""));
      const uit: Pad[] = [];
      for (const [van, naar] of b.verbindingen) {
        const a = els.current.get(van);
        const z = els.current.get(naar);
        if (!a || !z || van === naar) continue;
        const ra = a.getBoundingClientRect();
        const rz = z.getBoundingClientRect();
        const rechts = rz.left >= ra.right;
        const x1 = (rechts ? ra.right : ra.left) - cr.left;
        const x2 = (rechts ? rz.left : rz.right) - cr.left;
        const y1 = ra.top + ra.height / 2 - cr.top;
        const y2 = rz.top + rz.height / 2 - cr.top;
        const dx = (x2 - x1) / 2;
        const r = (n: number) => Math.round(n * 10) / 10;
        uit.push({
          van,
          naar,
          d: `M${r(x1)} ${r(y1)} C${r(x1 + dx)} ${r(y1)}, ${r(x2 - dx)} ${r(y2)}, ${r(x2)} ${r(y2)}`,
          kleur: kleuren.get(van) ?? NEUTRAAL,
        });
      }
      setMaat({ w, h });
      setPaden(uit);
    };
    meet();
    const ro = new ResizeObserver(() => meet());
    ro.observe(c);
    return () => ro.disconnect();
  }, [b, edit]);

  if (!edit && b.kolommen.length === 0 && !b.titel) return null;

  // Items die direct met het actieve item verbonden zijn (voor het oplichten).
  const verbonden = new Set<string>();
  if (actief) {
    for (const [van, naar] of b.verbindingen) {
      if (van === actief) verbonden.add(naar);
      if (naar === actief) verbonden.add(van);
    }
  }
  const n = Math.max(1, b.kolommen.length);

  return (
    <div className="sp-blok">
      {(edit || b.titel) && (
        <h4 className="sp-titel">
          <V v={b.titel ?? ""} on={(x) => zet((m) => void (m.titel = x))} edit={edit} ph="Titel van de stroomplaat (optioneel)" />
        </h4>
      )}

      <div ref={ref} className={"sp-plaat" + (smal ? " sp-smal" : "")}>
        {!smal && paden.length > 0 && (
          <svg className="sp-svg" width={maat.w} height={maat.h} viewBox={`0 0 ${maat.w} ${maat.h}`} aria-hidden="true">
            {paden.map((p, i) => {
              const raakt = actief !== null && (p.van === actief || p.naar === actief);
              const cls = "sp-pad" + (actief === null ? "" : raakt ? " sp-pad-licht" : " sp-pad-dim");
              return <path key={i} className={cls} d={p.d} stroke={p.kleur} />;
            })}
          </svg>
        )}
        <div className="sp-kolommen" style={{ "--spn": n } as CSSProperties}>
          {b.kolommen.map((k, ki) => (
            <div key={ki} className="sp-kolom">
              <div className="sp-kop">
                <V v={k.kop} on={(x) => zet((m) => void (m.kolommen[ki].kop = x))} edit={edit} block cls="sp-kop-t" ph="Kolomkop" />
                {(edit || k.sub) && (
                  <V v={k.sub ?? ""} on={(x) => zet((m) => void (m.kolommen[ki].sub = x))} edit={edit} block cls="sp-kop-sub" ph="Subregel (optioneel)" />
                )}
                {edit && <WegKnop titel="Kolom verwijderen" on={() => zet((m) => verwijderKolom(m, ki))} />}
              </div>
              {k.items.map((it, ii) => {
                const kleur = itemKleur(it.kleur ?? "");
                const heeft = b.verbindingen.some(([van, naar]) => van === it.id || naar === it.id);
                const cls =
                  "sp-item" +
                  (actief === it.id ? " sp-item-actief" : "") +
                  (verbonden.has(it.id) ? " sp-item-licht" : "") +
                  (actief !== null && actief !== it.id && !verbonden.has(it.id) ? " sp-item-dim" : "");
                const dom = domein(it.kleur ?? "");
                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      if (el) els.current.set(it.id, el);
                      else els.current.delete(it.id);
                    }}
                    className={cls}
                    style={{ "--spk": kleur } as CSSProperties}
                    tabIndex={!edit && heeft ? 0 : undefined}
                    onMouseEnter={() => setActief(it.id)}
                    onMouseLeave={() => setActief(null)}
                    onFocus={() => setActief(it.id)}
                    onBlur={() => setActief(null)}
                  >
                    <V v={it.naam} on={(x) => zet((m) => void (m.kolommen[ki].items[ii].naam = x))} edit={edit} block cls="sp-item-t" ph="Naam" />
                    {(edit || it.sub) && (
                      <V v={it.sub ?? ""} on={(x) => zet((m) => void (m.kolommen[ki].items[ii].sub = x))} edit={edit} block cls="sp-item-sub" ph="Subregel (optioneel)" />
                    )}
                    {edit && (
                      <div className="sp-item-opties">
                        <Keuze
                          v={dom ? dom.id : EIGEN}
                          opties={KLEUR_OPTIES}
                          on={(x) => zet((m) => void (m.kolommen[ki].items[ii].kleur = x === EIGEN ? hex6(it.kleur ?? "") : x))}
                          titel="Kleur van het item"
                        />
                        {!dom && (
                          <input
                            type="color"
                            className="sp-kleur"
                            value={hex6(it.kleur ?? "")}
                            title="Eigen kleur"
                            aria-label="Eigen kleur"
                            onChange={(e) => {
                              const kl = e.target.value;
                              zet((m) => void (m.kolommen[ki].items[ii].kleur = kl));
                            }}
                          />
                        )}
                        <WegKnop titel="Item verwijderen" on={() => zet((m) => verwijderItem(m, ki, ii))} />
                      </div>
                    )}
                    {smal && !edit && heeft && (
                      <div className="sp-verbonden">
                        <span className="sp-verbonden-l">Verbonden met</span> {verbondenMet(b, it.id).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })}
              {edit && <PlusKnop label="+ item" on={() => zet((m) => voegItemToe(m, ki))} />}
            </div>
          ))}
          {edit && (
            <div className="sp-kolom sp-kolom-plus">
              <PlusKnop label="+ kolom" on={() => zet(voegKolomToe)} />
            </div>
          )}
        </div>
      </div>

      {edit && <Verbindingen b={b} zet={zet} />}

      {(edit || b.voet) && (
        <div className="ok-legend sp-voet">
          <V v={b.voet ?? ""} on={(x) => zet((m) => void (m.voet = x))} edit={edit} ml ph="Voettekst (optioneel)" />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink2, --ink3). --spk = kleur van een item, --spn = aantal kolommen.
// De SVG met de bogen ligt over de kolommen (absoluut, zonder muisinteractie).
export const STROOMPLAAT_CSS = `
.okd .sp-blok{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px 12px}
.okd .sp-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 12px}
.okd .sp-plaat{position:relative}
.okd .sp-svg{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:0}
.okd .sp-pad{fill:none;stroke-width:2;stroke-opacity:.5;stroke-linecap:round;transition:stroke-opacity .15s,stroke-width .15s}
.okd .sp-pad-licht{stroke-width:3;stroke-opacity:.95}
.okd .sp-pad-dim{stroke-opacity:.1}
.okd .sp-kolommen{position:relative;z-index:1;display:grid;grid-template-columns:repeat(var(--spn,3),minmax(0,1fr));column-gap:52px;row-gap:16px;align-items:start}
.okd .sp-kolom{display:flex;flex-direction:column;gap:8px;min-width:0}
.okd .sp-kolom > .ok-knopje{align-self:flex-start}
.okd .sp-kolom-plus{justify-content:flex-start}
.okd .sp-kop{display:flex;flex-direction:column;gap:2px;padding:0 2px 6px;border-bottom:2px solid #e2e8f0;margin-bottom:2px}
.okd .sp-kop-t{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;line-height:1.3;color:var(--ink)}
.okd .sp-kop-sub{font-size:10.5px;line-height:1.4;color:var(--ink3)}
.okd .sp-kop .ok-knopje{align-self:flex-start;margin-top:4px}
.okd .sp-item{--spk:${NEUTRAAL};position:relative;background:color-mix(in srgb,var(--spk) 6%,#fff);border:1px solid #e2e8f0;border-left:5px solid var(--spk);border-radius:10px;padding:8px 10px;transition:opacity .15s,box-shadow .15s,background .15s;outline:none}
.okd .sp-item[tabindex]{cursor:default}
.okd .sp-item-actief{box-shadow:0 0 0 2px color-mix(in srgb,var(--spk) 55%,#fff);background:color-mix(in srgb,var(--spk) 14%,#fff)}
.okd .sp-item-licht{background:color-mix(in srgb,var(--spk) 16%,#fff);border-color:color-mix(in srgb,var(--spk) 45%,#fff)}
.okd .sp-item-dim{opacity:.4}
.okd .sp-item-t{font-size:12.5px;font-weight:700;line-height:1.35;color:var(--ink)}
.okd .sp-item-sub{font-size:10.5px;line-height:1.4;color:var(--ink2);margin-top:2px;white-space:pre-line}
.okd .sp-item .ok-in{font-size:12px;font-weight:400;text-transform:none;letter-spacing:0}
.okd .sp-kop .ok-in{font-size:12px;font-weight:600;text-transform:none;letter-spacing:0}
.okd .sp-item-opties{display:flex;align-items:center;gap:4px;margin-top:5px}
.okd .sp-item-opties .ok-keuze{font-size:10.5px;padding:1px 4px;min-width:0}
.okd .sp-kleur{width:26px;height:20px;padding:0;border:1px solid rgba(15,42,63,.25);border-radius:5px;background:none;cursor:pointer}
.okd .sp-verbonden{font-size:10.5px;line-height:1.4;color:var(--ink2);margin-top:4px}
.okd .sp-verbonden-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}
.okd .sp-smal .sp-kolommen{grid-template-columns:minmax(0,1fr)}
.okd .sp-verb{margin-top:14px;padding:10px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#fafbfc;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.okd .sp-verb-kop{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2)}
.okd .sp-verb-rij{display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;width:100%}
.okd .sp-verb-rij .ok-keuze{font-size:11px;padding:1px 4px;max-width:100%}
.okd .sp-verb-pijl{font-weight:800;color:var(--cito)}
.okd .sp-voet{margin-top:10px}
`;
