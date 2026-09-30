// Matrix met gekleurde kolomkoppen, o.a. "De vijf kernprincipes in ons vermogen" (stap 11),
// in de beeldtaal van de 3sides-slide: pastelkleurige kolomkoppen met donkere tekst, een
// labelkolom met vet hoofdletterlabel en gedempt sublabel, cellen op lichtgrijs met
// gestippelde scheidingen tussen de rijen. Accent-rijen horen bij ons DIN: een lichte
// Cito-blauwe tint en een markering links. Rijsoort "domeinen": domein-ids gescheiden door
// komma's, als gekleurde domein-chips; "chips": delen gescheiden door " · ", als Cito-blauwe
// chips. Bewerkmodus: elke tekst aanpasbaar; rijen en kolommen toevoegen (+ rij, + kolom)
// en weghalen (×); per kolom de kopkleur, per rij de soort en het accent. Breed: scrolt
// binnen de eigen container (.mx-scroll), nooit de pagina.

import type { CSSProperties } from "react";
import { Keuze, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { metBronlinks } from "@/components/bewerkbaar/bron-context";
import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Matrix = BlokVan<"matrix">;
type Soort = Matrix["rijen"][number]["soort"];

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Kopkleur als een kolom geen (geldige) kleur heeft; ook de kleur van een nieuwe kolom. */
const KOP_STANDAARD = "#e2e8f0";
const LABEL_BREEDTE = 140;
const MIN_KOLOM = 140;
/** Kolom met de ×-knopjes (bewerkmodus). */
const X_BREEDTE = 30;
/** Ruimte tussen de kolommen (border-spacing), ook aan de randen. */
const TUSSENRUIMTE = 4;

/** Bewerkhint per rijsoort: hoe je chips en domeinen als platte tekst invoert. */
const HINT: Record<Soort, string> = {
  tekst: "",
  domeinen: `Domeinen gescheiden door komma's: ${DOMEINEN.map((d) => d.id).join(", ")}`,
  chips: "Onderdelen gescheiden door ' · '",
};

const SOORT_OPTIES: { waarde: Soort; label: string }[] = [
  { waarde: "tekst", label: "Tekst" },
  { waarde: "domeinen", label: "Domeinen (chips)" },
  { waarde: "chips", label: "Chips" },
];

function kopKleur(k: string): string {
  const t = k.trim();
  return HEX.test(t) ? t : KOP_STANDAARD;
}

/** Kopkleur als #rrggbb, wat een kleurkiezer (input type=color) verlangt. */
function hex6(k: string): string {
  const t = kopKleur(k).toLowerCase();
  if (t.length === 7) return t;
  if (t.length === 4) return "#" + [1, 2, 3].map((i) => t[i] + t[i]).join("");
  return KOP_STANDAARD;
}

// Wijzigingen aan de opbouw (bewerkmodus); ze werken op de kopie die zet() aanreikt.

/** Vult de cellen van elke rij aan tot het aantal kolommen, zodat er geen gaten ontstaan. */
function vulAan(m: Matrix) {
  for (const rij of m.rijen) while (rij.cellen.length < m.kolommen.length) rij.cellen.push("");
}

function voegRijToe(m: Matrix) {
  m.rijen.push({ label: "", sublabel: "", soort: "tekst", accent: false, cellen: m.kolommen.map(() => "") });
}

function voegKolomToe(m: Matrix) {
  m.kolommen.push({ titel: "Nieuwe kolom", kleur: KOP_STANDAARD });
  vulAan(m);
}

/** Haalt kolom c weg, ook de cel ervan in elke rij. */
function verwijderKolom(m: Matrix, c: number) {
  m.kolommen.splice(c, 1);
  for (const rij of m.rijen) if (rij.cellen.length > c) rij.cellen.splice(c, 1);
}

/** Domein bij een id ("mens") of een naam ("Data & Systemen"). */
function vindDomein(x: string) {
  const t = x.trim().toLowerCase();
  return domein(t) ?? DOMEINEN.find((d) => d.label.toLowerCase() === t);
}

/** Zet cel c van een rij; vult ontbrekende cellen aan zodat er geen gaten ontstaan. */
function zetCel(rij: string[], c: number, x: string) {
  while (rij.length < c) rij.push("");
  rij[c] = x;
}

/** Domein-ids (komma's) als gekleurde chips; onbekende waarden als grijze chip. */
function DomeinChips({ v }: { v: string }) {
  const delen = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (delen.length === 0) return null;
  return (
    <span className="mx-chips">
      {delen.map((x, i) => {
        const d = vindDomein(x);
        return d ? (
          <span key={i} className="mx-chip mx-chip-dom" style={{ "--mxk": d.kleur } as CSSProperties}>
            {d.label}
          </span>
        ) : (
          <span key={i} className="mx-chip mx-chip-grijs">
            {x}
          </span>
        );
      })}
    </span>
  );
}

/** Delen gescheiden door " · " als Cito-blauwe chips. */
function Chips({ v }: { v: string }) {
  const delen = v
    .split(/\s*·\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (delen.length === 0) return null;
  return (
    <span className="mx-chips">
      {delen.map((x, i) => (
        <span key={i} className="mx-chip mx-chip-cito">
          {x}
        </span>
      ))}
    </span>
  );
}

// Tekstcellen krijgen bronlinks; chips zijn werkstroom- en domeinnamen, geen bronnen.
function Cel({ v, soort }: { v: string; soort: Soort }) {
  if (soort === "domeinen") return <DomeinChips v={v} />;
  if (soort === "chips") return <Chips v={v} />;
  return <>{metBronlinks(v)}</>;
}

export default function MatrixBlok({ b, edit, zet }: LosBlokProps<"matrix">) {
  const n = b.kolommen.length;
  if (!edit && n === 0 && b.rijen.length === 0 && !b.titel) return null;
  const minBreedte =
    LABEL_BREEDTE + Math.max(1, n) * MIN_KOLOM + (n + 2) * TUSSENRUIMTE + (edit ? X_BREEDTE + TUSSENRUIMTE : 0);

  return (
    <div className="mx-blok">
      {(edit || b.titel) && (
        <h4 className="mx-titel">
          <V
            v={b.titel}
            on={(x) => zet((m) => void (m.titel = x))}
            edit={edit}
            ph="Titel van de matrix (optioneel)"
          />
        </h4>
      )}
      <div className="mx-scroll">
        <table className="mx-t" style={{ minWidth: minBreedte }} aria-label={b.titel || undefined}>
          <colgroup>
            <col style={{ width: LABEL_BREEDTE }} />
            {b.kolommen.map((_, c) => (
              <col key={c} />
            ))}
            {edit && <col style={{ width: X_BREEDTE }} />}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="mx-hoek">
                {(edit || b.hoek) && (
                  <V
                    v={b.hoek}
                    on={(x) => zet((m) => void (m.hoek = x))}
                    edit={edit}
                    ph="Hoek (optioneel)"
                  />
                )}
              </th>
              {b.kolommen.map((k, c) => (
                <th key={c} scope="col" style={{ "--mxk": kopKleur(k.kleur) } as CSSProperties}>
                  <V
                    v={k.titel}
                    on={(x) => zet((m) => void (m.kolommen[c].titel = x))}
                    edit={edit}
                    ph="Kolomtitel"
                  />
                  {edit && (
                    <span className="mx-kop-knoppen">
                      <input
                        type="color"
                        className="mx-kleur"
                        value={hex6(k.kleur)}
                        title="Kleur van de kolomkop"
                        aria-label="Kleur van de kolomkop"
                        onChange={(e) => {
                          const kleur = e.target.value;
                          zet((m) => void (m.kolommen[c].kleur = kleur));
                        }}
                      />
                      <WegKnop titel="Kolom verwijderen" on={() => zet((m) => verwijderKolom(m, c))} />
                    </span>
                  )}
                </th>
              ))}
              {edit && <th scope="col" className="mx-x" />}
            </tr>
          </thead>
          <tbody>
            {b.rijen.map((rij, r) => (
              <tr key={r} className={rij.accent ? "mx-accent" : undefined}>
                <th scope="row">
                  <V
                    v={rij.label}
                    on={(x) => zet((m) => void (m.rijen[r].label = x))}
                    edit={edit}
                    block
                    cls="mx-l"
                    ph="Label"
                  />
                  {(edit || rij.sublabel) && (
                    <V
                      v={rij.sublabel}
                      on={(x) => zet((m) => void (m.rijen[r].sublabel = x))}
                      edit={edit}
                      block
                      cls="mx-sub"
                      ph="Sublabel (optioneel)"
                    />
                  )}
                  {edit && (
                    <span className="mx-rij-opties">
                      <Keuze
                        v={rij.soort}
                        opties={SOORT_OPTIES}
                        on={(x) => zet((m) => void (m.rijen[r].soort = x))}
                        titel="Soort rij"
                      />
                      <label className="mx-accent-vink">
                        <input
                          type="checkbox"
                          checked={rij.accent}
                          onChange={(e) => {
                            const aan = e.target.checked;
                            zet((m) => void (m.rijen[r].accent = aan));
                          }}
                        />
                        Accent
                      </label>
                    </span>
                  )}
                  {edit && HINT[rij.soort] && <span className="mx-hint">{HINT[rij.soort]}</span>}
                </th>
                {b.kolommen.map((_, c) => {
                  const v = rij.cellen[c] ?? "";
                  return (
                    <td key={c}>
                      {edit ? (
                        <V
                          v={v}
                          on={(x) => zet((m) => zetCel(m.rijen[r].cellen, c, x))}
                          edit
                          ml={rij.soort !== "domeinen"}
                          ph={rij.soort === "domeinen" ? "bijv. mens, cultuur" : undefined}
                        />
                      ) : (
                        <Cel v={v} soort={rij.soort} />
                      )}
                    </td>
                  );
                })}
                {edit && (
                  <td className="mx-x">
                    <WegKnop titel="Rij verwijderen" on={() => zet((m) => void m.rijen.splice(r, 1))} />
                  </td>
                )}
              </tr>
            ))}
            {edit && (
              <tr className="mx-plusrij">
                {/* beide knoppen links, zodat ze ook bij een brede (scrollende) matrix in beeld zijn */}
                <td colSpan={n + 2} className="mx-plus">
                  <PlusKnop label="+ rij" on={() => zet(voegRijToe)} />
                  <PlusKnop label="+ kolom" on={() => zet(voegKolomToe)} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(edit || b.legenda) && (
        <div className="ok-legend mx-legenda">
          <V
            v={b.legenda}
            on={(x) => zet((m) => void (m.legenda = x))}
            edit={edit}
            ml
            ph="Legenda (optioneel)"
          />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink3, --line, --amber). --mxk = kleur van een kolomkop of domein.
export const MATRIX_CSS = `
.okd .mx-blok{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 10px 10px}
.okd .mx-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 4px 8px}
.okd .mx-scroll{overflow-x:auto}
.okd table.mx-t{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:${TUSSENRUIMTE}px 0;font-size:13px;line-height:1.45;color:#1f2f3f}
.okd .mx-t thead th{background:var(--mxk,${KOP_STANDAARD});color:#0f2a3f;font-size:13px;font-weight:700;line-height:1.3;text-align:left;vertical-align:middle;padding:10px 11px 9px;border-radius:9px 9px 0 0}
.okd .mx-t thead th.mx-hoek{background:none;padding:0 8px 9px 2px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}
.okd .mx-t tbody th,.okd .mx-t tbody td{vertical-align:top;padding:9px 11px;border-top:1.5px dotted #c5cdd8}
.okd .mx-t tbody tr:first-child th,.okd .mx-t tbody tr:first-child td{border-top:0}
.okd .mx-t tbody th{text-align:left;font-weight:400;padding-left:2px}
.okd .mx-t tbody td{background:#f3f5f8;white-space:pre-line;overflow-wrap:break-word}
.okd .mx-t tbody tr:last-child td,.okd .mx-t tbody tr:has(+ .mx-plusrij) td{border-radius:0 0 9px 9px}
.okd .mx-t tr.mx-accent th,.okd .mx-t tr.mx-accent td{background:#e8f0f9}
.okd .mx-t tr.mx-accent th{box-shadow:inset 4px 0 0 var(--cito);padding-left:12px}
.okd .mx-t tr.mx-accent td.mx-x,.okd .mx-t td.mx-x,.okd .mx-t thead th.mx-x{background:none;padding:6px 0;vertical-align:middle;text-align:center;border-radius:0}
.okd .mx-t tbody td.mx-plus{background:none;border-top:0;border-radius:0;padding:8px 2px 2px}
.okd .mx-t tbody td.mx-plus .ok-knopje{margin-right:6px}
.okd .mx-kop-knoppen{display:flex;align-items:center;gap:4px;margin-top:5px}
.okd .mx-kleur{width:26px;height:20px;padding:0;border:1px solid rgba(15,42,63,.25);border-radius:5px;background:none;cursor:pointer}
.okd .mx-rij-opties{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin-top:5px}
.okd .mx-rij-opties .ok-keuze{font-size:10.5px;padding:1px 4px}
.okd .mx-accent-vink{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;line-height:1.5;color:#0f2a3f;cursor:pointer;white-space:nowrap}
.okd .mx-accent-vink input{margin:0;accent-color:var(--cito);cursor:pointer}
.okd .mx-l{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;line-height:1.3;color:#0f2a3f}
.okd .mx-sub{display:block;margin-top:2px;font-size:10.5px;line-height:1.35;color:var(--ink3)}
.okd .mx-hint{display:block;margin-top:4px;font-size:10px;line-height:1.35;color:var(--amber)}
.okd .mx-t .ok-in{font-size:12px;text-transform:none;letter-spacing:0}
.okd .mx-t textarea.ok-in{field-sizing:content;min-height:3em}
.okd .mx-chips{display:flex;flex-wrap:wrap;gap:4px}
.okd .mx-chip{display:inline-block;max-width:100%;font-size:11px;font-weight:700;line-height:1.45;border:1px solid;border-radius:9px;padding:1px 8px;white-space:normal}
.okd .mx-chip-dom{background:color-mix(in srgb,var(--mxk) 12%,#fff);border-color:color-mix(in srgb,var(--mxk) 45%,#fff);color:color-mix(in srgb,var(--mxk) 80%,#000)}
.okd .mx-chip-cito{background:#fff;border-color:rgba(0,51,102,.45);color:var(--cito)}
.okd .mx-chip-grijs{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}
.okd .mx-legenda{margin:8px 4px 0}
`;
