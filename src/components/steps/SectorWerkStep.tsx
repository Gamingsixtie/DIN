"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  SectorName,
  SectorPlan,
} from "@/lib/types";
import { SECTORS } from "@/lib/types";
import {
  generateId,
  createBenefit,
  createCapability,
  createEffort,
  getBenefitsByGoalAndSector,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import DINChainIndicator from "@/components/din/DINChainIndicator";

type SectorSubStep = "sectorplan" | "din-mapping" | "integratie";

const SUB_STEPS: { key: SectorSubStep; label: string; nummer: number }[] = [
  { key: "sectorplan", label: "Sectorplan", nummer: 1 },
  { key: "din-mapping", label: "DIN-Mapping", nummer: 2 },
  { key: "integratie", label: "Integratie-advies", nummer: 3 },
];

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

export default function SectorWerkStep() {
  const { session, updateSession } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [subStep, setSubStep] = useState<SectorSubStep>("sectorplan");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<Record<string, string>>({});
  const [planAnalysis, setPlanAnalysis] = useState<Record<string, string>>({});

  if (!session) return null;

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );
  const selectedGoal = activeGoalId || session.goals[0]?.id;
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
    const hasPlan = session!.sectorPlans.some((s) => s.sectorName === sector);
    const hasDIN =
      session!.benefits.some((b) => b.sectorId === sector) ||
      session!.efforts.some((e) => e.sectorId === sector);
    if (hasPlan && hasDIN) return "compleet";
    if (hasPlan || hasDIN) return "bezig";
    return "leeg";
  }

  function getSectorStepsDone(sector: SectorName) {
    const hasPlan = session!.sectorPlans.some((s) => s.sectorName === sector);
    const hasDIN =
      session!.benefits.some((b) => b.sectorId === sector) ||
      session!.efforts.some((e) => e.sectorId === sector);
    let done = 0;
    if (hasPlan) done++;
    if (hasDIN) done++;
    return done;
  }

  // Volgende sector navigatie
  function goToNextSector() {
    const currentIdx = SECTORS.indexOf(activeSector);
    if (currentIdx < SECTORS.length - 1) {
      setActiveSector(SECTORS[currentIdx + 1]);
      setSubStep("sectorplan");
      setActiveGoalId(null);
    }
  }

  const currentSectorIdx = SECTORS.indexOf(activeSector);
  const isLastSector = currentSectorIdx === SECTORS.length - 1;

  // --- Sectorplan functies ---
  function handleSectorUpload(text: string) {
    const plan: SectorPlan = {
      id: generateId(),
      sectorName: activeSector,
      rawText: text,
      uploadedAt: new Date().toISOString(),
    };
    const existing = session!.sectorPlans.filter(
      (s) => s.sectorName !== activeSector
    );
    updateSession({ sectorPlans: [...existing, plan] });
  }

  // --- DIN-mapping functies ---
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

  async function handleAIAdvice() {
    setIsAnalyzing(true);
    try {
      const sectorBenefitsAll = session!.benefits.filter(
        (b) => b.sectorId === activeSector
      );
      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sector-integratie",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals,
          benefits: sectorBenefitsAll,
          capabilities: sectorCapabilities,
          efforts: sectorEfforts,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setAiAdvice((prev) => ({
          ...prev,
          [activeSector]: data.data.analysis,
        }));
      }
    } catch (e) {
      console.error("AI analyse mislukt:", e);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyzePlan() {
    if (!sectorPlan) return;
    setIsAnalyzingPlan(true);
    try {
      const res = await fetch("/api/analyze-sectorplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorName: activeSector,
          planText: sectorPlan.rawText,
          goals: session!.goals,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setPlanAnalysis((prev) => ({
          ...prev,
          [activeSector]: data.data.analysis,
        }));
      }
    } catch (e) {
      console.error("AI analyse sectorplan mislukt:", e);
    } finally {
      setIsAnalyzingPlan(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Uitleg */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Werkwijze:</strong> Doorloop per sector de DIN-methodiek: upload
        het sectorplan, vul het DIN-netwerk in (Doelen → Baten → Vermogens →
        Inspanningen), en bekijk het integratie-advies. Voltooi een sector
        volledig voordat je naar de volgende gaat.
      </div>

      {/* Sector tabs met voortgang */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const progress = getSectorProgress(sector);
          const stepsDone = getSectorStepsDone(sector);
          return (
            <button
              key={sector}
              onClick={() => {
                setActiveSector(sector);
                setSubStep("sectorplan");
                setActiveGoalId(null);
              }}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeSector === sector
                  ? "border-cito-blue text-cito-blue"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {sector}
              <span className="flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    progress === "compleet"
                      ? "bg-green-500"
                      : progress === "bezig"
                      ? "bg-amber-400"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-[10px] text-gray-400">
                  {stepsDone}/2
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Actieve sector header */}
      <div className="px-4 py-3 bg-cito-blue/5 border border-cito-blue/20 rounded-lg">
        <div className="text-sm font-semibold text-cito-blue">
          Sector: {activeSector}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {getSectorProgress(activeSector) === "compleet"
            ? "Sectorplan en DIN-netwerk ingevuld"
            : getSectorProgress(activeSector) === "bezig"
            ? "In bewerking — nog niet alle stappen afgerond"
            : "Nog niet gestart — begin met het sectorplan"}
        </div>
      </div>

      {/* Sub-stap navigatie per sector */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {SUB_STEPS.map((step) => {
          const disabled =
            step.key === "din-mapping" && session.goals.length === 0;
          return (
            <button
              key={step.key}
              onClick={() => !disabled && setSubStep(step.key)}
              disabled={disabled}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                subStep === step.key
                  ? "bg-white text-cito-blue shadow-sm"
                  : disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title={
                disabled
                  ? "Importeer eerst doelen in stap 1 (KiB Import)"
                  : undefined
              }
            >
              {step.nummer}. {step.label}
            </button>
          );
        })}
      </div>

      {/* ===== SUB-STAP 1: Sectorplan ===== */}
      {subStep === "sectorplan" && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-cito-blue">
            Sectorplan: {activeSector}
          </h4>
          <p className="text-xs text-gray-500">
            Upload het sectorplan van {activeSector} of plak de tekst hieronder.
          </p>

          {/* File upload */}
          <label className="block cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-cito-blue hover:bg-blue-50/50 transition-colors">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm text-gray-600">
                Upload {activeSector}-sectorplan
              </span>
              <span className="text-xs text-gray-400">
                .docx, .doc, of .txt
              </span>
            </div>
            <input
              type="file"
              accept=".docx,.doc,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.name.endsWith(".txt")) {
                  const text = await file.text();
                  handleSectorUpload(text);
                } else {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("sectorName", activeSector);
                  try {
                    const res = await fetch("/api/parse-sector", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    if (data.success && data.data) {
                      handleSectorUpload(
                        data.data.rawText || `[Geüpload: ${file.name}]`
                      );
                    }
                  } catch (err) {
                    console.error("Upload mislukt:", err);
                    handleSectorUpload(`[Document: ${file.name}]`);
                  }
                }
                e.target.value = "";
              }}
            />
          </label>

          {/* Tekst invoer */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Of plak de tekst van het sectorplan:
            </label>
            <textarea
              key={activeSector}
              placeholder={`Plak hier de tekst van het ${activeSector}-sectorplan...`}
              className="w-full h-48 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
              defaultValue={
                sectorPlan?.rawText.startsWith("[")
                  ? ""
                  : sectorPlan?.rawText || ""
              }
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleSectorUpload(e.target.value.trim());
                }
              }}
            />
          </div>

          {/* Preview */}
          {sectorPlan && !sectorPlan.rawText.startsWith("[") && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-gray-600">
                  Huidige inhoud ({activeSector})
                </h5>
                <button
                  onClick={() => {
                    const cleared = session!.sectorPlans.filter(
                      (s) => s.sectorName !== activeSector
                    );
                    updateSession({ sectorPlans: cleared });
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Verwijderen
                </button>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-10">
                {sectorPlan.rawText}
              </p>
              {sectorPlan.rawText.length > 500 && (
                <details className="mt-2">
                  <summary className="text-xs text-cito-blue cursor-pointer">
                    Volledig plan tonen
                  </summary>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                    {sectorPlan.rawText}
                  </p>
                </details>
              )}
            </div>
          )}

          {/* AI Analyse van sectorplan */}
          {sectorPlan && !sectorPlan.rawText.startsWith("[") && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzePlan}
                  disabled={isAnalyzingPlan}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isAnalyzingPlan
                    ? "Analyseren..."
                    : "AI: Analyseer sectorplan"}
                </button>
              </div>
              {planAnalysis[activeSector] && (
                <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-cito-blue mb-2">
                    AI Analyse: Sectorplan {activeSector}
                  </h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {planAnalysis[activeSector]}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigatie */}
          <div className="flex justify-between">
            <div />
            <button
              onClick={() => {
                if (session.goals.length > 0) {
                  setSubStep("din-mapping");
                } else {
                  setSubStep("integratie");
                }
              }}
              className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
            >
              {session.goals.length > 0
                ? "Volgende: DIN-Mapping →"
                : "Volgende: Integratie-advies →"}
            </button>
          </div>
        </div>
      )}

      {/* ===== SUB-STAP 2: DIN-Mapping ===== */}
      {subStep === "din-mapping" && (
        <>
          {session.goals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Geen doelen beschikbaar. Importeer eerst KiB-data in stap 1
                (KiB Import) om doelen te laden.
              </p>
              <button
                onClick={() => setSubStep("sectorplan")}
                className="mt-3 px-4 py-2 text-sm text-cito-blue hover:underline"
              >
                ← Terug naar sectorplan
              </button>
            </div>
          ) : (
            <>
              <DINChainIndicator />

              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-600">
                U werkt aan het DIN-netwerk voor sector:{" "}
                <span className="font-semibold text-cito-blue">
                  {activeSector}
                </span>
                . Selecteer links een doel en vul rechts de baten, vermogens en
                inspanningen in.
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
                            b.goalId === goal.id &&
                            b.sectorId === activeSector
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
                              <span className="ml-1 text-green-400">●</span>
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
                      Hoe-vraag: Welke effecten wil {activeSector} bereiken
                      voor dit doel?
                    </p>
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
                      Hoe-vraag: Wat moet {activeSector} kunnen om deze baten
                      te realiseren?
                    </p>
                    <div className="space-y-2">
                      {sectorCapabilities.map((c) => (
                        <CapabilityCard
                          key={c.id}
                          capability={c}
                          onChange={updateCapability}
                          onDelete={() => deleteCapability(c.id)}
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
                      Hoe-vraag: Welke concrete activiteiten bouwen de vermogens
                      op? Verdeeld over 4 domeinen.
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
                              />
                            ))}
                            {domainEfforts.length === 0 && (
                              <p className="text-xs text-gray-400 italic">
                                Geen
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigatie */}
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setSubStep("sectorplan")}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  ← Sectorplan
                </button>
                <button
                  onClick={() => setSubStep("integratie")}
                  className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
                >
                  Volgende: Integratie-advies →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== SUB-STAP 3: Integratie-advies ===== */}
      {subStep === "integratie" && (
        <div className="space-y-4">
          {/* Dekking overzicht */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">
                {session.goals.length > 0
                  ? `${
                      session.goals.filter((g) =>
                        session.benefits.some(
                          (b) =>
                            b.goalId === g.id && b.sectorId === activeSector
                        )
                      ).length
                    }/${session.goals.length}`
                  : "—"}
              </div>
              <div className="text-xs text-gray-600">
                Doelen met DIN-invulling
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-cito-blue">
                {sectorEfforts.length}
              </div>
              <div className="text-xs text-gray-600">Inspanningen</div>
            </div>
            <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-cyan-700">
                {sectorCapabilities.length}
              </div>
              <div className="text-xs text-gray-600">Vermogens</div>
            </div>
          </div>

          {/* Sectorplan preview */}
          {sectorPlan ? (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h5 className="text-xs font-semibold text-gray-600 mb-2">
                Sectorplan: {activeSector}
              </h5>
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                {sectorPlan.rawText}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
              Geen sectorplan geüpload voor {activeSector}.{" "}
              <button
                onClick={() => setSubStep("sectorplan")}
                className="text-cito-blue hover:underline"
              >
                Upload sectorplan →
              </button>
            </div>
          )}

          {/* AI Advies knop */}
          <div className="flex justify-end">
            <button
              onClick={handleAIAdvice}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
            >
              {isAnalyzing
                ? "Analyseren..."
                : "AI: Advies integratie sectorplan"}
            </button>
          </div>

          {/* AI Advies resultaat */}
          {aiAdvice[activeSector] && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-cito-blue mb-2">
                AI Advies: DIN-integratie in sectorplan {activeSector}
              </h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {aiAdvice[activeSector]}
              </div>
            </div>
          )}

          {/* Navigatie: volgende sector of klaar */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                if (session.goals.length > 0) {
                  setSubStep("din-mapping");
                } else {
                  setSubStep("sectorplan");
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {session.goals.length > 0 ? "← DIN-Mapping" : "← Sectorplan"}
            </button>
            {!isLastSector ? (
              <button
                onClick={goToNextSector}
                className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
              >
                Volgende sector: {SECTORS[currentSectorIdx + 1]} →
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600">
                  Alle sectoren doorlopen
                </span>
                <span className="text-xs text-gray-400">
                  → Ga naar stap 3 (Cross-analyse)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
