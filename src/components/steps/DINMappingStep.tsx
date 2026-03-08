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
import SectorTabs from "@/components/din/SectorTabs";
import BenefitCard from "@/components/din/BenefitCard";
import EffortCard from "@/components/din/EffortCard";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

export default function DINMappingStep() {
  const { session, updateSession } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!session) return null;

  if (session.goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Geen doelen beschikbaar. Importeer eerst KiB-data in stap 1.
        </p>
      </div>
    );
  }

  const selectedGoal = activeGoalId || session.goals[0]?.id;

  // Filter op huidige doel + sector
  const sectorBenefits = getBenefitsByGoalAndSector(
    session.benefits,
    selectedGoal,
    activeSector
  );
  const sectorCapabilities = session.capabilities.filter(
    (c) => c.sectorId === activeSector
  );
  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === activeSector
  );

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
    updateSession({
      capabilities: [...session!.capabilities, newCap],
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
    updateSession({
      efforts: [...session!.efforts, newEffort],
    });
  }

  async function handleAIGenerate() {
    setIsGenerating(true);
    try {
      const goal = session!.goals.find((g) => g.id === selectedGoal);
      const sectorPlan = session!.sectorPlans.find(
        (s) => s.sectorName === activeSector
      );
      const res = await fetch("/api/din-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, sectorPlan, sector: activeSector }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Merge AI-gegenereerde items met bestaande
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
    <div>
      {/* Sector tabs */}
      <SectorTabs
        activeSector={activeSector}
        onSelect={setActiveSector}
        sectorPlans={session.sectorPlans}
      />

      <div className="flex gap-6">
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
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedGoal === goal.id
                      ? "bg-cito-blue text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {goal.rank}. {goal.name}
                </button>
              ))}
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-din-baten">
                Baten — welke effecten willen we bereiken?
              </h4>
              <button
                onClick={addBenefit}
                className="text-xs text-cito-blue hover:underline"
              >
                + Baat toevoegen
              </button>
            </div>
            <div className="space-y-2">
              {sectorBenefits.map((b) => (
                <BenefitCard
                  key={b.id}
                  benefit={b}
                  onChange={updateBenefit}
                  onDelete={() => deleteBenefit(b.id)}
                />
              ))}
              {sectorBenefits.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  Nog geen baten voor {activeSector}. Voeg ze toe of laat AI
                  genereren.
                </p>
              )}
            </div>
          </div>

          {/* Vermogens */}
          <div>
            <div className="flex items-center justify-between mb-2">
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
            <div className="space-y-2">
              {sectorCapabilities.map((c) => (
                <div
                  key={c.id}
                  className="border border-cyan-200 rounded-lg p-3 bg-cyan-50/50 flex items-start gap-2"
                >
                  <input
                    value={c.description}
                    onChange={(e) =>
                      updateCapability({ ...c, description: e.target.value })
                    }
                    className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none"
                    placeholder="Beschrijf het vermogen..."
                  />
                  <button
                    onClick={() => deleteCapability(c.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
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
            <h4 className="text-sm font-semibold text-din-inspanningen mb-2">
              Inspanningen — wat moet {activeSector} doen?
            </h4>
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
    </div>
  );
}
