// Interpretatie B — driedeling programma / lijn / raadplegen.
//
// User heeft expliciet voor interpretatie B gekozen:
//   • Drie aparte uren-types per persoon naast elkaar.
//   • Geconsulteerd-uren tellen NIET mee als programma OF lijn — vormen een
//     derde uren-type "raadplegen" (incidentele consultatie, beperkt
//     tijdsbeslag, valt buiten programma- en lijn-toewijzing).
//
// Verdeling per categorie (sommatie = 1.0 per rol):
//   ┌──────────────────────────────────────┬──────────┬──────┬───────────┐
//   │ Categorie persoon                    │ programma │ lijn │ raadplegen │
//   ├──────────────────────────────────────┼──────────┼──────┼───────────┤
//   │ Leider                                │ 0.90     │ 0.10 │ 0         │
//   │ Kernteam-uitvoerend (data/mens/proc)  │ 0.80     │ 0.20 │ 0         │
//   │ Kernteam-MT cultuur                   │ 0.50     │ 0.50 │ 0         │
//   │ Trainings-deelnemer mens              │ 0.50     │ 0.50 │ 0         │
//   │ Geconsulteerd                         │ 0        │ 0    │ 1.00      │
//   └──────────────────────────────────────┴──────────┴──────┴───────────┘
//
// Output:
//   • Per rol in scenarios[].domeinen[].jaren[].rollen[]:
//       programmaPct, lijnPct, raadplegenPct (allemaal 0..1, som = 1.0)
//   • Per rol in vastgesteldeUrenPerInspanning[].rollen[]:
//       programmaPct, lijnPct, raadplegenPct
//   • Per domein per scenario:
//       programmaUren, lijnUren, raadplegenUren
//   • Per scenario top-niveau:
//       programmaUren, lijnUren, raadplegenUren
//   • Per jaar in totalenPerJaar:
//       programmaUren, lijnUren, raadplegenUren
//   • Marker: stap7InterneUren.interpretatieBToegepast = true (idempotent)
//   • Toelichting + timestamp in stap7InterneUren.interpretatieBMarker
//
// Idempotent: bij tweede run produceert dezelfde output. Bestaande velden
// worden overschreven (niet opgeteld).
//
// Gebruik:
//   npx tsx scripts/interpretatie-b-driedeling.ts            (dry-run)
//   npx tsx scripts/interpretatie-b-driedeling.ts --apply    (schrijven)

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
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const APPLY = process.argv.includes("--apply");

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DomeinKey = "data_systemen" | "mens" | "cultuur" | "processen";
type ScenarioKey = "min20" | "advies" | "plus20" | "optimaal";
type Categorie =
  | "leider"
  | "kernteam_uitvoerend"
  | "kernteam_mt_cultuur"
  | "trainings_deelnemer"
  | "geconsulteerd";

// ─────────────────────────────────────────────────────────────────────────────
// Verdeling per categorie — som = 1.0
// ─────────────────────────────────────────────────────────────────────────────
const VERDELING: Record<
  Categorie,
  { programma: number; lijn: number; raadplegen: number; reden: string }
> = {
  leider: {
    programma: 0.9,
    lijn: 0.1,
    raadplegen: 0,
    reden: "Programma-trekrol; klein deel governance valt in functieprofiel",
  },
  kernteam_uitvoerend: {
    programma: 0.8,
    lijn: 0.2,
    raadplegen: 0,
    reden: "Specifiek programmawerk; kleine overlap functieprofiel",
  },
  kernteam_mt_cultuur: {
    programma: 0.5,
    lijn: 0.5,
    raadplegen: 0,
    reden: "MT-cyclus zit in bestaande cyclus; outside-in als nieuw werk binnen die cyclus",
  },
  trainings_deelnemer: {
    programma: 0.5,
    lijn: 0.5,
    raadplegen: 0,
    reden: "16u/persoon L&D = lijn; rest = nieuw curriculum",
  },
  geconsulteerd: {
    programma: 0,
    lijn: 0,
    raadplegen: 1.0,
    reden: "Incidentele review/raadpleging — eigen categorie naast programma/lijn",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Categorie-bepaling per rol (mirror van bepaalCategorie/bepaalLezingCCategorie
// in BerekeningenStep.tsx en StapInterneUren.tsx).
// ─────────────────────────────────────────────────────────────────────────────
function bepaalCategorie(
  domein: DomeinKey,
  functieId: string,
  functieNaam: string | undefined,
  selectie: { aantal?: number; urenPerJaar?: number; stakeholder?: boolean; reviewVereist?: boolean } | undefined,
  rolCategorieenMapping: Record<string, string> | undefined,
): Categorie {
  // 1. Expliciete mapping uit Lezing C (rolCategorieen)
  const explicit = rolCategorieenMapping?.[functieId];
  if (explicit) {
    if (explicit === "leider") return "leider";
    if (explicit === "geconsulteerd") return "geconsulteerd";
    if (explicit === "trainings_deelnemer" || explicit === "trainings-deelnemer") {
      return "trainings_deelnemer";
    }
    if (explicit === "kernteam") {
      return domein === "cultuur" ? "kernteam_mt_cultuur" : "kernteam_uitvoerend";
    }
  }

  // 2. Stakeholder/review-flag → geconsulteerd
  if (selectie?.stakeholder === true) return "geconsulteerd";
  if (selectie?.reviewVereist === true) return "geconsulteerd";

  // 3. Naam/ID-heuristiek voor leider
  const lower = (functieNaam ?? "").toLowerCase();
  const idLower = functieId.toLowerCase();
  if (
    lower.includes("inspanningsleider") ||
    lower.includes("projectleider") ||
    lower.includes("projectmanager") ||
    idLower.includes("-leider") ||
    idLower.includes("leider-") ||
    idLower.endsWith("-leider") ||
    functieId === "manager_klantcontact" ||
    functieId === "sio"
  ) {
    return "leider";
  }

  // 4. Mens-domein heuristiek voor trainings-deelnemers
  if (domein === "mens") {
    const aantal = selectie?.aantal ?? 1;
    if (
      aantal >= 3 &&
      (functieId.includes("klantenservice") ||
        functieId.includes("accountmanager") ||
        functieId.includes("mdw_binnendienst"))
    ) {
      return "trainings_deelnemer";
    }
    if ((selectie?.urenPerJaar ?? 0) === 0 && aantal >= 1 && functieId !== "manager_klantcontact") {
      return "trainings_deelnemer";
    }
  }

  // 5. Cultuur-domein default = MT-cyclus (50/50). Dit zijn directeur,
  //    sectormanagers, manager_dt etc. die in cultuur het MT vormen.
  if (domein === "cultuur") {
    return "kernteam_mt_cultuur";
  }

  // 6. Default: kernteam-uitvoerend (vakinhoudelijke uitvoerders in
  //    data_systemen/mens/processen).
  return "kernteam_uitvoerend";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — zoveel mogelijk afgestemd op StapInterneUren / BerekeningenStep
// ─────────────────────────────────────────────────────────────────────────────
interface VastgesteldeRol {
  functieId: string;
  functieNaam?: string;
  afdeling?: string;
  urenTotaal: number;
  programmaPct?: number;
  lijnPct?: number;
  raadplegenPct?: number;
  classificatieToelichting?: string;
}

interface VastgesteldeInspanning {
  domein: string;
  inspanningTitel?: string;
  rollen: VastgesteldeRol[];
  groepId?: string;
}

interface JaarRol {
  functieId: string;
  functieNaam?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
  afdeling?: string;
  programmaPct?: number;
  lijnPct?: number;
  raadplegenPct?: number;
}

interface JaarBlok {
  jaar: number;
  rollen: JaarRol[];
  totaalUren?: number;
  totaalKosten?: number;
  activiteit?: string;
}

interface DomeinBlok {
  domein: string;
  jaren: JaarBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  motivatie?: string;
  koppeling?: string[];
  programmaPct?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
}

interface JaarTotalen {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
}

interface ScenarioBlok {
  scenarioLabel?: string;
  startJaar?: number;
  aantalJaren?: number;
  domeinen?: DomeinBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  totalenPerJaar?: JaarTotalen[];
  samenvatting?: string;
}

interface FunctieInputLite {
  aantal?: number;
  urenPerJaar?: number;
  stakeholder?: boolean;
  reviewVereist?: boolean;
}

interface Stap7 {
  vastgesteldeUrenPerInspanning?: VastgesteldeInspanning[];
  scenarios?: Partial<Record<ScenarioKey, ScenarioBlok | null>>;
  selectiePerDomein?: Partial<Record<DomeinKey, Record<string, FunctieInputLite>>>;
  customFunctiesPerDomein?: Partial<Record<DomeinKey, Array<{ id: string; naam: string }>>>;
  interneUrenLezing?: {
    lezing?: string;
    rolCategorieen?: Partial<Record<DomeinKey, Record<string, string>>>;
  };
  interpretatieBToegepast?: boolean;
  interpretatieBMarker?: { timestamp: string; toelichting: string; verdeling: typeof VERDELING };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[interpretatie-b] sessie ${SESSION_ID} — apply=${APPLY}`);
  const { data: row, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error || !row) {
    console.error("Kon sessie niet ophalen:", error);
    process.exit(1);
  }

  const sess = row.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stepResults = wiz?.stepResults as Record<string, unknown> | undefined;
  const stap4 = stepResults?.stap4 as Record<string, unknown> | undefined;
  const s7 = stap4?.stap7InterneUren as Stap7 | undefined;

  if (!s7) {
    console.error("Geen stap7InterneUren-data gevonden.");
    process.exit(1);
  }

  const wasAlToegepast = s7.interpretatieBToegepast === true;
  if (wasAlToegepast) {
    console.log("[idempotent] interpretatieBToegepast=true al gezet — herclassificatie volgt opnieuw.");
  }

  const selectiePerDomein = (s7.selectiePerDomein ?? {}) as Partial<
    Record<DomeinKey, Record<string, FunctieInputLite>>
  >;
  const rolCategorieen = s7.interneUrenLezing?.rolCategorieen ?? {};

  // ─────────────────────────────────────────────────────────
  // Stap A: vastgesteldeUrenPerInspanning[].rollen[].programmaPct/lijnPct/raadplegenPct
  // ─────────────────────────────────────────────────────────
  console.log("\n[A] Vastgestelde rollen — driedeling pct toevoegen");
  const rolReport: Array<{
    domein: string;
    functieId: string;
    functieNaam?: string;
    urenTotaal: number;
    categorie: Categorie;
    programmaPct: number;
    lijnPct: number;
    raadplegenPct: number;
  }> = [];

  for (const insp of s7.vastgesteldeUrenPerInspanning ?? []) {
    const dom = insp.domein as DomeinKey;
    for (const r of insp.rollen) {
      const sel = selectiePerDomein[dom]?.[r.functieId];
      const cat = bepaalCategorie(dom, r.functieId, r.functieNaam, sel, rolCategorieen[dom]);
      const v = VERDELING[cat];
      r.programmaPct = v.programma;
      r.lijnPct = v.lijn;
      r.raadplegenPct = v.raadplegen;
      r.classificatieToelichting = `[${cat}] ${v.reden}`;
      rolReport.push({
        domein: dom,
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        urenTotaal: r.urenTotaal,
        categorie: cat,
        programmaPct: v.programma,
        lijnPct: v.lijn,
        raadplegenPct: v.raadplegen,
      });
      console.log(
        `  [${dom}] ${r.functieId.padEnd(35)} cat=${cat.padEnd(20)} prog=${v.programma} lijn=${v.lijn} raadpl=${v.raadplegen}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Stap B: scenario × domein × rol — per-jaar pct + uren-uitsplitsing
  // ─────────────────────────────────────────────────────────
  console.log("\n[B] Scenario × domein — driedeling uren");
  const scenReport: Array<{
    scenario: ScenarioKey;
    domein: DomeinKey;
    totaalUren: number;
    programmaUren: number;
    lijnUren: number;
    raadplegenUren: number;
  }> = [];
  // Voor elk scenario per jaar de drie totalen
  const perJaarReport: Array<{
    scenario: ScenarioKey;
    jaar: number;
    uren: number;
    programmaUren: number;
    lijnUren: number;
    raadplegenUren: number;
  }> = [];

  // Pre/post snapshot voor logfile
  const voorNa: Array<{
    scenario: ScenarioKey;
    domein: DomeinKey;
    voor: { programmaUren: number; lijnUren: number; raadplegenUren: number };
    na: { programmaUren: number; lijnUren: number; raadplegenUren: number };
  }> = [];

  const scenarios = (s7.scenarios ?? {}) as Partial<Record<ScenarioKey, ScenarioBlok | null>>;

  for (const scenKey of ["min20", "advies", "plus20", "optimaal"] as ScenarioKey[]) {
    const scen = scenarios[scenKey];
    if (!scen?.domeinen) continue;

    let scenProg = 0;
    let scenLijn = 0;
    let scenRaadpl = 0;

    // Per-jaar buckets
    const perJaar = new Map<number, { uren: number; prog: number; lijn: number; raadpl: number }>();

    for (const dom of scen.domeinen) {
      const domKey = dom.domein as DomeinKey;
      let domProg = 0;
      let domLijn = 0;
      let domRaadpl = 0;
      let domTotaal = 0;
      const voor = {
        programmaUren: dom.programmaUren ?? 0,
        lijnUren: dom.lijnUren ?? 0,
        raadplegenUren: dom.raadplegenUren ?? 0,
      };

      for (const jaar of dom.jaren ?? []) {
        const jrBucket = perJaar.get(jaar.jaar) ?? { uren: 0, prog: 0, lijn: 0, raadpl: 0 };
        for (const rol of jaar.rollen ?? []) {
          const sel = selectiePerDomein[domKey]?.[rol.functieId];
          const cat = bepaalCategorie(domKey, rol.functieId, rol.functieNaam, sel, rolCategorieen[domKey]);
          const v = VERDELING[cat];
          rol.programmaPct = v.programma;
          rol.lijnPct = v.lijn;
          rol.raadplegenPct = v.raadplegen;
          const u = rol.uren ?? 0;
          domTotaal += u;
          domProg += u * v.programma;
          domLijn += u * v.lijn;
          domRaadpl += u * v.raadplegen;
          jrBucket.uren += u;
          jrBucket.prog += u * v.programma;
          jrBucket.lijn += u * v.lijn;
          jrBucket.raadpl += u * v.raadplegen;
        }
        perJaar.set(jaar.jaar, jrBucket);
      }

      dom.programmaUren = Math.round(domProg);
      dom.lijnUren = Math.round(domLijn);
      dom.raadplegenUren = Math.round(domRaadpl);
      // programmaPct = gewogen aandeel programma binnen domein-totaal (voor backward compat)
      dom.programmaPct = domTotaal > 0 ? Math.round((domProg / domTotaal) * 1000) / 1000 : 0;

      scenProg += domProg;
      scenLijn += domLijn;
      scenRaadpl += domRaadpl;

      scenReport.push({
        scenario: scenKey,
        domein: domKey,
        totaalUren: Math.round(domTotaal),
        programmaUren: dom.programmaUren,
        lijnUren: dom.lijnUren,
        raadplegenUren: dom.raadplegenUren,
      });
      voorNa.push({
        scenario: scenKey,
        domein: domKey,
        voor,
        na: {
          programmaUren: dom.programmaUren,
          lijnUren: dom.lijnUren,
          raadplegenUren: dom.raadplegenUren,
        },
      });
      console.log(
        `  [${scenKey}] ${domKey.padEnd(15)} tot=${Math.round(domTotaal).toString().padStart(5)}u  prog=${dom.programmaUren.toString().padStart(5)}u  lijn=${dom.lijnUren.toString().padStart(5)}u  raadpl=${dom.raadplegenUren.toString().padStart(4)}u`,
      );
    }

    scen.programmaUren = Math.round(scenProg);
    scen.lijnUren = Math.round(scenLijn);
    scen.raadplegenUren = Math.round(scenRaadpl);
    console.log(
      `  [${scenKey}] TOTAAL prog=${scen.programmaUren}u lijn=${scen.lijnUren}u raadpl=${scen.raadplegenUren}u (van ${scen.totaalUren}u)`,
    );

    // Schrijf totalenPerJaar terug met programma/lijn/raadplegen-velden
    if (scen.totalenPerJaar && Array.isArray(scen.totalenPerJaar)) {
      for (const t of scen.totalenPerJaar) {
        const b = perJaar.get(t.jaar);
        if (b) {
          t.programmaUren = Math.round(b.prog);
          t.lijnUren = Math.round(b.lijn);
          t.raadplegenUren = Math.round(b.raadpl);
          perJaarReport.push({
            scenario: scenKey,
            jaar: t.jaar,
            uren: t.uren,
            programmaUren: t.programmaUren,
            lijnUren: t.lijnUren,
            raadplegenUren: t.raadplegenUren,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Stap C: marker zetten
  // ─────────────────────────────────────────────────────────
  s7.interpretatieBToegepast = true;
  s7.interpretatieBMarker = {
    timestamp: new Date().toISOString(),
    toelichting:
      "Interpretatie B — driedeling programma/lijn/raadplegen. Geconsulteerde uren tellen NIET mee als programma OF lijn; ze vormen een derde uren-type 'raadplegen' (incidentele consultatie, beperkt tijdsbeslag).",
    verdeling: VERDELING,
  };

  // ─── Snapshot rapport schrijven ──
  const reportPath = join(process.cwd(), "INTERPRETATIE-B-CLASSIFICATIE.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        sessieId: SESSION_ID,
        toegepastOp: s7.interpretatieBMarker.timestamp,
        verdeling: VERDELING,
        rolClassificaties: rolReport,
        scenarioDomeinUitsplitsing: scenReport,
        scenarioPerJaarUitsplitsing: perJaarReport,
        scenarioTotalen: Object.fromEntries(
          (Object.keys(scenarios) as ScenarioKey[]).map((k) => [
            k,
            scenarios[k]
              ? {
                  totaalUren: scenarios[k]!.totaalUren,
                  programmaUren: scenarios[k]!.programmaUren,
                  lijnUren: scenarios[k]!.lijnUren,
                  raadplegenUren: scenarios[k]!.raadplegenUren,
                }
              : null,
          ]),
        ),
        voorNa,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\n✓ Rapport geschreven naar ${reportPath}`);

  if (!APPLY) {
    console.log("\n[dry-run] Geen wijzigingen geschreven naar Supabase. Gebruik --apply.");
    return;
  }

  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: sess })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("Update gefaald:", upErr);
    process.exit(1);
  }
  console.log("✓ Geschreven naar Supabase.");
}

void main();
