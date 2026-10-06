// Cel-som-validatie voor DIN Stap 7 (interne uren) — read-only audit.
// Voor elk scenario × domein × jaar checken of alle aggregaties consistent zijn:
//   1. Som rol.uren        == jaar.totaalUren
//      jaar.totaalKosten   == som rol.kosten   (en uren × geïndexeerd uurtarief)
//   2. Som jaren.totaalUren == domein.totaalUren
//      programmaUren+lijnUren+raadplegenUren ≈ totaalUren  (indien aanwezig)
//   3. Som domeinen.totaalUren == scenario.totaalUren
//      Som totalenPerJaar.uren == scenario.totaalUren
//      2026 J1 ≤ cap-advies (290 advies/plus20, 250 optimaal/min20)
//
// Output: AUDIT-CEL-VALIDATIE.md (Nederlands).
// Usage:  npx tsx scripts/audit-cel-validatie.ts d8b97442

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOL = 1; // tolerantie in uren / euro: alles >1 melden

type Rol = { functieNaam: string; uren: number; uurtarief: number; kosten: number };
type Jaar = { jaar: number; rollen: Rol[]; totaalUren?: number; totaalKosten?: number };
type Domein = {
  domein: string;
  jaren: Jaar[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
};
type Scenario = {
  scenarioLabel: string;
  startJaar: number;
  uurtariefGebruikt: number;
  domeinen: Domein[];
  totalenPerJaar?: { jaar: number; uren: number; kosten: number }[];
  totaalUren?: number;
  totaalKosten?: number;
};

type Afwijking = {
  scenario: string;
  domein?: string;
  jaar?: number;
  niveau: "rol→jaar" | "jaar-kosten" | "jaren→domein" | "P/L/R-split" | "domeinen→scenario" | "tpj→scenario" | "J1-cap";
  verwacht: number;
  gevonden: number;
  delta: number;
  detail: string;
};

async function main() {
  const arg = process.argv[2] ?? "d8b97442";
  // id is uuid — cast naar text voor prefix-match
  const { data: rows, error } = await supa
    .from("din_sessions")
    .select("id, data");
  if (error) throw error;
  const row = rows?.find((r: { id: string }) => r.id.startsWith(arg));
  if (!row) {
    console.error(`Geen sessie gevonden voor prefix ${arg}`);
    process.exit(1);
  }
  const s = row.data as Record<string, unknown>;

  const stap4 = (
    (s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<
      string,
      Record<string, unknown>
    >
  )?.stap4;
  const stap7 = stap4?.stap7InterneUren as
    | { uurtariefSettings: { basisTarief: number; referentiejaar: number; indexatiePercentage: number }; scenarios: Record<string, Scenario | null> }
    | undefined;
  if (!stap7) {
    console.error("Geen stap7-data");
    process.exit(1);
  }

  const { basisTarief, referentiejaar, indexatiePercentage } = stap7.uurtariefSettings;
  // indexatiePercentage is opgeslagen als fractie (bv. 0.05 = 5%), niet als procentueel getal
  const idx = indexatiePercentage;

  function tariefVoorJaar(j: number): number {
    return basisTarief * Math.pow(1 + idx, j - referentiejaar);
  }

  const afwijkingen: Afwijking[] = [];
  type Row = {
    scenario: string;
    domein: string;
    jaar: number;
    sumRol: number;
    rapportJaarUren: number | string;
    rapportJaarKosten: number | string;
    verwachtKosten: number;
    ok: string;
  };
  const tabelRows: Row[] = [];

  const scenarioLabels = ["optimaal", "plus20", "min20", "advies"] as const;
  for (const label of scenarioLabels) {
    const sc = stap7.scenarios[label];
    if (!sc) continue;

    // 1+2: door domeinen lopen
    let somDomeinUren = 0;
    let somDomeinKosten = 0;
    for (const d of sc.domeinen ?? []) {
      let somJaarUren = 0;
      let somJaarKosten = 0;
      for (const j of d.jaren ?? []) {
        const sumRolUren = (j.rollen ?? []).reduce((a, r) => a + (r.uren ?? 0), 0);
        const sumRolKosten = (j.rollen ?? []).reduce((a, r) => a + (r.kosten ?? 0), 0);
        const rapJaarU = j.totaalUren ?? sumRolUren;
        const rapJaarK = j.totaalKosten ?? sumRolKosten;
        // Verwacht kosten = som rol.kosten (elke rol heeft eigen uurtarief).
        // Sanity-check tegen geïndexeerd basis-tarief.
        const tarief = tariefVoorJaar(j.jaar);
        const sanityKosten = Math.round(rapJaarU * tarief);
        const verwachtKosten = sumRolKosten;

        let okFlags = "";
        // 1a: som rollen == jaar.totaalUren?
        const dU = Math.abs(sumRolUren - rapJaarU);
        if (dU > TOL) {
          okFlags += " uren!=somRol";
          afwijkingen.push({
            scenario: label, domein: d.domein, jaar: j.jaar,
            niveau: "rol→jaar",
            verwacht: sumRolUren, gevonden: rapJaarU, delta: rapJaarU - sumRolUren,
            detail: `som van ${(j.rollen ?? []).length} rollen klopt niet met jaar.totaalUren`,
          });
        }
        // 1b: jaar.totaalKosten == Σ rol.kosten?
        const dK = Math.abs(rapJaarK - verwachtKosten);
        if (dK > TOL) {
          okFlags += " kosten!=somRolKosten";
          afwijkingen.push({
            scenario: label, domein: d.domein, jaar: j.jaar,
            niveau: "jaar-kosten",
            verwacht: verwachtKosten, gevonden: rapJaarK, delta: rapJaarK - verwachtKosten,
            detail: `jaar.totaalKosten vs Σrol.kosten (sanity ${rapJaarU}u × €${tarief.toFixed(2)} ≈ €${sanityKosten.toLocaleString("nl-NL")})`,
          });
        }

        somJaarUren += rapJaarU;
        somJaarKosten += rapJaarK;
        tabelRows.push({
          scenario: label, domein: d.domein, jaar: j.jaar,
          sumRol: sumRolUren,
          rapportJaarUren: rapJaarU,
          rapportJaarKosten: rapJaarK,
          verwachtKosten,
          ok: okFlags.trim() || "OK",
        });
      }

      // 2a: som jaren == domein.totaalUren?
      const rapDomU = d.totaalUren ?? somJaarUren;
      const rapDomK = d.totaalKosten ?? somJaarKosten;
      if (Math.abs(somJaarUren - rapDomU) > TOL) {
        afwijkingen.push({
          scenario: label, domein: d.domein,
          niveau: "jaren→domein",
          verwacht: somJaarUren, gevonden: rapDomU, delta: rapDomU - somJaarUren,
          detail: `som van ${d.jaren.length} jaren klopt niet met domein.totaalUren`,
        });
      }
      // 2b: programmaUren + lijnUren + raadplegenUren ≈ totaalUren?
      if (
        typeof d.programmaUren === "number" ||
        typeof d.lijnUren === "number" ||
        typeof d.raadplegenUren === "number"
      ) {
        const split = (d.programmaUren ?? 0) + (d.lijnUren ?? 0) + (d.raadplegenUren ?? 0);
        const verschil = Math.abs(split - rapDomU);
        if (verschil > Math.max(TOL, rapDomU * 0.01)) {
          afwijkingen.push({
            scenario: label, domein: d.domein,
            niveau: "P/L/R-split",
            verwacht: rapDomU, gevonden: split, delta: split - rapDomU,
            detail: `programmaUren(${d.programmaUren ?? 0})+lijnUren(${d.lijnUren ?? 0})+raadplegenUren(${d.raadplegenUren ?? 0}) vs totaal`,
          });
        }
      }
      somDomeinUren += rapDomU;
      somDomeinKosten += rapDomK;
    }

    // 3a: som domeinen == scenario.totaalUren?
    const rapScenU = sc.totaalUren ?? somDomeinUren;
    const rapScenK = sc.totaalKosten ?? somDomeinKosten;
    if (Math.abs(somDomeinUren - rapScenU) > TOL) {
      afwijkingen.push({
        scenario: label,
        niveau: "domeinen→scenario",
        verwacht: somDomeinUren, gevonden: rapScenU, delta: rapScenU - somDomeinUren,
        detail: `som van ${sc.domeinen.length} domeinen klopt niet met scenario.totaalUren`,
      });
    }
    // 3b: som totalenPerJaar.uren == scenario.totaalUren?
    if (sc.totalenPerJaar && sc.totalenPerJaar.length > 0) {
      const tpjU = sc.totalenPerJaar.reduce((a, t) => a + (t.uren ?? 0), 0);
      if (Math.abs(tpjU - rapScenU) > TOL) {
        afwijkingen.push({
          scenario: label,
          niveau: "tpj→scenario",
          verwacht: rapScenU, gevonden: tpjU, delta: tpjU - rapScenU,
          detail: `som totalenPerJaar.uren vs scenario.totaalUren`,
        });
      }
    }
    // 3c: 2026 J1 cap-check
    const cap = (label === "advies" || label === "plus20") ? 290 : 250;
    const j1 = sc.totalenPerJaar?.find((t) => t.jaar === 2026);
    if (j1 && j1.uren > cap + TOL) {
      afwijkingen.push({
        scenario: label,
        jaar: 2026,
        niveau: "J1-cap",
        verwacht: cap, gevonden: j1.uren, delta: j1.uren - cap,
        detail: `2026 J1-uren overschrijdt cap (${cap}u advies)`,
      });
    }
  }

  // ===== Markdown rapport =====
  const lines: string[] = [];
  lines.push(`# Audit cel-validatie — sessie ${row.id}`);
  lines.push(``);
  lines.push(`Datum: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Tarief-basis: €${basisTarief}/u (ref. ${referentiejaar}, indexatie ${(indexatiePercentage*100).toFixed(1)}%/jaar)`);
  lines.push(``);
  lines.push(`Tolerantie: > ${TOL} u (uren) of > 0,5×urenAfronding (kosten).`);
  lines.push(``);
  lines.push(`## Samenvatting`);
  lines.push(``);
  lines.push(`Aantal afwijkingen totaal: **${afwijkingen.length}**.`);
  const perNiveau: Record<string, number> = {};
  for (const a of afwijkingen) perNiveau[a.niveau] = (perNiveau[a.niveau] ?? 0) + 1;
  for (const [k, v] of Object.entries(perNiveau).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push(``);

  // Tabel scenario × domein × jaar
  lines.push(`## Tabel: scenario × domein × jaar — som-check`);
  lines.push(``);
  lines.push(`| Scenario | Domein | Jaar | Σrol-uren | jaar.totaalUren | jaar.totaalKosten | verwachtKosten | Status |`);
  lines.push(`|---|---|---:|---:|---:|---:|---:|---|`);
  for (const r of tabelRows) {
    lines.push(
      `| ${r.scenario} | ${r.domein} | ${r.jaar} | ${r.sumRol} | ${r.rapportJaarUren} | €${Number(r.rapportJaarKosten).toLocaleString("nl-NL")} | €${r.verwachtKosten.toLocaleString("nl-NL")} | ${r.ok === "OK" ? "OK" : "AFW" + ` (${r.ok})`} |`
    );
  }
  lines.push(``);

  // Top 15 grootste afwijkingen
  lines.push(`## Top-15 grootste afwijkingen`);
  lines.push(``);
  const top = [...afwijkingen]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 15);
  if (top.length === 0) {
    lines.push(`Geen afwijkingen > ${TOL} gevonden.`);
  } else {
    lines.push(`| # | Scenario | Niveau | Domein | Jaar | Verwacht | Gevonden | Delta | Detail |`);
    lines.push(`|---:|---|---|---|---:|---:|---:|---:|---|`);
    top.forEach((a, i) => {
      lines.push(
        `| ${i + 1} | ${a.scenario} | ${a.niveau} | ${a.domein ?? "-"} | ${a.jaar ?? "-"} | ${a.verwacht.toLocaleString("nl-NL")} | ${a.gevonden.toLocaleString("nl-NL")} | ${a.delta > 0 ? "+" : ""}${a.delta.toLocaleString("nl-NL")} | ${a.detail} |`
      );
    });
  }
  lines.push(``);

  // Voorstel-correctie
  lines.push(`## Voorstel-correctie`);
  lines.push(``);
  if (afwijkingen.length === 0) {
    lines.push(`Alle aggregaties kloppen binnen tolerantie. Geen data-fix nodig.`);
  } else {
    const niveau = perNiveau;
    if (niveau["rol→jaar"]) {
      lines.push(`- **rol→jaar (${niveau["rol→jaar"]}×)**: herbereken \`jaar.totaalUren = Σ rollen[].uren\` voor elke afwijkende cel.`);
    }
    if (niveau["jaar-kosten"]) {
      lines.push(`- **jaar-kosten (${niveau["jaar-kosten"]}×)**: herbereken \`jaar.totaalKosten = Σ rollen[].kosten\` (basis €${basisTarief}, indexatie ${(indexatiePercentage*100).toFixed(1)}%/jaar).`);
    }
    if (niveau["jaren→domein"]) {
      lines.push(`- **jaren→domein (${niveau["jaren→domein"]}×)**: herbereken \`domein.totaalUren = Σ jaren[].totaalUren\`.`);
    }
    if (niveau["P/L/R-split"]) {
      lines.push(`- **P/L/R-split (${niveau["P/L/R-split"]}×)**: programma+lijn+raadplegen-uren matchen niet met domein-totaal — schaal de drie velden naar ratio-verdeling op nieuw totaal.`);
    }
    if (niveau["domeinen→scenario"]) {
      lines.push(`- **domeinen→scenario (${niveau["domeinen→scenario"]}×)**: herbereken \`scenario.totaalUren = Σ domeinen[].totaalUren\`.`);
    }
    if (niveau["tpj→scenario"]) {
      lines.push(`- **tpj→scenario (${niveau["tpj→scenario"]}×)**: herbereken \`scenario.totalenPerJaar\` door per-jaar over alle domeinen te aggregeren.`);
    }
    if (niveau["J1-cap"]) {
      lines.push(`- **J1-cap (${niveau["J1-cap"]}×)**: 2026 ligt boven cap — overschot doorschuiven naar 2027 of buffer-correctie toepassen (zie scripts/halfjaar-2026-uren-fix.ts).`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(`Gegenereerd door \`scripts/audit-cel-validatie.ts\` — read-only, geen Supabase-write.`);

  const out = join(process.cwd(), "AUDIT-CEL-VALIDATIE.md");
  writeFileSync(out, lines.join("\n"), "utf-8");
  console.log(`OK — ${afwijkingen.length} afwijkingen geschreven naar ${out}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
