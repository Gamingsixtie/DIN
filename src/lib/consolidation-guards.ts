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
 * (geen PO/VO/Zakelijk substrings op word-boundary) en minstens MIN_TITLE_LENGTH lang.
 * Wave 1: throws Error bij overtreding.
 */
export function validateNeutralTitle(title: string): void {
  if (!title || title.length < MIN_TITLE_LENGTH) {
    throw new Error(
      `Titel te kort (minimum ${MIN_TITLE_LENGTH} tekens): "${title ?? ""}"`
    );
  }
  const match = title.match(SECTOR_NAME_REGEX);
  if (match) {
    throw new Error(
      `Titel bevat sector-naam "${match[0]}" — sectoroverstijgende titel vereist`
    );
  }
}

/**
 * D-02: Valideert dat alle items hetzelfde `domain` hebben.
 * Wave 1: throws Error bij cross-domein merge (bijv. mens + data_systemen).
 */
export function validateSameDomain(items: DINEffort[]): void {
  if (items.length === 0) return;
  const domains = new Set(items.map((e) => e.domain));
  if (domains.size > 1) {
    const list = Array.from(domains).join(" + ");
    throw new Error(`Cross-domein merge geblokkeerd: ${list}`);
  }
}

/**
 * D-27: Valideert dat alle te mergen efforts via capabilityEffortMaps terug-refereren
 * naar vermogens uit DEZELFDE VermogenGelijkenisGroep. Dit is de drieluik-drempel —
 * AI mag alleen efforts consolideren als ze een gelijkenis-groep delen (minimaal 2 sectoren,
 * schema-contract garandeert ≥1 vermogen per sector in een groep).
 *
 * Wave 1: throws Error wanneer geen enkele groep alle efforts dekt via hun cap-mappings.
 * Lege effortIds list: early return (niets te valideren).
 */
export function validateDrieluikThreshold(
  effortIds: string[],
  ctx: DrieluikContext
): void {
  if (effortIds.length === 0) return;

  // Per effort: welke capabilityIds raakt hij via capEffortMaps?
  const effortCaps = new Map<string, Set<string>>();
  for (const eId of effortIds) {
    const caps = ctx.capEffortMaps
      .filter((m) => m.effortId === eId)
      .map((m) => m.capabilityId);
    effortCaps.set(eId, new Set(caps));
  }

  // Zoek een groep waar ELKE effort minstens één cap raakt (via cap-mapping).
  for (const groep of ctx.gelijkenisGroepen) {
    const groepCapIds = new Set(groep.vermogenIds);
    const allReach = effortIds.every((eId) => {
      const caps = effortCaps.get(eId) ?? new Set();
      for (const cId of caps) if (groepCapIds.has(cId)) return true;
      return false;
    });
    if (allReach) return; // geldig drieluik — alle efforts raken deze groep
  }

  throw new Error(
    "Cross-analyse drempel niet gehaald: inspanningen raken geen drieluik van gelijkende sector-vermogens"
  );
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
