// Generieke, bewerkbare documentweergave (o.a. stap 11 "Programma × 3sides") in de
// beeldtaal van het organigram: kop met titel, ondertitel en status, een compacte
// inhoudsopgave en per sectie blokken (tekst, kader, lijst, tabel, kaarten, lagen,
// DIN-plaat, werkstroomkaarten, tijdlijn, matrix). In bewerkmodus is elke tekst
// aanpasbaar en voeg je secties, blokken, regels, rijen, kolommen, kaarten en lagen toe
// of haal je ze weg (per blok ook ↑ ↓ om te verschuiven); de DIN-plaat werkt als een
// bord: baten, domeinen en werkstromen toevoegen, verschuiven en weghalen. Wijzigingen
// gaan onveranderlijk (kopie → aanpassen) via onChange naar de ouder; die bepaalt
// wanneer er wordt opgeslagen. Alleen gebruiken binnen een client-component.

import { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BewerkbaarDocument as DocData, DocBlok, DocSectie } from "@/lib/schemas";
import { isVerwijderd, kloon, verwijderdeSectie } from "@/lib/bewerkbaar-document";
import { Keuze, Lijst, PlusKnop, V, WegKnop, metLabel } from "@/components/bewerkbaar/velden";
import { DOC_CSS, LEESBAAR_CSS, OK_CSS } from "@/components/bewerkbaar/stijl";
import {
  SectieDocumentContext,
  SectieProvider,
  documentVanSectie,
  metBronlinks,
  sectieKaart,
} from "@/components/bewerkbaar/bron-context";
import { domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps, Zet } from "@/components/bewerkbaar/blok-typen";
import TijdlijnBlok, { TIJDLIJN_CSS } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import WerkstroomKaartenBlok, { WERKSTROOM_CSS } from "@/components/bewerkbaar/blokken/WerkstroomKaartenBlok";
import MatrixBlok, { MATRIX_CSS } from "@/components/bewerkbaar/blokken/MatrixBlok";
import KpiPlaatBlok, { KPIPLAAT_CSS } from "@/components/bewerkbaar/blokken/KpiPlaatBlok";
import VanNaarBlok, { VANNAAR_CSS } from "@/components/bewerkbaar/blokken/VanNaarBlok";
import StroomPlaatBlok, { STROOMPLAAT_CSS } from "@/components/bewerkbaar/blokken/StroomPlaatBlok";
import VoortgangsbordBlok, { VOORTGANGSBORD_CSS } from "@/components/bewerkbaar/blokken/VoortgangsbordBlok";
import StappenBlok, { STAPPEN_CSS } from "@/components/bewerkbaar/blokken/StappenBlok";
import ModelVergelijkingBlok, { MODELVERGELIJKING_CSS } from "@/components/bewerkbaar/blokken/ModelVergelijkingBlok";
import Actiebord, { ACTIEBORD_CSS } from "@/components/bewerkbaar/blokken/Actiebord";
import EvaluatieBlok from "@/components/bewerkbaar/blokken/EvaluatieBlok";
import { EVALUATIE_CSS } from "@/components/bewerkbaar/blokken/evaluatie-stijl";
import { LEADS_CSS, Leads } from "@/components/bewerkbaar/leads";
import { BlokMetOpmerkingen, OPMERKINGEN_CSS } from "@/components/bewerkbaar/Opmerkingen";
import { DocContext, DocZetContext } from "@/components/bewerkbaar/doc-context";

/** Props van de eenvoudige blokken in dit bestand (zonder linkdoelen). */
type BlokProps<T extends DocBlok["type"]> = Omit<LosBlokProps<T>, "ankers">;
type Toon = BlokVan<"callout">["toon"];

// Kleur per laag van de kapstok: doel → baat → vermogen → gedrag → inspanning.
const LAAG_KLEUREN = new Map<string, string>([
  ["doel", "#003366"],
  ["baat", "#0066cc"],
  ["vermogen", "#0e7490"],
  ["gedrag", "#6d28d9"],
  ["inspanning", "#b45309"],
]);
const NEUTRAAL = "#64748b";
const LAAG_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "doel", label: "Doel" },
  { waarde: "baat", label: "Baat" },
  { waarde: "vermogen", label: "Vermogen" },
  { waarde: "gedrag", label: "Gedrag" },
  { waarde: "inspanning", label: "Inspanning" },
  { waarde: "", label: "Neutraal" },
];
const TOON_OPTIES: { waarde: Toon; label: string }[] = [
  { waarde: "info", label: "Toelichting (lichtblauw)" },
  { waarde: "let-op", label: "Let op (amber)" },
  { waarde: "besluit", label: "Besluit (Cito-blauw)" },
];

function laagToken(kleur: string): string {
  const t = kleur.trim().toLowerCase();
  return LAAG_KLEUREN.has(t) ? t : "";
}

function laagKleur(kleur: string): string {
  return LAAG_KLEUREN.get(laagToken(kleur)) ?? NEUTRAAL;
}

/**
 * Kleur van een oordeel-chip op basis van de tekst (bevat, hoofdletterongevoelig).
 * Volgorde: groen → blauw → amber → grijs. "Aanvulling" (blauw) en "aanvullen"
 * (amber) zijn verschillende woorden en worden elk apart herkend. "Ligt er" telt niet
 * als groen bij een ontkenning ("ligt er nog niet").
 */
function chipSoort(v: string): "groen" | "blauw" | "amber" | "grijs" {
  const t = v.toLowerCase().trim();
  const bevat = (...woorden: string[]) => woorden.some((w) => t.includes(w));
  const ligtEr = t.includes("ligt er") && !/\bniet\b/.test(t);
  // oordeel "geleverd?": ja (groen), waarschijnlijk (blauw), nee of nee, deels (amber), niet gestart (grijs)
  if (/^ja\b/.test(t) || bevat("sluit aan", "staat erin") || ligtEr) return "groen";
  if (/^nee\b/.test(t)) return "amber";
  if (bevat("waarschijnlijk", "aanvulling", "deels")) return "blauw";
  if (bevat("verschil", "ontbreekt", "aanvullen")) return "amber";
  return "grijs";
}

/** Zet cel c van een rij; vult ontbrekende cellen aan zodat er geen gaten ontstaan. */
function zetCel(rij: string[], c: number, x: string) {
  while (rij.length < c) rij.push("");
  rij[c] = x;
}

// Keuzemenu voor een cel in de chipkolom van een tabel (bewerkmodus): de vaste oordelen,
// plus "Anders…" voor een eigen tekst. De kleur van de chip volgt uit chipSoort.
const CHIP_WAARDEN = ["Staat erin", "Deels", "Ontbreekt", "Ligt er", "Aanvullen", "Sluit aan", "Aanvulling", "Verschil"];
/** waarde van de optie "Anders…" (komt nooit in de tekst terecht) */
const ANDERS = "\u0000anders";
const CHIP_OPTIES: { waarde: string; label: string }[] = [
  { waarde: "", label: "Kies…" },
  ...CHIP_WAARDEN.map((w) => ({ waarde: w, label: w })),
  { waarde: ANDERS, label: "Anders…" },
];

/**
 * Cel in de chipkolom (bewerkmodus): keuzemenu met de vaste oordelen; bij "Anders…" of
 * een waarde die niet in de lijst staat, daaronder een vrij tekstveld met de huidige
 * waarde, zodat bestaande teksten bewaard blijven.
 */
function ChipKeuze({ v, on }: { v: string; on: (x: string) => void }) {
  // "Anders…" gekozen: het tekstveld blijft staan, ook als de tekst (nog) leeg is.
  const [anders, setAnders] = useState(false);
  const bekend = CHIP_WAARDEN.includes(v);
  const vrij = anders || (!bekend && v !== "");
  return (
    <div className="okd-chip-keuze">
      <Keuze
        v={vrij ? ANDERS : v}
        opties={CHIP_OPTIES}
        on={(x) => {
          if (x === ANDERS) {
            setAnders(true);
            return;
          }
          setAnders(false);
          on(x);
        }}
        titel="Oordeel"
      />
      {vrij && <V v={v} on={on} edit ph="Eigen tekst" />}
    </div>
  );
}

function nieuweSectie(): DocSectie {
  return {
    id: "sec-" + Date.now().toString(36),
    titel: "Nieuwe sectie",
    intro: "",
    blokken: [{ type: "tekst", tekst: "" }],
  };
}

/** Naam van een bloktype in de werkbalk van het blok (bewerkmodus). */
const BLOK_NAMEN: Record<DocBlok["type"], string> = {
  tekst: "Tekst",
  callout: "Kader",
  lijst: "Lijst",
  tabel: "Tabel",
  kaarten: "Kaarten",
  lagen: "Lagen",
  dinplaat: "DIN-plaat",
  werkstromen: "Werkstroomkaarten",
  tijdlijn: "Tijdlijn",
  matrix: "Matrix",
  stappen: "Stappenplaat",
  kpiplaat: "KPI-plaat",
  vannaar: "Van-naar",
  stroomplaat: "Stroomplaat",
  voortgangsbord: "Voortgangsbord",
  modelvergelijking: "Modelvergelijking",
  evaluatie: "Evaluatiebord",
};

/** Korte naam van een blok voor een opmerking: soort plus titel, als die er is ("Tabel: Geleverd?"). */
function blokNaam(b: DocBlok): string {
  const soort = BLOK_NAMEN[b.type] ?? b.type;
  const titel = "titel" in b && typeof b.titel === "string" ? b.titel.trim() : "";
  return titel ? `${soort}: ${titel.length > 60 ? titel.slice(0, 58).trimEnd() + "…" : titel}` : soort;
}

/** Bloktypen die je in een sectie kunt toevoegen ("+ blok"). */
type NieuwSoort = "tekst" | "lijst" | "tabel" | "callout";
const NIEUW_BLOK_OPTIES: { waarde: NieuwSoort; label: string }[] = [
  { waarde: "tekst", label: "Tekst" },
  { waarde: "lijst", label: "Lijst" },
  { waarde: "tabel", label: "Tabel" },
  { waarde: "callout", label: "Kader" },
];

function nieuwBlok(soort: NieuwSoort): DocBlok {
  switch (soort) {
    case "lijst":
      return { type: "lijst", titel: "", items: [""] };
    case "tabel":
      return { type: "tabel", titel: "", kolommen: ["Kolom 1", "Kolom 2"], rijen: [["", ""]], legenda: "" };
    case "callout":
      return { type: "callout", toon: "info", titel: "", tekst: "" };
    default:
      return { type: "tekst", tekst: "" };
  }
}

// Kolommen van een tabel of lagenblok (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegTabelKolomToe(n: BlokVan<"tabel">) {
  n.kolommen.push("Nieuwe kolom");
  for (const rij of n.rijen) while (rij.length < n.kolommen.length) rij.push("");
}

/** Haalt kolom c weg, ook de cel ervan in elke rij; chip-, groep- en invulkolom schuiven mee of vervallen. */
function verwijderTabelKolom(n: BlokVan<"tabel">, c: number) {
  n.kolommen.splice(c, 1);
  for (const rij of n.rijen) if (rij.length > c) rij.splice(c, 1);
  const schuif = (k: number | undefined) => (k === undefined || k === c ? undefined : k > c ? k - 1 : k);
  n.chipKolom = schuif(n.chipKolom);
  n.groepKolom = schuif(n.groepKolom);
  n.invulKolom = schuif(n.invulKolom);
}

function voegLaagKolomToe(n: BlokVan<"lagen">) {
  n.kolommen.push("Nieuwe kolom");
  for (const l of n.lagen) while (l.cellen.length < n.kolommen.length) l.cellen.push("");
}

function verwijderLaagKolom(n: BlokVan<"lagen">, c: number) {
  n.kolommen.splice(c, 1);
  for (const l of n.lagen) if (l.cellen.length > c) l.cellen.splice(c, 1);
}

// ---------- blokken ----------

function TekstBlok({ b, edit, zet }: BlokProps<"tekst">) {
  if (!edit) return b.tekst ? <p className="okd-p">{metBronlinks(b.tekst)}</p> : null;
  return <V v={b.tekst} on={(x) => zet((n) => void (n.tekst = x))} edit ml ph="Tekst" />;
}

function CalloutBlok({ b, edit, zet }: BlokProps<"callout">) {
  const cls = "okd-call okd-call-" + b.toon;
  if (!edit) {
    if (!b.titel && !b.tekst) return null;
    return (
      <div className={cls} role="note">
        {b.titel && <b className="okd-call-t">{metBronlinks(b.titel)}</b>}
        <div className="okd-call-tekst">{metBronlinks(b.tekst)}</div>
      </div>
    );
  }
  return (
    <div className={cls + " okd-call-edit"}>
      <div className="ok-rij">
        <V v={b.titel} on={(x) => zet((n) => void (n.titel = x))} edit ph="Titel (optioneel)" />
        <Keuze v={b.toon} opties={TOON_OPTIES} on={(x) => zet((n) => void (n.toon = x))} titel="Soort kader" />
      </div>
      <V v={b.tekst} on={(x) => zet((n) => void (n.tekst = x))} edit ml ph="Tekst" />
    </div>
  );
}

/** "1 · Eén model: …": elke regel begint met een nummer; dan tonen we een genummerde lijst. */
const NUMMER_REGEL = /^\s*(\d+)\s*·\s+([\s\S]*)$/;

function LijstBlok({ b, edit, zet }: BlokProps<"lijst">) {
  if (!edit && !b.titel && b.items.length === 0) return null;
  // stappen of agendapunten ("1 · …", "2 · …"): cijfers in plaats van puntjes
  const genummerd = !edit && b.items.length > 1 && b.items.every((s) => NUMMER_REGEL.test(s));
  return (
    <div className="ok-kaart">
      {(edit || b.titel) && (
        <h4>
          <V
            v={b.titel}
            on={(x) => zet((n) => void (n.titel = x))}
            edit={edit}
            ph="Titel van de lijst (optioneel)"
          />
        </h4>
      )}
      {genummerd ? (
        <ol className="okd-nl">
          {b.items.map((s, i) => {
            const m = NUMMER_REGEL.exec(s);
            return (
              <li key={i}>
                <span className="okd-nl-n" aria-hidden="true">
                  {m ? m[1] : i + 1}
                </span>
                <span className="okd-nl-t">{metLabel(m ? m[2] : s)}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Lijst items={b.items} edit={edit} on={(items) => zet((n) => void (n.items = items))} />
      )}
    </div>
  );
}

function TabelBlok({ b, edit, zet }: BlokProps<"tabel">) {
  const chip = b.chipKolom;
  const isChip = (c: number) => !edit && c === chip;
  // weergave als actiebord (kaart per groep); bewerken blijft de tabel hieronder
  const bord = !edit && b.groepKolom !== undefined && b.groepKolom >= 0 && b.groepKolom < b.kolommen.length;
  if (bord) {
    return (
      <div>
        {b.titel && (
          <h4 className="okd-bt">
            <V v={b.titel} on={() => {}} edit={false} />
          </h4>
        )}
        <Actiebord b={b} />
        {b.legenda && (
          <div className="ok-legend">
            <V v={b.legenda} on={() => {}} edit={false} ml />
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      {(edit || b.titel) && (
        <h4 className="okd-bt">
          <V
            v={b.titel}
            on={(x) => zet((n) => void (n.titel = x))}
            edit={edit}
            ph="Titel van de tabel (optioneel)"
          />
        </h4>
      )}
      <div className="ok-scroll">
        <table className={"ok-t okd-t" + (edit ? "" : " okd-t-stapel")}>
          <thead>
            <tr>
              {b.kolommen.map((k, c) => (
                <th key={c} className={isChip(c) ? "c" : undefined}>
                  <V v={k} on={(x) => zet((n) => void (n.kolommen[c] = x))} edit={edit} ph="Kolom" />
                  {edit && (
                    <div className="okd-kolom-knop">
                      <WegKnop titel="Kolom verwijderen" on={() => zet((n) => verwijderTabelKolom(n, c))} />
                    </div>
                  )}
                </th>
              ))}
              {edit && (
                <th className="x okd-kolom-plus">
                  <PlusKnop label="+ kolom" on={() => zet(voegTabelKolomToe)} />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {b.rijen.map((rij, r) => (
              <tr key={r}>
                {b.kolommen.map((_, c) => {
                  const v = rij[c] ?? "";
                  return (
                    <td key={c} className={isChip(c) ? "c" : c === 0 ? "k" : undefined} data-kop={b.kolommen[c] ?? ""}>
                      {edit && c === chip ? (
                        <ChipKeuze v={v} on={(x) => zet((n) => zetCel(n.rijen[r], c, x))} />
                      ) : edit ? (
                        <V v={v} on={(x) => zet((n) => zetCel(n.rijen[r], c, x))} edit ml />
                      ) : isChip(c) ? (
                        v ? <span className={"okd-chip okd-chip-" + chipSoort(v)}>{v}</span> : null
                      ) : (
                        metBronlinks(v)
                      )}
                    </td>
                  );
                })}
                {edit && (
                  <td className="x">
                    <WegKnop titel="Rij verwijderen" on={() => zet((n) => void n.rijen.splice(r, 1))} />
                  </td>
                )}
              </tr>
            ))}
            {edit && (
              <tr>
                <td colSpan={b.kolommen.length + 1}>
                  <PlusKnop label="+ rij" on={() => zet((n) => void n.rijen.push(n.kolommen.map(() => "")))} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(edit || b.legenda) && (
        <div className="ok-legend">
          <V
            v={b.legenda}
            on={(x) => zet((n) => void (n.legenda = x))}
            edit={edit}
            ml
            ph="Legenda (optioneel)"
          />
        </div>
      )}
    </div>
  );
}

function KaartenBlok({ b, edit, zet }: BlokProps<"kaarten">) {
  return (
    <div className="okd-kaarten">
      {b.kaarten.map((k, ki) => (
        <div key={ki} className="ok-card">
          <h4>
            <V v={k.titel} on={(x) => zet((n) => void (n.kaarten[ki].titel = x))} edit={edit} ph="Titel" />
            {edit && <WegKnop titel="Kaart verwijderen" on={() => zet((n) => void n.kaarten.splice(ki, 1))} />}
          </h4>
          {(edit || k.ondertitel) && (
            <V
              v={k.ondertitel}
              on={(x) => zet((n) => void (n.kaarten[ki].ondertitel = x))}
              edit={edit}
              cls="okd-kaart-sub"
              block
              ph="Ondertitel (optioneel)"
            />
          )}
          <dl>
            {k.regels.map((r, ri) => (
              <Fragment key={ri}>
                <dt className={r.accent ? "okd-accent" : undefined}>
                  <V
                    v={r.label}
                    on={(x) => zet((n) => void (n.kaarten[ki].regels[ri].label = x))}
                    edit={edit}
                    ph="Label"
                  />
                </dt>
                <dd className={r.accent ? "okd-accent" : undefined}>
                  {edit ? (
                    <div className="ok-rij">
                      <V
                        v={r.waarde}
                        on={(x) => zet((n) => void (n.kaarten[ki].regels[ri].waarde = x))}
                        edit
                        ml
                        ph="Waarde"
                      />
                      <label className="okd-accent-vink" title="Regel uitlichten">
                        <input
                          type="checkbox"
                          checked={!!r.accent}
                          onChange={(e) => zet((n) => void (n.kaarten[ki].regels[ri].accent = e.target.checked))}
                        />
                        accent
                      </label>
                      <WegKnop
                        titel="Regel verwijderen"
                        on={() => zet((n) => void n.kaarten[ki].regels.splice(ri, 1))}
                      />
                    </div>
                  ) : (
                    metBronlinks(r.waarde)
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
          {edit && (
            <div className="okd-onder">
              <PlusKnop
                label="+ regel"
                on={() => zet((n) => void n.kaarten[ki].regels.push({ label: "", waarde: "", accent: false }))}
              />
            </div>
          )}
        </div>
      ))}
      {edit && (
        <div>
          <PlusKnop
            label="+ kaart"
            on={() =>
              zet(
                (n) =>
                  void n.kaarten.push({ titel: "Nieuwe kaart", ondertitel: "", regels: [{ label: "", waarde: "", accent: false }] })
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function LagenBlok({ b, edit, zet }: BlokProps<"lagen">) {
  const n = b.kolommen.length;
  const naamBreedte = edit ? 150 : 112;
  const sjabloon = n > 0 ? `${naamBreedte}px repeat(${n}, minmax(150px, 1fr))` : `${naamBreedte}px`;
  return (
    <div className="ok-scroll">
      <div className="okd-lagen" style={{ minWidth: naamBreedte + n * 154 }}>
        <div className="okd-laag okd-laag-kop" style={{ gridTemplateColumns: sjabloon }}>
          <div />
          {b.kolommen.map((k, c) => (
            <div key={c}>
              <V v={k} on={(x) => zet((l) => void (l.kolommen[c] = x))} edit={edit} ph="Kolom" />
              {edit && (
                <div className="okd-kolom-knop">
                  <WegKnop titel="Kolom verwijderen" on={() => zet((l) => verwijderLaagKolom(l, c))} />
                </div>
              )}
            </div>
          ))}
        </div>
        {b.lagen.map((laag, li) => {
          const kleur = laagKleur(laag.kleur);
          return (
            <div key={li} className="okd-laag" style={{ gridTemplateColumns: sjabloon }}>
              <div className="okd-laag-naam" style={{ background: kleur }}>
                {edit ? (
                  <>
                    <V v={laag.naam} on={(x) => zet((l) => void (l.lagen[li].naam = x))} edit ph="Naam" />
                    <Keuze
                      v={laagToken(laag.kleur)}
                      opties={LAAG_OPTIES}
                      on={(x) => zet((l) => void (l.lagen[li].kleur = x))}
                      titel="Kleur van de laag"
                    />
                    <WegKnop titel="Laag verwijderen" on={() => zet((l) => void l.lagen.splice(li, 1))} />
                  </>
                ) : (
                  laag.naam
                )}
              </div>
              {b.kolommen.map((_, c) => (
                <div
                  key={c}
                  className="okd-laag-cel"
                  style={{
                    background: `color-mix(in srgb, ${kleur} 7%, #fff)`,
                    borderColor: `color-mix(in srgb, ${kleur} 24%, #fff)`,
                  }}
                >
                  <V
                    v={laag.cellen[c] ?? ""}
                    on={(x) => zet((l) => zetCel(l.lagen[li].cellen, c, x))}
                    edit={edit}
                    ml
                  />
                </div>
              ))}
            </div>
          );
        })}
        {edit && (
          <div className="okd-laag-plus">
            <PlusKnop
              label="+ laag"
              on={() =>
                zet((l) => void l.lagen.push({ naam: "", kleur: "", cellen: l.kolommen.map(() => "") }))
              }
            />
            <PlusKnop label="+ kolom" on={() => zet(voegLaagKolomToe)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- DIN-plaat ----------
// Doel → baten → vermogen → domeinen → werkstromen (inspanningen), van boven naar
// beneden; de pijlen lezen van onder naar boven (waartoe). Eerste kolom: rijlabels,
// daarna één kolom per domein. Een werkstroom staat onder de domeinen waarin hij bouwt.
// Rollen: bovenaan een lichte band "Regie over de hele keten" (programmamanagement) met
// per persoon een rolchip, en een dunne Cito-blauwe beugel langs de linkerkant van alle
// niveaus, van doel tot werkstromen; in doel, baten en vermogen een rol-label (wie dat
// niveau draagt); domeineigenaar en leads staan in hun eigen vak. De band staat buiten de
// scrollcontainer van het raster, zodat hij ook op een smal scherm helemaal leesbaar is.
// KPI's: doel, elke baat, het vermogen en elke werkstroom hebben een KPI-regel (klein,
// gedempt, onder de rol); bij het vermogen staat de meetlat: de kernprincipes als chips
// in de pastelkleuren van de matrix. Leeg = niet getoond (in bewerkmodus wel als veld).
// Een werkstroom linkt naar zijn werkstroomkaart (#wk-), anders naar een sectie (#sec-).
// Bewerkmodus werkt als een bord: baten, domeinen en werkstromen toevoegen, verschuiven
// en weghalen; per werkstroom de domeinen aanvinken (de plaatsing volgt). De ankers en
// de kleuren van de vier DIN-domeinen liggen vast; een nieuw domein krijgt een kleur uit
// een klein palet en een id dat zijn naam volgt.

type Plaat = BlokVan<"dinplaat">;
type PlaatDomein = Plaat["domeinen"][number];

/** Plek van een werkstroom onder de domeinen (kolomnummers vanaf 0, tot = inclusief). */
type WsPlek = {
  wi: number;
  /** kolommen van de domeinen waarin de werkstroom bouwt, in de volgorde van de plaat */
  idx: number[];
  van: number;
  tot: number;
  /** bouwt in alle domeinen: eigen rij over de hele breedte, gestippelde rand */
  overal: boolean;
  /** domeinen niet aaneengesloten: het vak loopt over het gat heen, dus "Bouwt in" tonen */
  los: boolean;
};

const CITO = "#003366";
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Rijnummers in het raster; de pijlen staan op de rijen ertussen. */
const RIJ = { doel: 1, baten: 3, vermogen: 5, domeinen: 7, werkstromen: 9 } as const;

/** Kleuren voor domeinen die de gebruiker toevoegt; de vier DIN-domeinen houden hun eigen kleur. */
const DOMEIN_PALET = ["#0e7490", "#be185d", "#4d7c0f", "#c2410c", "#4338ca", "#475569"];

/** Kleur van een domein: uit de inhoud (hex), anders de vaste DIN-kleur bij het id, anders grijs. */
function domeinKleur(d: { id: string; kleur: string }): string {
  const t = d.kleur.trim();
  if (HEX.test(t)) return t;
  return domein(d.id)?.kleur ?? NEUTRAAL;
}

/** Eerste kleur uit het palet die nog geen domein heeft; zijn ze allemaal in gebruik, dan om de beurt. */
function nieuweDomeinKleur(domeinen: PlaatDomein[]): string {
  const inGebruik = new Set(domeinen.map((d) => domeinKleur(d).toLowerCase()));
  return DOMEIN_PALET.find((k) => !inGebruik.has(k)) ?? DOMEIN_PALET[domeinen.length % DOMEIN_PALET.length];
}

/** "Data & Systemen" → "data-systemen": kleine letters en koppeltekens, zonder accenten. */
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Id dat niet botst met de bezette ids: basis, basis-2, basis-3, … */
function uniekId(basis: string, bezet: ReadonlySet<string>): string {
  if (!bezet.has(basis)) return basis;
  for (let n = 2; ; n++) if (!bezet.has(`${basis}-${n}`)) return `${basis}-${n}`;
}

/** Verplaatst element `van` naar plek `naar`; buiten de lijst gebeurt er niets. */
function verplaats<T>(lijst: T[], van: number, naar: number) {
  if (naar < 0 || naar >= lijst.length || van === naar) return;
  const [x] = lijst.splice(van, 1);
  lijst.splice(naar, 0, x);
}

// Wijzigingen aan de plaat (bewerkmodus); ze werken op de kopie die zet() aanreikt.

function voegBaatToe(n: Plaat) {
  n.baten.push({ titel: "Nieuwe baat", tekst: "", rol: "", kpi: "" });
}

function voegDomeinToe(n: Plaat) {
  const naam = "Nieuw domein";
  n.domeinen.push({
    id: uniekId(slug(naam), new Set(n.domeinen.map((d) => d.id))),
    naam,
    kleur: nieuweDomeinKleur(n.domeinen),
    vermogensdeel: "",
    eigenaar: "",
    inspanningen: "",
  });
}

/**
 * Zet de naam van een domein. Bij een eigen (niet-DIN) domein volgt het id de naam,
 * zodat het id iets zegt; de verwijzingen vanuit de werkstromen gaan mee.
 */
function zetDomeinNaam(n: Plaat, i: number, naam: string) {
  const d = n.domeinen[i];
  d.naam = naam;
  if (domein(d.id)) return;
  const basis = slug(naam);
  if (!basis) return;
  const bezet = new Set(n.domeinen.filter((x) => x !== d).map((x) => x.id));
  const nieuw = uniekId(basis, bezet);
  if (nieuw === d.id) return;
  const oud = d.id;
  d.id = nieuw;
  for (const w of n.werkstromen) w.domeinen = w.domeinen.map((id) => (id === oud ? nieuw : id));
}

/** Haalt een domein weg, ook uit de domeinlijst van elke werkstroom. */
function verwijderDomein(n: Plaat, i: number) {
  const [d] = n.domeinen.splice(i, 1);
  if (!d) return;
  for (const w of n.werkstromen) w.domeinen = w.domeinen.filter((id) => id !== d.id);
}

function voegWerkstroomToe(n: Plaat) {
  n.werkstromen.push({ naam: "Nieuwe werkstroom", anker: "", domeinen: [], leads: "", oplevert: "", planVanAanpak: "", kpi: "" });
}

/** Vinkt een domein aan of uit bij een werkstroom; de lijst houdt de volgorde van de plaat. */
function zetWerkstroomDomein(n: Plaat, wi: number, id: string, aan: boolean) {
  const w = n.werkstromen[wi];
  const gekozen = new Set(w.domeinen);
  if (aan) gekozen.add(id);
  else gekozen.delete(id);
  w.domeinen = n.domeinen.map((d) => d.id).filter((x) => gekozen.has(x));
}

/**
 * Linkdoel van een werkstroom in de plaat: zijn werkstroomkaart (#wk-), anders een
 * sectie met dat id (#sec-), anders geen link (geen dode links).
 */
function werkstroomDoel(anker: string, ankers: ReadonlySet<string>): string | null {
  if (!anker) return null;
  if (ankers.has("wk-" + anker)) return "wk-" + anker;
  if (ankers.has("sec-" + anker)) return "sec-" + anker;
  return null;
}

/** Stijl van een vak plus de kleur als CSS-variabele --dpk (rand, tint en titel). */
function metKleur(kleur: string, stijl: CSSProperties): CSSProperties {
  return { ...stijl, "--dpk": kleur } as CSSProperties;
}

/**
 * Verdeelt de werkstromen in rijen onder de domeinen. Een werkstroom staat onder zijn
 * eerste t/m laatste domein; overlapt hij met een werkstroom die al in een rij staat,
 * dan schuift hij door naar de eerste rij waar hij wel past. Werkstromen over alle
 * domeinen (of zonder bekend domein) krijgen onderaan elk een eigen rij over de hele breedte.
 */
function plaatsWerkstromen(p: Plaat): WsPlek[][] {
  const ids = p.domeinen.map((d) => d.id);
  const deel: WsPlek[][] = [];
  const heel: WsPlek[][] = [];
  p.werkstromen.forEach((w, wi) => {
    const idx = Array.from(new Set(w.domeinen.map((id) => ids.indexOf(id)).filter((i) => i >= 0))).sort(
      (a, b) => a - b
    );
    if (idx.length === 0 || (ids.length > 1 && idx.length === ids.length)) {
      heel.push([{ wi, idx, van: 0, tot: Math.max(0, ids.length - 1), overal: idx.length > 0, los: false }]);
      return;
    }
    const van = idx[0];
    const tot = idx[idx.length - 1];
    const plek: WsPlek = { wi, idx, van, tot, overal: false, los: tot - van + 1 > idx.length };
    const rij = deel.find((r) => r.every((q) => q.tot < van || q.van > tot));
    if (rij) rij.push(plek);
    else deel.push([plek]);
  });
  return [...deel, ...heel];
}

/**
 * Verbinding tussen twee lagen van de plaat, te lezen van onder naar boven: een dunne lijn
 * door het midden met een label-pil en een pijl in de kleur van het niveau erboven.
 */
function Pijl({ rij, kolom, kleur, children }: { rij: number; kolom: string; kleur: string; children: ReactNode }) {
  return (
    <div className="okd-dp-pijl" style={{ gridRow: rij, gridColumn: kolom, ["--pk" as string]: kleur } as CSSProperties}>
      <span className="okd-dp-pijl-pil">
        <span className="okd-dp-pijl-rond" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M6 10V2.5M2.8 5.6 6 2.4l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {children}
      </span>
    </div>
  );
}

/** Klein label met tekst in een vak; in weergave weggelaten als de tekst leeg is. */
function PlaatRegel(p: {
  label: string;
  v: string;
  on: (s: string) => void;
  edit: boolean;
  ml?: boolean;
  ph: string;
}) {
  if (!p.edit && !p.v) return null;
  // In bewerkmodus een <label>, zodat het invoerveld zijn label heeft.
  const Tag = p.edit ? "label" : "div";
  return (
    <Tag className="okd-dp-r">
      <span className="okd-dp-l">{p.label}</span>
      <V v={p.v} on={p.on} edit={p.edit} ml={p.ml} block cls="okd-dp-v" ph={p.ph} />
    </Tag>
  );
}

/** Klein persoonsicoon bij een rol. */
function PersoonIcoon() {
  return (
    <svg className="okd-dp-icoon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="4.6" r="3.1" fill="currentColor" />
      <path d="M1.8 15c0-3.6 2.8-6 6.2-6s6.2 2.4 6.2 6z" fill="currentColor" />
    </svg>
  );
}

/**
 * Wie een niveau van de plaat draagt, als klein label onderin het vak:
 * "Bateneigenaar: sectormanager PO" met het deel vóór de dubbele punt vet.
 */
function Rol(p: { v: string; on: (s: string) => void; edit: boolean; ph: string }) {
  if (!p.edit && !p.v) return null;
  return (
    <div className="okd-dp-rolrij">
      {p.edit ? (
        <label className="okd-dp-rol okd-dp-rol-edit">
          <PersoonIcoon />
          <V v={p.v} on={p.on} edit ph={p.ph} />
        </label>
      ) : (
        <div className="okd-dp-rol">
          <PersoonIcoon />
          <span>{metLabel(p.v)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Hoe een niveau van de plaat wordt gemeten, als kleine gedempte regel onder de rol:
 * label "KPI" en de tekst met het deel vóór de dubbele punt vet ("Output: …").
 * In weergave weggelaten als de tekst leeg is; in bewerkmodus een veld.
 */
function Kpi(p: { v: string; on: (s: string) => void; edit: boolean; ph: string }) {
  const v = p.v ?? "";
  if (!p.edit && !v) return null;
  const Tag = p.edit ? "label" : "div";
  return (
    <Tag className={p.edit ? "okd-dp-kpi okd-dp-kpi-edit" : "okd-dp-kpi"}>
      <span className="okd-dp-kpi-l">KPI</span>
      {p.edit ? <V v={v} on={p.on} edit ml ph={p.ph} /> : <KpiChips v={v} />}
    </Tag>
  );
}

/** "Label: a · b · c" → vet label en per KPI een leesbare chip; zonder " · " gewone tekst. */
function KpiChips({ v }: { v: string }) {
  const i = v.indexOf(":");
  const label = i > 0 && i < 40 ? v.slice(0, i + 1) : "";
  const rest = label ? v.slice(i + 1) : v;
  const delen = rest.split(" · ").map((s) => s.trim()).filter(Boolean);
  return (
    <span className="okd-dp-kpi-t">
      {label && <b className="okd-dp-kpi-label">{label}</b>}
      {delen.length > 1 ? (
        <span className="okd-dp-kpi-chips">
          {delen.map((d, j) => (
            <span key={j} className="okd-dp-kpi-chip">
              {metBronlinks(d)}
            </span>
          ))}
        </span>
      ) : (
        metBronlinks(rest.trim())
      )}
    </span>
  );
}

/** Pastelkleuren van de meetlat-chips, in de volgorde van de matrix "De vijf kernprincipes". */
// Kleur per kernprincipe = kleur van het domein waar het vooral wordt opgebouwd (voorstel,
// zie de matrix "De vijf kernprincipes in ons vermogen"): klant begrijpen = Mens,
// klantinformatie benutten = Data & Systemen, eigenaarschap nemen = Cultuur,
// data-gedreven werken = Data & Systemen, samenwerken rond en met de klant = Processen.
const MEETLAT_DOMEINEN = ["mens", "data", "cultuur", "data", "processen"];

/**
 * Meetlat bij het vermogen: de kernprincipes van 3sides als chips onder de tekst.
 * In bewerkmodus is elke chip een veld, met × en "+ principe".
 */
function Meetlat(p: { items: string[]; edit: boolean; zet: Zet<Plaat> }) {
  const items = p.items ?? [];
  if (!p.edit && items.length === 0) return null;
  const kleur = (i: number): CSSProperties => {
    const d = domein(MEETLAT_DOMEINEN[i % MEETLAT_DOMEINEN.length]);
    const k = d?.kleur ?? NEUTRAAL;
    return { background: `color-mix(in srgb, ${k} 14%, #fff)`, borderColor: `color-mix(in srgb, ${k} 55%, #fff)`, color: `color-mix(in srgb, ${k} 65%, #000)` };
  };
  return (
    <div className="okd-dp-meetlat">
      <span className="okd-dp-l">Meetlat (voorstel): vijf kernprincipes van 3sides</span>
      <div className="okd-dp-chips">
        {items.map((t, i) =>
          p.edit ? (
            <span key={i} className="okd-dp-chip okd-dp-chip-edit" style={kleur(i)}>
              <V
                v={t}
                on={(x) => p.zet((n) => void ((n.vermogen.meetlat ??= [])[i] = x))}
                edit
                ph="Kernprincipe"
              />
              <WegKnop titel="Kernprincipe verwijderen" on={() => p.zet((n) => void n.vermogen.meetlat?.splice(i, 1))} />
            </span>
          ) : (
            <span key={i} className="okd-dp-chip" style={kleur(i)}>
              {metBronlinks(t)}
            </span>
          )
        )}
        {p.edit && (
          <PlusKnop label="+ principe" on={() => p.zet((n) => void (n.vermogen.meetlat ??= []).push(""))} />
        )}
      </div>
    </div>
  );
}

/** Eén persoon in de regieband: "Sanne (programmamanager: regie, aanspreekpunt)" ontleed. */
interface RegieRol {
  naam: string;
  rol: string;
  taak: string;
  /** de tekst als hij niet als "naam (rol: taak)" te lezen is */
  los: string;
}

/**
 * De regietekst ontleed: een kop vóór de eerste dubbele punt ("Programmamanagement:"),
 * daarna per " · " één persoon, elk als "naam (rol: taak)". Een deel dat niet zo te lezen
 * is, komt als losse tekst in de chip. De kop telt alleen als de dubbele punt vóór het
 * eerste haakje en de eerste " · " staat, anders is het de rol van de eerste persoon.
 */
function regieDelen(regie: string): { kop: string; rollen: RegieRol[] } {
  let rest = regie.trim();
  let kop = "";
  const i = rest.indexOf(":");
  const eerste = rest.search(/[(·]/);
  if (i > 0 && i < 48 && (eerste < 0 || i < eerste)) {
    kop = rest.slice(0, i + 1);
    rest = rest.slice(i + 1).trim();
  }
  const rollen = rest
    .split(/\s+·\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s): RegieRol => {
      const m = s.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (!m) return { naam: "", rol: "", taak: "", los: s };
      const j = m[2].indexOf(":");
      if (j < 0) return { naam: m[1], rol: m[2].trim(), taak: "", los: "" };
      return { naam: m[1], rol: m[2].slice(0, j).trim(), taak: m[2].slice(j + 1).trim(), los: "" };
    });
  return { kop, rollen };
}

/**
 * Lichte band boven de plaat: links het label "Regie over de hele keten", daarnaast de kop
 * en per persoon een rolchip ("Sanne · programmamanager: regie, aanspreekpunt").
 * In bewerkmodus één veld met de hele regietekst.
 */
function RegieBand(p: { v: string; on: (s: string) => void; edit: boolean }) {
  const { kop, rollen } = p.edit ? { kop: "", rollen: [] } : regieDelen(p.v);
  return (
    <div className="okd-dp-regie">
      <span className="okd-dp-regie-l">
        <PersoonIcoon />
        Regie over de hele keten
      </span>
      {p.edit ? (
        <V v={p.v} on={p.on} edit ml cls="okd-dp-regie-t" ph="Bijv. Programmamanagement: naam (rol: taak) · naam (rol: taak)" />
      ) : (
        <div className="okd-dp-regie-t">
          {kop && <b className="okd-dp-regie-kop">{metBronlinks(kop)}</b>}
          {rollen.map((r, i) => (
            <span key={i} className="okd-dp-regie-rol">
              {r.los ? (
                metLabel(r.los)
              ) : (
                <>
                  <b>{r.naam}</b>
                  {r.rol && (
                    <>
                      <span className="okd-dp-regie-punt"> · </span>
                      <span className="okd-dp-regie-functie">
                        {r.rol}
                        {r.taak && ":"}
                      </span>
                    </>
                  )}
                  {r.taak && (
                    <>
                      {" "}
                      <span className="okd-dp-regie-taak">{metBronlinks(r.taak)}</span>
                    </>
                  )}
                </>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Knopjes rechtsboven in een vak (bewerkmodus): naar voren of naar achteren schuiven
 * (← → naast elkaar, ↑ ↓ onder elkaar) en verwijderen.
 */
function VakKnoppen(p: {
  i: number;
  n: number;
  /** de vakken staan onder elkaar (werkstromen): ↑ ↓ in plaats van ← → */
  staand?: boolean;
  /** wat er weggaat, voor de knoptekst: "Baat", "Domein", "Werkstroom" */
  wat: string;
  onSchuif: (naar: number) => void;
  onWeg: () => void;
}) {
  const knoppen = p.staand
    ? [
        { naar: p.i - 1, teken: "↑", titel: "Eerder in de volgorde" },
        { naar: p.i + 1, teken: "↓", titel: "Later in de volgorde" },
      ]
    : [
        { naar: p.i - 1, teken: "←", titel: "Naar links" },
        { naar: p.i + 1, teken: "→", titel: "Naar rechts" },
      ];
  return (
    <div className="okd-dp-knoppen">
      {knoppen.map((k) => (
        <button
          key={k.teken}
          type="button"
          className="ok-knopje"
          title={k.titel}
          aria-label={k.titel}
          disabled={k.naar < 0 || k.naar >= p.n}
          onClick={() => p.onSchuif(k.naar)}
        >
          {k.teken}
        </button>
      ))}
      <WegKnop titel={`${p.wat} verwijderen`} on={p.onWeg} />
    </div>
  );
}

function DinPlaatBlok({ b, edit, zet, ankers }: LosBlokProps<"dinplaat">) {
  const kolommen = Math.max(1, b.domeinen.length);
  const rijen = plaatsWerkstromen(b);
  const perId = new Map(b.domeinen.map((d) => [d.id, d] as const));
  const toonRegie = edit || b.regie !== "";
  // Met de regieband krijgt het raster links een smalle kolom voor de beugel.
  const o = toonRegie ? 1 : 0;
  const kolLabel = 1 + o;
  const breed = `${2 + o} / ${kolommen + 2 + o}`;
  const toonWerkstromen = rijen.length > 0 || edit;
  // Laatste rasterlijn van de plaat: tot daar loopt de beugel. De werkstromen staan in één rij
  // van even brede kaarten; per kaart laten domeinchips zien in welke domeinen hij bouwt.
  const eindRij = toonWerkstromen ? RIJ.werkstromen + 1 : RIJ.domeinen + 1;
  // Binnen de eigen scrollcontainer; in bewerkmodus breder zodat de velden leesbaar blijven
  // (900 past nog zonder scrollen in het document bij een scherm van 1280 breed).
  const minBreedte =
    (toonRegie ? 30 : 0) +
    (edit
      ? Math.max(900, 120 + kolommen * 195, 120 + b.baten.length * 190)
      : Math.max(760, 120 + kolommen * 160, 120 + b.baten.length * 150));

  return (
    <figure className="okd-dp-paneel" aria-label="Doelen-Inspanningennetwerk (DIN) in één plaat">
      {toonRegie && <RegieBand v={b.regie} on={(x) => zet((n) => void (n.regie = x))} edit={edit} />}
      <div className="ok-scroll">
        <div
          className="okd-dp"
          style={{
            gridTemplateColumns: `${toonRegie ? "22px " : ""}112px repeat(${kolommen}, minmax(0, 1fr))`,
            minWidth: minBreedte,
          }}
        >
          {toonRegie && (
            <div className="okd-dp-beugel" style={{ gridRow: `1 / ${eindRij}`, gridColumn: 1 }} aria-hidden="true">
              <span>Regie over de hele keten</span>
            </div>
          )}

          <div className="okd-dp-rl" style={{ gridRow: RIJ.doel, gridColumn: kolLabel }}>
            Doel
          </div>
          <div className="okd-dp-doel" style={{ gridRow: RIJ.doel, gridColumn: breed }}>
            <V
              v={b.doel.titel}
              on={(x) => zet((n) => void (n.doel.titel = x))}
              edit={edit}
              block
              cls="okd-dp-t"
              ph="Doel"
            />
            {(edit || b.doel.tekst) && (
              <V
                v={b.doel.tekst}
                on={(x) => zet((n) => void (n.doel.tekst = x))}
                edit={edit}
                ml
                block
                cls="okd-dp-tk"
                ph="Toelichting op het doel (optioneel)"
              />
            )}
            <Rol
              v={b.doel.rol}
              on={(x) => zet((n) => void (n.doel.rol = x))}
              edit={edit}
              ph="Rol, bijv. Programma-eigenaar: naam · functie"
            />
            <Kpi
              v={b.doel.kpi}
              on={(x) => zet((n) => void (n.doel.kpi = x))}
              edit={edit}
              ph="KPI van het doel, bijv. Impact: …"
            />
          </div>

          <Pijl rij={RIJ.doel + 1} kolom={breed} kleur="#003366">
            draagt bij aan
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: RIJ.baten, gridColumn: kolLabel }}>
            Baten
            {edit && <PlusKnop label="+ baat" on={() => zet(voegBaatToe)} />}
          </div>
          <div
            className="okd-dp-baten"
            style={{
              gridRow: RIJ.baten,
              gridColumn: breed,
              gridTemplateColumns: `repeat(${Math.max(1, b.baten.length)}, minmax(0, 1fr))`,
            }}
          >
            {b.baten.map((baat, i) => (
              <div key={i} className="okd-dp-baat">
                {edit && (
                  <VakKnoppen
                    i={i}
                    n={b.baten.length}
                    wat="Baat"
                    onSchuif={(naar) => zet((n) => verplaats(n.baten, i, naar))}
                    onWeg={() => zet((n) => void n.baten.splice(i, 1))}
                  />
                )}
                <V
                  v={baat.titel}
                  on={(x) => zet((n) => void (n.baten[i].titel = x))}
                  edit={edit}
                  block
                  cls="okd-dp-t"
                  ph="Baat"
                />
                {edit || baat.tekst ? (
                  <V
                    v={baat.tekst}
                    on={(x) => zet((n) => void (n.baten[i].tekst = x))}
                    edit={edit}
                    ml
                    block
                    cls="okd-dp-tk"
                    ph="Toelichting, bijv. baten-KPI's (optioneel)"
                  />
                ) : (
                  <div />
                )}
                <Rol
                  v={baat.rol}
                  on={(x) => zet((n) => void (n.baten[i].rol = x))}
                  edit={edit}
                  ph="Rol, bijv. Bateneigenaar: sectormanager"
                />
                <Kpi
                  v={baat.kpi}
                  on={(x) => zet((n) => void (n.baten[i].kpi = x))}
                  edit={edit}
                  ph="Baten-KPI's, bijv. 5 baten-KPI's: … · …"
                />
              </div>
            ))}
          </div>

          <Pijl rij={RIJ.baten + 1} kolom={breed} kleur="#0066cc">
            levert
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: RIJ.vermogen, gridColumn: kolLabel }}>
            Vermogen
          </div>
          <div className="okd-dp-verm" style={{ gridRow: RIJ.vermogen, gridColumn: breed }}>
            <V
              v={b.vermogen.titel}
              on={(x) => zet((n) => void (n.vermogen.titel = x))}
              edit={edit}
              block
              cls="okd-dp-t"
              ph="Vermogen"
            />
            {(edit || b.vermogen.tekst) && (
              <V
                v={b.vermogen.tekst}
                on={(x) => zet((n) => void (n.vermogen.tekst = x))}
                edit={edit}
                ml
                block
                cls="okd-dp-tk"
                ph="Toelichting op het vermogen (optioneel)"
              />
            )}
            <Meetlat items={b.vermogen.meetlat} edit={edit} zet={zet} />
            <Rol
              v={b.vermogen.rol}
              on={(x) => zet((n) => void (n.vermogen.rol = x))}
              edit={edit}
              ph="Rol, bijv. Eigenaar van het vermogen: naam · functie"
            />
            <Kpi
              v={b.vermogen.kpi}
              on={(x) => zet((n) => void (n.vermogen.kpi = x))}
              edit={edit}
              ph="KPI van het vermogen, bijv. Leidend: …"
            />
          </div>

          <Pijl rij={RIJ.vermogen + 1} kolom={breed} kleur="#0e7490">
            samen het vermogen
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: RIJ.domeinen, gridColumn: kolLabel }}>
            Domeinen
            {edit && <PlusKnop label="+ domein" on={() => zet(voegDomeinToe)} />}
          </div>
          {b.domeinen.map((d, i) => (
            <div
              key={i}
              className="okd-dp-dom"
              style={metKleur(domeinKleur(d), { gridRow: RIJ.domeinen, gridColumn: i + 2 + o })}
            >
              {edit && (
                <VakKnoppen
                  i={i}
                  n={b.domeinen.length}
                  wat="Domein"
                  onSchuif={(naar) => zet((n) => verplaats(n.domeinen, i, naar))}
                  onWeg={() => zet((n) => verwijderDomein(n, i))}
                />
              )}
              <V
                v={d.naam}
                on={(x) => zet((n) => zetDomeinNaam(n, i, x))}
                edit={edit}
                block
                cls="okd-dp-dom-t"
                ph="Naam van het domein"
              />
              <PlaatRegel
                label="Bouwt aan"
                v={d.vermogensdeel}
                on={(x) => zet((n) => void (n.domeinen[i].vermogensdeel = x))}
                edit={edit}
                ml
                ph="Welk deel van het vermogen"
              />
              <PlaatRegel
                label="Domeineigenaar"
                v={d.eigenaar}
                on={(x) => zet((n) => void (n.domeinen[i].eigenaar = x))}
                edit={edit}
                ph="Naam, of 'te bepalen'"
              />
              <PlaatRegel
                label="In het DIN"
                v={d.inspanningen}
                on={(x) => zet((n) => void (n.domeinen[i].inspanningen = x))}
                edit={edit}
                ml
                ph="Inspanningen in dit domein"
              />
            </div>
          ))}

          {rijen.length > 0 && (
            <Pijl rij={RIJ.domeinen + 1} kolom={breed} kleur="#475569">
              bouwt aan
            </Pijl>
          )}
          {toonWerkstromen && (
            <div
              className="okd-dp-rl"
              style={{ gridRow: RIJ.werkstromen, gridColumn: kolLabel }}
            >
              Werkstromen (inspanningen)
              {edit && <PlusKnop label="+ werkstroom" on={() => zet(voegWerkstroomToe)} />}
            </div>
          )}
          {toonWerkstromen && b.werkstromen.length > 0 && (
            <div
              className="okd-dp-wsrij"
              style={{ gridRow: RIJ.werkstromen, gridColumn: breed, ["--wsn" as string]: Math.min(4, b.werkstromen.length) } as CSSProperties}
            >
            {b.werkstromen.map((w, wi) => {
              const eigen = w.domeinen.map((id) => perId.get(id)).filter((d): d is NonNullable<typeof d> => d !== undefined);
              const overal = b.domeinen.length > 1 && b.domeinen.every((d) => w.domeinen.includes(d.id));
              const kleur = overal ? CITO : eigen[0] ? domeinKleur(eigen[0]) : NEUTRAAL;
              const doel = edit ? null : werkstroomDoel(w.anker, ankers);
              return (
                <div
                  key={wi}
                  className={overal ? "okd-dp-ws okd-dp-ws-heel" : "okd-dp-ws"}
                  style={metKleur(kleur, {})}
                >
                  {edit && (
                    <VakKnoppen
                      i={wi}
                      n={b.werkstromen.length}
                      staand
                      wat="Werkstroom"
                      onSchuif={(naar) => zet((n) => verplaats(n.werkstromen, wi, naar))}
                      onWeg={() => zet((n) => void n.werkstromen.splice(wi, 1))}
                    />
                  )}
                  <div className="okd-dp-ws-t">
                    {edit ? (
                      <V
                        v={w.naam}
                        on={(x) => zet((n) => void (n.werkstromen[wi].naam = x))}
                        edit
                        ph="Naam van de werkstroom"
                      />
                    ) : doel ? (
                      <a href={"#" + doel}>
                        {w.naam} <span aria-hidden="true">→</span>
                      </a>
                    ) : (
                      w.naam
                    )}
                  </div>
                  {edit ? (
                    <V
                      v={w.leads}
                      on={(x) => zet((n) => void (n.werkstromen[wi].leads = x))}
                      edit={edit}
                      ml
                      block
                      cls="okd-dp-leads"
                      ph="Leads, bijv. Cito-lead · 3sides-lead"
                    />
                  ) : (
                    w.leads && <Leads tekst={w.leads} cls="okd-dp-leads" />
                  )}
                  {edit ? (
                    <div className="okd-dp-r">
                      <span className="okd-dp-l">Bouwt in</span>
                      <div className="okd-dp-vinken">
                        {b.domeinen.map((d, di) => (
                          <label key={di} className="okd-dp-vink" style={metKleur(domeinKleur(d), {})}>
                            <input
                              type="checkbox"
                              checked={w.domeinen.includes(d.id)}
                              onChange={(e) => {
                                const aan = e.target.checked;
                                zet((n) => zetWerkstroomDomein(n, wi, d.id, aan));
                              }}
                            />
                            {d.naam || "Domein zonder naam"}
                          </label>
                        ))}
                        {b.domeinen.length === 0 && <span className="okd-dp-v">Nog geen domeinen</span>}
                      </div>
                    </div>
                  ) : (
                    eigen.length > 0 && (
                      <div className="okd-dp-wsdom" aria-label="Bouwt in">
                        {overal ? (
                          <span className="okd-dp-wsdom-chip okd-dp-wsdom-alle">Alle vier de domeinen</span>
                        ) : (
                          eigen.map((d) => (
                            <span key={d.id} className="okd-dp-wsdom-chip" style={metKleur(domeinKleur(d), {})}>
                              {d.naam}
                            </span>
                          ))
                        )}
                      </div>
                    )
                  )}
                  <div className="okd-dp-velden">
                    <PlaatRegel
                      label="Levert op"
                      v={w.oplevert}
                      on={(x) => zet((n) => void (n.werkstromen[wi].oplevert = x))}
                      edit={edit}
                      ml
                      ph="Wat de werkstroom oplevert"
                    />
                    <PlaatRegel
                      label="Plan van aanpak"
                      v={w.planVanAanpak}
                      on={(x) => zet((n) => void (n.werkstromen[wi].planVanAanpak = x))}
                      edit={edit}
                      ml
                      ph="Stand van het plan van aanpak"
                    />
                  </div>
                  <Kpi
                    v={w.kpi}
                    on={(x) => zet((n) => void (n.werkstromen[wi].kpi = x))}
                    edit={edit}
                    ph="KPI van de werkstroom, bijv. Output: … · …"
                  />
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
      {(edit || b.voet) && (
        <figcaption className="ok-legend okd-dp-voet">
          <V
            v={b.voet}
            on={(x) => zet((n) => void (n.voet = x))}
            edit={edit}
            ml
            ph="Voetnoot, bijv. bron en stand (optioneel)"
          />
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Uitputtende switch over de bloktypen: een nieuw type zonder weergave geeft hier een
 * typefout. Een onbekend type uit oude opslag toont niets.
 */
function geenWeergave(b: never): null {
  void b;
  return null;
}

// ---------- sectie ----------

// Gememoiseerd: bij typen in één sectie renderen de andere secties niet opnieuw.
/** "4 · De vier werkstromen: wat 3sides doet" → nr 4, hoofd "De vier werkstromen", sub "wat 3sides doet". */
function tocDelen(titel: string, volgnr: number): { nr: string; hoofd: string; sub: string } {
  const m = /^\s*(\d+)\s*·\s*(.*)$/.exec(titel ?? "");
  const nr = m ? m[1] : String(volgnr);
  const rest = (m ? m[2] : titel ?? "").trim() || "Zonder titel";
  const i = rest.indexOf(":");
  return i > 0 ? { nr, hoofd: rest.slice(0, i).trim(), sub: rest.slice(i + 1).trim() } : { nr, hoofd: rest, sub: "" };
}

const Sectie = memo(function Sectie(p: {
  s: DocSectie;
  i: number;
  edit: boolean;
  /** verwijder-bevestiging open voor deze sectie */
  vraag: boolean;
  /** element-ids die in het document bestaan: "sec-…", "wk-…", "tl-…" (linkdoelen) */
  ankers: ReadonlySet<string>;
  onZet: (i: number, s: DocSectie) => void;
  onVraag: (id: string | null) => void;
  /** in weergave: potlood bij de sectiekop, om alleen deze sectie te bewerken */
  onBewerk?: (id: string) => void;
}) {
  const { s, i, edit, vraag, ankers, onZet, onVraag, onBewerk } = p;
  // Welk blok om bevestiging van verwijderen vraagt, en het soort van een nieuw blok.
  const [vraagBlok, setVraagBlok] = useState<number | null>(null);
  const [nieuwSoort, setNieuwSoort] = useState<NieuwSoort>("tekst");
  if (!edit && vraagBlok !== null) setVraagBlok(null);

  const upd = (fn: (n: DocSectie) => void) => {
    const n = kloon(s);
    fn(n);
    onZet(i, n);
  };

  function blokZet<T extends DocBlok["type"]>(bi: number, type: T): Zet<BlokVan<T>> {
    return (fn) =>
      upd((n) => {
        const b = n.blokken[bi];
        if (b && b.type === type) fn(b as BlokVan<T>);
      });
  }

  function blok(b: DocBlok, bi: number) {
    switch (b.type) {
      case "tekst":
        return <TekstBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "tekst")} />;
      case "callout":
        return <CalloutBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "callout")} />;
      case "lijst":
        return <LijstBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "lijst")} />;
      case "tabel":
        return <TabelBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "tabel")} />;
      case "kaarten":
        return <KaartenBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "kaarten")} />;
      case "lagen":
        return <LagenBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "lagen")} />;
      case "dinplaat":
        return <DinPlaatBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "dinplaat")} ankers={ankers} />;
      case "werkstromen":
        return (
          <WerkstroomKaartenBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "werkstromen")} ankers={ankers} />
        );
      case "tijdlijn":
        return <TijdlijnBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "tijdlijn")} ankers={ankers} />;
      case "modelvergelijking":
        return (
          <ModelVergelijkingBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "modelvergelijking")} ankers={ankers} />
        );
      case "stappen":
        return <StappenBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "stappen")} ankers={ankers} />;
      case "kpiplaat":
        return <KpiPlaatBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "kpiplaat")} ankers={ankers} />;
      case "vannaar":
        return <VanNaarBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "vannaar")} ankers={ankers} />;
      case "stroomplaat":
        return <StroomPlaatBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "stroomplaat")} ankers={ankers} />;
      case "voortgangsbord":
        return <VoortgangsbordBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "voortgangsbord")} ankers={ankers} />;
      case "matrix":
        return <MatrixBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "matrix")} ankers={ankers} />;
      case "evaluatie":
        return <EvaluatieBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "evaluatie")} ankers={ankers} />;
      default:
        return geenWeergave(b);
    }
  }

  return (
    <section id={"sec-" + s.id} className="okd-sec">
      {/* in een naslagdeel over één document wijzen kale paginanummers naar dat document */}
      <SectieDocumentContext.Provider value={documentVanSectie(s.id)}>
      <div className="okd-kop">
        <h3 className="ok-kop">
          <V v={s.titel} on={(x) => upd((n) => void (n.titel = x))} edit={edit} ph="Titel van de sectie" />
        </h3>
        {!edit && onBewerk && (
          <button type="button" className="okd-potlood" onClick={() => onBewerk(s.id)} title="Dit deel bewerken">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <path d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1l-7.6 7.6-3 .9.9-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Bewerken
          </button>
        )}
        {edit &&
          (vraag ? (
            <span className="okd-vraag" role="alert">
              Deze sectie verwijderen?
              <button
                type="button"
                onClick={() => {
                  onVraag(null);
                  onZet(i, verwijderdeSectie(s.id));
                }}
              >
                Ja
              </button>
              <button type="button" onClick={() => onVraag(null)}>
                Nee
              </button>
            </span>
          ) : (
            <WegKnop titel="Sectie verwijderen" label="× sectie" on={() => onVraag(s.id)} />
          ))}
      </div>
      {(edit || s.intro) && (
        <V
          v={s.intro}
          on={(x) => upd((n) => void (n.intro = x))}
          edit={edit}
          ml
          cls="ok-sub"
          block
          ph="Inleiding (optioneel)"
        />
      )}
      <div className="okd-blokken">
        {s.blokken.map((b, bi) =>
          edit ? (
            <div key={bi} className="okd-blok-edit">
              <div className="okd-blok-balk">
                <span className="okd-blok-soort">{BLOK_NAMEN[b.type] ?? b.type}</span>
                {vraagBlok === bi ? (
                  <span className="okd-vraag" role="alert">
                    Dit blok verwijderen?
                    <button
                      type="button"
                      onClick={() => {
                        setVraagBlok(null);
                        upd((n) => void n.blokken.splice(bi, 1));
                      }}
                    >
                      Ja
                    </button>
                    <button type="button" onClick={() => setVraagBlok(null)}>
                      Nee
                    </button>
                  </span>
                ) : (
                  <VakKnoppen
                    i={bi}
                    n={s.blokken.length}
                    staand
                    wat="Blok"
                    onSchuif={(naar) => {
                      setVraagBlok(null);
                      upd((n) => verplaats(n.blokken, bi, naar));
                    }}
                    onWeg={() => setVraagBlok(bi)}
                  />
                )}
              </div>
              {blok(b, bi)}
            </div>
          ) : (
            // weergave: elk blok kan een opmerking krijgen, zoals in Word (knop rechtsboven)
            <BlokMetOpmerkingen key={bi} sectie={s.id} blok={bi} naam={blokNaam(b)}>
              {blok(b, bi)}
            </BlokMetOpmerkingen>
          )
        )}
        {edit && (
          <div className="okd-blok-plus">
            <Keuze v={nieuwSoort} opties={NIEUW_BLOK_OPTIES} on={setNieuwSoort} titel="Soort van het nieuwe blok" />
            <PlusKnop label="+ blok" on={() => upd((n) => void n.blokken.push(nieuwBlok(nieuwSoort)))} />
          </div>
        )}
      </div>
      </SectieDocumentContext.Provider>
    </section>
  );
});

// Stijl voor de werkbalk per blok en de kolomknoppen (bewerkmodus); aanvulling op DOC_CSS.
const BLOK_CSS = `
.okd .okd-blok-edit{border:1px dashed #cbd5e1;border-radius:12px;background:rgba(255,255,255,.55);padding:6px 10px 10px}
.okd .okd-blok-balk{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.okd .okd-blok-soort{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}
.okd .okd-blok-balk .okd-dp-knoppen{margin-bottom:0}
.okd .okd-blok-plus{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.okd .okd-kolom-knop{margin-top:4px}
.okd .okd-t th.okd-kolom-plus{width:auto;min-width:0;padding:6px 8px;text-align:right}
.okd .okd-laag-plus{display:flex;flex-wrap:wrap;gap:6px}
`;

// ---------- het document ----------

/**
 * Element-ids in een sectie waar naartoe gelinkt kan worden: de sectie zelf ("sec-"),
 * de kaarten van een werkstromen-blok ("wk-") en de tijdlijngroepen met een anker ("tl-").
 */
export function linkdoelen(s: DocSectie): string[] {
  const ids = ["sec-" + s.id];
  for (const b of s.blokken) {
    if (b.type === "werkstromen") {
      for (const k of b.kaarten) if (k.id) ids.push("wk-" + k.id);
    } else if (b.type === "tijdlijn") {
      for (const g of b.groepen) if (g.anker) ids.push("tl-" + g.anker);
    }
  }
  return ids;
}

export default function BewerkbaarDocument({
  doc,
  edit,
  onChange,
  editSectie = null,
  onBewerk,
}: {
  doc: DocData;
  edit: boolean;
  onChange: (doc: DocData) => void;
  /** alleen deze sectie in bewerkmodus (de rest blijft weergave); null = volgt `edit` */
  editSectie?: string | null;
  /** potlood per sectie in weergave: begin met bewerken van alleen die sectie */
  onBewerk?: (id: string) => void;
}) {
  // Welke sectie vraagt om bevestiging van verwijderen; vervalt bij wisselen van modus.
  const [vraag, setVraag] = useState<string | null>(null);
  const [vorigeEdit, setVorigeEdit] = useState(edit);
  if (vorigeEdit !== edit) {
    setVorigeEdit(edit);
    setVraag(null);
  }

  // Stabiele sectie-callback die altijd op het laatste document werkt, zodat een
  // wijziging in één sectie de andere (gememoiseerde) secties ongemoeid laat.
  const laatste = useRef({ doc, onChange });
  useLayoutEffect(() => {
    laatste.current = { doc, onChange };
  });
  const zetSectie = useCallback((i: number, s: DocSectie) => {
    const { doc: d, onChange: wijzig } = laatste.current;
    wijzig({ ...d, secties: d.secties.map((x, j) => (j === i ? s : x)) });
  }, []);
  // Voor blokken die een ander blok bijwerken (bijv. een vinkje uit het voortgangsbord
  // op een werkstroomkaart): kopie van het hele document aanpassen en doorgeven.
  const zetDoc = useCallback((fn: (d: DocData) => void) => {
    const { doc: d, onChange: wijzig } = laatste.current;
    const n = kloon(d);
    fn(n);
    wijzig(n);
  }, []);

  // Verwijderde secties (lege markering, zie bewerkbaar-document.ts) niet tonen;
  // de index blijft die in doc.secties.
  const zichtbaar = doc.secties.flatMap((s, i) => (isVerwijderd(s) ? [] : [{ s, i }]));

  // Element-ids die in het document bestaan (secties, werkstroomkaarten, tijdlijngroepen),
  // als linkdoelen. Gememoiseerd op een sleutel van de ids zelf, zodat typen in een sectie
  // de gememoiseerde secties ongemoeid laat.
  const idSleutel = zichtbaar.flatMap(({ s }) => linkdoelen(s)).join("\n");
  const ankers = useMemo(() => new Set(idSleutel.split("\n")), [idSleutel]);

  // Sectiekaart voor "deel N"-links in de teksten: nummer uit de titel ("4 · …") → sectie-id.
  // Per document gememoiseerd; in bewerkmodus staan de teksten in velden, dus een nieuwe
  // kaart bij het typen kost daar niets.
  const secties = useMemo(() => sectieKaart(doc.secties.filter((s) => !isVerwijderd(s))), [doc]);

  return (
    <DocContext.Provider value={doc}>
    <DocZetContext.Provider value={zetDoc}>
    <SectieProvider secties={secties}>
    <div className={"ok okd rounded-xl border border-cito-border bg-[#eef1f5] p-2.5 sm:p-6" + (edit ? "" : " opm-ruimte")}>
      <style>{OK_CSS + DOC_CSS + BLOK_CSS + TIJDLIJN_CSS + WERKSTROOM_CSS + MATRIX_CSS + KPIPLAAT_CSS + VANNAAR_CSS + STROOMPLAAT_CSS + VOORTGANGSBORD_CSS + STAPPEN_CSS + MODELVERGELIJKING_CSS + ACTIEBORD_CSS + EVALUATIE_CSS + LEADS_CSS + OPMERKINGEN_CSS + LEESBAAR_CSS}</style>

      <header className="ok-top okd-top">
        {(edit || doc.status) && (
          <div className={edit ? "okd-status-edit" : "okd-status"}>
            <V
              v={doc.status}
              on={(x) => onChange({ ...doc, status: x })}
              edit={edit}
              ph="Status, bijv. intern · stand van datum"
            />
          </div>
        )}
        <h2>
          <V v={doc.titel} on={(x) => onChange({ ...doc, titel: x })} edit={edit} ph="Titel" />
        </h2>
        {(edit || doc.ondertitel) && (
          <p>
            <V
              v={doc.ondertitel}
              on={(x) => onChange({ ...doc, ondertitel: x })}
              edit={edit}
              ml
              ph="Ondertitel (optioneel)"
            />
          </p>
        )}
      </header>

      {zichtbaar.length > 0 && (
        <nav className="okd-toc" aria-label="Inhoud">
          <span className="okd-toc-kop">Inhoud</span>
          <ol className="okd-toc-lijst">
            {zichtbaar.map(({ s }, n) => {
              const d = tocDelen(s.titel, n + 1);
              return (
                <li key={s.id}>
                  <a href={"#sec-" + s.id} title={s.titel}>
                    <span className="okd-toc-nr">{d.nr}</span>
                    <span className="okd-toc-t">
                      <b>{d.hoofd}</b>
                      {d.sub && <span>{d.sub}</span>}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {zichtbaar.map(({ s, i }) => (
        <Sectie
          key={s.id}
          s={s}
          i={i}
          edit={edit || editSectie === s.id}
          vraag={vraag === s.id}
          ankers={ankers}
          onZet={zetSectie}
          onVraag={setVraag}
          onBewerk={edit || editSectie ? undefined : onBewerk}
        />
      ))}

      {edit && (
        <button
          type="button"
          className="okd-plus"
          onClick={() => onChange({ ...doc, secties: [...doc.secties, nieuweSectie()] })}
        >
          + sectie
        </button>
      )}
    </div>
    </SectieProvider>
    </DocZetContext.Provider>
    </DocContext.Provider>
  );
}
