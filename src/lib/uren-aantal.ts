// Hulpfunctie om het aantal personen per rol op te zoeken voor de interne-uren-tabellen.
// Bron: stap4.stap7InterneUren.selectiePerDomein[domein][functieId].aantal.
// Voor custom-rollen (functieId start met "custom-"): zelfde plek; aantal staat ook daar.
//
// Wordt gebruikt in:
//  - StapInterneUren (Stap 7) — scenario rol-tabellen per jaar
//  - ExportStep §4.2 — interne-uren-rendering
//  - word-export.ts — Word-doc rol-tabellen
//  - BerekeningenStep (Stap 8) — nieuwe interne-uren-sectie
//
// "Resolve naar `title || description` of weglaten" — geen UUIDs in user-facing tekst (CLAUDE.md).

import type { DINSession } from "@/lib/types";
import { CITO_FUNCTIES } from "@/lib/cito-functies";

export type Domein = "cultuur" | "mens" | "data_systemen" | "processen";

type FunctieInput = {
  aantal: number;
  urenPerJaar?: number;
  stakeholder?: boolean;
  stakeholderToelichting?: string;
  reviewVereist?: boolean;
  reviewVraag?: string;
};
type CustomFunctie = { id: string; naam: string; schaal?: number };

type Stap7Slim = {
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
};

function getStap7(session: DINSession | undefined | null): Stap7Slim | undefined {
  if (!session) return undefined;
  const wiz = session.crossAnalyseWizard;
  if (!wiz) return undefined;
  const stepResults = wiz.stepResults as { stap4?: { stap7InterneUren?: Stap7Slim } } | undefined;
  return stepResults?.stap4?.stap7InterneUren;
}

/**
 * Geeft het aantal personen voor een rol binnen een domein.
 * Fallback: 1 (één persoon) als selectie ontbreekt — voorkomt verwarring (kolom blijft gevuld).
 */
export function getAantalForRol(
  session: DINSession | undefined | null,
  domein: Domein,
  functieId: string
): number {
  const stap7 = getStap7(session);
  const aantal = stap7?.selectiePerDomein?.[domein]?.[functieId]?.aantal;
  if (typeof aantal === "number" && aantal > 0) return aantal;
  return 1;
}

/**
 * Geeft de FunctieInput-flag-data terug voor een rol binnen een domein.
 * Wordt gebruikt om in de tabel te bepalen of een rol een stakeholder of
 * review-vereist-rol is, en om de toelichting/vraag op te halen.
 */
export function getFunctieInputForRol(
  session: DINSession | undefined | null,
  domein: Domein,
  functieId: string
): FunctieInput | null {
  const stap7 = getStap7(session);
  const sel = stap7?.selectiePerDomein?.[domein]?.[functieId];
  return sel ?? null;
}

/**
 * Resolveer een functieId (cito of custom) naar een leesbare naam, met optionele afdeling.
 * Werkt zowel voor cito-functies als custom-rollen.
 */
export function resolveFunctieNaam(
  session: DINSession | undefined | null,
  domein: Domein,
  functieId: string
): { naam: string; afdeling?: string } {
  const cito = CITO_FUNCTIES.find((f) => f.id === functieId);
  if (cito) return { naam: cito.naam, afdeling: cito.afdeling };
  const stap7 = getStap7(session);
  const custom = stap7?.customFunctiesPerDomein?.[domein]?.find((c) => c.id === functieId);
  if (custom) return { naam: custom.naam, afdeling: "Custom" };
  return { naam: functieId };
}

export type StakeholderRol = {
  domein: Domein;
  functieId: string;
  naam: string;
  afdeling?: string;
  aantal: number;
  toelichting?: string;
};

export type ReviewRol = {
  domein: Domein;
  functieId: string;
  naam: string;
  afdeling?: string;
  aantal: number;
  vraag?: string;
};

/**
 * Verzamel alle rollen met `stakeholder: true` over alle domeinen heen.
 * Volgorde: outside-in (cultuur → mens → data_systemen → processen) → naam alfabetisch.
 */
export function collectStakeholderRollen(session: DINSession | undefined | null): StakeholderRol[] {
  const stap7 = getStap7(session);
  if (!stap7?.selectiePerDomein) return [];
  const domOrder: Domein[] = ["cultuur", "mens", "data_systemen", "processen"];
  const out: StakeholderRol[] = [];
  for (const d of domOrder) {
    const sel = stap7.selectiePerDomein[d] ?? {};
    for (const [functieId, input] of Object.entries(sel)) {
      if (input?.stakeholder !== true) continue;
      const { naam, afdeling } = resolveFunctieNaam(session, d, functieId);
      out.push({
        domein: d,
        functieId,
        naam,
        afdeling,
        aantal: typeof input.aantal === "number" && input.aantal > 0 ? input.aantal : 1,
        toelichting: input.stakeholderToelichting,
      });
    }
  }
  out.sort((a, b) => {
    const di = domOrder.indexOf(a.domein) - domOrder.indexOf(b.domein);
    if (di !== 0) return di;
    return a.naam.localeCompare(b.naam, "nl-NL");
  });
  return out;
}

/**
 * Verzamel alle rollen met `reviewVereist: true` over alle domeinen heen.
 */
export function collectReviewRollen(session: DINSession | undefined | null): ReviewRol[] {
  const stap7 = getStap7(session);
  if (!stap7?.selectiePerDomein) return [];
  const domOrder: Domein[] = ["cultuur", "mens", "data_systemen", "processen"];
  const out: ReviewRol[] = [];
  for (const d of domOrder) {
    const sel = stap7.selectiePerDomein[d] ?? {};
    for (const [functieId, input] of Object.entries(sel)) {
      if (input?.reviewVereist !== true) continue;
      const { naam, afdeling } = resolveFunctieNaam(session, d, functieId);
      out.push({
        domein: d,
        functieId,
        naam,
        afdeling,
        aantal: typeof input.aantal === "number" && input.aantal > 0 ? input.aantal : 1,
        vraag: input.reviewVraag,
      });
    }
  }
  out.sort((a, b) => {
    const di = domOrder.indexOf(a.domein) - domOrder.indexOf(b.domein);
    if (di !== 0) return di;
    return a.naam.localeCompare(b.naam, "nl-NL");
  });
  return out;
}

/**
 * Resolve een (mogelijk custom) functieId naar een leesbare naam.
 * Wordt gebruikt voor extra zekerheid; doorgaans heeft de AI `functieNaam` al gevuld
 * en kan deze functie als fallback dienen.
 */
export function resolveCustomNaam(
  session: DINSession | undefined | null,
  domein: Domein,
  functieId: string
): string | null {
  if (!functieId.startsWith("custom-")) return null;
  const stap7 = getStap7(session);
  const found = stap7?.customFunctiesPerDomein?.[domein]?.find((c) => c.id === functieId);
  return found?.naam ?? null;
}
