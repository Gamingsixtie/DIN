// Inspect: welke 4 cross-sectorale bundels zitten er in deze sessie en wie zijn
// de eigenaren / inspanningsleiders per bundel?
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

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const id = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data, error } = await supa.from("din_sessions").select("data, updated_at").eq("id", id).maybeSingle();
  if (error || !data) { console.log("GEEN data:", error?.message); return; }

  const s = data.data as Record<string, unknown>;
  console.log("Sessie:", id);
  console.log("Updated:", data.updated_at);
  console.log("Naam:", s.name);
  console.log();

  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const subEffort = (stap4?.subEffortAnalysis ?? []) as Array<Record<string, unknown>>;
  console.log("Totaal subEffortAnalysis entries:", subEffort.length);

  const comb = subEffort.filter((x) => x.actie === "combineren");
  console.log("Met actie=combineren:", comb.length);
  console.log();

  const perDomein = new Map<string, Array<Record<string, unknown>>>();
  for (const c of comb) {
    const dom = c.domein as string;
    if (!perDomein.has(dom)) perDomein.set(dom, []);
    perDomein.get(dom)!.push(c);
  }

  console.log("=== BUNDELS PER DOMEIN ===\n");
  const domeinVolgorde = ["mens", "processen", "data_systemen", "cultuur"];
  for (const dom of domeinVolgorde) {
    const bundels = perDomein.get(dom) ?? [];
    console.log(`▸ ${dom.toUpperCase()} (${bundels.length} bundel${bundels.length === 1 ? "" : "s"})`);
    for (const b of bundels) {
      const dossier = b.dossier as Record<string, string> | undefined;
      console.log(`  groepId: ${b.groepId}`);
      console.log(`  titel: ${(b.titel as string) || (b.voorgesteldeNaam as string) || "(geen)"}`);
      console.log(`  eigenaar:          ${JSON.stringify(dossier?.eigenaar ?? "")}`);
      console.log(`  inspanningsleider: ${JSON.stringify(dossier?.inspanningsleider ?? "")}`);
      const overlap = (dossier?.eigenaar ?? "").trim().toLowerCase() === (dossier?.inspanningsleider ?? "").trim().toLowerCase();
      console.log(`  → zelfde persoon? ${overlap ? "JA" : "NEE (apart)"}`);
      console.log();
    }
  }

  // Programmaorganisatie status
  const po = s.programmaorganisatie as Record<string, unknown> | undefined;
  if (po) {
    console.log("=== HUIDIGE PROGRAMMAORGANISATIE ===");
    const opd = po.opdrachtgever as Record<string, string> | undefined;
    const pm = po.programmamanager as Record<string, string> | undefined;
    console.log("Opdrachtgever:", opd ? `${opd.rol} - ${opd.naam || "(geen naam)"}` : "(leeg)");
    console.log("Programmamanager:", pm ? `${pm.rol} - ${pm.naam || "(geen naam)"}` : "(leeg)");
    const kg = (po.kerngroep ?? []) as Array<Record<string, string>>;
    const de = (po.domeineigenaren ?? []) as Array<Record<string, string>>;
    console.log(`Kerngroep (${kg.length}):`);
    for (const r of kg) console.log(`  - ${r.rol} | ${r.naam || "(geen)"} | ${r.functie || ""}`);
    console.log(`Domeineigenaren (${de.length}):`);
    for (const r of de) console.log(`  - ${r.rol} | ${r.naam || "(geen)"} | ${r.functie || ""}`);
  }
}

main().catch(console.error);
