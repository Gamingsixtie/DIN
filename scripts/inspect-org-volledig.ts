// Volledig overzicht van programmaorganisatie + gezamenlijkeRasci voor diagnose
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.substring(0, eq).trim();
    const v = t.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const id = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await supa.from("din_sessions").select("data, updated_at").eq("id", id).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const po = s.programmaorganisatie as Record<string, unknown> | undefined;
  console.log("Updated:", data!.updated_at);
  console.log();
  console.log("=== PROGRAMMAORGANISATIE — VOLLEDIG ===\n");
  console.log("OPDRACHTGEVER:", JSON.stringify(po?.opdrachtgever, null, 2));
  console.log("\nPROGRAMMAMANAGER:", JSON.stringify(po?.programmamanager, null, 2));
  console.log("\nSTUURGROEP:");
  for (const r of (po?.stuurgroep ?? []) as Array<Record<string, string>>) {
    console.log(`  - ${r.rol} | ${r.naam} | ${r.functie} | sector=${r.sector}`);
  }
  console.log("\nDOMEINEIGENAREN:");
  for (const r of (po?.domeineigenaren ?? []) as Array<Record<string, string>>) {
    console.log(`  - ${r.rol} | ${r.naam} | ${r.functie}`);
  }
  console.log("\nKERNGROEP:");
  for (const r of (po?.kerngroep ?? []) as Array<Record<string, string>>) {
    console.log(`  - ${r.rol} | ${r.naam} | ${r.functie}`);
  }
  console.log("\nKLANKBORDGROEP:");
  for (const r of (po?.klankbordgroep ?? []) as Array<Record<string, string>>) {
    console.log(`  - ${r.rol} | ${r.naam} | sector=${r.sector}`);
  }
  console.log();
  console.log("=== GEZAMENLIJKE RASCI ===");
  const rasci = (s.gezamenlijkeRasci ?? []) as Array<Record<string, unknown>>;
  console.log(`Aantal items: ${rasci.length}`);
  const perSectie = new Map<string, number>();
  for (const r of rasci) {
    const sec = r.sectie as string;
    perSectie.set(sec, (perSectie.get(sec) ?? 0) + 1);
  }
  for (const [sec, n] of perSectie) console.log(`  ${sec}: ${n} rijen`);
}
main().catch(console.error);
