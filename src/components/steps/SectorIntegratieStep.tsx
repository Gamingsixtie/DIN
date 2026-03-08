"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import type { SectorName, EffortDomain } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";

export default function SectorIntegratieStep() {
  const { session } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");

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

  // Groepeer inspanningen per domein
  const effortsByDomain = (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map(
    (domain) => ({
      domain,
      label: DOMAIN_LABELS[domain],
      efforts: sectorEfforts.filter((e) => e.domain === domain),
    })
  );

  return (
    <div className="space-y-6">
      {/* Sector tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => (
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
          </button>
        ))}
      </div>

      {/* Sectorplan samenvatting */}
      {sectorPlan ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Origineel sectorplan: {activeSector}
          </h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
            {sectorPlan.rawText}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
          Geen sectorplan geüpload voor {activeSector}. Upload in stap 1.
        </div>
      )}

      {/* Baten voor deze sector */}
      <section>
        <h4 className="text-sm font-semibold text-cito-blue mb-2">
          Baten die {activeSector} raken ({sectorBenefits.length})
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
                  <div className="font-medium">{b.description || "(naamloos)"}</div>
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

      {/* Vermogens voor deze sector */}
      <section>
        <h4 className="text-sm font-semibold text-cito-blue mb-2">
          Vermogens die {activeSector} moet ontwikkelen (
          {sectorCapabilities.length})
        </h4>
        {sectorCapabilities.length > 0 ? (
          <ul className="space-y-1">
            {sectorCapabilities.map((c) => (
              <li
                key={c.id}
                className="p-2 bg-cyan-50 border border-cyan-100 rounded text-sm"
              >
                {c.description || "(naamloos)"}
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
            <div key={domain} className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                {label} ({efforts.length})
              </div>
              {efforts.length > 0 ? (
                <ul className="space-y-1">
                  {efforts.map((e) => (
                    <li key={e.id} className="text-sm text-gray-700">
                      • {e.description || "(naamloos)"}
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
