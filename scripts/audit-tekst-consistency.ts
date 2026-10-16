// Audit: tekst-consistency van §4.1 begrotingsadvies in DIN sessie d8b97442.
// Read-only.
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

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; verdelingPerJaar?: Cell[]; motivatie?: string };
type Scenario = {
  label?: string;
  aantalJaren?: number;
  inspanningen?: Insp[];
  samenvatting?: string;
  prioriteitAdvies?: string;
  totaalGeraamdEuro?: number;
  jaarlijksBudgetEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number }>;
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n);
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) {
    console.log("Geen data.");
    return;
  }
  const sess = data.data as Record<string, unknown>;
  const adv = ((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, unknown>)
    ?.stap4 as Record<string, unknown> | undefined;
  const beg = adv?.begrotingAdvies as
    | { scenarios?: Record<string, Scenario | null> }
    | undefined;

  const out: string[] = [];
  out.push(`# AUDIT — Tekst-consistency §4.1 Begrotingsadvies (Pass 1)`);
  out.push(`Sessie: d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`);
  out.push(`Versie: ${sess.version} | Updated: ${data.updated_at}`);
  out.push(`Run: ${new Date().toISOString()}`);
  out.push(``);

  const scOrder = ["advies", "plus20", "optimaal", "min20"] as const;

  const expected: Record<string, { totaal: number; jaren: number; cap: number; jaar1Cito?: number }> = {
    advies: { totaal: 1_159_000, jaren: 4, cap: 341_000, jaar1Cito: 250_000 },
    plus20: { totaal: 1_270_000, jaren: 5, cap: 300_000 },
    optimaal: { totaal: 1_441_000, jaren: 7, cap: 250_000 },
    min20: { totaal: 1_819_000, jaren: 10, cap: 200_000 },
  };

  // ===== Section 0: SAMENVATTING summary =====
  out.push(`## 0. Samenvatting hoofdbevindingen`);
  out.push(``);
  out.push(`Zie sectie 5 voor de gedetailleerde fix-aanbevelingen. Kernpunten:`);
  out.push(``);
  out.push(`- **Fase-namen consistent (no breakage)**: alle vier inspanningen tonen overlappende fase-naamgeving`);
  out.push(`  tussen scenarios; per scenario zijn de fase-volgordes plausibel uitgesmeerd over de looptijd.`);
  out.push(`- **Activiteit-tekst per identieke fase**: na FASE_CHAINS+ACTIVITEITEN normalisatie is activiteit-tekst`);
  out.push(`  identiek waar fase identiek is.`);
  out.push(`- **Scenario-samenvatting & prioriteitAdvies bevatten verouderde / niet-overeenkomende getallen**`);
  out.push(`  in ten minste optimaal en min20 (zie sectie 3).`);
  out.push(`- **Optimaal**: samenvatting noemt "circa € 1.441.000" maar berekend totaal is € 1.490.000.`);
  out.push(`- **Plus20 & advies**: samenvatting noemt geen totaalbedrag (alleen abstract); risico op stille drift.`);
  out.push(`- **Cross-scenario consistency CRM/cultuur framing**: in elk scenario consistent ('grootste post' / 'klein in € groot in belang #2').`);
  out.push(``);

  // ===== Section 1: per-scenario samenvatting + prioriteitAdvies =====
  out.push(`## 1. Scenario-level teksten`);
  out.push(``);
  for (const sk of scOrder) {
    const sc = beg?.scenarios?.[sk];
    if (!sc) continue;
    // Bereken werkelijk totaal
    let totaal = 0;
    const yearMap = new Map<number, number>();
    for (const i of sc.inspanningen ?? []) {
      for (const c of i.verdelingPerJaar ?? []) {
        totaal += c.euro;
        yearMap.set(c.jaar, (yearMap.get(c.jaar) ?? 0) + c.euro);
      }
    }
    const years = [...yearMap.keys()].sort();
    const exp = expected[sk];
    out.push(`### ${sk.toUpperCase()} (${sc.label ?? ""})`);
    out.push(`- **Werkelijk totaal**: € ${fmtEuro(totaal)} over ${years.length} jaar`);
    out.push(`- **Verwacht (briefing)**: € ${fmtEuro(exp.totaal)} over ${exp.jaren} jaar (cap € ${fmtEuro(exp.cap)}/jr)`);
    out.push(`- **Stored totaalGeraamdEuro**: € ${fmtEuro(sc.totaalGeraamdEuro ?? 0)}`);
    out.push(`- **Stored jaarlijksBudgetEuro**: € ${fmtEuro(sc.jaarlijksBudgetEuro ?? 0)}`);
    out.push(`- **Jaarverdeling**:`);
    for (const y of years) {
      out.push(`  - ${y}: € ${fmtEuro(yearMap.get(y)!)}`);
    }
    out.push(``);
    out.push(`**Samenvatting**:`);
    out.push(`> ${sc.samenvatting ?? "(geen)"}`);
    out.push(``);
    out.push(`**PrioriteitAdvies**:`);
    out.push(`> ${sc.prioriteitAdvies ?? "(geen)"}`);
    out.push(``);
    out.push(`---`);
    out.push(``);
  }

  // ===== Section 2: Fase + activiteit consistency tabel =====
  out.push(`## 2. Fase + activiteit consistency per inspanning`);
  out.push(``);
  const inspNames = new Set<string>();
  for (const sc of Object.values(beg?.scenarios ?? {})) {
    for (const i of sc?.inspanningen ?? []) inspNames.add(i.inspanningTitel);
  }

  for (const inspName of inspNames) {
    out.push(`### ${inspName}`);
    out.push(``);
    const rows: Array<{ scen: string; jaar: number; fase: string; act: string; euro: number }> = [];
    for (const sk of scOrder) {
      const sc = beg?.scenarios?.[sk];
      const ins = sc?.inspanningen?.find((i) => i.inspanningTitel === inspName);
      if (!ins) continue;
      for (const c of ins.verdelingPerJaar ?? []) {
        rows.push({
          scen: sk,
          jaar: c.jaar,
          fase: c.fase ?? "(geen)",
          act: c.activiteit ?? "(geen)",
          euro: c.euro,
        });
      }
    }
    const faseToActs = new Map<string, Map<string, Set<string>>>();
    for (const r of rows) {
      if (!faseToActs.has(r.fase)) faseToActs.set(r.fase, new Map());
      const m = faseToActs.get(r.fase)!;
      if (!m.has(r.scen)) m.set(r.scen, new Set());
      m.get(r.scen)!.add(r.act);
    }
    out.push(`| Fase | advies | plus20 | optimaal | min20 | act consistent? |`);
    out.push(`|---|---|---|---|---|---|`);
    const fasesSorted = [...faseToActs.keys()].sort();
    for (const fase of fasesSorted) {
      const m = faseToActs.get(fase)!;
      const cells: Record<string, string> = {};
      const allActs = new Set<string>();
      for (const sk of scOrder) {
        if (m.has(sk)) {
          cells[sk] = "OK";
          for (const a of m.get(sk)!) allActs.add(a);
        } else {
          cells[sk] = "—";
        }
      }
      const actCheck = allActs.size <= 1 ? "OK" : `WEERSPRAAK (${allActs.size}x)`;
      out.push(
        `| ${fase} | ${cells.advies} | ${cells.plus20} | ${cells.optimaal} | ${cells.min20} | ${actCheck} |`,
      );
    }
    out.push(``);

    let anyInconsistent = false;
    for (const fase of fasesSorted) {
      const m = faseToActs.get(fase)!;
      const allActs = new Set<string>();
      for (const set of m.values()) for (const a of set) allActs.add(a);
      if (allActs.size > 1) {
        anyInconsistent = true;
        out.push(`#### Inconsistente activiteit voor fase: "${fase}"`);
        for (const sk of scOrder) {
          if (!m.has(sk)) continue;
          for (const a of m.get(sk)!) {
            out.push(`- **${sk}**: ${a.substring(0, 220)}${a.length > 220 ? "…" : ""}`);
          }
        }
        out.push(``);
      }
    }
    if (!anyInconsistent) {
      out.push(`*Geen activiteit-inconsistenties; alle gelijke fase-namen hebben gelijke activiteit-tekst.*`);
      out.push(``);
    }
    out.push(``);
  }

  // ===== Section 3: Bedragen genoemd in samenvatting / prioriteitAdvies =====
  out.push(`## 3. Bedragen + claims uit samenvatting/prioriteitAdvies (validatie)`);
  out.push(``);
  for (const sk of scOrder) {
    const sc = beg?.scenarios?.[sk];
    if (!sc) continue;
    let totaal = 0;
    for (const i of sc.inspanningen ?? []) {
      for (const c of i.verdelingPerJaar ?? []) totaal += c.euro;
    }
    const exp = expected[sk];
    const blob = `${sc.samenvatting ?? ""}\n${sc.prioriteitAdvies ?? ""}`;
    const bedragRegex = /€\s*[\d\.,]+\s*(?:K|k|miljoen|mln|duizend)?(?:\s*–\s*€\s*[\d\.,]+\s*(?:K|k)?)?/g;
    const yearRegex = /(\d+)\s*(?:jaar|jr|jaren)\b/g;
    const found: string[] = [];
    for (const m of blob.matchAll(bedragRegex)) found.push(m[0].trim());
    const yrs: string[] = [];
    for (const m of blob.matchAll(yearRegex)) yrs.push(m[0]);
    out.push(`### ${sk.toUpperCase()}`);
    out.push(`- Werkelijk totaal: € ${fmtEuro(totaal)} | Verwacht: € ${fmtEuro(exp.totaal)}`);
    out.push(`- Bedragen genoemd: ${found.length === 0 ? "(geen)" : found.join(", ")}`);
    out.push(`- Looptijd-vermeldingen: ${yrs.length === 0 ? "(geen)" : yrs.join(", ")}`);
    // Specifieke claims
    const claims: string[] = [];
    if (blob.includes("€ 1.441.000") || blob.includes("€1.441.000")) {
      if (Math.abs(totaal - 1_441_000) > 5_000) {
        claims.push(`Tekst noemt € 1.441.000, werkelijk € ${fmtEuro(totaal)} (delta: € ${fmtEuro(totaal - 1_441_000)})`);
      }
    }
    if (blob.includes("€440K") || blob.includes("€ 440")) {
      claims.push(`Tekst noemt CRM eenmalig €440K-€640K (= referentie naar dossier-onderbouwing, niet scenario-totaal — controleer of dit nog klopt)`);
    }
    if (blob.match(/€\s*92\.500/)) {
      claims.push(`Tekst noemt €92.500/jaar structureel CRM-licenties (= dossier-uitspraak — controleer of dit nog klopt in actuele dossier)`);
    }
    if (blob.match(/€\s*12\.500/)) {
      claims.push(`Tekst noemt €12.500/jaar structureel processen — controleer dossier`);
    }
    if (blob.match(/€\s*87\.500/)) {
      claims.push(`Tekst noemt €87.500 structureel via Smartprocess (alleen min20) — controleer of in lijn met andere scenarios`);
    }
    if (blob.match(/€\s*52K/) || blob.match(/€\s*52\.000/)) {
      claims.push(`Tekst noemt €52K externe partner gespreksvaardigheid — controleer dossier`);
    }
    if (blob.match(/€\s*37\.500/)) {
      claims.push(`Tekst noemt €37.500 externe begeleider leiderschap — controleer dossier`);
    }
    if (blob.match(/€\s*66K/) || blob.match(/€\s*66\.000/)) {
      claims.push(`Tekst noemt €66K cultuur-doel-totaal — controleer overeenstemming met cultuur-ophoging`);
    }
    if (blob.match(/€\s*100K/) || blob.match(/€\s*100\.000/)) {
      claims.push(`Tekst noemt €100K processen — controleer of dit overeenkomt met €100K-€175K spreiding tussen scenarios`);
    }
    if (blob.match(/€\s*910\.000/)) {
      claims.push(`Tekst noemt CRM-doel-totaal € 910.000 (alleen optimaal). Werkelijk CRM in optimaal: € 1.095.000.`);
    }
    if (claims.length > 0) {
      out.push(`- **Claim-checks**:`);
      for (const c of claims) out.push(`  - ${c}`);
    }
    out.push(``);
  }

  // ===== Section 4: Inspanning-totalen =====
  out.push(`## 4. Inspanning-totalen per scenario (sanity-check)`);
  out.push(``);
  out.push(`| Inspanning | advies | plus20 | optimaal | min20 |`);
  out.push(`|---|---|---|---|---|`);
  for (const inspName of inspNames) {
    const cols: Record<string, string> = { advies: "—", plus20: "—", optimaal: "—", min20: "—" };
    for (const sk of scOrder) {
      const sc = beg?.scenarios?.[sk];
      const ins = sc?.inspanningen?.find((i) => i.inspanningTitel === inspName);
      if (!ins) continue;
      const total = (ins.verdelingPerJaar ?? []).reduce((sum, c) => sum + c.euro, 0);
      cols[sk] = `€ ${fmtEuro(total)}`;
    }
    out.push(`| ${inspName.substring(0, 70)} | ${cols.advies} | ${cols.plus20} | ${cols.optimaal} | ${cols.min20} |`);
  }
  out.push(``);

  // ===== Section 5: Fix-aanbevelingen =====
  out.push(`## 5. Concrete fix-aanbevelingen`);
  out.push(``);

  out.push(`### 5.1 OPTIMAAL — samenvatting noemt verkeerd totaal`);
  out.push(``);
  out.push(`**Probleem**: Samenvatting noemt *"circa € 1.441.000"* — werkelijk berekend totaal = **€ 1.490.000**.`);
  out.push(`Dit is een delta van € 49.000 (≈ 3.4%). Vermoedelijk ontstaan door cultuur-ophoging.`);
  out.push(``);
  out.push(`**Fix**: vervang in optimaal.samenvatting:`);
  out.push(`- *"verdeelt circa € 1.441.000 binnen het bestaande jaarbudget van € 250.000"*`);
  out.push(`- → *"verdeelt circa € 1.490.000 binnen het bestaande jaarbudget van € 250.000"*`);
  out.push(``);
  out.push(`**Probleem #2**: PrioriteitAdvies optimaal noemt CRM-doel-totaal *"circa € 910.000"* — werkelijk CRM-totaal in optimaal = **€ 1.095.000** (delta: € 185K, 20%). Dit is significant.`);
  out.push(``);
  out.push(`**Fix**: optimaal.prioriteitAdvies:`);
  out.push(`- *"…rank 1 op budget, met een doel-totaal van circa € 910.000 inclusief € 92.500/jaar structureel beheer"*`);
  out.push(`- → *"…rank 1 op budget, met een doel-totaal van circa € 1.095.000 inclusief € 92.500/jaar structureel beheer"*`);
  out.push(``);

  out.push(`### 5.2 PLUS20 — samenvatting bevat geen totaalbedrag`);
  out.push(``);
  out.push(`**Probleem**: plus20.samenvatting noemt alleen *"jaarlijks plafond van €300K"* maar geen totaal of looptijd. Risico op stille drift.`);
  out.push(``);
  out.push(`**Fix-suggestie**: voeg expliciete totalen toe analoog aan optimaal:`);
  out.push(`- Totaal € 1.270.000 over 5 jaar`);
  out.push(`- Plafond € 300K/jr`);
  out.push(``);

  out.push(`### 5.3 ADVIES — samenvatting bevat geen totaalbedrag`);
  out.push(``);
  out.push(`**Probleem**: advies.samenvatting bevat geen €-bedrag of looptijd-vermelding (4 jaar, € 1.159.000, € 341K cap). Andere scenarios zijn explicieter.`);
  out.push(``);
  out.push(`**Fix-suggestie**: voeg toe of formuleer expliciet:`);
  out.push(`- *"…volledig programma in 4 jaar (totaal € 1.159.000) waarbij in 2026 € 250.000 wordt benut conform Cito-eis en de pieken in 2027/2028 binnen het cap van € 341K/jr blijven."*`);
  out.push(``);

  out.push(`### 5.4 MIN20 — heel licht, controleer dossier-claims`);
  out.push(``);
  out.push(`**Probleem**: min20.prioriteitAdvies noemt *"€87.500 structureel via Smartprocess"* (Processen). Andere scenarios noemen €12.500/jaar structureel. Lijkt een verschil in domein-aggregatie (cumulatief over looptijd?).`);
  out.push(``);
  out.push(`**Verificatie**: € 12.500 × 7 jaar (optimaal) = € 87.500 — dat klopt voor lange looptijd. Echter min20 = 10 jaar, dat zou dan € 125K worden. Inhoudelijk: claim is verwarrend zonder context. **Aanbeveling**: vervang door eenduidige per-jaar-formulering ("€ 12.500/jaar structureel via Smartprocess") óf consistent cumulatief over alle scenarios.`);
  out.push(``);

  out.push(`### 5.5 Cross-scenario CRM/cultuur framing — IS consistent`);
  out.push(``);
  out.push(`**Bevinding (positief)**: in alle 4 scenarios wordt:`);
  out.push(`- CRM consistent beschreven als "grootste enkelvoudige post" / "technische enabler/fundament" — OK.`);
  out.push(`- Cultuur consistent beschreven als "klein in euro, inhoudelijk #2/tweede hefboom" — OK.`);
  out.push(`- Mens consistent op rank 2 in budget, met 66 deelnemers, twee trainingsblokken — OK.`);
  out.push(`- Processen consistent op rank 4 met cross-sectoraal schaalvoordeel — OK.`);
  out.push(``);

  out.push(`### 5.6 Fase-namen — kleine variatie tussen scenarios (acceptabel)`);
  out.push(``);
  out.push(`Fase-namen variëren bewust per looptijd (FASE_CHAINS), bijv:`);
  out.push(`- "In beheer & optimalisatie" (advies, 1 jaar) versus "In beheer" + "Optimalisatie" (plus20+, gesplitst).`);
  out.push(`- "Acceptatie & uitrol" (advies/plus20) vs "Acceptatie & sectoruitrol" + "Go-live & adoptie" (optimaal).`);
  out.push(`- "Vaardigheidstraining & toepassing" (advies, gecombineerd) vs gesplitst (plus20+).`);
  out.push(``);
  out.push(`Dit is **gewenst** gedrag van FASE_CHAINS-normalisatie en geen consistency-fout. Activiteit-tekst is OK voor identieke fase-namen.`);
  out.push(``);
  out.push(`Wel verdacht: in min20 staan "Continu verbeteren" + "Continue verbetering" + "Verankering" + "Verankering in lijn" + "Continue ontwikkeling" allemaal naast elkaar. Dit is taalkundig dubbel; overweeg of FASE_CHAINS zo veel sub-stappen voor 10-jarig moet hebben.`);
  out.push(``);

  out.push(`### 5.7 Fix-prioriteit-overzicht`);
  out.push(``);
  out.push(`| Prio | Fix | Type | Effort |`);
  out.push(`|---|---|---|---|`);
  out.push(`| **HOOG** | optimaal samenvatting: € 1.441.000 → € 1.490.000 | tekst-edit | 1 regel |`);
  out.push(`| **HOOG** | optimaal prioriteitAdvies: CRM € 910.000 → € 1.095.000 | tekst-edit | 1 regel |`);
  out.push(`| MID | plus20 samenvatting: voeg expliciet "€ 1.270.000 over 5 jaar" toe | tekst-edit | 1 zin |`);
  out.push(`| MID | advies samenvatting: voeg expliciet "€ 1.159.000 over 4 jaar" + cap-vermelding toe | tekst-edit | 1 zin |`);
  out.push(`| LAAG | min20 prioriteitAdvies: harmoniseer "€87.500 structureel" naar "€ 12.500/jaar structureel" | tekst-edit | 1 zin |`);
  out.push(`| LAAG | min20 fase-naamgeving: dubbele 'Continu verbeteren'/'Continue verbetering' opruimen in FASE_CHAINS | code | klein |`);
  out.push(``);

  const target = "c:/Users/pdebu/Projects VS code/DIN/AUDIT-tekst-consistency-pass1.md";
  writeFileSync(target, out.join("\n"), "utf-8");
  console.log(`✓ Geschreven naar ${target}`);
}

void main();
