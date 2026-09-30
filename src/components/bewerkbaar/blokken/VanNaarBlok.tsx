// Van-naar-plaat (stap 11): verschillen uitgelicht. Per rij het onderwerp (vet, links),
// een gedempte "van"-kaart (lichtgrijs, met het label vanKop, bijv. "Zo staat het bij
// 3sides"), een pijl, en een "naar"-kaart met Cito-blauw accent (lichte tint, streep
// links, label naarKop, bijv. "Zo komt het in het DIN"). De verandering springt eruit
// door de pijl en het contrast; de bron staat klein onder de rij. Op een smal scherm
// staan de delen onder elkaar en wijst de pijl omlaag.
// Bewerkmodus: alles aanpasbaar (ook de twee koppen), rijen toevoegen (+ rij) en weghalen (×).
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import { PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"vannaar">;

const VAN_STANDAARD = "Van";
const NAAR_STANDAARD = "Naar";

function Pijl() {
  return (
    <svg className="vn-pijl-svg" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 10h22" />
      <path d="m17 3 7 7-7 7" />
    </svg>
  );
}

// Wijzigingen aan het blok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegRijToe(n: Blok) {
  n.rijen.push({ onderwerp: "", van: "", naar: "", bron: "" });
}

export default function VanNaarBlok({ b, edit, zet }: LosBlokProps<"vannaar">) {
  if (!edit && b.rijen.length === 0 && !b.titel) return null;
  const vanKop = (b.vanKop ?? "").trim() || VAN_STANDAARD;
  const naarKop = (b.naarKop ?? "").trim() || NAAR_STANDAARD;

  return (
    <div className="vn-blok">
      {(edit || b.titel) && (
        <h4 className="vn-titel">
          <V v={b.titel ?? ""} on={(x) => zet((m) => void (m.titel = x))} edit={edit} ph="Titel van de van-naar-plaat (optioneel)" />
        </h4>
      )}

      {edit && (
        <div className="vn-koppen">
          <label className="vn-kop-veld">
            <span className="vn-l">Label van-kaart</span>
            <V v={b.vanKop ?? ""} on={(x) => zet((m) => void (m.vanKop = x))} edit ph={VAN_STANDAARD} />
          </label>
          <label className="vn-kop-veld">
            <span className="vn-l">Label naar-kaart</span>
            <V v={b.naarKop ?? ""} on={(x) => zet((m) => void (m.naarKop = x))} edit ph={NAAR_STANDAARD} />
          </label>
        </div>
      )}

      <div className="vn-rijen">
        {b.rijen.map((r, i) => (
          <div key={i} className="vn-rij">
            <div className="vn-onderwerp">
              <V v={r.onderwerp} on={(x) => zet((m) => void (m.rijen[i].onderwerp = x))} edit={edit} block cls="vn-onderwerp-t" ph="Onderwerp" />
              {edit && <WegKnop titel="Rij verwijderen" on={() => zet((m) => void m.rijen.splice(i, 1))} />}
            </div>
            <div className="vn-kaart vn-van">
              <span className="vn-l">{vanKop}</span>
              <V v={r.van} on={(x) => zet((m) => void (m.rijen[i].van = x))} edit={edit} ml block cls="vn-tekst" ph="Zo is het nu / bij de ander" />
            </div>
            <div className="vn-pijl" aria-hidden="true">
              <Pijl />
            </div>
            <div className="vn-kaart vn-naar">
              <span className="vn-l">{naarKop}</span>
              <V v={r.naar} on={(x) => zet((m) => void (m.rijen[i].naar = x))} edit={edit} ml block cls="vn-tekst" ph="Zo wordt het / zo komt het in het DIN" />
            </div>
            {(edit || r.bron) && (
              <div className="vn-bron">
                {!edit && <span className="vn-bron-l">Bron</span>}
                <V v={r.bron ?? ""} on={(x) => zet((m) => void (m.rijen[i].bron = x))} edit={edit} ph="Bron (optioneel)" />
              </div>
            )}
          </div>
        ))}
        {edit && (
          <div className="vn-plus">
            <PlusKnop label="+ rij" on={() => zet(voegRijToe)} />
          </div>
        )}
      </div>

      {(edit || b.legenda) && (
        <div className="ok-legend vn-legenda">
          <V v={b.legenda ?? ""} on={(x) => zet((m) => void (m.legenda = x))} edit={edit} ml ph="Legenda (optioneel)" />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink2, --ink3). Raster per rij: onderwerp · van · pijl · naar;
// de bron staat eronder over de kaarten heen.
export const VANNAAR_CSS = `
.okd .vn-blok{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px 12px}
.okd .vn-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 12px}
.okd .vn-koppen{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:12px}
.okd .vn-kop-veld{display:flex;flex-direction:column;gap:2px}
.okd .vn-rijen{display:flex;flex-direction:column;gap:10px}
.okd .vn-rij{display:grid;grid-template-columns:150px minmax(0,1fr) 34px minmax(0,1fr);grid-template-areas:"o van p naar" ". bron bron bron";column-gap:10px;row-gap:4px;align-items:stretch;padding-top:10px;border-top:1px dashed #dde3ea}
.okd .vn-rij:first-child{padding-top:0;border-top:0}
.okd .vn-onderwerp{grid-area:o;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding-top:9px}
.okd .vn-onderwerp-t{font-size:12.5px;font-weight:700;line-height:1.35;color:var(--ink)}
.okd .vn-kaart{display:flex;flex-direction:column;gap:3px;border-radius:10px;padding:8px 12px 9px;min-width:0}
.okd .vn-van{grid-area:van;background:#f3f5f8;border:1px solid #e2e8f0;color:var(--ink2)}
.okd .vn-naar{grid-area:naar;background:#eef4fb;border:1px solid #cfe0f4;border-left:5px solid var(--cito);color:var(--ink)}
.okd .vn-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;line-height:1.4;color:var(--ink3)}
.okd .vn-naar .vn-l{color:var(--cito)}
.okd .vn-tekst{font-size:12px;line-height:1.5;white-space:pre-line}
.okd .vn-naar .vn-tekst{font-weight:500}
.okd .vn-pijl{grid-area:p;display:flex;align-items:center;justify-content:center;color:var(--cito)}
.okd .vn-pijl-svg{width:28px;height:20px}
.okd .vn-bron{grid-area:bron;display:flex;align-items:baseline;gap:5px;font-size:10.5px;line-height:1.4;color:var(--ink3);padding:0 2px}
.okd .vn-bron-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.okd .vn-rij .ok-in{font-size:12px;font-weight:400}
.okd .vn-rij textarea.ok-in{field-sizing:content;min-height:3em}
.okd .vn-plus{padding-top:6px}
.okd .vn-legenda{margin-top:10px}
@media(max-width:700px){
.okd .vn-rij{grid-template-columns:minmax(0,1fr);grid-template-areas:"o" "van" "p" "naar" "bron";row-gap:6px}
.okd .vn-onderwerp{padding-top:0}
.okd .vn-pijl{padding:0}
.okd .vn-pijl-svg{transform:rotate(90deg)}
}
`;
