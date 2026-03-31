// KiB (Klant in Beeld) Import — JSON import van visie, doelen, scope
// Valideert alle externe input met Zod schema (per D-06)

import { KiBExportSchema } from "./schemas";
import type { KiBExport } from "./schemas";
import type { ProgrammeGoal, ProgrammeVision, ProgrammeScope } from "./types";

export type { KiBExport };

export function parseKiBExport(json: string): KiBExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ongeldig JSON formaat. Controleer de KiB export.");
  }
  const result = KiBExportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Ongeldig KiB-formaat: " +
      result.error.issues.map((i) => i.message).join(", ")
    );
  }
  return result.data;
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
