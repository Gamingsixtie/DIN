"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import {
  findSharedCapabilities,
  getDomainBalance,
  findGaps,
} from "@/lib/din-service";
import { SECTORS } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import type { EffortDomain } from "@/lib/types";

export default function CrossAnalyseStep() {
  const { session } = useSession();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  async function handleAIAnalyse() {
    setIsAnalyzing(true);
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
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setAiAnalysis(data.data.analysis);
      }
    } catch (e) {
      console.error("AI analyse mislukt:", e);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleAIAnalyse}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
        >
          {isAnalyzing ? "Analyseren..." : "AI: Cross-analyse uitvoeren"}
        </button>
      </div>

      {/* Vermogen-Synergie Matrix */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Vermogen-Synergie Matrix
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Vermogens die bij meerdere sectoren terugkomen zijn hefbomen.
        </p>
        {sharedCaps.size > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium text-gray-500">
                    Vermogen
                  </th>
                  {SECTORS.map((s) => (
                    <th
                      key={s}
                      className="py-2 text-center font-medium text-gray-500 w-20"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {session.capabilities
                  .filter((c) => sharedCaps.has(c.id))
                  .map((cap) => (
                    <tr key={cap.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">
                        {cap.description || "(naamloos)"}
                      </td>
                      {SECTORS.map((s) => (
                        <td key={s} className="py-2 text-center">
                          {sharedCaps.get(cap.id)?.includes(s) ? (
                            <span className="inline-block w-3 h-3 rounded-full bg-cito-blue" />
                          ) : (
                            <span className="inline-block w-3 h-3 rounded-full bg-gray-200" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Nog geen gedeelde vermogens gevonden. Voeg meer vermogens toe per
            sector in stap 2.
          </p>
        )}
      </section>

      {/* Inspanningen per Domein */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Inspanningen per Domein
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
            const count = domainBalance[domain];
            const pct = totalEfforts > 0 ? (count / totalEfforts) * 100 : 0;
            return (
              <div
                key={domain}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="text-sm font-semibold text-gray-700">
                  {DOMAIN_LABELS[domain]}
                </div>
                <div className="text-2xl font-bold text-cito-blue mt-1">
                  {count}
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cito-blue rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round(pct)}%
                </div>
              </div>
            );
          })}
        </div>
        {totalEfforts > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            Balans-check:{" "}
            {Object.values(domainBalance).some((v) => v === 0)
              ? "Niet alle domeinen zijn afgedekt!"
              : "Alle 4 domeinen zijn afgedekt."}
          </div>
        )}
      </section>

      {/* Gap-analyse */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Gap-analyse
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-lg border ${
              gaps.goalsWithoutBenefits.length > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="text-sm font-medium">Doelen zonder baten</div>
            <div className="text-2xl font-bold mt-1">
              {gaps.goalsWithoutBenefits.length}
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border ${
              gaps.benefitsWithoutCapabilities.length > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="text-sm font-medium">Baten zonder vermogens</div>
            <div className="text-2xl font-bold mt-1">
              {gaps.benefitsWithoutCapabilities.length}
            </div>
          </div>
          <div
            className={`p-4 rounded-lg border ${
              gaps.capabilitiesWithoutEfforts.length > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="text-sm font-medium">
              Vermogens zonder inspanningen
            </div>
            <div className="text-2xl font-bold mt-1">
              {gaps.capabilitiesWithoutEfforts.length}
            </div>
          </div>
        </div>
      </section>

      {/* AI Analyse resultaat */}
      {aiAnalysis && (
        <section>
          <h3 className="text-lg font-semibold text-cito-blue mb-3">
            AI-analyse
          </h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
            {aiAnalysis}
          </div>
        </section>
      )}
    </div>
  );
}
