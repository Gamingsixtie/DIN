"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import type { SectorName, EffortDomain } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";

type ApprovalStatus = "voorstel" | "goedgekeurd" | "afgewezen" | "aangepast";

const QUARTERS = [
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
  "Q1 2027",
  "Q2 2027",
];

export default function PrioriteringStep() {
  const { session, updateSession } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");

  if (!session) return null;

  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === activeSector
  );

  function updateEffortStatus(
    effortId: string,
    status: ApprovalStatus
  ) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === effortId
          ? {
              ...e,
              status:
                status === "goedgekeurd"
                  ? "gepland"
                  : status === "afgewezen"
                  ? "on_hold"
                  : e.status,
            }
          : e
      ),
    });
  }

  function updateQuarter(effortId: string, quarter: string) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === effortId ? { ...e, quarter } : e
      ),
    });
  }

  // Groepeer per kwartaal voor tijdlijn
  const effortsByQuarter = QUARTERS.map((q) => ({
    quarter: q,
    efforts: session.efforts.filter((e) => e.quarter === q),
  }));

  return (
    <div className="space-y-8">
      {/* Uitleg */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Werkwijze:</strong> Elke sector stelt inspanningen voor met
        planning. De programma-eigenaar keurt het voorstel goed, wijst af, of
        vraagt aanpassing.
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const count = session.efforts.filter(
            (e) => e.sectorId === sector
          ).length;
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
              {sector} ({count})
            </button>
          );
        })}
      </div>

      {/* Inspanningen per sector met goedkeuring */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Inspanningen {activeSector} — voorstel & goedkeuring
        </h3>

        {sectorEfforts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Geen inspanningen voor {activeSector}. Voeg ze toe in stap 2.
          </p>
        ) : (
          <div className="space-y-3">
            {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
              const domainEfforts = sectorEfforts.filter(
                (e) => e.domain === domain
              );
              if (domainEfforts.length === 0) return null;
              return (
                <div key={domain}>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    {DOMAIN_LABELS[domain]}
                  </h4>
                  {domainEfforts.map((effort) => (
                    <div
                      key={effort.id}
                      className={`p-4 rounded-lg border mb-2 ${
                        effort.status === "gepland"
                          ? "border-green-200 bg-green-50"
                          : effort.status === "on_hold"
                          ? "border-red-200 bg-red-50"
                          : effort.status === "in_uitvoering"
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {effort.description || "(naamloos)"}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <select
                              value={effort.quarter || ""}
                              onChange={(e) =>
                                updateQuarter(effort.id, e.target.value)
                              }
                              className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none"
                            >
                              <option value="">Kwartaal...</option>
                              {QUARTERS.map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                effort.status === "gepland"
                                  ? "bg-green-100 text-green-700"
                                  : effort.status === "on_hold"
                                  ? "bg-red-100 text-red-700"
                                  : effort.status === "in_uitvoering"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {effort.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() =>
                              updateEffortStatus(effort.id, "goedgekeurd")
                            }
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Goedkeuren"
                          >
                            Goedkeuren
                          </button>
                          <button
                            onClick={() =>
                              updateEffortStatus(effort.id, "afgewezen")
                            }
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Afwijzen"
                          >
                            Afwijzen
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tijdlijn — alle sectoren */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Tijdlijn — alle sectoren
        </h3>
        <div className="grid grid-cols-6 gap-2">
          {effortsByQuarter.map(({ quarter, efforts }) => (
            <div
              key={quarter}
              className="border border-gray-200 rounded-lg p-3 min-h-[120px]"
            >
              <div className="text-xs font-semibold text-gray-500 mb-2">
                {quarter}
              </div>
              <div className="space-y-1">
                {efforts
                  .filter((e) => e.status !== "on_hold")
                  .map((e) => (
                    <div
                      key={e.id}
                      className={`text-xs p-1.5 rounded ${
                        e.domain === "mens"
                          ? "bg-domain-mens/10 text-domain-mens"
                          : e.domain === "processen"
                          ? "bg-domain-processen/10 text-domain-processen"
                          : e.domain === "data_systemen"
                          ? "bg-domain-data/10 text-domain-data"
                          : "bg-domain-cultuur/10 text-domain-cultuur"
                      }`}
                    >
                      <span className="font-medium">[{e.sectorId}]</span>{" "}
                      {e.description || "(naamloos)"}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
