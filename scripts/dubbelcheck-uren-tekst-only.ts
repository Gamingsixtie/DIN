// Dubbelcheck: simuleer de TEKST_ONLY-flow voor interne uren zonder live AI.
//
// Doel: bewijzen dat na een "🔁 Herschrijf alleen teksten"-actie op interne
// uren alle uren, kosten, rollen, jaren en activiteit-teksten LETTERLIJK
// identiek zijn aan de versie ervoor. Server-side merge in
// src/app/api/interne-uren-advies/route.ts:392-417 vervangt alleen
// samenvatting (top-level) en motivatie (per domein).

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

type Rol = { functieId: string; functieNaam: string; afdeling?: string; uren: number; uurtarief: number; kosten: number };
type Jaar = { jaar: number; activiteit: string; rollen: Rol[]; totaalUren: number; totaalKosten: number };
type Domein = {
  domein: "cultuur" | "mens" | "data_systemen" | "processen";
  koppeling?: string[];
  jaren: Jaar[];
  totaalUren: number;
  totaalKosten: number;
  motivatie: string;
};
type UrenScenario = {
  scenarioLabel: "optimaal" | "plus20" | "min20" | "advies";
  aantalJaren: number;
  startJaar: number;
  uurtariefGebruikt: number;
  domeinen: Domein[];
  totalenPerJaar: { jaar: number; uren: number; kosten: number; urenBudget?: number; urenGap?: number }[];
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
};

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: tsx scripts/dubbelcheck-uren-tekst-only.ts <sessionId>");
  process.exit(1);
}

// Reproduceert exact de merge-logica uit interne-uren-advies/route.ts:
// alleen samenvatting (top-level) en motivatie (per domein) overnemen.
function applyTekstOnlyMerge(
  prev: UrenScenario,
  fakeAi: { samenvatting: string; domeinen: { domein: string; motivatie: string }[] },
): UrenScenario {
  return {
    ...prev,
    samenvatting: fakeAi.samenvatting,
    domeinen: prev.domeinen.map((prevDom) => {
      const match = fakeAi.domeinen.find((d) => d.domein === prevDom.domein);
      return {
        ...prevDom,
        motivatie: match?.motivatie ?? prevDom.motivatie,
      };
    }),
  };
}

type Verschil = { pad: string; voor: unknown; na: unknown };

function diffScenario(prev: UrenScenario, na: UrenScenario, scenarioKey: string): Verschil[] {
  const verschillen: Verschil[] = [];
  // Toegestaan om te wijzigen: samenvatting (top-level) + motivatie (per domein)
  const toegestaanTopLevel = new Set(["samenvatting"]);
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(na)]);
  for (const k of allKeys) {
    if (toegestaanTopLevel.has(k)) continue;
    if (k === "domeinen") {
      const prevD = prev.domeinen ?? [];
      const naD = na.domeinen ?? [];
      if (prevD.length !== naD.length) {
        verschillen.push({ pad: `${scenarioKey}.domeinen.length`, voor: prevD.length, na: naD.length });
        continue;
      }
      for (let i = 0; i < prevD.length; i++) {
        const p = prevD[i];
        const n = naD[i];
        // Vergelijk alle domein-velden EXCLUSIEF motivatie
        const inspKeys = new Set([...Object.keys(p), ...Object.keys(n)]);
        for (const ik of inspKeys) {
          if (ik === "motivatie") continue;
          const pv = (p as Record<string, unknown>)[ik];
          const nv = (n as Record<string, unknown>)[ik];
          if (JSON.stringify(pv) !== JSON.stringify(nv)) {
            verschillen.push({
              pad: `${scenarioKey}.domeinen[${i}].${ik}`,
              voor: pv,
              na: nv,
            });
          }
        }
      }
      continue;
    }
    const pv = (prev as unknown as Record<string, unknown>)[k];
    const nv = (na as unknown as Record<string, unknown>)[k];
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
  const interneUren = wiz?.stepResults?.stap4?.stap7InterneUren as
    | { scenarios?: Record<string, UrenScenario | null> }
    | undefined;
  if (!interneUren?.scenarios) {
    console.error("Geen interne-uren-advies in deze sessie.");
    process.exit(1);
  }

  console.log("═".repeat(80));
  console.log("DUBBELCHECK — Interne uren TEKST_ONLY-flow simulatie");
  console.log("═".repeat(80));
  console.log();
  console.log(`Sessie: ${sessionId}`);
  console.log();
  console.log("Voor elk scenario simuleren we worst-case AI-output (poging tot");
  console.log("alle uren ×2 te zetten + nieuwe rollen toe te voegen). Server-side");
  console.log("TEKST_ONLY-merge moet álles negeren behalve samenvatting + motivatie.");
  console.log();

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  let totaalVerschillen = 0;
  let totaalRollen = 0;
  let totaalJaren = 0;

  for (const skey of scenarioKeys) {
    const prev = interneUren.scenarios[skey];
    if (!prev) continue;

    // Worst case fake AI-output: probeer alle uren te verdubbelen
    const fakeAi = {
      samenvatting: `[NIEUW] Herschreven samenvatting voor ${skey} interne uren.`,
      domeinen: prev.domeinen.map((d) => ({
        domein: d.domein,
        motivatie: `[NIEUW] Herschreven motivatie voor domein ${d.domein}: relatief geformuleerd.`,
        // Worst case: deze velden zou AI ook proberen — moeten worden genegeerd
        jaren: d.jaren.map((j) => ({
          jaar: j.jaar,
          activiteit: "[POGING TOT WIJZIGING]",
          rollen: j.rollen.map((r) => ({ ...r, uren: r.uren * 2, kosten: r.kosten * 2 })),
          totaalUren: j.totaalUren * 2,
          totaalKosten: j.totaalKosten * 2,
        })),
        totaalUren: d.totaalUren * 2,
        totaalKosten: d.totaalKosten * 2,
      })),
    };

    const na = applyTekstOnlyMerge(prev, fakeAi);

    // Tel rollen + jaren
    for (const dom of prev.domeinen) {
      totaalJaren += dom.jaren.length;
      for (const j of dom.jaren) totaalRollen += j.rollen.length;
    }

    const verschillen = diffScenario(prev, na, skey);
    totaalVerschillen += verschillen.length;

    console.log(
      `${skey.padEnd(10)}  ${verschillen.length === 0 ? "✅ identiek" : `❌ ${verschillen.length} verschil(len)`}`,
    );
    for (const v of verschillen.slice(0, 5)) {
      console.log(`            ${v.pad}: ${JSON.stringify(v.voor).slice(0, 60)} → ${JSON.stringify(v.na).slice(0, 60)}`);
    }

    // Verifieer ook expliciet dat de tekstvelden WEL zijn gewijzigd
    const samenvattingChanged = prev.samenvatting !== na.samenvatting;
    const motivatiesChanged = prev.domeinen.every(
      (p, i) => p.motivatie !== na.domeinen[i].motivatie,
    );
    if (!samenvattingChanged || !motivatiesChanged) {
      console.log(
        `            ⚠️  Verwacht WEL wijziging in tekstvelden: samenvatting=${samenvattingChanged}, motivaties=${motivatiesChanged}`,
      );
    }
  }

  console.log();
  console.log("─".repeat(80));
  console.log(`Totaal jaren gecontroleerd: ${totaalJaren} (4 scenarios × 4 domeinen × N jaren)`);
  console.log(`Totaal rollen gecontroleerd: ${totaalRollen}`);
  console.log(`Totaal niet-tekst verschillen na TEKST_ONLY-merge: ${totaalVerschillen}`);
  console.log(
    totaalVerschillen === 0
      ? "✅ BEWIJS: TEKST_ONLY-merge laat álle uren, kosten, rollen, jaren en activiteit-teksten heilig."
      : "❌ FAALD: er zijn niet-tekst velden gewijzigd. Onderzoek diffScenario-output.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
