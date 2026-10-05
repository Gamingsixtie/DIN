// Stijl van de afdrukweergave "Evaluatie 3sides" (PDF via het afdrukvenster van de browser).
// Alles staat onder de wrapper .evp, zodat niets in de rest van de app terechtkomt; de regels
// op html en body gelden alleen zolang deze pagina open is (:has(.evp)).
//
// Papier: A4. De paginamarge in @page is 0: alleen dan laat Chrome zijn eigen kop- en
// voettekst (datum, titel, adres van de pagina met het sessie-id) weg en verdwijnt de optie
// "Kop- en voetteksten" uit het afdrukvenster. De marge maken we zelf: elk blad (.evp-blad)
// heeft de marge als padding, die op elke pagina terugkomt (box-decoration-break: clone).
// De voettekst (titel, "Intern Cito", paginanummer) staat in de margeboxen van @page, met
// een negatieve marge de pagina in getrokken.
// Delen met de tijdlijn, het voortgangsbord of een brede tabel krijgen liggende pagina's
// (@page evp-liggend); de evaluatie (eigen opmaak) en de agenda staan staand.
//
// De blokken uit de app (.evp-app) staan op liggende pagina's op ware grootte (zoals de app op
// een scherm van ruim 1000px breed) en op staande pagina's iets vergroot. Tekst die daarmee
// kleiner dan 9pt op papier zou komen, zet Afdruk.tsx na het tekenen op 9pt (maakStatisch).
// Wat in de app een bediening is (keuzelijst, vinkje, link binnen de app) staat hier als
// vaste tekst of als teken; zinnen over de bediening (klasse vb-alleen-app) staan er niet.

/** Marges op papier (mm): boven, zijkant, onder. */
const STAAND = { boven: 15, zij: 13, onder: 19 };
const LIGGEND = { boven: 12, zij: 12, onder: 17 };

/** Tekst veilig in een CSS-string (content: "…"). */
function cssTekst(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ");
}

/** Eén maandkolom van de tijdlijn: een dunne lijn links, die bij schalen even dun blijft. */
const MAANDLIJN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' preserveAspectRatio='none'%3E%3Cpath d='M0 0V10' stroke='%23dde3ea' stroke-width='2' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E\")";

const VINK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M1.6 5.4 4 7.8 8.4 2.6' fill='none' stroke='%23fff' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/** De stijl van de afdrukweergave; `voet` is de tekst links onderaan elke pagina. */
export function afdrukCss(voet: string): string {
  const voetFont = 'font:9pt/1.2 "Segoe UI",Inter,system-ui,sans-serif;color:#4a5565';
  return `
@page{size:A4 portrait;margin:0;
  @bottom-left{content:"${cssTekst(voet)}";${voetFont};margin:-${STAAND.onder - 7}mm 0 0 ${STAAND.zij}mm}
  @bottom-right{content:"Pagina " counter(page) " van " counter(pages);${voetFont};margin:-${STAAND.onder - 7}mm ${STAAND.zij}mm 0 0}
}
@page evp-liggend{size:A4 landscape;margin:0;
  @bottom-left{margin:-${LIGGEND.onder - 7}mm 0 0 ${LIGGEND.zij}mm}
  @bottom-right{margin:-${LIGGEND.onder - 7}mm ${LIGGEND.zij}mm 0 0}
}

.evp{--evp-cito:#003366;--evp-ink:#111827;--evp-ink2:#374151;--evp-ink3:#4a5565;--evp-lijn:#d5dce6;--evp-vlak:#f2f6fb;min-height:100vh;background:#e6eaf0;color:var(--evp-ink);font-family:"Segoe UI",Inter,system-ui,-apple-system,sans-serif;font-size:10pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.evp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ---------- balk boven het papier (alleen op het scherm) ---------- */
.evp-balk{position:sticky;top:0;z-index:30;display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding:10px 20px;background:#fff;border-bottom:1px solid var(--evp-lijn);box-shadow:0 1px 4px rgba(15,23,42,.08)}
.evp-balk-wat{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;min-width:0;flex:1 1 320px;font-size:14px;line-height:1.4;color:var(--evp-ink)}
.evp-balk-wat b{color:var(--evp-cito)}
.evp-merk{display:inline-block;font-size:11px;font-weight:700;line-height:1.5;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;border-radius:999px;padding:2px 11px;border:1.5px solid var(--evp-cito);color:var(--evp-cito);background:#fff}
.evp-merk-intern{background:var(--evp-cito);color:#fff}
.evp-balk-doe{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
.evp-knop{font:inherit;font-size:14px;font-weight:700;line-height:1.3;color:#fff;background:var(--evp-cito);border:1.5px solid var(--evp-cito);border-radius:9px;padding:8px 16px;cursor:pointer;transition:background-color .15s ease}
.evp-knop:hover{background:#004d99;border-color:#004d99}
.evp-knop:focus-visible,.evp-terug:focus-visible{outline:3px solid rgba(0,102,204,.45);outline-offset:2px}
.evp-hint{font-size:13px;line-height:1.45;color:var(--evp-ink2);max-width:420px}
.evp-hint b{color:var(--evp-ink)}
.evp-terug{font-size:13px;font-weight:700;color:var(--evp-cito);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.evp-status{flex:1 0 100%;margin:0;font-size:13px;color:var(--evp-ink2)}
.evp-melding{max-width:560px;margin:14vh auto 0;padding:20px 24px;background:#fff;border:1px solid var(--evp-lijn);border-left:5px solid var(--evp-cito);border-radius:12px;font-size:14px;line-height:1.55;color:var(--evp-ink)}
.evp-melding h1{margin:0 0 6px;font-size:17px;font-weight:700;color:var(--evp-cito)}
.evp-melding p{margin:0 0 10px}

/* ---------- het papier ---------- */
.evp-papier{padding:22px 16px 80px;overflow-x:auto}
.evp-blad{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto 22px;padding:${STAAND.boven}mm ${STAAND.zij}mm ${STAAND.onder}mm;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.14),0 14px 34px -14px rgba(15,23,42,.3)}
.evp-blad.evp-liggend{width:297mm;min-height:210mm;padding:${LIGGEND.boven}mm ${LIGGEND.zij}mm ${LIGGEND.onder}mm}
.evp-blad > :first-child{margin-top:0}

/* voorblok */
.evp-voor{background:var(--evp-cito);color:#fff;border-radius:3mm;padding:9mm 9mm 8mm}
.evp-voor-boven{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 14px}
.evp-eyebrow{margin:0;font-size:9pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c3d6ec}
.evp-voor .evp-merk{font-size:9pt;border-color:#fff;color:#fff;background:transparent}
.evp-voor .evp-merk-intern{background:#fff;color:var(--evp-cito)}
.evp-voor h1{margin:7mm 0 0;font-size:23pt;font-weight:700;line-height:1.16;letter-spacing:-.012em;text-wrap:balance}
.evp-voor-sub{margin:3mm 0 0;font-size:12pt;line-height:1.4;color:#dbe7f5;max-width:150mm}
.evp-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(44mm,1fr));gap:0;margin:0;border-bottom:1px solid var(--evp-lijn)}
.evp-meta > div{padding:3.5mm 4mm 3.5mm 0}
.evp-meta dt{font-size:9pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--evp-ink3)}
.evp-meta dd{margin:1px 0 0;font-size:10.5pt;font-weight:600;color:var(--evp-ink)}
.evp-versie{margin:3.2mm 0 0;max-width:168mm;font-size:10pt;line-height:1.5;color:var(--evp-ink2)}
.evp-inhoud{margin-top:6mm}
.evp-inhoud h2,.evp-kopje{margin:0 0 2.5mm;font-size:9pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--evp-ink3)}
.evp-inhoud ol{list-style:none;margin:0;padding:0;border-top:1px solid var(--evp-lijn)}
.evp-inhoud li{display:flex;align-items:baseline;gap:4mm;padding:2.2mm 0;border-bottom:1px solid var(--evp-lijn);font-size:10.5pt;line-height:1.35}
.evp-inhoud-nr{flex:none;width:17mm;font-size:9pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--evp-cito)}
.evp-inhoud-t b{color:var(--evp-cito)}
.evp-inhoud-t span{color:var(--evp-ink2)}

/* kop van een onderdeel (agenda, een deel, bronnen) */
.evp-deel{margin-top:9mm}
.evp-deelkop{display:flex;align-items:flex-start;gap:4mm;padding-bottom:2.6mm;margin-bottom:3.4mm;border-bottom:2.5px solid var(--evp-cito);break-after:avoid;break-inside:avoid}
.evp-deelnr{flex:none;display:grid;place-items:center;min-width:11mm;height:11mm;border-radius:2mm;background:var(--evp-cito);color:#fff;font-size:17pt;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.evp-deelkop-t{min-width:0}
.evp-deelkop .evp-eyebrow{color:var(--evp-ink3);letter-spacing:.1em}
.evp-deelkop h2{margin:0;font-size:16pt;font-weight:700;line-height:1.22;letter-spacing:-.008em;color:var(--evp-cito);text-wrap:balance}
.evp-deelsub{margin:.6mm 0 0;font-size:11pt;line-height:1.35;color:var(--evp-ink2)}
.evp-intro{margin:0 0 4mm;max-width:172mm;font-size:10pt;line-height:1.55;color:var(--evp-ink2);white-space:pre-line}
.evp-liggend .evp-intro{max-width:215mm}
.evp-app + .evp-app,.evp-app + .evp-ev,.evp-ev + .evp-app{margin-top:4mm}

/* brief */
.evp-brief{padding-left:${STAAND.zij + 12}mm;padding-right:${STAAND.zij + 14}mm}
.evp-briefhoofd{display:flex;align-items:baseline;justify-content:space-between;gap:6mm;padding-bottom:3mm;margin-bottom:13mm;border-bottom:2.5px solid var(--evp-cito)}
.evp-briefhoofd b{font-size:15pt;font-weight:700;letter-spacing:-.01em;color:var(--evp-cito)}
.evp-briefhoofd span{font-size:9.5pt;font-weight:600;color:var(--evp-ink2)}
.evp-betreft{margin:0 0 8mm;font-size:10.5pt;line-height:1.45;color:var(--evp-ink)}
.evp-betreft b{font-weight:700}
.evp .evp-brief .evp-app .okd .okd-p{max-width:none;font-size:11pt;line-height:1.6;color:var(--evp-ink)}
.evp .evp-brief .evp-app .okd .okd-blokken > * + *{margin-top:4.2mm}

/* bronnen */
.evp-bronnen{margin:0;padding:0;list-style:none;columns:1}
.evp-bronnen li{position:relative;padding:1.3mm 0 1.3mm 5mm;font-size:10pt;line-height:1.45;color:var(--evp-ink2);border-bottom:1px solid #e7ebf0;break-inside:avoid}
.evp-bronnen li::before{content:"";position:absolute;left:.6mm;top:3.3mm;width:1.6mm;height:1.6mm;border-radius:.4mm;background:var(--evp-cito)}

/* ---------- het deel Evaluatie: eigen opmaak ---------- */
.evp-ev-titel{margin:0 0 2mm;font-size:12pt;font-weight:700;color:var(--evp-cito)}
/* rolverdeling boven de kaders */
.evp-rollen{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);margin:0 0 6mm;border:1px solid var(--evp-lijn);border-radius:2mm;overflow:hidden;break-inside:avoid}
.evp-rollen-l{display:flex;align-items:center;padding:2.4mm 3.6mm;background:var(--evp-vlak);font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-ink3)}
.evp-rol{padding:2.3mm 3.8mm 2.6mm;border-left:1px solid var(--evp-lijn)}
.evp-rol b{display:block;font-size:11pt;font-weight:700;line-height:1.3;color:var(--evp-ink)}
.evp-rol span{display:block;font-size:9.5pt;line-height:1.4;color:var(--evp-ink2)}
.evp-rol-cito{background:var(--evp-cito);border-left-color:var(--evp-cito)}
.evp-rol-cito b{color:#fff}
.evp-rol-cito span,.evp .evp-rol-cito a.ok-bron{color:#dbe7f5}
.evp-rol-3sides{background:#f1f5f9}
/* een kader */
.evp-kader{--k:#4a5565;--kb:#f1f5f9;--kr:#cbd5e1;margin:0 0 8mm;padding-top:3.4mm;border-top:2px solid var(--evp-cito)}
.evp-kader-ja{--k:#047857;--kb:#ecfdf5;--kr:#a7f3d0}
.evp-kader-deels{--k:#1d4ed8;--kb:#eff6ff;--kr:#bfdbfe}
.evp-kader-needeels{--k:#92400e;--kb:#fffbeb;--kr:#fcd34d}
.evp-kader-nee{--k:#b42318;--kb:#fef3f2;--kr:#fecdca}
.evp-kader-kop{display:flex;align-items:flex-start;gap:3.2mm;break-after:avoid;break-inside:avoid}
.evp-kader-nr{flex:none;display:grid;place-items:center;width:7.4mm;height:7.4mm;border-radius:50%;background:var(--evp-cito);color:#fff;font-size:10.5pt;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.evp-kader-kop h3{margin:.3mm 0 0;font-size:13pt;font-weight:700;line-height:1.25;letter-spacing:-.006em;color:var(--evp-cito)}
.evp-kader-sub{margin:.5mm 0 0;font-size:9.5pt;line-height:1.4;color:var(--evp-ink2)}
/* de bevinding */
.evp-beeld{margin-top:3.2mm;padding:2.6mm 3.6mm 3mm;border:1px solid var(--kr);border-radius:2mm;background:var(--kb);break-inside:avoid}
.evp-beeld-kop{display:flex;flex-wrap:wrap;align-items:center;gap:1.4mm 3mm}
.evp-beeld-l{font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--k)}
.evp-chip{display:inline-flex;align-items:center;gap:1.6mm;font-size:9.5pt;font-weight:700;line-height:1.35;letter-spacing:.02em;white-space:nowrap;border:1.4px solid var(--k);border-radius:999px;padding:.5mm 3.2mm .6mm 2.2mm;color:var(--k);background:#fff}
.evp-chip svg{flex:none;width:3mm;height:3mm}
.evp-beeld p{margin:1.8mm 0 0;font-size:10.5pt;font-weight:600;line-height:1.5;color:var(--evp-ink);white-space:pre-line}
/* de feiten: genummerd, de bron op een eigen regel */
.evp-vak{margin-top:3.6mm}
.evp-vak > h4{margin:0 0 1.6mm;font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-ink3);break-after:avoid}
.evp-punten{margin:0;padding:0;list-style:none;counter-reset:evp-feit}
.evp-punten li{position:relative;padding:0 0 2mm 6mm;font-size:10pt;line-height:1.5;color:var(--evp-ink);white-space:pre-line;counter-increment:evp-feit;break-inside:avoid}
.evp-punten li:last-child{padding-bottom:0}
.evp-punten li::before{content:counter(evp-feit);position:absolute;left:.2mm;top:0;font-weight:700;color:var(--evp-cito);font-variant-numeric:tabular-nums}
.evp-bron{display:block;margin-top:.2mm;font-size:9pt;line-height:1.45;color:var(--evp-ink2)}
/* wat we van 3sides vragen: het blok dat naar 3sides gaat */
.evp-vragen{margin-top:3.8mm;padding:2.6mm 3.8mm 3mm;border:1px solid #9bd0db;border-left:1.3mm solid #0e7490;border-radius:2mm;background:#f1fafb;break-inside:avoid}
.evp-vragen > h4{margin:0 0 1mm;font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#0b5f75;break-after:avoid}
.evp-vragen > p{margin:0;font-size:10.5pt;line-height:1.5;color:var(--evp-ink);white-space:pre-line}
.evp-vraag{display:flex;gap:3mm;align-items:flex-start;margin-top:3.6mm;padding:3mm 3.8mm;border-radius:2mm;background:var(--evp-vlak);border:1.4px solid var(--evp-cito);break-inside:avoid}
.evp-vraag svg{flex:none;width:6mm;height:6mm;margin-top:.4mm;color:var(--evp-cito)}
.evp-vraag h4{margin:0 0 .6mm;font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-cito)}
.evp-vraag p{margin:0;font-size:11pt;font-weight:700;line-height:1.45;color:var(--evp-cito);white-space:pre-line}
/* alleen intern: een eigen deel met een streep links over de hele lengte, ook na een paginawissel */
.evp-intern{margin-top:5mm;padding:.4mm 0 .6mm 4mm;border-left:1.1mm solid #7c8aa0}
.evp-intern-kop{display:flex;flex-wrap:wrap;align-items:center;gap:1mm 2.6mm;margin:0 0 2.8mm;break-after:avoid}
.evp-intern-kop b{font-size:9pt;font-weight:700;line-height:1.4;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;color:#fff;background:var(--evp-cito);border-radius:999px;padding:.3mm 3mm .4mm}
.evp-intern-kop span{font-size:9.5pt;line-height:1.4;color:var(--evp-ink2)}
.evp-zelf{margin-bottom:3.4mm;padding:2.6mm 3.8mm 3mm;border:1.3px dashed #5f7896;border-radius:2mm;background:#f4f6f9;break-inside:avoid}
.evp-zelf > h4{margin:0 0 1mm;font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-cito);break-after:avoid}
.evp-zelf > p{margin:0;font-size:10.5pt;line-height:1.5;color:var(--evp-ink);white-space:pre-line}
.evp-gegevens{display:flex;flex-wrap:wrap;align-items:baseline;gap:1.5mm 10mm;margin:0;break-inside:avoid}
.evp-gegevens > div{display:flex;flex-wrap:wrap;align-items:baseline;gap:1mm 2.6mm}
.evp-gegevens dt{font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-cito)}
.evp-gegevens dd{margin:0;font-size:10.5pt;line-height:1.4;color:var(--evp-ink)}
.evp-pil{--k:#374151;--kb:#f3f4f6;--kr:#9ca3af;display:inline-block;font-size:9.5pt;font-weight:700;line-height:1.35;border:1.3px solid var(--kr);border-radius:999px;padding:.4mm 3mm .5mm;color:var(--k);background:var(--kb)}
.evp-pil-goed{--k:#047857;--kb:#ecfdf5;--kr:#6ee7b7}
.evp-pil-deels{--k:#1d4ed8;--kb:#eff6ff;--kr:#93c5fd}
.evp-pil-onvoldoende{--k:#92400e;--kb:#fffbeb;--kr:#f59e0b}
.evp-pil-leeg{font-weight:600;font-style:italic;border-style:dashed;background:#fff}
.evp-notitie{margin:1.6mm 0 0;font-size:10pt;line-height:1.5;color:var(--evp-ink);white-space:pre-line}
.evp-onder{margin-top:3.8mm}
.evp-onder > h4{margin:0 0 1.4mm;font-size:9pt;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--evp-ink3);break-after:avoid}
.evp-onder dl{margin:0}
.evp-onder dl > div{padding:1.6mm 0 1.8mm;border-top:1px solid #e7ebf0}
.evp-onder dt{font-size:9.5pt;font-weight:700;line-height:1.4;color:var(--evp-ink);break-after:avoid}
.evp-onder dd{margin:.4mm 0 0;font-size:9.5pt;line-height:1.5;color:var(--evp-ink2)}
.evp-onder dd p{margin:0;white-space:pre-line;orphans:3;widows:3}
.evp-onder dd p + p{margin-top:1.3mm}
.evp-onder dd b{font-weight:700;color:var(--evp-ink)}
.evp-mini{--k:#4a5565;--kb:#f1f5f9;--kr:#cbd5e1;display:inline-block;font-size:9pt;font-weight:700;line-height:1.3;border:1px solid var(--kr);border-radius:999px;padding:0 2.2mm .1mm;color:var(--k);background:var(--kb)}
.evp-mini-ja{--k:#047857;--kb:#ecfdf5;--kr:#a7f3d0}
.evp-mini-deels{--k:#1d4ed8;--kb:#eff6ff;--kr:#bfdbfe}
.evp-mini-needeels{--k:#92400e;--kb:#fffbeb;--kr:#fcd34d}
.evp-mini-nee{--k:#b42318;--kb:#fef3f2;--kr:#fecdca}
.evp-legenda{margin:0;font-size:9pt;line-height:1.5;color:var(--evp-ink2);white-space:pre-line}
.evp a.ok-bron{color:var(--evp-cito)}
.evp .ok-bron-i{display:none}

/* ---------- blokken uit de app ---------- */
.evp .evp-app > .okd{background:transparent;border:0;border-radius:0;padding:0}
.evp .evp-app .okd > .ok-top,.evp .evp-app .okd > .okd-toc,.evp .evp-app .okd > #sec-evp-gegevens,.evp .evp-app .okd-sec > .okd-kop,.evp .evp-app .okd-sec > .ok-sub{display:none}
.evp .evp-app .okd > .okd-sec,.evp .evp-app .okd > .okd-sec + .okd-sec{margin-top:0;padding-top:0;border-top:0}
.evp .evp-app .okd .okd-blokken{display:block;margin-top:0}
.evp .evp-app .okd .okd-blokken > * + *{margin-top:12px}
.evp .evp-app .okd .okd-p,.evp .evp-app .okd .ok-sub{max-width:none}
/* wat op papier niets doet: tooltips, sprongen binnen de app, pijltjes bij links */
.evp .evp-app .vb-alleen-app,.evp .evp-app .tl-tip,.evp .evp-app .vb-knoppen,.evp .evp-app .wk-voet,.evp .evp-app .wk-docs-tl,.evp .evp-app .vb-doc-kaart,.evp .evp-app .wk-doc-icoon,.evp .evp-app .tl-gnaam > span[aria-hidden],.evp .evp-app .vb-ws-link > span[aria-hidden]{display:none}
.evp .evp-app a:not([href]){color:inherit;text-decoration:none;cursor:default}
.evp .evp-app a.tl-gnaam:not([href]),.evp .evp-app a.vb-ws-link:not([href]){color:var(--evp-cito)}
.evp .evp-app .wk-tl-r:hover{background:transparent}
.evp .evp-app .wk-tl-verstreken:hover{background:#fef2f2}
.evp .evp-app .tl-rij:hover,.evp .evp-app .tl-rij:hover > .tl-akt{background:#fff}
/* koppelingen naar documenten: één rustige vorm, met of zonder link */
.evp .evp-app .okd .wk-doc,.evp .evp-app .vb-doc{border-style:solid;border-color:#b6c4d6;background:#fff;color:var(--evp-cito);font-weight:600}
/* keuzelijst → vast label */
.evp .evp-app select.tl-vk,.evp .evp-app select.vb-vk{appearance:none;-webkit-appearance:none;field-sizing:content;background-image:none;padding:2px 9px;pointer-events:none;cursor:default}
/* vinkje → vast teken */
.evp .evp-app input[type="checkbox"]{appearance:none;-webkit-appearance:none;flex:none;box-sizing:border-box;width:13px;height:13px;border:1.5px solid #5f6b7a;border-radius:3px;background:#fff;pointer-events:none}
.evp .evp-app input[type="checkbox"]:checked{border-color:var(--evp-cito);background:var(--evp-cito) ${VINK} center/9px 9px no-repeat}
.evp .evp-app label,.evp .evp-app .vb-vink,.evp .evp-app .okd .wk-vink-r{cursor:default}
/* tabellen: geen schuifvak, kolommen passen zich aan het papier aan */
.evp .evp-app .ok-scroll{overflow:visible}
.evp .evp-blad:not(.evp-liggend) .evp-app .okd .okd-t td,.evp .evp-blad:not(.evp-liggend) .evp-app .okd .okd-t th{min-width:76px}
.evp .evp-app .okd table.ok-t{border:0;border-radius:0;background:transparent;overflow:visible}
.evp .evp-app .okd .ok-t th{border-top:1px solid var(--line)}
.evp .evp-app .okd .ok-t tr:last-child td{border-bottom:1px solid var(--line)}
.evp .evp-app table{break-inside:auto}
.evp .evp-app .okd-blokken > div:has(> .ok-scroll > table):not(:has(tbody > tr:nth-child(8))){break-inside:avoid}
.evp .evp-app tr,.evp .evp-app .okd-call,.evp .evp-app .ok-card,.evp .evp-app .okd .ok-kaart li{break-inside:avoid}
.evp .evp-app .okd-bt,.evp .evp-app h4,.evp .evp-app h5,.evp .evp-app h6{break-after:avoid}
/* een lang kader mag over een paginarand lopen (Afdruk.tsx zet de klasse), met de rand om elk stuk */
.evp .evp-app .okd-call.evp-breekbaar{break-inside:auto;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.evp .evp-app .okd-call.evp-breekbaar .okd-p{orphans:3;widows:3}
/* actiebord (alleen intern): de kop en de telling blijven bij de eerste groep; een lege plek
   "wie?" staat er als gewone tekst, een ingevulde naam voluit */
.evp .evp-app .okd .ab-samen{break-after:avoid}
.evp .evp-app .okd .ab-groep{box-shadow:none;break-inside:avoid}
.evp .evp-app .okd .ab-actie{break-inside:avoid}
.evp .evp-app .okd .ab-gkop{break-after:avoid}
/* een groep met meer dan tien acties past niet op één pagina: dan één kolom en mag de groep
   breken, zodat de nummers ook over de paginawissel heen op volgorde staan */
.evp .evp-app .okd .ab-breed:has(.ab-actie:nth-child(11)){break-inside:auto;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.evp .evp-app .okd .ab-breed:has(.ab-actie:nth-child(11)) .ab-lijst{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-auto-flow:row}
.evp .evp-app .okd .ab-breed:has(.ab-actie:nth-child(11)) .ab-actie.ab-kolomstart{border-top-color:#f1f5f9}
.evp .evp-app .okd .ab-actie:hover{background:transparent}
.evp .evp-app .okd .ab-wie{max-width:240px;white-space:normal;overflow:visible;text-overflow:clip}
.evp .evp-app .okd .ab-wie:not(.is-gevuld){border:0;border-radius:0;background:transparent;padding:0;font-weight:400;font-style:italic;color:var(--evp-ink3)}
.evp .evp-app .okd .ab-wie:not(.is-gevuld) svg{display:none}
/* werkstroomkaarten: liggend twee naast elkaar, zoals in de app; staand één per rij. Een kaart
   is hoger dan een pagina en breekt tussen de onderdelen, met de rand om elk stuk */
.evp .evp-blad:not(.evp-liggend) .evp-app .okd .wk-raster{display:block}
.evp .evp-blad:not(.evp-liggend) .evp-app .okd .wk-kaart + .wk-kaart{margin-top:14px}
.evp .evp-liggend .evp-app .okd .wk-raster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.evp .evp-app .okd .wk-kaart{display:flex;flex-direction:column;gap:14px;grid-row:auto;grid-template-rows:none;box-shadow:none;break-inside:auto;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.evp .evp-app .okd .wk-deel-leeg{display:none}
.evp .evp-app .okd .wk-kop,.evp .evp-app .okd .wk-waarom,.evp .evp-app .okd .wk-res > li,.evp .evp-app .okd .wk-plan,.evp .evp-app .okd .wk-tl-r,.evp .evp-app .okd .wk-pad,.evp .evp-app .okd .wk-nodig-r,.evp .evp-app .okd .wk-open > li,.evp .evp-app .okd .wk-docs{break-inside:avoid}
.evp .evp-app .okd .wk-l,.evp .evp-app .okd .wk-groep-kop{break-after:avoid}
.evp .evp-app .okd .wk-doc-jira.wk-doc-leeg{display:none}
/* tijdlijn: per werkstroom een eigen figuur met de maanden erboven; de legenda één keer */
.evp .evp-app .tl-paneel{break-inside:avoid;padding:7px 10px}
.evp .evp-app .tl-scroll{overflow:visible}
.evp .evp-app .tl-t{--tl-a:310px;--tl-s:140px;--tl-m:40px}
.evp .evp-app .tl-spoor{min-height:29px;background-image:${MAANDLIJN};background-size:calc(100% / var(--tl-n)) 100%;background-repeat:repeat-x}
.evp .evp-app .tl-spoor::before{content:"";position:absolute;top:0;bottom:0;left:0;width:calc(100% * var(--tl-nu,0));background:var(--tl-verleden)}
.evp .evp-tl-jg .tl-spoor::after{content:"";position:absolute;top:0;bottom:0;left:calc(100% * var(--evp-jg));width:2px;background:var(--tl-jaar)}
.evp .evp-app .tl-rij > .tl-akt{padding-top:5px;padding-bottom:5px}
.evp .evp-app .tl-st{padding-top:3px;padding-bottom:3px}
.evp .evp-app .tl-akt,.evp .evp-app .tl-gkop-in{position:relative}
.evp .evp-app .tl-jaar > span{position:static}
.evp .evp-app .tl-rij{break-inside:avoid}
.evp .evp-tl .okd-blokken > .tl:not(:last-child) .tl-voet{display:none}
.evp .evp-tl .okd-blokken > .tl:last-child .tl-scroll{display:none}
.evp .evp-tl .okd-blokken > .tl:last-child .tl-paneel{border:0;background:transparent;padding:0 2px}
.evp .evp-tl .okd-blokken > .tl:last-child .tl-voet{margin-top:0}
.evp .evp-tl .okd .okd-blokken > .tl:last-child{margin-top:8px;break-before:avoid}
/* voortgangsbord en kaarten: liggend de brede opzet van de app, staand de smalle. De regels van
   de app hangen aan de vensterbreedte; in print rekent de browser daarvoor met de eerste
   (staande) pagina, dus leggen we de opzet hier per paginastand vast */
.evp .evp-liggend .evp-app .vb-onder{grid-template-columns:repeat(3,minmax(0,1fr))}
/* "nog nodig" heeft de langste regels en krijgt op papier meer breedte, zoals in de Word-export:
   de werkstroom wordt daardoor lager en er passen er twee op een pagina */
.evp .evp-liggend .evp-app .vb-ws-kolommen{grid-template-columns:minmax(0,.9fr) minmax(0,1fr) minmax(0,1.4fr)}
.evp .evp-liggend .evp-app .vb-ws-kolommen .vb-item-t{flex-basis:96px}
.evp .evp-liggend .evp-app .vb-kolom-nodig{grid-column:3;grid-row:1 / span 2}
.evp .evp-liggend .evp-app .vb-ws-kop{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
.evp .evp-liggend .evp-app .okd .okd-kaarten{grid-template-columns:repeat(2,minmax(0,1fr))}
.evp .evp-blad:not(.evp-liggend) .evp-app .vb-ws-kolommen,.evp .evp-blad:not(.evp-liggend) .evp-app .vb-onder,.evp .evp-blad:not(.evp-liggend) .evp-app .vb-ws-kop{grid-template-columns:minmax(0,1fr)}
.evp .evp-blad:not(.evp-liggend) .evp-app .vb-kolom-nodig{grid-column:auto;grid-row:auto}
.evp .evp-blad:not(.evp-liggend) .evp-app .okd .okd-kaarten{grid-template-columns:minmax(0,1fr)}
.evp .evp-app .vb-tellers{grid-template-columns:repeat(5,minmax(0,1fr))}

.evp .evp-app .vb-werkstromen{display:block}
.evp .evp-app .vb-ws{break-inside:avoid}
.evp .evp-app .vb-ws + .vb-ws{margin-top:10px}
.evp .evp-app .vb-paneel,.evp .evp-app .vb-tellers,.evp .evp-app .vb-kop,.evp .evp-app .vb-item,.evp .evp-app .vb-nodig-item,.evp .evp-app .vb-voet{break-inside:avoid}
.evp .evp-app .vb-kop,.evp .evp-app .vb-tellers{break-after:avoid}

@media print{
  html:has(.evp),body:has(.evp){background:none !important}
  body:has(.evp) > :not(.evp):not(:has(.evp)){display:none !important}
  .evp{min-height:0;background:transparent}
  .evp-balk{display:none}
  .evp-papier{padding:0;overflow:visible}
  .evp-blad{width:auto;min-height:0;margin:0;background:transparent;box-shadow:none;break-before:page;-webkit-box-decoration-break:clone;box-decoration-break:clone}
  .evp-blad:first-child{break-before:auto}
  .evp-blad.evp-liggend{width:auto;min-height:0;page:evp-liggend}
}
`;
}
