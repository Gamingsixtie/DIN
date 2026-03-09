"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  SectorName,
} from "@/lib/types";
import { SECTORS } from "@/lib/types";
import {
  createBenefit,
  createCapability,
  createEffort,
  getBenefitsByGoalAndSector,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import DINChainIndicator from "@/components/din/DINChainIndicator";
import MergedDINView from "@/components/din/MergedDINView";

type DINPhase = "per-sector" | "samengevoegd";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

export default function DINMappingStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [phase, setPhase] = useState<DINPhase>("per-sector");
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
  const sectorCapabilities = session.capabilities.filter(
    (c) => c.sectorId === activeSector
  );
  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === activeSector
  );

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
    updateSession({ capabilities: [...session!.capabilities, newCap] });
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
    updateSession({ efforts: [...session!.efforts, newEffort] });
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
        body: JSON.stringify({ goal, sectorPlan, sector: activeSector }),
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
        updateSession({
          benefits: [...session!.benefits, ...newBenefits],
          capabilities: [...session!.capabilities, ...newCaps],
          efforts: [...session!.efforts, ...newEfforts],
          goalBenefitMaps: [
            ...session!.goalBenefitMaps,
            ...newBenefits.map((b: DINBenefit) => ({
              goalId: selectedGoal,
              benefitId: b.id,
            })),
          ],
        });
      }
    } catch (e) {
      console.error("AI generatie mislukt:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
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
              {/* AI genereer knop */}
              <div className="flex justify-end">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isGenerating
                    ? "Genereren..."
                    : "AI: Genereer DIN-netwerk"}
                </button>
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
                <div className="grid grid-cols-2 gap-4">
                  {DOMAINS.map((domain) => {
                    const domainEfforts = sectorEfforts.filter(
                      (e) => e.domain === domain.key
                    );
                    return (
                      <div key={domain.key} className="space-y-2">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
