"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import type { SectorName, EffortDomain } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";

export default function SectorIntegratieStep() {
  const { session } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<Record<string, string>>({});

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

  const effortsByDomain = (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map(
    (domain) => ({
      domain,
      label: DOMAIN_LABELS[domain],
      efforts: sectorEfforts.filter((e) => e.domain === domain),
    })
  );

  // Dekking: hoeveel doelen hebben DIN-items voor deze sector?
  const goalsWithDIN = session.goals.filter((g) =>
    session.benefits.some(
      (b) => b.goalId === g.id && b.sectorId === activeSector
    )
  );
  const goalsWithoutDIN = session.goals.filter(
    (g) =>
      !session.benefits.some(
        (b) => b.goalId === g.id && b.sectorId === activeSector
      )
  );

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

  return (
    <div className="space-y-6">
      {/* Uitleg */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Doel:</strong> Bekijk per sector hoe de KiB-doelen via het
        DIN-netwerk geïntegreerd worden in het sectorplan. De AI geeft advies
        over hoe het DIN toe te passen zodat het aansluit bij het bestaande
        sectorplan.
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const hasDIN =
            session.benefits.some((b) => b.sectorId === sector) ||
            session.efforts.some((e) => e.sectorId === sector);
          return (
            <button
              key={sector}
              onClick={() => setActiveSector(sector)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSector === sector
                  ? "border-cito-blue text-cito-blue"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {sector}
              {hasDIN && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dekking-overzicht */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">
            {goalsWithDIN.length}/{session.goals.length}
          </div>
          <div className="text-xs text-gray-600">Doelen met DIN-invulling</div>
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

      {/* Doelen zonder DIN */}
      {goalsWithoutDIN.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-1">
            Doelen zonder DIN-invulling voor {activeSector}
          </h4>
          <ul className="text-sm text-yellow-700 space-y-0.5">
            {goalsWithoutDIN.map((g) => (
              <li key={g.id}>
                • {g.rank}. {g.name}
              </li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600 mt-2 italic">
            Ga naar stap 2 (DIN-Mapping) om baten, vermogens en inspanningen
            toe te voegen voor deze doelen.
          </p>
        </div>
      )}

      {/* Sectorplan + AI advies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-cito-blue">
            Sectorplan: {activeSector}
          </h4>
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

        {sectorPlan ? (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-10">
              {sectorPlan.rawText}
            </p>
            {sectorPlan.rawText.length > 500 && (
              <details className="mt-2">
                <summary className="text-xs text-cito-blue cursor-pointer">
                  Volledig sectorplan tonen
                </summary>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                  {sectorPlan.rawText}
                </p>
              </details>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
            Geen sectorplan geüpload voor {activeSector}. Upload in stap 1.
          </div>
        )}

        {/* AI Advies */}
        {aiAdvice[activeSector] && (
          <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-cito-blue mb-2">
              AI Advies: DIN-integratie in sectorplan {activeSector}
            </h4>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {aiAdvice[activeSector]}
            </div>
          </div>
        )}
      </section>

      {/* Baten */}
      <section>
        <h4 className="text-sm font-semibold text-cito-blue mb-2">
          Baten voor {activeSector} ({sectorBenefits.length})
        </h4>
        {sectorBenefits.length > 0 ? (
          <div className="space-y-2">
            {sectorBenefits.map((b) => {
              const goal = session.goals.find((g) => g.id === b.goalId);
              return (
                <div
                  key={b.id}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm"
                >
                  <div className="font-medium">
                    {b.title || b.description || "(naamloos)"}
                  </div>
                  {goal && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Doel: {goal.name}
                    </div>
                  )}
                  {b.profiel.indicator && (
                    <div className="text-xs text-gray-500">
                      Indicator: {b.profiel.indicator} (nu:{" "}
                      {b.profiel.currentValue} → doel: {b.profiel.targetValue})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Geen baten voor {activeSector}.
          </p>
        )}
      </section>

      {/* Vermogens */}
      <section>
        <h4 className="text-sm font-semibold text-cito-blue mb-2">
          Vermogens voor {activeSector} ({sectorCapabilities.length})
        </h4>
        {sectorCapabilities.length > 0 ? (
          <ul className="space-y-1">
            {sectorCapabilities.map((c) => (
              <li
                key={c.id}
                className="p-2 bg-cyan-50 border border-cyan-100 rounded text-sm"
              >
                {c.title || c.description || "(naamloos)"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Geen vermogens voor {activeSector}.
          </p>
        )}
      </section>

      {/* Inspanningen per domein */}
      <section>
        <h4 className="text-sm font-semibold text-cito-blue mb-2">
          Inspanningen voor {activeSector} ({sectorEfforts.length})
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {effortsByDomain.map(({ domain, label, efforts }) => (
            <div
              key={domain}
              className="border border-gray-200 rounded-lg p-3"
            >
              <div className="text-xs font-semibold text-gray-600 mb-2">
                {label} ({efforts.length})
              </div>
              {efforts.length > 0 ? (
                <ul className="space-y-1">
                  {efforts.map((e) => (
                    <li key={e.id} className="text-sm text-gray-700">
                      • {e.title || e.description || "(naamloos)"}
                      {e.quarter && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({e.quarter})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic">Geen</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
