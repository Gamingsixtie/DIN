// KPI-plaat (stap 11): de KPI's per niveau van het Doelen-Inspanningennetwerk als een
// cascade van gestapelde banden, van boven (doel) naar onder (inspanning). Per niveau
// links een gekleurde kolom in de laagkleur met de naam en een badge met het soort KPI
// (impact, uitkomst, leidend, output); rechts de vraag die het niveau beantwoordt, dan
// de groepen met KPI's als chips, en klein "wanneer" en de bron. Een groep met toon
// "voorstel" krijgt een stippelrand en het label voorstel; "let-op" wordt amber.
// Kleur per laag: doel, baat, vermogen, gedrag, inspanning (zelfde tokens als de lagen
// en de DIN-plaat in BewerkbaarDocument); een hex-kleur mag ook.
// Bewerkmodus: alle teksten aanpasbaar; chips, groepen en niveaus toevoegen en weghalen;
// laag en soort per niveau en de toon per groep als keuzelijst.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import type { CSSProperties } from "react";
import { Keuze, Lijst, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"kpiplaat">;
type Niveau = Blok["niveaus"][number];
type Groep = Niveau["groepen"][number];

// Kleur per laag van de kapstok (zelfde waarden als LAAG_KLEUREN in BewerkbaarDocument).
const LAAG_KLEUREN = new Map<string, string>([
  ["doel", "#003366"],
  ["baat", "#0066cc"],
  ["vermogen", "#0e7490"],
  ["gedrag", "#6d28d9"],
  ["inspanning", "#b45309"],
]);
const NEUTRAAL = "#64748b";
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const LAAG_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "doel", label: "Doel" },
  { waarde: "baat", label: "Baat" },
  { waarde: "vermogen", label: "Vermogen" },
  { waarde: "gedrag", label: "Gedrag" },
  { waarde: "inspanning", label: "Inspanning" },
  { waarde: "", label: "Neutraal" },
];

const SOORT_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "impact", label: "Impact" },
  { waarde: "uitkomst", label: "Uitkomst" },
  { waarde: "leidend", label: "Leidend" },
  { waarde: "output", label: "Output" },
  { waarde: "", label: "Geen soort" },
];

const TOON_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "", label: "Gewoon" },
  { waarde: "voorstel", label: "Voorstel (stippelrand)" },
  { waarde: "let-op", label: "Let op (amber)" },
];

/** Kleur van een niveau: laagtoken, hex of neutraal grijs. */
function laagKleur(kleur: string): string {
  const t = kleur.trim().toLowerCase();
  return LAAG_KLEUREN.get(t) ?? (HEX.test(t) ? t : NEUTRAAL);
}

/** Waarde voor de laag-keuzelijst: alleen een bekend token, anders neutraal. */
function laagToken(kleur: string): string {
  const t = kleur.trim().toLowerCase();
  return LAAG_KLEUREN.has(t) ? t : "";
}

function soortToken(soort: string): string {
  const t = soort.trim().toLowerCase();
  return SOORT_OPTIES.some((o) => o.waarde === t) ? t : "";
}

function toonToken(toon: string): "" | "voorstel" | "let-op" {
  const t = toon.trim().toLowerCase();
  return t === "voorstel" || t === "let-op" ? t : "";
}

function PijlOmlaag() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 1v9" />
      <path d="m2.5 6.5 4.5 4 4.5-4" />
    </svg>
  );
}

function Klok() {
  return (
    <svg className="kp-icoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

// Wijzigingen aan het blok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function nieuweGroep(): Groep {
  return { titel: "", chips: [], toon: "" };
}

function voegNiveauToe(n: Blok) {
  n.niveaus.push({ naam: "", kleur: "", soort: "", vraag: "", wanneer: "", groepen: [nieuweGroep()], bron: "" });
}

function GroepWeergave({ g, kleur }: { g: Groep; kleur: string }) {
  const toon = toonToken(g.toon ?? "");
  return (
    <div className={"kp-groep" + (toon ? " kp-groep-" + toon : "")}>
      {(g.titel || toon) && (
        <div className="kp-groep-kop">
          {g.titel && <span className="kp-groep-t">{g.titel}</span>}
          {toon === "voorstel" && <span className="kp-tag">voorstel</span>}
          {toon === "let-op" && <span className="kp-tag kp-tag-let-op">let op</span>}
        </div>
      )}
      <div className="kp-chips">
        {g.chips.map((c, i) => (
          <span key={i} className="kp-chip" style={{ "--kpk": toon === "let-op" ? "#b45309" : kleur } as CSSProperties}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function GroepBewerken({ g, zetG, onWeg }: { g: Groep; zetG: (fn: (g: Groep) => void) => void; onWeg: () => void }) {
  return (
    <div className="kp-groep kp-groep-edit">
      <div className="kp-groep-kop">
        <V v={g.titel} on={(x) => zetG((k) => void (k.titel = x))} edit ph="Titel van de groep" />
        <Keuze v={toonToken(g.toon ?? "")} opties={TOON_OPTIES} on={(x) => zetG((k) => void (k.toon = x))} titel="Toon van de groep" />
        <WegKnop titel="Groep verwijderen" on={onWeg} />
      </div>
      <span className="kp-hint">KPI&apos;s, één per regel</span>
      <Lijst items={g.chips} edit on={(items) => zetG((k) => void (k.chips = items))} ml={false} cls="kp-chips-edit" />
    </div>
  );
}

export default function KpiPlaatBlok({ b, edit, zet }: LosBlokProps<"kpiplaat">) {
  if (!edit && b.niveaus.length === 0 && !b.titel) return null;

  return (
    <div className="kp-blok">
      {(edit || b.titel) && (
        <h4 className="kp-titel">
          <V v={b.titel ?? ""} on={(x) => zet((m) => void (m.titel = x))} edit={edit} ph="Titel van de KPI-plaat (optioneel)" />
        </h4>
      )}

      <div className="kp-cascade">
        {b.niveaus.map((n, ni) => {
          const kleur = laagKleur(n.kleur ?? "");
          const soort = soortToken(n.soort ?? "");
          const zetN = (fn: (x: Niveau) => void) => zet((m) => fn(m.niveaus[ni]));
          return (
            <div key={ni} className="kp-niveau-wrap">
              {ni > 0 && (
                <div className="kp-pijl" aria-hidden="true">
                  <PijlOmlaag />
                </div>
              )}
              <div className="kp-niveau" style={{ "--kpk": kleur } as CSSProperties}>
                <div className="kp-links">
                  <V v={n.naam} on={(x) => zetN((y) => void (y.naam = x))} edit={edit} block cls="kp-naam" ph="Niveau" />
                  {edit ? (
                    <div className="kp-links-opties">
                      <Keuze v={laagToken(n.kleur ?? "")} opties={LAAG_OPTIES} on={(x) => zetN((y) => void (y.kleur = x))} titel="Laag (kleur)" />
                      <Keuze v={soort} opties={SOORT_OPTIES} on={(x) => zetN((y) => void (y.soort = x))} titel="Soort KPI" />
                      <WegKnop titel="Niveau verwijderen" on={() => zet((m) => void m.niveaus.splice(ni, 1))} />
                    </div>
                  ) : (
                    (soort || n.soort) && <span className="kp-soort">{soort || n.soort}</span>
                  )}
                </div>
                <div className="kp-rechts">
                  {(edit || n.vraag) && (
                    <V v={n.vraag ?? ""} on={(x) => zetN((y) => void (y.vraag = x))} edit={edit} block cls="kp-vraag" ph="De vraag die dit niveau beantwoordt" />
                  )}
                  <div className="kp-groepen">
                    {n.groepen.map((g, gi) =>
                      edit ? (
                        <GroepBewerken
                          key={gi}
                          g={g}
                          zetG={(fn) => zetN((y) => fn(y.groepen[gi]))}
                          onWeg={() => zetN((y) => void y.groepen.splice(gi, 1))}
                        />
                      ) : (
                        <GroepWeergave key={gi} g={g} kleur={kleur} />
                      )
                    )}
                    {edit && <PlusKnop label="+ groep" on={() => zetN((y) => void y.groepen.push(nieuweGroep()))} />}
                  </div>
                  {(edit || n.wanneer || n.bron) && (
                    <div className="kp-voet">
                      {(edit || n.wanneer) && (
                        <span className="kp-wanneer">
                          <Klok />
                          <V v={n.wanneer ?? ""} on={(x) => zetN((y) => void (y.wanneer = x))} edit={edit} ph="Wanneer gemeten" />
                        </span>
                      )}
                      {(edit || n.bron) && (
                        <span className="kp-bron">
                          {!edit && <span className="kp-bron-l">Bron</span>}
                          <V v={n.bron ?? ""} on={(x) => zetN((y) => void (y.bron = x))} edit={edit} ph="Bron" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {edit && (
          <div className="kp-plus">
            <PlusKnop label="+ niveau" on={() => zet(voegNiveauToe)} />
          </div>
        )}
      </div>

      {(edit || b.legenda) && (
        <div className="ok-legend kp-legenda">
          <V v={b.legenda ?? ""} on={(x) => zet((m) => void (m.legenda = x))} edit={edit} ml ph="Legenda (optioneel)" />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink2, --ink3, --amber). --kpk = kleur van het niveau (of van een chip).
export const KPIPLAAT_CSS = `
.okd .kp-blok{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px 12px}
.okd .kp-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 12px}
.okd .kp-cascade{display:flex;flex-direction:column}
.okd .kp-pijl{display:flex;justify-content:center;color:#5f6b7a;padding:3px 0}
.okd .kp-niveau{--kpk:${NEUTRAAL};display:grid;grid-template-columns:150px minmax(0,1fr);border:1px solid color-mix(in srgb,var(--kpk) 30%,#fff);border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--kpk) 3%,#fff)}
.okd .kp-links{display:flex;flex-direction:column;align-items:flex-start;gap:7px;background:var(--kpk);color:#fff;padding:12px 12px 12px 14px}
.okd .kp-naam{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;line-height:1.3}
.okd .kp-soort{display:inline-block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;line-height:1.5;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:1px 9px}
.okd .kp-links .ok-in{background:#fff;color:var(--ink);text-transform:none;letter-spacing:0;font-weight:600}
.okd .kp-links-opties{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%}
.okd .kp-links-opties .ok-keuze{font-size:10.5px;padding:1px 4px;background:#fff;color:var(--ink);width:100%}
.okd .kp-rechts{display:flex;flex-direction:column;gap:9px;padding:11px 14px 10px;min-width:0}
.okd .kp-vraag{font-size:13.5px;font-weight:700;line-height:1.35;color:color-mix(in srgb,var(--kpk) 85%,#000)}
.okd .kp-groepen{display:flex;flex-direction:column;gap:7px}
.okd .kp-groepen > .ok-knopje{align-self:flex-start}
.okd .kp-groep{display:flex;flex-direction:column;gap:4px;border:1px solid transparent;border-radius:9px;padding:0}
.okd .kp-groep-voorstel{border:1.5px dashed color-mix(in srgb,var(--kpk) 45%,#fff);padding:6px 9px;background:#fff}
.okd .kp-groep-let-op{border:1.5px solid #fcd34d;background:#fffbeb;padding:6px 9px}
.okd .kp-groep-kop{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px}
.okd .kp-groep-t{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2)}
.okd .kp-tag{display:inline-block;font-size:9px;font-weight:700;line-height:1.5;text-transform:uppercase;letter-spacing:.06em;color:var(--ink2);border:1px dashed #94a3b8;border-radius:999px;padding:0 7px;background:#fff}
.okd .kp-tag-let-op{color:#92400e;border:1px solid #f59e0b;background:#fef3c7}
.okd .kp-chips{display:flex;flex-wrap:wrap;gap:5px}
.okd .kp-chip{display:inline-block;max-width:100%;font-size:11.5px;font-weight:600;line-height:1.45;border:1px solid color-mix(in srgb,var(--kpk) 40%,#fff);border-radius:999px;padding:2px 10px;background:color-mix(in srgb,var(--kpk) 8%,#fff);color:color-mix(in srgb,var(--kpk) 80%,#000);white-space:normal}
.okd .kp-groep-voorstel .kp-chip{border-style:dashed}
.okd .kp-voet{display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;font-size:10.5px;line-height:1.4;color:var(--ink3);padding-top:6px;border-top:1px dashed color-mix(in srgb,var(--kpk) 25%,#fff)}
.okd .kp-wanneer{display:inline-flex;align-items:center;gap:5px;color:var(--ink2)}
.okd .kp-icoon{flex:none;width:12px;height:12px}
.okd .kp-bron{display:inline-flex;align-items:baseline;gap:5px}
.okd .kp-bron-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.okd .kp-groep-edit{border:1px dashed #cbd5e1;padding:6px 9px;background:#fafbfc}
.okd .kp-groep-edit .kp-groep-kop .ok-in{flex:1;min-width:140px;width:auto}
.okd .kp-groep-edit .ok-keuze{font-size:10.5px;padding:1px 4px}
.okd .kp-hint{font-size:10px;color:var(--ink3)}
.okd .kp-chips-edit{margin:0;padding:0;list-style:none}
.okd .kp-rechts .ok-in{font-size:12px;font-weight:400;text-transform:none;letter-spacing:0}
.okd .kp-voet .ok-in{width:auto;min-width:200px;flex:1}
.okd .kp-voet > span{flex:1 1 240px;min-width:0}
.okd .kp-plus{margin-top:8px}
.okd .kp-legenda{margin-top:10px}
@media(max-width:640px){
.okd .kp-niveau{grid-template-columns:minmax(0,1fr)}
.okd .kp-links{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 12px}
.okd .kp-links-opties{flex-direction:row;flex-wrap:wrap}
.okd .kp-links-opties .ok-keuze{width:auto}
.okd .kp-rechts{padding:10px 12px}
.okd .kp-vraag{font-size:13px}
}
`;
