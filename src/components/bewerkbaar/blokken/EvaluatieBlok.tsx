// Evaluatiebord (stap 11, deel 8): per kader een inklapbare kaart. Dicht: nummer, titel,
// ondertitel, het eerste beeld als chip en ons oordeel als keuzelijstje. Open: wat we
// toetsen, het eerste beeld voluit (voorstel), de onderbouwing per sectie en een notitie
// bij ons oordeel. Oordeel en notitie kies en typ je in weergave; ze worden meteen bewaard
// (levende gegevens, doc-versie.ts). Bewerkmodus: alle teksten aanpasbaar, secties en
// kaders toevoegen en weghalen. Boven de kaarten een teller: oordeel ingevuld x van y.

import { useState } from "react";
import type { ChangeEvent } from "react";
import { PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { metBronlinks } from "@/components/bewerkbaar/bron-context";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"evaluatie">;
type Kader = Blok["kaders"][number];

const OORDELEN: { waarde: string; label: string }[] = [
  { waarde: "", label: "Oordeel…" },
  { waarde: "goed", label: "Goed" },
  { waarde: "deels", label: "Deels" },
  { waarde: "onvoldoende", label: "Onvoldoende" },
  { waarde: "nvt", label: "Nog niet te beoordelen" },
];

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

/** Kleur van de chip "eerste beeld": uit het eerste woord van de zin. */
function beeldSoort(s: string): "ja" | "deels" | "nee" | "grijs" {
  const t = s.trim().toLowerCase();
  if (/^ja\b/.test(t) || /^sluit aan/.test(t)) return "ja";
  if (/^nee\b/.test(t) || /^onvoldoende/.test(t)) return "nee";
  if (/^deels\b/.test(t) || /^waarschijnlijk/.test(t)) return "deels";
  return "grijs";
}

/** Korte vorm van het eerste beeld voor de chip: het stuk vóór de dubbele punt, maximaal 40 tekens. */
function beeldKort(s: string): string {
  const t = s.trim().replace(/\s*\(voorstel\)\s*$/i, "");
  const i = t.indexOf(":");
  const kop = i > 0 && i <= 40 ? t.slice(0, i) : t;
  return kop.length > 40 ? kop.slice(0, 38).trimEnd() + "…" : kop;
}

function Chevron() {
  return (
    <svg className="ev-chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Oordeel({ k, on }: { k: Kader; on: (x: string) => void }) {
  const v = tekst(k.oordeel);
  return (
    <select
      className={"ev-oordeel" + (v ? " ev-oordeel-" + v : "")}
      value={v}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => on(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label={"Ons oordeel bij " + k.titel}
      title="Ons oordeel (intern); wordt meteen bewaard"
    >
      {OORDELEN.map((o) => (
        <option key={o.waarde} value={o.waarde}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function groei(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + 2 + "px";
}

export default function EvaluatieBlok({ b, edit, zet }: LosBlokProps<"evaluatie">) {
  const kaders = b.kaders ?? [];
  // in weergave standaard dicht; de gebruiker klapt open wat hij bespreekt
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const ingevuld = kaders.filter((k) => tekst(k.oordeel) !== "").length;
  const pct = kaders.length > 0 ? Math.round((ingevuld / kaders.length) * 100) : 0;
  const zetK = (i: number, fn: (k: Kader) => void) =>
    zet((n) => {
      const k = n.kaders[i];
      if (k) fn(k);
    });

  return (
    <div className="ev">
      {(edit || b.titel) && (
        <h4 className="okd-bt">
          <V v={tekst(b.titel)} on={(x) => zet((n) => void (n.titel = x))} edit={edit} ph="Titel (optioneel)" />
        </h4>
      )}
      {(edit || b.intro) && (
        <V v={tekst(b.intro)} on={(x) => zet((n) => void (n.intro = x))} edit={edit} ml block cls="ok-sub" ph="Inleiding (optioneel)" />
      )}

      {!edit && kaders.length > 0 && (
        <div className="ev-samen">
          <span className="ev-tal">
            <b>{kaders.length}</b> kaders
            <span className="ev-sep" aria-hidden="true">
              ·
            </span>
            klik op een kader om de onderbouwing te zien
          </span>
          <span className="ev-invul">
            <span className="ev-invul-t">Oordeel ingevuld</span>
            <span className="ev-meter" role="progressbar" aria-valuemin={0} aria-valuemax={kaders.length} aria-valuenow={ingevuld} aria-label="Oordeel ingevuld">
              <span style={{ width: pct + "%" }} />
            </span>
            <b>
              {ingevuld} van {kaders.length}
            </b>
          </span>
        </div>
      )}

      <div className="ev-lijst">
        {kaders.map((k, i) => {
          const beeld = tekst(k.beeld);
          const isOpen = edit || open[k.id] === true;
          return (
            <details
              key={k.id || i}
              className="ev-kader"
              data-oordeel={tekst(k.oordeel)}
              open={isOpen}
              onToggle={(e) => {
                if (edit) return;
                const el = e.currentTarget;
                setOpen((o) => (o[k.id] === el.open ? o : { ...o, [k.id]: el.open }));
              }}
            >
              <summary className="ev-kop">
                <span className="ev-nr" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="ev-kop-t">
                  <h5 className="ev-titel">
                    {edit ? (
                      <V v={k.titel} on={(x) => zetK(i, (n) => void (n.titel = x))} edit ph="Titel van het kader" />
                    ) : (
                      k.titel.replace(/^\d+\s*·\s*/, "")
                    )}
                  </h5>
                  {(edit || k.ondertitel) && (
                    <p className="ev-sub">
                      {edit ? (
                        <V v={tekst(k.ondertitel)} on={(x) => zetK(i, (n) => void (n.ondertitel = x))} edit ph="Ondertitel" />
                      ) : (
                        k.ondertitel
                      )}
                    </p>
                  )}
                </div>
                {!edit && beeld && (
                  <span className={"ev-beeld ev-beeld-" + beeldSoort(beeld)} title={"Eerste beeld (voorstel): " + beeld}>
                    {beeldKort(beeld)}
                  </span>
                )}
                {!edit && <Oordeel k={k} on={(x) => zetK(i, (n) => void (n.oordeel = x))} />}
                {!edit && <Chevron />}
                {edit && <WegKnop titel="Kader verwijderen" label="× kader" on={() => zet((n) => void n.kaders.splice(i, 1))} />}
              </summary>

              <div className="ev-body">
                {(edit || k.vraag) && (
                  <p className="ev-vraag">
                    {edit ? (
                      <V v={tekst(k.vraag)} on={(x) => zetK(i, (n) => void (n.vraag = x))} edit ml ph="Wat we toetsen" />
                    ) : (
                      metBronlinks(tekst(k.vraag))
                    )}
                  </p>
                )}
                {(edit || beeld) && (
                  <div className="ev-beeldvak">
                    {edit ? (
                      <V v={beeld} on={(x) => zetK(i, (n) => void (n.beeld = x))} edit ml ph="Eerste beeld (begin met Ja / Deels / Nee)" />
                    ) : (
                      <span>{metBronlinks(beeld)}</span>
                    )}
                  </div>
                )}
                <dl className="ev-secties">
                  {k.secties.map((s, si) => (
                    <div key={si} className="ev-sectie">
                      <dt>
                        {edit ? (
                          <span className="ok-rij">
                            <V v={s.label} on={(x) => zetK(i, (n) => void (n.secties[si].label = x))} edit ph="Label" />
                            <WegKnop titel="Sectie verwijderen" on={() => zetK(i, (n) => void n.secties.splice(si, 1))} />
                          </span>
                        ) : (
                          s.label
                        )}
                      </dt>
                      <dd>
                        {edit ? (
                          <V v={s.tekst} on={(x) => zetK(i, (n) => void (n.secties[si].tekst = x))} edit ml ph="Tekst" />
                        ) : (
                          metBronlinks(s.tekst)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {edit && (
                  <div className="ev-plus">
                    <PlusKnop label="+ sectie" on={() => zetK(i, (n) => void n.secties.push({ label: "Nieuwe sectie", tekst: "" }))} />
                  </div>
                )}
                {!edit && (
                  <div className="ev-oordeelvak">
                    <label className="ev-oordeelvak-l" htmlFor={"ev-notitie-" + k.id}>
                      Ons oordeel (intern)
                    </label>
                    <textarea
                      id={"ev-notitie-" + k.id}
                      className="ev-notitie"
                      value={tekst(k.notitie)}
                      placeholder="Toelichting bij ons oordeel; wordt meteen bewaard"
                      rows={2}
                      onChange={(e) => {
                        groei(e.currentTarget);
                        const x = e.target.value;
                        zetK(i, (n) => void (n.notitie = x));
                      }}
                      onFocus={(e) => groei(e.currentTarget)}
                    />
                    <p className="ev-hint">Kies het oordeel in de kop van dit kader; de teksten pas je aan met het potlood bij dit deel.</p>
                  </div>
                )}
              </div>
            </details>
          );
        })}
        {edit && (
          <div className="ev-plus">
            <PlusKnop
              label="+ kader"
              on={() =>
                zet((n) =>
                  void n.kaders.push({
                    id: "kader-" + Date.now().toString(36),
                    titel: "Nieuw kader",
                    ondertitel: "",
                    vraag: "",
                    beeld: "",
                    actieBij: "",
                    secties: [],
                    oordeel: "",
                    notitie: "",
                  })
                )
              }
            />
          </div>
        )}
      </div>

      {(edit || b.legenda) && (
        <p className="ev-legenda">
          <V v={tekst(b.legenda)} on={(x) => zet((n) => void (n.legenda = x))} edit={edit} ml ph="Legenda (optioneel)" />
        </p>
      )}
    </div>
  );
}
