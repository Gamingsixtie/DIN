/**
 * fix-2026-j1-cap.ts
 *
 * Probleem: in DIN-sessie d8b97442 zit het 2026 J1 (halfjaar) totaal in alle
 * 4 scenarios boven de cap. Cap = 290u (advies/plus20) of 250u (optimaal/min20).
 *
 * Fix: schaal alle 2026-rollen (behalve trainings_deelnemer; die staan al op
 * 0u in J1) met factor cap/J1_huidig, zodat 2026-totaal = cap. Het verschil
 * per rol verschuift naar 2027 (zelfde functieId; nieuwe rol toevoegen
 * indien nog niet aanwezig in 2027). Kosten worden herrekend met de
 * bestaande rol.uurtarief-velden (die zijn al jaar-specifiek geïndexeerd).
 *
 * Hercalc:
 *   - jaar.totaalUren / totaalKosten / programmaUren / lijnUren / raadplegenUren
 *   - domein.totaalUren / totaalKosten / programmaUren / lijnUren / raadplegenUren
 *   - scenario.totaalUren / totaalKosten / programmaUren / lijnUren / raadplegenUren
 *   - scenario.totalenPerJaar (uren, kosten, programmaUren, lijnUren,
 *     raadplegenUren, urenGap = uren - urenBudget)
 *
 * Idempotent: schrijft `j1Cap2026Fixed: true` als marker. Bij hersnstart
 * wordt geen scaling meer toegepast (script geeft melding en stopt).
 *
 * Usage:
 *   npx tsx scripts/fix-2026-j1-cap.ts             (dry run)
 *   npx tsx scripts/fix-2026-j1-cap.ts --apply     (live op Supabase)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ─── env loader ────────────────────────────────────────────────────────────
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

// ─── constanten ────────────────────────────────────────────────────────────
const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const J1_JAAR = 2026;
const J2_JAAR = 2027;
const APPLY = process.argv.includes("--apply");

// Caps per scenario (halfjaar 2026)
const CAPS: Record<string, number> = {
  advies: 290,
  plus20: 290,
  optimaal: 250,
  min20: 250,
};

// ─── types ─────────────────────────────────────────────────────────────────
type LezingCCat = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";
type Domein = "mens" | "processen" | "data_systemen" | "cultuur";

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
  categorie?: string;
};
type Jaar = {
  jaar: number;
  activiteit?: string;
  rollen: Rol[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
};
type DomeinBlok = {
  domein: Domein;
  koppeling?: string[];
  jaren: Jaar[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  motivatie?: string;
};
type TotaalPerJaar = {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
};
type Scen = {
  scenarioLabel: string;
  aantalJaren?: number;
  startJaar?: number;
  uurtariefGebruikt?: number;
  domeinen?: DomeinBlok[];
  totalenPerJaar?: TotaalPerJaar[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  samenvatting?: string;
};

// ─── lezing-C pcts (kopie van LEZING_C_PCTS in StapInterneUren.tsx) ────────
const PCTS: Record<LezingCCat, { programma: number; lijn: number; raadplegen: number }> = {
  leider: { programma: 0.9, lijn: 0.1, raadplegen: 0 },
  kernteam: { programma: 0.8, lijn: 0.2, raadplegen: 0 },
  trainings_deelnemer: { programma: 0.5, lijn: 0.5, raadplegen: 0 }, // mens-default
  geconsulteerd: { programma: 0, lijn: 0, raadplegen: 1.0 },
};
const PCTS_TRAININGS_PER_DOMEIN: Partial<Record<Domein, { programma: number; lijn: number; raadplegen: number }>> = {
  mens: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  data_systemen: { programma: 0.7, lijn: 0.3, raadplegen: 0 },
};

function pctsVoor(domein: Domein, categorie: LezingCCat): { programma: number; lijn: number; raadplegen: number } {
  if (categorie === "trainings_deelnemer") {
    const dom = PCTS_TRAININGS_PER_DOMEIN[domein];
    if (dom) return dom;
  }
  return PCTS[categorie];
}

function normaliseerCat(c: string | undefined): LezingCCat {
  const v = (c ?? "").toLowerCase().replace(/-/g, "_");
  if (v === "leider") return "leider";
  if (v === "geconsulteerd") return "geconsulteerd";
  if (v === "trainings_deelnemer" || v === "trainingsdeelnemer") return "trainings_deelnemer";
  // alle kernteam-varianten + onbekend → kernteam (matcht heuristiek-default)
  return "kernteam";
}

// ─── hercalc helpers ───────────────────────────────────────────────────────
function recomputeJaar(jr: Jaar, domein: Domein): Jaar {
  let totU = 0;
  let totK = 0;
  let progU = 0;
  let lijnU = 0;
  let raadU = 0;
  for (const r of jr.rollen) {
    totU += r.uren;
    totK += r.kosten;
    const cat = normaliseerCat(r.categorie);
    const p = pctsVoor(domein, cat);
    progU += r.uren * p.programma;
    lijnU += r.uren * p.lijn;
    raadU += r.uren * p.raadplegen;
  }
  return {
    ...jr,
    totaalUren: Math.round(totU),
    totaalKosten: Math.round(totK),
    programmaUren: Math.round(progU),
    lijnUren: Math.round(lijnU),
    raadplegenUren: Math.round(raadU),
  };
}

function recomputeDomein(d: DomeinBlok): DomeinBlok {
  let totU = 0;
  let totK = 0;
  let progU = 0;
  let lijnU = 0;
  let raadU = 0;
  for (const j of d.jaren) {
    totU += j.totaalUren ?? 0;
    totK += j.totaalKosten ?? 0;
    progU += j.programmaUren ?? 0;
    lijnU += j.lijnUren ?? 0;
    raadU += j.raadplegenUren ?? 0;
  }
  return {
    ...d,
    totaalUren: totU,
    totaalKosten: totK,
    programmaUren: progU,
    lijnUren: lijnU,
    raadplegenUren: raadU,
  };
}

function recomputeScenario(scen: Scen): Scen {
  if (!scen.domeinen) return scen;

  // Rebuild totalenPerJaar uit per-domein-jaar-aggregaten
  const perJaarMap = new Map<number, TotaalPerJaar>();
  // Behoud bestaande urenBudget per jaar
  for (const t of scen.totalenPerJaar ?? []) {
    perJaarMap.set(t.jaar, {
      jaar: t.jaar,
      uren: 0,
      kosten: 0,
      urenBudget: t.urenBudget,
      programmaUren: 0,
      lijnUren: 0,
      raadplegenUren: 0,
    });
  }
  for (const d of scen.domeinen) {
    for (const j of d.jaren) {
      let bucket = perJaarMap.get(j.jaar);
      if (!bucket) {
        bucket = { jaar: j.jaar, uren: 0, kosten: 0, programmaUren: 0, lijnUren: 0, raadplegenUren: 0 };
        perJaarMap.set(j.jaar, bucket);
      }
      bucket.uren += j.totaalUren ?? 0;
      bucket.kosten += j.totaalKosten ?? 0;
      bucket.programmaUren = (bucket.programmaUren ?? 0) + (j.programmaUren ?? 0);
      bucket.lijnUren = (bucket.lijnUren ?? 0) + (j.lijnUren ?? 0);
      bucket.raadplegenUren = (bucket.raadplegenUren ?? 0) + (j.raadplegenUren ?? 0);
    }
  }
  const newTotalenPerJaar = [...perJaarMap.values()]
    .sort((a, b) => a.jaar - b.jaar)
    .map((t) => ({
      ...t,
      urenGap: t.urenBudget !== undefined ? t.uren - t.urenBudget : undefined,
    }));

  // Scenario-totalen
  let totU = 0;
  let totK = 0;
  let progU = 0;
  let lijnU = 0;
  let raadU = 0;
  for (const d of scen.domeinen) {
    totU += d.totaalUren ?? 0;
    totK += d.totaalKosten ?? 0;
    progU += d.programmaUren ?? 0;
    lijnU += d.lijnUren ?? 0;
    raadU += d.raadplegenUren ?? 0;
  }
  return {
    ...scen,
    totalenPerJaar: newTotalenPerJaar,
    totaalUren: totU,
    totaalKosten: totK,
    programmaUren: progU,
    lijnUren: lijnU,
    raadplegenUren: raadU,
  };
}

// ─── core: J1-cap fix per scenario ─────────────────────────────────────────
type Snapshot = {
  scenarioKey: string;
  cap: number;
  voorJ1Uren: number;
  voorJ2Uren: number;
  voorJ1Kosten: number;
  voorJ2Kosten: number;
  factor: number;
  naJ1Uren: number;
  naJ2Uren: number;
  naJ1Kosten: number;
  naJ2Kosten: number;
  rolDeltas: Array<{
    domein: string;
    functieId: string;
    functieNaam: string;
    categorie: string;
    voorUren: number;
    naUren: number;
    delta: number;
    j2VoorUren: number;
    j2NaUren: number;
  }>;
};

function fixScenario(scen: Scen, key: string, cap: number): { scen: Scen; snap: Snapshot } {
  const startJ = scen.startJaar ?? J1_JAAR;
  if (startJ !== J1_JAAR) {
    // sessie heeft 2026 als J1 — geen ander startjaar verwacht
    throw new Error(`Onverwacht startJaar=${startJ} voor scenario ${key} (verwacht ${J1_JAAR}).`);
  }

  // Bereken huidig J1 totaal
  let j1Huidig = 0;
  let j1KostenVoor = 0;
  let j2KostenVoor = 0;
  let j2UrenVoor = 0;
  for (const d of scen.domeinen ?? []) {
    const jr1 = d.jaren.find((j) => j.jaar === J1_JAAR);
    const jr2 = d.jaren.find((j) => j.jaar === J2_JAAR);
    if (jr1) {
      j1Huidig += jr1.totaalUren ?? jr1.rollen.reduce((s, r) => s + r.uren, 0);
      j1KostenVoor += jr1.totaalKosten ?? jr1.rollen.reduce((s, r) => s + r.kosten, 0);
    }
    if (jr2) {
      j2UrenVoor += jr2.totaalUren ?? jr2.rollen.reduce((s, r) => s + r.uren, 0);
      j2KostenVoor += jr2.totaalKosten ?? jr2.rollen.reduce((s, r) => s + r.kosten, 0);
    }
  }

  const overschot = Math.max(0, j1Huidig - cap);
  const factor = j1Huidig > 0 ? cap / j1Huidig : 1;

  const rolDeltas: Snapshot["rolDeltas"] = [];

  if (overschot <= 0) {
    return {
      scen,
      snap: {
        scenarioKey: key,
        cap,
        voorJ1Uren: j1Huidig,
        voorJ2Uren: j2UrenVoor,
        voorJ1Kosten: j1KostenVoor,
        voorJ2Kosten: j2KostenVoor,
        factor: 1,
        naJ1Uren: j1Huidig,
        naJ2Uren: j2UrenVoor,
        naJ1Kosten: j1KostenVoor,
        naJ2Kosten: j2KostenVoor,
        rolDeltas: [],
      },
    };
  }

  // Per domein: scale 2026-rollen (behalve trainings_deelnemer; die zijn al 0)
  // Verschil per rol → naar 2027 (matching functieId, anders nieuwe rol).
  const newDomeinen: DomeinBlok[] = (scen.domeinen ?? []).map((d) => {
    const jr1Idx = d.jaren.findIndex((j) => j.jaar === J1_JAAR);
    const jr2Idx = d.jaren.findIndex((j) => j.jaar === J2_JAAR);
    if (jr1Idx === -1) return d;

    const jr1 = d.jaren[jr1Idx];
    const jr2 = jr2Idx >= 0 ? d.jaren[jr2Idx] : null;

    // Build new J1 rollen
    const newJ1Rollen: Rol[] = jr1.rollen.map((r) => {
      const cat = normaliseerCat(r.categorie);
      // Trainings-deelnemers niet aanraken (al 0 in J1, en spec verbiedt het)
      if (cat === "trainings_deelnemer") return { ...r };
      const oudUren = r.uren;
      const nieuwUren = Math.round(oudUren * factor);
      const nieuwKosten = nieuwUren * r.uurtarief;
      const delta = oudUren - nieuwUren;
      const j2Match = jr2?.rollen.find((x) => x.functieId === r.functieId);
      rolDeltas.push({
        domein: d.domein,
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        categorie: r.categorie ?? "(onbekend)",
        voorUren: oudUren,
        naUren: nieuwUren,
        delta,
        j2VoorUren: j2Match?.uren ?? 0,
        j2NaUren: (j2Match?.uren ?? 0) + delta,
      });
      return { ...r, uren: nieuwUren, kosten: nieuwKosten };
    });

    // Build new J2 rollen — verschuif delta naar zelfde functieId in 2027
    let newJ2Rollen: Rol[] = jr2 ? jr2.rollen.map((r) => ({ ...r })) : [];
    for (const oudR of jr1.rollen) {
      const cat = normaliseerCat(oudR.categorie);
      if (cat === "trainings_deelnemer") continue;
      const nieuwUren = Math.round(oudR.uren * factor);
      const delta = oudR.uren - nieuwUren;
      if (delta <= 0) continue;
      const matchIdx = newJ2Rollen.findIndex((x) => x.functieId === oudR.functieId);
      if (matchIdx >= 0) {
        const m = newJ2Rollen[matchIdx];
        m.uren = m.uren + delta;
        m.kosten = m.uren * m.uurtarief;
      } else {
        // Voeg toe — gebruik J1-tarief als fallback (zelfde uurtarief als
        // 2026 want we hebben geen ander 2027-tarief voor deze functie)
        newJ2Rollen.push({
          functieId: oudR.functieId,
          functieNaam: oudR.functieNaam,
          afdeling: oudR.afdeling,
          uren: delta,
          uurtarief: oudR.uurtarief,
          kosten: delta * oudR.uurtarief,
          categorie: oudR.categorie,
        });
      }
    }

    // Hercalc J1 + J2
    const newJr1 = recomputeJaar({ ...jr1, rollen: newJ1Rollen }, d.domein);
    let newJaren = d.jaren.map((j, i) => (i === jr1Idx ? newJr1 : j));
    if (jr2) {
      const newJr2 = recomputeJaar({ ...jr2, rollen: newJ2Rollen }, d.domein);
      newJaren = newJaren.map((j) => (j.jaar === J2_JAAR ? newJr2 : j));
    } else if (newJ2Rollen.length > 0) {
      // 2027 bestond niet — voeg toe
      const newJr2 = recomputeJaar({ jaar: J2_JAAR, rollen: newJ2Rollen }, d.domein);
      newJaren = [...newJaren, newJr2].sort((a, b) => a.jaar - b.jaar);
    }

    return recomputeDomein({ ...d, jaren: newJaren });
  });

  const newScen = recomputeScenario({ ...scen, domeinen: newDomeinen });

  // Snapshot
  let j1Na = 0;
  let j1KostenNa = 0;
  let j2UrenNa = 0;
  let j2KostenNa = 0;
  for (const d of newScen.domeinen ?? []) {
    const jr1 = d.jaren.find((j) => j.jaar === J1_JAAR);
    const jr2 = d.jaren.find((j) => j.jaar === J2_JAAR);
    if (jr1) {
      j1Na += jr1.totaalUren ?? 0;
      j1KostenNa += jr1.totaalKosten ?? 0;
    }
    if (jr2) {
      j2UrenNa += jr2.totaalUren ?? 0;
      j2KostenNa += jr2.totaalKosten ?? 0;
    }
  }

  return {
    scen: newScen,
    snap: {
      scenarioKey: key,
      cap,
      voorJ1Uren: j1Huidig,
      voorJ2Uren: j2UrenVoor,
      voorJ1Kosten: j1KostenVoor,
      voorJ2Kosten: j2KostenVoor,
      factor,
      naJ1Uren: j1Na,
      naJ2Uren: j2UrenNa,
      naJ1Kosten: j1KostenNa,
      naJ2Kosten: j2KostenNa,
      rolDeltas,
    },
  };
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(80));
  console.log("FIX 2026 J1-CAP — DIN-sessie d8b97442");
  console.log(`Mode: ${APPLY ? "APPLY (schrijven naar Supabase)" : "DRY RUN (alleen tonen)"}`);
  console.log("═".repeat(80));

  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error || !data) {
    console.error("Sessie niet gevonden:", error?.message);
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const adv = stap4?.stap7InterneUren as
    | { scenarios?: Record<string, Scen | null>; j1Cap2026Fixed?: boolean }
    | undefined;
  if (!adv?.scenarios) {
    console.error("Geen interne-uren-advies in deze sessie.");
    process.exit(1);
  }

  // Idempotency-check
  if (adv.j1Cap2026Fixed === true) {
    console.log();
    console.log("✓ Marker `j1Cap2026Fixed=true` aanwezig — fix is al toegepast.");
    console.log("  Geen wijziging nodig. Verifiëren: alle J1-totalen ≤ cap.");
    console.log();
    let allesOk = true;
    for (const sk of Object.keys(CAPS)) {
      const sc = adv.scenarios[sk];
      if (!sc) continue;
      const t1 = (sc.totalenPerJaar ?? []).find((t) => t.jaar === J1_JAAR);
      const cap = CAPS[sk];
      const ok = (t1?.uren ?? 0) <= cap;
      if (!ok) allesOk = false;
      console.log(`  ${sk}: J1=${t1?.uren}u, cap=${cap}u → ${ok ? "OK" : "FAIL"}`);
    }
    process.exit(allesOk ? 0 : 1);
  }

  const snaps: Snapshot[] = [];
  const newScenarios: Record<string, Scen | null> = { ...adv.scenarios };

  for (const sk of Object.keys(CAPS)) {
    const sc = adv.scenarios[sk];
    if (!sc) {
      console.log(`\n▌ ${sk.toUpperCase()} — geen scenario in sessie, skip.`);
      continue;
    }
    const cap = CAPS[sk];
    console.log();
    console.log(`▌ ${sk.toUpperCase()}  (cap ${cap}u)`);
    console.log("─".repeat(80));

    const { scen: newScen, snap } = fixScenario(sc, sk, cap);
    newScenarios[sk] = newScen;
    snaps.push(snap);

    console.log(
      `  J1 (2026): ${snap.voorJ1Uren}u → ${snap.naJ1Uren}u  (cap ${cap}u, factor ${snap.factor.toFixed(4)})`,
    );
    console.log(
      `  J2 (2027): ${snap.voorJ2Uren}u → ${snap.naJ2Uren}u  (Δ +${snap.naJ2Uren - snap.voorJ2Uren}u)`,
    );
    console.log(
      `  J1-kosten: € ${snap.voorJ1Kosten.toLocaleString("nl-NL")} → € ${snap.naJ1Kosten.toLocaleString("nl-NL")}`,
    );
    console.log(
      `  J2-kosten: € ${snap.voorJ2Kosten.toLocaleString("nl-NL")} → € ${snap.naJ2Kosten.toLocaleString("nl-NL")}  (Δ € ${(snap.naJ2Kosten - snap.voorJ2Kosten).toLocaleString("nl-NL")})`,
    );

    // Verificatie cap
    const okCap = snap.naJ1Uren <= cap;
    console.log(`  Cap-check: ${okCap ? "✓ binnen cap" : "✗ NOG OVER CAP!"}`);
  }

  // Schrijf marker + nieuwe scenarios
  const newAdv = {
    ...adv,
    scenarios: newScenarios,
    j1Cap2026Fixed: true,
  };

  if (APPLY) {
    console.log();
    console.log("─".repeat(80));
    console.log("SCHRIJVEN NAAR SUPABASE…");

    const newData = {
      ...sess,
      crossAnalyseWizard: {
        ...((sess.crossAnalyseWizard as object) ?? {}),
        stepResults: {
          ...(wiz?.stepResults ?? {}),
          stap4: {
            ...(stap4 ?? {}),
            stap7InterneUren: newAdv,
          },
        },
      },
    };
    const { error: upErr } = await supa
      .from("din_sessions")
      .update({ data: newData })
      .eq("id", SESSION_ID);
    if (upErr) {
      console.error("FOUT bij schrijven:", upErr.message);
      process.exit(1);
    }
    console.log("✓ J1-cap-fix opgeslagen + marker `j1Cap2026Fixed=true` gezet.");

    // Re-load verificatie
    console.log();
    console.log("— Re-load verificatie —");
    const { data: ver } = await supa
      .from("din_sessions")
      .select("data")
      .eq("id", SESSION_ID)
      .maybeSingle();
    if (ver) {
      const v = ver.data as any;
      const vAdv = v?.crossAnalyseWizard?.stepResults?.stap4?.stap7InterneUren;
      console.log("  Marker j1Cap2026Fixed:", vAdv?.j1Cap2026Fixed);
      let allesOk = true;
      for (const sk of Object.keys(CAPS)) {
        const sc = vAdv?.scenarios?.[sk] as Scen | null;
        if (!sc) continue;
        const t1 = (sc.totalenPerJaar ?? []).find((t) => t.jaar === J1_JAAR);
        const cap = CAPS[sk];
        const ok = (t1?.uren ?? 0) <= cap;
        if (!ok) allesOk = false;
        console.log(`  ${sk}: J1=${t1?.uren}u, cap=${cap}u → ${ok ? "OK" : "FAIL"}`);
      }
      if (!allesOk) {
        console.error("  ⚠ Niet alle J1-totalen binnen cap.");
        process.exit(1);
      }
    }
  } else {
    console.log();
    console.log("─".repeat(80));
    console.log("DRY RUN — er is NIETS naar Supabase geschreven.");
    console.log("Run met --apply om de fix toe te passen.");
  }

  // Schrijf ook detail-rapport per rol naar stdout (handig voor audit)
  console.log();
  console.log("═".repeat(80));
  console.log("DETAIL — rol-deltas per scenario × domein");
  console.log("═".repeat(80));
  for (const snap of snaps) {
    if (snap.rolDeltas.length === 0) continue;
    console.log();
    console.log(`  ${snap.scenarioKey.toUpperCase()}  (cap ${snap.cap}u, factor ${snap.factor.toFixed(4)})`);
    console.log(
      "    " +
        ["domein", "functieId", "cat", "voorU", "naU", "Δ", "j2voor→j2na"]
          .map((s) => s.padEnd(14))
          .join(""),
    );
    for (const r of snap.rolDeltas) {
      console.log(
        "    " +
          [
            r.domein,
            r.functieId.length > 24 ? r.functieId.slice(0, 22) + ".." : r.functieId,
            r.categorie,
            String(r.voorUren),
            String(r.naUren),
            String(-r.delta),
            `${r.j2VoorUren}→${r.j2NaUren}`,
          ]
            .map((s) => s.padEnd(14))
            .join(""),
      );
    }
  }

  console.log();
  console.log("═".repeat(80));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
