// Optie B — script-side post-process voor §4.2 Interne uren.
//
// Cito-medewerkers werken pas vanaf juni 2026 aan dit programma. Een
// halfjaar = ~55% van de oorspronkelijke jaar-1 uren-belasting realistisch.
// Het resterende ~45% verschuift naar jaar 2.
//
// Dit script:
//   1. Leest het huidige interne-uren-advies uit de sessie
//   2. Voor elk scenario × elk domein × jaar 1 (startJaar):
//      - Verlaag rol-uren naar FACTOR × oude waarde
//      - Voeg het verschil (1-FACTOR × oude waarde) toe aan dezelfde rol in
//        jaar 2 (of creëer rol in jaar 2 als die er nog niet was)
//   3. Hertel alle aggregaties: jr.totaalUren/Kosten, d.totaalUren/Kosten,
//      scen.totalenPerJaar, scen.totaalUren/Kosten
//   4. Schrijft optioneel terug naar Supabase (apply-mode) of toont alleen
//      de impact (dry-run-mode)
//
// Default factor: 0.55 (juni-dec 2026 ~ 55% van jaarcapaciteit). CLI:
//   tsx scripts/halfjaar-2026-uren-fix.ts <sessionId> [--factor=0.55] [--apply]

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

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: tsx scripts/halfjaar-2026-uren-fix.ts <sessionId> [--factor=0.55] [--apply]");
  process.exit(1);
}
const factorArg = process.argv.find((a) => a.startsWith("--factor="));
const FACTOR = factorArg ? parseFloat(factorArg.split("=")[1]) : 0.55;
const APPLY = process.argv.includes("--apply");

if (FACTOR <= 0 || FACTOR >= 1) {
  console.error(`Ongeldige factor ${FACTOR}. Moet tussen 0 en 1 liggen.`);
  process.exit(1);
}

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
};
type Jaar = { jaar: number; activiteit?: string; rollen: Rol[]; totaalUren?: number; totaalKosten?: number };
type Domein = {
  domein: string;
  koppeling?: string[];
  jaren: Jaar[];
  totaalUren?: number;
  totaalKosten?: number;
  motivatie?: string;
};
type Scen = {
  scenarioLabel: string;
  aantalJaren?: number;
  startJaar?: number;
  uurtariefGebruikt?: number;
  domeinen?: Domein[];
  totalenPerJaar?: { jaar: number; uren: number; kosten: number; urenBudget?: number; urenGap?: number }[];
  totaalUren?: number;
  totaalKosten?: number;
  samenvatting?: string;
};

function shiftScenario(scen: Scen): Scen {
  if (!scen.domeinen || !scen.startJaar) return scen;
  const startJ = scen.startJaar;
  const jaar2 = startJ + 1;

  const newDomeinen = scen.domeinen.map((d) => {
    if (!d.jaren) return d;
    // Vind jaar 1 en jaar 2 blokken
    const jr1Idx = d.jaren.findIndex((j) => j.jaar === startJ);
    const jr2Idx = d.jaren.findIndex((j) => j.jaar === jaar2);
    if (jr1Idx === -1) return d;

    const jr1 = d.jaren[jr1Idx];
    let jr2 = jr2Idx >= 0 ? d.jaren[jr2Idx] : null;
    // Als jaar 2 niet bestaat (bv. 1-jarig scenario), dan kan er geen
    // verschuiving gebeuren — laat het scenario ongewijzigd.
    if (!jr2) return d;

    // Per rol: bereken nieuwe jaar-1 uren en delta
    const newJr1Rollen: Rol[] = jr1.rollen.map((r) => ({
      ...r,
      uren: Math.round(r.uren * FACTOR),
      kosten: Math.round(r.uren * FACTOR) * r.uurtarief,
    }));
    // Per rol: shift delta naar jaar 2
    const newJr2Rollen: Rol[] = [...jr2.rollen.map((r) => ({ ...r }))];
    for (const r of jr1.rollen) {
      const newUren = Math.round(r.uren * FACTOR);
      const delta = r.uren - newUren;
      if (delta <= 0) continue;
      // Vind matching rol in jaar 2 (op functieId)
      const matchIdx = newJr2Rollen.findIndex((x) => x.functieId === r.functieId);
      if (matchIdx >= 0) {
        const m = newJr2Rollen[matchIdx];
        // Pak het uurtarief van jaar 2 (kan iets hoger zijn door indexatie)
        m.uren = m.uren + delta;
        m.kosten = m.uren * m.uurtarief;
      } else {
        // Rol nog niet aanwezig in jaar 2 — voeg toe (gebruik jaar-1 tarief
        // als geen jaar-2 tarief beschikbaar is voor die functie)
        newJr2Rollen.push({
          ...r,
          uren: delta,
          kosten: delta * r.uurtarief,
        });
      }
    }

    // Hertel jaar-totalen
    const newJr1: Jaar = {
      ...jr1,
      rollen: newJr1Rollen,
      totaalUren: newJr1Rollen.reduce((s, x) => s + x.uren, 0),
      totaalKosten: newJr1Rollen.reduce((s, x) => s + x.kosten, 0),
    };
    const newJr2: Jaar = {
      ...jr2,
      rollen: newJr2Rollen,
      totaalUren: newJr2Rollen.reduce((s, x) => s + x.uren, 0),
      totaalKosten: newJr2Rollen.reduce((s, x) => s + x.kosten, 0),
    };

    const newJaren = d.jaren.map((j, idx) => {
      if (idx === jr1Idx) return newJr1;
      if (idx === jr2Idx) return newJr2;
      return j;
    });

    return {
      ...d,
      jaren: newJaren,
      totaalUren: newJaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0),
      totaalKosten: newJaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0),
    };
  });

  // Hertel scenario-totalen + totalenPerJaar
  const newTotalenPerJaar = (scen.totalenPerJaar ?? []).map((t) => {
    let uren = 0;
    let kosten = 0;
    for (const d of newDomeinen) {
      const j = d.jaren.find((x) => x.jaar === t.jaar);
      uren += j?.totaalUren ?? 0;
      kosten += j?.totaalKosten ?? 0;
    }
    return { ...t, uren, kosten, urenGap: t.urenBudget !== undefined ? uren - t.urenBudget : t.urenGap };
  });
  const newTotaalUren = newDomeinen.reduce((s, d) => s + (d.totaalUren ?? 0), 0);
  const newTotaalKosten = newDomeinen.reduce((s, d) => s + (d.totaalKosten ?? 0), 0);

  return {
    ...scen,
    domeinen: newDomeinen,
    totalenPerJaar: newTotalenPerJaar,
    totaalUren: newTotaalUren,
    totaalKosten: newTotaalKosten,
  };
}

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) {
    console.error(error?.message ?? "not found");
    process.exit(1);
  }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const advies = stap4?.stap7InterneUren as
    | { scenarios?: Record<string, Scen | null>; uurtariefSettings?: unknown }
    | undefined;
  if (!advies?.scenarios) {
    console.error("Geen interne-uren-advies in deze sessie.");
    process.exit(1);
  }

  console.log("═".repeat(80));
  console.log(`HALFJAAR-2026 CORRECTIE — factor ${FACTOR} (${Math.round(FACTOR * 100)}% van jaar-1 uren blijft staan)`);
  console.log("═".repeat(80));
  console.log(`Sessie: ${sessionId}`);
  console.log(`Mode: ${APPLY ? "APPLY (schrijven naar Supabase)" : "DRY RUN (alleen tonen)"}`);
  console.log();

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  const newScenarios: Record<string, Scen | null> = { ...advies.scenarios };

  for (const skey of scenarioKeys) {
    const oud = advies.scenarios[skey];
    if (!oud) continue;
    const nieuw = shiftScenario(oud);
    newScenarios[skey] = nieuw;

    console.log(`▌ ${skey.toUpperCase()}  (${oud.aantalJaren} jaar)`);
    console.log("─".repeat(80));

    // Toon per domein de jaar-1 / jaar-2 verschuiving
    for (const dOud of oud.domeinen ?? []) {
      const dNw = nieuw.domeinen?.find((x) => x.domein === dOud.domein);
      if (!dNw) continue;
      const startJ = oud.startJaar ?? 2026;
      const jr1Oud = dOud.jaren.find((j) => j.jaar === startJ);
      const jr1Nw = dNw.jaren.find((j) => j.jaar === startJ);
      const jr2Oud = dOud.jaren.find((j) => j.jaar === startJ + 1);
      const jr2Nw = dNw.jaren.find((j) => j.jaar === startJ + 1);
      if (!jr1Oud || !jr1Nw) continue;
      console.log(`  [${dOud.domein}]`);
      console.log(`    Jaar ${startJ}: ${(jr1Oud.totaalUren ?? 0).toLocaleString("nl-NL")} u → ${(jr1Nw.totaalUren ?? 0).toLocaleString("nl-NL")} u (Δ -${((jr1Oud.totaalUren ?? 0) - (jr1Nw.totaalUren ?? 0)).toLocaleString("nl-NL")} u)`);
      if (jr2Oud && jr2Nw) {
        console.log(`    Jaar ${startJ + 1}: ${(jr2Oud.totaalUren ?? 0).toLocaleString("nl-NL")} u → ${(jr2Nw.totaalUren ?? 0).toLocaleString("nl-NL")} u (Δ +${((jr2Nw.totaalUren ?? 0) - (jr2Oud.totaalUren ?? 0)).toLocaleString("nl-NL")} u)`);
      }
    }

    console.log();
    console.log(`  Scenario-totaal:`);
    console.log(`    Uren: ${(oud.totaalUren ?? 0).toLocaleString("nl-NL")} u → ${(nieuw.totaalUren ?? 0).toLocaleString("nl-NL")} u`);
    console.log(`    Kosten: € ${(oud.totaalKosten ?? 0).toLocaleString("nl-NL")} → € ${(nieuw.totaalKosten ?? 0).toLocaleString("nl-NL")}`);
    console.log();
    console.log(`  Totalen per jaar (na shift):`);
    for (const t of nieuw.totalenPerJaar ?? []) {
      console.log(`    ${t.jaar}: ${t.uren.toLocaleString("nl-NL")} u, € ${t.kosten.toLocaleString("nl-NL")}${t.urenBudget !== undefined ? ` (budget ${t.urenBudget.toLocaleString("nl-NL")} u, gap ${(t.urenGap ?? 0).toLocaleString("nl-NL")})` : ""}`);
    }
    console.log();
  }

  if (APPLY) {
    console.log("─".repeat(80));
    console.log("SCHRIJVEN NAAR SUPABASE…");
    const newAdvies = { ...advies, scenarios: newScenarios };
    const newData = {
      ...s,
      crossAnalyseWizard: {
        ...(s.crossAnalyseWizard as object),
        stepResults: {
          ...(wiz?.stepResults ?? {}),
          stap4: {
            ...(stap4 ?? {}),
            stap7InterneUren: newAdvies,
          },
        },
      },
    };
    const { error: upErr } = await supa.from("din_sessions").update({ data: newData }).eq("id", sessionId);
    if (upErr) {
      console.error("FOUT:", upErr.message);
      process.exit(1);
    }
    console.log("✓ Halfjaar-2026 correctie opgeslagen in interne-uren-advies.");
  } else {
    console.log("─".repeat(80));
    console.log("DRY RUN AFGEROND — er is NIETS naar Supabase geschreven.");
    console.log("Run met --apply om de correctie definitief te maken.");
  }
  console.log("═".repeat(80));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
