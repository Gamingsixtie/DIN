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

export type Domein = "cultuur" | "mens" | "data_systemen" | "processen";

type FunctieInput = { aantal: number; urenPerJaar?: number };
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
