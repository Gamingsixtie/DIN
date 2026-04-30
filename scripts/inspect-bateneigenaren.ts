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
  const { data } = await supa.from("din_sessions").select("data").eq("id", id).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const benefits = (s.benefits ?? []) as Array<Record<string, unknown>>;
  console.log(`Totaal baten: ${benefits.length}\n`);

  const eigenaarMap = new Map<string, Array<{ titel: string; sector: string }>>();
  for (const b of benefits) {
    const profiel = b.profiel as Record<string, string> | undefined;
    const eig = (profiel?.bateneigenaar ?? "").trim();
    const titel = (b.title as string) || ((b.description as string) ?? "").slice(0, 60);
    const sector = (b.sectorId as string) ?? "?";
    if (!eig) continue;
    if (!eigenaarMap.has(eig)) eigenaarMap.set(eig, []);
    eigenaarMap.get(eig)!.push({ titel, sector });
  }

  console.log("=== UNIEKE BATENEIGENAREN ===\n");
  for (const [naam, bn] of eigenaarMap) {
    console.log(`▸ ${naam} (${bn.length} ba${bn.length === 1 ? "at" : "ten"})`);
    for (const b of bn) console.log(`    - [${b.sector}] ${b.titel}`);
    console.log();
  }

  // Zonder eigenaar
  const zonder = benefits.filter((b) => {
    const p = b.profiel as Record<string, string> | undefined;
    return !p?.bateneigenaar?.trim();
  });
  if (zonder.length > 0) {
    console.log(`=== BATEN ZONDER EIGENAAR (${zonder.length}) ===\n`);
    for (const b of zonder) {
      console.log(`  - [${b.sectorId}] ${(b.title as string) || ((b.description as string) ?? "").slice(0, 60)}`);
    }
  }
}
main().catch(console.error);
