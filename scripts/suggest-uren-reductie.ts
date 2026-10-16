// Analyseer vastgesteldeUrenPerInspanning en stel per rol een conservatiever
// uren-totaal voor zodat het programma-totaal in de 6.000-7.000u landt
// (i.p.v. huidige 9.530u). Onderbouwt elke aanpassing.
//
// Usage: npx tsx scripts/suggest-uren-reductie.ts <sessie-id>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Suggestion = {
  groepId: string;
  inspanning: string;
  domein: string;
  functieNaam: string;
  functieId: string;
  huidig: number;
  voorgesteld: number;
  reden: string;
};

async function main() {
  const sessionId = process.argv[2];
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const stap7 = stap4?.stap7InterneUren as Record<string, unknown> | undefined;

  const vastgesteld = stap7?.vastgesteldeUrenPerInspanning as Array<{
    groepId: string;
    inspanningTitel: string;
    domein: string;
    rollen: Array<{ functieNaam: string; functieId: string; urenTotaal: number; onderbouwing?: string }>;
  }>;

  if (!vastgesteld) {
    console.log("Geen vastgesteldeUrenPerInspanning gevonden");
    return;
  }

  // Selectie ophalen om aantal personen te zien
  const selectie = stap7?.selectiePerDomein as Record<string, Record<string, { aantal: number }>> | undefined;
  function aantalPersonen(domein: string, functieId: string): number {
    return selectie?.[domein]?.[functieId]?.aantal ?? 1;
  }

  // === REDUCTIE-REGELS ===
  // Doel: 9.530u → ~6.500u (32% reductie). Reduceer ALLEEN waar het kan
  // zonder de inhoudelijke werklast te schaden. Hou trekkers/leiders intact;
  // verlaag breed-uitgerolde training met veel deelnemers.
  function suggest(insp: { groepId: string; inspanningTitel: string; domein: string }, rol: { functieNaam: string; functieId: string; urenTotaal: number }): Suggestion {
    const aantal = aantalPersonen(insp.domein, rol.functieId);
    const urenPerPersoon = aantal > 0 ? rol.urenTotaal / aantal : rol.urenTotaal;
    let voorgesteld = rol.urenTotaal;
    let reden = "Behouden — proportioneel en realistisch.";

    // Klantenservice & accountmanagers in mens-training: brede groep,
    // basistraining 24u (niet 46u) is voldoende voor outside-in basis.
    if (
      insp.domein === "mens" &&
      (rol.functieId.startsWith("klantenservice_") ||
        rol.functieId.startsWith("accountmanager_") ||
        rol.functieId.startsWith("mdw_binnendienst_") ||
        rol.functieId === "campagne_marketeer_a" ||
        rol.functieId === "campagne_marketeer_b") &&
      aantal >= 2
    ) {
      const nieuwUrenPerPersoon = 24;
      voorgesteld = Math.round(aantal * nieuwUrenPerPersoon);
      if (voorgesteld < rol.urenTotaal) {
        reden = `${aantal} personen × 24u basistraining (was ${urenPerPersoon.toFixed(0)}u/persoon). Outside-in basis = 3 dagen genoeg voor frontline; meer alleen voor key-rollen.`;
      } else {
        voorgesteld = rol.urenTotaal;
      }
    }

    // Trainer/Adviseur A — 12 personen, beperk tot 80u/persoon (was 120u)
    if (rol.functieId === "trainer_adviseur_a" && aantal >= 8) {
      const nieuwUrenPerPersoon = insp.domein === "mens" ? 80 : 30;
      voorgesteld = Math.round(aantal * nieuwUrenPerPersoon);
      if (voorgesteld < rol.urenTotaal) {
        reden = `${aantal} trainers × ${nieuwUrenPerPersoon}u (was ${urenPerPersoon.toFixed(0)}u). Trainers train ELKAAR + leveren training, niet zelf 120u meedraaien.`;
      } else {
        voorgesteld = rol.urenTotaal;
      }
    }

    // Procesondersteuners — verlaag van 462 naar 280 (5,4u/maand × 12mnd × 4jr ≈ 260u)
    if (rol.functieId.startsWith("procesondersteuner_") && rol.urenTotaal > 350) {
      voorgesteld = 280;
      reden = `5-6u/maand × programma-looptijd. ${rol.urenTotaal}u betekent +-10u/maand wat een halve dag/week is — te zwaar voor één rol.`;
    }

    // Procesmanager processen 518u → 320u
    if (rol.functieId === "procesmanager_data" && insp.domein === "processen" && rol.urenTotaal > 400) {
      voorgesteld = 320;
      reden = `Procesmanager begeleidt ontwerp + governance, maar gemiddeld 6-7u/maand is realistischer (was ~10u/maand).`;
    }

    // Sectormanagers in CRM (data_systemen) — minder dan 108u, meer 60u
    if (rol.functieId.startsWith("sectormanager_") && insp.domein === "data_systemen") {
      voorgesteld = 60;
      reden = `Sectormanager geeft strategische input op CRM (kwartaal-mijlpalen), niet operationeel meebouwen — 60u i.p.v. 108u.`;
    }

    // Productmanagers in mens — verlagen van 138u → 80u
    if (rol.functieId.startsWith("productmanager_") && insp.domein === "mens" && rol.urenTotaal > 80) {
      voorgesteld = 80;
      reden = `Productmanager doet content-validatie op outside-in materiaal, 80u over de looptijd is voldoende.`;
    }

    return {
      groepId: insp.groepId,
      inspanning: insp.inspanningTitel,
      domein: insp.domein,
      functieNaam: rol.functieNaam,
      functieId: rol.functieId,
      huidig: rol.urenTotaal,
      voorgesteld,
      reden,
    };
  }

  const suggestions: Suggestion[] = [];
  for (const insp of vastgesteld) {
    for (const r of insp.rollen) {
      suggestions.push(suggest(insp, r));
    }
  }

  // Output: per inspanning, alleen aanpassingen
  const huidigTotaal = suggestions.reduce((s, x) => s + x.huidig, 0);
  const voorgesteldTotaal = suggestions.reduce((s, x) => s + x.voorgesteld, 0);
  const reductie = huidigTotaal - voorgesteldTotaal;

  console.log("=================================================================");
  console.log("VOORSTEL UREN-REDUCTIE — Stap 7 Q&A");
  console.log("=================================================================\n");
  console.log(`Doel: 6.000-7.000u (was 9.530u)`);
  console.log(`Voorstel-totaal: ${voorgesteldTotaal.toLocaleString("nl-NL")}u (reductie ${reductie.toLocaleString("nl-NL")}u, -${Math.round((reductie / huidigTotaal) * 100)}%)\n`);

  for (const inspGroep of vastgesteld) {
    const inspSugs = suggestions.filter((s) => s.groepId === inspGroep.groepId);
    const inspHuidig = inspSugs.reduce((s, x) => s + x.huidig, 0);
    const inspNieuw = inspSugs.reduce((s, x) => s + x.voorgesteld, 0);
    console.log(`\n[${inspGroep.domein}] ${inspGroep.inspanningTitel}`);
    console.log(`  Subtotaal: ${inspHuidig}u → ${inspNieuw}u${inspNieuw < inspHuidig ? ` (−${inspHuidig - inspNieuw}u)` : " (ongewijzigd)"}\n`);

    const aanpassingen = inspSugs.filter((s) => s.voorgesteld !== s.huidig);
    if (aanpassingen.length === 0) {
      console.log("  ↓ geen aanpassingen — inspanning blijft zoals is");
      continue;
    }

    for (const sug of aanpassingen) {
      console.log(`  • ${sug.functieNaam}`);
      console.log(`    NU: ${sug.huidig}u    →    NIEUW: ${sug.voorgesteld}u  (−${sug.huidig - sug.voorgesteld}u)`);
      console.log(`    Reden: ${sug.reden}\n`);
    }
  }

  console.log("\n=================================================================");
  console.log("SAMENVATTING — wat in de Q&A-vragen aan te passen:");
  console.log("=================================================================\n");
  for (const sug of suggestions.filter((s) => s.voorgesteld !== s.huidig)) {
    console.log(`  [${sug.domein}] ${sug.inspanning.substring(0, 50)}...`);
    console.log(`     ${sug.functieNaam}: ${sug.huidig}u → ${sug.voorgesteld}u`);
  }
  console.log(`\n  TOTAAL: ${huidigTotaal.toLocaleString("nl-NL")}u → ${voorgesteldTotaal.toLocaleString("nl-NL")}u`);
}
main().catch((e) => { console.error(e); process.exit(1); });
