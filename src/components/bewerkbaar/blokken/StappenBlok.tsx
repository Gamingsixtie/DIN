// Stappenplaat (stap 11): een horizontale stapper met genummerde cirkels in Cito-blauw,
// verbonden door een lijn, per stap een icoon, een vette kop en een korte tekst; onder de
// stapper de mogelijke uitkomsten als grote badges achter het woord "dan". Bijvoorbeeld
// "Zo gebruik je de plaat bij een nieuw project": vier stappen en drie uitkomsten (hoort
// erbij = groen, parkeerlijst = amber, buiten het programma = grijs). Op een smal scherm
// staan de stappen onder elkaar, de lijn loopt dan verticaal.
// Iconen zijn inline SVG, gekozen op naam: domein (vier vakjes), werkstroom (vlag), tijd
// (klok), baat (doelwit), vraag (vraagteken), vink (vinkje).
// Bewerkmodus: kop, tekst en icoon per stap, stappen toevoegen (+ stap) en weghalen (×);
// uitkomsten idem, met de kleur (toon) als keuzelijst.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import type { ReactNode } from "react";
import { Keuze, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"stappen">;

const ICOON_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "", label: "Geen icoon" },
  { waarde: "domein", label: "Domein (vier vakjes)" },
  { waarde: "werkstroom", label: "Werkstroom (vlag)" },
  { waarde: "tijd", label: "Tijd (klok)" },
  { waarde: "baat", label: "Baat (doelwit)" },
  { waarde: "vraag", label: "Vraag (vraagteken)" },
  { waarde: "vink", label: "Controle (vinkje)" },
];

const TOON_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "groen", label: "Groen (hoort erbij)" },
  { waarde: "amber", label: "Amber (parkeren)" },
  { waarde: "grijs", label: "Grijs (buiten)" },
  { waarde: "", label: "Blauw (neutraal)" },
];

/** Geldige toon (groen, amber, grijs); onbekend of leeg = "" (blauw, neutraal). */
function toonToken(toon: string): string {
  const t = toon.trim().toLowerCase();
  return t === "groen" || t === "amber" || t === "grijs" ? t : "";
}

/** Klasse van een badge bij een toon. */
function toonKlasse(toon: string): string {
  return toonToken(toon) || "blauw";
}

const ICONEN = new Set(["domein", "werkstroom", "tijd", "baat", "vraag", "vink"]);

/** Is dit een bekende icoonnaam? */
function heeftIcoon(naam: string): boolean {
  return ICONEN.has(naam.trim().toLowerCase());
}

/** Inline SVG-icoon bij een naam; null als de naam leeg of onbekend is. */
export function StapIcoon({ naam }: { naam: string }): ReactNode {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (naam.trim().toLowerCase()) {
    case "domein":
      return (
        <svg {...p}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </svg>
      );
    case "werkstroom":
      return (
        <svg {...p}>
          <path d="M5 21V4" />
          <path d="M5 4h12l-2.5 4 2.5 4H5" />
        </svg>
      );
    case "tijd":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "baat":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "vraag":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.24c-.7.35-1.1.9-1.1 1.6V14" />
          <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "vink":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12.2 2.4 2.4 4.8-5" />
        </svg>
      );
    default:
      return null;
  }
}

function PijlRechts() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7h13" />
      <path d="m10 2 5 5-5 5" />
    </svg>
  );
}

// Wijzigingen aan het blok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegStapToe(n: Blok) {
  n.stappen.push({ kop: "", tekst: "", icoon: "" });
}

function voegUitkomstToe(n: Blok) {
  n.uitkomsten.push({ label: "", toon: "" });
}

export default function StappenBlok({ b, edit, zet }: LosBlokProps<"stappen">) {
  if (!edit && b.stappen.length === 0 && b.uitkomsten.length === 0 && !b.titel) return null;

  return (
    <div className="st-blok">
      {(edit || b.titel) && (
        <h4 className="st-titel">
          <V v={b.titel ?? ""} on={(x) => zet((m) => void (m.titel = x))} edit={edit} ph="Titel van de stappenplaat (optioneel)" />
        </h4>
      )}

      <ol className={"st-stapper" + (edit ? " st-edit" : "")}>
        {b.stappen.map((s, i) => {
          const icoon = s.icoon ?? "";
          return (
            <li key={i} className="st-stap">
              <span className="st-nr" aria-hidden="true">
                {i + 1}
              </span>
              <div className="st-inhoud">
                {(edit || heeftIcoon(icoon)) && (
                  <span className={"st-icoon" + (heeftIcoon(icoon) ? "" : " st-icoon-leeg")}>
                    <StapIcoon naam={icoon} />
                  </span>
                )}
                {edit && (
                  <div className="st-opties">
                    <Keuze
                      v={icoon}
                      opties={ICOON_OPTIES}
                      on={(x) => zet((m) => void (m.stappen[i].icoon = x))}
                      titel="Icoon van de stap"
                    />
                    <WegKnop titel="Stap verwijderen" on={() => zet((m) => void m.stappen.splice(i, 1))} />
                  </div>
                )}
                <V
                  v={s.kop}
                  on={(x) => zet((m) => void (m.stappen[i].kop = x))}
                  edit={edit}
                  block
                  cls="st-kop"
                  ph="Kop van de stap"
                />
                {(edit || s.tekst) && (
                  <V
                    v={s.tekst ?? ""}
                    on={(x) => zet((m) => void (m.stappen[i].tekst = x))}
                    edit={edit}
                    ml
                    block
                    cls="st-tekst"
                    ph="Korte toelichting (optioneel)"
                  />
                )}
              </div>
            </li>
          );
        })}
        {edit && (
          <li className="st-stap st-plus">
            <PlusKnop label="+ stap" on={() => zet(voegStapToe)} />
          </li>
        )}
      </ol>

      {(edit || b.uitkomsten.length > 0) && (
        <div className="st-uitkomsten">
          <span className="st-dan">
            <PijlRechts />
            dan
          </span>
          <div className="st-badges">
            {b.uitkomsten.map((u, i) =>
              edit ? (
                <span key={i} className="st-badge-edit">
                  <V v={u.label} on={(x) => zet((m) => void (m.uitkomsten[i].label = x))} edit ph="Uitkomst" />
                  <Keuze
                    v={toonToken(u.toon ?? "")}
                    opties={TOON_OPTIES}
                    on={(x) => zet((m) => void (m.uitkomsten[i].toon = x))}
                    titel="Kleur van de uitkomst"
                  />
                  <WegKnop titel="Uitkomst verwijderen" on={() => zet((m) => void m.uitkomsten.splice(i, 1))} />
                </span>
              ) : (
                <span key={i} className={"st-badge st-" + toonKlasse(u.toon ?? "")}>
                  {u.label}
                </span>
              )
            )}
            {edit && <PlusKnop label="+ uitkomst" on={() => zet(voegUitkomstToe)} />}
          </div>
        </div>
      )}

      {(edit || b.legenda) && (
        <div className="ok-legend st-legenda">
          <V v={b.legenda ?? ""} on={(x) => zet((m) => void (m.legenda = x))} edit={edit} ml ph="Legenda (optioneel)" />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink2, --ink3, --amber). De verbindingslijn is een ::after op elke
// stap behalve de laatste: van het midden van de eigen cirkel tot het midden van de
// volgende (breed), of van onder de cirkel tot de volgende cirkel (smal).
export const STAPPEN_CSS = `
.okd .st-blok{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px 12px}
.okd .st-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 14px}
.okd .st-stapper{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0 14px}
.okd .st-stap{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 4px}
.okd .st-stap:not(:last-child)::after{content:"";position:absolute;top:16px;left:calc(50% + 22px);right:calc(-50% - 14px + 22px);height:2px;background:#c7d5e5;z-index:0}
.okd .st-nr{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--cito);color:#fff;font-size:13px;font-weight:800;box-shadow:0 0 0 4px #fff}
.okd .st-inhoud{display:flex;flex-direction:column;align-items:center;width:100%;margin-top:10px}
.okd .st-icoon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#eaf1f8;color:var(--cito);margin-bottom:8px}
.okd .st-icoon-leeg{background:#f3f5f8;color:#c7d5e5;border:1px dashed #c7d5e5}
.okd .st-kop{font-size:12.5px;font-weight:700;line-height:1.35;color:var(--ink)}
.okd .st-tekst{font-size:11.5px;line-height:1.45;color:var(--ink2);margin-top:4px;white-space:pre-line}
.okd .st-opties{display:flex;align-items:center;gap:4px;margin-bottom:6px;max-width:100%}
.okd .st-opties .ok-keuze{font-size:10.5px;padding:1px 4px;min-width:0}
.okd .st-plus{justify-content:flex-start;padding-top:10px}
.okd .st-plus::after,.okd .st-stap:has(+ .st-plus)::after{content:none}
.okd .st-stap .ok-in{text-align:left;font-size:12px;font-weight:400}
.okd .st-stap textarea.ok-in{field-sizing:content;min-height:2.6em}
.okd .st-uitkomsten{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:16px;padding-top:12px;border-top:1px dashed #dde3ea}
.okd .st-dan{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3)}
.okd .st-badges{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.okd .st-badge{display:inline-block;font-size:13px;font-weight:700;line-height:1.4;border:1.5px solid;border-radius:999px;padding:6px 16px;white-space:nowrap}
.okd .st-groen{background:#ecfdf5;color:#047857;border-color:#6ee7b7}
.okd .st-amber{background:#fffbeb;color:#92400e;border-color:#fcd34d}
.okd .st-grijs{background:#f3f4f6;color:#4b5563;border-color:#d1d5db}
.okd .st-blauw{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
.okd .st-badge-edit{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap}
.okd .st-badge-edit .ok-in{width:180px;max-width:100%}
.okd .st-badge-edit .ok-keuze{font-size:10.5px;padding:1px 4px}
.okd .st-legenda{margin-top:10px}
@media(max-width:640px){
.okd .st-stapper{grid-template-columns:minmax(0,1fr);gap:14px 0}
.okd .st-stap{display:grid;grid-template-columns:32px minmax(0,1fr);column-gap:12px;align-items:start;text-align:left;padding:0}
.okd .st-stap:not(:last-child)::after{top:36px;bottom:-14px;left:15px;right:auto;width:2px;height:auto}
.okd .st-inhoud{align-items:flex-start;margin-top:0}
.okd .st-icoon{width:32px;height:32px;margin-bottom:6px}
.okd .st-plus{grid-template-columns:minmax(0,1fr);padding-top:0}
.okd .st-badge{white-space:normal}
}
`;
