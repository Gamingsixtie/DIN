"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  EffortStatus,
  SectorName,
  IntegratieAdviesResult,
  IntegratieAdviesItem,
  ExternalProject,
} from "@/lib/types";
import { SECTORS } from "@/lib/types";
import {
  createBenefit,
  createCapability,
  createEffort,
  generateId,
  getBenefitsByGoalAndSector,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import DINChainIndicator from "@/components/din/DINChainIndicator";
import MergedDINView from "@/components/din/MergedDINView";
import { generateVerrijktSectorplanDocument } from "@/lib/word-export";

type DINPhase = "per-sector" | "samengevoegd";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];


const ADVIES_SECTIONS: {
  key: keyof Omit<IntegratieAdviesResult, "sectorName">;
  color: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}[] = [
  { key: "aansluiting", color: "text-green-700", borderColor: "border-green-200", bgColor: "bg-green-50", iconColor: "bg-green-500" },
  { key: "verrijking", color: "text-blue-700", borderColor: "border-blue-200", bgColor: "bg-blue-50", iconColor: "bg-blue-500" },
  { key: "aanvullingen", color: "text-amber-700", borderColor: "border-amber-200", bgColor: "bg-amber-50", iconColor: "bg-amber-500" },
  { key: "quickWins", color: "text-purple-700", borderColor: "border-purple-200", bgColor: "bg-purple-50", iconColor: "bg-purple-500" },
  { key: "aandachtspunten", color: "text-red-700", borderColor: "border-red-200", bgColor: "bg-red-50", iconColor: "bg-red-500" },
];

function AdviesCard({ section, color, borderColor, bgColor, iconColor }: {
  section: IntegratieAdviesItem;
  color: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`border ${borderColor} rounded-lg ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${iconColor} shrink-0`} />
          <span className={`text-sm font-semibold ${color}`}>{section.titel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{section.punten.length} punten</span>
          <span className="text-xs text-gray-400">{open ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 italic mb-3">{section.toelichting}</p>
          {section.punten.length > 0 ? (
            <ul className="space-y-2">
              {section.punten.map((punt, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${iconColor} shrink-0`} />
                  <span>{punt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">Geen items ge\u00EFdentificeerd.</p>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS: { key: EffortStatus; label: string; color: string }[] = [
  { key: "gepland", label: "Gepland", color: "bg-gray-100 text-gray-600" },
  { key: "in_uitvoering", label: "Actief", color: "bg-green-100 text-green-700" },
  { key: "afgerond", label: "Afgerond", color: "bg-blue-100 text-blue-700" },
  { key: "on_hold", label: "On hold", color: "bg-amber-100 text-amber-700" },
];

function ExterneProjectenPanel({
  currentSector,
  projects,
  onAdd,
  onUpdate,
  onDelete,
}: {
  currentSector: SectorName;
  projects: ExternalProject[];
  onAdd: () => void;
  onUpdate: (updated: ExternalProject) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(projects.length > 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  function cycleStatus(project: ExternalProject) {
    const order: EffortStatus[] = ["gepland", "in_uitvoering", "afgerond", "on_hold"];
    const idx = order.indexOf(project.status);
    const next = order[(idx + 1) % order.length];
    onUpdate({ ...project, status: next });
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Lopende projecten
          </span>
          {projects.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
              {projects.length}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-400">
            Lopende projecten bij {currentSector} die vanwege hun kenmerken passen bij het programma Klant in Beeld.
          </p>

          {projects.map((p) => (
            <div key={p.id} className="group p-3 bg-white border border-gray-200 rounded-lg">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    defaultValue={p.name}
                    autoFocus
                    placeholder="Projectnaam"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== p.name) {
                        onUpdate({ ...p, name: ev.target.value.trim() });
                      }
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") ev.currentTarget.blur();
                    }}
                  />
                  <textarea
                    defaultValue={p.description}
                    placeholder="Korte beschrijving van het project..."
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue resize-y h-16"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== p.description) {
                        onUpdate({ ...p, description: ev.target.value.trim() });
                      }
                    }}
                  />
                  <input
                    type="text"
                    defaultValue={p.relevance || ""}
                    placeholder="Waarom relevant voor het programma?"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== (p.relevance || "")) {
                        onUpdate({ ...p, relevance: ev.target.value.trim() });
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={p.status}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none"
                      onChange={(ev) => {
                        onUpdate({ ...p, status: ev.target.value as EffortStatus });
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-cito-blue hover:underline ml-auto"
                    >
                      Klaar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => cycleStatus(p)}
                    title={`Status: ${STATUS_OPTIONS.find((s) => s.key === p.status)?.label}`}
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                      STATUS_OPTIONS.find((s) => s.key === p.status)?.color || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_OPTIONS.find((s) => s.key === p.status)?.label}
                  </button>
                  <div
                    className="flex-1 cursor-pointer hover:text-cito-blue min-w-0"
                    onClick={() => setEditingId(p.id)}
                    title="Klik om te bewerken"
                  >
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {p.name || "(naamloos project)"}
                    </div>
                    {p.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>
                    )}
                    {p.relevance && (
                      <div className="text-[10px] text-cito-blue mt-1 italic">Relevantie: {p.relevance}</div>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 text-xs mt-0.5"
                    title="Verwijderen"
                  >
                    {"\u2715"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">
              Nog geen lopende projecten toegevoegd. Voeg projecten toe die passen bij Klant in Beeld.
            </p>
          )}

          <button
            onClick={onAdd}
            className="text-xs text-cito-blue hover:underline"
          >
            + Project toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

export default function DINMappingStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [phase, setPhase] = useState<DINPhase>("per-sector");
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingIntegratie, setIsAnalyzingIntegratie] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [verrijktSectorplan, setVerrijktSectorplanState] = useState<Record<string, string>>(
    session?.verrijkteSectorplannen || {}
  );
  const [showAdviesPanel, setShowAdviesPanel] = useState(false);
  const [integratieAdvies, setIntegratieAdviesState] = useState<Record<string, IntegratieAdviesResult | string>>(
    session?.integratieAdvies || {}
  );

  // Wrapper: sla integratie-advies ook op in sessie (persistentie)
  function setIntegratieAdvies(updater: (prev: Record<string, IntegratieAdviesResult | string>) => Record<string, IntegratieAdviesResult | string>) {
    setIntegratieAdviesState((prev) => {
      const next = updater(prev);
      updateSession({ integratieAdvies: next });
      return next;
    });
  }

  // Wrapper: sla verrijkt sectorplan ook op in sessie
  function setVerrijktSectorplan(updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) {
    setVerrijktSectorplanState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      updateSession({ verrijkteSectorplannen: next });
      return next;
    });
  }

  if (!session) return null;

  if (session.goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Geen doelen beschikbaar. Importeer eerst KiB-data in stap 1 (KiB
          Import).
        </p>
        <button
          onClick={() => setCurrentStep("import")}
          className="mt-3 px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
        >
          Ga naar KiB Import
        </button>
      </div>
    );
  }

  const selectedGoal = activeGoalId || session.goals[0]?.id;

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );
  const sectorBenefits = selectedGoal
    ? getBenefitsByGoalAndSector(session.benefits, selectedGoal, activeSector)
    : [];

  // Vermogens per doel: filter via benefitCapabilityMaps (DIN-keten)
  const goalBenefitIds = new Set(sectorBenefits.map((b) => b.id));
  const linkedCapIds = new Set(
    session.benefitCapabilityMaps
      .filter((m) => goalBenefitIds.has(m.benefitId))
      .map((m) => m.capabilityId)
  );
  // Fallback: als geen maps bestaan voor deze sector, toon alle sector-vermogens
  const allSectorCaps = session.capabilities.filter((c) => c.sectorId === activeSector);
  const hasCapMaps = allSectorCaps.some((c) =>
    session.benefitCapabilityMaps.some((m) => m.capabilityId === c.id)
  );
  const sectorCapabilities = hasCapMaps
    ? allSectorCaps.filter((c) => linkedCapIds.has(c.id))
    : allSectorCaps;

  // Inspanningen per doel: filter via capabilityEffortMaps (DIN-keten)
  const goalCapIds = new Set(sectorCapabilities.map((c) => c.id));
  const linkedEffortIds = new Set(
    session.capabilityEffortMaps
      .filter((m) => goalCapIds.has(m.capabilityId))
      .map((m) => m.effortId)
  );
  const allSectorEfforts = session.efforts.filter((e) => e.sectorId === activeSector);
  const hasEffortMaps = allSectorEfforts.some((e) =>
    session.capabilityEffortMaps.some((m) => m.effortId === e.id)
  );
  const sectorEfforts = hasEffortMaps
    ? allSectorEfforts.filter((e) => linkedEffortIds.has(e.id))
    : allSectorEfforts;

  // Voortgang per sector
  function getSectorProgress(sector: SectorName) {
    const hasBenefits = session!.benefits.some((b) => b.sectorId === sector);
    const hasEfforts = session!.efforts.some((e) => e.sectorId === sector);
    const hasCaps = session!.capabilities.some((c) => c.sectorId === sector);
    if (hasBenefits && hasEfforts && hasCaps) return "compleet";
    if (hasBenefits || hasEfforts || hasCaps) return "bezig";
    return "leeg";
  }

  // --- CRUD functies ---
  function updateBenefit(updated: DINBenefit) {
    updateSession({
      benefits: session!.benefits.map((b) =>
        b.id === updated.id ? updated : b
      ),
    });
  }
  function deleteBenefit(id: string) {
    updateSession({
      benefits: session!.benefits.filter((b) => b.id !== id),
      goalBenefitMaps: session!.goalBenefitMaps.filter(
        (m) => m.benefitId !== id
      ),
    });
  }
  function addBenefit() {
    if (!selectedGoal) return;
    const newBenefit = createBenefit(selectedGoal, activeSector, "");
    updateSession({
      benefits: [...session!.benefits, newBenefit],
      goalBenefitMaps: [
        ...session!.goalBenefitMaps,
        { goalId: selectedGoal, benefitId: newBenefit.id },
      ],
    });
  }
  function updateCapability(updated: DINCapability) {
    updateSession({
      capabilities: session!.capabilities.map((c) =>
        c.id === updated.id ? updated : c
      ),
    });
  }
  function deleteCapability(id: string) {
    updateSession({
      capabilities: session!.capabilities.filter((c) => c.id !== id),
      benefitCapabilityMaps: session!.benefitCapabilityMaps.filter(
        (m) => m.capabilityId !== id
      ),
    });
  }
  function addCapability() {
    const newCap = createCapability(activeSector, "");
    // DIN-keten: koppel aan alle baten van het huidige doel in deze sector
    const newMaps = sectorBenefits.map((b) => ({
      benefitId: b.id,
      capabilityId: newCap.id,
    }));
    updateSession({
      capabilities: [...session!.capabilities, newCap],
      benefitCapabilityMaps: [...session!.benefitCapabilityMaps, ...newMaps],
    });
  }
  function updateEffort(updated: DINEffort) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === updated.id ? updated : e
      ),
    });
  }
  function deleteEffort(id: string) {
    updateSession({
      efforts: session!.efforts.filter((e) => e.id !== id),
      capabilityEffortMaps: session!.capabilityEffortMaps.filter(
        (m) => m.effortId !== id
      ),
    });
  }
  function addEffort(domain: EffortDomain) {
    const newEffort = createEffort(activeSector, "", domain);
    // DIN-keten: koppel aan alle vermogens van het huidige doel in deze sector
    const newMaps = sectorCapabilities.map((c) => ({
      capabilityId: c.id,
      effortId: newEffort.id,
    }));
    updateSession({
      efforts: [...session!.efforts, newEffort],
      capabilityEffortMaps: [...session!.capabilityEffortMaps, ...newMaps],
    });
  }

  // --- Per-item AI suggesties ---
  async function fetchAISuggestion(
    type: "baat" | "vermogen" | "inspanning",
    extra: Record<string, unknown> = {}
  ) {
    const goal = session!.goals.find((g) => g.id === selectedGoal);
    const context: Record<string, unknown> = {
      sector: activeSector,
      goalName: goal?.name,
      goalDescription: goal?.description,
      sectorPlanText: sectorPlan?.rawText,
      ...extra,
    };
    const res = await fetch("/api/din-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context }),
    });
    const data = await res.json();
    if (data.success && data.data?.suggestion) {
      return data.data.suggestion;
    }
    return null;
  }

  function makeBenefitSuggest(benefit: DINBenefit) {
    return async () => {
      return fetchAISuggestion("baat", {
        existingDescription: benefit.description || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.id !== benefit.id && b.description)
          .map((b) => b.description),
      });
    };
  }

  function makeCapabilitySuggest(cap: DINCapability) {
    return async () => {
      return fetchAISuggestion("vermogen", {
        existingDescription: cap.description || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.description)
          .map((b) => b.description),
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.id !== cap.id && c.description)
          .map((c) => c.description),
      });
    };
  }

  function makeEffortSuggest(effort: DINEffort) {
    return async () => {
      const domainLabels: Record<string, string> = {
        mens: "Mens",
        processen: "Processen",
        data_systemen: "Data & Systemen",
        cultuur: "Cultuur",
      };
      return fetchAISuggestion("inspanning", {
        existingDescription: effort.description || undefined,
        domain: domainLabels[effort.domain] || effort.domain,
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.description)
          .map((c) => c.description),
      });
    };
  }

  // --- AI volledig DIN genereren ---
  async function handleAIGenerate() {
    if (!selectedGoal) return;
    setIsGenerating(true);
    try {
      const goal = session!.goals.find((g) => g.id === selectedGoal);
      const res = await fetch("/api/din-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          sectorPlan,
          sector: activeSector,
          allGoals: session!.goals.map((g) => ({ name: g.name, description: g.description })),
          sectorAnalysis: session!.sectorAnalyses?.[activeSector] || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newBenefits = (data.data.benefits || []).map(
          (b: Partial<DINBenefit>) => ({
            ...createBenefit(selectedGoal, activeSector, ""),
            ...b,
            goalId: selectedGoal,
            sectorId: activeSector,
          })
        );
        const newCaps = (data.data.capabilities || []).map(
          (c: Partial<DINCapability>) => ({
            ...createCapability(activeSector, ""),
            ...c,
            sectorId: activeSector,
          })
        );
        const newEfforts = (data.data.efforts || []).map(
          (e: Partial<DINEffort>) => ({
            ...createEffort(activeSector, "", "mens"),
            ...e,
            sectorId: activeSector,
          })
        );
        // DIN-keten: koppel alle niveaus aan elkaar
        // Doel → Baten
        const newGoalBenefitMaps = newBenefits.map((b: DINBenefit) => ({
          goalId: selectedGoal,
          benefitId: b.id,
        }));
        // Baten → Vermogens (elke baat aan elk vermogen binnen dit doel)
        const newBenCapMaps = newBenefits.flatMap((b: DINBenefit) =>
          newCaps.map((c: DINCapability) => ({
            benefitId: b.id,
            capabilityId: c.id,
          }))
        );
        // Vermogens → Inspanningen (elk vermogen aan elke inspanning)
        const newCapEffMaps = newCaps.flatMap((c: DINCapability) =>
          newEfforts.map((e: DINEffort) => ({
            capabilityId: c.id,
            effortId: e.id,
          }))
        );

        updateSession({
          benefits: [...session!.benefits, ...newBenefits],
          capabilities: [...session!.capabilities, ...newCaps],
          efforts: [...session!.efforts, ...newEfforts],
          goalBenefitMaps: [...session!.goalBenefitMaps, ...newGoalBenefitMaps],
          benefitCapabilityMaps: [...session!.benefitCapabilityMaps, ...newBenCapMaps],
          capabilityEffortMaps: [...session!.capabilityEffortMaps, ...newCapEffMaps],
        });
      }
    } catch (e) {
      console.error("AI generatie mislukt:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Integratie-advies ---
  async function handleIntegratieAdvies() {
    setIsAnalyzingIntegratie(true);
    try {
      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sector-integratie",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals,
          benefits: session!.benefits.filter((b) => b.sectorId === activeSector),
          capabilities: sectorCapabilities,
          efforts: sectorEfforts,
          externalProjects: (session!.externalProjects || []).filter((p) => p.sectorId === activeSector),
          sectorAnalysis: session!.sectorAnalyses?.[activeSector] || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        let parsed: IntegratieAdviesResult | string;
        try {
          const raw = data.data.analysis as string;
          // Strip markdown code fences if present
          const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();
          const json = JSON.parse(cleaned);
          parsed = {
            sectorName: activeSector,
            aansluiting: json.aansluiting,
            verrijking: json.verrijking,
            aanvullingen: json.aanvullingen,
            quickWins: json.quickWins,
            aandachtspunten: json.aandachtspunten,
          } as IntegratieAdviesResult;
        } catch {
          // Fallback: platte tekst als JSON parsing faalt
          parsed = data.data.analysis;
        }
        setIntegratieAdvies((prev) => ({
          ...prev,
          [activeSector]: parsed,
        }));
        setShowAdviesPanel(true);
      }
    } catch (e) {
      console.error("Integratie-advies mislukt:", e);
    } finally {
      setIsAnalyzingIntegratie(false);
    }
  }

  // --- Verrijkt sectorplan genereren ---
  async function handleGenerateVerrijktPlan() {
    setIsGeneratingPlan(true);
    try {
      // Integratie-advies als tekst meegeven
      let adviesText = "";
      const advies = integratieAdvies[activeSector];
      if (advies && typeof advies !== "string") {
        const sections = ["aansluiting", "verrijking", "aanvullingen", "quickWins", "aandachtspunten"] as const;
        adviesText = sections
          .map((key) => {
            const s = advies[key];
            if (!s) return "";
            return `${s.titel}: ${s.toelichting}\n${s.punten.map((p) => `- ${p}`).join("\n")}`;
          })
          .filter(Boolean)
          .join("\n\n");
      } else if (typeof advies === "string") {
        adviesText = advies;
      }

      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "verrijkt-sectorplan",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals.map((g) => ({ name: g.name, description: g.description })),
          benefits: session!.benefits
            .filter((b) => b.sectorId === activeSector)
            .map((b) => ({
              description: b.description,
              profiel: b.profiel,
            })),
          capabilities: sectorCapabilities.map((c) => ({
            description: c.description,
            currentLevel: c.currentLevel,
            targetLevel: c.targetLevel,
          })),
          efforts: sectorEfforts.map((e) => ({
            description: e.description,
            domain: e.domain,
            quarter: e.quarter,
            status: e.status,
          })),
          integratieAdvies: adviesText,
          externalProjects: (session!.externalProjects || []).filter((p) => p.sectorId === activeSector),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setVerrijktSectorplan((prev) => ({
          ...prev,
          [activeSector]: data.data.analysis,
        }));
      }
    } catch (e) {
      console.error("Verrijkt sectorplan genereren mislukt:", e);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Loading overlay bij genereren verrijkt sectorplan */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-sm">
            <div className="w-12 h-12 border-3 border-cito-blue border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-base font-semibold text-cito-blue">
                Sectorplan wordt bijgewerkt...
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Programmadoelen KiB + DIN-items worden verwerkt in het sectorplan van {activeSector}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fase toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setPhase("per-sector")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            phase === "per-sector"
              ? "bg-white text-cito-blue shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Per Sector Invullen
        </button>
        <button
          onClick={() => setPhase("samengevoegd")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            phase === "samengevoegd"
              ? "bg-white text-cito-blue shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Samengevoegd DIN-Netwerk
        </button>
      </div>

      {/* Fase B: Samengevoegd */}
      {phase === "samengevoegd" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <strong>Samengevoegd overzicht:</strong> Alle sectoren gecombineerd in
            één DIN-netwerk. Per doel zie je welke baten, vermogens en inspanningen
            per sector zijn ingevuld. Gedeelde vermogens worden als synergie
            gemarkeerd.
          </div>
          <MergedDINView
            session={session}
            onSwitchToEdit={() => setPhase("per-sector")}
            onDeleteBenefit={deleteBenefit}
            onDeleteCapability={deleteCapability}
            onDeleteEffort={deleteEffort}
          />
        </div>
      )}

      {/* Fase A: Per Sector */}
      {phase === "per-sector" && (
        <>
          <DINChainIndicator />

          {/* Sector tabs met voortgang */}
          <div className="flex gap-1 border-b border-gray-200">
            {SECTORS.map((sector) => {
              const progress = getSectorProgress(sector);
              return (
                <button
                  key={sector}
                  onClick={() => {
                    setActiveSector(sector);
                    setActiveGoalId(null);
                  }}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSector === sector
                      ? "border-cito-blue text-cito-blue"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {sector}
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      progress === "compleet"
                        ? "bg-green-500"
                        : progress === "bezig"
                        ? "bg-amber-400"
                        : "bg-gray-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Actieve sector header */}
          <div className="px-4 py-3 bg-cito-blue/5 border border-cito-blue/20 rounded-lg">
            <div className="text-sm font-semibold text-cito-blue">
              DIN-netwerk voor sector: {activeSector}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Selecteer links een doel en vul rechts de baten, vermogens en
              inspanningen in. Gebruik de AI-knoppen per item voor hulp.
            </div>
          </div>

          <div className="flex gap-6">
            {/* Doelen sidebar */}
            <div className="w-56 shrink-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Doelen
              </h4>
              <div className="space-y-1">
                {session.goals
                  .sort((a, b) => a.rank - b.rank)
                  .map((goal) => {
                    const hasBenefits = session.benefits.some(
                      (b) =>
                        b.goalId === goal.id && b.sectorId === activeSector
                    );
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setActiveGoalId(goal.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedGoal === goal.id
                            ? "bg-cito-blue text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {goal.rank}. {goal.name}
                        {hasBenefits && (
                          <span className="ml-1 text-green-400">{"\u25CF"}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* DIN Editor */}
            <div className="flex-1 space-y-6">
              {/* AI knoppen */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isGenerating
                    ? "Genereren..."
                    : "AI: Genereer DIN-netwerk"}
                </button>
                <button
                  onClick={handleIntegratieAdvies}
                  disabled={isAnalyzingIntegratie}
                  className="px-4 py-2 bg-white border border-cito-blue text-cito-blue rounded-lg text-sm font-medium hover:bg-cito-blue/5 disabled:opacity-50"
                >
                  {isAnalyzingIntegratie ? "Analyseren..." : "Integratie-advies"}
                </button>
                {integratieAdvies[activeSector] && (
                  <button
                    onClick={() => setShowAdviesPanel(true)}
                    className="px-3 py-2 bg-cito-blue/10 text-cito-blue rounded-lg text-sm hover:bg-cito-blue/20"
                    title="Bekijk integratie-advies"
                  >
                    {"\uD83D\uDCCB"}
                  </button>
                )}
              </div>

              {/* Baten */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-din-baten">
                    Baten — welke effecten wil {activeSector} bereiken?
                  </h4>
                  <button
                    onClick={addBenefit}
                    className="text-xs text-cito-blue hover:underline"
                  >
                    + Baat toevoegen
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Welke effecten wil {activeSector} bereiken voor dit
                  doel?
                </p>
                <div className="space-y-2">
                  {sectorBenefits.map((b) => (
                    <BenefitCard
                      key={b.id}
                      benefit={b}
                      onChange={updateBenefit}
                      onDelete={() => deleteBenefit(b.id)}
                      onAISuggest={makeBenefitSuggest(b)}
                    />
                  ))}
                  {sectorBenefits.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Nog geen baten. Voeg ze toe of laat AI genereren.
                    </p>
                  )}
                </div>
              </div>

              {/* Vermogens */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-din-vermogens">
                    Vermogens — wat moet {activeSector} kunnen?
                  </h4>
                  <button
                    onClick={addCapability}
                    className="text-xs text-cito-blue hover:underline"
                  >
                    + Vermogen toevoegen
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Wat moet {activeSector} kunnen om deze baten te
                  realiseren?
                </p>
                <div className="space-y-2">
                  {sectorCapabilities.map((c) => (
                    <CapabilityCard
                      key={c.id}
                      capability={c}
                      onChange={updateCapability}
                      onDelete={() => deleteCapability(c.id)}
                      onAISuggest={makeCapabilitySuggest(c)}
                    />
                  ))}
                  {sectorCapabilities.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Nog geen vermogens voor {activeSector}.
                    </p>
                  )}
                </div>
              </div>

              {/* Inspanningen per domein */}
              <div>
                <h4 className="text-sm font-semibold text-din-inspanningen mb-1">
                  Inspanningen — wat moet {activeSector} doen?
                </h4>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Welke concrete activiteiten bouwen de vermogens op?
                  Verdeeld over 4 domeinen.
                </p>
                <div className="grid grid-cols-2 gap-4 items-start">
                  {DOMAINS.map((domain) => {
                    const domainEfforts = sectorEfforts.filter(
                      (e) => e.domain === domain.key
                    );
                    return (
                      <div key={domain.key} className="space-y-2 min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            {domain.label}
                          </span>
                          <button
                            onClick={() => addEffort(domain.key)}
                            className="text-xs text-cito-blue hover:underline"
                          >
                            +
                          </button>
                        </div>
                        {domainEfforts.map((e) => (
                          <EffortCard
                            key={e.id}
                            effort={e}
                            onChange={updateEffort}
                            onDelete={() => deleteEffort(e.id)}
                            onAISuggest={makeEffortSuggest(e)}
                          />
                        ))}
                        {domainEfforts.length === 0 && (
                          <p className="text-xs text-gray-400 italic">Geen</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Externe projecten buiten het programma */}
              <ExterneProjectenPanel
                currentSector={activeSector}
                projects={(session.externalProjects || []).filter((p) => p.sectorId === activeSector)}
                onAdd={() => {
                  const newProject: ExternalProject = {
                    id: generateId(),
                    sectorId: activeSector,
                    name: "",
                    description: "",
                    status: "in_uitvoering",
                  };
                  updateSession({
                    externalProjects: [...(session.externalProjects || []), newProject],
                  });
                }}
                onUpdate={(updated) => {
                  updateSession({
                    externalProjects: (session.externalProjects || []).map((p) =>
                      p.id === updated.id ? updated : p
                    ),
                  });
                }}
                onDelete={(id) => {
                  updateSession({
                    externalProjects: (session.externalProjects || []).filter((p) => p.id !== id),
                  });
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Integratie-advies slide-out panel */}
      {showAdviesPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowAdviesPanel(false)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-semibold text-cito-blue">
                  Integratie-advies: {activeSector}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hoe past het DIN-netwerk in het sectorplan?
                </p>
              </div>
              <button
                onClick={() => setShowAdviesPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 text-lg"
              >
                {"\u2715"}
              </button>
            </div>
            <div className="p-5 space-y-3">
              {integratieAdvies[activeSector] ? (
                typeof integratieAdvies[activeSector] === "string" ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {integratieAdvies[activeSector] as string}
                    </div>
                  </div>
                ) : (
                  ADVIES_SECTIONS.map(({ key, color, borderColor, bgColor, iconColor }) => {
                    const advice = integratieAdvies[activeSector] as IntegratieAdviesResult;
                    const section = advice[key];
                    if (!section) return null;
                    return (
                      <AdviesCard
                        key={key}
                        section={section}
                        color={color}
                        borderColor={borderColor}
                        bgColor={bgColor}
                        iconColor={iconColor}
                      />
                    );
                  })
                )
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Klik &ldquo;Integratie-advies&rdquo; om AI-analyse te genereren.
                </div>
              )}

              {/* Vervolgactie: Verwerk in sectorplan */}
              {integratieAdvies[activeSector] && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="p-4 bg-cito-blue/5 border border-cito-blue/15 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <svg className="w-5 h-5 text-cito-blue shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-cito-blue">
                          Verwerk in sectorplan
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          Het oorspronkelijke sectorplan blijft volledig behouden. Er wordt een nieuw hoofdstuk &ldquo;Programma Klant in Beeld&rdquo; aan toegevoegd met de programmadoelen, DIN-baten, vermogens en inspanningen.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateVerrijktPlan}
                      disabled={isGeneratingPlan}
                      className="w-full px-4 py-3 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sectorplan wordt bijgewerkt...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Genereer bijgewerkt sectorplan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Bijgewerkt sectorplan resultaat */}
              {verrijktSectorplan[activeSector] && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-cito-blue">
                      Bijgewerkt sectorplan: {activeSector}
                    </h4>
                    <button
                      onClick={() =>
                        setVerrijktSectorplan((prev) => {
                          const next = { ...prev };
                          delete next[activeSector];
                          return next;
                        })
                      }
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Sluiten
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-white p-4 rounded-lg border border-gray-200 max-h-[60vh] overflow-y-auto">
                    {verrijktSectorplan[activeSector]}
                  </div>

                  {/* Download als Word */}
                  <button
                    onClick={async () => {
                      const blob = await generateVerrijktSectorplanDocument(
                        activeSector,
                        verrijktSectorplan[activeSector],
                        session.name
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Sectorplan-${activeSector}-KiB-${new Date().toISOString().slice(0, 10)}.docx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full mt-3 px-4 py-3 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download als Word (.docx)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
