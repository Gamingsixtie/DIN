// Volledig overzicht van wat StapOptimaliseren als bron + output heeft voor
// sessie d8b97442. Doel: vóór herontwerp Stap 8 berekeningen weten wat
// daadwerkelijk in §4.1 staat — niet wat ik denk.
//
// Run: npx tsx scripts/dump-stap-optimaliseren-bron.ts > tmp/stap6-bron.txt
// READ-ONLY.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseDossierRaming } from "../src/lib/dossier-parser";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const fmt = (n: number | undefined | null) =>
  typeof n === "number" ? `€ ${Math.round(n).toLocaleString("nl-NL")}` : "—";

const SEP = (c = "═") => c.repeat(100);

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }

  const root = data.data as Record<string, unknown>;
  const wiz = root.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined) ?? [];
  const begroting = stap4?.begrotingAdvies as
    | {
        startJaar?: number;
        jaarlijksBudget?: number;
        scenarios?: Record<string, {
          totaalGeraamdEuro?: number;
          jaarlijksBudgetEuro?: number;
          aantalJaren?: number;
          motivatie?: string;
          inspanningen?: Array<{
            inspanningTitel: string;
            domein?: string;
            totaalEuro?: number;
            percentageTotaal?: number;
            motivatie?: string;
            verdelingPerJaar?: Array<{ jaar: number; euro: number; fase?: string; percentage?: number }>;
            volgorde?: { rank?: number; reden?: string };
          }>;
          totalenPerJaar?: Array<{ jaar: number; euro: number }>;
        } | null>;
      }
    | undefined;

  console.log(SEP());
  console.log("BRONDATA — wat StapOptimaliseren / §4.1 begrotingadvies gebruikt");
  console.log(SEP());
  console.log(`Sessie: ${sessionId}`);
  console.log(`StartJaar: ${begroting?.startJaar ?? "?"}`);
  console.log(`JaarlijksBudget (Cito-norm): ${fmt(begroting?.jaarlijksBudget)}`);
  console.log();

  // ───────────────────────────────────────────────────────────────────────
  // BLOK 1 — Per inspanning de bron-tekst (kostenraming + business-case)
  // ───────────────────────────────────────────────────────────────────────
  console.log(SEP("█"));
  console.log("█ BLOK 1 — BRON-TEKSTEN per inspanning (input voor begroting-advies AI)");
  console.log(SEP("█"));

  for (const i of sub) {
    const titel = i.titel as string;
    const domein = i.domein as string;
    const beschrijving = i.beschrijving as string | undefined;
    const beargumentatie = i.beargumentatie as string | undefined;
    const vermogenImpact = i.vermogenImpact as string | undefined;
    const dossier = i.dossier as Record<string, unknown> | undefined;
    const kostenraming = (dossier?.kostenraming as string | undefined) ?? "";
    const eigenaar = (dossier?.eigenaar as string | undefined) ?? "";
    const inspanningsleider = (dossier?.inspanningsleider as string | undefined) ?? "";
    const verwachtResultaat = (dossier?.verwachtResultaat as string | undefined) ?? "";
    const randvoorwaarden = (dossier?.randvoorwaarden as string | undefined) ?? "";
    const aannames = (i.businessCaseAannames as string[] | undefined) ?? [];
    const risicos = (i.businessCaseRisicos as string[] | undefined) ?? [];

    console.log("\n" + SEP());
    console.log(`## ${titel}`);
    console.log(`Domein: ${domein}`);
    console.log(SEP());

    if (beschrijving) console.log(`\n**Beschrijving:** ${beschrijving}`);
    if (beargumentatie) console.log(`\n**Beargumentatie:** ${beargumentatie}`);
    if (vermogenImpact) console.log(`\n**Vermogen-impact:** ${vermogenImpact}`);

    console.log("\n**Dossier:**");
    console.log(`  - Eigenaar: ${eigenaar}`);
    console.log(`  - Inspanningsleider: ${inspanningsleider}`);
    if (verwachtResultaat) console.log(`  - Verwacht resultaat: ${verwachtResultaat}`);
    if (randvoorwaarden) console.log(`  - Randvoorwaarden: ${randvoorwaarden}`);

    console.log("\n**Kostenraming-tekst (de bron voor parser én AI):**");
    console.log(kostenraming);

    const parsed = parseDossierRaming(kostenraming);
    console.log("\n**Parser-uitkomst (parseDossierRaming):**");
    console.log(`  eenmalig: low=${fmt(parsed.eenmaligLow)}  mid=${fmt(parsed.eenmaligMid)}  high=${fmt(parsed.eenmaligHigh)}`);
    console.log(`  structureel: low=${fmt(parsed.structureelLowPerJr)}/jr  mid=${fmt(parsed.structureelMidPerJr)}/jr  high=${fmt(parsed.structureelHighPerJr)}/jr`);
    console.log(`  unparsed: ${parsed.unparsed}`);

    if (aannames.length) {
      console.log("\n**Business-case aannames:**");
      for (const a of aannames) console.log(`  • ${a}`);
    }
    if (risicos.length) {
      console.log("\n**Business-case risico's:**");
      for (const r of risicos) console.log(`  • ${r}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // BLOK 2 — Per scenario alle output (motivatie + inspanningen + verdeling)
  // ───────────────────────────────────────────────────────────────────────
  console.log("\n\n" + SEP("█"));
  console.log("█ BLOK 2 — SCENARIO-OUTPUT zoals §4.1 toont");
  console.log(SEP("█"));

  const scenariosMap = begroting?.scenarios ?? {};
  for (const [key, sc] of Object.entries(scenariosMap)) {
    if (!sc) continue;
    console.log("\n" + SEP());
    console.log(`### Scenario: ${key.toUpperCase()}`);
    console.log(SEP());
    console.log(`Cap (jaarlijks budget): ${fmt(sc.jaarlijksBudgetEuro)}/jr`);
    console.log(`Aantal jaren: ${sc.aantalJaren}`);
    console.log(`Totaal geraamd: ${fmt(sc.totaalGeraamdEuro)}`);

    if (sc.motivatie) {
      console.log(`\n**Motivatie scenario:**`);
      console.log(sc.motivatie);
    }

    console.log("\n**Inspanningen:**");
    for (const ins of sc.inspanningen ?? []) {
      console.log(`\n  ── ${ins.inspanningTitel} (${ins.domein}) ─ totaal ${fmt(ins.totaalEuro)} (${ins.percentageTotaal ?? "?"}% van scenario) ─ rank ${ins.volgorde?.rank ?? "?"}`);
      if (ins.volgorde?.reden) console.log(`     volgorde-reden: ${ins.volgorde.reden}`);
      if (ins.motivatie) console.log(`     motivatie: ${ins.motivatie}`);
      console.log(`     verdelingPerJaar:`);
      for (const v of ins.verdelingPerJaar ?? []) {
        console.log(`       ${v.jaar}: ${fmt(v.euro)} (${v.percentage ?? "?"}%)${v.fase ? ` — ${v.fase}` : ""}`);
      }
    }

    if (sc.totalenPerJaar?.length) {
      console.log("\n**totalenPerJaar:**");
      for (const t of sc.totalenPerJaar) {
        const benutting = sc.jaarlijksBudgetEuro ? Math.round((t.euro / sc.jaarlijksBudgetEuro) * 100) : 0;
        console.log(`  ${t.jaar}: ${fmt(t.euro)} (${benutting}% van cap)`);
      }
    }
  }

  console.log("\n" + SEP());
  console.log("EINDE BRON-DUMP");
  console.log(SEP());
}

main().catch((e) => { console.error(e); process.exit(1); });
