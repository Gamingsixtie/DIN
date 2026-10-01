// Herstel inspanningsleiders die zijn verdwenen uit vastgesteldeUrenPerInspanning
// + scenarios. Yara mens, Sven data, Yara cultuur (HR), TBD processen.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type Leider = {
  domein: string;
  functieId: string;
  functieNaam: string;
  afdeling: string;
  placeholder?: boolean;
  tbdToelichting?: string;
};

const LEIDERS: Leider[] = [
  { domein: "mens", functieId: "custom-yara-mens-leider", functieNaam: "Yara — HR-manager (inspanningsleider Mens)", afdeling: "HR" },
  { domein: "data_systemen", functieId: "custom-sven-data-leider", functieNaam: "Sven — SIO (inspanningsleider Data & Systemen)", afdeling: "Data & Technologie" },
  { domein: "cultuur", functieId: "custom-yara-cultuur-leider", functieNaam: "Yara — HR-manager (inspanningsleider Cultuur)", afdeling: "HR" },
  { domein: "processen", functieId: "custom-inspanningsleider-processen-tbd", functieNaam: "Inspanningsleider Processen — naam nog te benoemen", afdeling: "TBD", placeholder: true, tbdToelichting: "Mogelijk Projectmanager D of andere kandidaat — beslissing in stuurgroep nog te nemen" },
];

// Fase-curve per scenario (8 = piek-jaar 80u, 4 = niet-piek 40u, 2.5 = borging 25u)
function fasePerJaar(scenKey: string, jaar: number, startJaar: number): "piek" | "niet-piek" | "borging" {
  const j = jaar - startJaar; // 0-indexed
  // Eenvoudige heuristiek: J0 niet-piek (Analyse), J1+J2 piek (Realisatie/Acceptatie), rest borging
  if (j === 0) return "niet-piek";
  if (j <= 2) return "piek";
  return "borging";
}

function urenLeider(fase: "piek" | "niet-piek" | "borging"): number {
  return fase === "piek" ? 80 : fase === "niet-piek" ? 40 : 25;
}

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const sel = s7.selectiePerDomein as Record<string, Record<string, Record<string, unknown>>>;
  const customs = (s7.customFunctiesPerDomein as Record<string, Array<Record<string, unknown>>>) || {};
  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: Array<Record<string, unknown>> }>;
  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; jaren?: Array<{ jaar: number; rollen?: Array<Record<string, unknown>>; totaalUren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }>; totaalUren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }>; totaalUren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number; totalenPerJaar?: Array<{ jaar: number; uren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number; kosten?: number }>; uurtariefGebruikt?: number; startJaar?: number }>;

  for (const L of LEIDERS) {
    // 1. selectiePerDomein
    if (!sel[L.domein]) sel[L.domein] = {};
    if (!sel[L.domein][L.functieId]) {
      const entry: Record<string, unknown> = { aantal: 1 };
      if (L.placeholder) {
        entry.placeholderTBD = true;
        entry.tbdToelichting = L.tbdToelichting;
      }
      sel[L.domein][L.functieId] = entry;
      console.log(`✓ selectie ${L.domein}: ${L.functieId} toegevoegd`);
    }

    // 2. customFunctiesPerDomein
    if (!customs[L.domein]) customs[L.domein] = [];
    if (!customs[L.domein].some((c) => c.id === L.functieId)) {
      customs[L.domein].push({ id: L.functieId, naam: L.functieNaam, cluster: "Inspanningsleider" });
    }

    // 3. vUPI
    const grp = vUPI.find((g) => g.domein === L.domein);
    if (!grp) continue;
    if (!grp.rollen.some((r) => r.functieId === L.functieId)) {
      grp.rollen.unshift({
        functieId: L.functieId,
        functieNaam: L.functieNaam,
        afdeling: L.afdeling,
        urenTotaal: 240, // advies-basis 4j
        categorie: "leider",
        programmaPct: 0.9,
        lijnPct: 0.1,
        raadplegenPct: 0,
        onderbouwing: `Inspanningsleider ${L.domein}-domein conform programmaorganisatie. Lezing C: 80u/jr piek + 40u/jr niet-piek + 25u/jr borging.`,
        ...(L.placeholder ? { placeholderTBD: true, tbdToelichting: L.tbdToelichting } : {}),
      });
      console.log(`✓ vUPI ${L.domein}: leider toegevoegd`);
    }

    // 4. scenarios — voeg leider toe als rol per jaar
    s7.customFunctiesPerDomein = customs;
    for (const [scenKey, sc] of Object.entries(scenarios)) {
      if (!sc.domeinen) continue;
      const dom = sc.domeinen.find((d) => d.domein === L.domein);
      if (!dom?.jaren) continue;
      const startJaar = sc.startJaar ?? 2026;
      const tarief = sc.uurtariefGebruikt ?? 70;

      for (const jaar of dom.jaren) {
        if (!jaar.rollen) jaar.rollen = [];
        const al = jaar.rollen.find((r) => r.functieId === L.functieId);
        if (al) continue;
        const fase = fasePerJaar(scenKey, jaar.jaar, startJaar);
        const uren = urenLeider(fase);
        const indexF = Math.pow(1.05, jaar.jaar - 2025);
        jaar.rollen.unshift({
          functieId: L.functieId,
          functieNaam: L.functieNaam,
          afdeling: L.afdeling,
          uren,
          kosten: Math.round(uren * tarief * indexF),
          uurtarief: Math.round(tarief * indexF),
          categorie: "leider",
          programmaPct: 0.9,
          lijnPct: 0.1,
          raadplegenPct: 0,
          ...(L.placeholder ? { placeholderTBD: true } : {}),
        });
      }
    }
  }

  // 5. Hercalculeer aggregaten
  for (const sc of Object.values(scenarios)) {
    let scTotU = 0, scP = 0, scL = 0, scR = 0;
    for (const dom of sc.domeinen ?? []) {
      let domTotU = 0, domP = 0, domL = 0, domR = 0;
      for (const jaar of dom.jaren ?? []) {
        let jU = 0, jP = 0, jL = 0, jR = 0;
        for (const rol of jaar.rollen ?? []) {
          const u = (rol.uren as number) ?? 0;
          jU += u;
          jP += u * ((rol.programmaPct as number) ?? 0);
          jL += u * ((rol.lijnPct as number) ?? 0);
          jR += u * ((rol.raadplegenPct as number) ?? 0);
        }
        jaar.totaalUren = jU;
        jaar.programmaUren = Math.round(jP);
        jaar.lijnUren = Math.round(jL);
        jaar.raadplegenUren = Math.round(jR);
        domTotU += jU; domP += jP; domL += jL; domR += jR;
      }
      dom.totaalUren = domTotU;
      dom.programmaUren = Math.round(domP);
      dom.lijnUren = Math.round(domL);
      dom.raadplegenUren = Math.round(domR);
      scTotU += domTotU; scP += domP; scL += domL; scR += domR;
    }
    sc.totaalUren = scTotU;
    sc.programmaUren = Math.round(scP);
    sc.lijnUren = Math.round(scL);
    sc.raadplegenUren = Math.round(scR);
    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let u = 0, p = 0, l = 0, r = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar);
          if (!j) continue;
          u += j.totaalUren ?? 0;
          p += j.programmaUren ?? 0;
          l += j.lijnUren ?? 0;
          r += j.raadplegenUren ?? 0;
        }
        t.uren = u;
        t.programmaUren = p;
        t.lijnUren = l;
        t.raadplegenUren = r;
      }
    }
  }

  s7.leidersHersteldOp = new Date().toISOString();

  const newData = { ...sess, crossAnalyseWizard: { ...wiz, stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } } } };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error(error.message); process.exit(1); }
  console.log("\n✓ Leiders hersteld + aggregaten herrekend.");
  for (const [k, sc] of Object.entries(scenarios)) {
    console.log(`  ${k}: totaal=${sc.totaalUren} prog=${sc.programmaUren} lijn=${sc.lijnUren} raadplegen=${sc.raadplegenUren}`);
  }
}

void main();
