// ============================================================
// 3sides adoptie-framework — gesourcede 2026-deliverables per domein
// ------------------------------------------------------------
// BRON: raming Plus20 / programmaplan. Niets hier is verzonnen — alle
// getallen en deliverables komen LETTERLIJK uit de aangeleverde bron.
//
// 3sides-KPI = deliverable opgeleverd (klaar j/n) — NIET het klant-effect
// (dat is Cito's baat). De checkboxen zijn illustratief/statisch.
//
// Gebruikt door: KPIMeetbaarheidStep (3sides-tracker, punt 6).
// ============================================================

import type { EffortDomain } from "./types";

export interface ThreesidesDeliverable {
  /** Korte deliverable-naam zoals in de raming. */
  label: string;
}

export interface ThreesidesDomeinData {
  domein: Exclude<EffortDomain, "overig">;
  /** Fase-naam 2026 (bijv. "Analyse"). */
  fase2026: string;
  /** Budget 2026 zoals in de raming Plus20. */
  budget2026: string;
  /** 2026-deliverables (3sides-KPI = oplevering, klaar j/n). */
  deliverables: ThreesidesDeliverable[];
  /** Optionele noot over latere jaren (realisatie/go-live etc.). */
  verdereJaren?: string;
  /** Optioneel: sales/marketing-funnel focus — uit 3sides-voorstel (alleen data & systemen). */
  funnel?: string;
  /** Optioneel: quick wins — uit 3sides-voorstel (lijn 5: signaleren → prioriteren → direct doen). */
  quickWins?: string[];
  /** Totale kostenraming over de looptijd in de Plus20-variant (5 jaar). Bron: begroting-fasering Plus20. */
  budgetTotaalPlus20: string;
}

// Volgorde conform Cito outside-in: cultuur → mens → data/systemen → processen.
// (Bewustwording → Behoefte → Analyse → Inventarisatie als 2026-fasen.)
export const THREESIDES_DOMEINEN: ThreesidesDomeinData[] = [
  {
    domein: "cultuur",
    fase2026: "Bewustwording",
    budget2026: "€34K",
    budgetTotaalPlus20: "€142K (5 jaar · Plus20)",
    deliverables: [
      { label: "programma-ontwerp" },
      { label: "MT-besluit" },
      { label: "eerste leiderschapssessies" },
    ],
  },
  {
    domein: "mens",
    fase2026: "Behoefte",
    budget2026: "€39K",
    budgetTotaalPlus20: "€183K (5 jaar · Plus20)",
    deliverables: [
      { label: "nulmeting per sector" },
      { label: "curriculumontwerp" },
    ],
    verdereJaren: "trainingsblokken 2027–2028",
  },
  {
    domein: "data_systemen",
    fase2026: "Analyse",
    budget2026: "€166K",
    budgetTotaalPlus20: "€910K (5 jaar · Plus20)",
    deliverables: [
      { label: "platformkeuze (Dynamics-equivalent)" },
      { label: "datakwaliteits-scan" },
      { label: "juridisch-technische analyse Stichting Cito-ontvlechting" },
      { label: "migratiestrategie" },
    ],
    verdereJaren: "Realisatie 2027 · CRM go-live 2028",
    funnel:
      "2026-focus CRM & sales/marketing-funnel: eenduidige klantreis per sector → vertaald naar funnelprocessen (fases · triggers · acties) → output klantreis = input voor CRM/data.",
    quickWins: [
      "Huidig CRM in kaart brengen: wat werkt · wat loopt vast · kosten & kansen",
      "Quick wins signaleren → prioriteren op impact × uitvoerbaarheid → direct implementeren (niet wachten tot het einde)",
    ],
  },
  {
    domein: "processen",
    fase2026: "Inventarisatie",
    budget2026: "€13K",
    budgetTotaalPlus20: "€126K (5 jaar · Plus20)",
    deliverables: [
      { label: "as-is mapping per sector via Smartprocess" },
      { label: "besluit funneldefinities" },
    ],
  },
];

// Mijlpaal: adoptie-framework gereed Q3 2026 (1e mijlpaal).
export const THREESIDES_MIJLPAAL = "Adoptie-framework gereed Q3 2026 (1e mijlpaal)";
