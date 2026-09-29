// Gedeelde stijl voor handmatig aanpasbare pagina's in de app.
// OK_CSS  — de beeldtaal van het organigram (stap 10): .ok-palet, kaarten, tabellen,
//           bewerkvelden (.ok-in) en knopjes (.ok-knopje). Ongewijzigd overgenomen uit
//           OrganigramStep; wijzigingen hier raken het organigram.
// DOC_CSS — aanvullende stijl voor het generieke bewerkbare document (.okd, stap 11).
// KNOP    — Tailwind-klassen voor de knoppen in de bewerkbalk.

export const OK_CSS = `
.ok{--cito:#003366;--verm:#0891b2;--ink:#111827;--ink2:#5b6573;--ink3:#9aa3b0;--line:#e7ebf0;--line2:#dde3ea;--amber:#b45309;font-size:13px;color:var(--ink);line-height:1.5}
.ok .ok-top{background:linear-gradient(135deg,#002a52,#004a88);color:#fff;border-radius:14px;padding:16px 20px}
.ok .ok-eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:#9db9d6;font-weight:700}
.ok .ok-top h2{font-size:20px;font-weight:700;margin-top:4px;letter-spacing:-.01em}
.ok .ok-top p{color:#cdddf0;font-size:12px;margin-top:5px;font-style:italic}
.ok .ok-begrip{margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 13px;font-size:11px;color:var(--ink2);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ok .ok-begrip.edit{flex-direction:column;align-items:stretch}
.ok .ok-bl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}
.ok .ok-eq{background:#f1f5f9;border:1px solid var(--line2);border-radius:6px;padding:2px 8px}
.ok .ok-eq b{color:var(--ink)}
.ok .ok-sec{margin-top:22px}
.ok .ok-kop{font-size:16px;font-weight:700;letter-spacing:-.01em}
.ok .ok-sub{font-size:11.5px;color:var(--ink3);margin:2px 0 10px}
.ok .ok-org{background:linear-gradient(180deg,#f2f6fb,#fff);border:1px solid rgba(0,51,102,.18);border-radius:16px;padding:16px 18px}
.ok .ok-sponsor{margin:0 auto 4px;max-width:360px;text-align:center;border:1.5px dashed rgba(0,51,102,.35);border-radius:9px;padding:5px 10px;background:#fff;font-size:10px;color:var(--ink2)}
.ok .ok-vline{width:2px;height:14px;background:rgba(0,51,102,.4);margin:0 auto}
.ok .ok-grid{display:grid;grid-template-columns:3fr 6fr 3fr;gap:14px;align-items:start}
.ok .ok-col{display:flex;flex-direction:column;align-items:center}
.ok .ok-group{width:100%;border:2px solid #cbd5e1;border-radius:9px;background:#f8fafc;padding:8px}
.ok .ok-gt{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#475569;text-align:center;margin-bottom:6px}
.ok .ok-gt small{font-weight:600;text-transform:none;letter-spacing:0;color:var(--ink3)}
.ok .ok-ritme > div{font-size:10.5px;color:var(--ink2);padding:4px 0;border-bottom:1px solid var(--line)}
.ok .ok-ritme > div:last-child{border-bottom:0}
.ok .ok-ritme b{color:var(--ink)}
.ok .ok-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:var(--cito);text-align:center;margin-bottom:4px}
.ok .ok-box{border:2px solid var(--line2);border-radius:8px;padding:7px 10px;background:#fff;width:100%}
.ok .ok-box .r{font-size:11.5px;font-weight:700;line-height:1.3}
.ok .ok-box .n{font-size:10px;opacity:.85;margin-top:2px;line-height:1.4}
.ok .ok-box .s{font-size:9px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-top:2px}
.ok .ok-prim{background:var(--cito);border-color:var(--cito);color:#fff}
.ok .ok-prim .n,.ok .ok-prim .s{color:#dbe7f5;opacity:1}
.ok .ok-arch{background:#0e7490;border-color:#0e7490}
.ok .ok-side{background:#f8fafc;border-color:#cbd5e1;color:#334155}
.ok .ok-dom{background:#fffbeb;border-color:#fcd34d;color:#78350f}
.ok .ok-open{border-style:dashed;background:#fff;color:var(--ink2)}
.ok .ok-ws{background:#f8f5ff;border-color:#c4b5fd;color:#3b1d78}
.ok .ok-ws .n{color:#4c1d95;opacity:1}.ok .ok-ws .s{color:#6d28d9;opacity:1}
.ok .ok-maxw{width:100%;max-width:340px}
.ok .ok-pm{width:100%;border:2.5px solid var(--cito);border-radius:10px;background:#fff;padding:8px 9px}
.ok .ok-pm .ok-gt{color:var(--cito)}
.ok .ok-duo{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ok .ok-ps{font-size:9.5px;color:var(--ink2);text-align:center;margin-top:6px;line-height:1.4}
.ok .ok-wsg{border-color:#c4b5fd;background:#fbfaff}.ok .ok-wsg .ok-gt{color:#5b21b6}
.ok .ok-ring{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ok .ok-dom4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;width:100%}
.ok .ok-oper{margin-top:8px;width:100%;text-align:center;font-size:10.5px;color:var(--ink2);background:#f1f5f9;border:1px solid var(--line2);border-radius:8px;padding:6px 10px}
.ok .ok-stack{display:flex;flex-direction:column;gap:6px}
.ok .ok-hier{margin-top:12px;background:#e6f6fa;border:1px solid #b7e3ec;border-radius:11px;padding:9px 13px;font-size:12px;color:#0c5460;line-height:1.55}
.ok .ok-hier b{color:#083b44}
.ok .ok-scroll{overflow-x:auto}
.ok table.ok-t{width:100%;border-collapse:separate;border-spacing:0;font-size:10.5px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ok .ok-t th{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);padding:7px 8px;background:#f8fafc;border-bottom:1px solid var(--line);text-align:left;vertical-align:bottom;min-width:110px}
.ok .ok-t td{padding:7px 8px;border-bottom:1px solid var(--line);color:var(--ink2);vertical-align:top;line-height:1.4;min-width:110px}
.ok .ok-t tr:last-child td{border-bottom:0}
.ok .ok-t td.k{font-weight:700;color:var(--ink);min-width:130px}
.ok .ok-t td.x,.ok .ok-t th.x{min-width:0;width:28px;padding:4px}
.ok .ok-legend{font-size:10px;color:var(--ink3);margin-top:6px;line-height:1.45}
.ok .ok-ras{display:inline-block;min-width:18px;text-align:center;font-size:9.5px;font-weight:800;border-radius:4px;padding:1px 5px;border:1px solid;margin-right:3px}
.ok .ok-ras-R{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
.ok .ok-ras-A{background:#fef3c7;color:#78350f;border-color:#f59e0b;font-weight:900}
.ok .ok-ras-S{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
.ok .ok-ras-C{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
.ok .ok-ras-I{background:#f3f4f6;color:#4b5563;border-color:#d1d5db}
.ok .ok-ras-V{background:#ecfeff;color:#155e75;border-color:#a5f3fc}
.ok .ok-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ok .ok-card{background:#fff;border:1px solid var(--line);border-top:5px solid #c4b5fd;border-radius:14px;padding:12px 14px}
.ok .ok-card h3{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.ok .ok-card dl{display:grid;grid-template-columns:120px 1fr;gap:4px 8px;font-size:10.5px;margin:0}
.ok .ok-card dt{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);padding-top:2px}
.ok .ok-card dd{color:var(--ink2);line-height:1.45;margin:0}
.ok .ok-card dd b{color:var(--ink)}
.ok .ok-two{display:grid;grid-template-columns:1.2fr 1fr;gap:12px}
.ok .ok-kaart{background:#fff;border:1px solid var(--line);border-left:6px solid var(--cito);border-radius:14px;padding:12px 15px}
.ok .ok-kaart h3{font-size:12.5px;font-weight:700;margin-bottom:6px}
.ok .ok-kaart ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.ok .ok-kaart li{font-size:11px;color:var(--ink2);line-height:1.45;padding-left:14px;position:relative}
.ok .ok-kaart li::before{content:"·";position:absolute;left:3px;font-weight:800;color:var(--ink3)}
.ok .ok-kaart li b{color:var(--ink)}
.ok .ok-advies{border-left-color:var(--verm)}
.ok .ok-openk{border-left-color:var(--amber)}
.ok .ok-openk li::before{content:"❓";font-size:9px;left:-1px;top:1px}
.ok .ok-foot{margin-top:18px;text-align:center;font-size:10.5px;color:var(--ink3);line-height:1.6}
.ok .ok-in{font:inherit;font-size:inherit;color:var(--ink);background:#fffbeb;border:1px solid #f59e0b;border-radius:5px;padding:2px 5px;width:100%;box-sizing:border-box;line-height:1.4;resize:vertical;display:block}
.ok .ok-prim .ok-in,.ok .ok-arch .ok-in{background:#fff;color:var(--ink)}
.ok .ok-knopje{font-size:10px;font-weight:700;border:1px solid #cbd5e1;background:#fff;border-radius:5px;padding:1px 7px;color:#334155;cursor:pointer;line-height:1.6;white-space:nowrap}
.ok .ok-knopje:hover{background:#f1f5f9}
.ok .ok-knopje.rood{color:#b91c1c;border-color:#fecaca}
.ok .ok-rij{display:flex;gap:6px;align-items:flex-start;width:100%}
.ok .ok-rij > .ok-in{flex:1}
.ok .ok-lijst-edit{display:flex;flex-direction:column;gap:6px;width:100%}
.ok .ok-lijst-edit li{padding-left:0}
.ok .ok-lijst-edit li::before{content:none}
@media(max-width:820px){.ok .ok-grid,.ok .ok-cards,.ok .ok-two,.ok .ok-duo,.ok .ok-ring{grid-template-columns:1fr}.ok .ok-dom4{grid-template-columns:1fr 1fr}}
`;

// Generiek document: altijd samen met OK_CSS gebruiken (wrapper-klassen "ok okd").
// Brede tabellen en lagen scrollen binnen hun eigen container (.ok-scroll); de
// pagina zelf krijgt nooit een horizontale scrollbalk.
export const DOC_CSS = `
.okd{overflow-wrap:anywhere}
.okd .okd-top h2{margin-top:6px}
.okd .okd-top .ok-in{font-style:normal}
.okd .okd-status{display:inline-block;max-width:100%;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;line-height:1.5;color:#dbe7f5;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:2px 10px}
.okd .okd-status-edit{max-width:560px}
.okd .okd-toc{margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 13px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.okd .okd-toc a{display:inline-block;max-width:min(100%,340px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.6;color:var(--ink2);text-decoration:none;background:#f1f5f9;border:1px solid var(--line2);border-radius:999px;padding:1px 10px}
.okd .okd-toc a:hover,.okd .okd-toc a:focus-visible{color:var(--cito);background:#e8f0f8;border-color:rgba(0,51,102,.35)}
.okd .okd-sec{margin-top:26px;scroll-margin-top:16px}
.okd .okd-sec + .okd-sec{border-top:1px solid var(--line2);padding-top:22px}
.okd .okd-kop{display:flex;gap:8px;align-items:flex-start}
.okd .okd-kop > .ok-kop{flex:1;min-width:0}
.okd .ok-sub{font-size:12px;color:var(--ink2);max-width:860px;margin:2px 0 0}
.okd div.ok-sub{white-space:pre-line}
.okd .okd-blokken{display:flex;flex-direction:column;gap:12px;margin-top:10px}
.okd .okd-p{font-size:12.5px;line-height:1.6;color:var(--ink2);max-width:860px;white-space:pre-line}
.okd .okd-bt{font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px}
.okd .ok-kaart h4{font-size:12.5px;font-weight:700;margin-bottom:6px}
.okd .ok-kaart li{font-size:12px;line-height:1.5;white-space:pre-line}
.okd .okd-call{border:1px solid;border-radius:12px;padding:10px 14px;font-size:12px;line-height:1.55}
.okd .okd-call-t{display:block;font-weight:700;margin-bottom:2px}
.okd .okd-call-tekst{white-space:pre-line}
.okd .okd-call-info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a5f}
.okd .okd-call-info .okd-call-t{color:#1e40af}
.okd .okd-call-let-op{background:#fffbeb;border-color:#fcd34d;color:#78350f}
.okd .okd-call-let-op .okd-call-t{color:#92400e}
.okd .okd-call-besluit{background:#f2f6fb;border:1.5px solid var(--cito);border-left-width:6px;color:var(--ink)}
.okd .okd-call-besluit .okd-call-t{color:var(--cito)}
.okd .okd-call-edit{display:flex;flex-direction:column;gap:6px}
.okd table.okd-t{font-size:11.5px}
.okd .okd-t td{min-width:120px;white-space:pre-line}
.okd .okd-t td.k{min-width:140px}
.okd .okd-t td.c,.okd .okd-t th.c{min-width:0;white-space:nowrap}
.okd .okd-t th .ok-in,.okd .ok-card dt .ok-in,.okd .okd-laag-kop .ok-in{font-size:11px;font-weight:600;text-transform:none;letter-spacing:0}
.okd .okd-chip{display:inline-block;font-size:10px;font-weight:700;line-height:1.5;border:1px solid;border-radius:999px;padding:1px 9px;white-space:nowrap}
.okd .okd-chip-groen{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
.okd .okd-chip-blauw{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
.okd .okd-chip-amber{background:#fffbeb;color:#92400e;border-color:#fcd34d}
.okd .okd-chip-grijs{background:#f3f4f6;color:#4b5563;border-color:#d1d5db}
.okd .okd-kaarten{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.okd .okd-kaarten .ok-card{border-top-color:var(--cito)}
.okd .ok-card h4{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.okd .okd-kaart-sub{font-size:10.5px;line-height:1.4;color:var(--ink3);margin:-3px 0 8px}
.okd .ok-card dl{font-size:11px}
.okd .ok-card dd{white-space:pre-line}
.okd .okd-onder{margin-top:8px}
.okd .okd-lagen{display:flex;flex-direction:column;gap:5px}
.okd .okd-laag{display:grid;gap:4px}
.okd .okd-laag-kop > div{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);padding:0 10px}
.okd .okd-laag-naam{display:flex;flex-direction:column;justify-content:center;gap:5px;border-radius:10px 3px 3px 10px;padding:9px 12px;color:#fff;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}
.okd .okd-laag-naam .ok-in{text-transform:none;letter-spacing:0;font-weight:600}
.okd .okd-laag-naam .ok-knopje{align-self:flex-start}
.okd .okd-laag-cel{border:1px solid;border-radius:3px;padding:8px 10px;font-size:11.5px;line-height:1.45;color:var(--ink2);white-space:pre-line}
.okd .okd-laag-cel:last-child{border-radius:3px 10px 10px 3px}
.okd .ok-keuze,.okd .ok-rij > .ok-keuze{width:auto;flex:none;cursor:pointer}
.okd .okd-vraag{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:#7f1d1d;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:3px 9px}
.okd .okd-vraag button{font-weight:700;text-decoration:underline;cursor:pointer}
.okd .okd-plus{display:block;width:100%;margin-top:22px;border:1.5px dashed #cbd5e1;border-radius:12px;background:rgba(255,255,255,.6);padding:10px;font-size:12px;font-weight:700;color:#334155;cursor:pointer}
.okd .okd-plus:hover{background:#fff;border-color:var(--cito);color:var(--cito)}
@media(max-width:820px){.okd .okd-kaarten{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.okd .ok-card dl{grid-template-columns:minmax(0,1fr)}.okd .ok-card dd{margin-bottom:4px}}
`;

/** Basisklassen voor de knoppen in de bewerkbalk (Bewerken, Opslaan, …). */
export const KNOP = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";
