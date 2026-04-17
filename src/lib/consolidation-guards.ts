// Phase 17: pure consolidation guards en helpers.
// Deze module bevat GEEN React-imports en kan vrij geïmporteerd worden in tests + pure functions.
//
// Design notes:
// - validateNeutralTitle / validateSameDomain / validateDrieluikThreshold zijn in Wave 0 stubs
//   met de correcte signature; Wave 1 implementeert de throw-logic en verankert ze in mergeEfforts.
// - computeAutoApplyResult is al WERKEND en unit-testbaar — Wave 2 refactort de useEffect in
//   StapConsolidatie.tsx om deze helper aan te roepen.

import type { DINEffort, CapabilityEffortMap } from "./types";
import type { VermogenGelijkenisGroep } from "./schemas";

// --- D-01 locked patterns ---
export const SECTOR_NAME_REGEX =
  /\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i;
export const MIN_TITLE_LENGTH = 10;

// --- D-27 context shape ---
export interface DrieluikContext {
  gelijkenisGroepen: VermogenGelijkenisGroep[];
  capEffortMaps: CapabilityEffortMap[];
}

// --- Guard stubs (Wave 1 implementeert throw-logica) ---

/**
 * D-01: Valideert dat een voorgestelde titel sectoroverstijgend is
 * (geen PO/VO/Zakelijk substrings) en minstens MIN_TITLE_LENGTH lang.
 * Wave 0: stub. Wave 1: implementeer throw Error('Titel bevat sector-naam "X" …').
 */
export function validateNeutralTitle(_title: string): void {
  // WAVE 1: implementeer conform D-01
  return;
}

/**
 * D-02: Valideert dat alle items hetzelfde `domain` hebben.
 * Wave 0: stub. Wave 1: implementeer throw bij cross-domein.
 */
export function validateSameDomain(_items: DINEffort[]): void {
  // WAVE 1: implementeer conform D-02
  return;
}

/**
 * D-27: Valideert dat alle te mergen efforts via capabilityEffortMaps terug-refereren
 * naar vermogens uit DEZELFDE VermogenGelijkenisGroep (ongeacht sectoren — schema garandeert ≥1 per sector).
 * Wave 0: stub. Wave 1: implementeer drempel-check + throw.
 */
export function validateDrieluikThreshold(
  _effortIds: string[],
  _ctx: DrieluikContext
): void {
  // WAVE 1: implementeer conform D-27
  return;
}

// --- Auto-apply pure helper (D-05) — WERKEND in Wave 0 ---

export interface AutoApplyCluster {
  key: string; // vooraf berekende dedup-key, bv. sorted-ids joined met ","
  itemIds: string[];
  suggestedTitle?: string;
}

export interface AutoApplyResult {
  mergedKeys: string[];
  failedKeys: string[];
  reasons: Record<string, string>; // key → error message
}

/**
 * D-05: Draait de auto-apply loop als pure functie. Gebruikt een injected `mergeFn`
 * zodat tests de throw-gedrag kunnen simuleren zonder session-mocks.
 *
 * Contract:
 * - Cluster met <2 items: skip (niet merged, niet failed).
 * - Cluster met key in alreadyMergedKeys: skip.
 * - mergeFn throw: skip + record reason in failedKeys.
 * - mergeFn success: add key to mergedKeys.
 */
export function computeAutoApplyResult(
  clusters: AutoApplyCluster[],
  alreadyMergedKeys: Set<string>,
  mergeFn: (itemIds: string[], suggestedTitle?: string) => void
): AutoApplyResult {
  const mergedKeys: string[] = [];
  const failedKeys: string[] = [];
  const reasons: Record<string, string> = {};

  for (const cluster of clusters) {
    if (cluster.itemIds.length < 2) continue;
    if (alreadyMergedKeys.has(cluster.key)) continue;
    try {
      mergeFn(cluster.itemIds, cluster.suggestedTitle);
      mergedKeys.push(cluster.key);
    } catch (err) {
      failedKeys.push(cluster.key);
      reasons[cluster.key] = err instanceof Error ? err.message : String(err);
    }
  }

  return { mergedKeys, failedKeys, reasons };
}
