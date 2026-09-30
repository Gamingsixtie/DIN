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
.ok .ok-in{font:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;letter-spacing:inherit;text-transform:inherit;line-height:inherit;color:inherit;background:transparent;border:1px dashed rgba(217,119,6,.65);border-radius:5px;padding:1px 5px;margin:-2px -6px;width:calc(100% + 12px);box-sizing:border-box;resize:vertical;display:block;transition:background .12s,border-color .12s}
.ok .ok-in:hover{background:rgba(245,158,11,.06)}
.ok .ok-in:focus{outline:none;border-style:solid;border-color:#d97706;background:rgba(245,158,11,.08);box-shadow:0 0 0 3px rgba(245,158,11,.18)}
.ok .ok-in::placeholder{color:currentColor;opacity:.45;font-style:italic}
.ok .ok-in.ok-groei{resize:none;overflow:hidden;min-height:1.9em;white-space:pre-wrap;overflow-wrap:anywhere}
.okd dt.okd-accent{color:#b45309}
.okd dd.okd-accent{font-weight:700;color:#7c2d12;background:#fffbeb;border-left:3px solid #f59e0b;padding-left:8px;border-radius:0 6px 6px 0}
.okd .okd-accent-vink{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#64748b;white-space:nowrap}
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
// Brede tabellen, lagen en de DIN-plaat (.okd-dp-*) scrollen binnen hun eigen
// container (.ok-scroll); de pagina zelf krijgt nooit een horizontale scrollbalk.
// DIN-plaat: de kleur van een domein (en van een werkstroom) komt binnen als
// CSS-variabele --dpk en kleurt rand, tint en titel. De regieband (.okd-dp-regie, licht
// blauw met een dunne rand, label in Cito-blauw en per persoon een rolchip) staat boven
// de scrollcontainer; de dunne Cito-blauwe beugel (.okd-dp-beugel) loopt langs alle
// niveaus van de plaat. Het doelvak blijft het donkere ankerpunt. KPI-regels (.okd-dp-kpi)
// klein en gedempt; de meetlat (.okd-dp-meetlat) als pastelchips.
// Bewerkmodus: knopjes per vak (.okd-dp-knoppen), domeinvinkjes per werkstroom
// (.okd-dp-vink), meetlat-chips als velden (.okd-dp-chip-edit) en in de chipkolom van
// een tabel een keuzemenu (.okd-chip-keuze).
export const DOC_CSS = `
.okd{overflow-wrap:anywhere}
.okd .okd-top h2{margin-top:6px}
.okd .okd-top .ok-in{font-style:normal}
.okd .okd-status{display:inline-block;max-width:100%;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;line-height:1.5;color:#dbe7f5;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:2px 10px}
.okd .okd-status-edit{max-width:560px}
.okd .okd-sec{margin-top:26px;scroll-margin-top:16px}
.okd .okd-sec + .okd-sec{border-top:1px solid var(--line2);padding-top:22px}
.okd .okd-kop{display:flex;gap:8px;align-items:flex-start}
.okd .okd-kop > .ok-kop{flex:1;min-width:0}
.okd .ok-sub{font-size:12px;color:var(--ink2);max-width:860px;margin:2px 0 0}
.okd div.ok-sub{white-space:pre-line}
.okd .okd-blokken{display:flex;flex-direction:column;gap:12px;margin-top:10px}
.okd .okd-p{font-size:12.5px;line-height:1.6;color:var(--ink2);max-width:860px;white-space:pre-line}
.okd .okd-toc{margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px 16px}
.okd .okd-toc-kop{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);margin:0 0 10px 2px}
.okd .okd-toc-lijst{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.okd .okd-toc-lijst a{display:flex;align-items:flex-start;gap:10px;height:100%;padding:10px 12px;border:1px solid #e3e9f1;border-radius:10px;background:#f8fafc;text-decoration:none;color:var(--ink);transition:border-color .15s,background .15s,transform .15s}
.okd .okd-toc-lijst a:hover,.okd .okd-toc-lijst a:focus-visible{border-color:rgba(0,51,102,.4);background:#eef4fb;transform:translateY(-1px)}
.okd .okd-toc-nr{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--cito);color:#fff;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}
.okd .okd-toc-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.okd .okd-toc-t b{font-size:13.5px;line-height:1.3;color:var(--cito)}
.okd .okd-toc-t span{font-size:12px;line-height:1.35;color:var(--ink2)}
@media (max-width:560px){.okd .okd-toc-lijst{grid-template-columns:1fr}}
.okd .okd-blokken .okd-bt,.okd .okd-blokken .kp-titel,.okd .okd-blokken .mx-titel,.okd .okd-blokken .st-titel,.okd .okd-blokken .sp-titel,.okd .okd-blokken .vn-titel,.okd .okd-blokken .mv-titel{font-size:16.5px;font-weight:800;line-height:1.3;letter-spacing:-.005em;color:var(--cito);border-left:4px solid var(--cito);padding-left:10px;margin:6px 0 12px}
.okd .okd-potlood{display:inline-flex;align-items:center;gap:5px;margin-left:auto;font-size:12px;font-weight:600;color:var(--cito);background:#fff;border:1px solid #c7d7ea;border-radius:999px;padding:3px 10px;cursor:pointer;opacity:.75;transition:opacity .15s,background .15s}
.okd .okd-potlood:hover,.okd .okd-potlood:focus-visible{opacity:1;background:#eef4fb}
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
.okd .okd-dp-paneel{margin:0;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px 12px}
.okd .okd-dp{--dpk:#64748b;display:grid;column-gap:8px;row-gap:4px;padding-bottom:2px}
.okd .okd-dp-rl{align-self:center;padding-right:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;line-height:1.35;color:var(--ink3)}
.okd .okd-dp-pijl{--pk:#003366;position:relative;display:flex;justify-content:center;align-items:center;min-height:34px;padding:4px 0}
.okd .okd-dp-pijl::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;transform:translateX(-50%);background:linear-gradient(to top,color-mix(in srgb,var(--pk) 15%,transparent),color-mix(in srgb,var(--pk) 55%,transparent));border-radius:2px}
.okd .okd-dp-pijl-pil{position:relative;display:inline-flex;align-items:center;gap:7px;padding:3px 12px 3px 4px;border-radius:999px;background:#fff;border:1px solid color-mix(in srgb,var(--pk) 35%,#fff);box-shadow:0 1px 2px rgba(15,23,42,.06);font-size:12px;font-weight:700;letter-spacing:.01em;color:color-mix(in srgb,var(--pk) 85%,#000);white-space:nowrap}
.okd .okd-dp-pijl-rond{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--pk);color:#fff}
.okd .okd-dp-t{font-size:11.5px;font-weight:700;line-height:1.35;color:var(--ink)}
.okd .okd-dp-tk{font-size:11px;line-height:1.45;color:var(--ink2);margin-top:2px}
.okd div.okd-dp-tk,.okd div.okd-dp-v,.okd div.okd-dp-leads{white-space:pre-line}
.okd .okd-dp-doel{background:var(--cito);border-radius:10px;padding:10px 14px}
.okd .okd-dp-doel div.okd-dp-t{font-size:13px;color:#fff}
.okd .okd-dp-doel div.okd-dp-tk{color:#dbe7f5}
.okd .okd-dp-baten{display:grid;gap:8px}
.okd .okd-dp-baat{display:grid;grid-template-rows:subgrid;grid-row:span 4;row-gap:4px;align-content:start;background:#f0f6fd;border:1px solid #cfe0f4;border-left:4px solid #0066cc;border-radius:8px;padding:8px 10px}
.okd .okd-dp-baat > .okd-dp-knoppen{grid-row:1;position:absolute;right:6px;top:6px;margin:0}
.okd .okd-dp-baat{position:relative}
.okd .okd-dp-baat > .okd-dp-rol{align-self:start}
@supports not (grid-template-rows: subgrid){.okd .okd-dp-baat{display:flex;flex-direction:column}}
.okd .okd-dp-verm{background:#ecf8fb;border:1.5px solid var(--verm);border-radius:10px;padding:9px 13px}
.okd .okd-dp-dom{background:color-mix(in srgb,var(--dpk) 7%,#fff);border:1.5px solid color-mix(in srgb,var(--dpk) 28%,#fff);border-top:5px solid var(--dpk);border-radius:10px;padding:9px 11px 11px;box-shadow:0 1px 3px rgba(15,23,42,.08)}
.okd .okd-dp-dom-t{font-size:13px;font-weight:800;line-height:1.3;color:color-mix(in srgb,var(--dpk) 80%,#000)}
.okd .okd-dp-r{display:block;margin-top:6px}
.okd .okd-dp-l{display:block;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;line-height:1.3;color:var(--ink3);margin-bottom:1px}
.okd .okd-dp-v{font-size:10.5px;line-height:1.45;color:var(--ink2)}
.okd .okd-dp-dom .okd-dp-v{font-size:11px;color:#334155}
.okd .okd-dp-wsrij{display:grid;grid-template-columns:repeat(var(--wsn,4),minmax(0,1fr));gap:10px;align-items:stretch}
.okd .okd-dp-ws{background:#fff;border:1.5px solid #cbd5e1;border-left:5px solid var(--dpk);border-radius:9px;padding:8px 11px 9px;display:flex;flex-direction:column;min-width:0}
.okd .okd-dp-wsdom{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 2px}
.okd .okd-dp-wsdom-chip{font-size:11px;font-weight:700;line-height:1.3;border-radius:999px;padding:2px 8px;color:color-mix(in srgb,var(--dpk) 80%,#000);background:color-mix(in srgb,var(--dpk) 12%,#fff);border:1px solid color-mix(in srgb,var(--dpk) 45%,#fff)}
.okd .okd-dp-wsdom-alle{color:#003366;background:#eef4fb;border:1px dashed #94a3b8}
.okd .okd-dp-ws .okd-dp-kpi:not(.okd-dp-kpi-edit) .okd-dp-kpi-l{display:none}
.okd .okd-dp-ws .okd-dp-kpi{margin-top:auto;padding-top:8px}
.okd .okd-dp-ws .okd-dp-kpi-chip{font-size:11px}
.okd .okd-dp-ws-heel{border-style:dashed;border-color:#94a3b8;border-left:5px solid var(--dpk)}
.okd .okd-dp-ws-t{font-size:12px;font-weight:700;line-height:1.35;color:var(--cito)}
.okd .okd-dp-ws-t a{color:inherit;text-decoration:none}
.okd .okd-dp-ws-t a:hover,.okd .okd-dp-ws-t a:focus-visible{text-decoration:underline}
.okd .okd-dp-leads{font-size:10.5px;line-height:1.4;color:var(--ink2);margin-top:1px}
.okd .okd-dp-velden{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));column-gap:14px}
.okd .okd-dp-voet{margin-top:8px}
.okd .okd-dp-icoon{flex:none;width:11px;height:11px}
.okd .okd-dp-rolrij{margin-top:auto;padding-top:7px}
.okd .okd-dp-rol{display:flex;align-items:flex-start;gap:5px;width:fit-content;max-width:100%;font-size:10.5px;line-height:1.35;color:#1e3a5f;background:#fff;border:1px solid rgba(0,51,102,.2);border-radius:8px;padding:3px 8px 3px 6px}
.okd .okd-dp-rol .okd-dp-icoon{margin-top:1px;color:var(--cito)}
.okd .okd-dp-rol b{color:var(--cito)}
.okd .okd-dp-doel .okd-dp-rol{color:#e6eef8;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.32)}
.okd .okd-dp-doel .okd-dp-rol b,.okd .okd-dp-doel .okd-dp-rol .okd-dp-icoon{color:#fff}
.okd .okd-dp-verm .okd-dp-rol{border-color:rgba(8,145,178,.4)}
.okd .okd-dp-rol.okd-dp-rol-edit{width:100%;align-items:center;background:none;border:0;padding:0}
.okd .okd-dp-paneel textarea.ok-in{field-sizing:content;min-height:2.6em}
.okd .okd-dp-regie{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;background:#eef4fb;border:1px solid #c7d7ea;border-radius:10px;padding:8px 12px;margin-bottom:8px}
.okd .okd-dp-regie-l{display:inline-flex;align-items:center;gap:6px;flex:none;max-width:100%;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;line-height:1.35;color:var(--cito)}
.okd .okd-dp-regie-l .okd-dp-icoon{width:12px;height:12px;color:var(--cito)}
.okd .okd-dp-regie-t{flex:1 1 320px;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;font-size:11px;line-height:1.4;color:var(--ink2)}
.okd .okd-dp-regie-kop{flex:none;font-size:10.5px;font-weight:800;color:var(--cito)}
.okd .okd-dp-regie-rol{display:inline-block;max-width:100%;background:#fff;border:1px solid rgba(0,51,102,.22);border-radius:999px;padding:3px 11px;font-size:11px;line-height:1.4;color:var(--ink2)}
.okd .okd-dp-regie-rol b{color:var(--cito);font-weight:800}
.okd .okd-dp-regie-punt{color:var(--ink3);white-space:pre}
.okd .okd-dp-regie-functie{color:var(--ink);font-weight:600}
.okd .okd-dp-regie-taak{color:var(--ink2)}
.okd .okd-dp-regie textarea.okd-dp-regie-t{display:block;background:#fff;color:var(--ink);font-size:12px;line-height:1.45}
.okd .okd-dp-beugel{width:22px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-left:2px solid var(--cito);border-bottom:2px solid var(--cito);border-radius:0 0 0 10px;padding:8px 0 8px 3px}
.okd .okd-dp-beugel span{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--cito);opacity:.8}
.okd .okd-dp-kpi{display:flex;align-items:flex-start;gap:6px;margin-top:8px;font-size:12px;line-height:1.4;color:var(--ink2)}
.okd .okd-dp-kpi-label{display:block;margin-bottom:3px;color:var(--ink)}
.okd .okd-dp-kpi-chips{display:flex;flex-wrap:wrap;gap:4px}
.okd .okd-dp-kpi-chip{display:inline-block;font-size:11.5px;line-height:1.3;color:var(--ink);background:#fff;border:1px solid #c7d7ea;border-radius:999px;padding:2px 8px}
.okd .okd-dp-doel .okd-dp-kpi-label{color:#fff}
.okd .okd-dp-doel .okd-dp-kpi-chip{color:#fff;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.4)}
.okd .okd-dp-kpi-l{flex:none;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;line-height:1.3;color:var(--ink3);border:1px solid var(--line2);border-radius:4px;padding:1px 4px;margin-top:1px}
.okd .okd-dp-kpi-t{min-width:0}
.okd .okd-dp-kpi-t b{color:var(--ink2);font-weight:700}
.okd .okd-dp-kpi-edit{width:100%}
.okd .okd-dp-kpi-edit .ok-in{flex:1;min-width:0}
.okd .okd-dp-doel .okd-dp-kpi{color:#b9cce3}
.okd .okd-dp-doel .okd-dp-kpi-l{color:#c9d9ec;border-color:rgba(255,255,255,.32)}
.okd .okd-dp-doel .okd-dp-kpi-t b{color:#e6eef8}
.okd .okd-dp-meetlat{margin-top:8px}
.okd .okd-dp-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.okd .okd-dp-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;font-size:10.5px;font-weight:600;line-height:1.4;color:#0f2a3f;border:1px solid rgba(15,42,63,.12);border-radius:999px;padding:2px 10px}
.okd .okd-dp-chip-edit{padding:2px 4px 2px 8px}
.okd .okd-dp-chip-edit .ok-in{width:21ch;min-width:0;font-size:10.5px;padding:1px 5px}
.okd .okd-chip-keuze{display:flex;flex-direction:column;gap:4px;min-width:120px}
.okd .okd-chip-keuze .ok-keuze{width:100%}
.okd .okd-dp-rl .ok-knopje{display:block;margin-top:5px;text-transform:none;letter-spacing:0}
.okd .okd-dp-knoppen{display:flex;gap:3px;justify-content:flex-end;margin-bottom:4px}
.okd .okd-dp-knoppen .ok-knopje{min-width:22px;padding:0 5px;line-height:1.55;text-align:center}
.okd .okd-dp-knoppen .ok-knopje:disabled{opacity:.3;cursor:default;background:#fff}
.okd .okd-dp-vinken{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:2px}
.okd .okd-dp-vink{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;line-height:1.5;white-space:nowrap;cursor:pointer;color:color-mix(in srgb,var(--dpk) 75%,#000);background:color-mix(in srgb,var(--dpk) 8%,#fff);border:1px solid color-mix(in srgb,var(--dpk) 35%,#fff);border-radius:999px;padding:1px 9px 1px 6px}
.okd .okd-dp-vink input{margin:0;accent-color:var(--dpk);cursor:pointer}
.okd .okd-dp-vink:has(input:checked){background:color-mix(in srgb,var(--dpk) 16%,#fff);border-color:var(--dpk)}
.okd [id^="wk-"],.okd [id^="tl-"]{scroll-margin-top:16px}
@media(max-width:820px){.okd .okd-kaarten{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.okd .ok-card dl{grid-template-columns:minmax(0,1fr)}.okd .ok-card dd{margin-bottom:4px}.okd .okd-dp-regie{padding:8px 10px;gap:6px 10px}.okd .okd-dp-regie-l{letter-spacing:.08em}.okd .okd-dp-regie-rol{padding:3px 9px}}
`;

/** Basisklassen voor de knoppen in de bewerkbalk (Bewerken, Opslaan, …). */
export const KNOP = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";

// Leesbaarheid van stap 11 (30-09-2026, na "bijna niet leesbaar"): altijd als laatste laden,
// na de stijl van de blokken. Grijze tekst minimaal 5:1 contrast op wit en lichte vlakken;
// labels in hoofdletters minimaal 10px, secundaire tekst 11,5px, zinnen (legenda's, regels
// in kaarten) 12px. Alleen binnen .okd, dus het organigram (stap 10) verandert niet.
export const LEESBAAR_CSS = `
.okd{--ink2:#4a5565;--ink3:#5f6b7a;--verm:#0e7490}
.okd .kp-soort,.okd .kp-tag,.okd .kp-bron-l,.okd .mx-t thead th.mx-hoek,.okd .mv-zv-kop,.okd .mv-e-sub,.okd .mv-e-l,.okd .sp-verbonden-l,.okd .tl-kh,.okd .tl-sl-kop,.okd .vn-l,.okd .vn-waarom-l,.okd .vn-bron-l,.okd .vb-teller-l,.okd .wk-bron-l,.okd .wk-groep-kop,.okd .wk-tl-tag,.okd .wk-veld-l,.okd .ok-bl,.okd .ok-t th,.okd .ok-card dt,.okd .okd-laag-kop > div,.okd .okd-dp-rl,.okd .okd-dp-l,.okd .okd-dp-beugel span,.okd .okd-dp-kpi-l,.okd .okd-toc-kop,.okd .st-dan{font-size:10px}
.okd .kp-groep-t,.okd .mv-e-kop,.okd .sp-verb-kop,.okd .wk-l,.okd .wk-schakel-p,.okd .okd-dp-regie-l,.okd .ok-gt,.okd .ok-label{font-size:10.5px}
.okd .kp-voet,.okd .kp-hint,.okd .mx-sub,.okd .mx-hint,.okd .mv-kop-sub,.okd .mv-legenda,.okd .mv-zv-bij,.okd .sp-kop-sub,.okd .sp-item-sub,.okd .sp-verbonden,.okd .tl-sleutel,.okd .tl-eb-hint,.okd .vn-bron,.okd .vb-balk-t,.okd .vb-item-w,.okd .vb-item-m,.okd .vb-item-sub,.okd .vb-hint,.okd .vb-doc,.okd .vb-legenda-vast,.okd .vb-leeg,.okd .wk-dchip,.okd .wk-bron,.okd .wk-doc-hint,.okd .wk-hint,.okd .okd-kaart-sub,.okd .okd-dp-v,.okd .okd-dp-leads,.okd .okd-dp-rol,.okd .okd-dp-regie-kop,.okd .ab-leads,.okd .tl-bijnaam{font-size:11.5px}
.okd .ok-legend,.okd .vb-legenda-vast{font-size:12px;line-height:1.55;color:var(--ink2)}
.okd .ok-card dl,.okd .ok-card dd,.okd dd.okd-accent,.okd .okd-dp-tk,.okd .okd-dp-dom .okd-dp-v{font-size:12px}
.okd .ok-card dl{grid-template-columns:130px 1fr}
.okd .ok-sub{font-size:13px;line-height:1.55;color:var(--ink2)}
.okd .ab-telling{font-size:10.5px}
.okd .kp-groep-t{font-size:11.5px;font-weight:700;text-transform:none;letter-spacing:0}
.okd .kp-soort{background:rgba(0,0,0,.22)}
`;
