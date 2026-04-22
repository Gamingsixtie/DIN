// Diagnose: inspecteer wat ECHT in Supabase staat voor een sessie, met focus op
// crossAnalyseWizard.stepResults.stap4.begrotingAdvies. Dumpt alle keys in stap4
// + shape van begrotingAdvies + aantal scenarios, zonder de volle content te spammen.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sessionId = process.argv[2];
if (!sessionId) { console.error("Usage: tsx scripts/check-begrotingsadvies.ts <sessionId>"); process.exit(1); }

const supa = createClient(SUPABASE_URL, KEY);

async function main() {
  const { data, error } = await supa.from("din_sessions").select("data, updated_at").eq("id", sessionId).maybeSingle();
  if (error || !data) { console.error(error?.message ?? "not found"); process.exit(1); }
  const s = data.data as Record<string, unknown>;

  console.log("=".repeat(70));
  console.log("SESSIE:", sessionId);
  console.log("Name:", s.name);
  console.log("Version:", s.version);
  console.log("UpdatedAt:", s.updatedAt);
  console.log("DB updated_at:", data.updated_at);
  console.log("=".repeat(70));

  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>>; currentStep?: number; completedSteps?: number[] } | undefined;
  console.log("\ncrossAnalyseWizard bestaat:", !!wiz);
  if (!wiz) return;
  console.log("  currentStep:", wiz.currentStep);
  console.log("  completedSteps:", wiz.completedSteps);
  console.log("  stepResults keys:", Object.keys(wiz.stepResults ?? {}));

  const stap4 = wiz.stepResults?.stap4;
  console.log("\n--- stap4 ---");
  console.log("  exists:", !!stap4);
  if (!stap4) return;
  console.log("  stap4 keys:", Object.keys(stap4));

  const subEffortAnalysis = stap4.subEffortAnalysis as unknown[] | undefined;
  console.log("  subEffortAnalysis entries:", subEffortAnalysis?.length ?? 0);

  const consolidatieAdvies = stap4.consolidatieAdvies as unknown[] | undefined;
  console.log("  consolidatieAdvies entries:", consolidatieAdvies?.length ?? 0);

  const begroting = stap4.begrotingAdvies as Record<string, unknown> | undefined;
  console.log("\n--- begrotingAdvies ---");
  console.log("  exists:", !!begroting);
  if (!begroting) {
    console.log("  --> NIET IN SUPABASE OPGESLAGEN");
    return;
  }
  console.log("  keys:", Object.keys(begroting));
  console.log("  jaarlijksBudgetBasis:", begroting.jaarlijksBudgetBasis);
  console.log("  cyclusMaanden:", begroting.cyclusMaanden);
  console.log("  startJaar:", begroting.startJaar);

  const scenarios = begroting.scenarios as { optimaal?: unknown; plus20?: unknown; min20?: unknown } | undefined;
  console.log("\n  scenarios:");
  console.log("    optimaal present:", !!scenarios?.optimaal);
  console.log("    plus20 present:", !!scenarios?.plus20);
  console.log("    min20 present:", !!scenarios?.min20);
  console.log("\n  vergelijking exists:", typeof begroting.vergelijking === "string" && (begroting.vergelijking as string).length > 0);
  console.log("  vergelijking length:", typeof begroting.vergelijking === "string" ? (begroting.vergelijking as string).length : 0);

  const stap7 = stap4.stap7InterneUren as Record<string, unknown> | undefined;
  console.log("\n--- stap7InterneUren ---");
  console.log("  exists:", !!stap7);
  if (stap7) console.log("  keys:", Object.keys(stap7));
}
main().catch((e) => { console.error(e); process.exit(1); });
