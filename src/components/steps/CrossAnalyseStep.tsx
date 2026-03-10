"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import {
  findSharedCapabilities,
  getDomainBalance,
  findGaps,
} from "@/lib/din-service";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import MarkdownContent from "@/components/ui/MarkdownContent";
import type { EffortDomain, SectorName, CrossAnalyseResult } from "@/lib/types";

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string; bar: string; light: string }> = {
  mens: { bg: "bg-blue-50", text: "text-blue-700", bar: "#2563eb", light: "bg-blue-100" },
  processen: { bg: "bg-green-50", text: "text-green-700", bar: "#059669", light: "bg-green-100" },
  data_systemen: { bg: "bg-purple-50", text: "text-purple-700", bar: "#7c3aed", light: "bg-purple-100" },
  cultuur: { bg: "bg-amber-50", text: "text-amber-700", bar: "#d97706", light: "bg-amber-100" },
};

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Animated DIN chain */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["Doelen", "Baten", "Vermogens", "Inspanningen"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
                  style={{
                    backgroundColor: ["#003366", "#0066cc", "#0891b2", "#059669"][i],
                    animationDelay: `${i * 200}ms`,
                    animationDuration: "1.5s",
                  }}
                >
                  {["D", "B", "V", "I"][i]}
                </div>
                <span className="text-[9px] text-gray-400 mt-1">{label}</span>
              </div>
              {i < 3 && (
                <div className="flex gap-0.5 mt-[-12px]">
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      className="w-1 h-1 rounded-full bg-gray-300 animate-pulse"
                      style={{ animationDelay: `${i * 200 + dot * 100}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-cito-blue mb-2">
          AI Cross-analyse wordt uitgevoerd
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          De AI analyseert synergieën, gaps en hefboomwerking over alle sectoren en domeinen...
        </p>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cito-blue via-cito-accent to-din-inspanningen rounded-full"
            style={{ animation: "loading-progress 3s ease-in-out infinite" }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">Dit kan 10-20 seconden duren</p>

        <style>{`
          @keyframes loading-progress {
            0% { width: 0%; }
            50% { width: 80%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}

// --- Gestructureerde AI Analyse Renderers ---

function SynergieSection({ data }: { data: CrossAnalyseResult["synergie"] }) {
  return (
    <div className="border border-amber-200 rounded-xl overflow-hidden">
      <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-800">{data.titel}</h4>
          <p className="text-xs text-amber-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        {data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/30 border border-amber-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{item.vermogen}</div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.impact}</p>
                  <div className="flex gap-1 mt-1.5">
                    {item.sectoren.map((s) => (
                      <SectorBadge key={s} sector={s} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Geen synergieën geïdentificeerd.</p>
        )}
      </div>
    </div>
  );
}

function GapsSection({ data }: { data: CrossAnalyseResult["gaps"] }) {
  const categories = [
    { key: "doelenZonderBaten" as const, label: "Doelen zonder baten", items: data.doelenZonderBaten },
    { key: "batenZonderVermogens" as const, label: "Baten zonder vermogens", items: data.batenZonderVermogens },
    { key: "vermogensZonderInspanningen" as const, label: "Vermogens zonder inspanningen", items: data.vermogensZonderInspanningen },
  ];

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden">
      <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-800">{data.titel}</h4>
          <p className="text-xs text-red-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(({ key, label, items }) => {
            const hasGaps = items.length > 0;
            return (
              <div key={key} className={`rounded-lg border p-4 ${hasGaps ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className={`text-lg font-bold ${hasGaps ? "text-red-600" : "text-green-600"}`}>
                    {items.length}
                  </span>
                </div>
                {hasGaps ? (
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-600">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span>Volledig afgedekt</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HefboomSection({ data }: { data: CrossAnalyseResult["hefboomwerking"] }) {
  const priorityColors: Record<string, string> = {
    hoog: "bg-red-100 text-red-700 border-red-200",
    midden: "bg-amber-100 text-amber-700 border-amber-200",
    laag: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div className="border border-green-200 rounded-xl overflow-hidden">
      <div className="bg-green-50 px-5 py-3 border-b border-green-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-green-800">{data.titel}</h4>
          <p className="text-xs text-green-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        {data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-green-50/20">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{item.inspanning}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityColors[item.prioriteit] || priorityColors.midden}`}>
                      {item.prioriteit}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-gray-400 mr-1">Draagt bij aan:</span>
                    {item.bijdraagtAan.map((baat, j) => (
                      <span key={j} className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">
                        {baat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Geen hefbomen geïdentificeerd.</p>
        )}
      </div>
    </div>
  );
}

function DomeinBalansSection({ data }: { data: CrossAnalyseResult["domeinBalans"] }) {
  const domeinMapping: Record<string, EffortDomain> = {
    "mens": "mens",
    "processen": "processen",
    "data & systemen": "data_systemen",
    "data_systemen": "data_systemen",
    "data en systemen": "data_systemen",
    "cultuur": "cultuur",
  };

  const beoordelingColors: Record<string, string> = {
    "voldoende": "bg-green-100 text-green-700",
    "te weinig": "bg-red-100 text-red-700",
    "oververtegenwoordigd": "bg-amber-100 text-amber-700",
  };

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden">
      <div className="bg-purple-50 px-5 py-3 border-b border-purple-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-purple-800">{data.titel}</h4>
          <p className="text-xs text-purple-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.domeinen.map((item, i) => {
            const domainKey = domeinMapping[item.domein.toLowerCase()] || "mens";
            const colors = DOMAIN_COLORS[domainKey];
            const beoordelingStyle = Object.entries(beoordelingColors).find(
              ([key]) => item.beoordeling.toLowerCase().includes(key)
            );

            return (
              <div key={i} className={`border rounded-xl p-4 ${colors.bg} border-gray-200`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bar }} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                    {item.domein}
                  </span>
                </div>
                {beoordelingStyle && (
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium mb-2 ${beoordelingStyle[1]}`}>
                    {item.beoordeling}
                  </span>
                )}
                <p className="text-xs text-gray-600 leading-relaxed">{item.advies}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectorOverlapSection({ data }: { data: CrossAnalyseResult["sectorOverlap"] }) {
  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      <div className="bg-blue-50 px-5 py-3 border-b border-blue-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-800">{data.titel}</h4>
          <p className="text-xs text-blue-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        {data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/20">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{item.beschrijving}</div>
                  <p className="text-xs text-gray-500 mt-1">{item.advies}</p>
                  <div className="flex gap-1 mt-1.5">
                    {item.sectoren.map((s) => (
                      <SectorBadge key={s} sector={s} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Geen sector-overlap geïdentificeerd.</p>
        )}
      </div>
    </div>
  );
}

function ExterneProjectenSection({ data }: { data: CrossAnalyseResult["externeProjecten"] }) {
  return (
    <div className="border border-cyan-200 rounded-xl overflow-hidden">
      <div className="bg-cyan-50 px-5 py-3 border-b border-cyan-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-cyan-800">{data.titel}</h4>
          <p className="text-xs text-cyan-600 italic">{data.toelichting}</p>
        </div>
      </div>
      <div className="bg-white p-5">
        {data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-cyan-100 bg-cyan-50/20">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{item.project}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Overlapt met: <span className="font-medium text-gray-700">{item.overlapMet}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.advies}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Geen relevante externe projecten gevonden.</p>
        )}
      </div>
    </div>
  );
}

// --- Hoofdcomponent voor AI resultaat ---

function AIAnalysisResult({ analysis }: { analysis: string }) {
  // Probeer gestructureerde JSON te parsen
  let parsed: CrossAnalyseResult | null = null;
  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj.synergie && obj.gaps && obj.hefboomwerking && obj.domeinBalans) {
        parsed = obj;
      }
    }
  } catch {
    // Fallback naar MarkdownContent
  }

  if (parsed) {
    return (
      <div className="space-y-4">
        <SynergieSection data={parsed.synergie} />
        <GapsSection data={parsed.gaps} />
        <HefboomSection data={parsed.hefboomwerking} />
        <DomeinBalansSection data={parsed.domeinBalans} />
        <SectorOverlapSection data={parsed.sectorOverlap} />
        {parsed.externeProjecten && parsed.externeProjecten.items && (
          <ExterneProjectenSection data={parsed.externeProjecten} />
        )}
      </div>
    );
  }

  // Fallback: render als markdown
  return (
    <div className="p-5 bg-blue-50/30 border border-blue-200 rounded-xl">
      <MarkdownContent content={analysis} />
    </div>
  );
}

// --- Hoofd CrossAnalyseStep ---

export default function CrossAnalyseStep() {
  const { session, updateSession } = useSession();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({});

  // Laad opgeslagen cross-analyse bij mount
  useEffect(() => {
    if (session?.crossAnalyse && !aiAnalysis) {
      setAiAnalysis(session.crossAnalyse);
    }
  }, [session?.crossAnalyse]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  const sharedCaps = findSharedCapabilities(session.capabilities);
  const domainBalance = getDomainBalance(session.efforts);
  const gaps = findGaps(
    session.goals,
    session.benefits,
    session.capabilities,
    session.efforts,
    session.goalBenefitMaps,
    session.benefitCapabilityMaps,
    session.capabilityEffortMaps
  );

  const totalEfforts = Object.values(domainBalance).reduce((a, b) => a + b, 0);
  const totalBenefits = session.benefits.length;
  const totalCapabilities = session.capabilities.length;
  const hasData = totalBenefits > 0 || totalCapabilities > 0 || totalEfforts > 0;

  // Details voor gap-analyse
  const goalsWithoutBenefitsDetails = session.goals.filter((g) =>
    gaps.goalsWithoutBenefits.includes(g.id)
  );
  const benefitsWithoutCapDetails = session.benefits.filter((b) =>
    gaps.benefitsWithoutCapabilities.includes(b.id)
  );
  const capsWithoutEffortDetails = session.capabilities.filter((c) =>
    gaps.capabilitiesWithoutEfforts.includes(c.id)
  );

  async function handleAIAnalyse() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: session!.goals,
          benefits: session!.benefits,
          capabilities: session!.capabilities,
          efforts: session!.efforts,
          externalProjects: session!.externalProjects || [],
          // Koppelingen meesturen zodat AI gaps en hefboomwerking correct kan analyseren
          goalBenefitMaps: session!.goalBenefitMaps,
          benefitCapabilityMaps: session!.benefitCapabilityMaps,
          capabilityEffortMaps: session!.capabilityEffortMaps,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setAiAnalysis(data.data.analysis);
        // Opslaan in sessie zodat het bewaard blijft bij navigatie
        updateSession({ crossAnalyse: data.data.analysis });
      } else {
        setError("De AI-analyse heeft geen resultaat opgeleverd. Probeer het opnieuw.");
      }
    } catch (e) {
      console.error("AI analyse mislukt:", e);
      setError("Er ging iets mis bij de AI-analyse. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium mb-1">Nog geen DIN-data beschikbaar</p>
        <p className="text-sm text-gray-400">
          Vul eerst het DIN-netwerk in via de DIN-Mapping stap om een cross-analyse uit te voeren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Loading overlay */}
      {isAnalyzing && <LoadingOverlay />}

      {/* Header met statistieken */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-cito-blue">Cross-analyse</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Analyse over alle sectoren heen — synergieën, gaps en domeinbalans
            </p>
          </div>
          <button
            onClick={handleAIAnalyse}
            disabled={isAnalyzing}
            className="px-5 py-2.5 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            AI Cross-analyse uitvoeren
          </button>
        </div>

        {/* Statistieken strip */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-doelen">{session.goals.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Doelen</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-baten">{totalBenefits}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Baten</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-vermogens">{totalCapabilities}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Vermogens</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-inspanningen">{totalEfforts}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Inspanningen</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{sharedCaps.size}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Synergieën</div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-medium">Analyse mislukt</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Vermogen-Synergie Matrix */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Vermogen-Synergie Matrix</h3>
            <p className="text-xs text-gray-400">
              Vermogens die bij meerdere sectoren terugkomen zijn hefbomen — investeren hierin heeft breed effect.
            </p>
          </div>
        </div>
        <div className="p-5">
          {sharedCaps.size > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Vermogen
                    </th>
                    {SECTORS.map((s) => (
                      <th key={s} className="py-2.5 text-center font-medium text-gray-500 w-24 text-xs uppercase tracking-wider">
                        {s}
                      </th>
                    ))}
                    <th className="py-2.5 text-center font-medium text-gray-500 w-20 text-xs uppercase tracking-wider">
                      Sectoren
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {session.capabilities
                    .filter((c) => sharedCaps.has(c.id))
                    .map((cap) => {
                      const sectors = sharedCaps.get(cap.id) || [];
                      return (
                        <tr key={cap.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 text-gray-700 pr-4">
                            <div className="text-sm">{cap.description || "(naamloos)"}</div>
                            {cap.currentLevel && cap.targetLevel && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Niveau: {cap.currentLevel}/5 → {cap.targetLevel}/5
                              </div>
                            )}
                          </td>
                          {SECTORS.map((s) => (
                            <td key={s} className="py-3 text-center">
                              {sectors.includes(s) ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50">
                                  <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                              {sectors.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                Nog geen gedeelde vermogens gevonden.
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Voeg meer vermogens toe per sector in de DIN-Mapping stap.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Inspanningen per Domein */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Inspanningen per Domein</h3>
            <p className="text-xs text-gray-400">
              Verdeling over de 4 inspanningsdomeinen — alle domeinen moeten afgedekt zijn.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
              const count = domainBalance[domain];
              const pct = totalEfforts > 0 ? (count / totalEfforts) * 100 : 0;
              const colors = DOMAIN_COLORS[domain];
              const isEmpty = count === 0;

              const domainEfforts = session.efforts.filter((e) => e.domain === domain);

              return (
                <div
                  key={domain}
                  className={`border rounded-xl p-4 transition-colors ${
                    isEmpty ? "border-red-200 bg-red-50/50" : `border-gray-200 ${colors.bg}`
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                    {DOMAIN_LABELS[domain]}
                  </div>
                  <div className="flex items-end gap-2 mt-2">
                    <div className={`text-3xl font-bold ${isEmpty ? "text-red-400" : colors.text}`}>
                      {count}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">
                      {Math.round(pct)}%
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                  {domainEfforts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {SECTORS.map((s) => {
                        const sectorCount = domainEfforts.filter((e) => e.sectorId === s).length;
                        if (sectorCount === 0) return null;
                        return (
                          <span key={s} className="text-[9px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
                            {s}: {sectorCount}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {isEmpty && (
                    <div className="mt-2 text-[10px] text-red-500 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      Niet afgedekt
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balans-check */}
          {totalEfforts > 0 && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              Object.values(domainBalance).some((v) => v === 0)
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              {Object.values(domainBalance).some((v) => v === 0) ? (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Balans-check:</strong> Niet alle domeinen zijn afgedekt! Voeg inspanningen toe voor de ontbrekende domeinen.</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Balans-check:</strong> Alle 4 domeinen zijn afgedekt.</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Gap-analyse */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Gap-analyse</h3>
            <p className="text-xs text-gray-400">
              Ontbrekende schakels in de DIN-keten — elke gap is een risico voor het programma.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Doelen zonder baten */}
            <div className={`rounded-xl border overflow-hidden ${
              goalsWithoutBenefitsDetails.length > 0 ? "border-red-200" : "border-green-200"
            }`}>
              <div className={`px-4 py-3 ${
                goalsWithoutBenefitsDetails.length > 0 ? "bg-red-50" : "bg-green-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">Doelen zonder baten</div>
                  <div className={`text-2xl font-bold ${
                    goalsWithoutBenefitsDetails.length > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {goalsWithoutBenefitsDetails.length}
                  </div>
                </div>
              </div>
              {goalsWithoutBenefitsDetails.length > 0 && (
                <div className="border-t border-red-100">
                  <button
                    onClick={() => setExpandedGaps((prev) => ({ ...prev, goals: !prev.goals }))}
                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between"
                  >
                    <span>Bekijk details</span>
                    <span>{expandedGaps.goals ? "\u25B2" : "\u25BC"}</span>
                  </button>
                  {expandedGaps.goals && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {goalsWithoutBenefitsDetails.map((g) => (
                        <div key={g.id} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span>{g.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Baten zonder vermogens */}
            <div className={`rounded-xl border overflow-hidden ${
              benefitsWithoutCapDetails.length > 0 ? "border-red-200" : "border-green-200"
            }`}>
              <div className={`px-4 py-3 ${
                benefitsWithoutCapDetails.length > 0 ? "bg-red-50" : "bg-green-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">Baten zonder vermogens</div>
                  <div className={`text-2xl font-bold ${
                    benefitsWithoutCapDetails.length > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {benefitsWithoutCapDetails.length}
                  </div>
                </div>
              </div>
              {benefitsWithoutCapDetails.length > 0 && (
                <div className="border-t border-red-100">
                  <button
                    onClick={() => setExpandedGaps((prev) => ({ ...prev, benefits: !prev.benefits }))}
                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between"
                  >
                    <span>Bekijk details</span>
                    <span>{expandedGaps.benefits ? "\u25B2" : "\u25BC"}</span>
                  </button>
                  {expandedGaps.benefits && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {benefitsWithoutCapDetails.map((b) => (
                        <div key={b.id} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>{b.description || "(naamloos)"}</span>
                            {" "}
                            <SectorBadge sector={b.sectorId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vermogens zonder inspanningen */}
            <div className={`rounded-xl border overflow-hidden ${
              capsWithoutEffortDetails.length > 0 ? "border-red-200" : "border-green-200"
            }`}>
              <div className={`px-4 py-3 ${
                capsWithoutEffortDetails.length > 0 ? "bg-red-50" : "bg-green-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">Vermogens zonder inspanningen</div>
                  <div className={`text-2xl font-bold ${
                    capsWithoutEffortDetails.length > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {capsWithoutEffortDetails.length}
                  </div>
                </div>
              </div>
              {capsWithoutEffortDetails.length > 0 && (
                <div className="border-t border-red-100">
                  <button
                    onClick={() => setExpandedGaps((prev) => ({ ...prev, caps: !prev.caps }))}
                    className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between"
                  >
                    <span>Bekijk details</span>
                    <span>{expandedGaps.caps ? "\u25B2" : "\u25BC"}</span>
                  </button>
                  {expandedGaps.caps && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {capsWithoutEffortDetails.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span>{c.description || "(naamloos)"}</span>
                            {" "}
                            <SectorBadge sector={c.sectorId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Overall gap status */}
          {gaps.goalsWithoutBenefits.length === 0 &&
            gaps.benefitsWithoutCapabilities.length === 0 &&
            gaps.capabilitiesWithoutEfforts.length === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span><strong>DIN-keten compleet:</strong> Alle doelen, baten en vermogens zijn gekoppeld aan het volgende niveau.</span>
              </div>
          )}
        </div>
      </section>

      {/* AI Analyse resultaat */}
      {aiAnalysis && (
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-cito-blue">AI Cross-analyse resultaat</h3>
                <p className="text-xs text-gray-400">
                  Gebaseerd op {session.goals.length} doelen, {totalBenefits} baten, {totalCapabilities} vermogens en {totalEfforts} inspanningen
                </p>
              </div>
            </div>
            <button
              onClick={handleAIAnalyse}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-xs text-cito-blue border border-cito-blue rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              Opnieuw analyseren
            </button>
          </div>
          <div className="p-5">
            <AIAnalysisResult analysis={aiAnalysis} />
          </div>
        </section>
      )}
    </div>
  );
}
