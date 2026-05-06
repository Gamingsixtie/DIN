// Dry-run: simuleer verplaatsing van sectormanager_po in mens-domein
// van categorie "kernteam" → "trainings_deelnemer".
// Doet de volle herclassificeerRol-logica in-memory; SCHRIJFT NIETS terug
// naar Supabase. Output = AUDIT-DRY-RUN-VERPLAATSEN.md

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
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

// ── Types (lokaal gespiegeld vanuit StapInterneUren.tsx) ───────────────────
type Domein = "cultuur" | "mens" | "data_systemen" | "processen";
type ScenarioLabel = "optimaal" | "plus20" | "min20" | "advies";
type LezingCCat = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";
type FaseType = "piek" | "niet-piek" | "borging" | "basis" | "vaardigheid" | "realisatie" | "acceptatie";

type Rol = {
  functieId: string;
  functieNaam?: string;
  aantal: number;
  uren: number;
  uurtarief: number;
  kosten: number;
  categorie?: string;
  programmaPct: number;
  lijnPct: number;
  raadplegenPct: number;
  urenPerPersoon?: number;
};
type JaarBlok = { jaar: number; rollen: Rol[]; totaalUren: number; totaalKosten: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number };
type DomeinBlok = {
  domein: Domein;
  jaren: JaarBlok[];
  totaalUren: number;
  totaalKosten: number;
  programmaUren: number;
  lijnUren: number;
  raadplegenUren: number;
};

// ── Constants gespiegeld ──────────────────────────────────────────────────
const LEZING_C_UREN_NIVEAUS: Record<LezingCCat, { piek: number; nietPiek: number; borging: number }> = {
  leider: { piek: 80, nietPiek: 40, borging: 25 },
  kernteam: { piek: 40, nietPiek: 15, borging: 10 },
  trainings_deelnemer: { piek: 0, nietPiek: 0, borging: 0 },
  geconsulteerd: { piek: 0, nietPiek: 0, borging: 0 },
};

const LEZING_C_PCTS: Record<LezingCCat, { programma: number; lijn: number; raadplegen: number }> = {
  leider: { programma: 0.9, lijn: 0.1, raadplegen: 0 },
  kernteam: { programma: 0.8, lijn: 0.2, raadplegen: 0 },
  trainings_deelnemer: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  geconsulteerd: { programma: 0, lijn: 0, raadplegen: 1.0 },
};
const LEZING_C_PCTS_TRAININGS_PER_DOMEIN: Partial<Record<Domein, { programma: number; lijn: number; raadplegen: number }>> = {
  mens: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  data_systemen: { programma: 0.7, lijn: 0.3, raadplegen: 0 },
};

function classificeerFaseString(fase: string | undefined): FaseType {
  const f = (fase ?? "").toLowerCase();
  if (!f) return "niet-piek";
  if (f.includes("basistraining") || f.includes("basis")) return "basis";
  if (f.includes("vaardigheid")) return "vaardigheid";
  if (f.includes("acceptatie")) return "acceptatie";
  if (
    f.includes("borging") || f.includes("nazorg") || f.includes("verankering") ||
    f.includes("continu") || f.includes("continue") || f.includes("standaardisatie") ||
    f.includes("beheer") || f.includes("optimalisatie") || f.includes("doorontwikkeling") ||
    f.includes("ontwikkeling")
  ) return "borging";
  if (
    f.includes("realisatie") || f.includes("kern") || f.includes("integraties") ||
    f.includes("uitrol") || f.includes("go-live") || f.includes("pilot") ||
    f.includes("toepassing") || f.includes("blok 1") || f.includes("blok 2")
  ) {
    if (f.includes("realisatie")) return "realisatie";
    return "piek";
  }
  return "niet-piek";
}

type BegrotingInspMin = { inspanningTitel?: string; domein?: Domein; verdelingPerJaar?: Array<{ jaar: number; euro: number; fase: string }> };
type BegrotingScenarioMin = { inspanningen?: BegrotingInspMin[] };

function bepaalFaseType(scenario: BegrotingScenarioMin | null | undefined, domein: Domein, jaar: number): FaseType {
  if (!scenario?.inspanningen) return "niet-piek";
  const tally: Record<FaseType, number> = {
    piek: 0, "niet-piek": 0, borging: 0, basis: 0, vaardigheid: 0, realisatie: 0, acceptatie: 0,
  };
  for (const i of scenario.inspanningen) {
    if (i.domein !== domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      if (v.jaar !== jaar) continue;
      const t = classificeerFaseString(v.fase);
      tally[t] += v.euro ?? 0;
    }
  }
  const specifiek: FaseType[] = ["basis", "vaardigheid", "realisatie", "acceptatie"];
  let specMax: { type: FaseType | null; sum: number } = { type: null, sum: 0 };
  for (const t of specifiek) if (tally[t] > specMax.sum) specMax = { type: t, sum: tally[t] };
  if (specMax.type) return specMax.type;
  const grof: FaseType[] = ["piek", "borging", "niet-piek"];
  let grofMax: { type: FaseType; sum: number } = { type: "niet-piek", sum: -1 };
  for (const t of grof) if (tally[t] > grofMax.sum) grofMax = { type: t, sum: tally[t] };
  return grofMax.type;
}

function pieksjaren(scenario: BegrotingScenarioMin | null | undefined, domein: Domein): number[] {
  if (!scenario?.inspanningen) return [];
  const jaren = new Set<number>();
  const perJaarType = new Map<number, Record<FaseType, number>>();
  for (const i of scenario.inspanningen) {
    if (i.domein !== domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      jaren.add(v.jaar);
      const cur = perJaarType.get(v.jaar) ?? { piek: 0, "niet-piek": 0, borging: 0, basis: 0, vaardigheid: 0, realisatie: 0, acceptatie: 0 };
      const t = classificeerFaseString(v.fase);
      cur[t] += v.euro ?? 0;
      perJaarType.set(v.jaar, cur);
    }
  }
  const piekTypes: FaseType[] = ["piek", "basis", "vaardigheid", "realisatie", "acceptatie"];
  const sorted = [...jaren].sort((a, b) => a - b);
  return sorted.filter((j) => {
    const t = perJaarType.get(j);
    if (!t) return false;
    return piekTypes.some((p) => t[p] > 0);
  });
}

function berekenRolUrenPerPersoonPerJaar(categorie: LezingCCat, faseType: FaseType, domein: Domein, jaar: number, alleJarenPiek: number[]): number {
  if (categorie === "leider" || categorie === "kernteam") {
    const niveaus = LEZING_C_UREN_NIVEAUS[categorie];
    if (faseType === "borging") return niveaus.borging;
    if (faseType === "piek" || faseType === "basis" || faseType === "vaardigheid" || faseType === "realisatie" || faseType === "acceptatie") return niveaus.piek;
    return niveaus.nietPiek;
  }
  if (categorie === "trainings_deelnemer") {
    if (domein === "mens") {
      if (faseType === "basis") return 24;
      if (faseType === "vaardigheid") return 22;
      return 0;
    }
    if (domein === "data_systemen") {
      if (faseType === "realisatie") return 14;
      if (faseType === "acceptatie") return 14;
      return 0;
    }
    return 0;
  }
  if (categorie === "geconsulteerd") {
    const idx = alleJarenPiek.indexOf(jaar);
    if (idx === 0 || idx === 1) return 3;
    return 0;
  }
  return 0;
}

function pctsVoorCategorie(categorie: LezingCCat, domein: Domein) {
  if (categorie === "trainings_deelnemer") {
    return LEZING_C_PCTS_TRAININGS_PER_DOMEIN[domein] ?? LEZING_C_PCTS.trainings_deelnemer;
  }
  return LEZING_C_PCTS[categorie];
}

function berekenGeindexeerdTarief(basis: number, refJaar: number, pct: number, jaar: number): number {
  const jaren = Math.max(0, jaar - refJaar);
  return Math.round(basis * Math.pow(1 + pct, jaren));
}

// ── Categorie-resolver: wat is de huidige categorie van een rol? ──────────
function resolveerCategorie(rol: Rol, domein: Domein, marker: Record<string, Record<string, string>>): LezingCCat {
  // 1. expliciete override
  const o = marker?.[domein]?.[rol.functieId];
  if (o === "leider" || o === "kernteam" || o === "trainings_deelnemer" || o === "geconsulteerd") return o;
  // 2. rol.categorie
  const c = rol.categorie;
  if (c === "leider" || c === "kernteam" || c === "trainings_deelnemer" || c === "geconsulteerd") return c;
  return "kernteam";
}

// ── Hoofd-simulatie ───────────────────────────────────────────────────────
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await sb.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) { console.error("session not found"); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const stap7 = stap4.stap7InterneUren as Record<string, unknown>;
  const advies = stap4.interneUrenAdvies as Record<string, unknown> | undefined ?? {
    scenarios: stap7.scenarios,
    interneUrenLezing: stap7.interneUrenLezing,
  };

  const begrotingAdvies = stap4.begrotingAdvies as Record<string, unknown>;
  const tariefSet = stap7.uurtariefSettings as { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
  const basisTarief = tariefSet?.basisTarief ?? 70;
  const referentiejaar = tariefSet?.referentiejaar ?? 2025;
  const indexatiePct = tariefSet?.indexatiePercentage ?? 0.05;

  const target = { domein: "mens" as Domein, functieId: "sectormanager_po", nieuweCategorie: "trainings_deelnemer" as LezingCCat };

  // selectiePerDomein → aantal personen
  const selPerDomein = (stap7.selectiePerDomein as Record<string, unknown>) ?? {};
  function aantalVoor(dom: Domein, fid: string): number {
    const lijst = (selPerDomein as Record<string, unknown>)[dom];
    if (Array.isArray(lijst)) {
      const m = lijst.find((r: Record<string, unknown>) => r.rolId === fid);
      if (m && typeof m === "object") {
        const a = (m as { aantal?: number }).aantal;
        if (typeof a === "number") return a;
      }
    }
    return 1;
  }
  const aantal = aantalVoor(target.domein, target.functieId);

  // Scenarios
  const scenariosIn = (stap7.scenarios ?? (advies as Record<string, unknown>).scenarios) as Record<string, Record<string, unknown>>;
  const begrotingScenarios = (begrotingAdvies?.scenarios as Record<string, BegrotingScenarioMin>) ?? {};

  const markerVoor: Record<string, Record<string, string>> = {};
  // Bouw huidige marker uit interneUrenLezing.rolCategorieen (kan ontbreken)
  const lezingMarker = (stap7.interneUrenLezing as Record<string, unknown>) ?? {};
  const rolCats = (lezingMarker.rolCategorieen as Record<string, Record<string, string>>) ?? {};
  Object.assign(markerVoor, rolCats);

  // Marker NA (deep-clone + override)
  const markerNa: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(markerVoor));
  markerNa[target.domein] = { ...(markerNa[target.domein] ?? {}), [target.functieId]: target.nieuweCategorie };

  // Voor elk scenario simuleer de wijziging
  const scenarioReports: Array<Record<string, unknown>> = [];

  for (const scenKey of ["optimaal", "plus20", "min20", "advies"] as ScenarioLabel[]) {
    const scen = scenariosIn[scenKey] as { domeinen: DomeinBlok[]; totaalUren: number; totaalKosten: number; programmaUren: number; lijnUren: number; raadplegenUren: number; totalenPerJaar?: Array<Record<string, unknown>> };
    if (!scen) continue;
    const begScen = begrotingScenarios[scenKey] ?? null;

    const piekJarenLijst: Record<Domein, number[]> = {
      cultuur: pieksjaren(begScen, "cultuur"),
      mens: pieksjaren(begScen, "mens"),
      data_systemen: pieksjaren(begScen, "data_systemen"),
      processen: pieksjaren(begScen, "processen"),
    };

    // ─ VOOR — aggregeer
    const voor = aggregeerScenario(scen, markerVoor);

    // ─ NA — clone + pas wijziging toe
    const newDomeinen: DomeinBlok[] = scen.domeinen.map((d) => {
      const isTargetDomein = d.domein === target.domein;
      const newJaren: JaarBlok[] = d.jaren.map((jr) => {
        let nieuweRollen = jr.rollen;
        if (isTargetDomein) {
          const heeftRol = jr.rollen.some((r) => r.functieId === target.functieId);
          if (heeftRol) {
            const ft = bepaalFaseType(begScen, d.domein, jr.jaar);
            const pj = piekJarenLijst[d.domein];
            const upp = berekenRolUrenPerPersoonPerJaar(target.nieuweCategorie, ft, d.domein, jr.jaar, pj);
            const totaal = upp * aantal;
            const tarief = berekenGeindexeerdTarief(basisTarief, referentiejaar, indexatiePct, jr.jaar);
            const pcts = pctsVoorCategorie(target.nieuweCategorie, d.domein);
            nieuweRollen = jr.rollen.map((r) => {
              if (r.functieId !== target.functieId) return r;
              return { ...r, uren: totaal, urenPerPersoon: upp, uurtarief: tarief, kosten: totaal * tarief, categorie: target.nieuweCategorie, programmaPct: pcts.programma, lijnPct: pcts.lijn, raadplegenPct: pcts.raadplegen };
            });
          }
        }
        const totaalU = nieuweRollen.reduce((s, x) => s + (x.uren ?? 0), 0);
        const totaalK = nieuweRollen.reduce((s, x) => s + (x.kosten ?? 0), 0);
        return { ...jr, rollen: nieuweRollen, totaalUren: totaalU, totaalKosten: totaalK };
      });

      // Hercalc programma/lijn/raadplegen voor dit domein o.b.v. categorie-pcts (NA-marker)
      let pU = 0, lU = 0, rU = 0;
      for (const jr of newJaren) {
        for (const r of jr.rollen) {
          const cat = resolveerCategorie(r, d.domein, markerNa);
          const pcts = pctsVoorCategorie(cat, d.domein);
          const u = r.uren ?? 0;
          pU += Math.round(u * pcts.programma);
          lU += Math.round(u * pcts.lijn);
          rU += Math.round(u * pcts.raadplegen);
        }
      }
      const dT = newJaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0);
      const dK = newJaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0);
      return { ...d, jaren: newJaren, totaalUren: dT, totaalKosten: dK, programmaUren: pU, lijnUren: lU, raadplegenUren: rU };
    });

    const naScenObj: typeof scen = {
      ...scen,
      domeinen: newDomeinen,
      totaalUren: newDomeinen.reduce((s, d) => s + d.totaalUren, 0),
      totaalKosten: newDomeinen.reduce((s, d) => s + d.totaalKosten, 0),
      programmaUren: newDomeinen.reduce((s, d) => s + d.programmaUren, 0),
      lijnUren: newDomeinen.reduce((s, d) => s + d.lijnUren, 0),
      raadplegenUren: newDomeinen.reduce((s, d) => s + d.raadplegenUren, 0),
    };

    const na = aggregeerScenario(naScenObj as never, markerNa);

    // ─ Per-jaar diff voor target rol
    const mensVoor = scen.domeinen.find((x) => x.domein === target.domein)!;
    const mensNa = newDomeinen.find((x) => x.domein === target.domein)!;
    const perJaarTarget: Array<{ jaar: number; voor_uren: number; na_uren: number; faseType: FaseType }> = [];
    for (const jr of mensVoor.jaren) {
      const rVoor = jr.rollen.find((r) => r.functieId === target.functieId);
      const jrNa = mensNa.jaren.find((j) => j.jaar === jr.jaar);
      const rNa = jrNa?.rollen.find((r) => r.functieId === target.functieId);
      const ft = bepaalFaseType(begScen, target.domein, jr.jaar);
      perJaarTarget.push({ jaar: jr.jaar, voor_uren: rVoor?.uren ?? 0, na_uren: rNa?.uren ?? 0, faseType: ft });
    }

    // J1 (startjaar = 2026) cap-check
    const j1 = mensNa.jaren.find((j) => j.jaar === 2026);
    const j1Cap = scenKey === "advies" || scenKey === "plus20" ? 290 : 250;

    scenarioReports.push({ scenKey, voor, na, perJaarTarget, mensVoorTotaal: mensVoor.totaalUren, mensNaTotaal: mensNa.totaalUren, mensVoorProgramma: mensVoor.programmaUren, mensNaProgramma: mensNa.programmaUren, mensVoorLijn: mensVoor.lijnUren, mensNaLijn: mensNa.lijnUren, mensVoorRaad: mensVoor.raadplegenUren, mensNaRaad: mensNa.raadplegenUren, j1Mens: j1?.totaalUren ?? 0, j1Cap });
  }

  // ── Rapport schrijven ───────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push("# Audit dry-run — verplaats sectormanager_po (mens, kernteam → trainings_deelnemer)");
  lines.push("");
  lines.push("**Sessie:** d8b97442-ce8f-4134-b2c7-67dc8e3a3f93");
  lines.push("**Gesimuleerde actie:** verplaats `sectormanager_po` in mens-domein van `kernteam` → `trainings_deelnemer`");
  lines.push(`**Aantal personen:** ${aantal}`);
  lines.push(`**Tarief-instellingen:** basis €${basisTarief} / ref ${referentiejaar} / index ${(indexatiePct * 100).toFixed(1)}%/jr`);
  lines.push("");
  lines.push("> Geen Supabase-write. Alle waarden in-memory afgeleid via dezelfde logica als `herclassificeerRol(...)`.");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const r of scenarioReports) {
    const sk = r.scenKey as string;
    lines.push(`## Scenario \`${sk}\``);
    lines.push("");

    // sectormanager_po per jaar
    lines.push("### sectormanager_po — uren per jaar (voor → na)");
    lines.push("");
    lines.push("| Jaar | Fase-type | Voor (kernteam) | Na (trainings_deelnemer) | Δ |");
    lines.push("|---|---|---:|---:|---:|");
    for (const p of (r.perJaarTarget as Array<{ jaar: number; voor_uren: number; na_uren: number; faseType: string }>)) {
      const delta = p.na_uren - p.voor_uren;
      lines.push(`| ${p.jaar} | ${p.faseType} | ${p.voor_uren} | ${p.na_uren} | ${delta >= 0 ? "+" : ""}${delta} |`);
    }
    const totVoor = (r.perJaarTarget as Array<{ voor_uren: number }>).reduce((s, p) => s + p.voor_uren, 0);
    const totNa = (r.perJaarTarget as Array<{ na_uren: number }>).reduce((s, p) => s + p.na_uren, 0);
    lines.push(`| **TOT** | — | **${totVoor}** | **${totNa}** | **${totNa - totVoor >= 0 ? "+" : ""}${totNa - totVoor}** |`);
    lines.push("");

    // Mens-domein totaal
    lines.push("### Mens-domein totalen (voor → na)");
    lines.push("");
    lines.push("| Metric | Voor | Na | Δ |");
    lines.push("|---|---:|---:|---:|");
    lines.push(`| Totaal uren | ${r.mensVoorTotaal} | ${r.mensNaTotaal} | ${(r.mensNaTotaal as number) - (r.mensVoorTotaal as number)} |`);
    lines.push(`| Programma  | ${r.mensVoorProgramma} | ${r.mensNaProgramma} | ${(r.mensNaProgramma as number) - (r.mensVoorProgramma as number)} |`);
    lines.push(`| Lijn       | ${r.mensVoorLijn} | ${r.mensNaLijn} | ${(r.mensNaLijn as number) - (r.mensVoorLijn as number)} |`);
    lines.push(`| Raadplegen | ${r.mensVoorRaad} | ${r.mensNaRaad} | ${(r.mensNaRaad as number) - (r.mensVoorRaad as number)} |`);
    lines.push("");

    // Scenario-totaal
    const v = r.voor as { totaal: number; programma: number; lijn: number; raadplegen: number };
    const n = r.na as { totaal: number; programma: number; lijn: number; raadplegen: number };
    lines.push("### Scenario-totalen (voor → na)");
    lines.push("");
    lines.push("| Metric | Voor | Na | Δ |");
    lines.push("|---|---:|---:|---:|");
    lines.push(`| Totaal uren | ${v.totaal} | ${n.totaal} | ${n.totaal - v.totaal} |`);
    lines.push(`| Programma  | ${v.programma} | ${n.programma} | ${n.programma - v.programma} |`);
    lines.push(`| Lijn       | ${v.lijn} | ${n.lijn} | ${n.lijn - v.lijn} |`);
    lines.push(`| Raadplegen | ${v.raadplegen} | ${n.raadplegen} | ${n.raadplegen - v.raadplegen} |`);
    lines.push("");

    // Som-check
    const sumVoor = v.programma + v.lijn + v.raadplegen;
    const sumNa = n.programma + n.lijn + n.raadplegen;
    const okVoor = Math.abs(sumVoor - v.totaal) <= 4;
    const okNa = Math.abs(sumNa - n.totaal) <= 4;
    lines.push("### Som-check (programma + lijn + raadplegen ≈ totaal)");
    lines.push("");
    lines.push(`- Voor: ${v.programma} + ${v.lijn} + ${v.raadplegen} = ${sumVoor} vs totaal ${v.totaal} → ${okVoor ? "OK" : "AFWIJKING"}`);
    lines.push(`- Na : ${n.programma} + ${n.lijn} + ${n.raadplegen} = ${sumNa} vs totaal ${n.totaal} → ${okNa ? "OK" : "AFWIJKING"}`);
    lines.push("");

    // J1 cap
    const cap = r.j1Cap as number;
    const j1u = r.j1Mens as number;
    lines.push(`### 2026 J1 mens-cap: ${j1u}u (limiet ${cap}u) → ${j1u <= cap ? "OK" : "OVERSCHREDEN"}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("## Edge-case-noties");
  lines.push("");
  lines.push("- **Enige PO-kernteam-rol?** Na de wijziging is `sectormanager_po` geen kernteam-rol meer in mens. PO-borging in mens-domein steunt nu nog op de overgebleven kernteam-rollen (`sectormanager_vo`, `sectormanager_prof`, `manager_klantcontact`, `custom-hr-curriculum-mens`) plus de leider. PO-specifieke borging gaat in mens-domein verloren — let op bij interpretatie.");
  lines.push("- **2026 J1-mens-cap.** Adviesregel: ≤ 290u in advies/plus20, ≤ 250u in optimaal/min20. Cap-status zie per scenario hierboven.");
  lines.push("- **Marker-update is globaal.** `interneUrenLezing.rolCategorieen[mens][sectormanager_po] = trainings_deelnemer` werkt door op ALLE scenarios (consistent).");
  lines.push("");
  lines.push("## Diagnose");
  lines.push("");
  lines.push("- Verwachte uren per persoon na switch in mens-domein:");
  lines.push("  - basis-jaar → 24u/persoon");
  lines.push("  - vaardigheid-jaar → 22u/persoon");
  lines.push("  - alle andere fasen (niet-piek, borging, piek-non-training) → 0u/persoon");
  lines.push("- Pcts trainings_deelnemer in mens: 50% programma / 50% lijn / 0% raadplegen.");
  lines.push("- Aantal personen sectormanager_po = " + aantal + ".");
  lines.push("");

  const outPath = join(process.cwd(), "AUDIT-DRY-RUN-VERPLAATSEN.md");
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log("✓ rapport geschreven:", outPath);
}

function aggregeerScenario(scen: { domeinen: DomeinBlok[] }, marker: Record<string, Record<string, string>>) {
  let totaal = 0, programma = 0, lijn = 0, raadplegen = 0;
  for (const d of scen.domeinen) {
    for (const jr of d.jaren) {
      for (const r of jr.rollen) {
        const cat = resolveerCategorie(r, d.domein, marker);
        const pcts = pctsVoorCategorie(cat, d.domein);
        const u = r.uren ?? 0;
        totaal += u;
        programma += Math.round(u * pcts.programma);
        lijn += Math.round(u * pcts.lijn);
        raadplegen += Math.round(u * pcts.raadplegen);
      }
    }
  }
  return { totaal, programma, lijn, raadplegen };
}

void main();
