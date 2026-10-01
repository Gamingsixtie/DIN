// Utility voor de "halfjaar-2026"-correctie op interne uren scenario's.
// Gebruikt door StapInterneUren wizard-knop én scripts/halfjaar-2026-uren-fix.ts.
//
// Logica: voor elk domein in een scenario, verlaag rol-uren in jaar 1 (startJaar)
// naar FACTOR × oude waarde, en voeg het verschil toe aan dezelfde rol in jaar 2.
// Als rol nog niet bestaat in jaar 2, wordt deze toegevoegd met jaar-1 uurtarief.
// Daarna worden alle aggregaties hergeteld: jr.totaalUren/Kosten,
// d.totaalUren/Kosten, scen.totalenPerJaar, scen.totaalUren/Kosten.

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
};
type Jaar = {
  jaar: number;
  activiteit?: string;
  rollen: Rol[];
  totaalUren?: number;
  totaalKosten?: number;
};
type Domein = {
  domein: string;
  koppeling?: string[];
  jaren: Jaar[];
  totaalUren?: number;
  totaalKosten?: number;
  motivatie?: string;
};
export type UrenScenario = {
  scenarioLabel: string;
  aantalJaren?: number;
  startJaar?: number;
  uurtariefGebruikt?: number;
  domeinen?: Domein[];
  totalenPerJaar?: {
    jaar: number;
    uren: number;
    kosten: number;
    urenBudget?: number;
    urenGap?: number;
  }[];
  totaalUren?: number;
  totaalKosten?: number;
  samenvatting?: string;
};

/**
 * Pas halfjaar-correctie toe op één scenario.
 *
 * @param scen Het scenario uit stap7InterneUren.scenarios[label]
 * @param factor Welk deel van jaar-1 uren blijft staan. Default 0.55.
 *   Voorbeelden: 0.50 = strikt halfjaar, 0.55 = juni-dec met aanloopdrukte,
 *   0.60 = met najaar opbouw.
 * @returns Een nieuw scenario-object met de geherverdeelde uren en herberekende totalen.
 */
export function applyHalfjaarShift(scen: UrenScenario, factor: number = 0.55): UrenScenario {
  if (!scen.domeinen || !scen.startJaar) return scen;
  if (factor <= 0 || factor >= 1) return scen;
  const startJ = scen.startJaar;
  const jaar2 = startJ + 1;

  const newDomeinen = scen.domeinen.map((d) => {
    if (!d.jaren) return d;
    const jr1Idx = d.jaren.findIndex((j) => j.jaar === startJ);
    const jr2Idx = d.jaren.findIndex((j) => j.jaar === jaar2);
    if (jr1Idx === -1) return d;

    const jr1 = d.jaren[jr1Idx];
    const jr2 = jr2Idx >= 0 ? d.jaren[jr2Idx] : null;
    if (!jr2) return d; // 1-jarig scenario — geen verschuiving mogelijk

    // Per rol: verlaag jaar-1 uren naar factor × oude waarde
    const newJr1Rollen: Rol[] = jr1.rollen.map((r) => ({
      ...r,
      uren: Math.round(r.uren * factor),
      kosten: Math.round(r.uren * factor) * r.uurtarief,
    }));

    // Per rol: shift delta naar jaar 2
    const newJr2Rollen: Rol[] = [...jr2.rollen.map((r) => ({ ...r }))];
    for (const r of jr1.rollen) {
      const newUren = Math.round(r.uren * factor);
      const delta = r.uren - newUren;
      if (delta <= 0) continue;
      const matchIdx = newJr2Rollen.findIndex((x) => x.functieId === r.functieId);
      if (matchIdx >= 0) {
        const m = newJr2Rollen[matchIdx];
        m.uren = m.uren + delta;
        m.kosten = m.uren * m.uurtarief;
      } else {
        // Rol nog niet in jaar 2 — voeg toe met jaar-1 uurtarief
        newJr2Rollen.push({ ...r, uren: delta, kosten: delta * r.uurtarief });
      }
    }

    const newJr1: Jaar = {
      ...jr1,
      rollen: newJr1Rollen,
      totaalUren: newJr1Rollen.reduce((s, x) => s + x.uren, 0),
      totaalKosten: newJr1Rollen.reduce((s, x) => s + x.kosten, 0),
    };
    const newJr2: Jaar = {
      ...jr2,
      rollen: newJr2Rollen,
      totaalUren: newJr2Rollen.reduce((s, x) => s + x.uren, 0),
      totaalKosten: newJr2Rollen.reduce((s, x) => s + x.kosten, 0),
    };

    const newJaren = d.jaren.map((j, idx) => {
      if (idx === jr1Idx) return newJr1;
      if (idx === jr2Idx) return newJr2;
      return j;
    });

    return {
      ...d,
      jaren: newJaren,
      totaalUren: newJaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0),
      totaalKosten: newJaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0),
    };
  });

  // Hertel totalenPerJaar
  const newTotalenPerJaar = (scen.totalenPerJaar ?? []).map((t) => {
    let uren = 0;
    let kosten = 0;
    for (const d of newDomeinen) {
      const j = d.jaren.find((x) => x.jaar === t.jaar);
      uren += j?.totaalUren ?? 0;
      kosten += j?.totaalKosten ?? 0;
    }
    return {
      ...t,
      uren,
      kosten,
      urenGap: t.urenBudget !== undefined ? uren - t.urenBudget : t.urenGap,
    };
  });

  return {
    ...scen,
    domeinen: newDomeinen,
    totalenPerJaar: newTotalenPerJaar,
    totaalUren: newDomeinen.reduce((s, d) => s + (d.totaalUren ?? 0), 0),
    totaalKosten: newDomeinen.reduce((s, d) => s + (d.totaalKosten ?? 0), 0),
  };
}

/**
 * Pas halfjaar-correctie toe op alle scenarios in een interne-uren-advies.
 */
export function applyHalfjaarShiftAlleScenarios<T extends { scenarios?: Record<string, UrenScenario | null> }>(
  advies: T,
  factor: number = 0.55,
): T {
  if (!advies.scenarios) return advies;
  const newScenarios: Record<string, UrenScenario | null> = {};
  for (const [k, v] of Object.entries(advies.scenarios)) {
    newScenarios[k] = v ? applyHalfjaarShift(v, factor) : v;
  }
  return { ...advies, scenarios: newScenarios };
}
