// Generieke, bewerkbare documentweergave (o.a. stap 11 "Programma × 3sides") in de
// beeldtaal van het organigram: kop met titel, ondertitel en status, een compacte
// inhoudsopgave en per sectie blokken (tekst, kader, lijst, tabel, kaarten, lagen).
// In bewerkmodus is elke tekst aanpasbaar en voeg je secties, regels, rijen,
// kaarten en lagen toe of haal je ze weg. Wijzigingen gaan onveranderlijk
// (kopie → aanpassen) via onChange naar de ouder; die bepaalt wanneer er wordt
// opgeslagen. Alleen gebruiken binnen een client-component.

import { Fragment, memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { BewerkbaarDocument as DocData, DocBlok, DocSectie } from "@/lib/schemas";
import { isVerwijderd, kloon, verwijderdeSectie } from "@/lib/bewerkbaar-document";
import { Keuze, Lijst, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { DOC_CSS, OK_CSS } from "@/components/bewerkbaar/stijl";

type BlokVan<T extends DocBlok["type"]> = Extract<DocBlok, { type: T }>;
/** Past een kopie van het blok aan; de wijziging gaat via de sectie naar boven. */
type Zet<T> = (fn: (x: T) => void) => void;
type BlokProps<T extends DocBlok["type"]> = { b: BlokVan<T>; edit: boolean; zet: Zet<BlokVan<T>> };
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

/** Kleur van een oordeel-chip op basis van de tekst. */
function chipSoort(v: string): "groen" | "blauw" | "amber" | "grijs" {
  const t = v.toLowerCase();
  if (t.includes("sluit aan")) return "groen";
  if (t.includes("aanvulling")) return "blauw";
  if (t.includes("verschil")) return "amber";
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

// ---------- sectie ----------

// Gememoiseerd: bij typen in één sectie renderen de andere secties niet opnieuw.
const Sectie = memo(function Sectie(p: {
  s: DocSectie;
  i: number;
  edit: boolean;
  /** verwijder-bevestiging open voor deze sectie */
  vraag: boolean;
  onZet: (i: number, s: DocSectie) => void;
  onVraag: (id: string | null) => void;
}) {
  const { s, i, edit, vraag, onZet, onVraag } = p;

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
      default:
        return null;
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

  return (
    <div className="ok okd rounded-xl border border-cito-border bg-[#eef1f5] p-4 sm:p-6">
      <style>{OK_CSS + DOC_CSS}</style>

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
