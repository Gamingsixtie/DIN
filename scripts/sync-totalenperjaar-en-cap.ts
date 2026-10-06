// Synchroniseer scenario.totalenPerJaar met daadwerkelijke per-jaar som van
// inspanningen, en trek cap-overschrijdingen recht (door overschot binnen
// dezelfde inspanning naar lichtste latere jaar te schuiven).
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
type TotaalPerJaar = {
  jaar: number;
  euro: number;
  percentage?: number;
};
type Scen = {
  scenarioLabel?: string;
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  totalenPerJaar?: TotaalPerJaar[];
};

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

function sumPerJaar(sc: Scen, startJaar: number): Map<number, number> {
  const map = new Map<number, number>();
  const aantal = sc.aantalJaren ?? 0;
  for (let i = 0; i < aantal; i++) map.set(startJaar + i, 0);
  for (const ins of sc.inspanningen ?? []) {
    for (const c of ins.verdelingPerJaar ?? []) {
      map.set(c.jaar, (map.get(c.jaar) ?? 0) + c.euro);
    }
  }
  return map;
}

function fmt(n: number): string {
  return n.toLocaleString("nl-NL");
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
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<
    string,
    unknown
  >;
  const adv = stap4.begrotingAdvies as {
    startJaar?: number;
    scenarios?: Record<string, Scen | null>;
  };
  const startJaar = adv.startJaar ?? 2026;

  console.log("═".repeat(80));
  console.log("SYNC totalenPerJaar + CAP-FIX");
  console.log("═".repeat(80));

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    const aantal = sc.aantalJaren ?? 0;

    console.log(
      `\n▌ ${sk.toUpperCase()}  (cap € ${fmt(cap)} × ${aantal} jr, totaal € ${fmt(
        sc.totaalGeraamdEuro ?? 0,
      )})`,
    );

    // ---- Stap A: snapshot oude totalenPerJaar voor rapportage
    const oldTotalen: Record<number, number> = {};
    for (const t of sc.totalenPerJaar ?? []) oldTotalen[t.jaar] = t.euro;

    // ---- Stap B: cap-respect — schuif overschot per jaar binnen dezelfde inspanning
    let perJaar = sumPerJaar(sc, startJaar);
    const caps: { jaar: number; over: number }[] = [];
    for (const [jaar, totaal] of perJaar.entries()) {
      if (cap > 0 && totaal > cap) caps.push({ jaar, over: totaal - cap });
    }

    if (caps.length > 0) {
      console.log(
        `  cap-overschrijdingen: ${caps
          .map((c) => `${c.jaar} +€${fmt(c.over)}`)
          .join(", ")}`,
      );
    } else {
      console.log("  cap-overschrijdingen: geen");
    }

    for (const { jaar, over } of caps) {
      let toShift = over;
      // Sorteer inspanningen op afnemende cell-waarde in dat jaar:
      // we trimmen daar waar de meeste ruimte is.
      const inspsWithCell = (sc.inspanningen ?? [])
        .map((ins) => ({
          ins,
          cell: ins.verdelingPerJaar?.find((c) => c.jaar === jaar),
        }))
        .filter((x) => x.cell && x.cell.euro > 0)
        .sort((a, b) => (b.cell?.euro ?? 0) - (a.cell?.euro ?? 0));

      for (const { ins, cell } of inspsWithCell) {
        if (toShift <= 0 || !cell) break;
        const trim = Math.min(cell.euro, toShift);
        if (trim <= 0) continue;
        cell.euro -= trim;

        // Voeg toe aan lichtste latere jaar van DEZELFDE inspanning (totaal blijft heilig)
        const laterCells = (ins.verdelingPerJaar ?? [])
          .filter((c) => c.jaar > jaar)
          .sort((a, b) => a.euro - b.euro);
        if (laterCells.length === 0) {
          // Geen later jaar — laatste optie: vroeger jaar (ook lichtste) waar nog room is
          const earlierCells = (ins.verdelingPerJaar ?? [])
            .filter((c) => c.jaar < jaar)
            .sort((a, b) => a.euro - b.euro);
          if (earlierCells.length === 0) {
            // Geen alternatieve cel — herstel trim, kunnen we niet schuiven
            cell.euro += trim;
            continue;
          }
          earlierCells[0].euro += trim;
        } else {
          laterCells[0].euro += trim;
        }
        toShift -= trim;
      }
      if (toShift > 0) {
        console.log(
          `  ⚠ ${jaar} kon € ${fmt(toShift)} niet wegschuiven (geen ruimte)`,
        );
      }
    }

    // ---- Stap C: recompute totalenPerJaar
    perJaar = sumPerJaar(sc, startJaar);
    const totaalScenario = sc.totaalGeraamdEuro ?? 0;
    const newTotalen: TotaalPerJaar[] = [];
    for (let i = 0; i < aantal; i++) {
      const jr = startJaar + i;
      const eu = perJaar.get(jr) ?? 0;
      const pct =
        totaalScenario > 0
          ? Math.round((eu / totaalScenario) * 1000) / 10
          : 0;
      newTotalen.push({ jaar: jr, euro: eu, percentage: pct });
    }
    sc.totalenPerJaar = newTotalen;

    // ---- Stap D: rapportage + drift-check
    console.log("  oud → nieuw per jaar:");
    for (const t of newTotalen) {
      const oldVal = oldTotalen[t.jaar] ?? 0;
      const overCap = cap > 0 && t.euro > cap;
      const flag = overCap ? " ⚠OVER-CAP" : "";
      const arrow = oldVal === t.euro ? "=" : "→";
      console.log(
        `    ${t.jaar}: € ${fmt(oldVal).padStart(8)} ${arrow} € ${fmt(
          t.euro,
        ).padStart(8)} (${t.percentage?.toFixed(1)}%)${flag}`,
      );
    }

    const sumTotalen = newTotalen.reduce((s, t) => s + t.euro, 0);
    const sumInsp = (sc.inspanningen ?? []).reduce(
      (s, i) => s + (i.totaalEuro ?? 0),
      0,
    );
    if (Math.abs(sumTotalen - totaalScenario) > 1) {
      console.log(
        `  ⚠ DRIFT: Σ totalenPerJaar=€${fmt(
          sumTotalen,
        )} ≠ scenario.totaalGeraamdEuro=€${fmt(totaalScenario)}`,
      );
    }
    if (Math.abs(sumInsp - totaalScenario) > 1) {
      console.log(
        `  ⚠ DRIFT: Σ inspanningen.totaalEuro=€${fmt(
          sumInsp,
        )} ≠ scenario.totaalGeraamdEuro=€${fmt(totaalScenario)}`,
      );
    }
  }

  // ---- Write back
  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz.stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: adv },
      },
    },
  };
  const { error } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (error) {
    console.error("\nFOUT bij schrijven:", error.message);
    process.exit(1);
  }
  console.log("\n✓ totalenPerJaar gesynchroniseerd + caps gerespecteerd.");

  // ---- Verifieer met re-load
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
    console.log("\n— Re-load verificatie —");
    for (const [sk, sc] of Object.entries(vAdv.scenarios ?? {})) {
      if (!sc) continue;
      const cap = sc.jaarlijksBudgetEuro ?? 0;
      const overs = (sc.totalenPerJaar ?? []).filter((t) => cap > 0 && t.euro > cap);
      console.log(
        `  ${sk}: ${(sc.totalenPerJaar ?? []).length} jaren, ${
          overs.length === 0 ? "binnen cap ✓" : `${overs.length} jr OVER-CAP ⚠`
        }, totaal € ${fmt(sc.totaalGeraamdEuro ?? 0)}`,
      );
    }
  }
}

void main();
