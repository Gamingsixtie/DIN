// Corrigeert crossAnalyseWizard.completedSteps + currentStep zodat de UI
// ALLE display-stappen toont waarvan de onderliggende data aanwezig is.
//
// MAPPING (display-step → benodigde data):
//   Display 1 = Lopende projecten     → handmatig (geen result-key)
//   Display 2 = Baten-overloop        → stepResults.stap1
//   Display 3 = Gedeelde vermogens    → stepResults.stap2
//   Display 4 = Inspanningen          → stepResults.stap3
//   Display 5 = Consolidatie          → stepResults.stap4
//   Display 6 = Optimaliseren         → stepResults.stap4.begrotingAdvies
//   Display 7 = Interne uren          → stepResults.stap4.stap7InterneUren
//   Display 8 = Totaaloverzicht       → stepResults.stap4
//   Display 9 = Prioriteitsview       → stepResults.stap5

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data: row } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!row) { console.error("not found"); process.exit(1); }

  const data = row.data as Record<string, unknown>;
  const wiz = data.crossAnalyseWizard as Record<string, unknown> | undefined;
  if (!wiz) { console.error("no wizard"); process.exit(1); }
  const sr = (wiz.stepResults ?? {}) as Record<string, Record<string, unknown> | undefined>;

  const voltooid: number[] = [];
  // Display 1: handmatig — laat staan als al voltooid
  const oudeCompleted = (wiz.completedSteps as number[] | undefined) ?? [];
  if (oudeCompleted.includes(1)) voltooid.push(1);
  // Display 2-9 op basis van data
  if (sr.stap1) voltooid.push(2);
  if (sr.stap2) voltooid.push(3);
  if (sr.stap3) voltooid.push(4);
  if (sr.stap4) voltooid.push(5);
  if (sr.stap4 && (sr.stap4 as Record<string, unknown>).begrotingAdvies) voltooid.push(6);
  if (sr.stap4 && (sr.stap4 as Record<string, unknown>).stap7InterneUren) voltooid.push(7);
  if (sr.stap4) voltooid.push(8);
  if (sr.stap5) voltooid.push(9);

  // Display 1 altijd inkluderen als data van latere stappen aanwezig is
  if (!voltooid.includes(1) && voltooid.length > 0) voltooid.unshift(1);

  // currentStep = hoogste voltooide stap (of 1)
  const currentStep = voltooid.length > 0 ? Math.max(...voltooid) : 1;

  const oudeCompletedSteps = wiz.completedSteps;
  const oudeCurrentStep = wiz.currentStep;

  wiz.completedSteps = voltooid;
  wiz.currentStep = currentStep;
  wiz.wizardVersion = 2; // markeer als nieuw schema, voorkom +1-migratie

  console.log("=== Wizard-state correctie ===");
  console.log(`stepResults aanwezig: ${Object.keys(sr).join(", ")}`);
  console.log(`completedSteps: ${JSON.stringify(oudeCompletedSteps)} → ${JSON.stringify(voltooid)}`);
  console.log(`currentStep:    ${oudeCurrentStep} → ${currentStep}`);

  data.version = ((data.version as number | undefined) ?? 0) + 1;
  data.updatedAt = new Date().toISOString();

  const { error } = await supa
    .from("din_sessions")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) { console.error("write fail:", error.message); process.exit(1); }
  console.log(`\n✓ Wizard-state gecorrigeerd (version ${data.version})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
