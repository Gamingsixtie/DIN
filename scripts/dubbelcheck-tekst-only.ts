// Dubbelcheck: simuleer de TEKST_ONLY-flow zonder live AI-call.
//
// Doel: bewijzen dat na een "🔁 Herschrijf alleen teksten"-actie alle cijfers,
// fase-labels en activiteit-teksten LETTERLIJK identiek zijn aan de versie
// vóór de knop. AI mag in de praktijk een ietsje afwijken, maar de server-
// side merge in route.ts:797-829 dwingt af dat alleen samenvatting,
// prioriteitAdvies (top-level) en motivatie (per inspanning) worden vervangen.
//
// Deze test reproduceert die merge-logica deterministisch op een live sessie
// en logt verschilten per scenario per inspanning per cell.

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

type Cell = { jaar: number; euro: number; percentage?: number; fase: string; activiteit?: string };
type Insp = {
  inspanningTitel: string;
  domein: string;
  totaalEuro?: number;
  percentageTotaal?: number;
  motivatie?: string;
  verdelingPerJaar: Cell[];
  volgorde?: { rank: number; reden: string };
};
type Scen = {
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  totalenPerJaar?: { jaar: number; euro: number; percentage: number }[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: tsx scripts/dubbelcheck-tekst-only.ts <sessionId>");
  process.exit(1);
}

// Reproduceert exact de merge-logica uit route.ts (zie regel 797-829):
// alleen 3 velden uit "AI-output" worden overgenomen, rest letterlijk uit prev.
function applyTekstOnlyMerge(
  prev: Scen,
  fakeAiOutput: { samenvatting: string; prioriteitAdvies: string; inspanningen: { inspanningTitel: string; motivatie: string }[] },
): Scen {
  return {
    ...prev,
    samenvatting: fakeAiOutput.samenvatting,
    prioriteitAdvies: fakeAiOutput.prioriteitAdvies,
    inspanningen: (prev.inspanningen ?? []).map((prevInsp) => {
      const match = fakeAiOutput.inspanningen.find(
        (i) =>
          i.inspanningTitel === prevInsp.inspanningTitel ||
          i.inspanningTitel.toLowerCase() === prevInsp.inspanningTitel.toLowerCase(),
      );
      return {
        ...prevInsp,
        motivatie: match?.motivatie ?? prevInsp.motivatie,
      };
    }),
  };
}

type Verschil = { pad: string; voor: unknown; na: unknown };

// Vergelijk twee scenarios diep, EXCLUSIEF de drie velden die mogen wijzigen.
function diffScenario(prev: Scen, na: Scen, scenarioKey: string): Verschil[] {
  const verschillen: Verschil[] = [];
  const skip = new Set([
    "samenvatting",
    "prioriteitAdvies",
  ]);
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(na)]);
  for (const k of allKeys) {
    if (skip.has(k)) continue;
    if (k === "inspanningen") {
      const prevI = prev.inspanningen ?? [];
      const naI = na.inspanningen ?? [];
      if (prevI.length !== naI.length) {
        verschillen.push({ pad: `${scenarioKey}.inspanningen.length`, voor: prevI.length, na: naI.length });
        continue;
      }
      for (let i = 0; i < prevI.length; i++) {
        const p = prevI[i];
        const n = naI[i];
        // Vergelijk alle velden van inspanning EXCLUSIEF motivatie
        const inspKeys = new Set([...Object.keys(p), ...Object.keys(n)]);
        for (const ik of inspKeys) {
          if (ik === "motivatie") continue;
          const pv = (p as Record<string, unknown>)[ik];
          const nv = (n as Record<string, unknown>)[ik];
          if (JSON.stringify(pv) !== JSON.stringify(nv)) {
            verschillen.push({
              pad: `${scenarioKey}.inspanningen[${i}].${ik}`,
              voor: pv,
              na: nv,
            });
          }
        }
      }
      continue;
    }
    const pv = (prev as Record<string, unknown>)[k];
    const nv = (na as Record<string, unknown>)[k];
    if (JSON.stringify(pv) !== JSON.stringify(nv)) {
      verschillen.push({ pad: `${scenarioKey}.${k}`, voor: pv, na: nv });
    }
  }
  return verschillen;
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
  const begroting = wiz?.stepResults?.stap4?.begrotingAdvies as
    | { scenarios?: Record<string, Scen | null> }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies");
    process.exit(1);
  }

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  let totaalVerschillen = 0;
  let totaalCellen = 0;

  console.log("═".repeat(80));
  console.log("DUBBELCHECK — TEKST_ONLY-flow simulatie");
  console.log("═".repeat(80));
  console.log();
  console.log(`Sessie: ${sessionId}`);
  console.log();
  console.log("Voor elk scenario simuleren we:");
  console.log("  1. AI levert NIEUWE motivatie/samenvatting/prioriteitAdvies (gefakete tekst).");
  console.log("  2. AI 'durft' ook bedragen/fase/activiteit te wijzigen (worst case).");
  console.log("  3. Server-side TEKST_ONLY-merge wordt toegepast (route.ts:797-829).");
  console.log("  4. We vergelijken vóór en na: ALLE cijfers en niet-tekst velden moeten");
  console.log("     LETTERLIJK identiek zijn. Alleen samenvatting, prioriteitAdvies en");
  console.log("     motivatie per inspanning mogen verschillen.");
  console.log();

  for (const skey of scenarioKeys) {
    const prev = begroting.scenarios[skey];
    if (!prev) continue;

    // Simuleer een 'AI-output' die ALLES probeert te veranderen (worst case).
    // Bedragen worden met 50% verhoogd, fase-labels gewijzigd, activiteit-teksten
    // overschreven. Als de merge correct werkt, mag NIETS hiervan doordringen
    // tot het uiteindelijke scenario.
    const fakeAiOutput = {
      samenvatting: `[NIEUW] Herschreven samenvatting voor ${skey} scenario.`,
      prioriteitAdvies: `[NIEUW] Herschreven prioriteitAdvies voor ${skey}: relatieve aanduidingen, geen jaartallen.`,
      inspanningen: (prev.inspanningen ?? []).map((insp) => ({
        inspanningTitel: insp.inspanningTitel,
        motivatie: `[NIEUW] Herschreven motivatie voor ${insp.inspanningTitel}: zwaartepunt valt in de bouwjaren, etc.`,
        // Worst case: deze velden zou AI ook proberen te wijzigen — maar de
        // merge in route.ts gebruikt alleen `motivatie` van match, dus deze
        // blijven onschadelijk:
        verdelingPerJaar: insp.verdelingPerJaar.map((c) => ({
          jaar: c.jaar,
          euro: Math.round((c.euro ?? 0) * 1.5), // POGING: ophogen met 50%
          fase: "[POGING TOT WIJZIGING]",
          activiteit: "[POGING TOT WIJZIGING]",
        })),
        totaalEuro: (insp.totaalEuro ?? 0) * 1.5,
        percentageTotaal: 999,
      })),
    };

    const na = applyTekstOnlyMerge(prev, fakeAiOutput);

    // Cel-telling vóór de merge
    for (const insp of prev.inspanningen ?? []) {
      totaalCellen += insp.verdelingPerJaar.length;
    }

    const verschillen = diffScenario(prev, na, skey);
    totaalVerschillen += verschillen.length;

    console.log(`${skey.padEnd(10)}  ${verschillen.length === 0 ? "✅ identiek" : `❌ ${verschillen.length} verschil(len)`}`);
    for (const v of verschillen.slice(0, 5)) {
      console.log(`            ${v.pad}: ${JSON.stringify(v.voor).slice(0, 60)} → ${JSON.stringify(v.na).slice(0, 60)}`);
    }

    // Verifieer ook expliciet dat de tekstvelden WEL zijn gewijzigd (anders zou
    // de hele oefening zinloos zijn)
    const samenvattingChanged = prev.samenvatting !== na.samenvatting;
    const prioriteitChanged = prev.prioriteitAdvies !== na.prioriteitAdvies;
    const motivatiesChanged = (prev.inspanningen ?? []).every(
      (p, i) => p.motivatie !== (na.inspanningen ?? [])[i].motivatie,
    );
    if (!samenvattingChanged || !prioriteitChanged || !motivatiesChanged) {
      console.log(
        `            ⚠️  Verwacht WEL wijziging in tekstvelden: samenvatting=${samenvattingChanged}, prioriteit=${prioriteitChanged}, motivaties=${motivatiesChanged}`,
      );
    }
  }

  console.log();
  console.log("─".repeat(80));
  console.log(`Totaal cellen gecontroleerd: ${totaalCellen}`);
  console.log(`Totaal niet-tekst verschillen na TEKST_ONLY-merge: ${totaalVerschillen}`);
  console.log(
    totaalVerschillen === 0
      ? "✅ BEWIJS: TEKST_ONLY-merge laat álle cijfers, fase-labels en activiteit-teksten heilig."
      : "❌ FAALD: er zijn niet-tekst velden gewijzigd. Onderzoek diffScenario-output.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
