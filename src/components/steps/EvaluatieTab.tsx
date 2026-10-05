"use client";

// Stap 11, tabblad "Evaluatie 3sides": de kern voor het evaluatiegesprek met 3sides, voor de
// programma-eigenaar. Van boven naar beneden:
// 1. een compact kopje: wat dit tabblad is, de leesvolgorde (springlinks) en het exportpaneel;
// 2. de agenda (sectie "agenda" van het gespreksdocument, evaluatie-gesprek-default.ts);
// 3. drie delen uit de analyse (evaluatie-uitsnede.ts): hetzelfde document als het tabblad
//    Analyse (session.documenten["integratie-3sides"]), geen kopie. Alleen de secties uit
//    UITSNEDE_SECTIES en de blokken waarvoor inUitsnede geldt (dus zonder het actiebord van Cito);
// 4. de begeleidende brief (sectie "brief" van het gespreksdocument).
// Elk onderdeel staat in een eigen kader: een BewerkbaarDocument dat één sectie toont
// (alleenSecties). Het filteren gebeurt alleen bij het tekenen; wat wordt opgeslagen is
// altijd het hele document. Statussen, vinkjes, het oordeel en de notitie in de evaluatie
// worden in weergave meteen bewaard; met het potlood bij een deel bewerk je alleen dat deel
// (Opslaan of Annuleren in de balk die in beeld blijft). Opmerkingen bij een blok zijn dezelfde
// als in de analyse (zelfde document, sectie en blokindex).
// "deel N" in de teksten: staat het deel hier, dan springt de link ernaartoe; anders opent hij
// het tabblad Analyse bij dat deel (naarAnalyse), zonder de pagina te herladen. Hetzelfde
// vangnet geldt voor elke andere link naar een anker dat niet op dit tabblad staat.

import { useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useSession } from "@/lib/session-context";
import type { BewerkbaarDocument as DocData, DocSectie } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import {
  DEFAULT_EVALUATIE_GESPREK,
  EVALUATIE_GESPREK_SLEUTEL,
  GESPREK_AGENDA,
  GESPREK_BRIEF,
} from "@/lib/evaluatie-gesprek-default";
import { UITSNEDE_SECTIES, inUitsnede, isActiebord } from "@/lib/evaluatie-uitsnede";
import { isVerwijderd, kloon } from "@/lib/bewerkbaar-document";
import { metBasis, oplossen, overnemen } from "@/lib/doc-versie";
import type { DocVersie } from "@/lib/doc-versie";
import BewerkbaarDocument, { DOCUMENT_CSS, linkdoelen } from "@/components/bewerkbaar/BewerkbaarDocument";
import { DeelEldersContext, sectieKaart } from "@/components/bewerkbaar/bron-context";
import type { SectieKaart } from "@/components/bewerkbaar/bron-context";
import { OpmerkingenProvider } from "@/components/bewerkbaar/Opmerkingen";
import { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import type { Melding } from "@/components/bewerkbaar/BewerkBalk";
import { KNOP } from "@/components/bewerkbaar/stijl";
import EvaluatieExport from "@/components/steps/EvaluatieExport";

export const EVALUATIE_TAB = { id: "evaluatie", label: "Evaluatie 3sides" } as const;

/** Korte naam per deel uit de analyse, voor de leesvolgorde; zonder naam: de titel van de sectie. */
const KORTE_NAAM: Record<string, string> = {
  werkstromen: "Werkstromen",
  planning: "Planning en opleveringen",
  evaluatie: "Evaluatie",
};

// Vaste lijsten per kader (één sectie), zodat de gememoiseerde secties niet opnieuw renderen.
const ALLEEN_AGENDA = [GESPREK_AGENDA] as const;
const ALLEEN_BRIEF = [GESPREK_BRIEF] as const;
const ALLEEN: Record<string, readonly string[]> = Object.fromEntries(UITSNEDE_SECTIES.map((id) => [id, [id]]));

const KNOP_PRIMAIR = `${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90`;
const KNOP_RAND = `${KNOP} border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`;

type Meld = (melding: Melding) => void;

// ---------- een document uit de sessie, per sectie te bewerken ----------

interface SessieDocument {
  versie: DocVersie;
  /** wat getoond wordt: het concept zolang een sectie wordt bewerkt, anders de opgeslagen versie */
  doc: DocData;
  /** de sectie die wordt bewerkt (potlood), of null */
  editSectie: string | null;
  bewerk: (id: string) => void;
  opslaan: () => void;
  annuleren: () => void;
  wijzig: (doc: DocData) => void;
  /** zet in het concept de sectie die wordt bewerkt terug naar de voorsteltekst */
  herstelSectie: () => void;
  neemVoorstelOver: () => void;
  houdEigenVersie: () => void;
}

/**
 * Een bewerkbaar document uit de sessie (session.documenten[sleutel]) met dezelfde versies als
 * de andere tabbladen (doc-versie.ts): standaard, opgeslagen of automatisch overgenomen. Anders
 * dan in het tabblad Analyse wordt hier alleen per sectie bewerkt.
 */
function useSessieDocument(sleutel: string, standaard: DocData, meld: Meld): SessieDocument {
  const { session, updateSession } = useSession();
  const bewaard = session?.documenten?.[sleutel];
  const versie = useMemo(() => oplossen(standaard, bewaard), [standaard, bewaard]);
  const opgeslagen = versie.doc;
  const [editSectie, setEditSectie] = useState<string | null>(null);
  // Concept; gevuld met de opgeslagen versie zodra het potlood wordt gebruikt.
  const [draft, setDraft] = useState<DocData>(opgeslagen);
  const [draftBasis, setDraftBasis] = useState<string | undefined>(versie.basis);

  /** In de sessie bewaren: altijd het hele document, met de vingerafdruk van de voorsteltekst eronder. */
  function bewaar(doc: DocData, basis: string | undefined) {
    const klaar = metBasis(doc, basis);
    updateSession((prev) => ({ documenten: { ...(prev.documenten ?? {}), [sleutel]: klaar } }));
    meld({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  return {
    versie,
    doc: editSectie !== null ? draft : opgeslagen,
    editSectie,
    bewerk(id) {
      setDraft(kloon(opgeslagen));
      setDraftBasis(versie.basis);
      setEditSectie(id);
    },
    opslaan() {
      bewaar(draft, draftBasis);
      setEditSectie(null);
    },
    annuleren() {
      setDraft(kloon(opgeslagen));
      setEditSectie(null);
    },
    /**
     * In bewerkmodus naar het concept (bewaard bij Opslaan); in weergave meteen in de sessie:
     * dan komt de wijziging uit een blok dat ook in weergave bediend wordt (een status, een
     * vinkje, een oordeel). De basis blijft die van de getoonde versie.
     */
    wijzig(nieuw) {
      if (editSectie !== null) setDraft(nieuw);
      else bewaar(nieuw, versie.basis);
    },
    herstelSectie() {
      const bron = standaard.secties.find((s) => s.id === editSectie);
      if (!bron) return;
      setDraft((d) => ({ ...d, secties: d.secties.map((s) => (s.id === bron.id ? kloon(bron) : s)) }));
      meld({ tekst: "Voorstel-tekst teruggezet. Klik op Opslaan om dit te bewaren.", soort: "info" });
    },
    /** Nieuwere voorsteltekst overnemen; vinkjes, afgeronde onderdelen en ingevulde links blijven. */
    neemVoorstelOver() {
      bewaar(overnemen(standaard, bewaard), versie.standaard);
    },
    /** Eigen versie houden; de melding komt pas terug bij een volgende nieuwere voorsteltekst. */
    houdEigenVersie() {
      bewaar(opgeslagen, versie.standaard);
    },
  };
}

// ---------- melding bij een nieuwere voorsteltekst ----------

/**
 * Rustige balk boven een document: de voorsteltekst is bijgewerkt en deze sessie heeft eigen
 * tekst. Overnemen (na bevestiging, want eigen tekstwijzigingen vervallen) of de eigen versie
 * houden. Zonder bekende basis (opgeslagen vóór de versiecontrole) is "nieuwer" niet zeker.
 * Ook gebruikt door de tabbladen Analyse en Naslag (IntegratieStep.tsx).
 */
export function NieuwereVoorsteltekst(p: {
  basisBekend: boolean;
  onOvernemen: () => void;
  onHouden: () => void;
  /** waarvoor de voorsteltekst is, als er meer documenten op het tabblad staan: "de agenda en de brief" */
  onderwerp?: string;
}) {
  const [vraag, setVraag] = useState(false);
  const voor = p.onderwerp ? ` voor ${p.onderwerp}` : "";
  return (
    <section
      aria-label="Nieuwere voorsteltekst"
      className="rounded-xl border border-cito-border border-l-4 border-l-[#003366] bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-sm font-semibold text-[#003366]">
            {p.basisBekend
              ? `Er is een nieuwere voorsteltekst${voor}. Deze sessie heeft eigen aanpassingen.`
              : `De voorsteltekst${voor} kan nieuwer zijn dan deze versie. Deze sessie heeft eigen aanpassingen.`}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            Overnemen: vinkjes, afgeronde onderdelen en ingevulde links blijven; eigen tekstwijzigingen vervallen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!vraag ? (
            <button type="button" onClick={() => setVraag(true)} className={KNOP_PRIMAIR}>
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
            className={KNOP_RAND}
          >
            Mijn versie houden
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- wat er op het tabblad staat ----------

/** De sectie met deze id, als ze bestaat en niet is verwijderd. */
function vind(doc: DocData, id: string): DocSectie | null {
  return doc.secties.find((s) => s.id === id && !isVerwijderd(s)) ?? null;
}

/**
 * Alle linkdoelen op het tabblad als één tekst (een id per regel): de drie delen uit de analyse
 * met hun werkstroomkaarten en tijdlijngroepen, zonder de verborgen blokken, plus agenda en brief.
 */
function ankersOpTabblad(analyse: DocData, gesprek: DocData): string {
  const ids: string[] = [];
  for (const id of UITSNEDE_SECTIES) {
    const s = vind(analyse, id);
    if (s) ids.push(...linkdoelen(s, inUitsnede));
  }
  for (const id of [GESPREK_AGENDA, GESPREK_BRIEF]) if (vind(gesprek, id)) ids.push("sec-" + id);
  return ids.join("\n");
}

/** De sectiekaart van de hele analyse, met `elders` bij elk deel dat niet op dit tabblad staat. */
function deelKaartVan(analyse: DocData): SectieKaart[] {
  const hier: readonly string[] = UITSNEDE_SECTIES;
  return sectieKaart(analyse.secties.filter((s) => !isVerwijderd(s))).map((k) => ({
    nummer: k.nummer,
    id: k.id,
    elders: !hier.includes(k.id),
  }));
}

// ---------- kleine onderdelen ----------

/** "4 · De vier werkstromen: wat 3sides doet" → { nr: "4", rest: "De vier werkstromen: wat 3sides doet" }. */
function titelDelen(titel: string): { nr: string; rest: string } {
  const m = /^\s*(\d{1,2})\s*·\s*(.*)$/.exec(titel ?? "");
  return m ? { nr: m[1], rest: m[2].trim() } : { nr: "", rest: (titel ?? "").trim() };
}

function IcoonAgenda() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M5.5 4.5h7M5.5 8h7M5.5 11.5h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.8 4.5h.4M2.8 8h.4M2.8 11.5h.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcoonBrief() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.6 4.6 8 8.8l5.4-4.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

interface Stap {
  anker: string;
  naam: string;
  /** nummer van het deel in de analyse, of een icoon voor de onderdelen van dit tabblad */
  merk: ReactNode;
  /** uit de analyse: gevuld rondje met het nummer */
  uitAnalyse: boolean;
}

/** De leesvolgorde als springlinks: één regel op een breed scherm, onder elkaar op een telefoon. */
function Leesvolgorde({ stappen }: { stappen: Stap[] }) {
  return (
    <nav aria-label="Leesvolgorde van dit tabblad" className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4a5565]">Leesvolgorde</p>
      <ol className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        {stappen.map((s) => (
          <li key={s.anker} className="min-w-0">
            <a
              href={"#" + s.anker}
              className="flex h-full items-center gap-2.5 rounded-[10px] border border-[#d9e1eb] bg-[#f8fafc] px-3 py-2 text-[13.5px] font-bold leading-snug text-[#003366] transition-colors hover:border-[#003366]/50 hover:bg-[#eef4fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003366]"
            >
              <span
                className={
                  "grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-xs font-extrabold tabular-nums " +
                  (s.uitAnalyse ? "bg-[#003366] text-white" : "border border-[#003366]/45 bg-white text-[#003366]")
                }
              >
                {s.merk}
              </span>
              {s.naam}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Korte regel in de huisstijl van stap 11: wit vlak, dunne rand, eventueel een knop. */
function Regel(p: { children: ReactNode; knop?: ReactNode; toon?: "info" | "let-op" }) {
  const kleur =
    p.toon === "let-op"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : p.toon === "info"
        ? "border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a5f]"
        : "border-cito-border bg-white text-gray-700";
  return (
    <div role="note" className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${kleur}`}>
      <p className="min-w-0 flex-1 basis-64">{p.children}</p>
      {p.knop}
    </div>
  );
}

/** Balk die in beeld blijft zolang een deel wordt bewerkt: Opslaan, Annuleren en (optioneel) de voorsteltekst terug. */
function BewerkStrook(p: { titel: string; onOpslaan: () => void; onAnnuleren: () => void; onHerstel?: () => void }) {
  const [vraag, setVraag] = useState(false);
  return (
    <div
      role="region"
      aria-label="Bewerken"
      className="sticky top-2 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-amber-300 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur"
    >
      <div className="min-w-0 flex-1 basis-72">
        <p className="text-sm font-semibold text-amber-900">
          Je bewerkt: <span className="font-bold">{p.titel}</span>
        </p>
        <p className="mt-0.5 text-xs text-amber-900">
          <span className="hidden sm:inline">
            De gele velden zijn aanpasbaar; met × en + haal je blokken, regels en rijen weg of voeg je ze toe.{" "}
          </span>
          Niets wordt bewaard tot je op Opslaan klikt.
        </p>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setVraag(false);
            p.onOpslaan();
          }}
          className={`${KNOP} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          Opslaan
        </button>
        <button
          type="button"
          onClick={() => {
            setVraag(false);
            p.onAnnuleren();
          }}
          className={`${KNOP} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          Annuleren
        </button>
        {p.onHerstel &&
          (!vraag ? (
            <button
              type="button"
              onClick={() => setVraag(true)}
              className={`${KNOP} border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`}
            >
              Terug naar voorstel-tekst
            </button>
          ) : (
            <span className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Dit onderdeel vervangen door de voorstel-tekst?
              <button
                type="button"
                onClick={() => {
                  setVraag(false);
                  p.onHerstel?.();
                }}
                className="font-bold underline"
              >
                Ja
              </button>
              <button type="button" onClick={() => setVraag(false)} className="underline">
                Nee
              </button>
            </span>
          ))}
      </div>
    </div>
  );
}

// ---------- het tabblad ----------

export default function EvaluatieTab({ naarAnalyse }: { naarAnalyse: (anker: string) => void }) {
  // Eén melding tegelijk, vast onderin beeld: ook zichtbaar als je ver in een deel zit, en bij
  // typen in een notitie (elke toets wordt bewaard) blijft het bij één melding.
  const [melding, meld] = useMelding(3000);
  const analyse = useSessieDocument(INTEGRATIE_SLEUTEL, DEFAULT_INTEGRATIE_3SIDES, meld);
  const gesprek = useSessieDocument(EVALUATIE_GESPREK_SLEUTEL, DEFAULT_EVALUATIE_GESPREK, meld);

  // Eén deel tegelijk bewerken, over beide documenten heen: zolang er een open staat, zijn de
  // potloden bij de andere delen weg.
  const bezig = analyse.editSectie !== null ? analyse : gesprek.editSectie !== null ? gesprek : null;
  const bewerkAnalyse = bezig ? undefined : analyse.bewerk;
  const bewerkGesprek = bezig ? undefined : gesprek.bewerk;

  const delen = UITSNEDE_SECTIES.map((id) => ({ id: id as string, sectie: vind(analyse.doc, id) }));
  const agenda = vind(gesprek.doc, GESPREK_AGENDA);
  const brief = vind(gesprek.doc, GESPREK_BRIEF);
  const bezigTitel = bezig ? (vind(bezig.doc, bezig.editSectie ?? "")?.titel ?? "").trim() || "dit onderdeel" : "";

  // Linkdoelen op dit tabblad (secties, werkstroomkaarten, tijdlijngroepen), voor alle kaders
  // samen: een kaart in deel 4 linkt zo naar de tijdlijn in deel 5. Gememoiseerd op de ids zelf,
  // zodat typen in een deel de andere (gememoiseerde) secties ongemoeid laat.
  const ankerSleutel = ankersOpTabblad(analyse.doc, gesprek.doc);
  const paginaAnkers = useMemo(() => new Set(ankerSleutel.split("\n")), [ankerSleutel]);

  // Sectiekaart van de hele analyse voor "deel N": delen die hier niet staan, openen de analyse.
  // Ook de agenda en de brief gebruiken deze kaart, want zij verwijzen naar de delen van de analyse.
  const kaartSleutel = JSON.stringify(deelKaartVan(analyse.doc));
  const deelKaart = useMemo<SectieKaart[]>(() => JSON.parse(kaartSleutel) as SectieKaart[], [kaartSleutel]);

  const stappen: Stap[] = [
    ...(agenda ? [{ anker: "sec-" + agenda.id, naam: "Agenda", merk: <IcoonAgenda />, uitAnalyse: false }] : []),
    ...delen.map((d) => {
      const t = titelDelen(d.sectie?.titel ?? "");
      return { anker: "sec-" + d.id, naam: KORTE_NAAM[d.id] ?? (t.rest || "Deel"), merk: t.nr || "·", uitAnalyse: true };
    }),
    ...(brief ? [{ anker: "sec-" + brief.id, naam: "Begeleidende brief", merk: <IcoonBrief />, uitAnalyse: false }] : []),
  ];
  const nummers = delen.flatMap((d) => (d.sectie ? [titelDelen(d.sectie.titel).nr].filter(Boolean) : []));

  /**
   * Vangnet tegen dode links: een link naar een anker dat niet op dit tabblad staat, opent de
   * analyse bij dat anker ("deel N" regelt dat zelf al, zie bron-context.tsx).
   */
  function vangLink(e: MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
    const id = decodeURIComponent((a?.getAttribute("href") ?? "").slice(1));
    if (!id || document.getElementById(id)) return;
    e.preventDefault();
    naarAnalyse(id);
  }

  const naarAnalyseKnop = (anker: string, tekst: string) => (
    <button type="button" onClick={() => naarAnalyse(anker)} className={`${KNOP_RAND} flex-none`}>
      {tekst}
    </button>
  );

  /** Eén kader met een sectie van de analyse (zelfde document, zelfde opmerkingen als het tabblad Analyse). */
  const analyseKader = (id: string) => (
    <OpmerkingenProvider document={INTEGRATIE_SLEUTEL}>
      <BewerkbaarDocument
        doc={analyse.doc}
        edit={false}
        editSectie={analyse.editSectie}
        onBewerk={bewerkAnalyse}
        onChange={analyse.wijzig}
        alleenSecties={ALLEEN[id]}
        toonBlok={inUitsnede}
        paginaAnkers={paginaAnkers}
        deelKaart={deelKaart}
        stijl={false}
      />
    </OpmerkingenProvider>
  );

  /** Eén kader met een sectie van het gespreksdocument (agenda of brief). */
  const gesprekKader = (alleen: readonly string[], leeg: string) => (
    <OpmerkingenProvider document={EVALUATIE_GESPREK_SLEUTEL}>
      <BewerkbaarDocument
        doc={gesprek.doc}
        edit={false}
        editSectie={gesprek.editSectie}
        onBewerk={bewerkGesprek}
        onChange={gesprek.wijzig}
        alleenSecties={alleen}
        paginaAnkers={paginaAnkers}
        deelKaart={deelKaart}
        leegTekst={leeg}
        stijl={false}
      />
    </OpmerkingenProvider>
  );

  return (
    <DeelEldersContext.Provider value={naarAnalyse}>
      <div className="space-y-7" role="tabpanel" aria-label={EVALUATIE_TAB.label} onClick={vangLink}>
        <style>{DOCUMENT_CSS}</style>

        <header className="rounded-xl border border-cito-border bg-white px-4 py-4 sm:px-6 sm:py-5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4a5565]">
            Voor de programma-eigenaar
            {gesprek.doc.status.trim() && (
              <span className="rounded-full border border-[#c3cedb] bg-[#f8fafc] px-2.5 py-0.5 text-[#003366]">
                {gesprek.doc.status}
              </span>
            )}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight text-[#003366]">
            {gesprek.doc.titel.trim() || "Evaluatie 3sides: kern voor het gesprek"}
          </h2>
          {gesprek.doc.ondertitel.trim() && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">{gesprek.doc.ondertitel}</p>
          )}
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
            De kern voor het evaluatiegesprek met 3sides, in leesvolgorde: de agenda, drie delen uit de analyse en de
            begeleidende brief.
          </p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[#4a5565]">
            De delen houden hun nummer uit de analyse{nummers.length > 0 ? ` (${opsomming(nummers)})` : ""}, omdat de
            teksten daarnaar verwijzen; een verwijzing naar een ander deel opent het tabblad Analyse. Het is dezelfde
            inhoud: wat je hier aanpast, is ook in de analyse aangepast.
          </p>
          <Leesvolgorde stappen={stappen} />
          <div className="mt-4 border-t border-cito-border pt-4 empty:hidden">
            <EvaluatieExport />
          </div>
        </header>

        {bezig && (
          <BewerkStrook
            titel={bezigTitel}
            onOpslaan={bezig.opslaan}
            onAnnuleren={bezig.annuleren}
            onHerstel={bezig === gesprek ? gesprek.herstelSectie : undefined}
          />
        )}

        {!bezig && gesprek.versie.stand === "eigen" && (
          <NieuwereVoorsteltekst
            basisBekend={gesprek.versie.basis !== undefined}
            onderwerp="de agenda en de begeleidende brief"
            onOvernemen={gesprek.neemVoorstelOver}
            onHouden={gesprek.houdEigenVersie}
          />
        )}
        {!bezig && analyse.versie.stand === "eigen" && (
          <Regel knop={naarAnalyseKnop("", "Naar de analyse")}>
            De analyse in deze sessie heeft eigen aanpassingen op een oudere voorsteltekst; de drie delen hieronder komen
            uit die versie. Of je de nieuwere voorsteltekst overneemt, kies je in het tabblad Analyse.
          </Regel>
        )}

        {agenda && gesprekKader(ALLEEN_AGENDA, "Nog geen inhoud. Met Bewerken hierboven vul je de agenda in.")}

        {delen.map((d) => {
          if (!d.sectie) {
            return (
              <div key={d.id} id={"sec-" + d.id} className="scroll-mt-4">
                <Regel toon="let-op" knop={naarAnalyseKnop("", "Naar de analyse")}>
                  <b>{KORTE_NAAM[d.id] ?? "Dit deel"}</b> is in de analyse van deze sessie verwijderd en staat daarom
                  ook hier niet. Terugzetten kan in het tabblad Analyse, met ✎ Bewerken en dan Terug naar
                  voorstel-tekst; dat zet de hele analyse terug naar de voorsteltekst.
                </Regel>
              </div>
            );
          }
          // Blokken van dit deel die bewust niet op dit tabblad staan (het actiebord van Cito).
          const verborgen = d.sectie.blokken.filter((b) => !inUitsnede(d.id, b));
          const namen = verborgen.map((b) => ("titel" in b && typeof b.titel === "string" ? b.titel.trim() : "")).filter(Boolean);
          const nr = titelDelen(d.sectie.titel).nr;
          return (
            <div key={d.id} className="space-y-2">
              {analyseKader(d.id)}
              {verborgen.length > 0 && (
                <Regel knop={naarAnalyseKnop("sec-" + d.id, nr ? `Naar deel ${nr} in de analyse` : "Naar de analyse")}>
                  Niet op dit tabblad: {verborgen.every(isActiebord) ? "het actiebord" : "een onderdeel"}
                  {namen.length > 0 && <> “{namen.join("”, “")}”</>}. Dat staat alleen in de analyse, in dit deel.
                </Regel>
              )}
            </div>
          );
        })}

        {brief && (
          <div className="space-y-2">
            <Regel toon="info">
              <b>Alleen in de versie voor 3sides.</b> Deze brief gaat mee met de versie die aan 3sides wordt
              overhandigd; in de interne versie staat hij niet.
            </Regel>
            {gesprekKader(ALLEEN_BRIEF, "Nog geen inhoud. Met Bewerken hierboven schrijf je de brief.")}
          </div>
        )}

        {melding && (
          <div
            role="status"
            className={
              "fixed bottom-14 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-lg " +
              (melding.soort === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-blue-200 bg-blue-50 text-blue-800")
            }
          >
            {melding.tekst}
          </div>
        )}
      </div>
    </DeelEldersContext.Provider>
  );
}

/** ["4", "5", "8"] → "4, 5 en 8". */
function opsomming(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " en " + items[items.length - 1];
}
