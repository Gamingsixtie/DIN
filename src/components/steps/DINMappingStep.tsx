"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  DINSession,
  EffortDomain,
  EffortStatus,
  SectorName,
  SectorplanAnalyseResult,
  ProjectCapabilityMap,
} from "@/lib/types";
import MarkdownContent from "@/components/ui/MarkdownContent";
import { SECTORS, DOMAIN_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/types";
import {
  createBenefit,
  createCapability,
  createEffort,
  generateId,
  getBenefitsByGoalAndSector,
  getGoalCompletionStatus,
  getLinkedCapabilities,
  type GoalCompletionStatus,
  type SectorChainStatus,
  type GoalStatus,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import { validateBaat, validateVermogen, validateInspanning } from "@/lib/din-validation";
import type { ValidationCorrection } from "@/lib/din-validation";
import DINChainIndicator from "@/components/din/DINChainIndicator";
import DINCreatieWizard from "@/components/din/DINCreatieWizard";
import type { WizardResult } from "@/components/din/DINCreatieWizard";
import { generateVerrijktSectorplanDocument } from "@/lib/word-export";
import ExterneProjectenPanel from "@/components/din/ExterneProjectenPanel";
import ConsolidatieOverzicht from "@/components/din/ConsolidatieOverzicht";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

const DOMAIN_DOT_COLORS: Record<EffortDomain, string> = {
  mens: "bg-domain-mens",
  processen: "bg-domain-processen",
  data_systemen: "bg-domain-data",
  cultuur: "bg-domain-cultuur",
  overig: "bg-gray-500",
};

const DOMAIN_DOT_BG: Record<EffortDomain, string> = {
  mens: "bg-domain-mens/15",
  processen: "bg-domain-processen/15",
  data_systemen: "bg-domain-data/15",
  cultuur: "bg-domain-cultuur/15",
  overig: "bg-gray-500/15",
};

const DOMAIN_EFFORT_BTN: Record<EffortDomain, string> = {
  mens: "bg-domain-mens/10 hover:bg-domain-mens/20 border-domain-mens/20",
  processen: "bg-domain-processen/10 hover:bg-domain-processen/20 border-domain-processen/20",
  data_systemen: "bg-domain-data/10 hover:bg-domain-data/20 border-domain-data/20",
  cultuur: "bg-domain-cultuur/10 hover:bg-domain-cultuur/20 border-domain-cultuur/20",
  overig: "bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20",
};

// Domein-beschrijvingen conform methodiek (Wijnen & Van der Tak)
const DOMAIN_DESCRIPTIONS: Record<EffortDomain, string> = {
  mens: "Opleiding, training, bemensing, competentieontwikkeling",
  processen: "Werkwijzen, procedures, governance, samenwerking",
  data_systemen: "IT-systemen, data-infrastructuur, tooling, integraties",
  cultuur: "Gedrag, mindset, waarden, leiderschapsontwikkeling",
  overig: "Programma-brede posten (zoals onvoorzien)",
};


const STATUS_OPTIONS: { key: EffortStatus; label: string; color: string }[] = (
  Object.entries(STATUS_LABELS) as [EffortStatus, string][]
).map(([key, label]) => ({ key, label, color: STATUS_STYLES[key] }));

function getDomainChipStyle(domain: EffortDomain): string {
  const styles: Record<EffortDomain, string> = {
    mens: "bg-blue-500/10 text-blue-600 border border-blue-500/30",
    processen: "bg-green-600/10 text-green-600 border border-green-600/30",
    data_systemen: "bg-purple-600/10 text-purple-600 border border-purple-600/30",
    cultuur: "bg-amber-600/10 text-amber-600 border border-amber-600/30",
    overig: "bg-gray-500/10 text-gray-700 border border-gray-300",
  };
  return styles[domain] || "bg-gray-100 text-gray-600";
}


// ============================================================
// SectorwerkSuggestiePanel — baten-suggesties uit sectorwerk-analyse (D-03)
// ============================================================

function SectorwerkSuggestiePanel({
  analysis,
  activeSector,
  selectedGoal,
  existingBenefits,
  onAdopt,
  onAdoptAll,
}: {
  analysis: SectorplanAnalyseResult;
  activeSector: SectorName;
  selectedGoal: string;
  existingBenefits: DINBenefit[];
  onAdopt: (suggestieText: string, index: number) => void;
  onAdoptAll: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adoptedIndices, setAdoptedIndices] = useState<Set<number>>(new Set());

  const suggesties = analysis.baten?.punten || [];
  if (suggesties.length === 0) return null;

  // Detecteer al overgenomen suggesties door vergelijking met bestaande benefits
  const isAdopted = (index: number, text: string) => {
    if (adoptedIndices.has(index)) return true;
    // Check of er al een benefit bestaat met dezelfde tekst
    return existingBenefits.some(
      (b) => b.description === text || b.title === text
    );
  };

  const unadoptedCount = suggesties.filter((s, i) => !isAdopted(i, s)).length;

  const handleAdopt = (text: string, index: number) => {
    setAdoptedIndices((prev) => new Set(prev).add(index));
    onAdopt(text, index);
  };

  const handleAdoptAll = () => {
    const newAdopted = new Set(adoptedIndices);
    suggesties.forEach((s, i) => {
      if (!isAdopted(i, s)) {
        newAdopted.add(i);
      }
    });
    setAdoptedIndices(newAdopted);
    onAdoptAll();
  };

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50/50">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <svg
          className={`w-4 h-4 text-cito-blue transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-cito-blue flex-1">
          Suggesties uit sectorwerk-analyse
        </span>
        <span className="text-xs font-semibold text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
          {suggesties.length}
        </span>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {/* Batch button wanneer >= 3 niet-overgenomen suggesties */}
          {unadoptedCount >= 3 && (
            <button
              onClick={handleAdoptAll}
              className="text-xs font-semibold text-cito-blue hover:underline px-0 py-1"
            >
              Alle suggesties overnemen
            </button>
          )}

          {suggesties.map((suggestie, index) => {
            const adopted = isAdopted(index, suggestie);
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 bg-white rounded-lg border transition-colors ${
                  adopted
                    ? "border-gray-200 opacity-50"
                    : "border-blue-100 hover:border-blue-300"
                }`}
              >
                <span
                  className={`text-sm flex-1 ${
                    adopted ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                >
                  {suggestie}
                </span>
                {!adopted && (
                  <button
                    onClick={() => handleAdopt(suggestie, index)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-cito-blue text-white text-sm font-semibold hover:bg-cito-blue-light transition-colors shrink-0"
                    aria-label="Baat overnemen"
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DINMappingStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Corrections state: keyed by item ID, stores validation corrections
  const [benefitCorrections, setBenefitCorrections] = useState<Record<string, ValidationCorrection[]>>({});
  const [capabilityCorrections, setCapabilityCorrections] = useState<Record<string, ValidationCorrection[]>>({});
  const [effortCorrections, setEffortCorrections] = useState<Record<string, ValidationCorrection[]>>({});
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [verrijktSectorplan, setVerrijktSectorplanState] = useState<Record<string, string>>(
    session?.verrijkteSectorplannen || {}
  );
  const [aiRetryable, setAiRetryable] = useState(false);
  const [userFeedback, setUserFeedback] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  // DIN-editor UI state
  const [expandedBenefits, setExpandedBenefits] = useState<Set<string>>(new Set());
  const [expandedCapability, setExpandedCapability] = useState<string | null>(null);
  const [expandedEffort, setExpandedEffort] = useState<string | null>(null);

  function toggleExpandedBenefit(id: string) {
    setExpandedBenefits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Undo state voor verwijderde items
  const [deletedItem, setDeletedItem] = useState<{
    type: "baat" | "vermogen" | "inspanning";
    item: DINBenefit | DINCapability | DINEffort;
    maps: { goalBenefitMaps?: { goalId: string; benefitId: string }[]; benefitCapabilityMaps?: { benefitId: string; capabilityId: string }[]; capabilityEffortMaps?: { capabilityId: string; effortId: string }[] };
  } | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Wizard state
  const [wizardState, setWizardState] = useState<{
    type: "baat" | "vermogen" | "inspanning";
    parentGoalId?: string;
    parentBenefitId?: string;
    parentCapabilityId?: string;
    domain?: EffortDomain;
    _ts?: number; // Force remount bij herhaalde opens
  } | null>(null);

  // Auto-dismiss undo toast na 8 seconden
  const dismissUndo = useCallback(() => {
    setDeletedItem(null);
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
  }, [undoTimer]);

  useEffect(() => {
    return () => { if (undoTimer) clearTimeout(undoTimer); };
  }, [undoTimer]);

  // Wrapper: sla verrijkt sectorplan ook op in sessie
  function setVerrijktSectorplan(updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) {
    setVerrijktSectorplanState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      updateSession(sessionPrev => ({ ...sessionPrev, verrijkteSectorplannen: next }));
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

  // Alle sector-vermogens en -inspanningen (koppeling wordt visueel beheerd)
  const goalBenefitIds = new Set(sectorBenefits.map((b) => b.id));
  const allSectorCaps = session.capabilities.filter((c) => c.sectorId === activeSector);
  const sectorCapabilities = allSectorCaps;
  const allSectorEfforts = session.efforts.filter((e) => e.sectorId === activeSector);
  const sectorEfforts = allSectorEfforts;

  // Voortgang per sector
  function getSectorProgress(sector: SectorName) {
    const hasBenefits = session!.benefits.some((b) => b.sectorId === sector);
    const hasEfforts = session!.efforts.some((e) => e.sectorId === sector);
    const hasCaps = session!.capabilities.some((c) => c.sectorId === sector);
    if (hasBenefits && hasEfforts && hasCaps) return "compleet";
    if (hasBenefits || hasEfforts || hasCaps) return "bezig";
    return "leeg";
  }

  // Bouw completedGoalItems voor AI context (per D-06, D-08)
  function buildCompletedGoalItemsForAPI() {
    const completedGoalIds = session!.completedGoals ?? [];
    if (completedGoalIds.length === 0) return [];

    return completedGoalIds.map(goalId => {
      const goal = session!.goals.find(g => g.id === goalId);

      // Verzamel alle baten voor dit doel (over alle sectoren)
      const goalBenefitIds = session!.goalBenefitMaps
        .filter(m => m.goalId === goalId)
        .map(m => m.benefitId);
      const benefits = session!.benefits
        .filter(b => goalBenefitIds.includes(b.id))
        .map(b => ({
          title: b.title,
          description: b.description,
          indicator: b.profiel?.indicator || undefined,
        }));

      // Verzamel vermogens via benefitCapabilityMaps
      const linkedCapIds = session!.benefitCapabilityMaps
        .filter(m => goalBenefitIds.includes(m.benefitId))
        .map(m => m.capabilityId);
      const capabilities = session!.capabilities
        .filter(c => linkedCapIds.includes(c.id))
        .map(c => ({
          title: c.title,
          description: c.description,
        }));

      // Verzamel inspanningen via capabilityEffortMaps
      const linkedEffortIds = session!.capabilityEffortMaps
        .filter(m => linkedCapIds.includes(m.capabilityId))
        .map(m => m.effortId);
      const efforts = session!.efforts
        .filter(e => linkedEffortIds.includes(e.id))
        .map(e => ({
          title: e.title,
          description: e.description,
          domain: e.domain || undefined,
        }));

      return {
        goalName: goal?.name || "Onbekend doel",
        benefits,
        capabilities,
        efforts,
      };
    }).filter(item => item.benefits.length > 0 || item.capabilities.length > 0 || item.efforts.length > 0);
  }

  // --- CRUD functies ---
  function updateBenefit(updated: DINBenefit) {
    // Check if title changed for client-side validation (per D-02)
    const current = session?.benefits.find(b => b.id === updated.id);
    if (current && updated.title !== current.title) {
      const result = validateBaat({ ...updated, title: updated.title || "" });
      if (result.corrections.length > 0) {
        setBenefitCorrections(prev => ({ ...prev, [updated.id]: result.corrections }));
      } else {
        setBenefitCorrections(prev => {
          const next = { ...prev };
          delete next[updated.id];
          return next;
        });
      }
    }
    updateSession(prev => ({
      benefits: prev.benefits.map((b) =>
        b.id === updated.id ? updated : b
      ),
    }));
  }
  function deleteBenefit(id: string) {
    const item = session!.benefits.find((b) => b.id === id);
    const maps = session!.goalBenefitMaps.filter((m) => m.benefitId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "baat", item, maps: { goalBenefitMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
    updateSession(prev => ({
      benefits: prev.benefits.filter((b) => b.id !== id),
      goalBenefitMaps: prev.goalBenefitMaps.filter(
        (m) => m.benefitId !== id
      ),
    }));
  }
  function addBenefit() {
    if (!selectedGoal) return;
    setWizardState({ type: "baat", parentGoalId: selectedGoal, _ts: Date.now() });
  }
  function addBenefitManual() {
    if (!selectedGoal) return;
    const newBenefit = createBenefit(selectedGoal, activeSector, "");
    updateSession(prev => ({
      benefits: [...prev.benefits, newBenefit],
      goalBenefitMaps: [
        ...prev.goalBenefitMaps,
        { goalId: selectedGoal, benefitId: newBenefit.id },
      ],
    }));
    setExpandedBenefits((prev) => new Set(prev).add(newBenefit.id));
    setWizardState(null);
  }
  function adoptSuggestie(suggestieText: string) {
    if (!selectedGoal) return;
    const newBenefit = createBenefit(selectedGoal, activeSector, suggestieText);
    updateSession((prev) => ({
      benefits: [...prev.benefits, newBenefit],
      goalBenefitMaps: [
        ...prev.goalBenefitMaps,
        { goalId: selectedGoal, benefitId: newBenefit.id },
      ],
    }));
    setExpandedBenefits((prev) => new Set(prev).add(newBenefit.id));
  }
  function adoptAllSuggesties() {
    if (!selectedGoal) return;
    const analysis = session!.sectorAnalyses?.[activeSector];
    if (!analysis || typeof analysis === "string") return;
    const suggesties = analysis.baten?.punten || [];
    const existingDescriptions = new Set(
      sectorBenefits.map((b) => b.description)
    );
    const existingTitles = new Set(
      sectorBenefits.map((b) => b.title)
    );
    const newBenefits: DINBenefit[] = [];
    const newMaps: { goalId: string; benefitId: string }[] = [];
    for (const text of suggesties) {
      if (existingDescriptions.has(text) || existingTitles.has(text)) continue;
      const b = createBenefit(selectedGoal, activeSector, text);
      newBenefits.push(b);
      newMaps.push({ goalId: selectedGoal, benefitId: b.id });
    }
    if (newBenefits.length === 0) return;
    updateSession((prev) => ({
      benefits: [...prev.benefits, ...newBenefits],
      goalBenefitMaps: [...prev.goalBenefitMaps, ...newMaps],
    }));
    const expanded = new Set(expandedBenefits);
    newBenefits.forEach((b) => expanded.add(b.id));
    setExpandedBenefits(expanded);
  }
  function updateCapability(updated: DINCapability) {
    // Check if title changed for client-side validation (per D-02)
    const current = session?.capabilities.find(c => c.id === updated.id);
    if (current && updated.title !== current.title) {
      const result = validateVermogen({ ...updated, title: updated.title || "" });
      if (result.corrections.length > 0) {
        setCapabilityCorrections(prev => ({ ...prev, [updated.id]: result.corrections }));
      } else {
        setCapabilityCorrections(prev => {
          const next = { ...prev };
          delete next[updated.id];
          return next;
        });
      }
    }
    updateSession(prev => ({
      capabilities: prev.capabilities.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  }
  function deleteCapability(id: string) {
    const item = session!.capabilities.find((c) => c.id === id);
    const maps = session!.benefitCapabilityMaps.filter((m) => m.capabilityId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "vermogen", item, maps: { benefitCapabilityMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
    updateSession(prev => ({
      capabilities: prev.capabilities.filter((c) => c.id !== id),
      benefitCapabilityMaps: prev.benefitCapabilityMaps.filter(
        (m) => m.capabilityId !== id
      ),
    }));
  }
  function addCapability(benefitId?: string) {
    setWizardState({ type: "vermogen", parentBenefitId: benefitId, _ts: Date.now() });
  }
  function addCapabilityManual(benefitId?: string) {
    const newCap = createCapability(activeSector, "");
    updateSession(prev => {
      const updates: Partial<DINSession> = {
        capabilities: [...prev.capabilities, newCap],
      };
      if (benefitId) {
        updates.benefitCapabilityMaps = [
          ...prev.benefitCapabilityMaps,
          { benefitId, capabilityId: newCap.id },
        ];
      }
      return updates;
    });
    setExpandedCapability(newCap.id);
    setWizardState(null);
  }
  function updateEffort(updated: DINEffort) {
    // Check if title changed for client-side validation (per D-02)
    const current = session?.efforts.find(e => e.id === updated.id);
    if (current && updated.title !== current.title) {
      const result = validateInspanning({ ...updated, title: updated.title || "" });
      if (result.corrections.length > 0) {
        setEffortCorrections(prev => ({ ...prev, [updated.id]: result.corrections }));
      } else {
        setEffortCorrections(prev => {
          const next = { ...prev };
          delete next[updated.id];
          return next;
        });
      }
    }
    updateSession(prev => ({
      efforts: prev.efforts.map((e) =>
        e.id === updated.id ? updated : e
      ),
    }));
  }
  function deleteEffort(id: string) {
    const item = session!.efforts.find((e) => e.id === id);
    const maps = session!.capabilityEffortMaps.filter((m) => m.effortId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "inspanning", item, maps: { capabilityEffortMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
    updateSession(prev => ({
      efforts: prev.efforts.filter((e) => e.id !== id),
      capabilityEffortMaps: prev.capabilityEffortMaps.filter(
        (m) => m.effortId !== id
      ),
    }));
  }
  function addEffort(domain?: EffortDomain, capabilityId?: string, benefitId?: string, goalId?: string) {
    setWizardState({ type: "inspanning", parentCapabilityId: capabilityId, parentBenefitId: benefitId, parentGoalId: goalId || selectedGoal || undefined, domain, _ts: Date.now() });
  }
  function addEffortManual(domain: EffortDomain, capabilityId?: string) {
    const newEffort = createEffort(activeSector, "", domain);
    updateSession(prev => {
      const updates: Partial<DINSession> = {
        efforts: [...prev.efforts, newEffort],
      };
      if (capabilityId) {
        updates.capabilityEffortMaps = [
          ...prev.capabilityEffortMaps,
          { capabilityId, effortId: newEffort.id },
        ];
      }
      return updates;
    });
    setExpandedEffort(newEffort.id);
    setWizardState(null);
  }

  // --- Wizard result handler (ondersteunt meerdere resultaten) ---
  function handleWizardResult(results: WizardResult[]) {
    if (!wizardState || results.length === 0) return;

    if (wizardState.type === "baat") {
      const result = results[0];
      const goalId = wizardState.parentGoalId || selectedGoal;
      if (!goalId) return;
      const newBenefit = createBenefit(goalId, activeSector, result.description, result.title);
      if (result.indicator) newBenefit.profiel.indicator = result.indicator;
      if (result.indicatorOwner) newBenefit.profiel.indicatorOwner = result.indicatorOwner;
      if (result.bateneigenaar) newBenefit.profiel.bateneigenaar = result.bateneigenaar;
      if (result.currentValue) newBenefit.profiel.currentValue = result.currentValue;
      if (result.targetValue) newBenefit.profiel.targetValue = result.targetValue;
      if (result.meetmethode) newBenefit.profiel.meetmethode = result.meetmethode;
      if (result.measurementMoment) newBenefit.profiel.measurementMoment = result.measurementMoment;
      updateSession(prev => ({
        benefits: [...prev.benefits, newBenefit],
        goalBenefitMaps: [
          ...prev.goalBenefitMaps,
          { goalId, benefitId: newBenefit.id },
        ],
      }));
      setExpandedBenefits((prev) => new Set(prev).add(newBenefit.id));
    } else if (wizardState.type === "vermogen") {
      const result = results[0];
      const newCap = createCapability(activeSector, result.description, result.title);
      if (result.currentLevel) newCap.currentLevel = result.currentLevel;
      if (result.targetLevel) newCap.targetLevel = result.targetLevel;
      if (result.eigenaar || result.huidieSituatie || result.gewensteSituatie) {
        newCap.profiel = {
          ...newCap.profiel,
          eigenaar: result.eigenaar || newCap.profiel?.eigenaar || "",
          huidieSituatie: result.huidieSituatie || newCap.profiel?.huidieSituatie || "",
          gewensteSituatie: result.gewensteSituatie || newCap.profiel?.gewensteSituatie || "",
        };
      }
      updateSession(prev => {
        const updates: Partial<DINSession> = {
          capabilities: [...prev.capabilities, newCap],
        };
        if (wizardState.parentBenefitId) {
          updates.benefitCapabilityMaps = [
            ...prev.benefitCapabilityMaps,
            { benefitId: wizardState.parentBenefitId, capabilityId: newCap.id },
          ];
        }
        return updates;
      });
      setExpandedCapability(newCap.id);
    } else if (wizardState.type === "inspanning") {
      // Meerdere inspanningen aanmaken (multi-domein)
      const newEfforts = results.map((result) => {
        const domain = result.domain || wizardState.domain || "mens";
        const newEffort = createEffort(activeSector, result.description, domain, result.title);
        if (result.quarter) newEffort.quarter = result.quarter;
        if (result.inspanningsEigenaar || result.inspanningsleider || result.verwachtResultaat || result.kostenraming || result.randvoorwaarden) {
          newEffort.dossier = {
            eigenaar: result.inspanningsEigenaar || "",
            inspanningsleider: result.inspanningsleider || "",
            verwachtResultaat: result.verwachtResultaat || "",
            kostenraming: result.kostenraming || "",
            randvoorwaarden: result.randvoorwaarden || "",
          };
        }
        return newEffort;
      });

      updateSession(prev => {
        const updates: Partial<DINSession> = {
          efforts: [...prev.efforts, ...newEfforts],
        };
        if (wizardState.parentCapabilityId) {
          updates.capabilityEffortMaps = [
            ...prev.capabilityEffortMaps,
            ...newEfforts.map((e) => ({
              capabilityId: wizardState.parentCapabilityId!,
              effortId: e.id,
            })),
          ];
        }
        return updates;
      });
      // Expand de laatste inspanning
      setExpandedEffort(newEfforts[newEfforts.length - 1].id);
    }
    setWizardState(null);
  }

  // --- Koppeling-beheer ---
  function toggleCapBenefitLink(capId: string, benefitId: string) {
    const exists = session!.benefitCapabilityMaps.some(
      (m) => m.benefitId === benefitId && m.capabilityId === capId
    );
    if (exists) {
      updateSession(prev => ({
        benefitCapabilityMaps: prev.benefitCapabilityMaps.filter(
          (m) => !(m.benefitId === benefitId && m.capabilityId === capId)
        ),
      }));
    } else {
      updateSession(prev => ({
        benefitCapabilityMaps: [
          ...prev.benefitCapabilityMaps,
          { benefitId, capabilityId: capId },
        ],
      }));
    }
  }

  function toggleEffortCapLink(effortId: string, capId: string) {
    const exists = session!.capabilityEffortMaps.some(
      (m) => m.effortId === effortId && m.capabilityId === capId
    );
    if (exists) {
      updateSession(prev => ({
        capabilityEffortMaps: prev.capabilityEffortMaps.filter(
          (m) => !(m.effortId === effortId && m.capabilityId === capId)
        ),
      }));
    } else {
      updateSession(prev => ({
        capabilityEffortMaps: [
          ...prev.capabilityEffortMaps,
          { capabilityId: capId, effortId },
        ],
      }));
    }
  }

  // --- Geneste DIN-keten helpers ---
  function getCapabilitiesForBenefit(benefitId: string) {
    const capIds = new Set(
      session!.benefitCapabilityMaps
        .filter((m) => m.benefitId === benefitId)
        .map((m) => m.capabilityId)
    );
    return allSectorCaps.filter((c) => capIds.has(c.id));
  }

  function getEffortsForCapability(capabilityId: string) {
    const effIds = new Set(
      session!.capabilityEffortMaps
        .filter((m) => m.capabilityId === capabilityId)
        .map((m) => m.effortId)
    );
    return allSectorEfforts.filter((e) => effIds.has(e.id));
  }

  function getUnlinkedCapabilities() {
    const linkedCapIds = new Set(
      session!.benefitCapabilityMaps
        .filter((m) => goalBenefitIds.has(m.benefitId))
        .map((m) => m.capabilityId)
    );
    return allSectorCaps.filter((c) => !linkedCapIds.has(c.id));
  }

  function getUnlinkedEfforts() {
    const allLinkedCapIds = new Set(sectorCapabilities.map((c) => c.id));
    const linkedEffortIds = new Set(
      session!.capabilityEffortMaps
        .filter((m) => allLinkedCapIds.has(m.capabilityId))
        .map((m) => m.effortId)
    );
    return allSectorEfforts.filter((e) => !linkedEffortIds.has(e.id));
  }

  function getBenefitsForCapability(capId: string) {
    return session!.benefitCapabilityMaps
      .filter((m) => m.capabilityId === capId)
      .map((m) => sectorBenefits.find((b) => b.id === m.benefitId))
      .filter(Boolean) as DINBenefit[];
  }

  function getCapsForEffort(effortId: string) {
    return session!.capabilityEffortMaps
      .filter((m) => m.effortId === effortId)
      .map((m) => allSectorCaps.find((c) => c.id === m.capabilityId))
      .filter(Boolean) as DINCapability[];
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
      body: JSON.stringify({ type, context, kibGoals: session!.goals, kibScope: session!.scope, sectorAnalysis: session!.sectorAnalyses?.[activeSector] || null, completedGoalItems: buildCompletedGoalItemsForAPI() }),
    });
    const data = await res.json();
    if (data.success && data.data?.suggestion) {
      setAiRetryable(false);
      setUserFeedback("");
      return data.data.suggestion;
    }
    if (data.retryable) {
      setAiRetryable(true);
      setAiError(data.error || "AI-suggestie mislukt. Probeer het opnieuw met extra instructies.");
    }
    return null;
  }

  function makeBenefitSuggest(benefit: DINBenefit) {
    return async (userPrompt?: string) => {
      return fetchAISuggestion("baat", {
        existingTitle: benefit.title || undefined,
        existingDescription: benefit.description || undefined,
        existingEigenaar: benefit.profiel.bateneigenaar || undefined,
        existingIndicator: benefit.profiel.indicator || undefined,
        existingOwner: benefit.profiel.indicatorOwner || undefined,
        existingCurrentValue: benefit.profiel.currentValue || undefined,
        existingTargetValue: benefit.profiel.targetValue || undefined,
        existingMeetmethode: benefit.profiel.meetmethode || undefined,
        existingMeasurementMoment: benefit.profiel.measurementMoment || undefined,
        userPrompt: userPrompt || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.id !== benefit.id && (b.title || b.description))
          .map((b) => b.title || b.description),
      });
    };
  }

  function makeCapabilitySuggest(cap: DINCapability) {
    return async (userPrompt?: string) => {
      return fetchAISuggestion("vermogen", {
        existingTitle: cap.title || undefined,
        existingDescription: cap.description || undefined,
        existingEigenaar: cap.profiel?.eigenaar || undefined,
        existingHuidieSituatie: cap.profiel?.huidieSituatie || undefined,
        existingGewensteSituatie: cap.profiel?.gewensteSituatie || undefined,
        existingCurrentLevel: cap.currentLevel || undefined,
        existingTargetLevel: cap.targetLevel || undefined,
        userPrompt: userPrompt || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.title || b.description)
          .map((b) => b.title || b.description),
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.id !== cap.id && (c.title || c.description))
          .map((c) => c.title || c.description),
      });
    };
  }

  function makeEffortSuggest(effort: DINEffort) {
    return async (userPrompt?: string) => {
      const domainLabels: Record<string, string> = {
        mens: "Mens",
        processen: "Processen",
        data_systemen: "Data & Systemen",
        cultuur: "Cultuur",
      };
      return fetchAISuggestion("inspanning", {
        existingTitle: effort.title || undefined,
        existingDescription: effort.description || undefined,
        existingOwner: effort.dossier?.eigenaar || undefined,
        existingDossierEigenaar: effort.dossier?.eigenaar || undefined,
        existingQuarter: effort.quarter || undefined,
        existingInspanningsleider: effort.dossier?.inspanningsleider || undefined,
        existingVerwachtResultaat: effort.dossier?.verwachtResultaat || undefined,
        existingKostenraming: effort.dossier?.kostenraming || undefined,
        existingRandvoorwaarden: effort.dossier?.randvoorwaarden || undefined,
        domain: domainLabels[effort.domain] || effort.domain,
        userPrompt: userPrompt || undefined,
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.title || c.description)
          .map((c) => c.title || c.description),
      });
    };
  }

  // --- AI volledig DIN genereren ---
  async function handleAIGenerate(extraFeedback?: string) {
    if (!selectedGoal) return;
    setIsGenerating(true);
    setAiError(null);
    setAiRetryable(false);
    try {
      const goal = session!.goals.find((g) => g.id === selectedGoal);
      const requestBody: Record<string, unknown> = {
        goal,
        sectorPlan,
        sector: activeSector,
        allGoals: session!.goals.map((g) => ({ name: g.name, description: g.description })),
        sectorAnalysis: session!.sectorAnalyses?.[activeSector] || null,
        kibGoals: session!.goals,
        kibScope: session!.scope,
        completedGoalItems: buildCompletedGoalItemsForAPI(),
      };
      if (extraFeedback) {
        requestBody.userFeedback = extraFeedback;
      }
      const res = await fetch("/api/din-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (data.retryable) {
        setAiRetryable(true);
        setAiError(data.error || "DIN-generatie mislukt. Probeer het opnieuw met extra instructies.");
      } else if (data.success && data.data) {
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
        // Baten → Vermogens: ALLEEN nieuwe baten koppelen aan nieuwe vermogens
        // (voorkomt massale ongewenste koppelingen bij hergeneratie)
        const newBenCapMaps = newBenefits.flatMap((b: DINBenefit) =>
          newCaps.map((c: DINCapability) => ({
            benefitId: b.id,
            capabilityId: c.id,
          }))
        );
        // Vermogens → Inspanningen: ALLEEN nieuwe vermogens koppelen aan nieuwe inspanningen
        const newCapEffMaps = newCaps.flatMap((c: DINCapability) =>
          newEfforts.map((e: DINEffort) => ({
            capabilityId: c.id,
            effortId: e.id,
          }))
        );

        updateSession(prev => ({
          benefits: [...prev.benefits, ...newBenefits],
          capabilities: [...prev.capabilities, ...newCaps],
          efforts: [...prev.efforts, ...newEfforts],
          goalBenefitMaps: [...prev.goalBenefitMaps, ...newGoalBenefitMaps],
          benefitCapabilityMaps: [...prev.benefitCapabilityMaps, ...newBenCapMaps],
          capabilityEffortMaps: [...prev.capabilityEffortMaps, ...newCapEffMaps],
        }));

        // Store corrections from API post-validation
        if (data.corrections) {
          const bCorr: Record<string, ValidationCorrection[]> = {};
          newBenefits.forEach((b: DINBenefit, i: number) => {
            if (data.corrections.benefits?.[i]?.length) {
              bCorr[b.id] = data.corrections.benefits[i];
            }
          });
          const cCorr: Record<string, ValidationCorrection[]> = {};
          newCaps.forEach((c: DINCapability, i: number) => {
            if (data.corrections.capabilities?.[i]?.length) {
              cCorr[c.id] = data.corrections.capabilities[i];
            }
          });
          const eCorr: Record<string, ValidationCorrection[]> = {};
          newEfforts.forEach((e: DINEffort, i: number) => {
            if (data.corrections.efforts?.[i]?.length) {
              eCorr[e.id] = data.corrections.efforts[i];
            }
          });
          setBenefitCorrections(prev => ({ ...prev, ...bCorr }));
          setCapabilityCorrections(prev => ({ ...prev, ...cCorr }));
          setEffortCorrections(prev => ({ ...prev, ...eCorr }));
        }
      }
    } catch (e) {
      console.error("AI generatie mislukt:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Verrijkt sectorplan genereren ---
  async function handleGenerateVerrijktPlan() {
    setIsGeneratingPlan(true);
    try {
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
          externalProjects: (session!.externalProjects || []).filter((p) => p.sectorId === activeSector),
          kibGoals: session!.goals,
          kibScope: session!.scope,
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

  // --- Undo handler ---
  function handleUndo() {
    if (!deletedItem) return;
    const { type, item, maps } = deletedItem;
    if (type === "baat") {
      updateSession(prev => ({
        benefits: [...prev.benefits, item as DINBenefit],
        goalBenefitMaps: [...prev.goalBenefitMaps, ...(maps.goalBenefitMaps || [])],
      }));
    } else if (type === "vermogen") {
      updateSession(prev => ({
        capabilities: [...prev.capabilities, item as DINCapability],
        benefitCapabilityMaps: [...prev.benefitCapabilityMaps, ...(maps.benefitCapabilityMaps || [])],
      }));
    } else if (type === "inspanning") {
      updateSession(prev => ({
        efforts: [...prev.efforts, item as DINEffort],
        capabilityEffortMaps: [...prev.capabilityEffortMaps, ...(maps.capabilityEffortMaps || [])],
      }));
    }
    dismissUndo();
  }

  const deletedItemLabel = deletedItem
    ? deletedItem.type === "baat"
      ? `Baat "${(deletedItem.item as DINBenefit).title || (deletedItem.item as DINBenefit).description || "(naamloos)"}"`
      : deletedItem.type === "vermogen"
      ? `Vermogen "${(deletedItem.item as DINCapability).title || (deletedItem.item as DINCapability).description || "(naamloos)"}"`
      : `Inspanning "${(deletedItem.item as DINEffort).title || (deletedItem.item as DINEffort).description || "(naamloos)"}"`
    : "";

  // Doel status badge (per D-10, D-11, D-12)
  function GoalStatusBadge({ goalId }: { goalId: string }) {
    const completion = getGoalCompletionStatus(session!, goalId);

    if (completion.status === "afgerond") {
      return <span className="ml-1 text-green-500 text-xs" title="Afgerond">&#10003;</span>;
    }

    if (completion.status === "bezig") {
      return (
        <span className="ml-1 text-[10px] inline-flex gap-1">
          {SECTORS.map(s => (
            <span
              key={s}
              className={completion.sectorStatuses[s]?.isComplete ? "text-green-600" : "text-gray-300"}
            >
              {s === "Zakelijk" ? "Za" : s}{completion.sectorStatuses[s]?.isComplete ? "+" : "-"}
            </span>
          ))}
        </span>
      );
    }

    // niet-begonnen
    return <span className="ml-1 text-gray-300 text-xs">&#9675;</span>;
  }

  return (
    <div className="space-y-4">
      {/* Undo toast */}
      {deletedItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-lg animate-slide-in-right">
          <span className="text-sm">{deletedItemLabel} verwijderd</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-cito-accent hover:text-white bg-white/10 px-3 py-1 rounded-lg transition-colors"
          >
            Terughalen
          </button>
          <button
            onClick={dismissUndo}
            className="text-gray-400 hover:text-white text-xs ml-1"
          >
            &#10005;
          </button>
        </div>
      )}

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

      <DINChainIndicator />

      {/* Consolidatie-overzicht: voorheen → nu, na cross-analyse */}
      <ConsolidatieOverzicht session={session} />

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
              Doelen-Inspanningennetwerk: {activeSector}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Redeneer via de hoe-vraag: Welke <strong className="text-din-baten">baten</strong> (effecten) levert dit doel op?
              Welke <strong className="text-din-vermogens">vermogens</strong> zijn nodig? Welke <strong className="text-din-inspanningen">inspanningen</strong> bouwen die op?
            </div>
          </div>

          <div className="flex gap-6 min-w-0">
            {/* Doelen sidebar */}
            <div className="w-56 shrink-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Doelen
              </h4>
              <div className="space-y-1">
                {session.goals
                  .sort((a, b) => a.rank - b.rank)
                  .map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setActiveGoalId(goal.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        selectedGoal === goal.id
                          ? "bg-cito-blue text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="truncate">{goal.rank}. {goal.name}</span>
                      <GoalStatusBadge goalId={goal.id} />
                    </button>
                  ))}
              </div>

              {/* Doel afronden knop (per D-02, D-04) */}
              {selectedGoal && (() => {
                const completion = getGoalCompletionStatus(session!, selectedGoal);
                const isCompleted = completion.isManuallyCompleted;

                if (isCompleted) {
                  // Afgerond: toon status + opheffen link (per UI-SPEC)
                  return (
                    <div className="mt-3">
                      <div className="text-xs text-green-600">Dit doel is afgerond</div>
                      <button
                        onClick={() => {
                          updateSession(prev => ({
                            completedGoals: (prev.completedGoals ?? []).filter(id => id !== selectedGoal),
                          }));
                        }}
                        className="text-xs text-cito-blue hover:underline cursor-pointer mt-0.5"
                      >
                        Markering opheffen
                      </button>
                    </div>
                  );
                }

                // Check alle sectoren
                const allMissing: string[] = [];
                for (const sector of SECTORS) {
                  const sectorStatus = completion.sectorStatuses[sector];
                  if (sectorStatus && !sectorStatus.isComplete) {
                    allMissing.push(`${sector}: ${sectorStatus.missing.join(", ")}`);
                  }
                }

                const canComplete = completion.isComplete && !isGenerating;

                return (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        // Markeer doel als afgerond (per D-05)
                        updateSession(prev => ({
                          completedGoals: [...(prev.completedGoals ?? []), selectedGoal!],
                        }));
                        // Auto-advance naar volgend onafgerond doel (per D-01)
                        setTimeout(() => {
                          const nextGoal = session!.goals
                            .sort((a, b) => a.rank - b.rank)
                            .find(g => !(session!.completedGoals ?? []).includes(g.id) && g.id !== selectedGoal);
                          if (nextGoal) {
                            setActiveGoalId(nextGoal.id);
                          }
                          // Als alle doelen afgerond: blijf op huidige
                        }, 300);
                      }}
                      disabled={!canComplete}
                      className={`w-full px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        canComplete
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isGenerating ? "Bezig met genereren..." : "Doel afronden"}
                    </button>
                    {allMissing.length > 0 && !isGenerating && (
                      <div className="mt-1 space-y-0.5">
                        {allMissing.map((line, i) => (
                          <div key={i} className="text-xs text-gray-500">{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* DIN Editor */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* AI knoppen */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleAIGenerate()}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isGenerating
                    ? "Genereren..."
                    : "AI: Genereer DIN-netwerk"}
                </button>
              </div>

              {/* AI foutmelding met retryable feedback */}
              {aiError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <p className="font-medium">AI-actie mislukt</p>
                  <p className="text-red-600 mt-0.5">{aiError}</p>
                  {aiRetryable && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Geef extra instructies mee voor een nieuwe poging
                      </label>
                      <textarea
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-2 text-sm"
                        rows={3}
                        placeholder="Bijv. 'Focus op meetbare indicatoren' of 'Houd het korter'"
                      />
                      <button
                        onClick={() => handleAIGenerate(userFeedback)}
                        disabled={isGenerating}
                        className="rounded-md bg-[#003366] px-4 py-2 text-sm text-white hover:bg-[#002244] disabled:opacity-50"
                      >
                        Opnieuw proberen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Suggestiepaneel uit sectorwerk-analyse (D-03) */}
              {selectedGoal && (() => {
                const analysis = session!.sectorAnalyses?.[activeSector];
                if (!analysis || typeof analysis === "string") return null;
                return (
                  <SectorwerkSuggestiePanel
                    analysis={analysis}
                    activeSector={activeSector as SectorName}
                    selectedGoal={selectedGoal}
                    existingBenefits={sectorBenefits}
                    onAdopt={(text) => adoptSuggestie(text)}
                    onAdoptAll={adoptAllSuggesties}
                  />
                );
              })()}

              {/* ===== BAAT-CENTRISCH DIN-NETWERK ===== */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-din-baten rounded-full" />
                    <h4 className="text-sm font-semibold text-din-baten">
                      Doelen-Inspanningennetwerk ({sectorBenefits.length} baten)
                    </h4>
                  </div>
                  <button
                    onClick={addBenefit}
                    className="text-xs px-3 py-1.5 bg-din-baten/10 text-din-baten rounded-lg hover:bg-din-baten/20 font-medium transition-colors"
                  >
                    + Baat toevoegen
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mb-3 ml-4">
                  Werk per baat het DIN-netwerk uit via de hoe-vraag: Welke vermogens zijn nodig? Welke inspanningen bouwen die op?
                </p>

                {sectorBenefits.length === 0 && (
                  <p className="text-sm text-gray-400 italic ml-4">
                    Nog geen baten. Voeg ze toe of laat AI genereren.
                  </p>
                )}

                {/* === Per baat: baat → vermogens → inspanningen === */}
                <div className="space-y-3">
                  {sectorBenefits.map((benefit, bIdx) => {
                    const capsForBenefit = getCapabilitiesForBenefit(benefit.id);
                    const isBaatExpanded = expandedBenefits.has(benefit.id);
                    const totalEfforts = capsForBenefit.reduce((sum, c) => sum + getEffortsForCapability(c.id).length, 0);

                    return (
                      <div key={benefit.id} className="border border-din-baten/30 rounded-xl overflow-hidden bg-white shadow-sm">
                        {/* BAAT COMPACT HEADER */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-din-baten/[0.04] transition-colors"
                          onClick={() => toggleExpandedBenefit(benefit.id)}
                        >
                          <span className="w-7 h-7 rounded-lg bg-din-baten/10 text-din-baten font-bold text-xs flex items-center justify-center shrink-0">
                            B{bIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-700 truncate block">
                              {benefit.title || benefit.description || "Nieuwe baat..."}
                            </span>
                            {benefit.title && benefit.description && (
                              <span className="text-[10px] text-gray-400 truncate block">
                                {benefit.description.slice(0, 80)}{benefit.description.length > 80 ? "\u2026" : ""}
                              </span>
                            )}
                            {benefit.profiel?.indicator && (
                              <span className="text-[10px] text-gray-400 truncate block">
                                KPI: {benefit.profiel.indicator}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] px-2 py-0.5 bg-din-vermogens/10 text-din-vermogens rounded-full">
                              {capsForBenefit.length} verm.
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-din-inspanningen/10 text-din-inspanningen rounded-full">
                              {totalEfforts} insp.
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{isBaatExpanded ? "\u25B2" : "\u25BC"}</span>
                        </div>

                        {/* BAAT EXPANDED */}
                        {isBaatExpanded && (
                          <div className="border-t border-din-baten/10">
                            {/* BenefitCard */}
                            <div className="p-3 bg-din-baten/[0.02]">
                              <BenefitCard
                                benefit={benefit}
                                onChange={updateBenefit}
                                onDelete={() => deleteBenefit(benefit.id)}
                                onAISuggest={makeBenefitSuggest(benefit)}
                                corrections={benefitCorrections[benefit.id]}
                              />
                            </div>

                            {/* VERMOGENS voor deze baat */}
                            <div className="px-4 pb-4 pt-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-1 h-4 bg-din-vermogens rounded-full" />
                                  <span className="text-xs font-semibold text-din-vermogens">
                                    Vermogens ({capsForBenefit.length})
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); addCapability(benefit.id); }}
                                  className="text-[11px] px-2.5 py-1 bg-din-vermogens/10 text-din-vermogens rounded-lg hover:bg-din-vermogens/20 font-medium transition-colors"
                                >
                                  + Vermogen
                                </button>
                              </div>

                              {capsForBenefit.length === 0 && (
                                <p className="text-xs text-gray-400 italic ml-3 mb-2">
                                  Welke vermogens zijn nodig om deze baat te realiseren?
                                </p>
                              )}

                              <div className="space-y-3 ml-3 border-l-2 border-din-vermogens/15 pl-4">
                                {capsForBenefit.map((cap) => {
                                  const effortsForCap = getEffortsForCapability(cap.id);
                                  const isCapExpanded = expandedCapability === cap.id;
                                  const otherBaten = getBenefitsForCapability(cap.id).filter((b) => b.id !== benefit.id);

                                  return (
                                    <div key={cap.id} className="border border-din-vermogens/20 rounded-lg overflow-hidden bg-white">
                                      {/* VERMOGEN HEADER */}
                                      <div
                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-din-vermogens/[0.04] transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setExpandedCapability(isCapExpanded ? null : cap.id); }}
                                      >
                                        <span className="w-5 h-5 rounded bg-din-vermogens/10 text-din-vermogens font-bold text-[10px] flex items-center justify-center shrink-0">
                                          V{allSectorCaps.indexOf(cap) + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 flex-1 truncate min-w-0">
                                          {cap.title || cap.description || "(naamloos vermogen)"}
                                        </span>
                                        {(cap.currentLevel || cap.targetLevel) && (
                                          <span className="text-[10px] text-gray-400 shrink-0">
                                            {cap.currentLevel || "?"}/5 {"\u2192"} {cap.targetLevel || "?"}/5
                                          </span>
                                        )}
                                        {otherBaten.length > 0 && (
                                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full shrink-0" title={`Gedeeld met: ${otherBaten.map((b) => b.title || b.description || "(naamloos)").join(", ")}`}>
                                            gedeeld ({otherBaten.length + 1})
                                          </span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.5 bg-din-inspanningen/10 text-din-inspanningen rounded-full shrink-0">
                                          {effortsForCap.length} insp.
                                        </span>
                                        <span className="text-xs text-gray-400 shrink-0">{isCapExpanded ? "\u25B2" : "\u25BC"}</span>
                                      </div>

                                      {/* VERMOGEN EXPANDED */}
                                      {isCapExpanded && (
                                        <div className="border-t border-din-vermogens/10 p-3 space-y-3">
                                          <CapabilityCard
                                            capability={cap}
                                            onChange={updateCapability}
                                            onDelete={() => deleteCapability(cap.id)}
                                            onAISuggest={makeCapabilitySuggest(cap)}
                                            sharedWithBenefits={otherBaten.map((b) => b.title || b.description || "(naamloos)")}
                                            corrections={capabilityCorrections[cap.id]}
                                          />
                                          <div className="border-t border-gray-100 pt-3">
                                            <div className="text-xs font-semibold text-gray-600 mb-2">Koppel aan baten:</div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {sectorBenefits.map((b, bI) => {
                                                const isLinked = session!.benefitCapabilityMaps.some(
                                                  (m) => m.benefitId === b.id && m.capabilityId === cap.id
                                                );
                                                return (
                                                  <button
                                                    key={b.id}
                                                    onClick={() => toggleCapBenefitLink(cap.id, b.id)}
                                                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                                                      isLinked
                                                        ? "bg-din-baten text-white"
                                                        : "bg-gray-100 text-gray-500 hover:bg-din-baten/20 hover:text-din-baten"
                                                    }`}
                                                    title={isLinked ? "Klik om te ontkoppelen" : "Klik om te koppelen"}
                                                  >
                                                    B{bI + 1}: {(b.title || b.description || "(naamloos)").slice(0, 35)}{(b.title || b.description || "").length > 35 ? "\u2026" : ""}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* INSPANNINGEN voor dit vermogen */}
                                      <div className="border-t border-din-vermogens/10 px-3 pb-3 pt-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-[10px] font-semibold text-din-inspanningen flex items-center gap-1">
                                            <span className="w-1 h-3 bg-din-inspanningen rounded-full" />
                                            Inspanningen ({effortsForCap.length})
                                          </span>
                                        </div>

                                        <div className="space-y-1.5 ml-2 border-l-2 border-din-inspanningen/15 pl-3">
                                          {effortsForCap.map((effort) => {
                                            const isExpEff = expandedEffort === effort.id;
                                            return (
                                              <div key={effort.id} className="border border-din-inspanningen/15 rounded-lg overflow-hidden bg-white">
                                                <div
                                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-din-inspanningen/[0.04] transition-colors"
                                                  onClick={(e) => { e.stopPropagation(); setExpandedEffort(isExpEff ? null : effort.id); }}
                                                >
                                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOMAIN_DOT_COLORS[effort.domain]}`} />
                                                  <span className="text-sm text-gray-700 flex-1 truncate min-w-0">
                                                    {effort.title || effort.description || "(naamloos)"}
                                                  </span>
                                                  {effort.quarter && (
                                                    <span className="text-[10px] text-gray-400 shrink-0">{effort.quarter}</span>
                                                  )}
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                                    STATUS_OPTIONS.find((s) => s.key === effort.status)?.color || "bg-gray-100 text-gray-600"
                                                  }`}>
                                                    {STATUS_OPTIONS.find((s) => s.key === effort.status)?.label || effort.status}
                                                  </span>
                                                  <span className="text-xs text-gray-400 shrink-0">{isExpEff ? "\u25B2" : "\u25BC"}</span>
                                                </div>

                                                {isExpEff && (
                                                  <div className="border-t border-din-inspanningen/10 p-3 space-y-3">
                                                    <EffortCard
                                                      effort={effort}
                                                      onChange={updateEffort}
                                                      onDelete={() => deleteEffort(effort.id)}
                                                      onAISuggest={makeEffortSuggest(effort)}
                                                      corrections={effortCorrections[effort.id]}
                                                    />
                                                    <div className="border-t border-gray-100 pt-3">
                                                      <div className="text-xs font-semibold text-gray-600 mb-2">Koppel aan vermogens:</div>
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {allSectorCaps.map((c, cI) => {
                                                          const isLinked = session!.capabilityEffortMaps.some(
                                                            (m) => m.effortId === effort.id && m.capabilityId === c.id
                                                          );
                                                          return (
                                                            <button
                                                              key={c.id}
                                                              onClick={() => toggleEffortCapLink(effort.id, c.id)}
                                                              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                                                                isLinked
                                                                  ? "bg-din-vermogens text-white"
                                                                  : "bg-gray-100 text-gray-500 hover:bg-din-vermogens/20 hover:text-din-vermogens"
                                                              }`}
                                                              title={isLinked ? "Klik om te ontkoppelen" : "Klik om te koppelen"}
                                                            >
                                                              V{cI + 1}: {(c.title || c.description || "(naamloos)").slice(0, 30)}{(c.title || c.description || "").length > 30 ? "\u2026" : ""}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Add inspanning — slimme domeinherkenning */}
                                        <div className="flex gap-1.5 mt-2 ml-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); addEffort(undefined, cap.id, benefit.id, selectedGoal || undefined); }}
                                            className="text-[10px] px-3 py-1.5 rounded-md border border-dashed font-medium transition-colors bg-din-inspanningen/5 hover:bg-din-inspanningen/15 border-din-inspanningen/30 text-din-inspanningen hover:text-din-inspanningen flex items-center gap-1.5"
                                          >
                                            <span className="w-1.5 h-1.5 rounded-full bg-din-inspanningen" />
                                            + Inspanning toevoegen
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* + Baat toevoegen onderaan */}
                <button
                  onClick={addBenefit}
                  className="w-full mt-3 py-3 text-sm font-medium text-din-baten border-2 border-dashed border-din-baten/30 rounded-xl hover:bg-din-baten/5 hover:border-din-baten/50 transition-colors"
                >
                  + Baat toevoegen
                </button>

                {/* === CREATIE WIZARD === */}
                {wizardState && (
                  <div className="mt-4">
                    <DINCreatieWizard
                      key={`${wizardState.type}-${wizardState.parentGoalId}-${wizardState.parentBenefitId}-${wizardState.parentCapabilityId}-${wizardState.domain}-${wizardState._ts}`}
                      type={wizardState.type}
                      sectorId={activeSector}
                      parentGoal={wizardState.parentGoalId ? session.goals.find((g) => g.id === wizardState.parentGoalId) : undefined}
                      parentBenefit={wizardState.parentBenefitId ? session.benefits.find((b) => b.id === wizardState.parentBenefitId) : undefined}
                      parentCapability={wizardState.parentCapabilityId ? session.capabilities.find((c) => c.id === wizardState.parentCapabilityId) : undefined}
                      domain={wizardState.domain}
                      sectorPlanText={sectorPlan?.rawText}
                      onGenerate={handleWizardResult}
                      onCancel={() => setWizardState(null)}
                      onManual={() => {
                        if (wizardState.type === "baat") addBenefitManual();
                        else if (wizardState.type === "vermogen") addCapabilityManual(wizardState.parentBenefitId);
                        else addEffortManual(wizardState.domain || "mens", wizardState.parentCapabilityId);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* === NIET-GEKOPPELDE ITEMS === */}
              {(() => {
                const unlinkedCaps = getUnlinkedCapabilities();
                const unlinkedEfforts = getUnlinkedEfforts();
                if (unlinkedCaps.length === 0 && unlinkedEfforts.length === 0) return null;

                return (
                  <div className="border border-amber-200 rounded-xl bg-amber-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-100/50 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 text-sm">{"\u26A0"}</span>
                        <span className="text-sm font-semibold text-amber-700">Niet-gekoppelde items</span>
                        <span className="text-[10px] text-amber-500">
                          ({unlinkedCaps.length} vermogens, {unlinkedEfforts.length} inspanningen)
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1 ml-6">
                        Deze items zijn nog niet gekoppeld aan een baat. Klik om te bewerken en te koppelen.
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      {unlinkedCaps.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-din-vermogens mb-2">Vermogens zonder baat ({unlinkedCaps.length})</div>
                          <div className="space-y-2">
                            {unlinkedCaps.map((cap) => {
                              const isExpanded = expandedCapability === cap.id;
                              return (
                                <div key={cap.id} className="border border-din-vermogens/20 rounded-lg overflow-hidden bg-white">
                                  <div
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-din-vermogens/[0.04]"
                                    onClick={() => setExpandedCapability(isExpanded ? null : cap.id)}
                                  >
                                    <span className="w-5 h-5 rounded bg-din-vermogens/10 text-din-vermogens font-bold text-[10px] flex items-center justify-center shrink-0">
                                      V{allSectorCaps.indexOf(cap) + 1}
                                    </span>
                                    <span className="text-sm text-gray-700 flex-1 truncate">{cap.title || cap.description || "(naamloos)"}</span>
                                    <span className="text-xs text-gray-400">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                                  </div>
                                  {isExpanded && (
                                    <div className="border-t border-din-vermogens/10 p-3 space-y-3">
                                      <CapabilityCard
                                        capability={cap}
                                        onChange={updateCapability}
                                        onDelete={() => deleteCapability(cap.id)}
                                        onAISuggest={makeCapabilitySuggest(cap)}
                                        corrections={capabilityCorrections[cap.id]}
                                      />
                                      <div className="border-t border-gray-100 pt-3">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Koppel aan baten:</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {sectorBenefits.map((b, bI) => {
                                            const isLinked = session!.benefitCapabilityMaps.some(
                                              (m) => m.benefitId === b.id && m.capabilityId === cap.id
                                            );
                                            return (
                                              <button
                                                key={b.id}
                                                onClick={() => toggleCapBenefitLink(cap.id, b.id)}
                                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                                                  isLinked
                                                    ? "bg-din-baten text-white"
                                                    : "bg-gray-100 text-gray-500 hover:bg-din-baten/20 hover:text-din-baten"
                                                }`}
                                              >
                                                B{bI + 1}: {(b.title || b.description || "(naamloos)").slice(0, 35)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {unlinkedEfforts.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-din-inspanningen mb-2">Inspanningen zonder vermogen ({unlinkedEfforts.length})</div>
                          <div className="space-y-2">
                            {unlinkedEfforts.map((effort) => {
                              const isExpEff = expandedEffort === effort.id;
                              return (
                                <div key={effort.id} className="border border-din-inspanningen/15 rounded-lg overflow-hidden bg-white">
                                  <div
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-din-inspanningen/[0.04]"
                                    onClick={() => setExpandedEffort(isExpEff ? null : effort.id)}
                                  >
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOMAIN_DOT_COLORS[effort.domain]}`} />
                                    <span className="text-sm text-gray-700 flex-1 truncate">{effort.title || effort.description || "(naamloos)"}</span>
                                    {effort.quarter && <span className="text-[10px] text-gray-400 shrink-0">{effort.quarter}</span>}
                                    <span className="text-xs text-gray-400">{isExpEff ? "\u25B2" : "\u25BC"}</span>
                                  </div>
                                  {isExpEff && (
                                    <div className="border-t border-din-inspanningen/10 p-3 space-y-3">
                                      <EffortCard
                                        effort={effort}
                                        onChange={updateEffort}
                                        onDelete={() => deleteEffort(effort.id)}
                                        onAISuggest={makeEffortSuggest(effort)}
                                        corrections={effortCorrections[effort.id]}
                                      />
                                      <div className="border-t border-gray-100 pt-3">
                                        <div className="text-xs font-semibold text-gray-600 mb-2">Koppel aan vermogens:</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {allSectorCaps.map((c, cI) => {
                                            const isLinked = session!.capabilityEffortMaps.some(
                                              (m) => m.effortId === effort.id && m.capabilityId === c.id
                                            );
                                            return (
                                              <button
                                                key={c.id}
                                                onClick={() => toggleEffortCapLink(effort.id, c.id)}
                                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                                                  isLinked
                                                    ? "bg-din-vermogens text-white"
                                                    : "bg-gray-100 text-gray-500 hover:bg-din-vermogens/20 hover:text-din-vermogens"
                                                }`}
                                              >
                                                V{cI + 1}: {(c.title || c.description || "(naamloos)").slice(0, 30)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Lopende projecten gekoppeld aan vermogens (per D-12) */}
              {(session.externalProjects || [])
                .filter(p => p.sectorId === activeSector && !p.buitenScope && (session.projectCapabilityMaps || []).some(m => m.projectId === p.id))
                .length > 0 && (
                <div className="space-y-2 mt-3">
                  <span className="text-xs font-semibold text-gray-500">Lopende projecten in DIN-netwerk</span>
                  {(session.externalProjects || [])
                    .filter(p => p.sectorId === activeSector && !p.buitenScope && (session.projectCapabilityMaps || []).some(m => m.projectId === p.id))
                    .map(project => (
                      <div key={`proj-${project.id}`} className="group p-3 bg-white border border-gray-200 rounded-lg border-l-[3px] border-l-[#0066cc]">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">{project.name}</span>
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Lopend project</span>
                            </div>
                            {project.description && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</div>
                            )}
                            {project.domains && project.domains.length > 0 && (
                              <div className="flex gap-1 mt-1.5">
                                {project.domains.map(d => (
                                  <span key={d} className={`px-1.5 py-0.5 text-[10px] rounded-full ${getDomainChipStyle(d)}`}>
                                    {DOMAIN_LABELS[d]}
                                  </span>
                                ))}
                              </div>
                            )}
                            {(() => {
                              const linked = getLinkedCapabilities(project.id, session.projectCapabilityMaps || [], session.capabilities || []);
                              return linked.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  <span className="text-[10px] text-gray-400">Gekoppeld aan:</span>
                                  {linked.map(cap => (
                                    <span key={cap.id} className="px-1.5 py-0.5 text-[10px] rounded bg-[#0891b2]/10 text-[#0891b2]">
                                      {cap.description.slice(0, 50)}{cap.description.length > 50 ? "..." : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Lopende projecten — AI import + review + management */}
              <ExterneProjectenPanel
                currentSector={activeSector}
                projects={(session.externalProjects || []).filter((p) => p.sectorId === activeSector && !p.promotedAt)}
                promotedProjects={(session.externalProjects || []).filter((p) => p.sectorId === activeSector && !!p.promotedAt)}
                onAddProjects={(newProjects) => {
                  updateSession(prev => ({
                    externalProjects: [
                      ...(prev.externalProjects || []),
                      ...newProjects,
                    ],
                  }));
                }}
                onUpdate={(updated) => {
                  updateSession(prev => ({
                    externalProjects: (prev.externalProjects || []).map((p) =>
                      p.id === updated.id ? updated : p
                    ),
                  }));
                }}
                onDelete={(id) => {
                  updateSession(prev => ({
                    externalProjects: (prev.externalProjects || []).filter((p) => p.id !== id),
                  }));
                }}
                capabilities={(session.capabilities || []).filter(c => c.sectorId === activeSector && !c.consolidated)}
                existingMaps={session.projectCapabilityMaps || []}
                onConfirmMappings={(newMaps) => {
                  updateSession(prev => ({
                    projectCapabilityMaps: [
                      ...(prev.projectCapabilityMaps || []).filter(m =>
                        !newMaps.some(nm => nm.projectId === m.projectId)
                      ),
                      ...newMaps,
                    ],
                  }));
                }}
              />
            </div>
          </div>
      {/* Bijgewerkt sectorplan resultaat */}
      {verrijktSectorplan[activeSector] && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() =>
              setVerrijktSectorplan((prev) => {
                const next = { ...prev };
                delete next[activeSector];
                return next;
              })
            }
          />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="text-base font-semibold text-cito-blue">
                Bijgewerkt sectorplan: {activeSector}
              </h3>
              <button
                onClick={() =>
                  setVerrijktSectorplan((prev) => {
                    const next = { ...prev };
                    delete next[activeSector];
                    return next;
                  })
                }
                className="p-1 text-gray-400 hover:text-gray-600 text-lg"
              >
                {"\u2715"}
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-white p-5 rounded-lg border border-gray-200 max-h-[60vh] overflow-y-auto">
                <MarkdownContent content={verrijktSectorplan[activeSector]} />
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
          </div>
        </div>
      )}
    </div>
  );
}
