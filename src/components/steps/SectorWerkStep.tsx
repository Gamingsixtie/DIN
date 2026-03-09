"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { SectorName, SectorPlan } from "@/lib/types";
import { SECTORS } from "@/lib/types";
import { generateId } from "@/lib/din-service";

type SectorSubStep = "sectorplan" | "integratie";

const SUB_STEPS: { key: SectorSubStep; label: string; nummer: number }[] = [
  { key: "sectorplan", label: "Sectorplan", nummer: 1 },
  { key: "integratie", label: "Integratie-advies", nummer: 2 },
];

export default function SectorWerkStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [subStep, setSubStep] = useState<SectorSubStep>("sectorplan");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<Record<string, string>>({});
  const [planAnalysis, setPlanAnalysis] = useState<Record<string, string>>({});

  if (!session) return null;

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );
  const sectorBenefits = session.benefits.filter(
    (b) => b.sectorId === activeSector
  );
  const sectorCapabilities = session.capabilities.filter(
    (c) => c.sectorId === activeSector
  );
  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === activeSector
  );

  // Voortgang per sector
  function getSectorProgress(sector: SectorName) {
    const hasPlan = session!.sectorPlans.some((s) => s.sectorName === sector);
    if (hasPlan) return "compleet";
    return "leeg";
  }

  // Volgende sector navigatie
  function goToNextSector() {
    const currentIdx = SECTORS.indexOf(activeSector);
    if (currentIdx < SECTORS.length - 1) {
      setActiveSector(SECTORS[currentIdx + 1]);
      setSubStep("sectorplan");
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

  async function handleAIAdvice() {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sector-integratie",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals,
          benefits: sectorBenefits,
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
        <strong>Werkwijze:</strong> Upload per sector het sectorplan en laat AI
        het analyseren. Na het uploaden van alle sectorplannen ga je naar stap 3
        (DIN-Mapping) om het DIN-netwerk per sector in te vullen.
      </div>

      {/* Sector tabs met voortgang */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const progress = getSectorProgress(sector);
          return (
            <button
              key={sector}
              onClick={() => {
                setActiveSector(sector);
                setSubStep("sectorplan");
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
                  progress === "compleet" ? "bg-green-500" : "bg-gray-300"
                }`}
              />
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
          {sectorPlan
            ? "Sectorplan geüpload — bekijk het integratie-advies of ga naar DIN-Mapping"
            : "Upload het sectorplan om te beginnen"}
        </div>
      </div>

      {/* Sub-stap navigatie */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {SUB_STEPS.map((step) => (
          <button
            key={step.key}
            onClick={() => setSubStep(step.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              subStep === step.key
                ? "bg-white text-cito-blue shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {step.nummer}. {step.label}
          </button>
        ))}
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
            <div className="flex gap-2">
              <button
                onClick={() => setSubStep("integratie")}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Integratie-advies
              </button>
              {!isLastSector ? (
                <button
                  onClick={goToNextSector}
                  className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
                >
                  Volgende sector: {SECTORS[currentSectorIdx + 1]} {"\u2192"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep("din-mapping")}
                  className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
                >
                  Naar DIN-Mapping {"\u2192"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SUB-STAP 2: Integratie-advies ===== */}
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
                  : "\u2014"}
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
              Geen sectorplan ge{"\u00FC"}pload voor {activeSector}.{" "}
              <button
                onClick={() => setSubStep("sectorplan")}
                className="text-cito-blue hover:underline"
              >
                Upload sectorplan {"\u2192"}
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

          {/* Navigatie */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setSubStep("sectorplan")}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {"\u2190"} Sectorplan
            </button>
            {!isLastSector ? (
              <button
                onClick={goToNextSector}
                className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
              >
                Volgende sector: {SECTORS[currentSectorIdx + 1]} {"\u2192"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep("din-mapping")}
                className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
              >
                Naar DIN-Mapping {"\u2192"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
