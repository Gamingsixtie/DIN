// Weergave van een tabel als actiebord, o.a. "Wat Cito zelf moet doen" (stap 11): één kaart
// per waarde in de groepkolom (per werkstroom, plus "Programmabreed"), in de beeldtaal van de
// werkstroomkaarten: dezelfde gekleurde band bovenaan (één streep per domein), de naam van de
// werkstroom als link naar zijn kaart (#wk-<id>) en de leads eronder. Per actie een nummer en
// een vakje voor de invulkolom ("Wie"): leeg = open, gestippeld vakje; ingevuld = naam met
// initiaal. Bovenaan een teller "Wie ingevuld: x van y", zodat in de sessie zichtbaar is wat nog
// open staat. Alleen weergave: bewerken gebeurt in de gewone tabel (TabelBlok, bewerkmodus).
// Een groep met veel acties loopt over de volle breedte, met de acties in twee kolommen.

import type { CSSProperties } from "react";
import { metBronlinks } from "@/components/bewerkbaar/bron-context";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan } from "@/components/bewerkbaar/blok-typen";
import { useBlok } from "@/components/bewerkbaar/doc-context";
import { Leads } from "@/components/bewerkbaar/leads";

type Tabel = BlokVan<"tabel">;

const CITO = "#003366";
const NEUTRAAL = "#64748b";
/** Vanaf dit aantal acties loopt een groep over de volle breedte, met twee kolommen. */
const BREED_VANAF = 5;

interface Werkstroom {
  id: string;
  naam: string;
  bijnaam: string;
  domeinen: string[];
  leads: string;
}

interface Groep {
  naam: string;
  rijen: string[][];
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Rijen gegroepeerd op kolom k, in de volgorde waarin de groepen voor het eerst voorkomen. */
function groepeer(rijen: string[][], k: number): Groep[] {
  const uit: Groep[] = [];
  for (const rij of rijen) {
    const naam = (rij[k] ?? "").trim() || "Overig";
    let g = uit.find((x) => norm(x.naam) === norm(naam));
    if (!g) uit.push((g = { naam, rijen: [] }));
    g.rijen.push(rij);
  }
  return uit;
}

/** Kleuren van de band: één per domein van de werkstroom; programmabreed Cito-blauw. */
function bandKleuren(ws: Werkstroom | null, naam: string): string[] {
  if (ws) {
    const k = ws.domeinen.map((id) => domein(id)?.kleur).filter((x): x is string => !!x);
    if (k.length > 0) return k;
  }
  return [/programma/i.test(naam) ? CITO : NEUTRAAL];
}

/** Accent (nummers, ingevulde namen): het eerste domein; alle vier domeinen of programmabreed: Cito-blauw. */
function accentKleur(ws: Werkstroom | null, naam: string): string {
  if (ws && DOMEINEN.every((d) => ws.domeinen.includes(d.id))) return CITO;
  return bandKleuren(ws, naam)[0];
}

function initiaal(naam: string): string {
  const m = naam.trim().match(/\p{L}/u);
  return m ? m[0].toUpperCase() : "?";
}

function PersoonIcoon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <circle cx="8" cy="5.2" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.8 14c.5-2.9 2.6-4.4 5.2-4.4s4.7 1.5 5.2 4.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function WieVak({ wie, kop }: { wie: string; kop: string }) {
  if (wie) {
    return (
      <span className="ab-wie is-gevuld" title={`${kop}: ${wie}`}>
        <span className="ab-av" aria-hidden="true">
          {initiaal(wie)}
        </span>
        {wie}
      </span>
    );
  }
  return (
    <span className="ab-wie" title={`${kop}: nog samen in te vullen`} aria-label={`${kop}: nog in te vullen`}>
      <PersoonIcoon />
      {kop.toLowerCase()}?
    </span>
  );
}

export default function Actiebord({ b }: { b: Tabel }) {
  const werkstromen = useBlok("werkstromen");
  const g = b.groepKolom ?? 0;
  const inv = b.invulKolom !== undefined && b.invulKolom >= 0 && b.invulKolom < b.kolommen.length ? b.invulKolom : null;
  // de overige kolommen vormen de tekst van een actie (de eerste vet als er meer zijn)
  const tekstKolommen = b.kolommen.map((_, c) => c).filter((c) => c !== g && c !== inv);
  const kaarten: Werkstroom[] = (werkstromen?.kaarten ?? []).map((k) => ({
    id: k.id,
    naam: k.naam,
    bijnaam: k.bijnaam ?? "",
    domeinen: k.domeinen,
    leads: k.leads ?? "",
  }));
  const zoek = (naam: string) =>
    kaarten.find((k) => norm(k.naam) === norm(naam) || (k.bijnaam && norm(k.bijnaam) === norm(naam))) ?? null;

  const rijen = b.rijen.filter((r) => r.some((c) => c.trim() !== ""));
  const groepen = groepeer(rijen, g);
  const invulKop = inv !== null ? b.kolommen[inv].trim() || "Wie" : "";
  const ingevuld = inv !== null ? rijen.filter((r) => (r[inv] ?? "").trim() !== "").length : 0;
  const pct = rijen.length > 0 ? Math.round((ingevuld / rijen.length) * 100) : 0;

  if (rijen.length === 0) return null;

  return (
    <div className="ab">
      <div className="ab-samen">
        <span className="ab-tal">
          <b>{rijen.length}</b> {rijen.length === 1 ? "actie" : "acties"}
          <span className="ab-sep" aria-hidden="true">
            ·
          </span>
          <b>{groepen.length}</b> {groepen.length === 1 ? "groep" : "groepen"}
        </span>
        {inv !== null && (
          <span className="ab-invul">
            <span className="ab-invul-t">{invulKop} ingevuld</span>
            <span className="ab-meter" role="progressbar" aria-valuemin={0} aria-valuemax={rijen.length} aria-valuenow={ingevuld} aria-label={`${invulKop} ingevuld`}>
              <span style={{ width: pct + "%" }} />
            </span>
            <b>
              {ingevuld} van {rijen.length}
            </b>
          </span>
        )}
      </div>
      <div className="ab-raster">
        {groepen.map((gr) => {
          const ws = zoek(gr.naam);
          const band = bandKleuren(ws, gr.naam);
          const accent = accentKleur(ws, gr.naam);
          const breed = gr.rijen.length >= BREED_VANAF;
          const open = inv !== null ? gr.rijen.filter((r) => (r[inv] ?? "").trim() === "").length : 0;
          const helft = Math.ceil(gr.rijen.length / 2);
          return (
            <section
              key={gr.naam}
              className={"ab-groep" + (breed ? " ab-breed" : "")}
              style={{ "--ab-k": accent, "--ab-rijen": helft } as CSSProperties}
            >
              <div className="ab-band" aria-hidden="true">
                {band.map((k, i) => (
                  <span key={i} style={{ background: k }} />
                ))}
              </div>
              <header className="ab-gkop">
                <div className="ab-gkop-t">
                  <h5 className="ab-naam">
                    {ws ? (
                      <a href={"#wk-" + ws.id} title="Naar de werkstroomkaart">
                        {gr.naam}
                      </a>
                    ) : (
                      gr.naam
                    )}
                  </h5>
                  {ws?.leads && <Leads tekst={ws.leads} cls="ab-leads" />}
                </div>
                <span className={"ab-telling" + (inv !== null && open === 0 ? " is-rond" : "")}>
                  {inv !== null && open === 0
                    ? "alles verdeeld"
                    : `${gr.rijen.length} ${gr.rijen.length === 1 ? "actie" : "acties"}`}
                </span>
              </header>
              <ol className="ab-lijst">
                {gr.rijen.map((rij, i) => (
                  <li key={i} className={"ab-actie" + (breed && i === helft ? " ab-kolomstart" : "")}>
                    <span className="ab-nr" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="ab-t">
                      {tekstKolommen.map((c, j) => {
                        const v = (rij[c] ?? "").trim();
                        if (!v) return null;
                        return j === 0 ? (
                          <span key={c} className="ab-t1">
                            {metBronlinks(v)}
                          </span>
                        ) : (
                          <span key={c} className="ab-t2">
                            {metBronlinks(v)}
                          </span>
                        );
                      })}
                    </span>
                    {inv !== null && <WieVak wie={(rij[inv] ?? "").trim()} kop={invulKop} />}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export const ACTIEBORD_CSS = `
.okd .ab{display:flex;flex-direction:column;gap:12px}
.okd .ab-samen{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px 14px;font-size:12px;color:#475569}
.okd .ab-tal b{font-size:15px;font-weight:800;color:${CITO};font-variant-numeric:tabular-nums}
.okd .ab-sep{margin:0 8px;color:#cbd5e1}
.okd .ab-invul{display:inline-flex;align-items:center;gap:10px}
.okd .ab-invul-t{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.okd .ab-invul b{font-size:12px;font-weight:800;color:${CITO};font-variant-numeric:tabular-nums;white-space:nowrap}
.okd .ab-meter{position:relative;display:block;width:120px;height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden}
.okd .ab-meter > span{position:absolute;inset:0 auto 0 0;border-radius:999px;background:${CITO};transition:width .3s ease}
.okd .ab-raster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.okd .ab-groep{--ab-k:${NEUTRAAL};position:relative;min-width:0;overflow:hidden;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 16px 12px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 14px -8px rgba(15,23,42,.14)}
.okd .ab-breed{grid-column:1 / -1}
.okd .ab-band{position:absolute;top:0;left:0;right:0;height:5px;display:flex;gap:2px}
.okd .ab-band > span{flex:1 1 0}
.okd .ab-gkop{display:flex;align-items:flex-start;justify-content:space-between;gap:6px 12px;margin-bottom:8px}
.okd .ab-gkop-t{min-width:0}
.okd .ab-naam{margin:0;font-size:15px;font-weight:800;line-height:1.25;letter-spacing:-.01em;color:${CITO}}
.okd .ab-naam a{color:inherit;text-decoration:none;border-bottom:1px dotted rgba(0,51,102,.35)}
.okd .ab-naam a:hover,.okd .ab-naam a:focus-visible{border-bottom-style:solid;outline:none}
.okd .ab-leads{margin-top:2px;font-size:11px;color:#64748b}
.okd .ab-telling{flex:none;font-size:10px;font-weight:700;line-height:1.5;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:1px 9px;white-space:nowrap;font-variant-numeric:tabular-nums}
.okd .ab-telling.is-rond{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
.okd .ab-lijst{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);column-gap:22px}
.okd .ab-breed .ab-lijst{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(var(--ab-rijen),auto);grid-auto-flow:column}
.okd .ab-actie{display:grid;grid-template-columns:20px minmax(0,1fr) auto;column-gap:10px;row-gap:5px;align-items:start;padding:8px 6px;margin:0 -6px;border-top:1px solid #f1f5f9;border-radius:8px;transition:background-color .15s ease}
.okd .ab-actie:hover{background:#f8fafc}
.okd .ab-lijst > .ab-actie:first-child,.okd .ab-breed .ab-actie.ab-kolomstart{border-top-color:transparent}
.okd .ab-nr{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-top:1px;border-radius:999px;border:1.5px solid var(--ab-k);color:var(--ab-k);font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums;background:#fff}
.okd .ab-t{min-width:0;display:flex;flex-direction:column;gap:2px;font-size:12.5px;line-height:1.45;color:#1f2937}
.okd .ab-t2{font-size:11px;color:#64748b}
.okd .ab-wie{display:inline-flex;align-items:center;gap:5px;max-width:45%;font-size:11px;font-weight:600;line-height:1.4;color:#5f6b7a;background:#fff;border:1.5px dashed #cbd5e1;border-radius:999px;padding:1px 10px 1px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.okd .ab-wie.is-gevuld{color:#0f172a;border-style:solid;border-width:1px;border-color:color-mix(in srgb,var(--ab-k) 35%,#fff);background:color-mix(in srgb,var(--ab-k) 8%,#fff);padding-left:3px}
.okd .ab-av{flex:none;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:999px;background:var(--ab-k);color:#fff;font-size:9.5px;font-weight:800}
@media (max-width:760px){
  .okd .ab-raster{grid-template-columns:minmax(0,1fr)}
  .okd .ab-breed .ab-lijst{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-auto-flow:row}
  .okd .ab-breed .ab-actie.ab-kolomstart{border-top-color:#f1f5f9}
}
@media (max-width:480px){
  .okd .ab-actie{grid-template-columns:20px minmax(0,1fr)}
  .okd .ab-wie{grid-column:2;justify-self:start;max-width:100%}
  .okd .ab-invul{flex-wrap:wrap}
}
@media print{.okd .ab-groep{box-shadow:none;break-inside:avoid}}
`;
