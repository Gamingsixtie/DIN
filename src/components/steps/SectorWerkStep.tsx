"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { SectorName, SectorPlan, SectorplanAnalyseResult } from "@/lib/types";
import { SECTORS } from "@/lib/types";
import { generateId } from "@/lib/din-service";

export default function SectorWerkStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [planAnalysis, setPlanAnalysisState] = useState<Record<string, string | null>>(
    session?.sectorAnalyses || {}
  );
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  if (!session) return null;

  function setPlanAnalysis(updater: (prev: Record<string, string | null>) => Record<string, string | null>) {
    setPlanAnalysisState((prev) => {
      const next = updater(prev);
      // Sla op in sessie (filter null waarden)
      const cleaned: Record<string, string> = {};
      Object.entries(next).forEach(([k, v]) => {
        if (v) cleaned[k] = v;
      });
      updateSession({ sectorAnalyses: cleaned });
      return next;
    });
  }

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );

  const uploadedCount = SECTORS.filter((s) =>
    session.sectorPlans.some((p) => p.sectorName === s)
  ).length;

  function getSectorProgress(sector: SectorName) {
    return session!.sectorPlans.some((s) => s.sectorName === sector)
      ? "compleet"
      : "leeg";
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
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-sectorplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorName: activeSector,
          planText: sectorPlan.rawText,
          goals: session!.goals.map((g) => ({
            name: g.name,
            description: g.description,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setPlanAnalysis((prev) => ({
          ...prev,
          [activeSector]: data.data.analysis,
        }));
      } else {
        setPlanAnalysis((prev) => ({
          ...prev,
          [activeSector]: data.data?.message || "Analyse niet beschikbaar.",
        }));
      }
    } catch {
      setPlanAnalysis((prev) => ({
        ...prev,
        [activeSector]: "Fout bij het analyseren. Probeer opnieuw.",
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }

  const currentAnalysis = planAnalysis[activeSector];

  return (
    <div className="space-y-4">
      {/* Loading overlay tijdens uploaden of analyseren */}
      {(isUploading || isAnalyzing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-sm">
            <div className="w-12 h-12 border-3 border-cito-blue border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-base font-semibold text-cito-blue">
                {isAnalyzing
                  ? `Sectorplan ${activeSector} wordt geanalyseerd...`
                  : `Sectorplan ${activeSector} wordt verwerkt...`}
              </h3>
              {isAnalyzing && (
                <p className="text-xs text-gray-500 mt-1">
                  AI analyseert het sectorplan op DIN-aansluiting
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructie + voortgang */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-gray-700">
            <strong>Werkwijze:</strong> Upload per sector het sectorplan (.docx
            of .txt). Ga daarna naar DIN-Mapping om het DIN-netwerk in te vullen
            en integratie-advies te genereren.
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-gray-500">Voortgang</div>
            <div className="text-lg font-bold text-cito-blue">
              {uploadedCount}/{SECTORS.length}
            </div>
          </div>
        </div>
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const progress = getSectorProgress(sector);
          return (
            <button
              key={sector}
              onClick={() => {
                setActiveSector(sector);
                setUploadFeedback(null);
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

      {/* Upload feedback */}
      {uploadFeedback && (
        <div
          className={`p-3 rounded-lg text-sm ${
            uploadFeedback.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {uploadFeedback.msg}
        </div>
      )}

      {/* Twee kolommen: upload links, status rechts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom 1+2: Upload */}
        <div className="lg:col-span-2 space-y-4">
          {/* File upload */}
          <label
            className={`block ${isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
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
                {isUploading
                  ? "Bezig met uploaden..."
                  : `Upload ${activeSector}-sectorplan`}
              </span>
              <span className="text-xs text-gray-400">.docx of .txt</span>
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
                      setUploadFeedback({
                        type: "error",
                        msg: "Het bestand is leeg.",
                      });
                      return;
                    }
                    handleSectorUpload(text);
                    setUploadFeedback({
                      type: "success",
                      msg: `Sectorplan ${activeSector} succesvol geladen (${text.length} tekens).`,
                    });
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
                      setUploadFeedback({
                        type: "error",
                        msg:
                          errData?.error ||
                          `Upload mislukt (HTTP ${res.status}).`,
                      });
                      return;
                    }
                    const data = await res.json();
                    if (data.success && data.data?.rawText) {
                      handleSectorUpload(data.data.rawText);
                      setUploadFeedback({
                        type: "success",
                        msg: `Sectorplan ${activeSector} succesvol verwerkt uit ${file.name}.`,
                      });
                    } else {
                      setUploadFeedback({
                        type: "error",
                        msg:
                          data.error ||
                          "Kon geen tekst uit het document halen.",
                      });
                    }
                  } else {
                    setUploadFeedback({
                      type: "error",
                      msg: "Alleen .docx en .txt bestanden worden ondersteund.",
                    });
                  }
                } catch (err) {
                  console.error("Upload mislukt:", err);
                  setUploadFeedback({
                    type: "error",
                    msg: "Upload mislukt. Controleer het bestand en probeer opnieuw.",
                  });
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
              className="w-full h-40 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
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
        </div>

        {/* Kolom 3: Status + acties */}
        <div className="space-y-4">
          {/* Sector status kaart */}
          <div
            className={`p-4 rounded-lg border ${
              sectorPlan
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-3 h-3 rounded-full ${sectorPlan ? "bg-green-500" : "bg-gray-300"}`}
              />
              <h4 className="text-sm font-semibold text-gray-700">
                {activeSector}
              </h4>
            </div>
            {sectorPlan ? (
              <>
                <p className="text-xs text-green-700 mb-1">
                  Sectorplan ge&uuml;pload
                </p>
                <p className="text-[10px] text-gray-400">
                  {sectorPlan.rawText.length} tekens &middot; ge&uuml;pload{" "}
                  {new Date(sectorPlan.uploadedAt).toLocaleDateString("nl-NL")}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Nog geen sectorplan ge&uuml;pload
              </p>
            )}
          </div>

          {/* Acties */}
          <div className="space-y-2">
            {sectorPlan && (
              <div>
                <button
                  onClick={handleAnalyzePlan}
                  disabled={isAnalyzing}
                  className="w-full px-4 py-3 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI: Analyseer sectorplan
                </button>
                <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                  Koppelt het sectorplan aan de KiB-doelen en geeft advies voor baten, vermogens en inspanningen in het DIN-netwerk.
                </p>
              </div>
            )}

            {sectorPlan && (
              <button
                onClick={() => setCurrentStep("din-mapping")}
                className="w-full px-4 py-3 bg-white border border-cito-blue text-cito-blue rounded-lg text-sm font-medium hover:bg-cito-blue/5 transition-colors"
              >
                Naar DIN-Mapping {"\u2192"}
              </button>
            )}

            {!isLastSector && (
              <button
                onClick={goToNextSector}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Volgende: {SECTORS[currentSectorIdx + 1]} {"\u2192"}
              </button>
            )}

            {sectorPlan && (
              <button
                onClick={() => {
                  const cleared = session!.sectorPlans.filter(
                    (s) => s.sectorName !== activeSector
                  );
                  updateSession({ sectorPlans: cleared });
                  setUploadFeedback(null);
                }}
                className="w-full px-4 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sectorplan verwijderen
              </button>
            )}
          </div>

          {/* Overzicht alle sectoren */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <h5 className="text-xs font-semibold text-gray-500 mb-2">
              Overzicht
            </h5>
            {SECTORS.map((sector) => {
              const hasPlan = session.sectorPlans.some(
                (s) => s.sectorName === sector
              );
              return (
                <div
                  key={sector}
                  className="flex items-center gap-2 py-1"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${hasPlan ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span
                    className={`text-xs ${hasPlan ? "text-gray-700" : "text-gray-400"}`}
                  >
                    {sector}
                  </span>
                  {hasPlan && (
                    <span className="text-[10px] text-green-600 ml-auto">
                      Klaar
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inhoud sectorplan */}
      {sectorPlan && !sectorPlan.rawText.startsWith("[") && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-gray-600">
              Sectorplan {activeSector} ({sectorPlan.rawText.length} tekens)
            </h5>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-[20]">
            {sectorPlan.rawText}
          </p>
          {sectorPlan.rawText.length > 2000 && (
            <details className="mt-2">
              <summary className="text-xs text-cito-blue cursor-pointer hover:underline">
                Volledig plan tonen
              </summary>
              <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                {sectorPlan.rawText}
              </p>
            </details>
          )}
        </div>
      )}

      {/* AI Analyse resultaat */}
      {currentAnalysis && (() => {
        // Probeer gestructureerd JSON te parsen
        let parsed: SectorplanAnalyseResult | null = null;
        try {
          const jsonMatch = currentAnalysis.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const obj = JSON.parse(jsonMatch[0]);
            if (obj.samenvatting && obj.baten && obj.vermogens) {
              parsed = obj;
            }
          }
        } catch { /* fallback naar platte tekst */ }

        const handleClose = () => setPlanAnalysis((prev) => ({ ...prev, [activeSector]: null }));

        if (parsed) {
          const domainColors: Record<string, { bg: string; text: string; dot: string }> = {
            mens: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
            processen: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
            data_systemen: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
            cultuur: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
          };
          const domainLabels: Record<string, string> = {
            mens: "Mens",
            processen: "Processen",
            data_systemen: "Data & Systemen",
            cultuur: "Cultuur",
          };

          return (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h4 className="text-sm font-bold text-cito-blue">
                    AI-analyse: {activeSector}-sectorplan
                  </h4>
                </div>
                <button onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-600">
                  Sluiten
                </button>
              </div>

              {/* Samenvatting */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">{parsed.samenvatting}</p>
              </div>

              {/* Aansluiting op KiB-doelen */}
              {parsed.aansluiting && (
                <div className="p-4 rounded-lg border-l-4 border-green-500 bg-green-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <h5 className="text-sm font-bold text-gray-800">{parsed.aansluiting.titel}</h5>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-2">{parsed.aansluiting.toelichting}</p>
                  <ul className="space-y-1.5">
                    {parsed.aansluiting.punten.map((punt, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 shrink-0">&bull;</span>
                        <span>{punt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Voorgestelde baten */}
              {parsed.baten && (
                <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h5 className="text-sm font-bold text-gray-800">{parsed.baten.titel}</h5>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-2">{parsed.baten.toelichting}</p>
                  <ul className="space-y-1.5">
                    {parsed.baten.punten.map((punt, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">&bull;</span>
                        <span>{punt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benodigde vermogens */}
              {parsed.vermogens && (
                <div className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <h5 className="text-sm font-bold text-gray-800">{parsed.vermogens.titel}</h5>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-2">{parsed.vermogens.toelichting}</p>
                  <ul className="space-y-1.5">
                    {parsed.vermogens.punten.map((punt, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5 shrink-0">&bull;</span>
                        <span>{punt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inspanningen per domein */}
              {parsed.inspanningen && (
                <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h5 className="text-sm font-bold text-gray-800">{parsed.inspanningen.titel}</h5>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-3">{parsed.inspanningen.toelichting}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["mens", "processen", "data_systemen", "cultuur"] as const).map((domain) => {
                      const items = parsed!.inspanningen[domain] || [];
                      if (items.length === 0) return null;
                      const colors = domainColors[domain];
                      return (
                        <div key={domain} className={`p-3 rounded-lg ${colors.bg}`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            <span className={`text-xs font-semibold ${colors.text}`}>{domainLabels[domain]}</span>
                          </div>
                          <ul className="space-y-1">
                            {items.map((item, i) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                <span className="text-gray-300 mt-0.5 shrink-0">&ndash;</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aandachtspunten */}
              {parsed.aandachtspunten && (
                <div className="p-4 rounded-lg border-l-4 border-red-400 bg-red-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h5 className="text-sm font-bold text-gray-800">{parsed.aandachtspunten.titel}</h5>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-2">{parsed.aandachtspunten.toelichting}</p>
                  <ul className="space-y-1.5">
                    {parsed.aandachtspunten.punten.map((punt, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5 shrink-0">&bull;</span>
                        <span>{punt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vervolgactie */}
              <div className="flex items-center gap-2 p-3 bg-cito-blue/5 rounded-lg border border-cito-blue/10">
                <svg className="w-4 h-4 text-cito-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <p className="text-xs text-gray-600">
                  Gebruik deze analyse als basis. Ga naar <strong>DIN-Mapping</strong> om baten, vermogens en inspanningen in te vullen per sector.
                </p>
              </div>
            </div>
          );
        }

        // Fallback: platte tekst (oud formaat)
        return (
          <div className="p-5 bg-white rounded-lg border-2 border-cito-blue/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h4 className="text-sm font-bold text-cito-blue">
                  AI-analyse: {activeSector}-sectorplan
                </h4>
              </div>
              <button onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-600">
                Sluiten
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
              {currentAnalysis}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
