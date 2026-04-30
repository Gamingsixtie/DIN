"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import { RASCI_LABELS, RASCI_TOELICHTING, RASCI_KLEUREN } from "@/lib/types";
import type {
  ProgrammaRol,
  Programmaorganisatie,
  ClusterRasci,
  ItemRasci,
  RasciItemType,
  RasciLetter,
  RasciRij,
  DINBenefit,
  DINCapability,
  DINEffort,
  VermogenClusterItem,
  InspanningClusterItem,
  AIProgrammaorganisatie,
  AIGovernanceRasciResponse,
  AIGovernanceItemRasciResponse,
  GezamenlijkRasciItem,
  GezamenlijkeRasciSectie,
} from "@/lib/types";
import {
  deriveProgrammaorganisatie,
  deriveGezamenlijkeRasci,
  mergeGezamenlijkeRasci,
  setGezamenlijkRasciCell,
  computeRolOverloadGezamenlijk,
  validateGezamenlijkeRasci,
  SECTIE_LABELS,
  SECTIE_TOELICHTING,
  SECTIE_VOLGORDE,
} from "@/lib/governance-derive";

type Tab = "organisatie" | "gezamenlijk" | "rasci";
type RasciSubTab = "clusters" | "benefits" | "capabilities";

export type ClusterBron = {
  clusterTitel: string;
  clusterType: "vermogen" | "inspanning";
  advies?: string;
  itemCount: number;
};

export function buildClusterBron(
  vermogenClusters: VermogenClusterItem[],
  inspanningClusters: InspanningClusterItem[]
): ClusterBron[] {
  return [
    ...vermogenClusters.map(
      (c): ClusterBron => ({
        clusterTitel: c.clusterTitel,
        clusterType: "vermogen",
        advies: c.advies,
        itemCount: c.items?.length ?? 0,
      })
    ),
    ...inspanningClusters.map(
      (c): ClusterBron => ({
        clusterTitel: c.clusterTitel,
        clusterType: "inspanning",
        advies: c.advies,
        itemCount: c.items?.length ?? 0,
      })
    ),
  ];
}

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRol(rol = ""): ProgrammaRol {
  return {
    id: generateId(),
    rol,
    naam: "",
    functie: "",
    sector: "",
    mandaat: "",
    toelichting: "",
  };
}

function hydrateAIRol(raw: AIProgrammaorganisatie["opdrachtgever"]): ProgrammaRol | undefined {
  if (!raw || !raw.rol?.trim()) return undefined;
  return {
    id: generateId(),
    rol: raw.rol,
    naam: raw.naam ?? "",
    functie: raw.functie ?? "",
    sector: raw.sector ?? "",
    mandaat: raw.mandaat ?? "",
    toelichting: raw.toelichting ?? "",
  };
}

function hydrateAIRolList(raws: AIProgrammaorganisatie["kerngroep"]): ProgrammaRol[] {
  return (raws ?? [])
    .filter((r) => r.rol?.trim())
    .map((r) => hydrateAIRol(r))
    .filter((r): r is ProgrammaRol => r !== undefined);
}

function emptyOrganisatie(): Programmaorganisatie {
  return {
    opdrachtgever: undefined,
    programmamanager: undefined,
    kerngroep: [],
    stuurgroep: [],
    klankbordgroep: [],
    domeineigenaren: [],
    besluitvormingsritme: "",
    escalatiepad: "",
    aiToelichting: "",
  };
}

function collectRollen(po: Programmaorganisatie | undefined): ProgrammaRol[] {
  if (!po) return [];
  const all: ProgrammaRol[] = [];
  if (po.opdrachtgever) all.push(po.opdrachtgever);
  if (po.programmamanager) all.push(po.programmamanager);
  all.push(...(po.kerngroep ?? []));
  all.push(...(po.stuurgroep ?? []));
  all.push(...(po.domeineigenaren ?? []));
  all.push(...(po.klankbordgroep ?? []));
  return all;
}

type AILoadingKind =
  | "none"
  | "organisatie"
  | "rasci-clusters"
  | "rasci-benefits"
  | "rasci-capabilities"
  | "rasci-efforts"
  | "rasci-all";

export default function GovernanceStep() {
  const { session, updateSession } = useSession();
  const [tab, setTab] = useState<Tab>("organisatie");
  const [rasciSubTab, setRasciSubTab] = useState<RasciSubTab>("clusters");
  const [aiLoading, setAILoading] = useState<AILoadingKind>("none");
  const [aiError, setAIError] = useState<string | null>(null);

  const clusters: ClusterBron[] = useMemo(() => {
    if (!session) return [];
    const wizard = session.crossAnalyseWizard;
    const vermogenClusters: VermogenClusterItem[] = wizard?.stepResults?.stap2?.vermogenClusters ?? [];
    const inspanningClusters: InspanningClusterItem[] = wizard?.stepResults?.stap3?.inspanningClusters ?? [];
    return [
      ...vermogenClusters.map(
        (c): ClusterBron => ({
          clusterTitel: c.clusterTitel,
          clusterType: "vermogen",
          advies: c.advies,
          itemCount: c.items?.length ?? 0,
        })
      ),
      ...inspanningClusters.map(
        (c): ClusterBron => ({
          clusterTitel: c.clusterTitel,
          clusterType: "inspanning",
          advies: c.advies,
          itemCount: c.items?.length ?? 0,
        })
      ),
    ];
  }, [session]);

  if (!session) return null;

  const po: Programmaorganisatie = session.programmaorganisatie ?? emptyOrganisatie();
  const rasci: ClusterRasci[] = session.clusterRasci ?? [];
  const itemRasci: ItemRasci[] = session.itemRasci ?? [];
  const gezamenlijkeRasci: GezamenlijkRasciItem[] = session.gezamenlijkeRasci ?? [];
  const rollen = collectRollen(po);

  // Items voor RASCI-uitbreiding (filter geconsolideerde uit)
  const benefits: DINBenefit[] = session.benefits;
  const activeCapabilities: DINCapability[] = session.capabilities.filter((c) => !c.consolidated);
  const activeEfforts: DINEffort[] = session.efforts.filter((e) => !e.consolidated);

  const rolLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rollen) if (r.rol) m.set(r.rol.toLowerCase().trim(), r.id);
    return m;
  }, [rollen]);

  async function handleAIOrganisatie() {
    if (!session) return;
    // Bescherm bestaande handmatige invoer tegen overschrijven
    const heeftBestaandeInvoer =
      po.opdrachtgever?.rol ||
      po.programmamanager?.rol ||
      (po.kerngroep ?? []).length > 0 ||
      (po.stuurgroep ?? []).length > 0 ||
      (po.domeineigenaren ?? []).length > 0 ||
      (po.klankbordgroep ?? []).length > 0;
    if (heeftBestaandeInvoer) {
      const ok = window.confirm(
        "Er staan al rollen ingevuld. AI vervangt de COMPLETE programmaorganisatie. Doorgaan?"
      );
      if (!ok) return;
    }
    setAILoading("organisatie");
    setAIError(null);
    try {
      const r = await fetch("/api/governance-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "organisatie",
          goals: session.goals,
          scope: session.scope ?? null,
          sectors: ["PO", "VO", "Zakelijk"],
          benefits: session.benefits,
          capabilities: session.capabilities,
          efforts: session.efforts.filter((e) => !e.consolidated),
        }),
      });
      const json = (await r.json()) as { success: boolean; data?: AIProgrammaorganisatie; error?: string };
      if (!r.ok || !json.success || !json.data) {
        throw new Error(json.error || "AI-aanroep mislukt");
      }
      const ai = json.data;
      const next: Programmaorganisatie = {
        opdrachtgever: hydrateAIRol(ai.opdrachtgever),
        programmamanager: hydrateAIRol(ai.programmamanager),
        kerngroep: hydrateAIRolList(ai.kerngroep),
        stuurgroep: hydrateAIRolList(ai.stuurgroep),
        klankbordgroep: hydrateAIRolList(ai.klankbordgroep),
        domeineigenaren: hydrateAIRolList(ai.domeineigenaren),
        besluitvormingsritme: ai.besluitvormingsritme ?? "",
        escalatiepad: ai.escalatiepad ?? "",
        aiToelichting: ai.aiToelichting ?? "",
      };
      updateSession(() => ({ programmaorganisatie: next }));
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "AI-aanroep mislukt");
    } finally {
      setAILoading("none");
    }
  }

  function checkPoIngevuld(): boolean {
    if (!po.opdrachtgever && (po.kerngroep ?? []).length === 0) {
      setAIError("Vul eerst de programmaorganisatie in.");
      return false;
    }
    return true;
  }

  // Deterministisch — geen AI: vul kerngroep + domeineigenaren uit cross-analyse stap 4
  function handleDeriveOrganisatie() {
    if (!session) return;
    setAIError(null);
    const result = deriveProgrammaorganisatie(session, po);
    if (result.ongewijzigd) {
      setAIError("Geen nieuwe rollen om af te leiden. Cross-analyse stap 4 leverde niets buiten wat al staat.");
      return;
    }
    updateSession(() => ({ programmaorganisatie: result.next }));
    // Niet-blokkerende flash via aiError-veld als info-bericht
    setAIError(
      `Toegevoegd: ${result.toegevoegdKerngroep} kerngroep-rol(len), ${result.toegevoegdDomeineigenaren} domeineigenaar(s). Bestaande handmatige rollen zijn behouden.`
    );
  }

  // Sync de "Gezamenlijk"-RASCI met cross-analyse — bewaart manual-overrides
  function handleSyncGezamenlijkeRasci() {
    if (!session) return;
    if (!checkPoIngevuld()) return;
    setAIError(null);
    const { items: derived, diagnostiek } = deriveGezamenlijkeRasci(session);
    const merged = mergeGezamenlijkeRasci(session.gezamenlijkeRasci ?? [], derived);
    updateSession(() => ({ gezamenlijkeRasci: merged }));
    if (diagnostiek.length > 0) {
      setAIError(
        `Gesynchroniseerd. ${diagnostiek.length} aandachtspunt(en): ` +
          diagnostiek.slice(0, 3).map((d) => d.reden).join(" · ") +
          (diagnostiek.length > 3 ? ` · +${diagnostiek.length - 3} meer` : "")
      );
    }
  }

  function setGezamenlijkCell(
    sectie: GezamenlijkeRasciSectie,
    itemId: string,
    rolId: string,
    letter: RasciLetter | null
  ) {
    updateSession((prev) => ({
      gezamenlijkeRasci: setGezamenlijkRasciCell(
        prev.gezamenlijkeRasci ?? [],
        sectie,
        itemId,
        rolId,
        letter
      ),
    }));
  }

  async function handleAIRasciClusters(skipConfirm = false) {
    if (!session) return;
    if (!checkPoIngevuld()) return;
    if (clusters.length === 0) {
      setAIError("Geen cross-sectorale clusters gevonden. Voltooi eerst de cross-analyse (stap 4).");
      return;
    }
    if (!skipConfirm && rasci.some((c) => c.rijen.length > 0)) {
      if (!window.confirm("Er is al cluster-RASCI ingevuld. AI vervangt de COMPLETE matrix. Doorgaan?")) return;
    }
    setAILoading("rasci-clusters");
    setAIError(null);
    try {
      const wizard = session.crossAnalyseWizard;
      const r = await fetch("/api/governance-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "rasci-clusters",
          goals: session.goals,
          scope: session.scope ?? null,
          programmaorganisatie: po,
          vermogenClusters: wizard?.stepResults?.stap2?.vermogenClusters ?? [],
          inspanningClusters: wizard?.stepResults?.stap3?.inspanningClusters ?? [],
        }),
      });
      const json = (await r.json()) as { success: boolean; data?: AIGovernanceRasciResponse; error?: string };
      if (!r.ok || !json.success || !json.data) throw new Error(json.error || "AI-aanroep mislukt");

      const nextRasci: ClusterRasci[] = json.data.clusters.map((c) => {
        const rijen: RasciRij[] = [];
        for (const r of c.rijen ?? []) {
          const match = rolLookup.get(r.rolLabel.toLowerCase().trim());
          if (match) rijen.push({ rolId: match, letter: r.letter });
        }
        return {
          clusterTitel: c.clusterTitel,
          clusterType: c.clusterType,
          toelichting: c.toelichting ?? "",
          rijen,
          overrides: [],
        };
      });

      updateSession(() => ({ clusterRasci: nextRasci }));
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "AI-aanroep mislukt");
    } finally {
      setAILoading("none");
    }
  }

  async function handleAIRasciItems(
    itemType: RasciItemType,
    skipConfirm = false
  ) {
    if (!session) return;
    if (!checkPoIngevuld()) return;

    const items =
      itemType === "benefit" ? benefits : itemType === "capability" ? activeCapabilities : activeEfforts;
    if (items.length === 0) {
      setAIError(`Geen ${itemType === "benefit" ? "baten" : itemType === "capability" ? "vermogens" : "inspanningen"} gevonden.`);
      return;
    }

    const heeftItemData = itemRasci.some((i) => i.itemType === itemType && i.rijen.length > 0);
    if (!skipConfirm && heeftItemData) {
      if (!window.confirm(`Er is al RASCI voor ${itemType === "benefit" ? "baten" : itemType === "capability" ? "vermogens" : "inspanningen"}. AI vervangt deze. Doorgaan?`)) return;
    }

    const loadingKind: AILoadingKind =
      itemType === "benefit" ? "rasci-benefits" : itemType === "capability" ? "rasci-capabilities" : "rasci-efforts";
    setAILoading(loadingKind);
    setAIError(null);
    try {
      const mode =
        itemType === "benefit" ? "rasci-benefits" : itemType === "capability" ? "rasci-capabilities" : "rasci-efforts";
      const payload: Record<string, unknown> = {
        mode,
        goals: session.goals,
        scope: session.scope ?? null,
        programmaorganisatie: po,
      };
      if (itemType === "benefit") payload.benefits = benefits;
      if (itemType === "capability") payload.capabilities = activeCapabilities;
      if (itemType === "effort") payload.efforts = activeEfforts;

      const r = await fetch("/api/governance-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await r.json()) as { success: boolean; data?: AIGovernanceItemRasciResponse; error?: string };
      if (!r.ok || !json.success || !json.data) throw new Error(json.error || "AI-aanroep mislukt");

      // Build item meta lookup (sectorId)
      const sectorById = new Map<string, string | undefined>();
      for (const it of items) sectorById.set(it.id, "sectorId" in it ? it.sectorId : undefined);

      const aiItems = json.data.items.map((it): ItemRasci => {
        const rijen: RasciRij[] = [];
        for (const rij of it.rijen ?? []) {
          const match = rolLookup.get(rij.rolLabel.toLowerCase().trim());
          if (match) rijen.push({ rolId: match, letter: rij.letter });
        }
        return {
          itemId: it.itemId,
          itemType,
          sectorId: sectorById.get(it.itemId) ?? undefined,
          rijen,
          toelichting: it.toelichting ?? "",
        };
      });

      updateSession((prev) => {
        const others = (prev.itemRasci ?? []).filter((i) => i.itemType !== itemType);
        return { itemRasci: [...others, ...aiItems] };
      });
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "AI-aanroep mislukt");
    } finally {
      setAILoading("none");
    }
  }

  async function handleAIRasciAll() {
    if (!session) return;
    if (!checkPoIngevuld()) return;
    const heeftEnige =
      rasci.some((c) => c.rijen.length > 0) ||
      itemRasci.some((i) => i.itemType !== "effort" && i.rijen.length > 0);
    if (heeftEnige) {
      if (!window.confirm("Er is al RASCI ingevuld op één of meer niveaus. AI vervangt ALLE matrices (clusters + baten + vermogens). Doorgaan?")) return;
    }
    setAILoading("rasci-all");
    setAIError(null);
    try {
      await Promise.all([
        handleAIRasciClusters(true),
        handleAIRasciItems("benefit", true),
        handleAIRasciItems("capability", true),
      ]);
    } finally {
      setAILoading("none");
    }
  }

  function updatePo(updater: (prev: Programmaorganisatie) => Programmaorganisatie) {
    updateSession((prev) => ({
      programmaorganisatie: updater(prev.programmaorganisatie ?? emptyOrganisatie()),
    }));
  }

  function updateRasci(updater: (prev: ClusterRasci[]) => ClusterRasci[]) {
    updateSession((prev) => ({ clusterRasci: updater(prev.clusterRasci ?? []) }));
  }

  function updateItemRasci(updater: (prev: ItemRasci[]) => ItemRasci[]) {
    updateSession((prev) => ({ itemRasci: updater(prev.itemRasci ?? []) }));
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-cito-blue mb-2">Stap 5 — Programmaorganisatie & RASCI</h2>
            <p className="text-gray-600">
              Leg vast wie het programma stuurt en wie op elk cross-sectoraal cluster welke rol heeft.
              Gebaseerd op &quot;Werken aan Programma&apos;s&quot; (Wijnen &amp; Van der Tak, Hoofdstuk 6).
            </p>
          </div>
          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-opgeslagen tijdens typen
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <TabButton active={tab === "organisatie"} onClick={() => setTab("organisatie")}>
          Programmaorganisatie
        </TabButton>
        <TabButton active={tab === "gezamenlijk"} onClick={() => setTab("gezamenlijk")}>
          Gezamenlijk (uit cross-analyse)
          {gezamenlijkeRasci.length > 0 && (
            <span className="ml-2 text-xs bg-cito-blue text-white px-2 py-0.5 rounded-full">
              {gezamenlijkeRasci.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "rasci"} onClick={() => setTab("rasci")}>
          Geavanceerd: oude RASCI-tabs
          {rasci.length > 0 && (
            <span className="ml-2 text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded-full">
              {rasci.length}
            </span>
          )}
        </TabButton>
      </div>

      {aiError && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
          {aiError}
        </div>
      )}

      {tab === "organisatie" && (
        <OrganisatieTab
          po={po}
          onUpdate={updatePo}
          onAI={handleAIOrganisatie}
          onDerive={handleDeriveOrganisatie}
          aiLoading={aiLoading === "organisatie"}
        />
      )}

      {tab === "gezamenlijk" && (
        <GezamenlijkTab
          items={gezamenlijkeRasci}
          rollen={rollen}
          onSync={handleSyncGezamenlijkeRasci}
          onSetCell={setGezamenlijkCell}
          hasSession={true}
          hasCrossAnalyse={
            (session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? []).length > 0
          }
        />
      )}

      {tab === "rasci" && (
        <RasciTab
          subTab={rasciSubTab}
          onSubTab={setRasciSubTab}
          rasci={rasci}
          itemRasci={itemRasci}
          clusters={clusters}
          benefits={benefits}
          capabilities={activeCapabilities}
          goals={session.goals}
          rollen={rollen}
          onUpdateClusters={updateRasci}
          onUpdateItems={updateItemRasci}
          onAIClusters={() => handleAIRasciClusters()}
          onAIItems={(t) => handleAIRasciItems(t)}
          onAIAll={handleAIRasciAll}
          aiLoading={aiLoading}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-cito-blue text-cito-blue"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Organisatie Tab
// ============================================================

function OrganisatieTab({
  po,
  onUpdate,
  onAI,
  onDerive,
  aiLoading,
}: {
  po: Programmaorganisatie;
  onUpdate: (updater: (prev: Programmaorganisatie) => Programmaorganisatie) => void;
  onAI: () => void;
  onDerive: () => void;
  aiLoading: boolean;
}) {
  function setSingle(field: "opdrachtgever" | "programmamanager", rol: ProgrammaRol | undefined) {
    onUpdate((prev) => ({ ...prev, [field]: rol }));
  }

  function updateList(
    field: "kerngroep" | "stuurgroep" | "klankbordgroep" | "domeineigenaren",
    list: ProgrammaRol[]
  ) {
    onUpdate((prev) => ({ ...prev, [field]: list }));
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded border border-emerald-200 bg-emerald-50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="text-sm font-semibold text-emerald-900">Vul uit cross-analyse (aanbevolen)</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              Kerngroep = unieke inspanningsleiders uit stap 4. Domeineigenaren = meest voorkomende eigenaar per domein.
              Bestaande handmatige rollen blijven staan.
            </p>
          </div>
          <button
            onClick={onDerive}
            className="px-4 py-2 rounded bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
          >
            Vul kerngroep + domeineigenaren
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded border border-cito-blue/20 bg-cito-blue/5">
        <div>
          <p className="text-sm font-semibold text-cito-blue">Of: AI-voorstel volledige programmaorganisatie</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Vervangt de COMPLETE organisatie. Gebruik alleen als je opnieuw wil beginnen.
          </p>
        </div>
        <button
          onClick={onAI}
          disabled={aiLoading}
          className="px-4 py-2 rounded bg-cito-blue text-white text-sm font-medium hover:bg-cito-blue/90 disabled:opacity-50"
        >
          {aiLoading ? "Bezig…" : "AI: stel voor"}
        </button>
      </div>

      {po.aiToelichting && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span className="font-semibold">AI-rationale: </span>
          {po.aiToelichting}
        </div>
      )}

      <OrganigramView po={po} />

      <SingleRolCard
        titel="Opdrachtgever"
        subtitle="Eindverantwoordelijk voor het programma (exact 1)"
        rol={po.opdrachtgever}
        onChange={(r) => setSingle("opdrachtgever", r)}
      />

      <SingleRolCard
        titel="Programmamanager"
        subtitle="Dagelijkse leiding, rapporteert aan opdrachtgever (exact 1)"
        rol={po.programmamanager}
        onChange={(r) => setSingle("programmamanager", r)}
      />

      <RolListCard
        titel="Kerngroep"
        subtitle="Trekkers van inspanningsclusters / domeineigenaren — 4-7 leden, paritair over sectoren"
        rollen={po.kerngroep ?? []}
        onChange={(list) => updateList("kerngroep", list)}
      />

      <RolListCard
        titel="Stuurgroep"
        subtitle="Strategische sturing — opdrachtgever + sectordirecteuren + senior stakeholders"
        rollen={po.stuurgroep ?? []}
        onChange={(list) => updateList("stuurgroep", list)}
      />

      <RolListCard
        titel="Domeineigenaren"
        subtitle="Eén per DIN-domein: Mens / Processen / Data & Systemen / Cultuur"
        rollen={po.domeineigenaren ?? []}
        onChange={(list) => updateList("domeineigenaren", list)}
      />

      <RolListCard
        titel="Klankbordgroep"
        subtitle="Reflectie, advies — zonder besluitvormingsmandaat"
        rollen={po.klankbordgroep ?? []}
        onChange={(list) => updateList("klankbordgroep", list)}
      />

      <div className="p-4 rounded border border-gray-200 bg-white">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Besluitvorming & Escalatie</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Besluitvormingsritme</label>
            <textarea
              value={po.besluitvormingsritme ?? ""}
              onChange={(e) => onUpdate((prev) => ({ ...prev, besluitvormingsritme: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={2}
              placeholder="bv. Stuurgroep maandelijks; kerngroep wekelijks; klankbordgroep per kwartaal."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Escalatiepad</label>
            <textarea
              value={po.escalatiepad ?? ""}
              onChange={(e) => onUpdate((prev) => ({ ...prev, escalatiepad: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={2}
              placeholder="bv. Inspanningsleider → Domeineigenaar → Programmamanager → Stuurgroep → Opdrachtgever"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SingleRolCard({
  titel,
  subtitle,
  rol,
  onChange,
}: {
  titel: string;
  subtitle: string;
  rol: ProgrammaRol | undefined;
  onChange: (rol: ProgrammaRol | undefined) => void;
}) {
  return (
    <div className="p-4 rounded border border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{titel}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {rol ? (
          <button
            onClick={() => onChange(undefined)}
            className="text-xs text-red-600 hover:text-red-700"
            title="Rol verwijderen"
          >
            Verwijderen
          </button>
        ) : (
          <button
            onClick={() => onChange(emptyRol(titel))}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            + Rol toevoegen
          </button>
        )}
      </div>
      {rol && <RolEditor rol={rol} onChange={(next) => onChange(next)} />}
    </div>
  );
}

function RolListCard({
  titel,
  subtitle,
  rollen,
  onChange,
}: {
  titel: string;
  subtitle: string;
  rollen: ProgrammaRol[];
  onChange: (list: ProgrammaRol[]) => void;
}) {
  return (
    <div className="p-4 rounded border border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            {titel}
            <span className="ml-2 text-xs font-normal text-gray-500">({rollen.length})</span>
          </h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <button
          onClick={() => onChange([...rollen, emptyRol()])}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          + Lid toevoegen
        </button>
      </div>
      {rollen.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nog geen leden toegevoegd.</p>
      ) : (
        <div className="space-y-3">
          {rollen.map((r, idx) => (
            <div key={r.id} className="border-l-2 border-cito-blue/30 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Lid {idx + 1}</span>
                <button
                  onClick={() => onChange(rollen.filter((x) => x.id !== r.id))}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Verwijderen
                </button>
              </div>
              <RolEditor
                rol={r}
                onChange={(next) => onChange(rollen.map((x) => (x.id === r.id ? next : x)))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RolEditor({ rol, onChange }: { rol: ProgrammaRol; onChange: (next: ProgrammaRol) => void }) {
  function set<K extends keyof ProgrammaRol>(key: K, value: ProgrammaRol[K]) {
    onChange({ ...rol, [key]: value });
  }
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-0.5">Rol / functie *</label>
        <input
          type="text"
          value={rol.rol}
          onChange={(e) => set("rol", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="bv. Sectormanager PO, Domeineigenaar Mens"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-0.5">Naam (optioneel)</label>
        <input
          type="text"
          value={rol.naam ?? ""}
          onChange={(e) => set("naam", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-0.5">Sector</label>
        <select
          value={rol.sector ?? ""}
          onChange={(e) => set("sector", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option value="">—</option>
          <option value="PO">PO</option>
          <option value="VO">VO</option>
          <option value="Zakelijk">Zakelijk</option>
          <option value="Programmabreed">Programmabreed</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-0.5">Mandaat / besluitruimte</label>
        <input
          type="text"
          value={rol.mandaat ?? ""}
          onChange={(e) => set("mandaat", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="bv. Goedkeuring scope-wijzigingen en budget > €100k"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-0.5">Toelichting</label>
        <input
          type="text"
          value={rol.toelichting ?? ""}
          onChange={(e) => set("toelichting", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

// ============================================================
// RASCI Tab
// ============================================================

function RasciTab({
  subTab,
  onSubTab,
  rasci,
  itemRasci,
  clusters,
  benefits,
  capabilities,
  goals,
  rollen,
  onUpdateClusters,
  onUpdateItems,
  onAIClusters,
  onAIItems,
  onAIAll,
  aiLoading,
}: {
  subTab: RasciSubTab;
  onSubTab: (t: RasciSubTab) => void;
  rasci: ClusterRasci[];
  itemRasci: ItemRasci[];
  clusters: ClusterBron[];
  benefits: DINBenefit[];
  capabilities: DINCapability[];
  goals: { id: string; name: string; rank: number }[];
  rollen: ProgrammaRol[];
  onUpdateClusters: (updater: (prev: ClusterRasci[]) => ClusterRasci[]) => void;
  onUpdateItems: (updater: (prev: ItemRasci[]) => ItemRasci[]) => void;
  onAIClusters: () => void;
  onAIItems: (t: RasciItemType) => void;
  onAIAll: () => void;
  aiLoading: AILoadingKind;
}) {
  if (rollen.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 font-medium mb-1">Geen rollen gedefinieerd.</p>
        <p className="text-sm text-gray-500">Vul eerst de programmaorganisatie in.</p>
      </div>
    );
  }

  // ----- Cluster setters -----
  function setClusterCell(clusterTitel: string, rolId: string, letter: RasciLetter | null) {
    onUpdateClusters((prev) => {
      const existing = prev.find((r) => r.clusterTitel === clusterTitel);
      const baseCluster = clusters.find((c) => c.clusterTitel === clusterTitel);
      if (!baseCluster) return prev;
      const current: ClusterRasci = existing ?? {
        clusterTitel,
        clusterType: baseCluster.clusterType,
        toelichting: "",
        rijen: [],
        overrides: [],
      };
      let nextRijen = current.rijen.filter((r) => r.rolId !== rolId);
      if (letter !== null) nextRijen = [...nextRijen, { rolId, letter }];
      const nextCluster: ClusterRasci = { ...current, rijen: nextRijen };
      const rest = prev.filter((r) => r.clusterTitel !== clusterTitel);
      return [...rest, nextCluster];
    });
  }
  function setClusterToelichting(clusterTitel: string, toelichting: string) {
    onUpdateClusters((prev) => {
      const existing = prev.find((r) => r.clusterTitel === clusterTitel);
      const baseCluster = clusters.find((c) => c.clusterTitel === clusterTitel);
      if (!baseCluster) return prev;
      const current: ClusterRasci = existing ?? {
        clusterTitel,
        clusterType: baseCluster.clusterType,
        toelichting: "",
        rijen: [],
        overrides: [],
      };
      const nextCluster: ClusterRasci = { ...current, toelichting };
      return [...prev.filter((r) => r.clusterTitel !== clusterTitel), nextCluster];
    });
  }

  // ----- Item setters -----
  function setItemCell(
    itemId: string,
    itemType: RasciItemType,
    sectorId: string | undefined,
    rolId: string,
    letter: RasciLetter | null
  ) {
    onUpdateItems((prev) => {
      const existing = prev.find((i) => i.itemId === itemId);
      const current: ItemRasci = existing ?? {
        itemId,
        itemType,
        sectorId,
        rijen: [],
        toelichting: "",
      };
      let nextRijen = current.rijen.filter((r) => r.rolId !== rolId);
      if (letter !== null) nextRijen = [...nextRijen, { rolId, letter }];
      const nextItem: ItemRasci = { ...current, rijen: nextRijen };
      const rest = prev.filter((i) => i.itemId !== itemId);
      return [...rest, nextItem];
    });
  }

  function setItemToelichting(
    itemId: string,
    itemType: RasciItemType,
    sectorId: string | undefined,
    toelichting: string
  ) {
    onUpdateItems((prev) => {
      const existing = prev.find((i) => i.itemId === itemId);
      const current: ItemRasci = existing ?? {
        itemId,
        itemType,
        sectorId,
        rijen: [],
        toelichting: "",
      };
      const nextItem: ItemRasci = { ...current, toelichting };
      return [...prev.filter((i) => i.itemId !== itemId), nextItem];
    });
  }

  function copyItemFrom(
    targetItemId: string,
    itemType: RasciItemType,
    sectorId: string | undefined,
    sourceItemId: string
  ) {
    onUpdateItems((prev) => {
      const source = prev.find((i) => i.itemId === sourceItemId);
      if (!source) return prev;
      const nextItem: ItemRasci = {
        itemId: targetItemId,
        itemType,
        sectorId,
        rijen: source.rijen.map((r) => ({ rolId: r.rolId, letter: r.letter })),
        toelichting: source.toelichting ?? "",
      };
      return [...prev.filter((i) => i.itemId !== targetItemId), nextItem];
    });
  }

  function copyClusterFrom(targetTitel: string, sourceTitel: string) {
    onUpdateClusters((prev) => {
      const source = prev.find((c) => c.clusterTitel === sourceTitel);
      const baseCluster = clusters.find((c) => c.clusterTitel === targetTitel);
      if (!source || !baseCluster) return prev;
      const nextCluster: ClusterRasci = {
        clusterTitel: targetTitel,
        clusterType: baseCluster.clusterType,
        toelichting: source.toelichting ?? "",
        rijen: source.rijen.map((r) => ({ rolId: r.rolId, letter: r.letter })),
        overrides: [],
      };
      return [...prev.filter((c) => c.clusterTitel !== targetTitel), nextCluster];
    });
  }

  // Sync clusters
  const rasciByTitel = new Map(rasci.map((r) => [r.clusterTitel, r]));
  const syncedClusterRasci: ClusterRasci[] = clusters.map(
    (c) =>
      rasciByTitel.get(c.clusterTitel) ?? {
        clusterTitel: c.clusterTitel,
        clusterType: c.clusterType,
        toelichting: "",
        rijen: [],
        overrides: [],
      }
  );

  // Bouw per-itemtype rijen voor matrix
  const benefitRows: ItemRasciRow[] = benefits.map((b) => {
    const titel = b.title || (b.description?.length ?? 0) > 70 ? `${(b.description || "").slice(0, 70)}…` : b.description || "(naamloos)";
    const goal = goals.find((g) => g.id === b.goalId);
    return {
      itemId: b.id,
      itemType: "benefit",
      sectorId: b.sectorId,
      titel,
      groupKey: goal ? `Doel ${goal.rank}: ${goal.name}` : `Sector ${b.sectorId}`,
    };
  });
  const capabilityRows: ItemRasciRow[] = capabilities.map((c) => ({
    itemId: c.id,
    itemType: "capability",
    sectorId: c.sectorId,
    titel: c.title || c.description?.slice(0, 70) || "(naamloos)",
    groupKey: `Sector ${c.sectorId}`,
  }));
  // Counters per sub-tab
  const benefitCount = benefits.length;
  const capabilityCount = capabilities.length;
  const clusterCount = clusters.length;

  // Overload check (regel: geen rol meer dan 4 A's)
  const overload = computeRoleOverload(syncedClusterRasci, itemRasci, rollen);

  return (
    <div className="space-y-6">
      {/* AI all-in-one + per-laag knop */}
      <div className="flex items-center justify-between gap-3 p-4 rounded border border-cito-blue/20 bg-cito-blue/5 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-cito-blue">AI-voorstel RASCI</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Vul alle drie de niveaus parallel, of per laag — clusters, baten, vermogens.
          </p>
        </div>
        <button
          onClick={onAIAll}
          disabled={aiLoading !== "none"}
          className="px-4 py-2 rounded bg-cito-blue text-white text-sm font-medium hover:bg-cito-blue/90 disabled:opacity-50"
        >
          {aiLoading === "rasci-all" ? "Bezig…" : "AI: vul ALLE RASCI"}
        </button>
      </div>

      {/* RASCI-legenda */}
      <div className="p-3 rounded bg-gray-50 border border-gray-200 text-xs text-gray-700">
        <p className="font-semibold mb-2">RASCI-regels: exact 1 A + minstens 1 R per rij. V is optioneel.</p>
        <div className="flex flex-wrap gap-3">
          {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => (
            <span key={l} className="inline-flex items-center gap-1">
              <span className={`inline-block w-5 text-center text-[11px] border rounded ${RASCI_KLEUREN[l]}`}>
                {l}
              </span>
              <span className="text-gray-600">
                <b>{RASCI_LABELS[l]}</b> — {RASCI_TOELICHTING[l]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        <SubTabButton active={subTab === "clusters"} onClick={() => onSubTab("clusters")} count={clusterCount}>
          Cross-sectorale clusters
        </SubTabButton>
        <SubTabButton active={subTab === "benefits"} onClick={() => onSubTab("benefits")} count={benefitCount}>
          Baten
        </SubTabButton>
        <SubTabButton active={subTab === "capabilities"} onClick={() => onSubTab("capabilities")} count={capabilityCount}>
          Individuele vermogens
        </SubTabButton>
      </div>

      {overload.length > 0 && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <p className="font-semibold mb-1">⚠ Rol-overload: deze rollen hebben &gt;4 A&apos;s</p>
          <ul className="list-disc ml-5 space-y-0.5">
            {overload.map((o) => (
              <li key={o.rolId}><b>{o.rol}</b> — {o.aCount} A&apos;s. Verdeel over kerngroep/domeineigenaren.</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sub-tab content */}
      {subTab === "clusters" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cito-blue">Cross-sectorale clusters</h3>
            <button
              onClick={onAIClusters}
              disabled={aiLoading !== "none"}
              className="text-xs px-3 py-1.5 rounded bg-cito-blue text-white font-medium hover:bg-cito-blue/90 disabled:opacity-50"
            >
              {aiLoading === "rasci-clusters" || aiLoading === "rasci-all" ? "Bezig…" : "AI: vul clusters"}
            </button>
          </div>
          {clusters.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
              Geen cross-sectorale clusters. Voltooi eerst stap 4 (Cross-analyse).
            </div>
          ) : (
            <>
              <RasciFullMatrix
                clusters={clusters}
                rollen={rollen}
                rasci={syncedClusterRasci}
                onSetCell={setClusterCell}
              />
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-cito-blue hover:text-cito-blue/80">
                  <span className="transition-transform group-open:rotate-90">▶</span>
                  Detailweergave per cluster (met toelichting)
                </summary>
                <div className="space-y-4 mt-4">
                  {syncedClusterRasci.map((row) => (
                    <ClusterRasciRow
                      key={row.clusterTitel}
                      row={row}
                      clusterBron={clusters.find((c) => c.clusterTitel === row.clusterTitel)!}
                      rollen={rollen}
                      otherClusters={syncedClusterRasci.filter(
                        (c) => c.clusterTitel !== row.clusterTitel && c.rijen.length > 0
                      )}
                      onSetRij={(rolId, letter) => setClusterCell(row.clusterTitel, rolId, letter)}
                      onSetToelichting={(t) => setClusterToelichting(row.clusterTitel, t)}
                      onCopyFrom={(sourceTitel) => copyClusterFrom(row.clusterTitel, sourceTitel)}
                    />
                  ))}
                </div>
              </details>
            </>
          )}
        </div>
      )}

      {subTab === "benefits" && (
        <ItemRasciSection
          titel="RASCI per individuele baat"
          subtitel="A = bateneigenaar; R = domeineigenaar(en) van bijdragende vermogens. V is optioneel voor onafhankelijke verificatie."
          rows={benefitRows}
          rollen={rollen}
          itemRasci={itemRasci}
          aiLoadingThis={aiLoading === "rasci-benefits" || aiLoading === "rasci-all"}
          aiDisabled={aiLoading !== "none"}
          onAI={() => onAIItems("benefit")}
          onSetCell={(itemId, sectorId, rolId, letter) =>
            setItemCell(itemId, "benefit", sectorId, rolId, letter)
          }
          onSetToelichting={(itemId, sectorId, t) =>
            setItemToelichting(itemId, "benefit", sectorId, t)
          }
          onCopyFrom={(itemId, sectorId, sourceItemId) =>
            copyItemFrom(itemId, "benefit", sectorId, sourceItemId)
          }
        />
      )}

      {subTab === "capabilities" && (
        <ItemRasciSection
          titel="RASCI per individueel vermogen (per sector)"
          subtitel="A = domeineigenaar van het overheersende DIN-domein binnen die sector; R = sectortrekker."
          rows={capabilityRows}
          rollen={rollen}
          itemRasci={itemRasci}
          aiLoadingThis={aiLoading === "rasci-capabilities" || aiLoading === "rasci-all"}
          aiDisabled={aiLoading !== "none"}
          onAI={() => onAIItems("capability")}
          onSetCell={(itemId, sectorId, rolId, letter) =>
            setItemCell(itemId, "capability", sectorId, rolId, letter)
          }
          onSetToelichting={(itemId, sectorId, t) =>
            setItemToelichting(itemId, "capability", sectorId, t)
          }
          onCopyFrom={(itemId, sectorId, sourceItemId) =>
            copyItemFrom(itemId, "capability", sectorId, sourceItemId)
          }
        />
      )}
    </div>
  );
}

// ----- Helpers -----
type ItemRasciRow = {
  itemId: string;
  itemType: RasciItemType;
  sectorId?: string;
  titel: string;
  groupKey: string;
};

function SubTabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
        active ? "border-cito-blue text-cito-blue" : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-cito-blue text-white" : "bg-gray-200 text-gray-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function computeRoleOverload(
  clusterRasci: ClusterRasci[],
  itemRasci: ItemRasci[],
  rollen: ProgrammaRol[]
): { rolId: string; rol: string; aCount: number }[] {
  const counts = new Map<string, number>();
  for (const c of clusterRasci) for (const rij of c.rijen) {
    if (rij.letter === "A") counts.set(rij.rolId, (counts.get(rij.rolId) ?? 0) + 1);
  }
  for (const it of itemRasci) for (const rij of it.rijen) {
    if (rij.letter === "A") counts.set(rij.rolId, (counts.get(rij.rolId) ?? 0) + 1);
  }
  const out: { rolId: string; rol: string; aCount: number }[] = [];
  for (const [rolId, n] of counts) {
    if (n > 4) {
      const rol = rollen.find((r) => r.id === rolId);
      out.push({ rolId, rol: rol?.rol ?? "(onbekende rol)", aCount: n });
    }
  }
  return out.sort((a, b) => b.aCount - a.aCount);
}

function ItemRasciSection({
  titel,
  subtitel,
  rows,
  rollen,
  itemRasci,
  aiLoadingThis,
  aiDisabled,
  onAI,
  onSetCell,
  onSetToelichting,
  onCopyFrom,
}: {
  titel: string;
  subtitel: string;
  rows: ItemRasciRow[];
  rollen: ProgrammaRol[];
  itemRasci: ItemRasci[];
  aiLoadingThis: boolean;
  aiDisabled: boolean;
  onAI: () => void;
  onSetCell: (itemId: string, sectorId: string | undefined, rolId: string, letter: RasciLetter | null) => void;
  onSetToelichting: (itemId: string, sectorId: string | undefined, t: string) => void;
  onCopyFrom: (itemId: string, sectorId: string | undefined, sourceItemId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
        Geen items beschikbaar voor deze categorie.
      </div>
    );
  }

  // Group by groupKey, preserve first-seen order
  const groupOrder: string[] = [];
  const groups = new Map<string, ItemRasciRow[]>();
  for (const r of rows) {
    if (!groups.has(r.groupKey)) {
      groups.set(r.groupKey, []);
      groupOrder.push(r.groupKey);
    }
    groups.get(r.groupKey)!.push(r);
  }

  const itemMap = new Map(itemRasci.map((i) => [i.itemId, i]));
  const totalRows = rows.length;
  const validRows = rows.filter((r) => {
    const it = itemMap.get(r.itemId);
    if (!it) return false;
    const nA = it.rijen.filter((x) => x.letter === "A").length;
    const nR = it.rijen.filter((x) => x.letter === "R").length;
    return nA === 1 && nR >= 1;
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-cito-blue">{titel}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{subtitel}</p>
          <p className="text-[11px] text-gray-500 mt-1">{validRows}/{totalRows} rijen geldig (1 A + ≥1 R)</p>
        </div>
        <button
          onClick={onAI}
          disabled={aiDisabled}
          className="text-xs px-3 py-1.5 rounded bg-cito-blue text-white font-medium hover:bg-cito-blue/90 disabled:opacity-50 shrink-0"
        >
          {aiLoadingThis ? "Bezig…" : "AI: vul deze laag"}
        </button>
      </div>

      <div className="rounded border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-gray-100 border-b border-r border-gray-200 px-2 py-2 text-left font-bold text-gray-700 sticky left-0 z-20 min-w-[260px]">
                  Item
                </th>
                {rollen.map((rol) => (
                  <th
                    key={rol.id}
                    className="bg-gray-100 border-b border-r border-gray-200 px-1.5 py-2 text-center font-bold text-gray-700 align-bottom"
                    style={{ minWidth: 50 }}
                  >
                    <div
                      className="text-[10px] leading-tight whitespace-normal"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        maxHeight: 110,
                        margin: "0 auto",
                      }}
                    >
                      {rol.rol}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupOrder.map((groupKey) => (
                <>
                  <tr key={`g-${groupKey}`} className="bg-cito-blue/5">
                    <td
                      colSpan={rollen.length + 1}
                      className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cito-blue/80"
                    >
                      {groupKey}
                    </td>
                  </tr>
                  {groups.get(groupKey)!.map((r) => {
                    const it = itemMap.get(r.itemId);
                    const rijMap = new Map((it?.rijen ?? []).map((rij) => [rij.rolId, rij.letter]));
                    const nA = (it?.rijen ?? []).filter((x) => x.letter === "A").length;
                    const nR = (it?.rijen ?? []).filter((x) => x.letter === "R").length;
                    const valid = nA === 1 && nR >= 1;
                    return (
                      <tr key={r.itemId} className="hover:bg-gray-50/50">
                        <td className="border-b border-r border-gray-200 px-2 py-1.5 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-800 leading-tight">{r.titel}</span>
                            <span
                              className={`ml-auto shrink-0 w-2 h-2 rounded-full ${valid ? "bg-green-500" : "bg-amber-400"}`}
                              title={valid ? "Geldig" : `${nA} A, ${nR} R`}
                            />
                          </div>
                        </td>
                        {rollen.map((rol) => {
                          const letter = rijMap.get(rol.id);
                          return (
                            <td key={rol.id} className="border-b border-r border-gray-200 text-center p-0.5" style={{ minWidth: 50 }}>
                              <select
                                value={letter ?? ""}
                                onChange={(e) =>
                                  onSetCell(
                                    r.itemId,
                                    r.sectorId,
                                    rol.id,
                                    (e.target.value as RasciLetter) || null
                                  )
                                }
                                className={`w-full text-[11px] font-bold text-center border-none rounded cursor-pointer ${
                                  letter ? RASCI_KLEUREN[letter] : "text-gray-300 bg-white hover:bg-gray-100"
                                }`}
                                style={{ height: 26, paddingLeft: 4, paddingRight: 4 }}
                                title={letter ? `${RASCI_LABELS[letter]} — ${RASCI_TOELICHTING[letter]}` : "Geen rol"}
                              >
                                <option value="">·</option>
                                <option value="R">R</option>
                                <option value="A">A</option>
                                <option value="S">S</option>
                                <option value="C">C</option>
                                <option value="I">I</option>
                                <option value="V">V</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-cito-blue hover:text-cito-blue/80">
          <span className="transition-transform group-open:rotate-90">▶</span>
          Detailweergave per item (met toelichting + kopieer-functie)
        </summary>
        <div className="space-y-4 mt-4">
          {rows.map((r) => {
            const it = itemMap.get(r.itemId);
            const others = rows.filter(
              (o) => o.itemId !== r.itemId && (itemMap.get(o.itemId)?.rijen?.length ?? 0) > 0
            );
            return (
              <ItemRasciDetailCard
                key={r.itemId}
                row={r}
                itemRasci={it}
                rollen={rollen}
                otherRows={others}
                onSetRij={(rolId, letter) => onSetCell(r.itemId, r.sectorId, rolId, letter)}
                onSetToelichting={(t) => onSetToelichting(r.itemId, r.sectorId, t)}
                onCopyFrom={(sourceItemId) => onCopyFrom(r.itemId, r.sectorId, sourceItemId)}
              />
            );
          })}
        </div>
      </details>
    </div>
  );
}

function ItemRasciDetailCard({
  row,
  itemRasci,
  rollen,
  otherRows,
  onSetRij,
  onSetToelichting,
  onCopyFrom,
}: {
  row: ItemRasciRow;
  itemRasci: ItemRasci | undefined;
  rollen: ProgrammaRol[];
  otherRows: ItemRasciRow[];
  onSetRij: (rolId: string, letter: RasciLetter | null) => void;
  onSetToelichting: (t: string) => void;
  onCopyFrom: (sourceItemId: string) => void;
}) {
  const rijMap = new Map((itemRasci?.rijen ?? []).map((r) => [r.rolId, r.letter]));
  const nA = (itemRasci?.rijen ?? []).filter((r) => r.letter === "A").length;
  const nR = (itemRasci?.rijen ?? []).filter((r) => r.letter === "R").length;
  const valid = nA === 1 && nR >= 1;

  const headerColor =
    row.itemType === "benefit"
      ? "bg-emerald-50"
      : row.itemType === "capability"
        ? "bg-violet-50"
        : "bg-gray-50";
  const badgeColor =
    row.itemType === "benefit"
      ? "bg-emerald-200 text-emerald-900"
      : row.itemType === "capability"
        ? "bg-violet-200 text-violet-900"
        : "bg-gray-200 text-gray-800";
  const itemTypeLabel =
    row.itemType === "benefit" ? "baat" : row.itemType === "capability" ? "vermogen" : "inspanning";

  return (
    <div className="rounded border border-gray-200 bg-white overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-3 flex-wrap ${headerColor}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${badgeColor}`}>
              {itemTypeLabel}
            </span>
            <h4 className="font-semibold text-gray-800">{row.titel}</h4>
            <span className="text-xs text-gray-500">{row.groupKey}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {otherRows.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onCopyFrom(e.target.value);
                e.target.value = "";
              }}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-cito-blue cursor-pointer"
              title="Kopieer alle RASCI-toewijzingen van een ander item"
            >
              <option value="">↧ Kopieer van…</option>
              {otherRows.map((o) => (
                <option key={o.itemId} value={o.itemId}>
                  {o.titel.length > 50 ? o.titel.slice(0, 50) + "…" : o.titel}
                </option>
              ))}
            </select>
          )}
          {valid ? (
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">
              ✓ Geldig
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200">
              {nA === 0 ? "Geen A" : nA > 1 ? `${nA} A's` : "Geen R"}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Rol</th>
              {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => (
                <th key={l} className="text-center px-2 py-2 font-medium text-gray-600 w-12">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rollen.map((rol) => {
              const current = rijMap.get(rol.id);
              return (
                <tr key={rol.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-3 py-2 text-gray-800">
                    <div className="font-medium">{rol.rol || <i className="text-gray-400">(geen rol)</i>}</div>
                    {rol.naam && <div className="text-xs text-gray-500">{rol.naam}</div>}
                  </td>
                  {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => {
                    const active = current === l;
                    return (
                      <td key={l} className="text-center px-1 py-1">
                        <button
                          onClick={() => onSetRij(rol.id, active ? null : l)}
                          title={`${RASCI_LABELS[l]} — ${RASCI_TOELICHTING[l]}`}
                          className={`w-8 h-8 rounded text-xs font-bold border transition-all ${
                            active
                              ? RASCI_KLEUREN[l]
                              : "border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {active ? l : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Toelichting (waarom deze RASCI voor dit item)
        </label>
        <input
          type="text"
          value={itemRasci?.toelichting ?? ""}
          onChange={(e) => onSetToelichting(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          placeholder="bv. A bij bateneigenaar uit batenprofiel; V bij programmamanager voor onafhankelijke verificatie"
        />
      </div>
    </div>
  );
}

function ClusterRasciRow({
  row,
  clusterBron,
  rollen,
  otherClusters,
  onSetRij,
  onSetToelichting,
  onCopyFrom,
}: {
  row: ClusterRasci;
  clusterBron: ClusterBron;
  rollen: ProgrammaRol[];
  otherClusters: ClusterRasci[];
  onSetRij: (rolId: string, letter: RasciLetter | null) => void;
  onSetToelichting: (t: string) => void;
  onCopyFrom: (sourceTitel: string) => void;
}) {
  const rijMap = new Map(row.rijen.map((r) => [r.rolId, r.letter]));
  const nAccountable = row.rijen.filter((r) => r.letter === "A").length;
  const nResponsible = row.rijen.filter((r) => r.letter === "R").length;
  const valid = nAccountable === 1 && nResponsible >= 1;

  return (
    <div className="rounded border border-gray-200 bg-white overflow-hidden">
      <div
        className={`px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-3 flex-wrap ${
          clusterBron.clusterType === "vermogen" ? "bg-indigo-50" : "bg-teal-50"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${
                clusterBron.clusterType === "vermogen"
                  ? "bg-indigo-200 text-indigo-900"
                  : "bg-teal-200 text-teal-900"
              }`}
            >
              {clusterBron.clusterType}
            </span>
            <h4 className="font-semibold text-gray-800">{row.clusterTitel}</h4>
            <span className="text-xs text-gray-500">({clusterBron.itemCount} onderdelen)</span>
          </div>
          {clusterBron.advies && (
            <p className="text-xs text-gray-600 italic mt-1">{clusterBron.advies}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {otherClusters.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) onCopyFrom(e.target.value);
                e.target.value = "";
              }}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-cito-blue cursor-pointer"
              title="Kopieer alle RASCI-toewijzingen van een ander cluster"
            >
              <option value="">↧ Kopieer van…</option>
              {otherClusters.map((c) => (
                <option key={c.clusterTitel} value={c.clusterTitel}>
                  {c.clusterTitel.length > 50 ? c.clusterTitel.slice(0, 50) + "…" : c.clusterTitel}
                </option>
              ))}
            </select>
          )}
          {valid ? (
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">
              ✓ Geldig
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200">
              {nAccountable === 0
                ? "Geen A"
                : nAccountable > 1
                  ? `${nAccountable} A's`
                  : "Geen R"}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Rol</th>
              {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => (
                <th key={l} className="text-center px-2 py-2 font-medium text-gray-600 w-12">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rollen.map((rol) => {
              const current = rijMap.get(rol.id);
              return (
                <tr key={rol.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-3 py-2 text-gray-800">
                    <div className="font-medium">{rol.rol || <i className="text-gray-400">(geen rol)</i>}</div>
                    {rol.naam && <div className="text-xs text-gray-500">{rol.naam}</div>}
                  </td>
                  {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => {
                    const active = current === l;
                    return (
                      <td key={l} className="text-center px-1 py-1">
                        <button
                          onClick={() => onSetRij(rol.id, active ? null : l)}
                          title={`${RASCI_LABELS[l]} — ${RASCI_TOELICHTING[l]}`}
                          className={`w-8 h-8 rounded text-xs font-bold border transition-all ${
                            active
                              ? RASCI_KLEUREN[l]
                              : "border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {active ? l : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Toelichting (waarom deze RASCI voor dit cluster)
        </label>
        <input
          type="text"
          value={row.toelichting ?? ""}
          onChange={(e) => onSetToelichting(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          placeholder="bv. A bij domeineigenaar Mens omdat cluster volledig binnen dat domein valt"
        />
      </div>
    </div>
  );
}

// ============================================================
// Organigram (visueel)
// ============================================================

function RoleBox({
  rol,
  variant = "default",
}: {
  rol: ProgrammaRol;
  variant?: "default" | "primary" | "domein" | "side";
}) {
  const styles: Record<string, string> = {
    default: "bg-white border-gray-300 text-gray-800",
    primary: "bg-cito-blue text-white border-cito-blue",
    domein: "bg-amber-50 border-amber-300 text-amber-900",
    side: "bg-gray-50 border-gray-300 text-gray-700",
  };
  return (
    <div className={`rounded border-2 px-3 py-2 shadow-sm ${styles[variant]}`}>
      <div className="font-semibold text-xs leading-tight">{rol.rol || "(geen rol)"}</div>
      {rol.naam && <div className="text-[10px] opacity-80 mt-0.5">{rol.naam}</div>}
      {rol.sector && (
        <div className="text-[9px] uppercase tracking-wide opacity-70 mt-0.5">{rol.sector}</div>
      )}
    </div>
  );
}

function GroupBox({
  titel,
  rollen,
  variant = "default",
  emptyHint,
}: {
  titel: string;
  rollen: ProgrammaRol[];
  variant?: "default" | "primary" | "domein" | "side";
  emptyHint?: string;
}) {
  if (rollen.length === 0) {
    return (
      <div className="rounded border-2 border-dashed border-gray-300 px-3 py-2 bg-gray-50 text-center">
        <div className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mb-1">{titel}</div>
        <div className="text-[10px] text-gray-400 italic">{emptyHint ?? "Nog leeg"}</div>
      </div>
    );
  }
  return (
    <div className="rounded border-2 border-gray-300 bg-gray-50 p-2">
      <div className="text-[10px] uppercase tracking-wide font-bold text-gray-600 mb-2 text-center">
        {titel} ({rollen.length})
      </div>
      <div className="space-y-1.5">
        {rollen.map((r) => (
          <RoleBox key={r.id} rol={r} variant={variant} />
        ))}
      </div>
    </div>
  );
}

export function OrganigramView({ po }: { po: Programmaorganisatie }) {
  const heeftIets =
    po.opdrachtgever ||
    po.programmamanager ||
    (po.kerngroep ?? []).length > 0 ||
    (po.stuurgroep ?? []).length > 0 ||
    (po.domeineigenaren ?? []).length > 0 ||
    (po.klankbordgroep ?? []).length > 0;

  if (!heeftIets) {
    return (
      <div className="p-8 rounded border border-dashed border-gray-300 bg-gray-50 text-center">
        <div className="text-sm font-medium text-gray-600 mb-1">Organigram verschijnt hier</div>
        <div className="text-xs text-gray-500">
          Klik &quot;AI: stel voor&quot; of vul de rollen hieronder handmatig in.
        </div>
      </div>
    );
  }

  // Domein-eigenaren in vaste DIN-volgorde tonen indien herkenbaar
  const DOMEIN_ORDER = ["Mens", "Processen", "Data", "Systemen", "Cultuur"];
  const domeinen = (po.domeineigenaren ?? []).slice().sort((a, b) => {
    const idxA = DOMEIN_ORDER.findIndex((d) => a.rol.toLowerCase().includes(d.toLowerCase()));
    const idxB = DOMEIN_ORDER.findIndex((d) => b.rol.toLowerCase().includes(d.toLowerCase()));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <div className="p-6 rounded-lg border border-cito-blue/20 bg-gradient-to-b from-cito-blue/5 to-white">
      <h3 className="text-sm font-bold text-cito-blue mb-1">Organigram programmaorganisatie</h3>
      <p className="text-xs text-gray-600 mb-6">
        Hiërarchische weergave van de programmaorganisatie volgens &quot;Werken aan Programma&apos;s&quot;.
      </p>

      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Linkerkolom: Klankbordgroep */}
        <div className="col-span-3">
          <GroupBox
            titel="Klankbordgroep"
            rollen={po.klankbordgroep ?? []}
            variant="side"
            emptyHint="Optioneel"
          />
        </div>

        {/* Middenkolom: Opdrachtgever → Programmamanager → Kerngroep → Domeineigenaren */}
        <div className="col-span-6">
          <div className="flex flex-col items-center">
            {/* Opdrachtgever */}
            {po.opdrachtgever ? (
              <div className="w-full max-w-xs">
                <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue mb-1 text-center">
                  Opdrachtgever
                </div>
                <RoleBox rol={po.opdrachtgever} variant="primary" />
              </div>
            ) : (
              <div className="w-full max-w-xs rounded border-2 border-dashed border-cito-blue/40 px-3 py-2 bg-white text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue/60">
                  Opdrachtgever
                </div>
                <div className="text-[10px] text-gray-400 italic">Nog niet ingevuld</div>
              </div>
            )}

            {/* Verticale verbindingslijn */}
            <div className="h-6 w-0.5 bg-cito-blue/40" />

            {/* Programmamanager */}
            {po.programmamanager ? (
              <div className="w-full max-w-xs">
                <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue mb-1 text-center">
                  Programmamanager
                </div>
                <RoleBox rol={po.programmamanager} variant="primary" />
              </div>
            ) : (
              <div className="w-full max-w-xs rounded border-2 border-dashed border-cito-blue/40 px-3 py-2 bg-white text-center">
                <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue/60">
                  Programmamanager
                </div>
                <div className="text-[10px] text-gray-400 italic">Nog niet ingevuld</div>
              </div>
            )}

            {/* Verticale lijn naar kerngroep */}
            <div className="h-6 w-0.5 bg-cito-blue/40" />

            {/* Kerngroep */}
            <div className="w-full">
              <GroupBox titel="Kerngroep" rollen={po.kerngroep ?? []} variant="default" />
            </div>

            {/* Verticale lijn naar domeineigenaren */}
            {domeinen.length > 0 && <div className="h-6 w-0.5 bg-cito-blue/40" />}

            {/* Domeineigenaren */}
            {domeinen.length > 0 && (
              <div className="w-full">
                <div className="text-[10px] uppercase tracking-wide font-bold text-amber-700 mb-2 text-center">
                  Domeineigenaren
                </div>
                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(domeinen.length, 4)}, minmax(0, 1fr))` }}>
                  {domeinen.map((d) => (
                    <RoleBox key={d.id} rol={d} variant="domein" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rechterkolom: Stuurgroep */}
        <div className="col-span-3">
          <GroupBox
            titel="Stuurgroep"
            rollen={po.stuurgroep ?? []}
            variant="side"
            emptyHint="Strategische sturing"
          />
        </div>
      </div>

      {/* Onder organigram: ritme + escalatie */}
      {(po.besluitvormingsritme || po.escalatiepad) && (
        <div className="mt-6 pt-4 border-t border-cito-blue/10 grid grid-cols-2 gap-3 text-xs">
          {po.besluitvormingsritme && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue/70 mb-1">
                Besluitvormingsritme
              </div>
              <div className="text-gray-700">{po.besluitvormingsritme}</div>
            </div>
          )}
          {po.escalatiepad && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-cito-blue/70 mb-1">
                Escalatiepad
              </div>
              <div className="text-gray-700">{po.escalatiepad}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Officiële RASCI-matrix (clusters × rollen — één grote tabel)
// ============================================================

export function RasciFullMatrix({
  clusters,
  rollen,
  rasci,
  onSetCell,
}: {
  clusters: ClusterBron[];
  rollen: ProgrammaRol[];
  rasci: ClusterRasci[];
  onSetCell?: (clusterTitel: string, rolId: string, letter: RasciLetter | null) => void;
}) {
  if (clusters.length === 0 || rollen.length === 0) return null;

  const rasciByTitel = new Map(rasci.map((r) => [r.clusterTitel, r]));

  return (
    <div className="rounded border border-gray-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-bold text-cito-blue">Officiële RASCI-matrix</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Cross-sectorale clusters (rijen) × rollen uit programmaorganisatie (kolommen).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-gray-100 border-b border-r border-gray-200 px-2 py-2 text-left font-bold text-gray-700 sticky left-0 z-20 min-w-[220px]">
                Cluster
              </th>
              {rollen.map((rol) => (
                <th
                  key={rol.id}
                  className="bg-gray-100 border-b border-r border-gray-200 px-1.5 py-2 text-center font-bold text-gray-700 align-bottom"
                  style={{ minWidth: 56 }}
                >
                  <div
                    className="text-[10px] leading-tight whitespace-normal"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 110, margin: "0 auto" }}
                  >
                    {rol.rol}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster) => {
              const row = rasciByTitel.get(cluster.clusterTitel);
              const rijMap = new Map((row?.rijen ?? []).map((r) => [r.rolId, r.letter]));
              const nA = (row?.rijen ?? []).filter((r) => r.letter === "A").length;
              const nR = (row?.rijen ?? []).filter((r) => r.letter === "R").length;
              const valid = nA === 1 && nR >= 1;
              return (
                <tr key={cluster.clusterTitel} className="hover:bg-gray-50/50">
                  <td className="border-b border-r border-gray-200 px-2 py-1.5 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] uppercase tracking-wide font-bold px-1 py-0.5 rounded shrink-0 ${
                          cluster.clusterType === "vermogen"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {cluster.clusterType === "vermogen" ? "V" : "I"}
                      </span>
                      <span className="font-medium text-gray-800 text-[11px] leading-tight">
                        {cluster.clusterTitel}
                      </span>
                      <span
                        className={`ml-auto shrink-0 w-2 h-2 rounded-full ${
                          valid ? "bg-green-500" : "bg-amber-400"
                        }`}
                        title={valid ? "Geldig (1 A + ≥1 R)" : `Ongeldig: ${nA} A, ${nR} R`}
                      />
                    </div>
                  </td>
                  {rollen.map((rol) => {
                    const letter = rijMap.get(rol.id);
                    if (!onSetCell) {
                      return (
                        <td
                          key={rol.id}
                          className="border-b border-r border-gray-200 text-center p-0"
                          style={{ minWidth: 56 }}
                        >
                          {letter ? (
                            <span
                              className={`inline-block w-7 h-7 leading-7 rounded text-[11px] font-bold ${RASCI_KLEUREN[letter]}`}
                            >
                              {letter}
                            </span>
                          ) : (
                            <span className="text-gray-200">·</span>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={rol.id}
                        className="border-b border-r border-gray-200 text-center p-0.5"
                        style={{ minWidth: 56 }}
                      >
                        <select
                          value={letter ?? ""}
                          onChange={(e) =>
                            onSetCell(
                              cluster.clusterTitel,
                              rol.id,
                              (e.target.value as RasciLetter) || null
                            )
                          }
                          className={`w-full text-[11px] font-bold text-center border-none rounded cursor-pointer ${
                            letter ? RASCI_KLEUREN[letter] : "text-gray-300 bg-white hover:bg-gray-100"
                          }`}
                          style={{ height: 28, paddingLeft: 4, paddingRight: 4 }}
                          title={letter ? `${RASCI_LABELS[letter]} — ${RASCI_TOELICHTING[letter]}` : "Geen rol"}
                        >
                          <option value="">·</option>
                          <option value="R">R</option>
                          <option value="A">A</option>
                          <option value="S">S</option>
                          <option value="C">C</option>
                          <option value="I">I</option>
                          <option value="V">V</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3 text-[10px] text-gray-600">
        <span>
          <b>V</b> = vermogen-cluster, <b>I</b> = inspanning-cluster
        </span>
        <span className="ml-auto">
          🟢 valide (1 A + ≥1 R) · 🟡 ongeldig
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Gezamenlijk Tab — 4-secties RASCI uit cross-analyse
// ============================================================

function GezamenlijkTab({
  items,
  rollen,
  onSync,
  onSetCell,
  hasCrossAnalyse,
}: {
  items: GezamenlijkRasciItem[];
  rollen: ProgrammaRol[];
  onSync: () => void;
  onSetCell: (
    sectie: GezamenlijkeRasciSectie,
    itemId: string,
    rolId: string,
    letter: RasciLetter | null
  ) => void;
  hasSession: boolean;
  hasCrossAnalyse: boolean;
}) {
  if (rollen.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 font-medium mb-1">Geen rollen gedefinieerd.</p>
        <p className="text-sm text-gray-500">
          Vul eerst de programmaorganisatie in. Tip: gebruik de knop &quot;Vul kerngroep + domeineigenaren uit cross-analyse&quot; in de Programmaorganisatie-tab.
        </p>
      </div>
    );
  }

  if (!hasCrossAnalyse) {
    return (
      <div className="p-8 text-center bg-amber-50 rounded border border-amber-200">
        <p className="text-amber-900 font-medium mb-1">Geen cross-analyse data.</p>
        <p className="text-sm text-amber-800">
          Voltooi eerst stap 4 (Cross-analyse — Optimaliseren) zodat de gezamenlijke inspanningen, eigenaren en inspanningsleiders bekend zijn.
        </p>
      </div>
    );
  }

  const overload = computeRolOverloadGezamenlijk(items);
  const rollenMetOverload = rollen.filter((r) => (overload.get(r.id) ?? 0) > 4);
  const problemen = validateGezamenlijkeRasci(items);

  return (
    <div className="space-y-6">
      {/* Sync-knop + uitleg */}
      <div className="p-4 rounded border border-cito-blue/20 bg-cito-blue/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="text-sm font-semibold text-cito-blue">Synchroniseer met cross-analyse</p>
            <p className="text-xs text-gray-700 mt-1">
              Genereert vier secties: <b>sector-baten</b>, <b>gezamenlijke vermogens</b>, <b>gezamenlijke inspanningen</b> en <b>programmagovernance</b> —
              afgeleid uit cross-analyse stap 1, 2 en 4. Handmatig overschreven cellen blijven staan.
            </p>
          </div>
          <button
            onClick={onSync}
            className="px-4 py-2 rounded bg-cito-blue text-white text-sm font-medium hover:bg-cito-blue/90"
          >
            {items.length === 0 ? "Vul matrix" : "Synchroniseer"}
          </button>
        </div>
      </div>

      {/* RASCI-legenda */}
      <div className="p-3 rounded bg-gray-50 border border-gray-200 text-xs text-gray-700">
        <p className="font-semibold mb-2">RASCI-regels: exact 1 A + minstens 1 R per rij. V is optioneel.</p>
        <div className="flex flex-wrap gap-3">
          {(["R", "A", "S", "C", "I", "V"] as RasciLetter[]).map((l) => (
            <span key={l} className="inline-flex items-center gap-1">
              <span className={`inline-block w-5 text-center text-[11px] border rounded ${RASCI_KLEUREN[l]}`}>
                {l}
              </span>
              <span className="text-gray-600">
                <b>{RASCI_LABELS[l]}</b> — {RASCI_TOELICHTING[l]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Diagnostiek */}
      {rollenMetOverload.length > 0 && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <p className="font-semibold mb-1">⚠ Rol-overload: deze rollen hebben &gt;4 A&apos;s</p>
          <ul className="list-disc ml-5 space-y-0.5">
            {rollenMetOverload.map((r) => (
              <li key={r.id}>
                <b>{r.rol}</b>{r.naam ? ` (${r.naam})` : ""} — {overload.get(r.id)} A&apos;s
              </li>
            ))}
          </ul>
        </div>
      )}

      {problemen.length > 0 && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <p className="font-semibold mb-1">⚠ {problemen.length} regel(s) niet aan RASCI-norm</p>
          <ul className="list-disc ml-5 space-y-0.5">
            {problemen.slice(0, 6).map((p, i) => (
              <li key={i}>
                {SECTIE_LABELS[p.sectie]} → <code className="text-[10px]">{p.itemId}</code>:{" "}
                {p.reden === "geen_a" && "Geen A toegekend"}
                {p.reden === "meerdere_a" && "Meerdere A's (mag 1)"}
                {p.reden === "geen_r" && "Geen R toegekend"}
              </li>
            ))}
            {problemen.length > 6 && <li className="text-rose-700">+{problemen.length - 6} meer</li>}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-6 text-center bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
          Nog geen matrix gegenereerd. Klik &quot;Vul matrix&quot; om af te leiden uit de cross-analyse.
        </div>
      ) : (
        SECTIE_VOLGORDE.map((sectie) => {
          const sectieItems = items.filter((i) => i.sectie === sectie);
          if (sectieItems.length === 0) return null;
          return (
            <SectieMatrix
              key={sectie}
              sectie={sectie}
              titel={SECTIE_LABELS[sectie]}
              toelichting={SECTIE_TOELICHTING[sectie]}
              items={sectieItems}
              rollen={rollen}
              onSetCell={onSetCell}
            />
          );
        })
      )}
    </div>
  );
}

function SectieMatrix({
  sectie,
  titel,
  toelichting,
  items,
  rollen,
  onSetCell,
}: {
  sectie: GezamenlijkeRasciSectie;
  titel: string;
  toelichting: string;
  items: GezamenlijkRasciItem[];
  rollen: ProgrammaRol[];
  onSetCell: (
    sectie: GezamenlijkeRasciSectie,
    itemId: string,
    rolId: string,
    letter: RasciLetter | null
  ) => void;
}) {
  const sectieKleur = {
    sector_baten: "bg-blue-50 border-blue-200 text-blue-900",
    gezamenlijke_vermogens: "bg-indigo-50 border-indigo-200 text-indigo-900",
    gezamenlijke_inspanningen: "bg-teal-50 border-teal-200 text-teal-900",
    programmagovernance: "bg-amber-50 border-amber-200 text-amber-900",
  }[sectie];

  return (
    <div className="rounded border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 border-b ${sectieKleur}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold">{titel}</h3>
            <p className="text-[11px] mt-0.5 opacity-80">{toelichting}</p>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/60">
            {items.length} {items.length === 1 ? "rij" : "rijen"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-gray-100 border-b border-r border-gray-200 px-2 py-2 text-left font-bold text-gray-700 sticky left-0 z-20 min-w-[260px]">
                Item
              </th>
              {rollen.map((rol) => (
                <th
                  key={rol.id}
                  className="bg-gray-100 border-b border-r border-gray-200 px-1.5 py-2 text-center font-bold text-gray-700 align-bottom"
                  style={{ minWidth: 56 }}
                >
                  <div
                    className="text-[10px] leading-tight whitespace-normal"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      maxHeight: 110,
                      margin: "0 auto",
                    }}
                  >
                    <div className="font-semibold">{rol.rol}</div>
                    {rol.naam && <div className="font-normal text-gray-500 text-[9px]">{rol.naam}</div>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const rijMap = new Map((item.rijen ?? []).map((r) => [r.rolId, r] as const));
              const nA = (item.rijen ?? []).filter((r) => r.letter === "A").length;
              const nR = (item.rijen ?? []).filter((r) => r.letter === "R").length;
              const valid = nA === 1 && nR >= 1;
              return (
                <tr key={item.itemId} className="hover:bg-gray-50/50">
                  <td className="border-b border-r border-gray-200 px-2 py-1.5 sticky left-0 bg-white z-10">
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                          valid ? "bg-green-500" : "bg-amber-400"
                        }`}
                        title={valid ? "Geldig (1 A + ≥1 R)" : `${nA} A, ${nR} R`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-[11px] leading-snug">
                          {item.itemTitel}
                        </div>
                        {(item.meta?.eigenaarNaam || item.meta?.inspanningsleiderNaam) && (
                          <div className="mt-0.5 text-[10px] text-gray-500 truncate">
                            {item.meta.eigenaarNaam && (
                              <span>Eig: {item.meta.eigenaarNaam}</span>
                            )}
                            {item.meta.eigenaarNaam && item.meta.inspanningsleiderNaam && " · "}
                            {item.meta.inspanningsleiderNaam && (
                              <span>Leider: {item.meta.inspanningsleiderNaam}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {rollen.map((rol) => {
                    const rij = rijMap.get(rol.id);
                    const letter = rij?.letter;
                    const isManual = rij?.bron === "manual";
                    return (
                      <td
                        key={rol.id}
                        className="border-b border-r border-gray-200 text-center p-0"
                        style={{ minWidth: 56 }}
                      >
                        <RasciCellPicker
                          letter={letter}
                          isManual={isManual}
                          onChange={(next) => onSetCell(sectie, item.itemId, rol.id, next)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RasciCellPicker({
  letter,
  isManual,
  onChange,
}: {
  letter?: RasciLetter;
  isManual?: boolean;
  onChange: (next: RasciLetter | null) => void;
}) {
  const letters: (RasciLetter | "")[] = ["", "R", "A", "S", "C", "I", "V"];
  return (
    <div className="relative inline-block">
      <select
        value={letter ?? ""}
        onChange={(e) => onChange((e.target.value || null) as RasciLetter | null)}
        className={`w-12 h-7 text-center text-[11px] font-bold rounded border cursor-pointer appearance-none ${
          letter ? RASCI_KLEUREN[letter] : "bg-white border-gray-200 text-gray-300"
        }`}
        title={isManual ? "Handmatig gewijzigd — blijft bewaard bij synchroniseren" : letter ? "Afgeleid uit cross-analyse" : "Leeg"}
      >
        {letters.map((l) => (
          <option key={l || "leeg"} value={l}>
            {l || "·"}
          </option>
        ))}
      </select>
      {letter && isManual && (
        <span
          className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-rose-500 border border-white"
          title="Handmatig"
        />
      )}
    </div>
  );
}
