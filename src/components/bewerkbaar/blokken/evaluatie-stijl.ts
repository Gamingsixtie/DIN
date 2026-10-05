// Stijl van het evaluatiebord (EvaluatieBlok.tsx): per kader één kaart in lagen, in de
// beeldtaal van het actiebord en het voortgangsbord (witte kaart, dunne rand, zachte schaduw,
// gekleurde strook links). Alleen CSS, onder de .okd-scope.
// - Kleur: de strook links en de chip volgen het eerste beeld (data-beeld op .ev-kader:
//   ja groen, deels blauw, needeels amber, nee rood; altijd met een teken en het woord erbij).
//   Ons eigen oordeel kleurt alleen het keuzelijstje en de keuzerondjes.
// - Rollen: Cito is overal het gevulde, donkerblauwe rondje (leidt), 3sides het lichte rondje
//   met een rand (voert uit): in de rolverdeling bovenaan, bij "aan zet" in de kop en voor de
//   koppen "Wat we van 3sides vragen" en "Wat Cito zelf doet".
// - Twee weergaven. Extern (.ev-extern): alleen de boodschap aan 3sides; de kop heeft dan geen
//   rail (.ev-kop-smal). Intern: onder de boodschap een eigen vlak (.ev-intern) over de volle
//   breedte van de kaart, lichtgrijs, met het merk "Intern Cito" (.ev-merk): wat Cito zelf
//   doet, ons oordeel en de onderbouwing. Zo leest niemand dat als deel van de boodschap.
// - Breedte: het blok is een container (container-type); de indeling volgt de breedte van het
//   blok zelf, niet die van het venster (het blok staat in kolommen van 340 tot 1300px).
//   Smal: alles onder elkaar. Vanaf 760px: "aan zet" en ons oordeel in een rail rechts.
//   Vanaf 1000px: feiten links, wat we van 3sides vragen rechts.
// - Leesbaarheid: zinnen 12px of groter, labels 10,5px of groter, grijs #5f6b7a of donkerder.
// - Afdrukken: alles open, knoppen weg, kleuren behouden.

const CITO = "#003366";
/** Zelfde pijltje als in voortgangKeuzeCss (TijdlijnBlok.tsx). */
const PIJL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%234a5565' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const EVALUATIE_CSS = `
.okd .ev{--ev-cito:${CITO};--ev-ink:#111827;--ev-tekst:#1f2937;--ev-ink2:#4a5565;--ev-ink3:#5f6b7a;--ev-lijn:#e2e8f0;--ev-lijn2:#edf1f5;--ev-vlak:#f8fafc;container:ev / inline-size;display:flex;flex-direction:column;gap:12px;min-width:0;overflow-wrap:break-word}
.okd .ev-l{font-size:10.5px;font-weight:800;line-height:1.4;letter-spacing:.06em;text-transform:uppercase;color:var(--ev-ink3)}
.okd .ev-h{margin:0 0 8px;font-size:11px;font-weight:800;line-height:1.4;letter-spacing:.07em;text-transform:uppercase;color:var(--ev-cito)}
.okd .ev-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.okd .ev-tb{font-style:italic;font-weight:500;color:var(--ev-ink3)}
.okd .ev-alleen-print{display:none;font-size:12.5px}

.okd .ev-av{flex:none;display:inline-grid;place-items:center;box-sizing:border-box;width:26px;height:26px;border-radius:999px;font-size:12.5px;font-weight:800;line-height:1;font-style:normal;font-variant-numeric:tabular-nums}
.okd .ev-av-cito{background:var(--ev-cito);color:#fff;border:1.5px solid var(--ev-cito)}
.okd .ev-av-3sides{background:#fff;color:var(--ev-tekst);border:1.5px solid #475569}
.okd .ev-av-klein{width:19px;height:19px;font-size:10.5px}

.okd .ev-rollen{display:flex;flex-wrap:wrap;align-items:center;gap:10px 28px;background:var(--ev-vlak);border:1px solid var(--ev-lijn);border-radius:12px;padding:10px 14px}
.okd .ev-rollen-l{flex:none;color:var(--ev-ink2)}
.okd .ev-rol{display:flex;align-items:center;gap:9px;min-width:0}
.okd .ev-rol-t{display:flex;flex-direction:column;min-width:0}
.okd .ev-rol-n{font-size:13.5px;font-weight:800;line-height:1.25;color:var(--ev-ink)}
.okd .ev-rol-r{font-size:12.5px;line-height:1.35;color:var(--ev-ink2)}
.okd .ev-rollen-edit{align-items:flex-start}
.okd .ev-rollen-edit .ev-rol{flex:1 1 260px;align-items:flex-start}
.okd .ev-rollen-edit .ev-veld{flex:1;font-size:13px}

.okd .ev-tools{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 18px;padding-right:4px}
.okd .ev-alles{display:inline-flex;align-items:center;gap:7px;margin:0;font:inherit;font-size:12.5px;font-weight:700;line-height:1.4;color:var(--ev-cito);background:#fff;border:1px solid #c7d7ea;border-radius:999px;padding:4px 14px 4px 5px;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
.okd .ev-alles:hover{background:#eef4fb;border-color:var(--ev-cito)}
.okd .ev-alles:focus-visible{outline:2px solid var(--ev-cito);outline-offset:2px}
.okd .ev-alles.is-open .ev-chev{transform:rotate(180deg)}
.okd .ev-invul{display:flex;align-items:center;gap:10px;min-width:0;font-size:12.5px;color:var(--ev-ink2)}
.okd .ev-invul-t{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;color:var(--ev-ink2)}
.okd .ev-invul b{font-size:12.5px;font-weight:800;color:var(--ev-cito);font-variant-numeric:tabular-nums;white-space:nowrap}
.okd .ev-meter{position:relative;display:block;flex:0 1 120px;width:120px;min-width:36px;height:6px;border-radius:999px;background:#dbe3ec;overflow:hidden}
.okd .ev-meter > span{position:absolute;inset:0 auto 0 0;border-radius:999px;background:var(--ev-cito);transition:width .3s ease}

.okd .ev-lijst{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}
.okd .ev-kader{--ev-k:#94a3b8;position:relative;min-width:0;overflow:hidden;background:#fff;border:1px solid var(--ev-lijn);border-radius:12px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 14px -8px rgba(15,23,42,.14);scroll-margin-top:16px;transition:border-color .15s ease,box-shadow .15s ease}
.okd .ev-kader::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--ev-k)}
.okd .ev-kader[data-beeld="ja"]{--ev-k:#059669}
.okd .ev-kader[data-beeld="deels"]{--ev-k:#2563eb}
.okd .ev-kader[data-beeld="needeels"]{--ev-k:#d97706}
.okd .ev-kader[data-beeld="nee"]{--ev-k:#b42318}
.okd .ev-kader.is-open{border-color:#c7d7ea;box-shadow:0 1px 2px rgba(15,23,42,.06),0 12px 26px -16px rgba(0,51,102,.4)}

.okd .ev-kop{display:grid;grid-template-columns:28px minmax(0,1fr);gap:9px 12px;padding:14px 16px 2px 21px;cursor:pointer}
.okd .ev-nr{grid-column:1;grid-row:1;display:inline-grid;place-items:center;width:26px;height:26px;margin-top:-3px;border-radius:999px;background:var(--ev-cito);color:#fff;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums}
.okd .ev-kop-t{grid-column:2;min-width:0}
.okd .ev-titel{margin:0;font-size:15px;font-weight:800;line-height:1.3;letter-spacing:-.01em;color:var(--ev-cito);text-wrap:balance}
.okd .ev-sub{display:none;margin:2px 0 0;font-size:12.5px;line-height:1.45;color:var(--ev-ink2)}
.okd .ev-kader.is-open .ev-sub{display:block}
.okd .ev-hoofd{grid-column:2;min-width:0}
.okd .ev-beeldrij{display:flex;flex-wrap:wrap;align-items:center;gap:5px 10px;margin:0}
.okd .ev-zin{margin:7px 0 0;max-width:84ch;font-size:13.5px;line-height:1.55;color:var(--ev-tekst);text-wrap:pretty}
.okd .ev-kader:not(.is-open) .ev-zin{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:5;overflow:hidden}
.okd .ev-rail{grid-column:2;display:flex;flex-wrap:wrap;align-items:flex-start;gap:8px 26px;margin:1px 0 0;padding:0}
.okd .ev-gegeven{display:flex;flex-direction:column;gap:4px;min-width:0}
.okd .ev-gegeven:first-child{min-width:132px}
.okd .ev-gegeven dt,.okd .ev-gegeven dd{margin:0}
.okd .ev-gegeven label{cursor:pointer}
.okd .ev-wie{display:flex;align-items:center;gap:7px;min-height:24px;font-size:13px;font-weight:700;line-height:1.35;color:var(--ev-ink)}
.okd .ev-wie-avs{display:inline-flex;flex:none;gap:3px}

.okd .ev-beeld{display:inline-flex;align-items:center;gap:5px;max-width:100%;font-size:12px;font-weight:800;line-height:1.5;padding:1px 10px 1px 7px;border-radius:999px;border:1px solid #cbd5e1;background:#f1f5f9;color:var(--ev-ink2)}
.okd .ev-beeld svg{flex:none}
.okd .ev-beeld-ja{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
.okd .ev-beeld-deels{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
.okd .ev-beeld-needeels{color:#92400e;background:#fffbeb;border-color:#fcd34d}
.okd .ev-beeld-nee{color:#b42318;background:#fef3f2;border-color:#fecdca}
.okd .ev-beeld-leeg{border-style:dashed;background:#fff;font-weight:600;font-style:italic;padding-left:10px}
.okd .ev-beeld-klein{font-size:12px;line-height:1.45;padding:0 8px 0 6px;margin-right:2px;vertical-align:1px}

.okd .ev-oordeel{appearance:none;-webkit-appearance:none;max-width:100%;margin:0;font:inherit;font-size:12.5px;font-weight:600;line-height:1.4;padding:3px 28px 3px 12px;border:1px dashed #94a3b8;border-radius:999px;background:#fff ${PIJL} no-repeat right 10px center/9px 6px;color:var(--ev-ink2);cursor:pointer;transition:border-color .12s ease}
.okd .ev-oordeel:hover{border-color:var(--ev-cito)}
.okd .ev-oordeel:focus-visible{outline:2px solid var(--ev-cito);outline-offset:2px}
.okd .ev-oordeel-goed{border-style:solid;font-weight:700;background-color:#ecfdf5;border-color:#6ee7b7;color:#047857}
.okd .ev-oordeel-deels{border-style:solid;font-weight:700;background-color:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.okd .ev-oordeel-onvoldoende{border-style:solid;font-weight:700;background-color:#fffbeb;border-color:#fcd34d;color:#92400e}
.okd .ev-oordeel-nvt{border-style:solid;font-weight:700;background-color:#f1f5f9;border-color:#cbd5e1;color:var(--ev-ink2)}

.okd .ev details{break-inside:auto}
.okd .ev-meer{min-width:0}
.okd .ev-meer > summary,.okd .ev-diep > summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;margin:0;font-size:12.5px;font-weight:700;line-height:1.4;color:var(--ev-cito)}
.okd .ev-meer > summary::-webkit-details-marker,.okd .ev-diep > summary::-webkit-details-marker{display:none}
.okd .ev-meer > summary::marker,.okd .ev-diep > summary::marker{content:""}
.okd .ev-meer > summary{padding:9px 16px 13px 61px}
.okd .ev-meer > summary:hover .ev-meer-t,.okd .ev-diep > summary:hover .ev-meer-t{text-decoration:underline;text-underline-offset:3px}
.okd .ev-meer > summary:focus-visible,.okd .ev-diep > summary:focus-visible{outline:2px solid var(--ev-cito);outline-offset:-3px;border-radius:10px}
.okd .ev-meer-t{min-width:0}
.okd .ev-chev{flex:none;display:inline-grid;place-items:center;width:20px;height:20px;border-radius:999px;background:#e6eef8;color:var(--ev-cito);transition:transform .2s ease}
.okd .ev details[open] > summary > .ev-chev{transform:rotate(180deg)}

.okd .ev-body{display:flex;flex-direction:column;gap:16px;padding:16px 16px 16px 21px;border-top:1px solid var(--ev-lijn2)}
.okd .ev-kern{display:grid;grid-template-columns:minmax(0,1fr);gap:16px 24px;align-items:start}
.okd .ev-feitenvak,.okd .ev-doen{min-width:0}
.okd .ev-feiten{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;max-width:78ch}
.okd .ev-feiten > li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;align-items:start;font-size:13px;line-height:1.5;color:var(--ev-tekst)}
.okd .ev-fnr{display:inline-grid;place-items:center;box-sizing:border-box;width:20px;height:20px;border-radius:999px;border:1.5px solid var(--ev-cito);background:#fff;color:var(--ev-cito);font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums}
.okd .ev-feit-t{min-width:0;text-wrap:pretty}
.okd .ev-bron{display:block;margin-top:1px;font-size:12px;line-height:1.45;color:var(--ev-ink2)}
.okd .ev-bron .ok-bron,.okd .ev-onder .ok-bron,.okd .ev-onder .ok-deel{color:inherit;text-decoration-color:rgba(74,85,101,.6)}

.okd .ev-h-av{display:flex;align-items:center;gap:8px}
.okd .ev-doen-t{max-width:78ch;background:#fff;border:1px solid #cbd5e1;border-left:4px solid #475569;border-radius:4px 10px 10px 4px;padding:10px 13px 12px;font-size:13px;line-height:1.55;color:var(--ev-tekst);white-space:pre-line;text-wrap:pretty}
.okd .ev-doen-cito .ev-doen-t{border-left-color:var(--ev-cito)}

.okd .ev-intern{display:flex;flex-direction:column;gap:14px;margin:0 -16px -16px -21px;padding:13px 16px 16px 21px;background:#f3f5f8;border-top:1px solid #d5dde8}
.okd .ev-body > .ev-intern:first-child{margin-top:-16px;border-top:0}
.okd .ev-intern-kop{display:flex;flex-wrap:wrap;align-items:center;gap:5px 10px;margin:0;font-size:12.5px;line-height:1.45;color:var(--ev-ink2)}
.okd .ev-merk{flex:none;display:inline-block;font-size:10.5px;font-weight:800;line-height:1.5;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;color:#fff;background:var(--ev-cito);border:1px solid var(--ev-cito);border-radius:999px;padding:1px 10px}
.okd .ev-intern .ev-oordeelvak{background:#fff}

.okd .ev-vraagvak{display:grid;grid-template-columns:22px minmax(0,1fr);gap:3px 12px;align-items:start;background:#f2f6fb;border:1px solid #c7d7ea;border-left:5px solid var(--ev-cito);border-radius:4px 12px 12px 4px;padding:12px 16px 14px 14px}
.okd .ev-vraag-i{grid-column:1;grid-row:1 / span 2;margin-top:1px;color:var(--ev-cito)}
.okd .ev-vraagvak .ev-h{grid-column:2;margin:0}
.okd .ev-vraag-t{grid-column:2;margin:0;max-width:70ch;font-size:15.5px;font-weight:600;line-height:1.5;letter-spacing:-.005em;color:#0f2942;white-space:pre-line;text-wrap:pretty}

.okd .ev-oordeelvak{display:flex;flex-direction:column;gap:9px;padding:11px 14px 13px;background:var(--ev-vlak);border:1px solid var(--ev-lijn);border-radius:10px}
.okd .ev-oordeel-kop{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
.okd .ev-oordeel-kop .ev-h{margin:0}
.okd .ev-pillen{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.okd .ev-pil{position:relative;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;line-height:1.4;color:var(--ev-ink2);background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:3px 12px 3px 9px;cursor:pointer;transition:background-color .12s ease,border-color .12s ease,color .12s ease}
.okd .ev-pil input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.okd .ev-pil::before{content:"";flex:none;box-sizing:border-box;width:10px;height:10px;border-radius:999px;border:1.5px solid currentColor}
.okd .ev-pil.is-gekozen::before{background:currentColor;box-shadow:inset 0 0 0 1.5px #fff}
.okd .ev-pil:hover{border-color:var(--ev-cito)}
.okd .ev-pil:has(input:focus-visible){outline:2px solid var(--ev-cito);outline-offset:2px}
.okd .ev-pil-goed.is-gekozen{font-weight:700;background:#ecfdf5;border-color:#6ee7b7;color:#047857}
.okd .ev-pil-deels.is-gekozen{font-weight:700;background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
.okd .ev-pil-onvoldoende.is-gekozen{font-weight:700;background:#fffbeb;border-color:#fcd34d;color:#92400e}
.okd .ev-pil-nvt.is-gekozen{font-weight:700;background:#f1f5f9;border-color:#94a3b8;color:var(--ev-tekst)}
.okd .ev-wis{margin:0;font:inherit;font-size:12px;font-weight:600;line-height:1.4;color:var(--ev-ink2);background:none;border:0;border-radius:4px;padding:2px 4px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.okd .ev-wis:hover{color:var(--ev-cito)}
.okd .ev-wis:focus-visible{outline:2px solid var(--ev-cito);outline-offset:1px}
.okd .ev-bewaard{margin-left:auto;font-size:12px;line-height:1.4;color:var(--ev-ink2)}
.okd .ev-notitie{display:block;width:100%;box-sizing:border-box;min-height:2.9em;margin:0;font:inherit;font-size:13px;line-height:1.5;letter-spacing:0;text-transform:none;color:var(--ev-ink);background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;resize:none;overflow:hidden;field-sizing:content;transition:border-color .12s,box-shadow .12s}
.okd .ev-notitie::placeholder{color:var(--ev-ink3);opacity:1;font-style:italic}
.okd .ev-notitie:hover{border-color:#94a3b8}
.okd .ev-notitie:focus{outline:none;border-color:var(--ev-cito);box-shadow:0 0 0 3px rgba(0,51,102,.18)}

.okd .ev-diep{margin:0 -16px -16px -21px;border-top:1px solid var(--ev-lijn2)}
.okd .ev-diep > summary,.okd .ev-diep-kop{padding:11px 16px 11px 21px}
.okd .ev-diep-kop{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;line-height:1.4;color:var(--ev-cito)}
.okd .ev-diep > summary{flex-wrap:wrap}
.okd .ev-diep > summary > .ev-meer-t{flex:none}
.okd .ev-diep-n{flex:1 1 150px;min-width:0;font-weight:500;color:var(--ev-ink2)}
.okd .ev-onder{padding:0 16px 6px 21px;border-top:1px solid var(--ev-lijn2);background:#fcfdfe}
.okd .ev-s{display:grid;grid-template-columns:minmax(0,1fr);gap:5px 28px;padding:14px 0 15px}
.okd .ev-s + .ev-s{border-top:1px solid var(--ev-lijn2)}
.okd .ev-s-kop{margin:0;min-width:0;font-size:13px;font-weight:800;line-height:1.45;color:var(--ev-ink)}
.okd .ev-s-toets .ev-s-kop{color:var(--ev-cito)}
.okd .ev-s-t{min-width:0;max-width:70ch;font-size:13px;line-height:1.65;color:#27303f}
.okd .ev-s-t p{margin:0}
.okd .ev-s-t p + p{margin-top:7px}
.okd .ev-s-t b{font-weight:700;color:var(--ev-ink)}

.okd .ev-veld{display:flex;flex-direction:column;gap:4px;min-width:0}
.okd .ev-velden{display:grid;grid-template-columns:minmax(0,1fr);gap:14px 28px;font-size:13.5px;line-height:1.55;color:var(--ev-tekst)}
.okd .ev-hint{font-size:12px;line-height:1.45;font-weight:400;letter-spacing:0;text-transform:none;color:var(--ev-ink2)}
.okd .ev > .okd-bt .ok-in,.okd .ev > .ok-in.ok-sub,.okd .ev-legenda .ok-in{width:100%;margin-left:0;margin-right:0}
.okd .ev-kop.ev-kop-vast{cursor:default;padding-bottom:14px}
.okd .ev-hint-los{margin:0}
.okd .ev-kader-edit .ev-kop{cursor:default;padding-bottom:12px}
.okd .ev-kader-edit .ok-rij > .ev-titel{flex:1;min-width:0}
.okd .ev-kader-edit .ev-feiten > li > .ok-rij{min-width:0}
.okd .ev-kader-edit .ev-s-t,.okd .ev-kader-edit .ev-feiten{max-width:none}
.okd .ev-plus{margin-top:8px}
.okd .ev-lijst + .ev-plus{margin-top:0}
.okd .ev-legenda{margin:0;font-size:12.5px;line-height:1.55;color:var(--ev-ink2)}

@container ev (min-width:760px){
  .okd .ev-kop{grid-template-columns:28px minmax(0,1fr) 196px;grid-template-rows:auto 1fr;column-gap:14px}
  .okd .ev-kop.ev-kop-smal{grid-template-columns:28px minmax(0,1fr)}
  .okd .ev-rail{grid-column:3;grid-row:1 / span 2;flex-direction:column;flex-wrap:nowrap;gap:12px;margin:0 0 6px;padding:1px 0 2px 18px;border-left:1px solid var(--ev-lijn2)}
  .okd .ev-meer > summary{padding-left:63px}
  .okd .ev-velden{grid-template-columns:minmax(0,2.4fr) minmax(0,1fr)}
  .okd .ev-velden > :only-child{grid-column:1 / -1}
  .okd .ev-s{grid-template-columns:210px minmax(0,70ch)}
  .okd .ev-kader-edit .ev-s{grid-template-columns:210px minmax(0,1fr)}
}
@container ev (min-width:1000px){
  .okd .ev-kern.heeft-feiten.heeft-vragen{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}
  .okd .ev-kern > .ev-vraagvak{grid-column:1 / -1}
  .okd .ev-s{grid-template-columns:250px minmax(0,70ch)}
  .okd .ev-kader-edit .ev-s{grid-template-columns:250px minmax(0,1fr)}
}
@container ev (max-width:440px){
  .okd .ev-kop{column-gap:10px;padding:13px 12px 2px 17px}
  .okd .ev-hoofd,.okd .ev-rail{grid-column:1 / -1}
  .okd .ev-rail{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:center;gap:7px 12px}
  .okd .ev-gegeven{display:contents}
  .okd .ev-invul{flex:1 1 100%}
  .okd .ev-meter{flex:1 1 60px;width:auto}
  .okd .ev-meer > summary{padding:9px 12px 12px 17px}
  .okd .ev-body{padding:14px 12px 14px 17px}
  .okd .ev-intern{margin:0 -12px -14px -17px;padding:12px 12px 14px 17px}
  .okd .ev-body > .ev-intern:first-child{margin-top:-14px}
  .okd .ev-diep{margin:0 -12px -14px -17px}
  .okd .ev-diep > summary,.okd .ev-diep-kop{padding-left:17px;padding-right:12px}
  .okd .ev-onder{padding-left:17px;padding-right:12px}
  .okd .ev-vraagvak{padding:11px 12px 12px 12px;column-gap:10px}
  .okd .ev-vraag-t{font-size:14.5px}
  .okd .ev-bewaard{margin-left:0}
}
@media (prefers-reduced-motion:reduce){
  .okd .ev-chev,.okd .ev-kader,.okd .ev-meter > span{transition:none}
}
@media print{
  .okd .ev-kader,.okd .ev-beeld,.okd .ev-av,.okd .ev-doen-t,.okd .ev-intern,.okd .ev-merk,.okd .ev-vraagvak,.okd .ev-nr,.okd .ev-oordeel,.okd .ev-pil,.okd .ev-meter,.okd .ev-meter > span{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .okd .ev-kader{box-shadow:none}
  .okd .ev-kop{cursor:default;break-inside:avoid}
  .okd .ev-tools .ev-alles,.okd .ev-meer > summary,.okd .ev-diep > summary .ev-chev,.okd .ev-wis,.okd .ev-bewaard{display:none}
  .okd .ev-meer::details-content,.okd .ev-diep::details-content{content-visibility:visible;display:block}
  .okd .ev-kader .ev-sub{display:block}
  .okd .ev-kader .ev-zin{display:block;-webkit-line-clamp:none;overflow:visible}
  .okd .ev-pil:not(.is-gekozen){display:none}
  .okd .ev-oordeel:not([class*="ev-oordeel-"]){display:none}
  .okd .ev-alleen-print{display:inline}
  .okd .ev-notitie::placeholder{color:transparent}
  .okd .ev-doen,.okd .ev-vraagvak,.okd .ev-oordeelvak,.okd .ev-feiten > li,.okd .ev-s-kop{break-inside:avoid}
  .okd .ev-s-kop{break-after:avoid}
}
`;
