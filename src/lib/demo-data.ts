// Demo data voor DIN-app — live snapshot van sessie d8b97442 ("Klant in Beeld") — bron-waarheid.
// createDemoSession() retourneert een verse kopie met nieuw session-ID en lege crossAnalyseWizard,
// zodat de demo-variant kan worden gebruikt om Phase 18 analyses op hun eigen input te testen.
// Het origineel d8b97442 in Supabase wordt nooit aangeraakt.
import type { DINSession } from "./types";
import snapshot from "./demo-snapshot.json";

export function createDemoSession(): DINSession {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    name: snapshot.name,
    createdAt: now,
    updatedAt: now,
    version: 1,
    currentStep: snapshot.currentStep,
    vision: snapshot.vision ?? undefined,
    scope: snapshot.scope ?? undefined,
    goals: snapshot.goals,
    benefits: snapshot.benefits,
    capabilities: snapshot.capabilities,
    efforts: snapshot.efforts,
    sectorPlans: snapshot.sectorPlans,
    pmcEntries: snapshot.pmcEntries,
    goalBenefitMaps: snapshot.goalBenefitMaps,
    benefitCapabilityMaps: snapshot.benefitCapabilityMaps,
    capabilityEffortMaps: snapshot.capabilityEffortMaps,
    projectCapabilityMaps: snapshot.projectCapabilityMaps,
    completedGoals: snapshot.completedGoals,
    clusterRasci: (snapshot as { clusterRasci?: unknown[] }).clusterRasci ?? [],
    itemRasci: (snapshot as { itemRasci?: unknown[] }).itemRasci ?? [],
    gezamenlijkeRasci: (snapshot as { gezamenlijkeRasci?: unknown[] }).gezamenlijkeRasci ?? [],
    crossAnalyseWizard: (snapshot as { crossAnalyseWizard?: unknown }).crossAnalyseWizard,
  } as DINSession;
}
