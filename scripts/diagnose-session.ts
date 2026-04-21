// Diagnose: tel subEffortAnalysis entries per domein in een sessie, zonder
// inhoud te printen. Alleen tellers zodat we kunnen zien of de nieuwe
// prompt-wijziging effect heeft gehad.
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
if (!sessionId) { console.error("Usage: tsx scripts/diagnose-session.ts <sessionId>"); process.exit(1); }

const supa = createClient(SUPABASE_URL, KEY);

async function main() {
  const { data, error } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (error || !data) { console.error(error?.message ?? "not found"); process.exit(1); }
  const s = data.data as Record<string, unknown>;

  const efforts = (s.efforts as Array<{ sectorId: string; domain: string; consolidated?: boolean }> | undefined) ?? [];
  const effortsByDom: Record<string, Record<string, number>> = {};
  for (const e of efforts) {
    if (e.consolidated) continue;
    effortsByDom[e.domain] ??= {};
    effortsByDom[e.domain][e.sectorId] = (effortsByDom[e.domain][e.sectorId] ?? 0) + 1;
  }

  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, unknown> } | undefined;
  const stap2 = wiz?.stepResults?.stap2 as { vermogenGelijkenisGroepen?: unknown[] } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as {
    subEffortAnalysis?: Array<{ groepId: string; domein: string; items?: string[]; vermogenImpact?: unknown[] }>;
  } | undefined;

  console.log("SESSIE:", sessionId);
  console.log("Capabilities:", (s.capabilities as unknown[] | undefined)?.length ?? 0);
  console.log("Efforts (actief):", efforts.filter((e) => !e.consolidated).length);
  console.log("Bron-inspanningen per domein × sector:", effortsByDom);
  console.log("Gelijkenisgroepen in stap2:", stap2?.vermogenGelijkenisGroepen?.length ?? 0);
  const sub = stap4?.subEffortAnalysis ?? [];
  console.log("subEffortAnalysis entries totaal:", sub.length);
  const perDomein: Record<string, number> = {};
  const perGroep: Record<string, number> = {};
  const itemCountPerEntry: number[] = [];
  const impactCountPerEntry: number[] = [];
  for (const e of sub) {
    perDomein[e.domein] = (perDomein[e.domein] ?? 0) + 1;
    perGroep[e.groepId] = (perGroep[e.groepId] ?? 0) + 1;
    itemCountPerEntry.push((e.items ?? []).length);
    impactCountPerEntry.push((e.vermogenImpact ?? []).length);
  }
  console.log("Per domein (totaal):", perDomein);
  console.log("Per groep:", perGroep);
  console.log("Items per entry (bron-inspanning-IDs):", itemCountPerEntry);
  console.log("vermogenImpact per entry:", impactCountPerEntry);
}
main().catch((e) => { console.error(e); process.exit(1); });
