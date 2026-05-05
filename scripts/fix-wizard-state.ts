// Corrigeert crossAnalyseWizard.completedSteps + currentStep zodat de UI
// klopt met de werkelijke data: alle stappen waar resultaten in staan
// worden gemarkeerd als voltooid.

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
  const sr = (wiz.stepResults ?? {}) as Record<string, unknown>;

  const voltooid: number[] = [];
  for (let n = 1; n <= 8; n++) {
    const k = `stap${n}` as keyof typeof sr;
    if (sr[k]) voltooid.push(n);
  }

  const oudeCompletedSteps = wiz.completedSteps;
  const oudeCurrentStep = wiz.currentStep;

  wiz.completedSteps = voltooid;
  // Zet currentStep op de hoogste voltooide stap (of 1 als leeg)
  wiz.currentStep = voltooid.length > 0 ? Math.max(...voltooid) : 1;

  console.log(`Voltooide stappen op basis van data: ${voltooid.join(", ")}`);
  console.log(`completedSteps: ${JSON.stringify(oudeCompletedSteps)} → ${JSON.stringify(wiz.completedSteps)}`);
  console.log(`currentStep:    ${oudeCurrentStep} → ${wiz.currentStep}`);

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
