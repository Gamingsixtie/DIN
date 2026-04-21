"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import { RASCI_LABELS, RASCI_TOELICHTING, RASCI_KLEUREN } from "@/lib/types";
import type {
  ProgrammaRol,
  Programmaorganisatie,
  ClusterRasci,
  RasciLetter,
  RasciRij,
  VermogenClusterItem,
  InspanningClusterItem,
  AIProgrammaorganisatie,
  AIGovernanceRasciResponse,
} from "@/lib/types";

type Tab = "organisatie" | "rasci";

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

export default function GovernanceStep() {
  const { session, updateSession } = useSession();
  const [tab, setTab] = useState<Tab>("organisatie");
  const [aiLoading, setAILoading] = useState<"none" | "organisatie" | "rasci">("none");
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
  const rollen = collectRollen(po);

  async function handleAIOrganisatie() {
    if (!session) return;
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

  async function handleAIRasci() {
    if (!session) return;
    if (!po.opdrachtgever && (po.kerngroep ?? []).length === 0) {
      setAIError("Vul eerst de programmaorganisatie in.");
      return;
    }
    if (clusters.length === 0) {
      setAIError("Geen cross-sectorale clusters gevonden. Voltooi eerst de cross-analyse (stap 4).");
      return;
    }
    setAILoading("rasci");
    setAIError(null);
    try {
      const wizard = session.crossAnalyseWizard;
      const r = await fetch("/api/governance-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "rasci",
          goals: session.goals,
          scope: session.scope ?? null,
          programmaorganisatie: po,
          vermogenClusters: wizard?.stepResults?.stap2?.vermogenClusters ?? [],
          inspanningClusters: wizard?.stepResults?.stap3?.inspanningClusters ?? [],
        }),
      });
      const json = (await r.json()) as { success: boolean; data?: AIGovernanceRasciResponse; error?: string };
      if (!r.ok || !json.success || !json.data) {
        throw new Error(json.error || "AI-aanroep mislukt");
      }

      // Map AI rolLabels → rolIds van bestaande rollen (exacte match, fallback op case-insensitive)
      const rolLookup = new Map<string, string>();
      for (const rol of rollen) {
        if (rol.rol) {
          rolLookup.set(rol.rol.toLowerCase().trim(), rol.id);
        }
      }

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

  function updatePo(updater: (prev: Programmaorganisatie) => Programmaorganisatie) {
    updateSession((prev) => ({
      programmaorganisatie: updater(prev.programmaorganisatie ?? emptyOrganisatie()),
    }));
  }

  function updateRasci(updater: (prev: ClusterRasci[]) => ClusterRasci[]) {
    updateSession((prev) => ({ clusterRasci: updater(prev.clusterRasci ?? []) }));
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cito-blue mb-2">Stap 5 — Programmaorganisatie & RASCI</h2>
        <p className="text-gray-600">
          Leg vast wie het programma stuurt en wie op elk cross-sectoraal cluster welke rol heeft.
          Gebaseerd op &quot;Werken aan Programma&apos;s&quot; (Wijnen &amp; Van der Tak, Hoofdstuk 6).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <TabButton active={tab === "organisatie"} onClick={() => setTab("organisatie")}>
          Programmaorganisatie
        </TabButton>
        <TabButton active={tab === "rasci"} onClick={() => setTab("rasci")}>
          RASCI-matrix
          {rasci.length > 0 && (
            <span className="ml-2 text-xs bg-cito-blue text-white px-2 py-0.5 rounded-full">
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
          aiLoading={aiLoading === "organisatie"}
        />
      )}

      {tab === "rasci" && (
        <RasciTab
          rasci={rasci}
          clusters={clusters}
          rollen={rollen}
          onUpdate={updateRasci}
          onAI={handleAIRasci}
          aiLoading={aiLoading === "rasci"}
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
  aiLoading,
}: {
  po: Programmaorganisatie;
  onUpdate: (updater: (prev: Programmaorganisatie) => Programmaorganisatie) => void;
  onAI: () => void;
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
      <div className="flex items-center justify-between p-4 rounded border border-cito-blue/20 bg-cito-blue/5">
        <div>
          <p className="text-sm font-semibold text-cito-blue">AI-voorstel programmaorganisatie</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Op basis van de ingevulde DIN-structuur en het Cito strategisch fundament.
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
  rasci,
  clusters,
  rollen,
  onUpdate,
  onAI,
  aiLoading,
}: {
  rasci: ClusterRasci[];
  clusters: ClusterBron[];
  rollen: ProgrammaRol[];
  onUpdate: (updater: (prev: ClusterRasci[]) => ClusterRasci[]) => void;
  onAI: () => void;
  aiLoading: boolean;
}) {
  // Synchroniseer: zorg dat er voor elke cluster een ClusterRasci is
  const rasciByTitel = new Map(rasci.map((r) => [r.clusterTitel, r]));
  const syncedRasci: ClusterRasci[] = clusters.map(
    (c) =>
      rasciByTitel.get(c.clusterTitel) ?? {
        clusterTitel: c.clusterTitel,
        clusterType: c.clusterType,
        toelichting: "",
        rijen: [],
        overrides: [],
      }
  );

  if (clusters.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 font-medium mb-1">Geen cross-sectorale clusters gevonden.</p>
        <p className="text-sm text-gray-500">
          Voltooi eerst stap 4 (Cross-analyse) — de vermogen- en inspanning-clusters die daaruit
          komen worden hier gebruikt als anker voor de RASCI.
        </p>
      </div>
    );
  }

  if (rollen.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 font-medium mb-1">Geen rollen gedefinieerd.</p>
        <p className="text-sm text-gray-500">Vul eerst de programmaorganisatie in.</p>
      </div>
    );
  }

  function setRij(clusterTitel: string, rolId: string, letter: RasciLetter | null) {
    onUpdate((prev) => {
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
      if (letter !== null) {
        nextRijen = [...nextRijen, { rolId, letter }];
      }
      const nextCluster: ClusterRasci = { ...current, rijen: nextRijen };
      const rest = prev.filter((r) => r.clusterTitel !== clusterTitel);
      return [...rest, nextCluster];
    });
  }

  function setToelichting(clusterTitel: string, toelichting: string) {
    onUpdate((prev) => {
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
      const rest = prev.filter((r) => r.clusterTitel !== clusterTitel);
      return [...rest, nextCluster];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded border border-cito-blue/20 bg-cito-blue/5">
        <div>
          <p className="text-sm font-semibold text-cito-blue">AI-voorstel RASCI per cluster</p>
          <p className="text-xs text-gray-600 mt-0.5">
            AI vult per cluster een RASCI op basis van de programmaorganisatie en de DIN-keten.
          </p>
        </div>
        <button
          onClick={onAI}
          disabled={aiLoading}
          className="px-4 py-2 rounded bg-cito-blue text-white text-sm font-medium hover:bg-cito-blue/90 disabled:opacity-50"
        >
          {aiLoading ? "Bezig…" : "AI: vul RASCI"}
        </button>
      </div>

      <div className="p-3 rounded bg-gray-50 border border-gray-200 text-xs text-gray-700">
        <p className="font-semibold mb-1">RASCI-regel: exact 1 A, minstens 1 R per cluster</p>
        <div className="flex flex-wrap gap-3">
          {(["R", "A", "S", "C", "I"] as RasciLetter[]).map((l) => (
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

      {/* Officiële RASCI-matrix als primaire weergave */}
      <RasciFullMatrix
        clusters={clusters}
        rollen={rollen}
        rasci={syncedRasci}
        onSetCell={setRij}
      />

      {/* Per-cluster detailweergave met toelichting */}
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-cito-blue hover:text-cito-blue/80">
          <span className="transition-transform group-open:rotate-90">▶</span>
          Detailweergave per cluster (met toelichting)
        </summary>
        <div className="space-y-4 mt-4">
          {syncedRasci.map((row) => (
            <ClusterRasciRow
              key={row.clusterTitel}
              row={row}
              clusterBron={clusters.find((c) => c.clusterTitel === row.clusterTitel)!}
              rollen={rollen}
              onSetRij={(rolId, letter) => setRij(row.clusterTitel, rolId, letter)}
              onSetToelichting={(t) => setToelichting(row.clusterTitel, t)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function ClusterRasciRow({
  row,
  clusterBron,
  rollen,
  onSetRij,
  onSetToelichting,
}: {
  row: ClusterRasci;
  clusterBron: ClusterBron;
  rollen: ProgrammaRol[];
  onSetRij: (rolId: string, letter: RasciLetter | null) => void;
  onSetToelichting: (t: string) => void;
}) {
  const rijMap = new Map(row.rijen.map((r) => [r.rolId, r.letter]));
  const nAccountable = row.rijen.filter((r) => r.letter === "A").length;
  const nResponsible = row.rijen.filter((r) => r.letter === "R").length;
  const valid = nAccountable === 1 && nResponsible >= 1;

  return (
    <div className="rounded border border-gray-200 bg-white overflow-hidden">
      <div
        className={`px-4 py-3 border-b border-gray-200 flex items-start justify-between ${
          clusterBron.clusterType === "vermogen" ? "bg-indigo-50" : "bg-teal-50"
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
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
        <div className="ml-4 shrink-0">
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
              {(["R", "A", "S", "C", "I"] as RasciLetter[]).map((l) => (
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
                  {(["R", "A", "S", "C", "I"] as RasciLetter[]).map((l) => {
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
