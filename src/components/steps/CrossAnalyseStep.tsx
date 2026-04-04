"use client";

import CrossAnalyseWizard from "@/components/cross-analyse/CrossAnalyseWizard";
import type { DINSession, DINCapability, DINEffort } from "@/lib/types";

// --- Consolidation logic (pure functions for testability) ---
// KEEP THESE EXPORTS — they are imported by StapConsolidatie and tested in consolidation.test.ts

export function mergeCapabilities(
  session: DINSession,
  clusterItemIds: string[]
): DINSession {
  if (clusterItemIds.length < 2) return session;

  const itemsToMerge = session.capabilities.filter(c => clusterItemIds.includes(c.id));
  if (itemsToMerge.length < 2) return session;

  const newId = crypto.randomUUID();
  const allSectors = [...new Set(itemsToMerge.map(c => c.sectorId))];

  // Create shared item from first item as template
  const sharedItem: DINCapability = {
    ...itemsToMerge[0],
    id: newId,
    sectorId: allSectors[0],
    relatedSectors: allSectors,
    title: itemsToMerge[0].title || itemsToMerge[0].description.slice(0, 60),
    consolidated: undefined,
    consolidatedInto: undefined,
  };

  // Flag originals
  const updatedCaps = session.capabilities.map(c =>
    clusterItemIds.includes(c.id)
      ? { ...c, consolidated: true as const, consolidatedInto: newId }
      : c
  );

  // Copy mappings from originals to shared item (deduplicating)
  const newBenCapMaps = [...session.benefitCapabilityMaps];
  const newCapEffMaps = [...session.capabilityEffortMaps];
  for (const original of itemsToMerge) {
    session.benefitCapabilityMaps
      .filter(m => m.capabilityId === original.id)
      .forEach(m => {
        if (!newBenCapMaps.some(nm => nm.benefitId === m.benefitId && nm.capabilityId === newId)) {
          newBenCapMaps.push({ benefitId: m.benefitId, capabilityId: newId });
        }
      });
    session.capabilityEffortMaps
      .filter(m => m.capabilityId === original.id)
      .forEach(m => {
        if (!newCapEffMaps.some(nm => nm.effortId === m.effortId && nm.capabilityId === newId)) {
          newCapEffMaps.push({ capabilityId: newId, effortId: m.effortId });
        }
      });
  }

  return {
    ...session,
    capabilities: [...updatedCaps, sharedItem],
    benefitCapabilityMaps: newBenCapMaps,
    capabilityEffortMaps: newCapEffMaps,
  };
}

export function undoMergeCapabilities(
  session: DINSession,
  sharedItemId: string
): DINSession {
  return {
    ...session,
    capabilities: session.capabilities
      .filter(c => c.id !== sharedItemId)
      .map(c => c.consolidatedInto === sharedItemId
        ? { ...c, consolidated: undefined, consolidatedInto: undefined }
        : c
      ),
    benefitCapabilityMaps: session.benefitCapabilityMaps.filter(m => m.capabilityId !== sharedItemId),
    capabilityEffortMaps: session.capabilityEffortMaps.filter(m => m.capabilityId !== sharedItemId),
  };
}

export function mergeEfforts(
  session: DINSession,
  clusterItemIds: string[]
): DINSession {
  if (clusterItemIds.length < 2) return session;

  const itemsToMerge = session.efforts.filter(e => clusterItemIds.includes(e.id));
  if (itemsToMerge.length < 2) return session;

  const newId = crypto.randomUUID();
  const allSectors = [...new Set(itemsToMerge.map(e => e.sectorId))];

  const sharedItem: DINEffort = {
    ...itemsToMerge[0],
    id: newId,
    sectorId: allSectors[0],
    responsibleSector: allSectors.join(", "),
    title: itemsToMerge[0].title || itemsToMerge[0].description.slice(0, 60),
    consolidated: undefined,
    consolidatedInto: undefined,
  };

  const updatedEfforts = session.efforts.map(e =>
    clusterItemIds.includes(e.id)
      ? { ...e, consolidated: true as const, consolidatedInto: newId }
      : e
  );

  const newCapEffMaps = [...session.capabilityEffortMaps];
  for (const original of itemsToMerge) {
    session.capabilityEffortMaps
      .filter(m => m.effortId === original.id)
      .forEach(m => {
        if (!newCapEffMaps.some(nm => nm.capabilityId === m.capabilityId && nm.effortId === newId)) {
          newCapEffMaps.push({ capabilityId: m.capabilityId, effortId: newId });
        }
      });
  }

  return {
    ...session,
    efforts: [...updatedEfforts, sharedItem],
    capabilityEffortMaps: newCapEffMaps,
  };
}

export function undoMergeEfforts(
  session: DINSession,
  sharedItemId: string
): DINSession {
  return {
    ...session,
    efforts: session.efforts
      .filter(e => e.id !== sharedItemId)
      .map(e => e.consolidatedInto === sharedItemId
        ? { ...e, consolidated: undefined, consolidatedInto: undefined }
        : e
      ),
    capabilityEffortMaps: session.capabilityEffortMaps.filter(m => m.effortId !== sharedItemId),
  };
}

// --- Thin wrapper: delegates to CrossAnalyseWizard ---

export default function CrossAnalyseStep() {
  return <CrossAnalyseWizard />;
}
