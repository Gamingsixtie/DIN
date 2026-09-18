/**
 * finetune-cat1-verdeling.ts
 *
 * Fase-aware herverdeling van cat-1 rollen (Manager Klantcontact +
 * Accountmanager C (Professionals)) over de jaren in het data_systemen-domein
 * van stap7InterneUren.
 *
 * Probleem: een eerdere stille-selecties-pass heeft cat-1 uren in vaste
 * percentages (20/40/40) verdeeld. Daardoor:
 *   1. J1 (2026 = half-jaar) zit boven de cap in alle scenario's.
 *   2. Optimaal CRM-piek valt op 2027 i.p.v. 2029 (waar OOP-Acceptatie★ ligt).
 *
 * Oplossing: cat-1 uren volgen dezelfde fase-zwaarte als CRM zelf, met
 * J1 bewust laag (5%) omdat 2026 een half-jaar is en cat-1 in 2026 alleen
 * kick-off-betrokkenheid heeft.
 *
 * Idempotent: marker `cat1FineTuned` op stap7InterneUren wordt gezet.
 *
 * Sessie: d8b97442-ce8f-4134-b2c7-67dc8e3a3f93
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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

// Cat-1 rollen die we herverdelen.
const CAT1_ROLES = ["Manager Klantcontact", "Accountmanager C (Professionals)"];

// Fase-aware percentages per scenario. Index = jaar-positie in scenario.
// J1 (2026) is altijd 5% omdat het een half-jaar is en cat-1 alleen kick-off-betrokkenheid heeft.
const PERC: Record<string, number[]> = {
  // 4j: Analyse / Realisatie / Acceptatie★ / Beheer
  advies: [0.05, 0.25, 0.45, 0.25],
  // 5j: Analyse / Realisatie / Acceptatie★ / Beheer / Optim
  plus20: [0.05, 0.25, 0.4, 0.2, 0.1],
  // 7j: Analyse / Lev.sel / Realisatie / Acceptatie★ / Go-live / Beheer / Optim
  optimaal: [0.05, 0.1, 0.18, 0.3, 0.17, 0.12, 0.08],
  // 10j: Analyse / Lev.sel / Realisatie / Realisatie / Acceptatie★ / Uitrol / Beheer / Optim / Doorontw / Continu
  min20: [0.05, 0.08, 0.12, 0.14, 0.22, 0.14, 0.1, 0.06, 0.05, 0.04],
};

// J1-cap per scenario (uren).
const J1_CAP: Record<string, number> = {
  advies: 290,
  plus20: 290,
  optimaal: 250,
  min20: 250,
};

// OOP-Acceptatie★ jaar per scenario voor CRM-piek-verificatie.
const ACC_YEAR: Record<string, number> = {
  advies: 2028,
  plus20: 2028,
  optimaal: 2029,
  min20: 2030,
};

type Rol = {
  uren: number;
  kosten: number;
  afdeling?: string;
  functieId?: string;
  uurtarief?: number;
  functieNaam: string;
};

type Jaar = {
  jaar: number;
  rollen: Rol[];
  activiteit?: string;
  totaalUren?: number;
  totaalKosten?: number;
};

type Domein = {
  domein: string;
  uren?: number;
  jaren?: Jaar[];
  koppeling?: unknown;
  motivatie?: string;
  totaalUren?: number;
  totaalKosten?: number;
};

type Scenario = {
  domeinen?: Domein[];
  startJaar?: number;
  totaalUren?: number;
  aantalJaren?: number;
  samenvatting?: string;
  totaalKosten?: number;
  scenarioLabel?: string;
  totalenPerJaar?: Array<{
    jaar: number;
    uren: number;
    kosten: number;
    urenGap?: number;
    urenBudget?: number;
  }>;
  uurtariefGebruikt?: unknown;
};

type ResultPerScenario = {
  scenario: string;
  rolTotaalVoor: Record<string, { totaal: number; perJaar: Record<number, number> }>;
  rolTotaalNa: Record<string, { totaal: number; perJaar: Record<number, number> }>;
  j1Voor: number;
  j1Na: number;
  j1Cap: number;
  j1OnderCap: boolean;
  piekJaarVoor: number | null;
  piekJaarNa: number | null;
  acceptatieJaar: number;
  piekMatch: boolean;
};

function sumRoleHours(jaar: Jaar, rolNaam: string): number {
  return (jaar.rollen ?? [])
    .filter((r) => r.functieNaam === rolNaam)
    .reduce((s, r) => s + (r.uren || 0), 0);
}

function templateRol(jaar: Jaar, rolNaam: string): Rol | null {
  const match = (jaar.rollen ?? []).find((r) => r.functieNaam === rolNaam);
  return match ? { ...match } : null;
}

function findFirstTemplate(jaren: Jaar[], rolNaam: string): Rol | null {
  for (const jr of jaren) {
    const t = templateRol(jr, rolNaam);
    if (t) return t;
  }
  return null;
}

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error: fetchErr } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (fetchErr || !data) {
    console.error("[finetune-cat1] sessie niet gevonden:", fetchErr?.message);
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  // Idempotency-check
  if (s7.cat1FineTuned) {
    console.log("[finetune-cat1] marker `cat1FineTuned` gevonden — al toegepast, niets te doen.");
    console.log(JSON.stringify(s7.cat1FineTuned, null, 2));
    return;
  }

  const scenarios = s7.scenarios as Record<string, Scenario | null>;

  const results: ResultPerScenario[] = [];

  for (const [sk, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    if (!(sk in PERC)) continue;
    const perc = PERC[sk];
    const aantalJaren = sc.aantalJaren ?? perc.length;
    if (perc.length !== aantalJaren) {
      console.error(
        `[finetune-cat1] scenario ${sk}: percentages.length=${perc.length} ≠ aantalJaren=${aantalJaren}`,
      );
      process.exit(1);
    }
    const ds = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!ds || !ds.jaren) {
      console.warn(`[finetune-cat1] scenario ${sk}: data_systemen-domein niet gevonden, skip`);
      continue;
    }
    const startJaar = sc.startJaar ?? 2026;

    // ── 1. Voor-state per rol vastleggen ─────────────────────────────────
    const voor: Record<string, { totaal: number; perJaar: Record<number, number> }> = {};
    for (const rolNaam of CAT1_ROLES) {
      const perJaar: Record<number, number> = {};
      let totaal = 0;
      for (const jr of ds.jaren) {
        const u = sumRoleHours(jr, rolNaam);
        perJaar[jr.jaar] = u;
        totaal += u;
      }
      voor[rolNaam] = { totaal, perJaar };
    }

    // ── 2. Voor-state piek-jaar (jaar met hoogste totaalUren in data_systemen) ──
    const piekVoor = [...ds.jaren].sort(
      (a, b) => (b.totaalUren ?? 0) - (a.totaalUren ?? 0),
    )[0];
    const piekJaarVoor = piekVoor?.jaar ?? null;

    // ── 3. Per rol nieuw verdeel-plan (rond met integer-correctie) ────────
    const nieuwePerRol: Record<string, Record<number, number>> = {};
    for (const rolNaam of CAT1_ROLES) {
      const totaal = voor[rolNaam].totaal;
      if (totaal === 0) {
        nieuwePerRol[rolNaam] = Object.fromEntries(ds.jaren.map((jr) => [jr.jaar, 0]));
        continue;
      }
      const ruw: number[] = perc.map((p) => totaal * p);
      const afgerond = ruw.map((v) => Math.round(v));
      // Correct rounding-drift naar exact totaal
      const drift = totaal - afgerond.reduce((s, v) => s + v, 0);
      if (drift !== 0) {
        // Verdeel drift over jaren met hoogste percentage (bewaart fase-zwaarte)
        const indices = perc.map((_, i) => i).sort((a, b) => perc[b] - perc[a]);
        let rest = drift;
        let idx = 0;
        while (rest !== 0) {
          afgerond[indices[idx % indices.length]] += rest > 0 ? 1 : -1;
          rest += rest > 0 ? -1 : 1;
          idx++;
        }
      }
      const m: Record<number, number> = {};
      ds.jaren.forEach((jr, i) => {
        m[jr.jaar] = afgerond[i] ?? 0;
      });
      nieuwePerRol[rolNaam] = m;
    }

    // ── 4. Pas mutatie toe op jaar-rollen-arrays ──────────────────────────
    for (const rolNaam of CAT1_ROLES) {
      // Template ophalen voor afdeling/functieId/uurtarief (per jaar bij voorkeur)
      const fallbackTemplate = findFirstTemplate(ds.jaren, rolNaam);
      for (const jr of ds.jaren) {
        const targetUren = nieuwePerRol[rolNaam][jr.jaar] ?? 0;
        // Template van dit jaar (of fallback) — uurtarief loopt mee met jaar
        const tpl = templateRol(jr, rolNaam) ?? fallbackTemplate;
        // Verwijder bestaande entries voor deze rol in dit jaar
        jr.rollen = (jr.rollen ?? []).filter((r) => r.functieNaam !== rolNaam);
        if (targetUren > 0) {
          if (!tpl) {
            console.warn(
              `[finetune-cat1] ${sk} ${jr.jaar}: geen template voor ${rolNaam}, sla over`,
            );
            continue;
          }
          const tarief = tpl.uurtarief ?? 0;
          jr.rollen.push({
            ...tpl,
            uren: targetUren,
            kosten: targetUren * tarief,
          });
        }
      }
    }

    // ── 5. Hertel jaar-totalen, domein-totalen, scenario-totalen ─────────
    for (const jr of ds.jaren) {
      jr.totaalUren = (jr.rollen ?? []).reduce((s, r) => s + (r.uren || 0), 0);
      jr.totaalKosten = (jr.rollen ?? []).reduce((s, r) => s + (r.kosten || 0), 0);
    }
    ds.totaalUren = ds.jaren.reduce((s, jr) => s + (jr.totaalUren || 0), 0);
    ds.totaalKosten = ds.jaren.reduce((s, jr) => s + (jr.totaalKosten || 0), 0);
    if (typeof ds.uren === "number") ds.uren = ds.totaalUren;

    // Scenario totalen op alle domeinen
    let scTotaalUren = 0;
    let scTotaalKosten = 0;
    const perJaarScen: Record<number, { uren: number; kosten: number }> = {};
    for (let y = 0; y < aantalJaren; y++) {
      const jaar = startJaar + y;
      perJaarScen[jaar] = { uren: 0, kosten: 0 };
    }
    for (const dom of sc.domeinen ?? []) {
      for (const jr of dom.jaren ?? []) {
        const u = jr.totaalUren ?? (jr.rollen ?? []).reduce((s, r) => s + (r.uren || 0), 0);
        const k =
          jr.totaalKosten ?? (jr.rollen ?? []).reduce((s, r) => s + (r.kosten || 0), 0);
        if (perJaarScen[jr.jaar]) {
          perJaarScen[jr.jaar].uren += u;
          perJaarScen[jr.jaar].kosten += k;
        }
        scTotaalUren += u;
        scTotaalKosten += k;
      }
    }
    sc.totaalUren = scTotaalUren;
    sc.totaalKosten = scTotaalKosten;
    if (Array.isArray(sc.totalenPerJaar)) {
      for (const t of sc.totalenPerJaar) {
        const v = perJaarScen[t.jaar];
        if (!v) continue;
        t.uren = v.uren;
        t.kosten = v.kosten;
        if (typeof t.urenBudget === "number") {
          t.urenGap = t.uren - t.urenBudget;
        }
      }
    }

    // ── 6. Na-state vastleggen voor rapport ──────────────────────────────
    const na: Record<string, { totaal: number; perJaar: Record<number, number> }> = {};
    for (const rolNaam of CAT1_ROLES) {
      const perJaar: Record<number, number> = {};
      let totaal = 0;
      for (const jr of ds.jaren) {
        const u = sumRoleHours(jr, rolNaam);
        perJaar[jr.jaar] = u;
        totaal += u;
      }
      na[rolNaam] = { totaal, perJaar };
    }
    const j1Na = sc.totalenPerJaar?.find((t) => t.jaar === startJaar)?.uren ?? 0;
    const j1Voor =
      Object.values(voor).reduce((s, r) => s + (r.perJaar[startJaar] ?? 0), 0) +
      // overige rollen J1 (= huidige j1 totaalUren scenario - cat-1 J1 voor)
      (() => {
        const oldJ1Total = (() => {
          // Reconstrueer voor-J1 als nieuw J1 + verschil cat-1 voor/na
          const cat1Voor = Object.values(voor).reduce(
            (s, r) => s + (r.perJaar[startJaar] ?? 0),
            0,
          );
          const cat1Na = Object.values(na).reduce(
            (s, r) => s + (r.perJaar[startJaar] ?? 0),
            0,
          );
          return j1Na - cat1Na + cat1Voor;
        })();
        return oldJ1Total - Object.values(voor).reduce((s, r) => s + (r.perJaar[startJaar] ?? 0), 0);
      })();

    // Eenvoudiger: j1Voor = sum(rolNaam J1 voor) + (j1Na - sum(rolNaam J1 na))
    const cat1J1Voor = Object.values(voor).reduce((s, r) => s + (r.perJaar[startJaar] ?? 0), 0);
    const cat1J1Na = Object.values(na).reduce((s, r) => s + (r.perJaar[startJaar] ?? 0), 0);
    const j1VoorReconstructed = j1Na - cat1J1Na + cat1J1Voor;

    const piekNa = [...ds.jaren].sort(
      (a, b) => (b.totaalUren ?? 0) - (a.totaalUren ?? 0),
    )[0];
    const piekJaarNa = piekNa?.jaar ?? null;
    const accJaar = ACC_YEAR[sk] ?? 0;

    results.push({
      scenario: sk,
      rolTotaalVoor: voor,
      rolTotaalNa: na,
      j1Voor: j1VoorReconstructed,
      j1Na,
      j1Cap: J1_CAP[sk],
      j1OnderCap: j1Na <= J1_CAP[sk],
      piekJaarVoor,
      piekJaarNa,
      acceptatieJaar: accJaar,
      piekMatch: piekJaarNa === accJaar,
    });
  }

  // ── 7. Marker zetten ─────────────────────────────────────────────────────
  s7.cat1FineTuned = {
    timestamp: new Date().toISOString(),
    rollen: CAT1_ROLES,
    percentages: PERC,
    j1Cap: J1_CAP,
    accJaar: ACC_YEAR,
    samenvatting: results.map((r) => ({
      scenario: r.scenario,
      j1Voor: r.j1Voor,
      j1Na: r.j1Na,
      j1Cap: r.j1Cap,
      j1OnderCap: r.j1OnderCap,
      piekJaarVoor: r.piekJaarVoor,
      piekJaarNa: r.piekJaarNa,
      acceptatieJaar: r.acceptatieJaar,
      piekMatch: r.piekMatch,
    })),
  };

  // ── 8. Schrijf naar Supabase ────────────────────────────────────────────
  const newSess = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...stepResults,
        stap4: { ...stap4, stap7InterneUren: s7 },
      },
    },
  };
  const { error: updErr } = await supa
    .from("din_sessions")
    .update({ data: newSess })
    .eq("id", SESSION_ID);
  if (updErr) {
    console.error("[finetune-cat1] update mislukt:", updErr.message);
    process.exit(1);
  }

  // ── 9. Audit-rapport schrijven ──────────────────────────────────────────
  const lines: string[] = [];
  lines.push("# AUDIT — Cat-1 fase-aware verdeling");
  lines.push("");
  lines.push(`Sessie: ${SESSION_ID}`);
  lines.push(`Tijdstip: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Aanleiding");
  lines.push("");
  lines.push("Cat-1 rollen (Manager Klantcontact + Accountmanager C (Professionals))");
  lines.push("waren verdeeld in vaste 20/40/40-percentages, wat leidde tot:");
  lines.push("- J1 (2026 = half-jaar) boven cap in alle 4 scenario's");
  lines.push("- Optimaal CRM-piek op 2027 i.p.v. 2029 (OOP-Acceptatie★)");
  lines.push("");
  lines.push("Oplossing: cat-1 uren volgen dezelfde fase-zwaarte als CRM zelf,");
  lines.push("met J1 bewust laag (5%) wegens half-jaar + alleen kick-off-betrokkenheid.");
  lines.push("");
  lines.push("## Toegepaste percentages per scenario");
  lines.push("");
  for (const [sk, p] of Object.entries(PERC)) {
    lines.push(`- **${sk}** (${p.length}j): ${p.map((v) => Math.round(v * 100) + "%").join(" / ")}`);
  }
  lines.push("");
  lines.push("## Resultaten per scenario");
  for (const r of results) {
    lines.push("");
    lines.push(`### ${r.scenario}`);
    lines.push("");
    lines.push("**Cat-1 verdeling per rol per jaar (voor → na):**");
    lines.push("");
    for (const rolNaam of CAT1_ROLES) {
      lines.push(`- ${rolNaam}:`);
      const v = r.rolTotaalVoor[rolNaam];
      const n = r.rolTotaalNa[rolNaam];
      lines.push(`  - voor: totaal=${v.totaal}u | ${Object.entries(v.perJaar).map(([y, u]) => `${y}:${u}u`).join("  ")}`);
      lines.push(`  - na:   totaal=${n.totaal}u | ${Object.entries(n.perJaar).map(([y, u]) => `${y}:${u}u`).join("  ")}`);
    }
    lines.push("");
    lines.push(`**J1 (2026):** voor=${r.j1Voor}u → na=${r.j1Na}u (cap=${r.j1Cap}u — ${r.j1OnderCap ? "ONDER CAP ✓" : "BOVEN CAP — overschrijding door overige rollen, niet aangepast"})`);
    lines.push("");
    lines.push(`**CRM-uren-piek-jaar:** voor=${r.piekJaarVoor} → na=${r.piekJaarNa} (OOP-Acceptatie★=${r.acceptatieJaar} — ${r.piekMatch ? "MATCH ✓" : "MISMATCH"})`);
  }
  lines.push("");
  lines.push("## Resterende afwijkingen");
  lines.push("");
  const overCap = results.filter((r) => !r.j1OnderCap);
  if (overCap.length === 0) {
    lines.push("- J1-cap: alle scenario's onder cap.");
  } else {
    for (const r of overCap) {
      lines.push(
        `- **${r.scenario} J1=${r.j1Na}u boven cap ${r.j1Cap}u** — overschrijding van ${r.j1Na - r.j1Cap}u zit in overige rollen (niet aangeraakt zoals afgesproken).`,
      );
    }
  }
  const piekMis = results.filter((r) => !r.piekMatch);
  if (piekMis.length === 0) {
    lines.push("- CRM-piek: alle scenario's matchen OOP-Acceptatie★.");
  } else {
    for (const r of piekMis) {
      lines.push(
        `- **${r.scenario} piek=${r.piekJaarNa} ≠ OOP-Acceptatie★ ${r.acceptatieJaar}** — controle vereist.`,
      );
    }
  }
  lines.push("");

  const auditPath = join(process.cwd(), "AUDIT-CAT1-FINETUNE.md");
  writeFileSync(auditPath, lines.join("\n"), "utf-8");

  console.log("[finetune-cat1] ✓ klaar.");
  console.log("Resultaten:");
  for (const r of results) {
    console.log(
      `  ${r.scenario}: J1 ${r.j1Voor}→${r.j1Na} (cap ${r.j1Cap}, ${r.j1OnderCap ? "OK" : "BOVEN"}) | piek ${r.piekJaarVoor}→${r.piekJaarNa} (acc=${r.acceptatieJaar}, ${r.piekMatch ? "MATCH" : "MIS"})`,
    );
  }
  console.log(`\nAudit-rapport: ${auditPath}`);
}

void main().catch((e) => {
  console.error("[finetune-cat1] fout:", e);
  process.exit(1);
});
