"use client";

// Stap 11, tabblad "Evaluatie intern": alleen voor Cito, gaat niet naar 3sides. Naast het
// tabblad "Evaluatie 3sides" (EvaluatieTab.tsx), dat alleen toont wat we aan 3sides
// communiceren. Van boven naar beneden:
// 1. een kopje dat zegt dat dit intern is, met de leesvolgorde (springlinks);
// 2. het deel Evaluatie uit de analyse met al zijn blokken, ook de interne notitie, en het
//    evaluatieblok in de weergave "intern" (EvaluatieWeergaveContext): per kader de boodschap
//    aan 3sides en daaronder, in een eigen vlak, wat Cito zelf doet, ons oordeel met een
//    notitie en de onderbouwing;
// 3. het actiebord "Wat Cito zelf moet doen" uit het deel Planning. Van dat deel staat hier
//    alleen het actiebord, dus met een eigen kop in plaats van de titel en inleiding van het
//    deel (eigenKoppen van BewerkbaarDocument);
// 4. het exportpaneel, met alleen de interne versie.
// Welke secties en blokken: INTERN_SECTIES en inInternTab (evaluatie-uitsnede.ts).
// Het is hetzelfde document als het tabblad Analyse (session.documenten["integratie-3sides"]),
// geen kopie: het filteren gebeurt alleen bij het tekenen, wat wordt opgeslagen is altijd het
// hele document, en een blok houdt zijn index (opmerkingen komen bij hetzelfde blok uit als in
// de analyse). Een oordeel dat je hier kiest, is het oordeel in de analyse.
// "deel N" in de teksten: het deel Evaluatie staat hier; elk ander deel opent het tabblad
// Analyse (naarAnalyse), ook het deel Planning, want daarvan staat hier alleen het actiebord.

import { useMemo } from "react";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { INTERN_SECTIES, inInternTab } from "@/lib/evaluatie-uitsnede";
import BewerkbaarDocument, { DOCUMENT_CSS } from "@/components/bewerkbaar/BewerkbaarDocument";
import type { EigenKop } from "@/components/bewerkbaar/BewerkbaarDocument";
import { DeelEldersContext } from "@/components/bewerkbaar/bron-context";
import type { SectieKaart } from "@/components/bewerkbaar/bron-context";
import { EvaluatieWeergaveContext } from "@/components/bewerkbaar/blokken/evaluatie-weergave";
import { OpmerkingenProvider } from "@/components/bewerkbaar/Opmerkingen";
import { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import EvaluatieExport from "@/components/steps/EvaluatieExport";
import {
  BewerkStrook,
  DELEN_ANKER,
  IcoonDelen,
  KNOP_RAND,
  KORTE_NAAM,
  Leesvolgorde,
  NaarAnderTabblad,
  Regel,
  VasteMelding,
  ankersVan,
  deelKaartVan,
  opTabblad,
  titelDelen,
  useSessieDocument,
  vangLinkNaar,
  vind,
} from "@/components/steps/EvaluatieTab";
import type { Stap } from "@/components/steps/EvaluatieTab";

export const EVALUATIE_INTERN_TAB = { id: "evaluatie-intern", label: "Evaluatie intern" } as const;

const EVALUATIE = "evaluatie";
const PLANNING = "planning";

// Vaste lijsten en functies, zodat de gememoiseerde secties niet opnieuw renderen.
const ALLEEN: Record<string, readonly string[]> = Object.fromEntries(INTERN_SECTIES.map((id) => [id, [id]]));
const TOON_INTERN = opTabblad(INTERN_SECTIES, inInternTab);
/** Alleen het deel Evaluatie staat hier heel; "deel 5" (planning) opent de analyse. */
const HIER = [EVALUATIE] as const;

/** Van het deel Planning staat hier alleen het actiebord: een eigen kop in plaats van die van het deel. */
const EIGEN_KOPPEN: Readonly<Record<string, EigenKop>> = {
  [PLANNING]: {
    merk: "Intern Cito",
    titel: "Wat Cito zelf doet",
    intro:
      "Het actiebord van Cito: per werkstroom wat Cito zelf doet. Dit bord gaat niet naar 3sides. Met Bewerken vul je in wie wat doet en pas je de acties aan.",
  },
};

const MERK = "rounded-full border border-[#003366] bg-[#003366] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.07em] text-white";

function IcoonActies() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M2.6 4.4l1.2 1.2 2-2.4M2.6 10.4l1.2 1.2 2-2.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 4.6h5M8.4 10.6h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function EvaluatieInternTab({
  naarAnalyse,
  naarExtern,
}: {
  naarAnalyse: (anker: string) => void;
  /** opent het tabblad Evaluatie 3sides */
  naarExtern: () => void;
}) {
  const [melding, meld] = useMelding(3000);
  const analyse = useSessieDocument(INTEGRATIE_SLEUTEL, DEFAULT_INTEGRATIE_3SIDES, meld);
  const bezig = analyse.editSectie !== null;
  const bewerk = bezig ? undefined : analyse.bewerk;

  const evaluatie = vind(analyse.doc, EVALUATIE);
  const planning = vind(analyse.doc, PLANNING);
  const heeftActiebord = !!planning && planning.blokken.some((b) => inInternTab(PLANNING, b));
  const nrEvaluatie = evaluatie ? titelDelen(evaluatie.titel).nr : "";
  const nrPlanning = planning ? titelDelen(planning.titel).nr : "";

  // Linkdoelen op dit tabblad; gememoiseerd op de ids zelf (zie EvaluatieTab).
  const ankerSleutel = ankersVan(analyse.doc, INTERN_SECTIES, inInternTab).join("\n");
  const paginaAnkers = useMemo(() => new Set(ankerSleutel.split("\n")), [ankerSleutel]);
  const kaartSleutel = JSON.stringify(deelKaartVan(analyse.doc, HIER));
  const deelKaart = useMemo<SectieKaart[]>(() => JSON.parse(kaartSleutel) as SectieKaart[], [kaartSleutel]);

  const stappen: Stap[] = [
    { anker: "sec-" + EVALUATIE, naam: KORTE_NAAM[EVALUATIE], merk: nrEvaluatie || "·", uitAnalyse: true },
    { anker: "sec-" + PLANNING, naam: EIGEN_KOPPEN[PLANNING].titel, merk: <IcoonActies />, uitAnalyse: false },
    { anker: DELEN_ANKER, naam: "Delen als Word of PDF", merk: <IcoonDelen />, uitAnalyse: false },
  ];

  // Waar deze inhoud in de analyse staat, in woorden: "deel 8, en het actiebord uit deel 5".
  const plek = [nrEvaluatie && `deel ${nrEvaluatie}`, nrPlanning && `het actiebord uit deel ${nrPlanning}`].filter(Boolean).join(", en ");
  const bezigTitel =
    analyse.editSectie === PLANNING
      ? EIGEN_KOPPEN[PLANNING].titel
      : (vind(analyse.doc, analyse.editSectie ?? "")?.titel ?? "").trim() || "dit onderdeel";

  const naarAnalyseKnop = (anker: string, tekst: string) => (
    <button type="button" onClick={() => naarAnalyse(anker)} className={`${KNOP_RAND} flex-none`}>
      {tekst}
    </button>
  );

  /** Eén kader met een sectie van de analyse (zelfde document, zelfde opmerkingen als het tabblad Analyse). */
  const kader = (id: string) => (
    <OpmerkingenProvider document={INTEGRATIE_SLEUTEL}>
      <BewerkbaarDocument
        doc={analyse.doc}
        edit={false}
        editSectie={analyse.editSectie}
        onBewerk={bewerk}
        onChange={analyse.wijzig}
        alleenSecties={ALLEEN[id]}
        toonBlok={TOON_INTERN}
        paginaAnkers={paginaAnkers}
        deelKaart={deelKaart}
        eigenKoppen={EIGEN_KOPPEN}
        stijl={false}
      />
    </OpmerkingenProvider>
  );

  const verwijderd = (naam: string, id: string) => (
    <div id={"sec-" + id} className="scroll-mt-4">
      <Regel toon="let-op" knop={naarAnalyseKnop("", "Naar de analyse")}>
        <b>{naam}</b> is in de analyse van deze sessie verwijderd en staat daarom ook hier niet. Terugzetten kan in het
        tabblad Analyse, met ✎ Bewerken en dan Terug naar voorstel-tekst; dat zet de hele analyse terug naar de
        voorsteltekst.
      </Regel>
    </div>
  );

  return (
    <DeelEldersContext.Provider value={naarAnalyse}>
      <EvaluatieWeergaveContext.Provider value="intern">
        <div className="space-y-7" role="tabpanel" aria-label={EVALUATIE_INTERN_TAB.label} onClick={vangLinkNaar(naarAnalyse)}>
          <style>{DOCUMENT_CSS}</style>

          <header className="rounded-xl border border-cito-border border-l-4 border-l-[#003366] bg-white px-4 py-4 sm:px-6 sm:py-5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4a5565]">
              <span className={MERK}>Intern Cito</span>
              Gaat niet naar 3sides
            </p>
            <h2 className="mt-1.5 text-xl font-bold leading-tight tracking-tight text-[#003366]">
              Evaluatie intern: ons oordeel en wat Cito zelf doet
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
              Dit tabblad is alleen voor Cito. Hier staat de hele evaluatie van 3sides, met wat we niet aan 3sides sturen:
              de interne notitie, en per kader wat Cito zelf doet, ons oordeel met een notitie en de onderbouwing.
              Daaronder het actiebord van Cito.
            </p>
            <NaarAnderTabblad knop="Naar Evaluatie 3sides" onKlik={naarExtern}>
              Wat we aan 3sides communiceren, met de agenda en de begeleidende brief, staat op het tabblad Evaluatie
              3sides.
            </NaarAnderTabblad>
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[#4a5565]">
              In elk kader herken je wat alleen voor Cito is aan het grijze vlak met het merk Intern Cito. Het is dezelfde
              inhoud als in de analyse{plek ? ` (${plek})` : ""}: wat je hier kiest of aanpast, staat ook daar.
            </p>
            <Leesvolgorde stappen={stappen} />
          </header>

          {bezig && <BewerkStrook titel={bezigTitel} onOpslaan={analyse.opslaan} onAnnuleren={analyse.annuleren} />}

          {!bezig && analyse.versie.stand === "eigen" && (
            <Regel knop={naarAnalyseKnop("", "Naar de analyse")}>
              De analyse in deze sessie heeft eigen aanpassingen op een oudere voorsteltekst; de delen hieronder komen uit
              die versie. Of je de nieuwere voorsteltekst overneemt, kies je in het tabblad Analyse.
            </Regel>
          )}

          {evaluatie ? kader(EVALUATIE) : verwijderd("De evaluatie", EVALUATIE)}

          {!planning ? (
            verwijderd("Het deel met het actiebord", PLANNING)
          ) : heeftActiebord ? (
            kader(PLANNING)
          ) : (
            <div id={"sec-" + PLANNING} className="scroll-mt-4">
              <Regel toon="let-op" knop={naarAnalyseKnop("sec-" + PLANNING, nrPlanning ? `Naar deel ${nrPlanning} in de analyse` : "Naar de analyse")}>
                <b>Het actiebord van Cito</b> staat niet in de analyse van deze sessie. Wat Cito zelf doet, is daarom te
                bepalen.
              </Regel>
            </div>
          )}

          <div id={DELEN_ANKER} className="scroll-mt-4 rounded-xl border border-cito-border bg-white px-4 py-4 empty:hidden sm:px-6 sm:py-5">
            <EvaluatieExport versie="intern" />
          </div>

          <VasteMelding melding={melding} />
        </div>
      </EvaluatieWeergaveContext.Provider>
    </DeelEldersContext.Provider>
  );
}
