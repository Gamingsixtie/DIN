// Haal een sessie uit Supabase op en schrijf het als demo-snapshot.json.
// Strip alles ná stap 2 uit crossAnalyseWizard.stepResults zodat een demo-user
// kan doorlopen tot "gedeelde vermogens" zonder API-kosten voor stap 1 en 2,
// maar stap 3/4/5 en stap 6 nog verse AI-runs kan doen.
//
// Gebruik: npx tsx scripts/update-demo-snapshot.ts <sessionId>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Laad .env.local handmatig (geen dotenv-dep nodig)
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
loadEnvFile(join(process.cwd(), ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sessionId = process.argv[2];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Ontbrekende env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!sessionId) {
  console.error("Gebruik: npx tsx scripts/update-demo-snapshot.ts <sessionId>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Supabase fout:", error.message);
    process.exit(1);
  }
  if (!data) {
    console.error("Sessie niet gevonden:", sessionId);
    process.exit(1);
  }

  const session = data.data as Record<string, unknown>;
  await writeSnapshot(session);
}

async function writeSnapshot(session: Record<string, unknown>) {

// Strip resultaten ná stap 2 zodat de demo-user deze zelf genereert. Stap 1 en 2
// zijn duur (vermogen-gelijkenis detectie) en blijven behouden.
const wizard = session.crossAnalyseWizard as
  | { currentStep?: number; completedSteps?: number[]; wizardVersion?: number; stepResults?: Record<string, unknown> }
  | undefined;
const strippedStepResults = wizard?.stepResults
  ? { stap1: wizard.stepResults.stap1, stap2: wizard.stepResults.stap2 }
  : undefined;

const snapshot = {
  name: session.name,
  currentStep: session.currentStep,
  vision: session.vision ?? null,
  scope: session.scope ?? null,
  goals: session.goals ?? [],
  benefits: session.benefits ?? [],
  capabilities: session.capabilities ?? [],
  efforts: session.efforts ?? [],
  sectorPlans: session.sectorPlans ?? [],
  pmcEntries: session.pmcEntries ?? [],
  goalBenefitMaps: session.goalBenefitMaps ?? [],
  benefitCapabilityMaps: session.benefitCapabilityMaps ?? [],
  capabilityEffortMaps: session.capabilityEffortMaps ?? [],
  projectCapabilityMaps: session.projectCapabilityMaps ?? [],
  completedGoals: session.completedGoals ?? [],
  crossAnalyseWizard: strippedStepResults
    ? {
        currentStep: 3, // start demo-user op stap 3 (net ná gedeelde vermogens)
        completedSteps: [1, 2],
        wizardVersion: 2,
        stepResults: strippedStepResults,
      }
    : undefined,
};

const outPath = join(process.cwd(), "src", "lib", "demo-snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf-8");

// Kort, niet-gevoelig logregeltje zodat de data zelf niet in de console komt
const counts = {
  goals: (session.goals as unknown[] | undefined)?.length ?? 0,
  benefits: (session.benefits as unknown[] | undefined)?.length ?? 0,
  capabilities: (session.capabilities as unknown[] | undefined)?.length ?? 0,
  efforts: (session.efforts as unknown[] | undefined)?.length ?? 0,
  hasStap1: Boolean(strippedStepResults?.stap1),
  hasStap2: Boolean(strippedStepResults?.stap2),
};
console.log(`Demo snapshot opgeslagen. Tellers:`, counts);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
