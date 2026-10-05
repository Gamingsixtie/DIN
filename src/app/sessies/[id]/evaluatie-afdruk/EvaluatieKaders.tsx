// Het deel "Evaluatie" van de afdrukweergave: de evaluatie van 3sides per kader, met eigen
// opmaak voor papier (niet het evaluatiebord uit de app: dat werkt met inklapbare kaarten).
//
// Boven de kaders staat de rolverdeling (Cito, 3sides). Per kader, in beide versies:
// nummer en vraag, de bevinding (oordeel als gekleurde chip met teken en tekst, daarna de zin),
// de feiten met hun bron op een eigen regel, het blok "Wat we van 3sides vragen" en de vraag
// voor het gesprek. Dat is precies wat we aan 3sides communiceren.
//
// Alleen in de interne versie volgt daaronder een apart, gemarkeerd deel "Intern Cito": het
// blok "Wat Cito zelf doet (intern)", wie aan zet is (als dat is ingevuld), ons oordeel met de
// notitie en de onderbouwing. Zo leest niemand de eigen acties van Cito als deel van de
// boodschap aan 3sides. In de versie voor 3sides heeft de uitsnede die velden al leeggemaakt;
// ze worden hier bovendien alleen bij `intern` getekend. Wat leeg is, krijgt geen kop.
//
// Het kopje boven de bevinding: "Onze bevinding"; intern "Eerste beeld · voorstel" zolang ons
// oordeel bij dat kader nog niet is ingevuld.
// De chip, de bron per feit en de alinea's van de onderbouwing volgen dezelfde regels als de app
// en de Word-export (evaluatie-word-reken.ts).

import type { ReactNode } from "react";
import type { DocBlok } from "@/lib/schemas";
import { alineas, beeldSoort, oordeelNaam, splitsBeeld, splitsBron } from "@/lib/evaluatie-word-reken";
import type { BeeldSoort } from "@/lib/evaluatie-word-reken";

type Evaluatie = Extract<DocBlok, { type: "evaluatie" }>;
type Kader = Evaluatie["kaders"][number];

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Teken in de chip, zodat het oordeel niet alleen aan de kleur hangt. */
function Teken({ soort }: { soort: BeeldSoort }) {
  const lijn = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {soort === "ja" && <path d="M2 6.4 4.8 9.2 10 3.2" {...lijn} />}
      {soort === "nee" && <path d="M2.8 2.8l6.4 6.4M9.2 2.8 2.8 9.2" {...lijn} />}
      {(soort === "deels" || soort === "needeels") && (
        <>
          <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 1.6a4.4 4.4 0 0 0 0 8.8z" fill="currentColor" />
        </>
      )}
      {soort === "grijs" && <path d="M2.6 6h6.8" {...lijn} />}
    </svg>
  );
}

function Spreekballon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 16h-5.6L7 20v-4a2.5 2.5 0 0 1-2.5-2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.8 8.2a2.2 2.2 0 1 1 3.4 1.9c-.7.5-1.2.9-1.2 1.7M12 13.9v.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Kleur van het pilletje bij ons oordeel (intern). */
const PIL: Record<ReturnType<typeof oordeelNaam>["soort"], string> = {
  groen: "evp-pil-goed",
  blauw: "evp-pil-deels",
  amber: "evp-pil-onvoldoende",
  grijs: "",
};

function KaderKaart({ k, nr, intern, toon }: { k: Kader; nr: number; intern: boolean; toon: (s: string) => ReactNode }) {
  const { kop, zin } = splitsBeeld(tekst(k.beeld));
  const soort: BeeldSoort = kop ? beeldSoort(kop) : "grijs";
  const punten = (k.punten ?? []).map(tekst).filter(Boolean);
  const vragen = tekst(k.aanZet3sides);
  const gesprek = tekst(k.vraag3sides);
  // alleen intern (de uitsnede voor 3sides levert deze velden leeg aan)
  const zelf = tekst(k.aanZetCito);
  const aanZet = tekst(k.actieBij);
  const oordeel = oordeelNaam(tekst(k.oordeel));
  const notitie = tekst(k.notitie);
  const toets = tekst(k.vraag);
  const secties = (k.secties ?? []).filter((s) => tekst(s.label) || tekst(s.tekst));
  // de bevinding is een voorstel tot ons oordeel is ingevuld; naar 3sides gaat ze als onze bevinding
  const bevindingKop = intern && !oordeel.ingevuld ? "Eerste beeld · voorstel" : "Onze bevinding";

  return (
    <article className={"evp-kader evp-kader-" + soort}>
      <header className="evp-kader-kop">
        <span className="evp-kader-nr" aria-hidden="true">
          {nr}
        </span>
        <div>
          <h3>{k.titel.replace(/^\s*\d+\s*·\s*/, "")}</h3>
          {tekst(k.ondertitel) && <p className="evp-kader-sub">{toon(tekst(k.ondertitel))}</p>}
        </div>
      </header>

      {(kop || zin) && (
        <div className="evp-beeld">
          <div className="evp-beeld-kop">
            <span className="evp-beeld-l">{bevindingKop}</span>
            {kop && (
              <span className="evp-chip">
                <Teken soort={soort} />
                {kop}
              </span>
            )}
          </div>
          {zin && <p>{toon(zin)}</p>}
        </div>
      )}

      {punten.length > 0 && (
        <section className="evp-vak">
          <h4>Feiten</h4>
          <ol className="evp-punten">
            {punten.map((p, i) => {
              const { kern, bron } = splitsBron(p);
              return (
                <li key={i}>
                  {toon(kern)}
                  {bron && <span className="evp-bron">{toon(bron)}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {vragen && (
        <section className="evp-vragen">
          <h4>Wat we van 3sides vragen</h4>
          <p>{toon(vragen)}</p>
        </section>
      )}

      {gesprek && (
        <aside className="evp-vraag">
          <Spreekballon />
          <div>
            <h4>Vraag voor het gesprek</h4>
            <p>{toon(gesprek)}</p>
          </div>
        </aside>
      )}

      {intern && (
        <div className="evp-intern">
          <p className="evp-intern-kop">
            <b>Intern Cito</b>
            <span>Alleen voor Cito: dit deel gaat niet naar 3sides.</span>
          </p>
          {zelf && (
            <section className="evp-zelf">
              <h4>Wat Cito zelf doet (intern)</h4>
              <p>{toon(zelf)}</p>
            </section>
          )}
          <dl className="evp-gegevens">
            {aanZet && (
              <div>
                <dt>Aan zet</dt>
                <dd>
                  <b>{toon(aanZet)}</b>
                </dd>
              </div>
            )}
            <div>
              <dt>Ons oordeel (intern)</dt>
              <dd>
                <span className={"evp-pil " + (oordeel.ingevuld ? PIL[oordeel.soort] : "evp-pil-leeg")}>{oordeel.naam}</span>
              </dd>
            </div>
          </dl>
          {notitie && <p className="evp-notitie">{notitie}</p>}
          {(toets || secties.length > 0) && (
            <section className="evp-onder">
              <h4>Onderbouwing (intern)</h4>
              <dl>
                {toets && (
                  <div>
                    <dt>Wat we toetsen</dt>
                    <dd>
                      <p>{toon(toets)}</p>
                    </dd>
                  </div>
                )}
                {secties.map((s, i) => (
                  <div key={i}>
                    {tekst(s.label) && <dt>{s.label}</dt>}
                    {tekst(s.tekst) && (
                      <dd>
                        {alineas(tekst(s.tekst)).map((a, j) => (
                          <p key={j}>
                            {a.chip && <span className={"evp-mini evp-mini-" + beeldSoort(a.chip)}>{a.chip}</span>}
                            {a.chip && " "}
                            {a.label && <b>{a.label}</b>}
                            {a.label && " "}
                            {toon(a.tekst)}
                          </p>
                        ))}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Het evaluatieblok op papier. `toon` zet een tekst om in wat getoond wordt: in de interne
 * versie met links naar de documenten, in de versie voor 3sides als platte tekst.
 */
export default function EvaluatieKaders({
  blok,
  intern,
  toon,
}: {
  blok: Evaluatie;
  intern: boolean;
  toon: (s: string) => ReactNode;
}) {
  const kaders = blok.kaders ?? [];
  const rol3sides = tekst(blok.rol3sides);
  const rolCito = tekst(blok.rolCito);
  if (kaders.length === 0 && !tekst(blok.titel) && !tekst(blok.intro)) return null;
  return (
    <div className="evp-ev">
      {tekst(blok.titel) && <h3 className="evp-ev-titel">{blok.titel}</h3>}
      {tekst(blok.intro) && <p className="evp-intro">{toon(tekst(blok.intro))}</p>}
      {(rolCito || rol3sides) && (
        <div className="evp-rollen" role="group" aria-label="Rolverdeling">
          <span className="evp-rollen-l">Rolverdeling</span>
          <div className="evp-rol evp-rol-cito">
            <b>Cito</b>
            {rolCito && <span>{toon(rolCito)}</span>}
          </div>
          <div className="evp-rol evp-rol-3sides">
            <b>3sides</b>
            {rol3sides && <span>{toon(rol3sides)}</span>}
          </div>
        </div>
      )}
      {kaders.map((k, i) => (
        <KaderKaart key={k.id || i} k={k} nr={i + 1} intern={intern} toon={toon} />
      ))}
      {tekst(blok.legenda) && <p className="evp-legenda">{toon(tekst(blok.legenda))}</p>}
    </div>
  );
}
