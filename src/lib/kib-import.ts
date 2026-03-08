// KiB (Klant in Beeld) Import — JSON import van visie, doelen, scope

import type { ProgrammeGoal, ProgrammeVision, ProgrammeScope } from "./types";

// Verwacht KiB export formaat
export interface KiBExport {
  visie?: {
    uitgebreid: string;
    beknopt: string;
  };
  doelen?: Array<{
    id?: string;
    naam: string;
    beschrijving: string;
    rang: number;
  }>;
  scope?: {
    binnen: string[];
    buiten: string[];
  };
  sessionId?: string;
}

export function parseKiBExport(json: string): KiBExport {
  try {
    return JSON.parse(json) as KiBExport;
  } catch {
    throw new Error("Ongeldig JSON formaat. Controleer de KiB export.");
  }
}

export function extractVision(data: KiBExport): ProgrammeVision | undefined {
  if (!data.visie) return undefined;
  return {
    id: crypto.randomUUID(),
    uitgebreid: data.visie.uitgebreid,
    beknopt: data.visie.beknopt,
    sourceSessionId: data.sessionId,
  };
}

export function extractGoals(data: KiBExport): ProgrammeGoal[] {
  if (!data.doelen) return [];
  return data.doelen.map((d) => ({
    id: d.id || crypto.randomUUID(),
    name: d.naam,
    description: d.beschrijving,
    rank: d.rang,
    sourceSessionId: data.sessionId,
  }));
}

export function extractScope(data: KiBExport): ProgrammeScope | undefined {
  if (!data.scope) return undefined;
  return {
    id: crypto.randomUUID(),
    inScope: data.scope.binnen,
    outScope: data.scope.buiten,
  };
}

export function importFromKiB(json: string) {
  const data = parseKiBExport(json);
  return {
    vision: extractVision(data),
    goals: extractGoals(data),
    scope: extractScope(data),
  };
}
