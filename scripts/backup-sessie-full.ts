// Volledige, veilige backup van één sessie uit Supabase → backups/ (timestamped).
// Doel: NIETS mag verloren gaan voordat we de programmaorganisatie wijzigen.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq === -1) continue;
    const k = t.substring(0, eq).trim();
    const v = t.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ref = (url.match(/https:\/\/([^.]+)\./)?.[1]) ?? "?";
console.log(`Supabase project-ref: ${ref}  (url-host)`);

const supa = createClient(url, key);

async function main() {
  const id = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

  // 1) Bereikbaarheid: tel rijen
  const { count, error: countErr } = await supa
    .from("din_sessions")
    .select("id", { count: "exact", head: true });
  if (countErr) { console.log("COUNT-FOUT:", countErr.message, countErr.code); }
  else { console.log(`Bereikbaar — ${count} sessies in din_sessions`); }

  // 2) Haal de sessie op
  const { data, error } = await supa
    .from("din_sessions")
    .select("id, name, updated_at, data")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.log("FETCH-FOUT:", error.message, error.code); process.exit(1); }
  if (!data) {
    console.log(`NIET GEVONDEN onder id=${id} in project ${ref}.`);
    // Toon welke ids er WEL zijn (eerste 20), helpt mismatch diagnosticeren
    const { data: lijst } = await supa.from("din_sessions").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(20);
    console.log("Aanwezige sessies:");
    for (const r of lijst ?? []) console.log(`  ${r.id} | ${r.name ?? "(naamloos)"} | ${r.updated_at}`);
    process.exit(2);
  }

  // 3) Schrijf volledige backup
  const dir = join(process.cwd(), "backups");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(dir, `session-${id.slice(0, 8)}-FULL-${stamp}.json`);
  const payload = { id: data.id, name: data.name, updated_at: data.updated_at, data: data.data };
  writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");

  const s = data.data as Record<string, unknown>;
  const po = (s.programmaorganisatie ?? {}) as Record<string, unknown>;
  const sizeKB = Math.round(JSON.stringify(payload).length / 1024);
  console.log(`\n✓ BACKUP GESCHREVEN: ${file}`);
  console.log(`  grootte: ${sizeKB} KB | versie: ${(s.version as number) ?? "?"} | naam: ${data.name}`);
  console.log(`  benefits=${(s.benefits as unknown[])?.length ?? 0} capabilities=${(s.capabilities as unknown[])?.length ?? 0} efforts=${(s.efforts as unknown[])?.length ?? 0}`);
  console.log(`  stuurgroep=${(po.stuurgroep as unknown[])?.length ?? 0} kerngroep=${(po.kerngroep as unknown[])?.length ?? 0} domeineigenaren=${(po.domeineigenaren as unknown[])?.length ?? 0} klankbordgroep=${(po.klankbordgroep as unknown[])?.length ?? 0}`);
}
main().catch((e) => { console.error("EXCEPTIE:", e?.message ?? e); process.exit(3); });
