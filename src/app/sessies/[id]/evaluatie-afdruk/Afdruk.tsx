"use client";

// De afdrukweergave "Evaluatie 3sides": de uitsnede uit evaluatie-uitsnede.ts als A4-document,
// alleen-lezen, in twee versies:
// - voor 3sides: wat Cito aan 3sides communiceert, met de begeleidende brief op een eigen pagina;
// - intern ("Intern Cito" op elke pagina): alles, ook wat Cito zelf doet (het actiebord in het
//   deel Planning en per kader een eigen blok), ons oordeel, de notities en de onderbouwing.
// Volgorde: voorblok met de inhoud, (versie voor 3sides) de brief, de agenda, de delen uit
// u.delen (nu twee: planning en evaluatie) en de bronnen. De inhoudsopgave en de koppen volgen
// u.delen; er staat hier geen vast aantal delen.
//
// De planning, de agenda en de brief worden getekend met het echte BewerkbaarDocument uit de
// app (weergave, zonder potlood en zonder opmerkingen), zodat tabellen, tijdlijn, voortgangsbord
// en actiebord er net zo uitzien als op het tabblad. Per stuk van een deel staat er één
// BewerkbaarDocument met twee secties: een verborgen sectie met de gegevens waar de blokken mee
// rekenen (u.gegevens: de tijdlijn, het voortgangsbord en de werkstroomkaarten uit de analyse;
// alleen om mee te rekenen, ze worden niet getoond) en de sectie met de blokken die op die plek
// staan. Zo kloppen de cijfers op het voortgangsbord en de kleuren en leads op het actiebord,
// ook nu de werkstroomkaarten zelf geen deel van dit document zijn. De evaluatie heeft eigen
// opmaak (EvaluatieKaders).
//
// Niets op deze pagina schrijft naar de sessie: onChange doet niets, en er is geen
// SessionProvider. Na het tekenen worden links die alleen in de app werken, tooltips en de
// tabvolgorde van keuzelijsten en vinkjes weggehaald (maakStatisch); in de versie voor 3sides
// alle links, zodat er geen adres van Cito in de pdf komt. Zinnen over de bediening van de app
// in het voortgangsbord hebben de klasse vb-alleen-app en staan niet op papier (stijl.ts).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { DINSession } from "@/lib/types";
import type { BewerkbaarDocument as DocData, DocBlok, DocSectie } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { DEFAULT_EVALUATIE_GESPREK, EVALUATIE_GESPREK_SLEUTEL } from "@/lib/evaluatie-gesprek-default";
import { oplossen } from "@/lib/doc-versie";
import { exportBestandsnaam, maakUitsnede, zonderLinktekens } from "@/lib/evaluatie-uitsnede";
import type { EvaluatieUitsnede, ExportVersie } from "@/lib/evaluatie-uitsnede";
import BewerkbaarDocument from "@/components/bewerkbaar/BewerkbaarDocument";
import { BRON_CSS, BronContext, STANDAARD_DOCUMENTEN_BASIS, VINDPLAATS_VELDEN, isWeblink, metBronlinks } from "@/components/bewerkbaar/bron-context";
import type { Bron, Vindplaats } from "@/components/bewerkbaar/bron-context";
import EvaluatieKaders from "./EvaluatieKaders";
import { afdrukCss } from "./stijl";

type Tijdlijn = Extract<DocBlok, { type: "tijdlijn" }>;
type Evaluatie = Extract<DocBlok, { type: "evaluatie" }>;

/**
 * Een stuk van een deel: blokken uit de app, of de evaluatie. Bij de tijdlijn (de figuren per
 * werkstroom) is `jaargrens` de plek van de eerste jaarwissel op de maandschaal (0..1), of null.
 */
type Stuk =
  | { soort: "app"; blokken: DocBlok[]; tijdlijn: false }
  | { soort: "app"; blokken: DocBlok[]; tijdlijn: true; jaargrens: number | null }
  | { soort: "evaluatie"; blok: Evaluatie };

/** Id van de verborgen sectie met gegevens (zie stijl.ts: #sec-evp-gegevens). */
const GEGEVENS_ID = "evp-gegevens";
/** Bloktypen die andere blokken lezen (useBlok): het eerste van elk uit u.gegevens gaat mee in de verborgen sectie. */
const GEGEVENS_TYPEN: readonly DocBlok["type"][] = ["tijdlijn", "voortgangsbord", "werkstromen"];
const NIETS = () => {};
const GEEN_BLOKKEN: DocBlok[] = [];

/** Elke tekst in een waarde (diep) door `fn`; structuur, getallen en booleans blijven. */
function diepTekst<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === "string") return fn(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => diepTekst(x, fn)) as unknown as T;
  if (v && typeof v === "object") {
    const uit: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) uit[k] = diepTekst(x, fn);
    return uit as T;
  }
  return v;
}

/**
 * De tijdlijn op papier: per werkstroom (groep) een eigen figuur, zodat de maanden boven elke
 * figuur staan en een figuur niet over een pagina breekt. Het laatste blok is de hele tijdlijn
 * waarvan alleen de legenda wordt getoond (stijl.ts, .evp-tl): zo staat de legenda er één keer,
 * met alles wat in de tijdlijn voorkomt.
 */
function tijdlijnPerGroep(b: Tijdlijn): DocBlok[] {
  const figuren: DocBlok[] = b.groepen.map((g, i) => ({ ...b, titel: i === 0 ? b.titel : "", legenda: "", groepen: [g] }));
  return [...figuren, { ...b, titel: "" }];
}

/** Plek van de eerste jaarwissel op de maandschaal (0..1); null als de tijdlijn binnen één jaar blijft. */
function jaargrens(b: Tijdlijn): number | null {
  const n = (b.maanden ?? []).length;
  const eerste = Math.floor((b.jaren ?? [])[0]?.maanden ?? 0);
  return n > 0 && eerste > 0 && eerste < n ? eerste / n : null;
}

/** De blokken van een deel in stukken: de tijdlijn en de evaluatie apart, de rest bij elkaar. */
function stukken(blokken: DocBlok[]): Stuk[] {
  const uit: Stuk[] = [];
  for (const b of blokken) {
    if (b.type === "tijdlijn" && (b.groepen ?? []).length > 1) {
      uit.push({ soort: "app", blokken: tijdlijnPerGroep(b), tijdlijn: true, jaargrens: jaargrens(b) });
    }
    else if (b.type === "evaluatie") uit.push({ soort: "evaluatie", blok: b });
    else {
      const laatste = uit[uit.length - 1];
      if (laatste && laatste.soort === "app" && !laatste.tijdlijn) laatste.blokken.push(b);
      else uit.push({ soort: "app", blokken: [b], tijdlijn: false });
    }
  }
  return uit;
}

/** Bloktypen die de breedte van een liggende pagina nodig hebben (plus een tabel met zes of meer kolommen). */
const BREDE_TYPEN: readonly DocBlok["type"][] = ["tijdlijn", "voortgangsbord", "werkstromen"];

/** Liggende pagina's voor een deel met de tijdlijn, het voortgangsbord of een brede tabel. */
function isLiggend(blokken: DocBlok[]): boolean {
  return blokken.some((b) => BREDE_TYPEN.includes(b.type) || (b.type === "tabel" && b.kolommen.length >= 6));
}

/** Kleinste tekst op papier: 9pt = 12px. */
const MIN_PX = 12;
/** Vergroting van blokken uit de app op een staande pagina; liggend staan ze op ware grootte. */
const ZOOM_STAAND = 1.1;

/** "1 · Planning en voortgang: de tijdlijn als basis" → nummer, hoofdtitel en ondertitel. */
function titelDelen(titel: string): { nr: string; hoofd: string; sub: string } {
  const m = /^\s*(\d+)\s*·\s*(.*)$/.exec(titel);
  const rest = (m ? m[2] : titel).trim();
  const i = rest.indexOf(":");
  return i > 0 ? { nr: m ? m[1] : "", hoofd: rest.slice(0, i).trim(), sub: rest.slice(i + 1).trim() } : { nr: m ? m[1] : "", hoofd: rest, sub: "" };
}

function hoofdletter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Blokken uit de app, getekend door het echte BewerkbaarDocument (weergave). `gegevens` zijn
 * de blokken die deze blokken van elkaar lezen; ze staan in een verborgen sectie vooraan.
 */
function AppBlokken({
  id,
  blokken,
  gegevens,
  zoom = 1,
  cls,
  jaargrens = null,
}: {
  id: string;
  blokken: DocBlok[];
  gegevens: DocBlok[];
  /** vergroting van het blok op papier (en op het scherm) */
  zoom?: number;
  cls?: string;
  /** tijdlijn: plek van de jaarwissel op de maandschaal (0..1), voor de lijn in elke regel */
  jaargrens?: number | null;
}) {
  const doc = useMemo<DocData>(() => {
    const inhoud: DocSectie = { id, titel: "Inhoud", intro: "", blokken };
    const secties: DocSectie[] =
      gegevens.length > 0 ? [{ id: GEGEVENS_ID, titel: "Gegevens", intro: "", blokken: gegevens }, inhoud] : [inhoud];
    return { titel: "", ondertitel: "", status: "", secties };
  }, [id, blokken, gegevens]);
  if (blokken.length === 0) return null;
  return (
    <div
      className={"evp-app" + (cls ? " " + cls : "") + (jaargrens !== null ? " evp-tl-jg" : "")}
      style={{ zoom, ...(jaargrens !== null ? { "--evp-jg": String(jaargrens) } : {}) } as CSSProperties}
      data-zoom={zoom}
    >
      <BewerkbaarDocument doc={doc} edit={false} onChange={NIETS} />
    </div>
  );
}

/** Kop van een onderdeel: nummer (bij een deel), titel, ondertitel en de inleiding. */
function Kop({ label, titel, intro, toon }: { label: string; titel: string; intro: string; toon: (s: string) => ReactNode }) {
  const d = titelDelen(titel);
  return (
    <>
      <header className="evp-deelkop">
        {d.nr && (
          <span className="evp-deelnr" aria-hidden="true">
            {d.nr}
          </span>
        )}
        <div className="evp-deelkop-t">
          {label && <p className="evp-eyebrow">{label}</p>}
          <h2>{d.hoofd}</h2>
          {d.sub && <p className="evp-deelsub">{hoofdletter(d.sub)}</p>}
        </div>
      </header>
      {intro.trim() && <p className="evp-intro">{toon(intro.trim())}</p>}
    </>
  );
}

/** Een kader uit de app dat hoger is dan dit (mm op papier) mag over een paginarand lopen. */
const KADER_BREEKBAAR_MM = 105;
/** Eén CSS-pixel in mm. */
const MM_PER_PX = 25.4 / 96;

/** Heeft dit element eigen tekst (niet alleen via kinderen)? Een keuzelijst telt ook. */
function heeftEigenTekst(el: HTMLElement): boolean {
  if (el.tagName === "SELECT") return true;
  for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE && (n.nodeValue ?? "").trim() !== "") return true;
  return false;
}

/**
 * Maakt het getekende papier klaar voor de pdf. De inhoud verandert hierna niet meer, dus React
 * zet niets terug.
 * - Links die alleen in de app werken gaan weg (in de versie voor 3sides alle links), net als
 *   tooltips en de tabvolgorde van keuzelijsten en vinkjes.
 * - Een koppeling "Jira-bord" zonder adres is in de app een plek om een link in te vullen; op
 *   papier vervalt ze.
 * - Tekst in de blokken uit de app die op papier kleiner dan 9pt zou zijn, wordt 9pt.
 * - Een lang kader (callout) mag over een paginarand lopen; een kort kader blijft bij elkaar.
 */
function maakStatisch(papier: HTMLElement, versie: ExportVersie) {
  for (const a of papier.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (versie === "intern" && /^https?:\/\//i.test(href)) continue;
    a.removeAttribute("href");
    a.removeAttribute("target");
    a.removeAttribute("rel");
  }
  for (const el of papier.querySelectorAll<HTMLElement>("[title]")) el.removeAttribute("title");
  for (const el of papier.querySelectorAll<HTMLElement>("select, input, button, textarea, summary")) el.tabIndex = -1;
  for (const el of papier.querySelectorAll<HTMLElement>(".wk-doc-leeg, .vb-doc-leeg")) {
    if (!/^\s*jira/i.test(el.textContent ?? "")) continue;
    const regel = el.parentElement;
    (regel && regel.tagName === "LI" ? regel : el).hidden = true;
  }
  for (const app of papier.querySelectorAll<HTMLElement>(".evp-app")) {
    const min = MIN_PX / (Number(app.dataset.zoom) || 1);
    const maat = Math.ceil(min * 100) / 100 + "px";
    for (const el of app.querySelectorAll<HTMLElement>(".okd-sec:not(#sec-" + GEGEVENS_ID + ") *")) {
      if (!heeftEigenTekst(el)) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < min - 0.01) el.style.fontSize = maat;
    }
    // na het vergroten van de letters meten: een lang kader mag breken
    const zoom = Number(app.dataset.zoom) || 1;
    for (const el of app.querySelectorAll<HTMLElement>(".okd-sec:not(#sec-" + GEGEVENS_ID + ") .okd-call")) {
      el.classList.toggle("evp-breekbaar", el.offsetHeight * zoom * MM_PER_PX > KADER_BREEKBAAR_MM);
    }
  }
}

export default function Afdruk({ session, versie, afdrukken }: { session: DINSession; versie: ExportVersie; afdrukken: boolean }) {
  const intern = versie === "intern";
  const papier = useRef<HTMLDivElement>(null);
  const [nu] = useState(() => new Date());
  const [status, setStatus] = useState("");

  // Dezelfde documenten als de tabbladen van stap 11 (doc-versie.ts: oplossen).
  const bewaardAnalyse = session.documenten?.[INTEGRATIE_SLEUTEL];
  const bewaardGesprek = session.documenten?.[EVALUATIE_GESPREK_SLEUTEL];
  // Interne versie: verwijzingen naar documenten worden links naar het document zelf, als de
  // vindplaats bekend is. Versie voor 3sides: platte tekst, zonder vindplaats van Cito.
  const basis = intern ? (session.koppelingen?.documentenBasis ?? "").trim() || STANDAARD_DOCUMENTEN_BASIS : "";
  const jira = intern ? (session.koppelingen?.jira ?? "").trim() : "";
  const links = basis !== "";

  const u = useMemo<EvaluatieUitsnede>(() => {
    const analyse = oplossen(DEFAULT_INTEGRATIE_3SIDES, bewaardAnalyse).doc;
    const gesprek = oplossen(DEFAULT_EVALUATIE_GESPREK, bewaardGesprek).doc;
    const uit = maakUitsnede(analyse, gesprek, versie);
    // zonder vindplaats blijven de linktekens [[…]] anders staan
    return links ? uit : diepTekst(uit, zonderLinktekens);
  }, [bewaardAnalyse, bewaardGesprek, versie, links]);

  // Interne versie: ook de links uit Vindplaatsen (statuspagina, verslagen, stappenplan), als ze zijn ingevuld.
  const koppelingen = session.koppelingen;
  const vindplaatsen = useMemo(() => {
    const uit: Partial<Record<Vindplaats, string>> = {};
    if (!intern) return uit;
    for (const v of VINDPLAATS_VELDEN) {
      const link = (koppelingen?.[v.sleutel] ?? "").trim();
      if (isWeblink(link)) uit[v.sleutel] = link;
    }
    return uit;
  }, [intern, koppelingen]);
  const bron = useMemo<Bron>(
    () => ({ documentenBasis: basis, jira, naslagTerugval: false, naslagHier: false, vindplaatsen }),
    [basis, jira, vindplaatsen]
  );
  const toon = useCallback((s: string): ReactNode => (links ? metBronlinks(s) : s), [links]);

  // De gegevens waar de blokken mee rekenen: het eerste blok per type uit u.gegevens, zoals
  // useBlok het in de analyse vindt. De werkstroomkaarten staan niet in de delen, wel hier.
  const gegevens = useMemo<DocBlok[]>(
    () => GEGEVENS_TYPEN.flatMap((type) => (u.gegevens ?? []).filter((b) => b.type === type).slice(0, 1)),
    [u]
  );
  const delen = useMemo(
    () => u.delen.map((d) => ({ ...d, stukken: stukken(d.sectie.blokken), liggend: isLiggend(d.sectie.blokken) })),
    [u]
  );

  const bestand = exportBestandsnaam(versie, "pdf", nu);
  const naam = bestand.replace(/\.pdf$/i, "");
  const datum = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const css = useMemo(() => afdrukCss(u.titel + (intern ? " · Intern Cito" : "")), [u.titel, intern]);

  // De browser stelt de titel van de pagina voor als bestandsnaam.
  useEffect(() => {
    const vorige = document.title;
    const zet = () => {
      document.title = naam;
    };
    zet();
    window.addEventListener("beforeprint", zet);
    return () => {
      window.removeEventListener("beforeprint", zet);
      document.title = vorige;
    };
  }, [naam]);

  useLayoutEffect(() => {
    if (papier.current) maakStatisch(papier.current, versie);
  }, [u, versie, links]);

  useEffect(() => {
    const na = () => setStatus("Het afdrukvenster is gesloten. Staat de pdf er nog niet, klik dan opnieuw op de knop.");
    window.addEventListener("afterprint", na);
    return () => window.removeEventListener("afterprint", na);
  }, []);

  // Geopend vanuit het exportpaneel (&afdrukken=1): het afdrukvenster één keer openen, zodra
  // de inhoud getekend is en de lettertypen geladen zijn.
  const geopend = useRef(false);
  useEffect(() => {
    if (!afdrukken || geopend.current) return;
    let actief = true;
    const klaar: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    void klaar.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!actief || geopend.current) return;
          geopend.current = true;
          window.print();
        })
      )
    );
    return () => {
      actief = false;
    };
  }, [afdrukken]);

  const inhoud: { nr: string; titel: string; sub: string }[] = [
    ...(u.brief ? [{ nr: "Brief", titel: "Begeleidende brief", sub: "" }] : []),
    ...(u.agenda ? [{ nr: "Agenda", titel: titelDelen(u.agenda.titel).hoofd, sub: "" }] : []),
    ...u.delen.map((d) => {
      const t = titelDelen(d.sectie.titel);
      return { nr: "Deel " + d.nummer, titel: t.hoofd, sub: t.sub };
    }),
    ...(u.bronnen.length > 0 ? [{ nr: "Bronnen", titel: "De gebruikte documenten", sub: "" }] : []),
  ];

  const bronnen = u.bronnen.length > 0 && (
    <div className="evp-deel">
      <Kop label="" titel="Bronnen: de gebruikte documenten" intro="" toon={toon} />
      <ul className="evp-bronnen">
        {u.bronnen.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
  // op een eigen blad als er geen deel is, of als het laatste deel liggend is
  const bronnenLos = delen.length === 0 || delen[delen.length - 1].liggend;

  const agenda = u.agenda && (
    <>
      <Kop label="" titel={u.agenda.titel} intro={u.agenda.intro ?? ""} toon={toon} />
      <AppBlokken id="agenda" blokken={u.agenda.blokken} gegevens={GEEN_BLOKKEN} zoom={ZOOM_STAAND} />
    </>
  );

  return (
    <BronContext.Provider value={bron}>
      <style>{BRON_CSS + css}</style>

      <div className="evp-balk">
        <p className="evp-balk-wat">
          <span className={"evp-merk" + (intern ? " evp-merk-intern" : "")}>{intern ? "Intern Cito" : "Voor 3sides"}</span>
          <span>
            <b>Afdrukweergave Evaluatie 3sides.</b>{" "}
            {intern
              ? "Interne versie voor de programma-eigenaar: alles, ook wat Cito zelf doet, ons oordeel, de notities en de onderbouwing."
              : "Versie om aan 3sides te overhandigen: wat we aan 3sides communiceren, met de begeleidende brief."}
          </span>
        </p>
        <div className="evp-balk-doe">
          <button
            type="button"
            className="evp-knop"
            onClick={() => {
              setStatus("Het afdrukvenster is geopend.");
              window.print();
            }}
          >
            PDF opslaan of afdrukken
          </button>
          <span className="evp-hint">
            Kies bij Bestemming: <b>Opslaan als PDF</b>. De browser stelt de naam {naam} voor.
          </span>
          {/* de interne versie hoort bij het tabblad Evaluatie intern, die voor 3sides bij Evaluatie 3sides */}
          <a className="evp-terug" href={`/sessies/${encodeURIComponent(session.id)}?stap=integratie&tab=${intern ? "evaluatie-intern" : "evaluatie"}`}>
            ← Terug naar het tabblad
          </a>
        </div>
        {status && (
          <p className="evp-status" role="status">
            {status}
          </p>
        )}
      </div>

      <div className="evp-papier" ref={papier}>
        <section className="evp-blad">
          <header className="evp-voor">
            <div className="evp-voor-boven">
              <p className="evp-eyebrow">Programma Klant in Zicht</p>
              <span className={"evp-merk" + (intern ? " evp-merk-intern" : "")}>{intern ? "Intern Cito" : "Versie voor 3sides"}</span>
            </div>
            <h1>{u.titel}</h1>
            {u.ondertitel && <p className="evp-voor-sub">{u.ondertitel}</p>}
          </header>
          <dl className="evp-meta">
            <div>
              <dt>Versie</dt>
              <dd>{intern ? "Intern Cito · voor de programma-eigenaar" : "Voor 3sides"}</dd>
            </div>
            {u.status && (
              <div>
                <dt>Status</dt>
                <dd>{u.status}</dd>
              </div>
            )}
            <div>
              <dt>Datum export</dt>
              <dd>{datum}</dd>
            </div>
          </dl>
          <p className="evp-versie">
            {intern
              ? "Deze versie bevat alles: wat we aan 3sides communiceren en, als intern gemarkeerd, wat Cito zelf doet, ons oordeel met de notities en de onderbouwing."
              : "Deze versie bevat wat we aan 3sides communiceren: de planning met wat er is geleverd en onze bevindingen per kader, met de begeleidende brief."}
          </p>
          {inhoud.length > 0 && (
            <nav className="evp-inhoud" aria-label="Inhoud">
              <h2>Inhoud</h2>
              <ol>
                {inhoud.map((x, i) => (
                  <li key={i}>
                    <span className="evp-inhoud-nr">{x.nr}</span>
                    <span className="evp-inhoud-t">
                      <b>{x.titel}</b>
                      {x.sub && <span>: {x.sub}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </section>

        {u.brief && (
          <section className="evp-blad evp-brief">
            <div className="evp-briefhoofd">
              <b>Cito</b>
              <span>Programma Klant in Zicht</span>
            </div>
            <AppBlokken id="brief" blokken={u.brief.blokken} gegevens={GEEN_BLOKKEN} />
          </section>
        )}

        {agenda && <section className="evp-blad">{agenda}</section>}

        {delen.map((d, di) => (
          <section key={d.bron} className={"evp-blad" + (d.liggend ? " evp-liggend" : "")}>
            <Kop label={"Deel " + d.nummer} titel={d.sectie.titel} intro={d.sectie.intro ?? ""} toon={toon} />
            {d.stukken.map((s, i) =>
              s.soort === "evaluatie" ? (
                <EvaluatieKaders key={i} blok={s.blok} intern={intern} toon={toon} />
              ) : (
                <AppBlokken
                  key={i}
                  id={d.bron + "-" + i}
                  blokken={s.blokken}
                  gegevens={gegevens}
                  zoom={d.liggend ? 1 : ZOOM_STAAND}
                  cls={s.tijdlijn ? "evp-tl" : undefined}
                  jaargrens={s.tijdlijn ? s.jaargrens : null}
                />
              )
            )}
            {/* de bronnen sluiten aan op het laatste deel, als dat staand is */}
            {di === delen.length - 1 && !bronnenLos && bronnen}
          </section>
        ))}

        {bronnenLos && bronnen && <section className="evp-blad">{bronnen}</section>}
      </div>
    </BronContext.Provider>
  );
}
