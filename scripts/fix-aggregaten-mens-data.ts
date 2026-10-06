// Fix: hercalculeer aggregaten voor mens en data_systemen na de
// productmanager_int_zak verwijdering. Vorige script gebruikte verkeerd veld
// (`urenTotaal` ipv `uren`) waardoor scenario-totalen op 0 kwamen.
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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type Rol = { uren?: number; kosten?: number; functieId?: string };
type Jaar = { jaar: number; totaalUren?: number; totaalKosten?: number; rollen?: Rol[] };
type Domein = { domein: string; totaalUren?: number; totaalKosten?: number; uren?: number; jaren?: Jaar[]; programmaPct?: number; programmaUren?: number; lijnUren?: number };
type Scenario = { totaalUren?: number; totaalKosten?: number; programmaUren?: number; lijnUren?: number; domeinen?: Domein[]; totalenPerJaar?: Array<{ jaar: number; uren?: number; kosten?: number }> };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;
  const scenarios = s7.scenarios as Record<string, Scenario>;

  for (const [scenKey, sc] of Object.entries(scenarios)) {
    if (!sc?.domeinen) continue;

    for (const dom of sc.domeinen) {
      // Hercalculeer jaar-totalen voor ALLE domeinen uit rol.uren / rol.kosten
      // (correctheidscheck — overschrijft alleen als jaar.totaalUren afwijkt)
      if (!dom.jaren) continue;
      for (const jaar of dom.jaren) {
        const u = (jaar.rollen ?? []).reduce((acc, r) => acc + (r.uren ?? 0), 0);
        const k = (jaar.rollen ?? []).reduce((acc, r) => acc + (r.kosten ?? 0), 0);
        jaar.totaalUren = u;
        jaar.totaalKosten = k;
      }

      const domTotU = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalUren ?? 0), 0);
      const domTotK = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalKosten ?? 0), 0);
      dom.totaalUren = domTotU;
      dom.uren = domTotU;
      dom.totaalKosten = domTotK;
      const pct = typeof dom.programmaPct === "number" ? dom.programmaPct : 0.75;
      dom.programmaUren = Math.round(domTotU * pct);
      dom.lijnUren = domTotU - dom.programmaUren;
    }

    const scTotU = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalUren ?? 0), 0);
    const scTotK = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalKosten ?? 0), 0);
    sc.totaalUren = scTotU;
    sc.totaalKosten = scTotK;
    sc.programmaUren = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.programmaUren ?? 0), 0);
    sc.lijnUren = scTotU - (sc.programmaUren ?? 0);

    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let uren = 0;
        let kosten = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar);
          uren += j?.totaalUren ?? 0;
          kosten += j?.totaalKosten ?? 0;
        }
        t.uren = uren;
        t.kosten = kosten;
      }
    }

    console.log(`${scenKey}: totaalUren=${scTotU} (mens=${sc.domeinen.find((d) => d.domein === "mens")?.totaalUren}, data=${sc.domeinen.find((d) => d.domein === "data_systemen")?.totaalUren})`);
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...wiz,
      stepResults: {
        ...stepResults,
        stap4: { ...stap4, stap7InterneUren: s7 },
      },
    },
  };
  const { error } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("✓ Aggregaten gefixt.");
}

void main();
