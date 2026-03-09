"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { SectorName, SectorPlan } from "@/lib/types";
import { SECTORS } from "@/lib/types";
import { generateId } from "@/lib/din-service";

export default function SectorWerkStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [planAnalysis, setPlanAnalysis] = useState<Record<string, string>>({});

  if (!session) return null;

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );

  function getSectorProgress(sector: SectorName) {
    const hasPlan = session!.sectorPlans.some((s) => s.sectorName === sector);
    if (hasPlan) return "compleet";
    return "leeg";
  }

  function goToNextSector() {
    const currentIdx = SECTORS.indexOf(activeSector);
    if (currentIdx < SECTORS.length - 1) {
      setActiveSector(SECTORS[currentIdx + 1]);
    }
  }

  const currentSectorIdx = SECTORS.indexOf(activeSector);
  const isLastSector = currentSectorIdx === SECTORS.length - 1;

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
        het analyseren. Na het uploaden ga je naar stap 3 (DIN-Mapping) om het
        DIN-netwerk per sector in te vullen en het integratie-advies te bekijken.
      </div>

      {/* Sector tabs met voortgang */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const progress = getSectorProgress(sector);
          return (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
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
            ? "Sectorplan ge\u00FCpload \u2014 ga naar DIN-Mapping voor het DIN-netwerk en integratie-advies"
            : "Upload het sectorplan om te beginnen"}
        </div>
      </div>

      {/* Sectorplan upload + inhoud */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-cito-blue">
          Sectorplan: {activeSector}
        </h4>
        <p className="text-xs text-gray-500">
          Upload het sectorplan van {activeSector} of plak de tekst hieronder.
        </p>

        {/* Upload feedback */}
        {uploadFeedback && (
          <div className={`p-3 rounded-lg text-sm ${
            uploadFeedback.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {uploadFeedback.msg}
          </div>
        )}

        {/* File upload */}
        <label className={`block ${isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-cito-blue hover:bg-blue-50/50 transition-colors">
            {isUploading ? (
              <div className="w-8 h-8 border-2 border-cito-blue border-t-transparent rounded-full animate-spin" />
            ) : (
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
            )}
            <span className="text-sm text-gray-600">
              {isUploading ? "Bezig met uploaden..." : `Upload ${activeSector}-sectorplan`}
            </span>
            <span className="text-xs text-gray-400">
              .docx of .txt
            </span>
          </div>
          <input
            type="file"
            accept=".docx,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setIsUploading(true);
              setUploadFeedback(null);
              try {
                if (file.name.endsWith(".txt")) {
                  const text = await file.text();
                  if (!text.trim()) {
                    setUploadFeedback({ type: "error", msg: "Het bestand is leeg." });
                    return;
                  }
                  handleSectorUpload(text);
                  setUploadFeedback({ type: "success", msg: `Sectorplan ${activeSector} succesvol geladen (${text.length} tekens).` });
                } else if (file.name.endsWith(".docx")) {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("sectorName", activeSector);
                  const res = await fetch("/api/parse-sector", {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) {
                    const errData = await res.json().catch(() => null);
                    setUploadFeedback({ type: "error", msg: errData?.error || `Upload mislukt (HTTP ${res.status}).` });
                    return;
                  }
                  const data = await res.json();
                  if (data.success && data.data?.rawText) {
                    handleSectorUpload(data.data.rawText);
                    setUploadFeedback({ type: "success", msg: `Sectorplan ${activeSector} succesvol verwerkt uit ${file.name}.` });
                  } else {
                    setUploadFeedback({ type: "error", msg: data.error || "Kon geen tekst uit het document halen." });
                  }
                } else {
                  setUploadFeedback({ type: "error", msg: "Alleen .docx en .txt bestanden worden ondersteund." });
                }
              } catch (err) {
                console.error("Upload mislukt:", err);
                setUploadFeedback({ type: "error", msg: "Upload mislukt. Controleer het bestand en probeer opnieuw." });
              } finally {
                setIsUploading(false);
                e.target.value = "";
              }
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
        <div className="flex justify-end gap-2">
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
  );
}
