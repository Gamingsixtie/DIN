/**
 * Risico-buffer bump voor sessie d8b97442:
 *
 * Buffer-component "Juridisch-technisch + PM-buffer" → "Risico-buffer onvoorzien"
 * mid €36K → €60K = +€24K eenmalig op CRM
 *
 * Effect per scenario:
 *   - CRM inspanningEuro.totaalEuro +€24.000
 *   - CRM verdelingPerJaar +€24.000 (proportioneel verdeeld over jaren > 2026)
 *   - scenario.totaalGeraamdEuro herberekend
 *
 * Stap 7 (sync-totalenperjaar-en-cap.ts) draaien na afloop voor totalenPerJaar
 * en cap-respect.
 */
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const BUFFER_BUMP = 24_000; // +€24K per scenario

type Cell = {
  jaar: number;
  euro: number;
  fase?: string;
  activiteit?: string;
};
type Insp = {
  inspanningTitel: string;
  domein?: string;
  totaalEuro?: number;
  verdelingPerJaar?: Cell[];
};
type Scen = {
  scenarioLabel?: string;
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  totalenPerJaar?: { jaar: number; euro: number; percentage?: number }[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};

function fmt(n: number): string {
  return n.toLocaleString("nl-NL");
}

/**
 * Verdeel +bump over cellen met jaar > 2026 proportioneel naar bestaande euro,
 * afgerond op €1.000. Het laatste cel-bedrag absorbeert het rest-verschil zodat
 * de som exact +bump is.
 */
function verdeelProportioneelExcl2026(
  cells: Cell[],
  bump: number,
): { allocated: { jaar: number; delta: number }[]; warning?: string } {
  const eligible = cells.filter((c) => c.jaar > 2026);
  if (eligible.length === 0) {
    return { allocated: [], warning: "geen cellen > 2026" };
  }
  const totaalEligible = eligible.reduce((s, c) => s + c.euro, 0);
  if (totaalEligible <= 0) {
    return { allocated: [], warning: "totaal eligible cellen = 0" };
  }
  const allocated: { jaar: number; delta: number }[] = [];
  let toegekend = 0;
  // Eerst proportioneel afgerond op €1000
  for (let i = 0; i < eligible.length; i++) {
    const c = eligible[i];
    if (i === eligible.length - 1) {
      // Laatste cel pakt het residu
      allocated.push({ jaar: c.jaar, delta: bump - toegekend });
    } else {
      const aandeel = (c.euro / totaalEligible) * bump;
      const rounded = Math.round(aandeel / 1000) * 1000;
      allocated.push({ jaar: c.jaar, delta: rounded });
      toegekend += rounded;
    }
  }
  return { allocated };
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error: loadErr } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (loadErr || !data) {
    console.error("Sessie niet gevonden", loadErr?.message);
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as {
    startJaar?: number;
    scenarios?: Record<string, Scen | null>;
    vergelijking?: string;
  };

  console.log("═".repeat(80));
  console.log("STAP 1+2 — CRM +€24K per scenario, recompute totaalGeraamdEuro");
  console.log("═".repeat(80));

  const oldNewTotals: Record<string, { old: number; new: number }> = {};

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const crm = sc.inspanningen.find((i) =>
      i.inspanningTitel.includes("CRM"),
    );
    if (!crm) {
      console.log(`\n${sk}: geen CRM-inspanning — overslaan`);
      continue;
    }
    const oudCrmTot = crm.totaalEuro ?? 0;
    const oudScenTot = sc.totaalGeraamdEuro ?? 0;

    console.log(`\n▌ ${sk.toUpperCase()}`);
    console.log(`  CRM oud totaal: € ${fmt(oudCrmTot)} → € ${fmt(oudCrmTot + BUFFER_BUMP)}`);

    const cells = crm.verdelingPerJaar ?? [];
    const { allocated, warning } = verdeelProportioneelExcl2026(
      cells,
      BUFFER_BUMP,
    );
    if (warning) {
      console.error(`  ✗ Verdeling-fout: ${warning}`);
      process.exit(1);
    }
    // Apply allocations
    for (const { jaar, delta } of allocated) {
      const cell = cells.find((c) => c.jaar === jaar);
      if (!cell) {
        console.error(`  ✗ Cel ${jaar} niet gevonden`);
        process.exit(1);
      }
      const oud = cell.euro;
      cell.euro = oud + delta;
      console.log(
        `  ${jaar}: € ${fmt(oud)} → € ${fmt(cell.euro)} (Δ +€${fmt(delta)})`,
      );
    }
    // Verifieer som
    const nieuweSom = cells.reduce((acc, c) => acc + c.euro, 0);
    const verwacht = oudCrmTot + BUFFER_BUMP;
    if (Math.abs(nieuweSom - verwacht) > 1) {
      console.error(
        `  ✗ Som verdeling € ${fmt(nieuweSom)} ≠ verwacht € ${fmt(verwacht)}`,
      );
      process.exit(1);
    }
    crm.totaalEuro = nieuweSom;

    // Recompute scenario totaalGeraamdEuro
    const nieuwScenTot = sc.inspanningen.reduce(
      (s, i) => s + (i.totaalEuro ?? 0),
      0,
    );
    sc.totaalGeraamdEuro = nieuwScenTot;
    console.log(`  scenario totaal: € ${fmt(oudScenTot)} → € ${fmt(nieuwScenTot)}`);
    oldNewTotals[sk] = { old: oudScenTot, new: nieuwScenTot };

    // Verifieer 2026 onveranderd
    const cell2026 = cells.find((c) => c.jaar === 2026);
    if (cell2026) {
      console.log(`  2026 (CRM-cel) onveranderd: € ${fmt(cell2026.euro)}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log("STAP 4 — surgical replace scenario-totalen in samenvatting + prioriteitAdvies");
  console.log("═".repeat(80));

  const totalReplacements: { scenario: string; from: string; to: string }[] = [
    // ADVIES
    { scenario: "advies", from: "€ 1.159.000", to: "€ 1.183.000" },
    // PLUS20
    { scenario: "plus20", from: "€ 1.270.000", to: "€ 1.294.000" },
    // OPTIMAAL
    { scenario: "optimaal", from: "€ 1.490.000", to: "€ 1.514.000" },
    // MIN20
    { scenario: "min20", from: "€ 1.819.500", to: "€ 1.843.500" },
    { scenario: "min20", from: "€ 1.819K", to: "€ 1.844K" },
  ];

  const replaceLog: { scenario: string; veld: string; from: string; count: number }[] = [];

  for (const { scenario, from, to } of totalReplacements) {
    const sc = adv.scenarios?.[scenario];
    if (!sc) continue;
    if (sc.samenvatting && sc.samenvatting.includes(from)) {
      const before = sc.samenvatting;
      const count = before.split(from).length - 1;
      sc.samenvatting = before.split(from).join(to);
      replaceLog.push({ scenario, veld: "samenvatting", from, count });
    }
    if (sc.prioriteitAdvies && sc.prioriteitAdvies.includes(from)) {
      const before = sc.prioriteitAdvies;
      const count = before.split(from).length - 1;
      sc.prioriteitAdvies = before.split(from).join(to);
      replaceLog.push({ scenario, veld: "prioriteitAdvies", from, count });
    }
  }
  for (const r of replaceLog) {
    console.log(
      `  ${r.scenario} ${r.veld}: "${r.from}" → vervangen ${r.count}×`,
    );
  }
  if (replaceLog.length === 0) {
    console.log("  (geen vervangingen — bedragen niet aangetroffen)");
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log("STAP 5 — vergelijking-tekst totalen updaten");
  console.log("═".repeat(80));

  const verUpdates: { from: string; to: string }[] = [
    { from: "€ 1.490.000", to: "€ 1.514.000" }, // optimaal
    { from: "€ 1.270.000", to: "€ 1.294.000" }, // plus20
    { from: "€ 1.819.500", to: "€ 1.843.500" }, // min20
    { from: "€ 1.159.000", to: "€ 1.183.000" }, // advies
  ];
  if (typeof adv.vergelijking === "string") {
    let v = adv.vergelijking;
    for (const { from, to } of verUpdates) {
      if (v.includes(from)) {
        const count = v.split(from).length - 1;
        v = v.split(from).join(to);
        console.log(`  vergelijking: "${from}" → "${to}" (${count}×)`);
      }
    }
    adv.vergelijking = v;
  }

  // ────────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log("STAP 6 — CRM dossier kostenraming range update");
  console.log("═".repeat(80));

  const subAn = stap4.subEffortAnalysis as
    | Array<{
        titel?: string;
        voorgesteldeNaam?: string;
        dossier?: { kostenraming?: string };
      }>
    | undefined;
  let dossierUpdates = 0;
  if (Array.isArray(subAn)) {
    for (const item of subAn) {
      const kr = item.dossier?.kostenraming;
      if (typeof kr !== "string") continue;
      // Match alleen het CRM-dossier — het bevat "CRM-klantdashboard" of "integraal CRM"
      const isCrm = kr.includes("CRM-klantdashboard") || kr.includes("integraal CRM");
      if (!isCrm) continue;
      // De exacte string is "€440K–€640K eenmalig"
      const oldRange = "€440K–€640K";
      const newRange = "€455K–€680K";
      if (kr.includes(oldRange)) {
        const updated = kr.split(oldRange).join(newRange);
        item.dossier!.kostenraming = updated;
        dossierUpdates++;
        const t = item.titel ?? item.voorgesteldeNaam ?? "(?)";
        console.log(`  ✓ Dossier "${t}": "${oldRange}" → "${newRange}"`);
      }
    }
  }
  if (dossierUpdates === 0) {
    console.log("  (geen CRM-dossier match voor €440K–€640K)");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Schrijven
  console.log("\n" + "═".repeat(80));
  console.log("WRITE → Supabase");
  console.log("═".repeat(80));

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: adv, subEffortAnalysis: subAn },
      },
    },
  };
  const { error: wErr } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (wErr) {
    console.error("FOUT bij schrijven:", wErr.message);
    process.exit(1);
  }
  console.log("✓ Supabase update geslaagd");

  // ────────────────────────────────────────────────────────────────────────
  // Verifieer met re-load
  console.log("\n" + "═".repeat(80));
  console.log("VERIFICATIE — re-load Supabase");
  console.log("═".repeat(80));
  const { data: verifyData } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (verifyData) {
    const v = verifyData.data as Record<string, unknown>;
    const vAdv = (
      ((v.crossAnalyseWizard as Record<string, unknown>).stepResults as Record<
        string,
        unknown
      >).stap4 as Record<string, unknown>
    ).begrotingAdvies as { scenarios?: Record<string, Scen | null> };
    for (const [sk, sc] of Object.entries(vAdv.scenarios ?? {})) {
      if (!sc) continue;
      const crm = sc.inspanningen?.find((i) =>
        i.inspanningTitel.includes("CRM"),
      );
      const cell2026 = crm?.verdelingPerJaar?.find((c) => c.jaar === 2026);
      const onveranderd = oldNewTotals[sk];
      console.log(
        `  ${sk}: scen totaal € ${fmt(sc.totaalGeraamdEuro ?? 0)}` +
          (onveranderd
            ? ` (was € ${fmt(onveranderd.old)}, +€${fmt(
                (sc.totaalGeraamdEuro ?? 0) - onveranderd.old,
              )})`
            : "") +
          (cell2026 ? ` | 2026-CRM-cel € ${fmt(cell2026.euro)}` : ""),
      );
    }
  }

  console.log("\n→ Volgende stap: npx tsx scripts/sync-totalenperjaar-en-cap.ts");
}

void main();
