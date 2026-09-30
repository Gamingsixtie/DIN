"use client";

// Stap 11 — "Programma × 3sides", met drie tabbladen:
// 1. Analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides
//    heeft opgeleverd (src/lib/integratie-3sides-default.ts).
// 2. Naslag: de kern van alle 3sides-documenten, per document met paginanummer of
//    tabblad (src/lib/kern-3sides-default.ts). Direct te openen met ?stap=integratie&tab=kern.
// 3. Voortgang: het voortgangsbord uit de analyse, los; vinkjes zet je daar (meteen
//    bewaard), teksten bewerk je in de analyse. Direct te openen met ?stap=integratie&tab=voortgang.
// De documenten zijn per kop en per cel handmatig aanpasbaar; aanpassingen worden in de
// sessie bewaard (session.documenten[sleutel], localStorage-first + Supabase via updateSession).
// Een wijziging uit een blok in weergavemodus (bijv. een vinkje in het voortgangsbord) wordt
// meteen opgeslagen; in bewerkmodus loopt alles via het concept en de knop Opslaan.
// Versies (src/lib/doc-versie.ts): elke opgeslagen versie draagt de vingerafdruk van de
// voorsteltekst waarop ze rust (basis). Heeft de sessie sinds die basis geen eigen tekst,
// dan verschijnt een nieuwere voorsteltekst vanzelf, met de vinkjes, afgeronde onderdelen en
// ingevulde links; met eigen tekst toont het tabblad een melding: overnemen of eigen versie houden.
// Boven de tabbladen de instelling "Vindplaatsen" (session.koppelingen): de map met de
// 3sides-documenten en het Jira-bord. Met een ingevulde map worden alle paginaverwijzingen
// in de documenten links naar het document op die pagina; zonder map linken ze naar het
// naslag-tabblad bij dat document (bron-context.tsx). "deel N" springt naar dat deel.
// Bij het laden en bij het wisselen van tabblad scrolt de pagina naar #<id> uit de link,
// zodra dat element er is; het gekozen tabblad staat in de url (?tab=…).
// Intern Cito: bewust geen statische of openbare versie.

import { useEffect, useId, useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BewerkbaarDocument as DocData, DocBlok, DocSectie } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { DEFAULT_KERN_3SIDES, KERN_3SIDES_SLEUTEL } from "@/lib/kern-3sides-default";
import { isVerwijderd, kloon } from "@/lib/bewerkbaar-document";
import { metBasis, oplossen, overnemen } from "@/lib/doc-versie";
import BewerkBalk, { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import BewerkbaarDocument from "@/components/bewerkbaar/BewerkbaarDocument";
import { BronProvider, bronUrl, STANDAARD_DOCUMENTEN_BASIS } from "@/components/bewerkbaar/bron-context";
import { DocContext, DocZetContext } from "@/components/bewerkbaar/doc-context";
import { DOC_CSS, KNOP, LEESBAAR_CSS, OK_CSS } from "@/components/bewerkbaar/stijl";
import VoortgangsbordBlok, { VOORTGANGSBORD_CSS } from "@/components/bewerkbaar/blokken/VoortgangsbordBlok";

const HINT =
  "Bewerkmodus: de gele velden zijn aanpasbaar; met × en + haal je secties, blokken, regels, rijen, kolommen, kaarten, lagen en groepen weg of voeg je ze toe. Niets wordt bewaard tot je op Opslaan klikt.";

const DOCUMENT_TABBLADEN = [
  {
    id: "analyse",
    label: "Analyse: programma × 3sides",
    sleutel: INTEGRATIE_SLEUTEL,
    standaard: DEFAULT_INTEGRATIE_3SIDES,
    intro:
      "Integratie-analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides heeft opgeleverd. Intern Cito, ter voorbereiding van de sessie van maandag. Namen en teksten pas je per kop zelf aan; aanpassingen worden in deze sessie bewaard.",
  },
  {
    id: "kern",
    label: "Naslag: kern van de 3sides-documenten",
    sleutel: KERN_3SIDES_SLEUTEL,
    standaard: DEFAULT_KERN_3SIDES,
    intro:
      "Samenvatting van alle documenten van 3sides in de map '3sides input': per document de kern, met paginanummer of tabblad. Persoonlijke naslag van de programma-architect; de analyse voor de sessie staat in het andere tabblad.",
  },
] as const;

type Tabblad = (typeof DOCUMENT_TABBLADEN)[number];

const VOORTGANG_TAB = { id: "voortgang", label: "Voortgang" } as const;

/** Alle tabbladen in volgorde; het voortgangsbord is geen document maar een uitsnede van de analyse. */
const TABBLADEN: readonly (Tabblad | typeof VOORTGANG_TAB)[] = [...DOCUMENT_TABBLADEN, VOORTGANG_TAB];

const ANALYSE_TAB = 0;

function beginTab(): number {
  if (typeof window === "undefined") return 0;
  const i = TABBLADEN.findIndex((t) => t.id === new URLSearchParams(window.location.search).get("tab"));
  return i < 0 ? 0 : i;
}

/**
 * Zet het tabblad (en een eventueel anker) in de url, zonder navigatie en zonder de
 * geschiedenis te vullen; ?stap=integratie erbij zodat de link ook na herladen klopt.
 */
function zetUrl(tabId: string, anker: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("stap", "integratie");
  url.searchParams.set("tab", tabId);
  url.hash = anker;
  window.history.replaceState(window.history.state, "", url);
}

/** Link-knop naast de tabbladen (zelfde maat als de tabbladen). */
const LINKKNOP =
  "ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white transition-colors";

export default function IntegratieStep() {
  const { session } = useSession();
  const [actief, setActief] = useState(beginTab);
  const tab = TABBLADEN[actief];
  const documentenBasis = session?.koppelingen?.documentenBasis ?? "";
  const jira = (session?.koppelingen?.jira ?? "").trim();

  // Na het laden en bij het wisselen van tabblad: naar het anker uit de url, zodra het
  // element er is (de inhoud rendert eerst); na een paar seconden zonder element: laten.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    let pogingen = 0;
    const timer = window.setInterval(() => {
      pogingen += 1;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
      if (el || pogingen >= 20) window.clearInterval(timer);
    }, 150);
    return () => window.clearInterval(timer);
  }, [actief]);

  /** Naar een tabblad, eventueel naar een anker daarin. */
  function kies(i: number, anker = "") {
    zetUrl(TABBLADEN[i].id, anker);
    setActief(i);
  }

  return (
    <div className="space-y-4">
      <Vindplaatsen />

      <div role="tablist" aria-label="Onderdelen van stap 11" className="flex flex-wrap items-center gap-2">
        {TABBLADEN.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === actief}
            onClick={() => kies(i)}
            className={
              "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors " +
              (i === actief
                ? "bg-[#003366] text-white border-[#003366]"
                : "bg-white text-[#003366] border-slate-300 hover:border-[#003366]")
            }
          >
            {t.label}
          </button>
        ))}
        {jira && (
          <a
            href={jira}
            target="_blank"
            rel="noopener noreferrer"
            className={LINKKNOP}
            title="Opent het Jira-bord van 3sides in een nieuw tabblad"
          >
            Jira-bord <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      {/* key: bij wisselen van tabblad start de bewerkstatus opnieuw */}
      <BronProvider documentenBasis={documentenBasis} jira={jira} naslagHier={tab.id === "kern"}>
        {tab.id === "voortgang" ? (
          <VoortgangTab naarAnalyse={(anker) => kies(ANALYSE_TAB, anker)} jira={jira} />
        ) : (
          <DocumentTab key={tab.id} tab={tab} />
        )}
      </BronProvider>
    </div>
  );
}

// ---------- vindplaatsen ----------

/** Ziet de link eruit als een map op een schijf? Die kan de browser vanuit de app niet openen. */
function isSchijfpad(s: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\\\\|file:)/i.test(s.trim());
}

/**
 * Compacte, inklapbare regel boven de tabbladen: de map met de 3sides-documenten en het
 * Jira-bord. Opslaan bij verlaten van een veld of met de knop; waarden in session.koppelingen.
 */
function Vindplaatsen() {
  const { session, updateSession } = useSession();
  const opgeslagenBasis = session?.koppelingen?.documentenBasis ?? "";
  const opgeslagenJira = session?.koppelingen?.jira ?? "";
  const [basis, setBasis] = useState(opgeslagenBasis);
  const [jira, setJira] = useState(opgeslagenJira);
  // De velden volgen de sessie zodra die (later) laadt of elders verandert.
  const [vorige, setVorige] = useState({ basis: opgeslagenBasis, jira: opgeslagenJira });
  if (vorige.basis !== opgeslagenBasis || vorige.jira !== opgeslagenJira) {
    setVorige({ basis: opgeslagenBasis, jira: opgeslagenJira });
    setBasis(opgeslagenBasis);
    setJira(opgeslagenJira);
  }
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useMelding();
  const idBasis = useId();
  const idJira = useId();

  // Documenten: een eigen map gaat voor, anders de standaard in Supabase (bron-context.tsx).
  const docStand = opgeslagenBasis.trim()
    ? "documenten: eigen map"
    : STANDAARD_DOCUMENTEN_BASIS
      ? "documenten: gekoppeld via Supabase"
      : "documenten: nog niet gekoppeld";
  const stand = docStand + " · " + (opgeslagenJira.trim() ? "Jira-bord ingevuld" : "Jira-bord nog niet ingevuld");
  const gewijzigd = basis.trim() !== opgeslagenBasis || jira.trim() !== opgeslagenJira;
  const proef = useMemo(() => bronUrl(basis, "plan-van-aanpak", 2), [basis]);

  function opslaan(alleenBijWijziging: boolean) {
    if (alleenBijWijziging && !gewijzigd) return;
    const b = basis.trim();
    const j = jira.trim();
    updateSession((prev) => ({ koppelingen: { ...(prev.koppelingen ?? {}), documentenBasis: b, jira: j } }));
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  return (
    <section className="rounded-xl border border-cito-border bg-white" aria-label="Vindplaatsen">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-[#003366]">
          <span aria-hidden="true" className="mr-1.5 inline-block text-xs">
            {open ? "▾" : "▸"}
          </span>
          Vindplaatsen
        </span>
        <span className="text-xs text-gray-500">{stand}</span>
        {!open && !opgeslagenJira.trim() && (
          <span className="text-xs text-gray-500">· vul de link van het Jira-bord in zodra die er is</span>
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-cito-border px-4 pb-4 pt-3">
          <p className="text-xs text-gray-600">
            Vul de link in; alle paginaverwijzingen in dit stuk worden dan links naar het document op die pagina.
            Gebruik een weblink naar de map (bijvoorbeeld SharePoint of OneDrive); de bestandsnaam komt er automatisch achter.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label htmlFor={idBasis} className="block text-xs font-semibold text-gray-700">
              Map met de 3sides-documenten (link)
              <input
                id={idBasis}
                type="url"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                onBlur={() => opslaan(true)}
                placeholder="https://…/3sides input"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
              />
            </label>
            <label htmlFor={idJira} className="block text-xs font-semibold text-gray-700">
              Jira-bord (link)
              <input
                id={idJira}
                type="url"
                value={jira}
                onChange={(e) => setJira(e.target.value)}
                onBlur={() => opslaan(true)}
                placeholder="https://….atlassian.net/jira/…"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
              />
            </label>
          </div>
          {isSchijfpad(basis) && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
              Dit is een map op een schijf. Zo&apos;n link kan de browser vanuit de app niet openen; gebruik de weblink van
              de map (SharePoint of OneDrive: Kopieer koppeling).
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => opslaan(false)}
              className={`${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90`}
            >
              Opslaan
            </button>
            {proef && (
              <a
                href={proef}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#003366] underline decoration-dotted underline-offset-2 hover:decoration-solid"
                title={proef}
              >
                Test: open plan van aanpak p. 2 <span aria-hidden="true">↗</span>
              </a>
            )}
            {melding && (
              <span
                role="status"
                className={`text-xs rounded-lg px-3 py-1.5 border ${
                  melding.soort === "ok"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                {melding.tekst}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- document ----------

function DocumentTab({ tab }: { tab: Tabblad }) {
  const { session, updateSession } = useSession();
  const bewaard = session?.documenten?.[tab.sleutel];
  // Wat getoond wordt: de standaard, de opgeslagen versie, of een nieuwere voorsteltekst die
  // automatisch is overgenomen omdat de sessie geen eigen tekst had (doc-versie.ts).
  const versie = useMemo(() => oplossen(tab.standaard, bewaard), [tab.standaard, bewaard]);
  const opgeslagen = versie.doc;
  const [edit, setEdit] = useState(false);
  // Alleen deze sectie bewerken (potlood bij de sectiekop); null = geen of alles.
  const [editSectie, setEditSectie] = useState<string | null>(null);
  const bezig = edit || editSectie !== null;
  // Concept; wordt bij het starten van de bewerkmodus gevuld met de opgeslagen versie.
  const [draft, setDraft] = useState<DocData>(opgeslagen);
  // De voorsteltekst waarop het concept rust: die van de getoonde versie; na "Terug naar
  // voorstel-tekst" de huidige.
  const [draftBasis, setDraftBasis] = useState<string | undefined>(versie.basis);
  const [melding, setMelding] = useMelding();

  /** In de sessie bewaren, met de vingerafdruk van de voorsteltekst waarop het document rust. */
  function bewaar(doc: DocData, basis: string | undefined) {
    const klaar = metBasis(doc, basis);
    updateSession((prev) => ({
      documenten: { ...(prev.documenten ?? {}), [tab.sleutel]: klaar },
    }));
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  function bewerken() {
    setDraft(kloon(opgeslagen));
    setDraftBasis(versie.basis);
    setEditSectie(null);
    setEdit(true);
  }
  /** Potlood bij een sectiekop: alleen die sectie wordt bewerkbaar, de rest blijft leesbaar. */
  function bewerkSectie(id: string) {
    setDraft(kloon(opgeslagen));
    setDraftBasis(versie.basis);
    setEdit(false);
    setEditSectie(id);
  }
  function opslaan() {
    bewaar(draft, draftBasis);
    setEdit(false);
    setEditSectie(null);
  }
  function annuleren() {
    setDraft(kloon(opgeslagen));
    setEdit(false);
    setEditSectie(null);
  }
  function herstel() {
    setDraft(kloon(tab.standaard));
    setDraftBasis(versie.standaard);
    setMelding({ tekst: "Voorstel-tekst teruggezet — klik op Opslaan om dit te bewaren", soort: "info" });
  }
  /**
   * Wijziging uit het document. In bewerkmodus naar het concept (bewaard bij Opslaan);
   * in weergavemodus meteen in de sessie, want dan komt de wijziging uit een blok dat ook
   * in weergave bediend wordt (bijv. een vinkje in het voortgangsbord). De basis blijft die
   * van de getoonde versie: een vinkje is geen keuze voor of tegen een nieuwere voorsteltekst.
   */
  function wijzig(nieuw: DocData) {
    if (bezig) {
      setDraft(nieuw);
      return;
    }
    bewaar(nieuw, versie.basis);
  }
  /** Nieuwere voorsteltekst overnemen; vinkjes, afgeronde onderdelen en ingevulde links blijven. */
  function neemVoorstelOver() {
    bewaar(overnemen(tab.standaard, bewaard), versie.standaard);
  }
  /** Eigen versie houden; de melding komt pas terug bij een volgende nieuwere voorsteltekst. */
  function houdEigenVersie() {
    bewaar(opgeslagen, versie.standaard);
  }

  return (
    <div className="space-y-4" role="tabpanel" aria-label={tab.label}>
      <BewerkBalk
        intro={tab.intro}
        edit={bezig}
        melding={melding}
        onBewerken={bewerken}
        onOpslaan={opslaan}
        onAnnuleren={annuleren}
        onHerstel={herstel}
        hint={HINT}
        notitie={
          versie.eigenTekst
            ? "Aangepaste versie uit deze sessie. De oorspronkelijke voorstel-tekst zet je terug via ✎ Bewerken → Terug naar voorstel-tekst."
            : null
        }
      />

      {!bezig && versie.stand === "eigen" && (
        <NieuwereVoorsteltekst
          basisBekend={versie.basis !== undefined}
          onOvernemen={neemVoorstelOver}
          onHouden={houdEigenVersie}
        />
      )}

      <BewerkbaarDocument
        doc={bezig ? draft : opgeslagen}
        edit={edit}
        editSectie={editSectie}
        onBewerk={bewerkSectie}
        onChange={wijzig}
      />
    </div>
  );
}

/**
 * Rustige balk boven het document: de voorsteltekst is bijgewerkt en deze sessie heeft eigen
 * tekst. Overnemen (na bevestiging, want eigen tekstwijzigingen vervallen) of de eigen versie
 * houden. Zonder bekende basis (opgeslagen vóór de versiecontrole) is "nieuwer" niet zeker.
 */
function NieuwereVoorsteltekst(p: { basisBekend: boolean; onOvernemen: () => void; onHouden: () => void }) {
  const [vraag, setVraag] = useState(false);
  return (
    <section
      aria-label="Nieuwere voorsteltekst"
      className="rounded-xl border border-cito-border border-l-4 border-l-[#003366] bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-sm font-semibold text-[#003366]">
            {p.basisBekend
              ? "Er is een nieuwere voorsteltekst. Deze sessie heeft eigen aanpassingen."
              : "De voorsteltekst kan nieuwer zijn dan deze versie. Deze sessie heeft eigen aanpassingen."}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            Overnemen: vinkjes, afgeronde onderdelen en ingevulde links blijven; eigen tekstwijzigingen vervallen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!vraag ? (
            <button
              type="button"
              onClick={() => setVraag(true)}
              className={`${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90`}
            >
              Nieuwe voorsteltekst overnemen
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Eigen tekstwijzigingen vervallen. Overnemen?
              <button
                type="button"
                onClick={() => {
                  setVraag(false);
                  p.onOvernemen();
                }}
                className="font-bold underline"
              >
                Ja, overnemen
              </button>
              <button type="button" onClick={() => setVraag(false)} className="underline">
                Nee
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setVraag(false);
              p.onHouden();
            }}
            title="De melding verdwijnt tot er weer een nieuwere voorsteltekst is"
            className={`${KNOP} border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`}
          >
            Mijn versie houden
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- voortgang ----------

/** Nummer uit een sectietitel "9 · Bronnen" → "deel 9"; zonder nummer null. */
function deelNaam(s: DocSectie): string | null {
  const m = s.titel.match(/^\s*(\d{1,2})\s*·/);
  return m ? "deel " + m[1] : null;
}

/** Geen linkdoelen: de werkstroomkaarten en de tijdlijn staan niet op dit tabblad (geen dode links). */
const GEEN_ANKERS: ReadonlySet<string> = new Set();

type Voortgangsbord = Extract<DocBlok, { type: "voortgangsbord" }>;

/**
 * Het eerste voortgangsbord in het document, met zijn sectie en de plek (index in
 * doc.secties en in de blokken) om het te kunnen wijzigen; null als het er niet is.
 */
function vindVoortgangsbord(doc: DocData): { sectie: DocSectie; blok: Voortgangsbord; si: number; bi: number } | null {
  for (let si = 0; si < doc.secties.length; si++) {
    const sectie = doc.secties[si];
    if (isVerwijderd(sectie)) continue;
    for (let bi = 0; bi < sectie.blokken.length; bi++) {
      const blok = sectie.blokken[bi];
      if (blok.type === "voortgangsbord") return { sectie, blok, si, bi };
    }
  }
  return null;
}

// Zolang het blok nog niets rendert (lege opzet), toont de pagina een korte melding in
// plaats van een leeg vlak: het vak is dan leeg (:empty) en de melding erna wordt zichtbaar.
const VOORTGANG_CSS = `
.okd .okd-vb-leeg{display:none}
.okd .okd-vb-vak:empty + .okd-vb-leeg{display:block}
`;

/**
 * Het voortgangsbord uit de analyse, los: hetzelfde document (voorstel-tekst plus wat in
 * de sessie is aangepast), alleen het blok van type "voortgangsbord", in weergavemodus.
 * Het bord leest de tijdlijn en de werkstroomkaarten uit het document via de DocContext.
 * Een vinkje in het bord wijzigt het analyse-document en wordt meteen in de sessie bewaard;
 * teksten en regels bewerk je in de analyse.
 */
function VoortgangTab({ naarAnalyse, jira }: { naarAnalyse: (anker: string) => void; jira: string }) {
  const { session, updateSession } = useSession();
  const bewaard = session?.documenten?.[INTEGRATIE_SLEUTEL];
  // dezelfde oplossing als het tabblad Analyse (doc-versie.ts)
  const versie = useMemo(() => oplossen(DEFAULT_INTEGRATIE_3SIDES, bewaard), [bewaard]);
  const doc = versie.doc;
  const plek = vindVoortgangsbord(doc);
  const deel = plek ? deelNaam(plek.sectie) : null;
  const anker = plek ? "sec-" + plek.sectie.id : "";
  const [melding, setMelding] = useMelding();

  /**
   * Wijziging uit het bord (vinkje): op een kopie van het hele document, dan opslaan, met de
   * basis van de getoonde versie (de keuze voor een nieuwere voorsteltekst maak je in de analyse).
   */
  function zet(fn: (b: Voortgangsbord) => void) {
    if (!plek) return;
    const n = kloon(doc);
    const b = n.secties[plek.si]?.blokken[plek.bi];
    if (!b || b.type !== "voortgangsbord") return;
    fn(b);
    const klaar = metBasis(n, versie.basis);
    updateSession((prev) => ({
      documenten: { ...(prev.documenten ?? {}), [INTEGRATIE_SLEUTEL]: klaar },
    }));
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  /** Wijziging elders in het document (voortgang van een onderdeel in de tijdlijn), dan opslaan. */
  function zetDoc(fn: (d: DocData) => void) {
    const n = kloon(doc);
    fn(n);
    const klaar = metBasis(n, versie.basis);
    updateSession((prev) => ({
      documenten: { ...(prev.documenten ?? {}), [INTEGRATIE_SLEUTEL]: klaar },
    }));
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  return (
    <div className="space-y-4" role="tabpanel" aria-label={VOORTGANG_TAB.label}>
      <div className="rounded-xl border border-cito-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-gray-700">
            Hoe ver we zijn en wat we nog van 3sides nodig hebben, in één bord. Het bord is een uitsnede van de
            analyse; vinkjes zet je hier, teksten pas je in de analyse aan.
          </p>
          {melding && (
            <span
              role="status"
              className={`text-xs rounded-lg px-3 py-1.5 border ${
                melding.soort === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {melding.tekst}
            </span>
          )}
          {plek && (
            <button
              type="button"
              onClick={() => naarAnalyse(anker)}
              className={`${KNOP} border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`}
              title="Opent de analyse bij het voortgangsbord"
            >
              Bewerken in de analyse{deel ? ` (${deel})` : ""}
            </button>
          )}
          {jira && (
            <a
              href={jira}
              target="_blank"
              rel="noopener noreferrer"
              className={`${KNOP} inline-flex items-center gap-1.5 bg-cito-blue text-white hover:bg-cito-blue/90`}
              title="Opent het Jira-bord van 3sides in een nieuw tabblad"
            >
              Jira-bord <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>

      {plek ? (
        <DocContext.Provider value={doc}>
          <DocZetContext.Provider value={zetDoc}>
          <div className="ok okd rounded-xl border border-cito-border bg-[#eef1f5] p-2.5 sm:p-6">
            <style>{OK_CSS + DOC_CSS + VOORTGANGSBORD_CSS + VOORTGANG_CSS + LEESBAAR_CSS}</style>
            <div className="okd-vb-vak">
              <VoortgangsbordBlok b={plek.blok} edit={false} zet={zet} ankers={GEEN_ANKERS} />
            </div>
            <p className="okd-p okd-vb-leeg" role="status">
              Voortgangsbord wordt gebouwd.
            </p>
          </div>
          </DocZetContext.Provider>
        </DocContext.Provider>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
          Er staat nog geen voortgangsbord in de analyse. Zet in het tabblad Analyse via ✎ Bewerken → Terug naar
          voorstel-tekst de voorstel-tekst terug en sla op; daarna verschijnt het bord hier.
        </div>
      )}
    </div>
  );
}
