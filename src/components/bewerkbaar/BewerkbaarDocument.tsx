// Generieke, bewerkbare documentweergave (o.a. stap 11 "Programma × 3sides") in de
// beeldtaal van het organigram: kop met titel, ondertitel en status, een compacte
// inhoudsopgave en per sectie blokken (tekst, kader, lijst, tabel, kaarten, lagen,
// DIN-plaat). In bewerkmodus is elke tekst aanpasbaar en voeg je secties, regels,
// rijen, kaarten en lagen toe of haal je ze weg; de DIN-plaat houdt een vaste opbouw
// (alleen de teksten zijn aanpasbaar). Wijzigingen gaan onveranderlijk
// (kopie → aanpassen) via onChange naar de ouder; die bepaalt wanneer er wordt
// opgeslagen. Alleen gebruiken binnen een client-component.

import { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BewerkbaarDocument as DocData, DocBlok, DocSectie } from "@/lib/schemas";
import { isVerwijderd, kloon, verwijderdeSectie } from "@/lib/bewerkbaar-document";
import { Keuze, Lijst, PlusKnop, V, WegKnop, metLabel } from "@/components/bewerkbaar/velden";
import { DOC_CSS, OK_CSS } from "@/components/bewerkbaar/stijl";
import { domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps, Zet } from "@/components/bewerkbaar/blok-typen";
import TijdlijnBlok, { TIJDLIJN_CSS } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import WerkstroomKaartenBlok, { WERKSTROOM_CSS } from "@/components/bewerkbaar/blokken/WerkstroomKaartenBlok";
import MatrixBlok, { MATRIX_CSS } from "@/components/bewerkbaar/blokken/MatrixBlok";

/** Props van de eenvoudige blokken in dit bestand (zonder linkdoelen). */
type BlokProps<T extends DocBlok["type"]> = Omit<LosBlokProps<T>, "ankers">;
type Toon = BlokVan<"callout">["toon"];

// Kleur per laag van de kapstok: doel → baat → vermogen → gedrag → inspanning.
const LAAG_KLEUREN = new Map<string, string>([
  ["doel", "#003366"],
  ["baat", "#0066cc"],
  ["vermogen", "#0891b2"],
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
  const t = v.toLowerCase();
  const bevat = (...woorden: string[]) => woorden.some((w) => t.includes(w));
  const ligtEr = t.includes("ligt er") && !/\bniet\b/.test(t);
  if (bevat("sluit aan", "staat erin") || ligtEr) return "groen";
  if (bevat("aanvulling", "deels")) return "blauw";
  if (bevat("verschil", "ontbreekt", "aanvullen")) return "amber";
  return "grijs";
}

/** Zet cel c van een rij; vult ontbrekende cellen aan zodat er geen gaten ontstaan. */
function zetCel(rij: string[], c: number, x: string) {
  while (rij.length < c) rij.push("");
  rij[c] = x;
}

function nieuweSectie(): DocSectie {
  return {
    id: "sec-" + Date.now().toString(36),
    titel: "Nieuwe sectie",
    intro: "",
    blokken: [{ type: "tekst", tekst: "" }],
  };
}

// ---------- blokken ----------

function TekstBlok({ b, edit, zet }: BlokProps<"tekst">) {
  if (!edit) return b.tekst ? <p className="okd-p">{b.tekst}</p> : null;
  return <V v={b.tekst} on={(x) => zet((n) => void (n.tekst = x))} edit ml ph="Tekst" />;
}

function CalloutBlok({ b, edit, zet }: BlokProps<"callout">) {
  const cls = "okd-call okd-call-" + b.toon;
  if (!edit) {
    if (!b.titel && !b.tekst) return null;
    return (
      <div className={cls} role="note">
        {b.titel && <b className="okd-call-t">{b.titel}</b>}
        <div className="okd-call-tekst">{b.tekst}</div>
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

function LijstBlok({ b, edit, zet }: BlokProps<"lijst">) {
  if (!edit && !b.titel && b.items.length === 0) return null;
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
      <Lijst items={b.items} edit={edit} on={(items) => zet((n) => void (n.items = items))} />
    </div>
  );
}

function TabelBlok({ b, edit, zet }: BlokProps<"tabel">) {
  const chip = b.chipKolom;
  const isChip = (c: number) => !edit && c === chip;
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
        <table className="ok-t okd-t">
          <thead>
            <tr>
              {b.kolommen.map((k, c) => (
                <th key={c} className={isChip(c) ? "c" : undefined}>
                  <V v={k} on={(x) => zet((n) => void (n.kolommen[c] = x))} edit={edit} ph="Kolom" />
                </th>
              ))}
              {edit && <th className="x" />}
            </tr>
          </thead>
          <tbody>
            {b.rijen.map((rij, r) => (
              <tr key={r}>
                {b.kolommen.map((_, c) => {
                  const v = rij[c] ?? "";
                  return (
                    <td key={c} className={isChip(c) ? "c" : c === 0 ? "k" : undefined}>
                      {edit ? (
                        <V v={v} on={(x) => zet((n) => zetCel(n.rijen[r], c, x))} edit ml={c !== chip} />
                      ) : isChip(c) ? (
                        v ? <span className={"okd-chip okd-chip-" + chipSoort(v)}>{v}</span> : null
                      ) : (
                        v
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
                <dt>
                  <V
                    v={r.label}
                    on={(x) => zet((n) => void (n.kaarten[ki].regels[ri].label = x))}
                    edit={edit}
                    ph="Label"
                  />
                </dt>
                <dd>
                  {edit ? (
                    <div className="ok-rij">
                      <V
                        v={r.waarde}
                        on={(x) => zet((n) => void (n.kaarten[ki].regels[ri].waarde = x))}
                        edit
                        ml
                        ph="Waarde"
                      />
                      <WegKnop
                        titel="Regel verwijderen"
                        on={() => zet((n) => void n.kaarten[ki].regels.splice(ri, 1))}
                      />
                    </div>
                  ) : (
                    r.waarde
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
          {edit && (
            <div className="okd-onder">
              <PlusKnop
                label="+ regel"
                on={() => zet((n) => void n.kaarten[ki].regels.push({ label: "", waarde: "" }))}
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
                  void n.kaarten.push({ titel: "Nieuwe kaart", ondertitel: "", regels: [{ label: "", waarde: "" }] })
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
          <div>
            <PlusKnop
              label="+ laag"
              on={() =>
                zet((l) => void l.lagen.push({ naam: "", kleur: "", cellen: l.kolommen.map(() => "") }))
              }
            />
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
// Rollen: bovenaan een band "Regie over de hele keten"; in doel, baten en vermogen een
// rol-label (wie dat niveau draagt); domeineigenaar en leads staan in hun eigen vak.
// Een werkstroom linkt naar zijn werkstroomkaart (#wk-), anders naar een sectie (#sec-).
// Vaste opbouw: in bewerkmodus zijn alleen de teksten aanpasbaar, niet de domeinen,
// kleuren, koppelingen of ankers.

type Plaat = BlokVan<"dinplaat">;

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

/** Kleur van een domein: uit de inhoud (hex), anders de vaste DIN-kleur bij het id, anders grijs. */
function domeinKleur(d: { id: string; kleur: string }): string {
  const t = d.kleur.trim();
  if (HEX.test(t)) return t;
  return domein(d.id)?.kleur ?? NEUTRAAL;
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

/** Verbinding tussen twee lagen van de plaat, te lezen van onder naar boven. */
function Pijl({ rij, kolom, children }: { rij: number; kolom: string; children: ReactNode }) {
  return (
    <div className="okd-dp-pijl" style={{ gridRow: rij, gridColumn: kolom }}>
      <span aria-hidden="true">↑</span> {children}
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

/** Rijnummers in de plaat; de pijlen staan ertussen. Met de regieband schuift alles één rij op. */
function plaatRijen(metRegie: boolean) {
  const o = metRegie ? 1 : 0;
  return { doel: 1 + o, baten: 3 + o, vermogen: 5 + o, domeinen: 7 + o, werkstromen: 9 + o };
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

function DinPlaatBlok({ b, edit, zet, ankers }: LosBlokProps<"dinplaat">) {
  const kolommen = Math.max(1, b.domeinen.length);
  const breed = `2 / ${kolommen + 2}`;
  const rijen = plaatsWerkstromen(b);
  const perId = new Map(b.domeinen.map((d) => [d.id, d] as const));
  const toonRegie = edit || b.regie !== "";
  const R = plaatRijen(toonRegie);
  // Binnen de eigen scrollcontainer; in bewerkmodus breder zodat de velden leesbaar blijven
  // (900 past nog zonder scrollen in het document bij een scherm van 1280 breed).
  const minBreedte = edit ? Math.max(900, 120 + kolommen * 195) : Math.max(760, 120 + kolommen * 160);

  return (
    <figure className="okd-dp-paneel" aria-label="Doelen-Inspanningennetwerk (DIN) in één plaat">
      <div className="ok-scroll">
        <div
          className="okd-dp"
          style={{ gridTemplateColumns: `112px repeat(${kolommen}, minmax(0, 1fr))`, minWidth: minBreedte }}
        >
          {toonRegie && (
            <div className="okd-dp-regie" style={{ gridRow: 1, gridColumn: "1 / -1" }}>
              <span className="okd-dp-regie-l">
                <PersoonIcoon />
                Regie over de hele keten
              </span>
              {edit ? (
                <V
                  v={b.regie}
                  on={(x) => zet((n) => void (n.regie = x))}
                  edit
                  ml
                  cls="okd-dp-regie-t"
                  ph="Bijv. Programmamanagement: naam (rol) · naam (rol)"
                />
              ) : (
                <div className="okd-dp-regie-t">{metLabel(b.regie)}</div>
              )}
            </div>
          )}

          <div className="okd-dp-rl" style={{ gridRow: R.doel, gridColumn: 1 }}>
            Doel
          </div>
          <div className="okd-dp-doel" style={{ gridRow: R.doel, gridColumn: breed }}>
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
          </div>

          <Pijl rij={R.doel + 1} kolom={breed}>
            draagt bij aan
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: R.baten, gridColumn: 1 }}>
            Baten
          </div>
          <div
            className="okd-dp-baten"
            style={{
              gridRow: R.baten,
              gridColumn: breed,
              gridTemplateColumns: `repeat(${Math.max(1, b.baten.length)}, minmax(0, 1fr))`,
            }}
          >
            {b.baten.map((baat, i) => (
              <div key={i} className="okd-dp-baat">
                <V
                  v={baat.titel}
                  on={(x) => zet((n) => void (n.baten[i].titel = x))}
                  edit={edit}
                  block
                  cls="okd-dp-t"
                  ph="Baat"
                />
                {(edit || baat.tekst) && (
                  <V
                    v={baat.tekst}
                    on={(x) => zet((n) => void (n.baten[i].tekst = x))}
                    edit={edit}
                    ml
                    block
                    cls="okd-dp-tk"
                    ph="Toelichting, bijv. baten-KPI's (optioneel)"
                  />
                )}
                <Rol
                  v={baat.rol}
                  on={(x) => zet((n) => void (n.baten[i].rol = x))}
                  edit={edit}
                  ph="Rol, bijv. Bateneigenaar: sectormanager"
                />
              </div>
            ))}
          </div>

          <Pijl rij={R.baten + 1} kolom={breed}>
            levert
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: R.vermogen, gridColumn: 1 }}>
            Vermogen
          </div>
          <div className="okd-dp-verm" style={{ gridRow: R.vermogen, gridColumn: breed }}>
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
            <Rol
              v={b.vermogen.rol}
              on={(x) => zet((n) => void (n.vermogen.rol = x))}
              edit={edit}
              ph="Rol, bijv. Eigenaar van het vermogen: naam · functie"
            />
          </div>

          <Pijl rij={R.vermogen + 1} kolom={breed}>
            samen het vermogen
          </Pijl>

          <div className="okd-dp-rl" style={{ gridRow: R.domeinen, gridColumn: 1 }}>
            Domeinen
          </div>
          {b.domeinen.map((d, i) => (
            <div
              key={i}
              className="okd-dp-dom"
              style={metKleur(domeinKleur(d), { gridRow: R.domeinen, gridColumn: i + 2 })}
            >
              <V
                v={d.naam}
                on={(x) => zet((n) => void (n.domeinen[i].naam = x))}
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
            <>
              <Pijl rij={R.domeinen + 1} kolom={breed}>
                bouwt aan
              </Pijl>
              <div
                className="okd-dp-rl"
                style={{ gridRow: `${R.werkstromen} / span ${rijen.length}`, gridColumn: 1 }}
              >
                Werkstromen (inspanningen)
              </div>
            </>
          )}
          {rijen.flatMap((rij, ri) =>
            rij.map((plek) => {
              const wi = plek.wi;
              const w = b.werkstromen[wi];
              const eerste = w.domeinen.map((id) => perId.get(id)).find((d) => d !== undefined);
              const kleur = plek.overal ? CITO : eerste ? domeinKleur(eerste) : NEUTRAAL;
              const doel = edit ? null : werkstroomDoel(w.anker, ankers);
              return (
                <div
                  key={wi}
                  className={plek.overal ? "okd-dp-ws okd-dp-ws-heel" : "okd-dp-ws"}
                  style={metKleur(kleur, {
                    gridRow: R.werkstromen + ri,
                    gridColumn: `${plek.van + 2} / ${plek.tot + 3}`,
                  })}
                >
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
                  {(edit || w.leads) && (
                    <V
                      v={w.leads}
                      on={(x) => zet((n) => void (n.werkstromen[wi].leads = x))}
                      edit={edit}
                      ml
                      block
                      cls="okd-dp-leads"
                      ph="Leads, bijv. Cito-lead · 3sides-lead"
                    />
                  )}
                  {plek.los && (
                    <div className="okd-dp-r">
                      <span className="okd-dp-l">Bouwt in</span>
                      <div className="okd-dp-v">{plek.idx.map((i) => b.domeinen[i].naam).join(" · ")}</div>
                    </div>
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
                </div>
              );
            })
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
}) {
  const { s, i, edit, vraag, ankers, onZet, onVraag } = p;

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
      case "matrix":
        return <MatrixBlok key={bi} b={b} edit={edit} zet={blokZet(bi, "matrix")} ankers={ankers} />;
      default:
        return geenWeergave(b);
    }
  }

  return (
    <section id={"sec-" + s.id} className="okd-sec">
      <div className="okd-kop">
        <h3 className="ok-kop">
          <V v={s.titel} on={(x) => upd((n) => void (n.titel = x))} edit={edit} ph="Titel van de sectie" />
        </h3>
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
      <div className="okd-blokken">{s.blokken.map(blok)}</div>
    </section>
  );
});

// ---------- het document ----------

/**
 * Element-ids in een sectie waar naartoe gelinkt kan worden: de sectie zelf ("sec-"),
 * de kaarten van een werkstromen-blok ("wk-") en de tijdlijngroepen met een anker ("tl-").
 */
function linkdoelen(s: DocSectie): string[] {
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
}: {
  doc: DocData;
  edit: boolean;
  onChange: (doc: DocData) => void;
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

  // Verwijderde secties (lege markering, zie bewerkbaar-document.ts) niet tonen;
  // de index blijft die in doc.secties.
  const zichtbaar = doc.secties.flatMap((s, i) => (isVerwijderd(s) ? [] : [{ s, i }]));

  // Element-ids die in het document bestaan (secties, werkstroomkaarten, tijdlijngroepen),
  // als linkdoelen. Gememoiseerd op een sleutel van de ids zelf, zodat typen in een sectie
  // de gememoiseerde secties ongemoeid laat.
  const idSleutel = zichtbaar.flatMap(({ s }) => linkdoelen(s)).join("\n");
  const ankers = useMemo(() => new Set(idSleutel.split("\n")), [idSleutel]);

  return (
    <div className="ok okd rounded-xl border border-cito-border bg-[#eef1f5] p-4 sm:p-6">
      <style>{OK_CSS + DOC_CSS + TIJDLIJN_CSS + WERKSTROOM_CSS + MATRIX_CSS}</style>

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
          <span className="ok-bl">Inhoud</span>
          {zichtbaar.map(({ s }) => (
            <a key={s.id} href={"#sec-" + s.id} title={s.titel}>
              {s.titel || "Zonder titel"}
            </a>
          ))}
        </nav>
      )}

      {zichtbaar.map(({ s, i }) => (
        <Sectie
          key={s.id}
          s={s}
          i={i}
          edit={edit}
          vraag={vraag === s.id}
          ankers={ankers}
          onZet={zetSectie}
          onVraag={setVraag}
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
  );
}
