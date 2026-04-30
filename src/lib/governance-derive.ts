// ============================================================
// Pure derivers voor Stap 5 (Programmaorganisatie / RASCI)
// ============================================================
// Leid de programmaorganisatie (kerngroep + domeineigenaren) en de
// "Gezamenlijke" RASCI (4 secties) deterministisch af uit de cross-analyse.
//
// Bron van waarheid:
//   - session.crossAnalyseWizard.stepResults.stap1.batenPerSector
//   - session.crossAnalyseWizard.stepResults.stap2.vermogenGelijkenisGroepen
//   - session.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis (met dossier)
//
// Belangrijk:
//   - Pure functies, geen side-effects, geen AI-roundtrip
//   - "Veilig in de data": derivers raken bestaande clusterRasci/itemRasci
//     NIET aan; alleen het nieuwe gezamenlijkeRasci-veld
//   - Sync-merge: handmatige overrides (bron === "manual") blijven staan;
//     alleen "derived"-cellen worden bij re-sync vervangen
// ============================================================

import { DOMAIN_LABELS } from "@/lib/types";
import type {
  DINSession,
  ProgrammaRol,
  Programmaorganisatie,
  GezamenlijkRasciItem,
  GezamenlijkeRasciSectie,
  RasciRij,
  RasciLetter,
  EffortDomain,
  SubEffortAdvies,
} from "@/lib/types";

// ============================================================
// Helpers
// ============================================================

const ROL_KERNGROEP_PREFIX = "Inspanningsleider";
const ROL_DOMEINEIGENAAR_PREFIX = "Domeineigenaar";

function generateRolId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normName(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

function nonEmpty(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

// ============================================================
// 1) Programmaorganisatie afleiden uit cross-analyse
// ============================================================

export type DerivedProgrammaorganisatieResult = {
  next: Programmaorganisatie;
  toegevoegdKerngroep: number;
  toegevoegdDomeineigenaren: number;
  ongewijzigd: boolean;
};

/**
 * Vult kerngroep + domeineigenaren aan op basis van cross-analyse stap 4.
 *
 * - Kerngroep: unieke `dossier.inspanningsleider`-namen (case-insensitive trim)
 * - Domeineigenaren: unieke `dossier.eigenaar` per `domein` — meest voorkomende
 *   eigenaar per domein wint, max 1 per domein
 *
 * Bestaande handmatige rollen waarvan `naam` al matcht blijven staan
 * (geen overschrijven). Alleen ontbrekende rollen worden toegevoegd.
 *
 * Opdrachtgever, programmamanager, stuurgroep en klankbordgroep worden
 * NIET aangeraakt — die zijn Cito-niveau en staan niet in de cross-analyse.
 */
export function deriveProgrammaorganisatie(
  session: DINSession,
  current: Programmaorganisatie
): DerivedProgrammaorganisatieResult {
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  const itemsMetDossier = subEffort.filter((s) => s.dossier && (nonEmpty(s.dossier.inspanningsleider) || nonEmpty(s.dossier.eigenaar)));

  // --- Kerngroep: unieke inspanningsleiders ---
  const inspanningsleiderNamen = new Set<string>();
  for (const s of itemsMetDossier) {
    const naam = (s.dossier?.inspanningsleider ?? "").trim();
    if (naam) inspanningsleiderNamen.add(naam);
  }

  // Bestaande kerngroep-namen (case-insensitive)
  const huidigeKerngroepNorm = new Set(
    (current.kerngroep ?? []).map((r) => normName(r.naam) || normName(r.rol))
  );

  const nieuweKerngroep: ProgrammaRol[] = [...(current.kerngroep ?? [])];
  let toegevoegdKerngroep = 0;
  for (const naam of inspanningsleiderNamen) {
    if (huidigeKerngroepNorm.has(normName(naam))) continue;
    nieuweKerngroep.push({
      id: generateRolId(),
      rol: ROL_KERNGROEP_PREFIX,
      naam,
      functie: "Inspanningsleider (uit cross-analyse stap 4)",
      sector: "",
      mandaat: "Trekt cross-sectorale inspanning, rapporteert aan domeineigenaar/programmamanager",
      toelichting: "",
    });
    toegevoegdKerngroep++;
  }

  // --- Domeineigenaren: meest voorkomende eigenaar per domein ---
  const eigenaarPerDomein = new Map<EffortDomain, Map<string, number>>();
  for (const s of itemsMetDossier) {
    const eigenaar = (s.dossier?.eigenaar ?? "").trim();
    if (!eigenaar) continue;
    const dom = s.domein;
    if (!eigenaarPerDomein.has(dom)) eigenaarPerDomein.set(dom, new Map());
    const counter = eigenaarPerDomein.get(dom)!;
    counter.set(eigenaar, (counter.get(eigenaar) ?? 0) + 1);
  }

  const huidigeDomeinen = new Set(
    (current.domeineigenaren ?? [])
      .map((r) => r.rol)
      .filter((r): r is string => typeof r === "string")
      .map((r) => r.toLowerCase())
  );

  const nieuweDomeineigenaren: ProgrammaRol[] = [...(current.domeineigenaren ?? [])];
  let toegevoegdDomeineigenaren = 0;
  for (const [dom, counter] of eigenaarPerDomein) {
    const domLabel = DOMAIN_LABELS[dom] ?? dom;
    const rolLabel = `${ROL_DOMEINEIGENAAR_PREFIX} ${domLabel}`;
    if (huidigeDomeinen.has(rolLabel.toLowerCase())) continue;
    // Pak de meest voorkomende naam
    let topNaam = "";
    let topCount = 0;
    for (const [naam, count] of counter) {
      if (count > topCount) {
        topNaam = naam;
        topCount = count;
      }
    }
    nieuweDomeineigenaren.push({
      id: generateRolId(),
      rol: rolLabel,
      naam: topNaam,
      functie: `Domeineigenaar ${domLabel}`,
      sector: "Programmabreed",
      mandaat: `Bewaakt samenhang van ${domLabel.toLowerCase()}-vermogens en -inspanningen over de sectoren`,
      toelichting: `Afgeleid uit cross-analyse stap 4 (meest voorkomende eigenaar in domein ${domLabel}).`,
    });
    toegevoegdDomeineigenaren++;
  }

  const ongewijzigd = toegevoegdKerngroep === 0 && toegevoegdDomeineigenaren === 0;

  const next: Programmaorganisatie = {
    ...current,
    kerngroep: nieuweKerngroep,
    domeineigenaren: nieuweDomeineigenaren,
  };

  return { next, toegevoegdKerngroep, toegevoegdDomeineigenaren, ongewijzigd };
}

// ============================================================
// 2) Gezamenlijke RASCI afleiden uit cross-analyse
// ============================================================

export type DeriveDiagnostiek = {
  sectie: GezamenlijkeRasciSectie;
  itemId: string;
  reden: string;
};

export type DerivedRasciResult = {
  items: GezamenlijkRasciItem[];
  diagnostiek: DeriveDiagnostiek[];
};

type RolLookup = {
  byNaam: Map<string, string>;          // norm naam → rolId
  byRolLabel: Map<string, string>;      // norm rol-label → rolId
  opdrachtgeverId: string | null;
  programmamanagerId: string | null;
  domeineigenaarPerDomein: Map<EffortDomain, string>;
  stuurgroepIds: string[];
  kerngroepIds: string[];
  klankbordgroepIds: string[];
};

function buildRolLookup(po: Programmaorganisatie): RolLookup {
  const byNaam = new Map<string, string>();
  const byRolLabel = new Map<string, string>();
  const addRol = (r: ProgrammaRol | undefined) => {
    if (!r) return;
    if (nonEmpty(r.naam)) byNaam.set(normName(r.naam), r.id);
    if (nonEmpty(r.rol)) byRolLabel.set(normName(r.rol), r.id);
  };
  addRol(po.opdrachtgever);
  addRol(po.programmamanager);
  for (const r of po.kerngroep ?? []) addRol(r);
  for (const r of po.stuurgroep ?? []) addRol(r);
  for (const r of po.domeineigenaren ?? []) addRol(r);
  for (const r of po.klankbordgroep ?? []) addRol(r);

  const domeineigenaarPerDomein = new Map<EffortDomain, string>();
  for (const r of po.domeineigenaren ?? []) {
    const label = (r.rol ?? "").toLowerCase();
    // Match "Domeineigenaar Mens", "Domeineigenaar Processen", etc.
    if (label.includes("mens")) domeineigenaarPerDomein.set("mens", r.id);
    else if (label.includes("processen")) domeineigenaarPerDomein.set("processen", r.id);
    else if (label.includes("data") || label.includes("systemen")) domeineigenaarPerDomein.set("data_systemen", r.id);
    else if (label.includes("cultuur")) domeineigenaarPerDomein.set("cultuur", r.id);
  }

  return {
    byNaam,
    byRolLabel,
    opdrachtgeverId: po.opdrachtgever?.id ?? null,
    programmamanagerId: po.programmamanager?.id ?? null,
    domeineigenaarPerDomein,
    stuurgroepIds: (po.stuurgroep ?? []).map((r) => r.id),
    kerngroepIds: (po.kerngroep ?? []).map((r) => r.id),
    klankbordgroepIds: (po.klankbordgroep ?? []).map((r) => r.id),
  };
}

function findRolByNaam(lookup: RolLookup, naam: string): string | null {
  const key = normName(naam);
  if (!key) return null;
  return lookup.byNaam.get(key) ?? null;
}

function derivedRij(rolId: string, letter: RasciLetter): RasciRij {
  return { rolId, letter, bron: "derived" };
}

/**
 * Verzamel inspanningsleider-ids per sector uit de cross-analyse.
 * Voor elke betrokken sector binnen een subEffort (via vermogenImpact) telt de
 * inspanningsleider als sectortrekker.
 */
function buildSectortrekkerIndex(
  subEffort: SubEffortAdvies[],
  lookup: RolLookup
): Map<string, Set<string>> {
  // sectorId → Set<rolId>
  const out = new Map<string, Set<string>>();
  for (const s of subEffort) {
    const naam = (s.dossier?.inspanningsleider ?? "").trim();
    if (!naam) continue;
    const rolId = findRolByNaam(lookup, naam);
    if (!rolId) continue;
    const sectoren = new Set<string>(
      (s.vermogenImpact ?? []).map((v) => v.sectorId).filter(nonEmpty)
    );
    for (const sec of sectoren) {
      if (!out.has(sec)) out.set(sec, new Set());
      out.get(sec)!.add(rolId);
    }
  }
  return out;
}

/**
 * Mode #1: Sector-baten — per sector × baat een rij.
 */
function deriveSectorBaten(
  session: DINSession,
  lookup: RolLookup,
  sectortrekker: Map<string, Set<string>>,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const stap1 = session.crossAnalyseWizard?.stepResults?.stap1;
  if (!stap1) return [];

  // Lookup bateneigenaar per baat-titel
  const bateneigenaarByTitel = new Map<string, string>();
  for (const b of session.benefits ?? []) {
    const titel = (b.title || b.description || "").trim();
    const eig = (b.profiel?.bateneigenaar ?? "").trim();
    if (titel && eig) bateneigenaarByTitel.set(normName(titel), eig);
  }

  const out: GezamenlijkRasciItem[] = [];
  for (const sectorBlock of stap1.batenPerSector ?? []) {
    const sectorId = sectorBlock.sector;
    for (const baat of sectorBlock.baten ?? []) {
      const titel = baat.titel;
      const itemId = `bs:${sectorId}:${titel}`;
      const rijen: RasciRij[] = [];

      // A: bateneigenaar
      const eigNaam = bateneigenaarByTitel.get(normName(titel));
      const eigRolId = eigNaam ? findRolByNaam(lookup, eigNaam) : null;
      if (eigRolId) rijen.push(derivedRij(eigRolId, "A"));
      else if (eigNaam) {
        diagnostiek.push({ sectie: "sector_baten", itemId, reden: `Bateneigenaar "${eigNaam}" niet in programmaorganisatie` });
      }

      // R: sectortrekkers van die sector
      const trekkers = sectortrekker.get(sectorId);
      if (trekkers) {
        for (const rolId of trekkers) {
          if (rolId !== eigRolId) rijen.push(derivedRij(rolId, "R"));
        }
      }
      // Als geen sectortrekker matched én geen A: signaleer
      if (rijen.length === 0) {
        diagnostiek.push({ sectie: "sector_baten", itemId, reden: `Geen rollen gematched voor sector ${sectorId}` });
      }

      // C: programmamanager
      if (lookup.programmamanagerId) {
        rijen.push(derivedRij(lookup.programmamanagerId, "C"));
      }

      // I: opdrachtgever
      if (lookup.opdrachtgeverId) {
        rijen.push(derivedRij(lookup.opdrachtgeverId, "I"));
      }

      out.push({
        sectie: "sector_baten",
        itemId,
        itemTitel: `${sectorId}: ${titel}`,
        meta: { sector: sectorId, doelNaam: baat.doelNaam ?? "" },
        rijen,
        toelichting: "",
      });
    }
  }
  return out;
}

/**
 * Mode #2: Gezamenlijke vermogens — per VermogenGelijkenisGroep een rij.
 */
function deriveGezamenlijkeVermogens(
  session: DINSession,
  lookup: RolLookup,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const groepen = session.crossAnalyseWizard?.stepResults?.stap2?.vermogenGelijkenisGroepen ?? [];
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  if (groepen.length === 0) return [];

  const out: GezamenlijkRasciItem[] = [];
  for (const groep of groepen) {
    const itemId = groep.id;

    // Welke sub-efforts horen bij deze groep?
    const subsForGroep = subEffort.filter((s) => s.groepId === groep.id);

    // Meest voorkomende domein binnen deze groep
    const domCounter = new Map<EffortDomain, number>();
    for (const s of subsForGroep) {
      domCounter.set(s.domein, (domCounter.get(s.domein) ?? 0) + 1);
    }
    let topDom: EffortDomain | null = null;
    let topCount = 0;
    for (const [d, c] of domCounter) {
      if (c > topCount) { topDom = d; topCount = c; }
    }

    const rijen: RasciRij[] = [];

    // A: domeineigenaar van het overheersende domein
    const aRolId = topDom ? lookup.domeineigenaarPerDomein.get(topDom) ?? null : null;
    if (aRolId) rijen.push(derivedRij(aRolId, "A"));
    else if (topDom) {
      diagnostiek.push({ sectie: "gezamenlijke_vermogens", itemId, reden: `Geen domeineigenaar voor domein "${DOMAIN_LABELS[topDom] ?? topDom}"` });
    }

    // R: inspanningsleiders van bijbehorende subEfforts (uniek)
    const rIds = new Set<string>();
    for (const s of subsForGroep) {
      const naam = (s.dossier?.inspanningsleider ?? "").trim();
      if (!naam) continue;
      const id = findRolByNaam(lookup, naam);
      if (id && id !== aRolId) rIds.add(id);
    }
    for (const id of rIds) rijen.push(derivedRij(id, "R"));

    // C: programmamanager
    if (lookup.programmamanagerId && lookup.programmamanagerId !== aRolId) {
      rijen.push(derivedRij(lookup.programmamanagerId, "C"));
    }

    // I: opdrachtgever
    if (lookup.opdrachtgeverId && lookup.opdrachtgeverId !== aRolId) {
      rijen.push(derivedRij(lookup.opdrachtgeverId, "I"));
    }

    out.push({
      sectie: "gezamenlijke_vermogens",
      itemId,
      itemTitel: groep.gezamenlijkeOmschrijving,
      meta: { reden: groep.reden ?? "", domein: topDom ?? "" },
      rijen,
      toelichting: "",
    });
  }
  return out;
}

/**
 * Mode #3: Gezamenlijke inspanningen — per subEffortAnalysis-item met dossier.
 */
function deriveGezamenlijkeInspanningen(
  session: DINSession,
  lookup: RolLookup,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  const itemsMetDossier = subEffort.filter(
    (s) => s.dossier && (nonEmpty(s.dossier.eigenaar) || nonEmpty(s.dossier.inspanningsleider))
  );

  const out: GezamenlijkRasciItem[] = [];
  for (const s of itemsMetDossier) {
    const itemId = `${s.groepId}:${s.domein}`;
    const titel = s.titel || s.voorgesteldeNaam || `${DOMAIN_LABELS[s.domein] ?? s.domein} bundel`;
    const rijen: RasciRij[] = [];

    // A: dossier.eigenaar — direct
    const eigNaam = (s.dossier?.eigenaar ?? "").trim();
    const aId = eigNaam ? findRolByNaam(lookup, eigNaam) : null;
    if (aId) rijen.push(derivedRij(aId, "A"));
    else if (eigNaam) {
      diagnostiek.push({ sectie: "gezamenlijke_inspanningen", itemId, reden: `Eigenaar "${eigNaam}" niet in programmaorganisatie` });
    } else if (lookup.domeineigenaarPerDomein.get(s.domein)) {
      // Fallback: domeineigenaar als A als geen eigenaar in dossier
      const id = lookup.domeineigenaarPerDomein.get(s.domein)!;
      rijen.push(derivedRij(id, "A"));
    }

    // R: dossier.inspanningsleider — direct
    const leiderNaam = (s.dossier?.inspanningsleider ?? "").trim();
    const rId = leiderNaam ? findRolByNaam(lookup, leiderNaam) : null;
    if (rId && rId !== aId) rijen.push(derivedRij(rId, "R"));
    else if (leiderNaam && !rId) {
      diagnostiek.push({ sectie: "gezamenlijke_inspanningen", itemId, reden: `Inspanningsleider "${leiderNaam}" niet in programmaorganisatie` });
    }

    // C: sectortrekkers van betrokken sectoren — pak inspanningsleiders die in andere
    // bundels dezelfde sector raken (uitgezonderd zelf en de A)
    const betrokkenSectoren = new Set<string>(
      (s.vermogenImpact ?? []).map((v) => v.sectorId).filter(nonEmpty)
    );
    if (betrokkenSectoren.size > 0) {
      const sectortrekkerIdx = buildSectortrekkerIndex(subEffort, lookup);
      const cIds = new Set<string>();
      for (const sec of betrokkenSectoren) {
        const trekkers = sectortrekkerIdx.get(sec);
        if (!trekkers) continue;
        for (const id of trekkers) {
          if (id !== aId && id !== rId) cIds.add(id);
        }
      }
      for (const id of cIds) rijen.push(derivedRij(id, "C"));
    }

    // C: programmamanager (één keer, indien niet al elders)
    if (
      lookup.programmamanagerId &&
      lookup.programmamanagerId !== aId &&
      lookup.programmamanagerId !== rId &&
      !rijen.some((r) => r.rolId === lookup.programmamanagerId)
    ) {
      rijen.push(derivedRij(lookup.programmamanagerId, "C"));
    }

    // I: opdrachtgever
    if (
      lookup.opdrachtgeverId &&
      lookup.opdrachtgeverId !== aId &&
      lookup.opdrachtgeverId !== rId &&
      !rijen.some((r) => r.rolId === lookup.opdrachtgeverId)
    ) {
      rijen.push(derivedRij(lookup.opdrachtgeverId, "I"));
    }

    out.push({
      sectie: "gezamenlijke_inspanningen",
      itemId,
      itemTitel: titel,
      meta: {
        domein: s.domein,
        actie: s.actie,
        eigenaarNaam: eigNaam,
        inspanningsleiderNaam: leiderNaam,
      },
      rijen,
      toelichting: s.beargumentatie || s.beschrijving || s.reden || "",
    });
  }
  return out;
}

/**
 * Mode #4: Programmagovernance — vaste 4 rijen.
 */
function deriveProgrammagovernance(lookup: RolLookup): GezamenlijkRasciItem[] {
  type GovRow = { itemId: string; titel: string; aId: string | null; rIds: (string | null)[]; cIds: (string | null)[]; iIds: (string | null)[] };

  const rows: GovRow[] = [
    {
      itemId: "gov:besluitvorming",
      titel: "Besluitvorming go/no-go (scope, budget, mijlpalen)",
      aId: lookup.opdrachtgeverId,
      rIds: [lookup.programmamanagerId],
      cIds: lookup.stuurgroepIds.length > 0 ? lookup.stuurgroepIds : [],
      iIds: lookup.kerngroepIds.length > 0 ? lookup.kerngroepIds : [],
    },
    {
      itemId: "gov:rapportage",
      titel: "Voortgangsrapportage (kwartaal)",
      aId: lookup.programmamanagerId,
      rIds: lookup.kerngroepIds.length > 0 ? lookup.kerngroepIds : [],
      cIds: [lookup.opdrachtgeverId],
      iIds: lookup.stuurgroepIds.length > 0 ? lookup.stuurgroepIds : [],
    },
    {
      itemId: "gov:escalatie",
      titel: "Risico-escalatie en herijking",
      aId: lookup.programmamanagerId,
      rIds: Array.from(lookup.domeineigenaarPerDomein.values()),
      cIds: [lookup.opdrachtgeverId],
      iIds: lookup.stuurgroepIds.length > 0 ? lookup.stuurgroepIds : [],
    },
    {
      itemId: "gov:baten_review",
      titel: "Baten-realisatie review",
      aId: lookup.opdrachtgeverId,
      rIds: [lookup.programmamanagerId],
      cIds: Array.from(lookup.domeineigenaarPerDomein.values()),
      iIds: lookup.stuurgroepIds.length > 0 ? lookup.stuurgroepIds : [],
    },
  ];

  return rows.map((row) => {
    const rijen: RasciRij[] = [];
    const used = new Set<string>();
    if (row.aId) {
      rijen.push(derivedRij(row.aId, "A"));
      used.add(row.aId);
    }
    for (const id of row.rIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "R"));
        used.add(id);
      }
    }
    for (const id of row.cIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "C"));
        used.add(id);
      }
    }
    for (const id of row.iIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "I"));
        used.add(id);
      }
    }
    return {
      sectie: "programmagovernance" as const,
      itemId: row.itemId,
      itemTitel: row.titel,
      meta: {},
      rijen,
      toelichting: "",
    };
  });
}

/**
 * Hoofd-deriver: produceert alle 4 secties.
 */
export function deriveGezamenlijkeRasci(session: DINSession): DerivedRasciResult {
  const po = session.programmaorganisatie;
  const diagnostiek: DeriveDiagnostiek[] = [];

  if (!po) {
    return { items: [], diagnostiek: [{ sectie: "programmagovernance", itemId: "n/a", reden: "Geen programmaorganisatie gedefinieerd" }] };
  }

  const lookup = buildRolLookup(po);
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  const sectortrekker = buildSectortrekkerIndex(subEffort, lookup);

  const items: GezamenlijkRasciItem[] = [
    ...deriveSectorBaten(session, lookup, sectortrekker, diagnostiek),
    ...deriveGezamenlijkeVermogens(session, lookup, diagnostiek),
    ...deriveGezamenlijkeInspanningen(session, lookup, diagnostiek),
    ...deriveProgrammagovernance(lookup),
  ];

  return { items, diagnostiek };
}

// ============================================================
// 3) Sync-merge — handmatige overrides bewaren
// ============================================================

/**
 * Merge nieuw afgeleide items met bestaande items.
 *
 * Per item (op basis van sectie+itemId):
 *   - bestaande rij met bron === "manual" → behouden, derived versie negeren
 *   - bestaande rij met bron !== "manual" (derived of legacy) → vervangen door derived
 *   - nieuwe derived rij die niet bestond → toevoegen
 *
 * Items die er nu wel zijn maar in derived ontbreken → verwijderen tenzij ALLE rijen manual zijn.
 *
 * Toelichting per item: bestaande wint als niet-leeg.
 */
export function mergeGezamenlijkeRasci(
  bestaand: GezamenlijkRasciItem[],
  nieuwAfgeleid: GezamenlijkRasciItem[]
): GezamenlijkRasciItem[] {
  const key = (i: GezamenlijkRasciItem) => `${i.sectie}::${i.itemId}`;
  const bestaandMap = new Map(bestaand.map((i) => [key(i), i] as const));
  const nieuwMap = new Map(nieuwAfgeleid.map((i) => [key(i), i] as const));

  const out: GezamenlijkRasciItem[] = [];

  // 1) Loop nieuw afgeleide items
  for (const nieuw of nieuwAfgeleid) {
    const k = key(nieuw);
    const oud = bestaandMap.get(k);
    if (!oud) {
      out.push(nieuw);
      continue;
    }
    // Merge: behoud manual-rijen uit oud; vervang derived/legacy door nieuwe derived.
    const manualOud = (oud.rijen ?? []).filter((r) => r.bron === "manual");
    const manualRolIds = new Set(manualOud.map((r) => r.rolId));
    const nieuwDerived = (nieuw.rijen ?? []).filter((r) => !manualRolIds.has(r.rolId));
    out.push({
      ...nieuw,
      // Manual eerst (zichtbare voorrang), dan derived
      rijen: [...manualOud, ...nieuwDerived],
      toelichting: oud.toelichting && oud.toelichting.trim().length > 0 ? oud.toelichting : nieuw.toelichting,
    });
  }

  // 2) Items die in bestaand zijn maar niet meer afgeleid:
  //    - als ALLE rijen manual zijn → behouden (gebruiker heeft handmatig opgevoerd)
  //    - anders verwijderen
  for (const oud of bestaand) {
    const k = key(oud);
    if (nieuwMap.has(k)) continue;
    const allManual = (oud.rijen ?? []).every((r) => r.bron === "manual");
    if (allManual && (oud.rijen ?? []).length > 0) {
      out.push(oud);
    }
  }

  return out;
}

// ============================================================
// 4) Cell-update helpers
// ============================================================

/**
 * Wijzig of verwijder de letter voor een specifieke (item, rolId) combinatie.
 * Door gebruiker veroorzaakte wijzigingen krijgen automatisch bron === "manual".
 */
export function setGezamenlijkRasciCell(
  items: GezamenlijkRasciItem[],
  sectie: GezamenlijkeRasciSectie,
  itemId: string,
  rolId: string,
  letter: RasciLetter | null
): GezamenlijkRasciItem[] {
  return items.map((item) => {
    if (item.sectie !== sectie || item.itemId !== itemId) return item;
    let nextRijen = (item.rijen ?? []).filter((r) => r.rolId !== rolId);
    if (letter !== null) {
      nextRijen = [...nextRijen, { rolId, letter, bron: "manual" }];
    }
    return { ...item, rijen: nextRijen };
  });
}

/**
 * Tel A-cellen per rol over alle items — voor overload-check (>4 = waarschuwing).
 */
export function computeRolOverloadGezamenlijk(
  items: GezamenlijkRasciItem[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const rij of item.rijen ?? []) {
      if (rij.letter === "A") {
        counts.set(rij.rolId, (counts.get(rij.rolId) ?? 0) + 1);
      }
    }
  }
  return counts;
}

// ============================================================
// 5) Validatie — RASCI regels per rij
// ============================================================

export type RasciRijProbleem = {
  itemId: string;
  sectie: GezamenlijkeRasciSectie;
  reden: "geen_a" | "meerdere_a" | "geen_r";
};

export function validateGezamenlijkeRasci(items: GezamenlijkRasciItem[]): RasciRijProbleem[] {
  const out: RasciRijProbleem[] = [];
  for (const item of items) {
    const aCount = (item.rijen ?? []).filter((r) => r.letter === "A").length;
    const rCount = (item.rijen ?? []).filter((r) => r.letter === "R").length;
    if (aCount === 0) out.push({ itemId: item.itemId, sectie: item.sectie, reden: "geen_a" });
    else if (aCount > 1) out.push({ itemId: item.itemId, sectie: item.sectie, reden: "meerdere_a" });
    if (rCount === 0) out.push({ itemId: item.itemId, sectie: item.sectie, reden: "geen_r" });
  }
  return out;
}

// ============================================================
// 6) Sectie-meta voor UI
// ============================================================

export const SECTIE_LABELS: Record<GezamenlijkeRasciSectie, string> = {
  sector_baten: "Sector-baten",
  gezamenlijke_vermogens: "Gezamenlijke vermogens",
  gezamenlijke_inspanningen: "Gezamenlijke inspanningen",
  programmagovernance: "Programmagovernance",
};

export const SECTIE_TOELICHTING: Record<GezamenlijkeRasciSectie, string> = {
  sector_baten: "Per sector × baat (uit cross-analyse stap 1) — A = bateneigenaar, R = sectortrekker",
  gezamenlijke_vermogens: "Per drieluik-vermogen (uit cross-analyse stap 2) — A = domeineigenaar dominant domein",
  gezamenlijke_inspanningen: "Per cross-sectorale bundel (uit cross-analyse stap 4) — A/R direct uit dossier",
  programmagovernance: "Programmaritueel — besluitvorming, rapportage, escalatie, baten-realisatie",
};

export const SECTIE_VOLGORDE: GezamenlijkeRasciSectie[] = [
  "sector_baten",
  "gezamenlijke_vermogens",
  "gezamenlijke_inspanningen",
  "programmagovernance",
];
