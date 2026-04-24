// Schrijf een volledige, ongemodificeerde backup van een sessie uit Supabase naar
// backups/session-<shortId>-backup-<YYYY-MM-DD>.json. Deze backup blijft identiek
// aan wat in Supabase staat — geen stripping, geen transformatie — zodat de
// sessie integraal teruggezet kan worden als er iets misgaat.
//
// Gebruik: npx tsx scripts/backup-session.ts <sessionId>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
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
loadEnvFile(join(process.cwd(), ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sessionId = process.argv[2];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Ontbrekende env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!sessionId) {
  console.error("Gebruik: npx tsx scripts/backup-session.ts <sessionId>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from("din_sessions")
    .select("data, updated_at")
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

  const backupsDir = join(process.cwd(), "backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const shortId = sessionId.slice(0, 8);
  const outPath = join(backupsDir, `session-${shortId}-backup-${today}.json`);

  writeFileSync(outPath, JSON.stringify(session), "utf-8");

  const counts = {
    goals: (session.goals as unknown[] | undefined)?.length ?? 0,
    benefits: (session.benefits as unknown[] | undefined)?.length ?? 0,
    capabilities: (session.capabilities as unknown[] | undefined)?.length ?? 0,
    efforts: (session.efforts as unknown[] | undefined)?.length ?? 0,
    sectorPlans: (session.sectorPlans as unknown[] | undefined)?.length ?? 0,
    pmcEntries: (session.pmcEntries as unknown[] | undefined)?.length ?? 0,
    completedGoals: (session.completedGoals as unknown[] | undefined)?.length ?? 0,
    goalBenefitMaps: (session.goalBenefitMaps as unknown[] | undefined)?.length ?? 0,
    benefitCapabilityMaps: (session.benefitCapabilityMaps as unknown[] | undefined)?.length ?? 0,
    capabilityEffortMaps: (session.capabilityEffortMaps as unknown[] | undefined)?.length ?? 0,
    hasVision: Boolean(session.vision),
    hasScope: Boolean(session.scope),
    wizardSteps: Object.keys(
      (session.crossAnalyseWizard as { stepResults?: Record<string, unknown> } | undefined)?.stepResults ?? {}
    ),
    version: session.version,
    updatedAt: data.updated_at,
  };
  console.log(`Backup geschreven: ${outPath}`);
  console.log("Inhoud:", counts);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
