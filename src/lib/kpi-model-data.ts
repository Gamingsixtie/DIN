// ============================================================
// Baten-KPI's — de vastgestelde KPI-set uit de stakeholdersessie.
//
// Eén bron voor zowel de app (KpiModelBlock: stap 9 en programmaplan §3.1) als
// de Word-exports. Deze tabel stond eerder alleen in KpiModelBlock.tsx; de
// beknopte export moet exact dezelfde rijen tonen — CLAUDE.md-regel 8: de wizard
// is de bron van waarheid voor de weergave, de export volgt.
//
// Geen verzonnen waarden: startwaarden = nulmeting Q3, doelwaarden worden pas
// daarna vastgesteld (H8: haalbaarheid is niet toetsbaar zonder startwaarde).
// ============================================================

export interface KpiRij {
  naam: string;
  definitie: string;
  start: string; // "Nulmeting Q3" of afwijkende starttekst
  richting: string;
}

export const BATEN_KPIS: {
  sector: string;
  stagKleur: string;
  titel: string;
  rijen: KpiRij[];
}[] = [
  {
    sector: "Zakelijk",
    stagKleur: "bg-[#6d28d9]",
    titel: "Sterkere klantgerichtheid bij opdrachtgevers & kandidaten",
    rijen: [
      { naam: "Funnel-conversieratio per stap", definitie: "Succespercentage per overgang: lead → opportunity → offerte → deal", start: "Nulmeting Q3", richting: "uitval in lange leadtrajecten minimaliseren" },
      { naam: "Offertes: aantal + % → opdracht", definitie: "Volume-driver in lange trajecten én het percentage dat opdracht wordt", start: "Nulmeting Q3", richting: "meer offertes, hogere slaagkans" },
      { naam: "Conversie uit bezoeken", definitie: "Bezoeken waar een call-to-action of vervolg uit voortkomt", start: "Nulmeting Q3", richting: "meer vervolg uit bezoeken" },
      { naam: "Serviceniveau & reactietijden", definitie: "Reactietijd op klantvragen (mail/telefoon)", start: "Nulmeting Q3", richting: "sneller reageren" },
      { naam: "Churn / klantbehoud", definitie: "Verloren klanten per jaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
  {
    sector: "PO",
    stagKleur: "bg-[#0369a1]",
    titel: "Intensiever partnership",
    rijen: [
      { naam: "Groei productgebruik (cross-/up-sell)", definitie: "% scholen dat upgradet van basis naar compleet, of extra trainingen/diensten afneemt", start: "Nulmeting Q3", richting: "meer cross-/up-sell conversie" },
      { naam: "Gebruiksintensiteit volledige lijn", definitie: "% scholen met de volledige doorlopende lijn: Toets + LVS + DST", start: "Nulmeting Q3", richting: "meer scholen op de volledige lijn" },
      { naam: "Raamcontracten grote besturen", definitie: "Aantal totaalpakket-contracten voor alle scholen tegelijk", start: "Nulmeting Q3", richting: "alle accountmanagers voeren dit uit" },
      { naam: "Ontwikkeldeadlines & beloftes gehaald", definitie: "% productbeloftes en deadlines richting klanten gehaald — meting bij productmanagers", start: "Nulmeting Q3", richting: "beloftes waarmaken" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen/besturen per schooljaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
  {
    sector: "VO",
    stagKleur: "bg-[#047857]",
    titel: "Hogere voorspelbaarheid commerciële begroting",
    rijen: [
      { naam: "Prognose-nauwkeurigheid", definitie: "Afwijking tussen de zomerprognose en de gerealiseerde omzet", start: "Nulmeting Q3", richting: "afwijking minimaliseren" },
      { naam: "% meerjarige (3-jr) licenties", definitie: "Aandeel licenties omgezet van 1-jarig naar 3-jarig", start: "Nulmeting Q3", richting: "aandeel 3-jarig omhoog" },
      { naam: "Inzicht in toetskeuzemomenten", definitie: "Markt-/klantreisdata op productniveau → voedt prognose en propositieontwikkeling", start: "Nulmeting Q3", richting: "geïntegreerd in prognosemodellen" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen per schooljaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
];

/** Eisen waaraan elke doelwaarde moet voldoen (H8), getoond naast de KPI-rijen. */
export const DOELWAARDE_EISEN: string[] = [
  "Concreet getal mét meetmoment",
  "Meetbaar",
  "Toetsbaar",
  "Motiverend",
  "Haalbaar t.o.v. de startwaarde",
  "Roept het gewenste gedrag op",
];

export const DOELWAARDE_STATUS = "Te bepalen — vervolgsessie, ná nulmeting Q3";
export const KPI_EIGENAAR = "Commercieel Manager";
export const KPI_MEETVERANTWOORDELIJKE = "Strategisch Marketeer";
