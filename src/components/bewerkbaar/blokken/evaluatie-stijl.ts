// Stijl van het evaluatiebord: zes inklapbare kaarten (details/summary), één per kader, in de
// beeldtaal van het actiebord (Actiebord.tsx: samenvattingsstrook, witte kaart met band bovenaan)
// en met dezelfde keuzelijst als het voortgangsbord (vb-vk, zie voortgangKeuzeCss). Alleen CSS,
// onder de .okd-scope. De kleur van de band en het oordeel-pilletje volgen data-oordeel op
// details.ev-kader ("" | goed | deels | onvoldoende | nvt). Het kopje "Eerste beeld · voorstel"
// in .ev-beeldvak komt uit CSS (::before); de markup bevat alleen de zin zelf.

const CITO = "#003366";
/** Zelfde pijltje als in voortgangKeuzeCss (TijdlijnBlok.tsx). */
const PIJL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%235f6b7a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const EVALUATIE_CSS = `
.okd .ev{display:flex;flex-direction:column;gap:12px}
.okd .ev-samen{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px 14px;font-size:12px;color:var(--ink2,#4a5565)}
.okd .ev-tal b{font-size:15px;font-weight:800;color:${CITO};font-variant-numeric:tabular-nums}
.okd .ev-sep{margin:0 8px;color:#cbd5e1}
.okd .ev-invul{display:inline-flex;align-items:center;gap:10px}
.okd .ev-invul-t{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#5f6b7a)}
.okd .ev-invul b{font-size:12px;font-weight:800;color:${CITO};font-variant-numeric:tabular-nums;white-space:nowrap}
.okd .ev-meter{position:relative;display:block;width:120px;height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden}
.okd .ev-meter > span{position:absolute;inset:0 auto 0 0;border-radius:999px;background:${CITO};transition:width .3s ease}
.okd .ev-lijst{display:flex;flex-direction:column;gap:10px}
.okd .ev-kader{--ev-k:#cbd5e1;position:relative;min-width:0;overflow:hidden;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 14px -8px rgba(15,23,42,.14)}
.okd .ev-kader[data-oordeel="goed"]{--ev-k:#059669}
.okd .ev-kader[data-oordeel="deels"]{--ev-k:#2563eb}
.okd .ev-kader[data-oordeel="onvoldoende"]{--ev-k:#d97706}
.okd .ev-kader[data-oordeel="nvt"]{--ev-k:#94a3b8}
.okd .ev-kop{display:grid;grid-template-columns:24px minmax(0,1fr) auto auto 16px;align-items:center;gap:8px 12px;padding:12px 16px 12px 14px;border-top:5px solid var(--ev-k);list-style:none;cursor:pointer;transition:background-color .15s ease}
.okd .ev-kop::-webkit-details-marker{display:none}
.okd .ev-kop::marker{content:""}
.okd .ev-kop:hover{background:#f8fafc}
.okd .ev-kop:focus-visible{outline:none;box-shadow:inset 0 0 0 2px rgba(0,51,102,.35)}
.okd .ev-nr{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:${CITO};color:#fff;font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums}
.okd .ev-kop-t{min-width:0}
.okd .ev-titel{margin:0;font-size:14px;font-weight:800;line-height:1.3;letter-spacing:-.01em;color:${CITO}}
.okd .ev-sub{margin:1px 0 0;font-size:11.5px;line-height:1.4;color:var(--ink2,#4a5565)}
.okd .ev-beeld,.okd .ev-beeld-grijs{display:inline-flex;align-items:center;font-size:10.5px;font-weight:800;line-height:1.5;text-transform:uppercase;letter-spacing:.05em;padding:1px 9px;border-radius:999px;border:1px solid #e2e8f0;background:#f1f5f9;color:var(--ink2,#4a5565);white-space:nowrap}
.okd .ev-beeld-ja{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
.okd .ev-beeld-deels{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
.okd .ev-beeld-nee{color:#92400e;background:#fffbeb;border-color:#fcd34d}
.okd .ev-oordeel{appearance:none;-webkit-appearance:none;pointer-events:auto;max-width:100%;margin:0;font:inherit;font-size:11.5px;font-weight:600;line-height:1.35;padding:2px 24px 2px 10px;border:1px dashed #cbd5e1;border-radius:999px;background:#fff ${PIJL} no-repeat right 8px center/9px 6px;color:var(--ink3,#5f6b7a);cursor:pointer}
.okd .ev-oordeel:hover{border-color:#94a3b8}
.okd .ev-oordeel:focus-visible{outline:2px solid rgba(0,51,102,.35);outline-offset:1px}
.okd .ev-oordeel-goed{border-style:solid;font-weight:700;background-color:#ecfdf5;border-color:#a7f3d0;color:#047857}
.okd .ev-oordeel-deels{border-style:solid;font-weight:700;background-color:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.okd .ev-oordeel-onvoldoende{border-style:solid;font-weight:700;background-color:#fffbeb;border-color:#fcd34d;color:#92400e}
.okd .ev-oordeel-nvt{border-style:solid;font-weight:700;background-color:#f1f5f9;border-color:#cbd5e1;color:var(--ink2,#4a5565)}
.okd .ev-chev{display:block;width:16px;height:16px;background:${PIJL} no-repeat center/12px 8px;transition:transform .2s ease}
.okd .ev-kader[open] > .ev-kop .ev-chev{transform:rotate(180deg)}
.okd .ev-body{display:flex;flex-direction:column;gap:12px;padding:14px 16px 16px;border-top:1px solid #f1f5f9}
.okd .ev-vraag{margin:0;font-size:13px;line-height:1.5;font-style:normal;color:var(--ink2,#4a5565)}
.okd .ev-beeldvak{font-size:12.5px;line-height:1.5;font-weight:700;color:#7c2d12;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:8px 12px}
.okd .ev-beeldvak::before{content:"Eerste beeld · voorstel";display:block;margin-bottom:3px;font-size:10px;font-weight:800;line-height:1.5;letter-spacing:.06em;text-transform:uppercase;color:#92400e}
.okd dl.ev-secties{display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px 14px;margin:0}
.okd dl.ev-secties dt{margin:0;padding-top:2px;font-size:10px;font-weight:800;line-height:1.5;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3,#5f6b7a)}
.okd dl.ev-secties dd{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink2,#4a5565)}
.okd dl.ev-secties dd b{font-weight:700;color:var(--ink,#111827)}
.okd .ev-oordeelvak{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}
.okd .ev-oordeelvak label{font-size:10px;font-weight:800;line-height:1.5;letter-spacing:.06em;text-transform:uppercase;color:${CITO}}
.okd .ev-notitie{display:block;width:100%;box-sizing:border-box;min-height:2.6em;margin:0;font:inherit;font-size:12.5px;line-height:1.5;letter-spacing:0;text-transform:none;color:var(--ink,#111827);background:#fff;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;resize:none;overflow:hidden;transition:border-color .12s,box-shadow .12s}
.okd .ev-notitie::placeholder{color:var(--ink3,#5f6b7a);opacity:1;font-style:italic}
.okd .ev-notitie:hover{border-color:#94a3b8}
.okd .ev-notitie:focus{outline:none;border-style:solid;border-color:${CITO};box-shadow:0 0 0 3px rgba(0,51,102,.18)}
.okd .ev-hint{margin:0;font-size:11.5px;line-height:1.45;color:var(--ink3,#5f6b7a)}
.okd .ev-legenda{margin:0;font-size:12px;line-height:1.5;color:var(--ink2,#4a5565)}
@media (max-width:560px){
  .okd .ev-kop{grid-template-columns:24px auto minmax(0,1fr) 16px;grid-template-areas:"nr t t ch" ". b o .";gap:8px 10px;padding:10px 12px}
  .okd .ev-nr{grid-area:nr}
  .okd .ev-kop-t{grid-area:t}
  .okd .ev-beeld{grid-area:b}
  .okd .ev-oordeel{grid-area:o;justify-self:start}
  .okd .ev-chev{grid-area:ch}
  .okd .ev-body{padding:12px}
  .okd dl.ev-secties{grid-template-columns:minmax(0,1fr);row-gap:2px}
  .okd dl.ev-secties dd{margin-bottom:6px}
  .okd .ev-invul{flex-wrap:wrap}
}
@media print{
  .okd .ev-kader{box-shadow:none;break-inside:avoid}
  .okd .ev-kop{cursor:default}
  .okd .ev-chev{display:none}
}
`;
