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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const sess = data.data as Record<string, unknown>;
  const stap4 = (
    (sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<
      string,
      unknown
    >
  )?.stap4 as Record<string, unknown> | undefined;
  const beg = stap4?.begrotingAdvies as
    | {
        scenarios?: Record<
          string,
          {
            scenarioLabel?: string;
            totaalGeraamdEuro?: number;
            jaarlijksBudgetEuro?: number;
            aantalJaren?: number;
            samenvatting?: string;
            prioriteitAdvies?: string;
            inspanningen?: Array<{
              inspanningTitel: string;
              totaalEuro?: number;
              verdelingPerJaar?: Array<{ jaar: number; euro: number }>;
            }>;
          } | null
        >;
        vergelijking?: string;
      }
    | undefined;

  console.log("=".repeat(80));
  console.log("ALL SCENARIO TOTALS + CRM");
  console.log("=".repeat(80));
  for (const sk of ["advies", "plus20", "optimaal", "min20"]) {
    const sc = beg?.scenarios?.[sk];
    if (!sc) {
      console.log(`\n${sk}: ABSENT`);
      continue;
    }
    console.log(`\n=== ${sk} (${sc.scenarioLabel}) ===`);
    console.log(
      `  totaalGeraamdEuro: € ${(sc.totaalGeraamdEuro ?? 0).toLocaleString("nl-NL")}`,
    );
    console.log(
      `  jaarlijksBudgetEuro: € ${(sc.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")}`,
    );
    console.log(`  aantalJaren: ${sc.aantalJaren}`);

    const crm = sc.inspanningen?.find((i) =>
      i.inspanningTitel.includes("CRM"),
    );
    if (crm) {
      console.log(
        `  CRM totaalEuro: € ${(crm.totaalEuro ?? 0).toLocaleString("nl-NL")}`,
      );
      console.log(`  CRM verdeling:`);
      for (const c of crm.verdelingPerJaar ?? []) {
        console.log(`    ${c.jaar}: € ${c.euro.toLocaleString("nl-NL")}`);
      }
    }

    console.log(
      `  samenvatting (eerste 200): ${(sc.samenvatting ?? "").slice(0, 200)}`,
    );
    console.log(
      `  prioriteitAdvies (eerste 200): ${(sc.prioriteitAdvies ?? "").slice(0, 200)}`,
    );
  }

  // vergelijking + subEffort dossier
  console.log("\n=== vergelijking (eerste 600) ===");
  console.log((beg?.vergelijking ?? "").slice(0, 600));

  const subAn = stap4?.subEffortAnalysis as
    | Record<string, { dossier?: { kostenraming?: string } }>
    | unknown[]
    | undefined;
  console.log("\n=== subEffortAnalysis CRM dossier ===");
  if (Array.isArray(subAn)) {
    for (const item of subAn) {
      const it = item as Record<string, unknown>;
      const title = (it.title ?? it.inspanningTitel ?? "") as string;
      if (typeof title === "string" && title.includes("CRM")) {
        const dossier = it.dossier as { kostenraming?: string } | undefined;
        console.log(`  Title: ${title}`);
        console.log(`  kostenraming: ${dossier?.kostenraming ?? "n/a"}`);
      }
    }
  } else if (subAn && typeof subAn === "object") {
    for (const [k, v] of Object.entries(
      subAn as Record<string, Record<string, unknown>>,
    )) {
      if (k.toLowerCase().includes("crm") || k.includes("crm")) {
        const dossier = v.dossier as { kostenraming?: string } | undefined;
        console.log(`  Key: ${k}`);
        console.log(`  kostenraming: ${dossier?.kostenraming ?? "n/a"}`);
      }
    }
  }
}
void main();
