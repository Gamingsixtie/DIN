// Deel 3 van de afdrukweergave: de evaluatie van 3sides op zes kaders, met eigen opmaak voor
// papier (niet het evaluatiebord uit de app: dat werkt met inklapbare kaarten).
// Per kader: nummer en vraag, het eerste beeld (oordeel als gekleurde chip met teken en tekst,
// daarna de bevinding), de feiten, wie aan zet is (3sides en Cito naast elkaar) en de vraag
// voor het gesprek. Alleen in de interne versie: ons oordeel met de notitie, en de
// onderbouwing. In de versie voor 3sides heeft de uitsnede die velden al leeggemaakt; ze
// worden hier bovendien alleen bij `intern` getekend. Wat leeg is, krijgt geen kop.

import type { ReactNode } from "react";
import type { DocBlok } from "@/lib/schemas";

type Evaluatie = Extract<DocBlok, { type: "evaluatie" }>;
type Kader = Evaluatie["kaders"][number];
type Soort = "ja" | "deels" | "nee" | "grijs";

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Het eerste beeld gesplitst: het oordeel is het stuk vóór de dubbele punt (hooguit 40 tekens),
 * de rest is de bevinding. Een korte zin zonder dubbele punt is in zijn geheel het oordeel;
 * een lange zin heeft geen los oordeel. Zelfde regel als de chip in de app en de Word-export.
 */
function splitsBeeld(s: string): { oordeel: string; rest: string } {
  const t = tekst(s).replace(/\s*\(voorstel\)\s*$/i, "");
  const i = t.indexOf(":");
  if (i > 0 && i <= 40) return { oordeel: t.slice(0, i).trim(), rest: t.slice(i + 1).trim() };
  return t.length <= 40 ? { oordeel: t, rest: "" } : { oordeel: "", rest: t };
}

/** Kleur van het oordeel, uit het eerste woord: ja groen, deels of waarschijnlijk blauw, nee amber. */
function soortVan(oordeel: string): Soort {
  const t = oordeel.toLowerCase();
  if (/^ja\b/.test(t) || /^sluit aan/.test(t)) return "ja";
  if (/^nee\b/.test(t) || /^onvoldoende/.test(t)) return "nee";
  if (/^deels\b/.test(t) || /^waarschijnlijk/.test(t)) return "deels";
  return "grijs";
}

/** Teken in de chip, zodat het oordeel niet alleen aan de kleur hangt. */
function Teken({ soort }: { soort: Soort }) {
  const lijn = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {soort === "ja" && <path d="M2 6.4 4.8 9.2 10 3.2" {...lijn} />}
      {soort === "nee" && <path d="M2.8 2.8l6.4 6.4M9.2 2.8 2.8 9.2" {...lijn} />}
      {soort === "deels" && (
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

/** Ons oordeel (intern): de naam zoals in het keuzelijstje van de app. */
function oordeelNaam(waarde: string): { naam: string; cls: string } {
  switch (waarde.toLowerCase()) {
    case "goed":
      return { naam: "Goed", cls: "evp-pil-goed" };
    case "deels":
      return { naam: "Deels", cls: "evp-pil-deels" };
    case "onvoldoende":
      return { naam: "Onvoldoende", cls: "evp-pil-onvoldoende" };
    case "nvt":
      return { naam: "Nog niet te beoordelen", cls: "" };
    case "":
      return { naam: "nog niet ingevuld", cls: "evp-pil-leeg" };
    default:
      return { naam: waarde, cls: "" };
  }
}

/** Eén zijde van "Wie is aan zet": de partij vet, de rol erachter, dan wat deze partij doet. */
function Zijde({ wie, rol, children }: { wie: "3sides" | "Cito"; rol: string; children: ReactNode }) {
  return (
    <div className={"evp-zijde evp-zijde-" + wie.toLowerCase()}>
      <div className="evp-zijde-kop">
        <b>{wie}</b>
        {rol && <span>{rol}</span>}
      </div>
      <p>{children}</p>
    </div>
  );
}

function KaderKaart({
  k,
  nr,
  rol3sides,
  rolCito,
  intern,
  toon,
}: {
  k: Kader;
  nr: number;
  rol3sides: string;
  rolCito: string;
  intern: boolean;
  toon: (s: string) => ReactNode;
}) {
  const beeld = splitsBeeld(k.beeld ?? "");
  const soort = beeld.oordeel ? soortVan(beeld.oordeel) : "grijs";
  const punten = (k.punten ?? []).map(tekst).filter(Boolean);
  const zet3 = tekst(k.aanZet3sides);
  const zetC = tekst(k.aanZetCito);
  const vraag = tekst(k.vraag3sides);
  const secties = (k.secties ?? []).filter((s) => tekst(s.label) || tekst(s.tekst));
  const oordeel = oordeelNaam(tekst(k.oordeel));
  const notitie = tekst(k.notitie);

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

      {(beeld.oordeel || beeld.rest) && (
        <div className="evp-beeld">
          {beeld.oordeel && (
            <span className="evp-chip">
              <Teken soort={soort} />
              {beeld.oordeel}
            </span>
          )}
          {beeld.rest && <p>{toon(beeld.rest.charAt(0).toUpperCase() + beeld.rest.slice(1))}</p>}
        </div>
      )}

      {punten.length > 0 && (
        <section className="evp-vak">
          <h4>Feiten</h4>
          <ul className="evp-punten">
            {punten.map((p, i) => (
              <li key={i}>{toon(p)}</li>
            ))}
          </ul>
        </section>
      )}

      {(zet3 || zetC) && (
        <section className="evp-vak">
          <h4>Wie is aan zet</h4>
          <div className={"evp-zet" + (zet3 && zetC ? "" : " evp-zet-een")}>
            {/* Cito eerst, zoals in de app (Cito heeft de lead) */}
            {zetC && (
              <Zijde wie="Cito" rol={rolCito}>
                {toon(zetC)}
              </Zijde>
            )}
            {zet3 && (
              <Zijde wie="3sides" rol={rol3sides}>
                {toon(zet3)}
              </Zijde>
            )}
          </div>
        </section>
      )}

      {vraag && (
        <aside className="evp-vraag">
          <Spreekballon />
          <div>
            <h4>Vraag voor het gesprek</h4>
            <p>{toon(vraag)}</p>
          </div>
        </aside>
      )}

      {intern && (
        <div className="evp-intern">
          <section className="evp-oordeel">
            <h4>Ons oordeel (intern)</h4>
            <span className={"evp-pil " + oordeel.cls}>{oordeel.naam}</span>
            {notitie && <p className="evp-notitie">{notitie}</p>}
          </section>
          {secties.length > 0 && (
            <section className="evp-onder">
              <h4>Onderbouwing</h4>
              <dl>
                {secties.map((s, i) => (
                  <div key={i}>
                    {tekst(s.label) && <dt>{s.label}</dt>}
                    {tekst(s.tekst) && <dd>{toon(s.tekst)}</dd>}
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
      {kaders.map((k, i) => (
        <KaderKaart key={k.id || i} k={k} nr={i + 1} rol3sides={rol3sides} rolCito={rolCito} intern={intern} toon={toon} />
      ))}
      {tekst(blok.legenda) && <p className="evp-legenda">{toon(tekst(blok.legenda))}</p>}
    </div>
  );
}
