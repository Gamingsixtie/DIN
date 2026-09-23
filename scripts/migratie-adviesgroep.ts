// ============================================================
// Migratie: stuurgroep verkleinen + adviesgroep introduceren
// ============================================================
// VEILIG ONTWORPEN:
//   - Standaard DRY-RUN: laat zien wat er zou gebeuren, schrijft NIETS.
//   - Pas met `--apply` wordt er weggeschreven, en dan EERST een volledige
//     backup naar backups/ (PRE-ADVIESGROEP).
//   - Matcht personen op voornaam (robuust tegen "Bert Thijs" vs "Bertheis").
//   - Idempotent: nogmaals draaien levert hetzelfde eindresultaat.
//
// Gebruik:
//   npx tsx scripts/migratie-adviesgroep.ts            # dry-run (veilig kijken)
//   npx tsx scripts/migratie-adviesgroep.ts --apply    # echt doorvoeren
//
// Eindbeeld:
//   STUURGROEP  = sectormanagers + Cornelis (Data & Technologie)
//                 Jasper=Zakelijk · Bertheis=VO · Leontine=PO
//   ADVIESGROEP = Roel (Directeur Cito) · Pieta (Directeur IV/IT) ·
//                 George (Finance) · Sjors
//   Yara        = uit stuurgroep (blijft inspanningsleider in de kerngroep)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ---- Config ----
const SESSION_ID =
  process.argv.find((a) => a.startsWith("--id="))?.slice(5) ??
  "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const APPLY = process.argv.includes("--apply");
// TODO: vervang door Sjors' echte functie zodra bekend (of laat leeg en vul in de UI).
const SJORS_FUNCTIE = "";

// ---- Env laden ----
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
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Rol = { id: string; rol: string; naam?: string; functie?: string; sector?: string; mandaat?: string; toelichting?: string };

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function firstName(s?: string): string {
  return (s ?? "").toLowerCase().trim().replace(/^[(\[]/, "").match(/^[a-zà-ÿ]+/)?.[0] ?? "";
}
const ADVIES_MANDAAT = "Adviseert opdrachtgever + stuurgroep — geen besluitmandaat";

async function main() {
  console.log(`\n=== MIGRATIE adviesgroep ${APPLY ? "(APPLY — schrijft weg)" : "(DRY-RUN — schrijft niets)"} ===`);
  console.log(`Sessie: ${SESSION_ID}\n`);

  const { data, error } = await supa.from("din_sessions").select("id, name, updated_at, data").eq("id", SESSION_ID).maybeSingle();
  if (error) { console.error("FETCH-FOUT:", error.message); process.exit(1); }
  if (!data) { console.error("Sessie niet gevonden."); process.exit(2); }

  const session = data.data as Record<string, unknown>;
  const po = (session.programmaorganisatie ?? {}) as Record<string, unknown>;
  const stuur = (po.stuurgroep ?? []) as Rol[];
  const adviesBestaand = (po.adviesgroep ?? []) as Rol[];

  console.log("HUIDIGE STUURGROEP:");
  for (const r of stuur) console.log(`  - ${r.naam ?? "(geen naam)"} | ${r.functie ?? ""} | sector=${r.sector ?? ""}`);

  const nieuwStuur: Rol[] = [];
  const advies: Rol[] = [...adviesBestaand];
  const log: string[] = [];
  const addAdvies = (r: Rol) => { if (!advies.some((a) => firstName(a.naam) === firstName(r.naam))) advies.push(r); };

  for (const r of stuur) {
    const fn = firstName(r.naam);
    if (fn === "jasper") { nieuwStuur.push({ ...r, rol: "Stuurgroep", functie: "Sectormanager Zakelijk", sector: "Zakelijk" }); log.push(`Jasper → stuurgroep (Sectormanager Zakelijk)`); }
    else if (fn === "bert" || fn === "bertheis") { nieuwStuur.push({ ...r, rol: "Stuurgroep", functie: "Sectormanager VO", sector: "VO" }); log.push(`${r.naam} → stuurgroep (Sectormanager VO)`); }
    else if (fn === "leon" || fn === "leontine") { nieuwStuur.push({ ...r, rol: "Stuurgroep", functie: "Sectormanager PO", sector: "PO" }); log.push(`${r.naam} → stuurgroep (Sectormanager PO)`); }
    else if (fn === "cornelis" || fn === "cor") { nieuwStuur.push({ ...r, rol: "Stuurgroep" }); log.push(`Cornelis → blijft stuurgroep (Manager Data & Technologie)`); }
    else if (fn === "yara") { log.push(`Yara → UIT stuurgroep (blijft inspanningsleider in kerngroep)`); }
    else if (fn === "roel" || fn === "rool") { addAdvies({ ...r, rol: "Adviesgroep", functie: r.functie || "Directeur Cito", mandaat: ADVIES_MANDAAT }); log.push(`Roel → adviesgroep (Directeur Cito)`); }
    else if (fn === "pieta" || fn === "pitta" || fn === "piet") { addAdvies({ ...r, rol: "Adviesgroep", functie: r.functie || "Directeur IV/IT", mandaat: ADVIES_MANDAAT }); log.push(`Pieta → adviesgroep (Directeur IV/IT)`); }
    else if (fn === "george") { addAdvies({ ...r, rol: "Adviesgroep", functie: "Manager Finance", mandaat: ADVIES_MANDAAT }); log.push(`George → adviesgroep (Finance)`); }
    else { nieuwStuur.push(r); log.push(`⚠ ONBEKEND "${r.naam}" → blijft staan in stuurgroep (niets verloren)`); }
  }
  // Sjors toevoegen aan adviesgroep
  if (!advies.some((a) => firstName(a.naam) === "sjors")) {
    addAdvies({ id: uuid(), rol: "Adviesgroep", naam: "Sjors", functie: SJORS_FUNCTIE, sector: "Programmabreed", mandaat: ADVIES_MANDAAT, toelichting: "" });
    log.push(`Sjors → adviesgroep (nieuw)${SJORS_FUNCTIE ? "" : " — functie nog leeg, vul in de UI"}`);
  }

  console.log("\nWIJZIGINGEN:");
  for (const l of log) console.log(`  • ${l}`);
  console.log("\nNIEUWE STUURGROEP:");
  for (const r of nieuwStuur) console.log(`  - ${r.naam} | ${r.functie} | sector=${r.sector}`);
  console.log("\nNIEUWE ADVIESGROEP:");
  for (const r of advies) console.log(`  - ${r.naam} | ${r.functie || "(functie leeg)"}`);

  if (!APPLY) {
    console.log("\n(DRY-RUN — er is NIETS gewijzigd. Tevreden? Draai opnieuw met:  --apply )\n");
    return;
  }

  // ---- APPLY: eerst backup, dan schrijven ----
  const dir = join(process.cwd(), "backups");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = join(dir, `session-${SESSION_ID.slice(0, 8)}-PRE-ADVIESGROEP-${stamp}.json`);
  writeFileSync(backupFile, JSON.stringify({ id: data.id, name: data.name, updated_at: data.updated_at, data: session }, null, 2), "utf-8");
  console.log(`\n✓ Backup gemaakt vóór wijziging: ${backupFile}`);

  const remoteVersion = (session.version as number) ?? 0;
  const nextVersion = remoteVersion + 1;
  const nieuwePo = { ...po, stuurgroep: nieuwStuur, adviesgroep: advies };
  const nieuweSession = { ...session, programmaorganisatie: nieuwePo, version: nextVersion };

  const { error: writeErr } = await supa.from("din_sessions").upsert(
    { id: data.id, name: data.name, data: nieuweSession, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (writeErr) { console.error("SCHRIJF-FOUT:", writeErr.message); process.exit(3); }
  console.log(`✓ Doorgevoerd. Sessie nu v${nextVersion}. Herlaad de app (hard refresh) om het te zien.\n`);
}
main().catch((e) => { console.error("EXCEPTIE:", e?.message ?? e); process.exit(9); });
