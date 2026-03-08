"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import type { EffortDomain } from "@/lib/types";

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
  const [remainingVotes, setRemainingVotes] = useState(10);

  if (!session) return null;

  const sortedEfforts = [...session.efforts].sort(
    (a, b) => (b.votes || 0) - (a.votes || 0)
  );

  function handleVote(effortId: string) {
    if (remainingVotes <= 0) return;
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === effortId ? { ...e, votes: (e.votes || 0) + 1 } : e
      ),
    });
    setRemainingVotes((v) => v - 1);
  }

  function resetVotes() {
    updateSession({
      efforts: session!.efforts.map((e) => ({ ...e, votes: 0 })),
    });
    setRemainingVotes(10);
  }

  function updateQuarter(effortId: string, quarter: string) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === effortId ? { ...e, quarter } : e
      ),
    });
  }

  // Groepeer inspanningen per kwartaal voor tijdlijn
  const effortsByQuarter = QUARTERS.map((q) => ({
    quarter: q,
    efforts: session.efforts.filter((e) => e.quarter === q),
  }));

  return (
    <div className="space-y-8">
      {/* Dot Voting */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-cito-blue">
            Dot Voting op Inspanningen
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Resterende stemmen:{" "}
              <span className="font-bold text-cito-blue">{remainingVotes}</span>
            </span>
            <button
              onClick={resetVotes}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {sortedEfforts.map((effort) => (
            <div
              key={effort.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              <button
                onClick={() => handleVote(effort.id)}
                disabled={remainingVotes <= 0}
                className="w-8 h-8 rounded-full bg-cito-blue text-white text-sm font-bold flex items-center justify-center hover:bg-cito-blue-light disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                +
              </button>
              <div className="flex items-center gap-2 min-w-[3rem]">
                <span className="text-lg font-bold text-cito-blue">
                  {effort.votes || 0}
                </span>
                {Array.from({ length: effort.votes || 0 }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block w-2 h-2 rounded-full bg-cito-blue"
                  />
                ))}
              </div>
              <div className="flex-1">
                <span className="text-sm">
                  {effort.description || "(naamloos)"}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  [{DOMAIN_LABELS[effort.domain]}] [{effort.sectorId}]
                </span>
              </div>
              <select
                value={effort.quarter || ""}
                onChange={(e) => updateQuarter(effort.id, e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none"
              >
                <option value="">Kwartaal...</option>
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {session.efforts.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              Nog geen inspanningen. Voeg ze toe in stap 2 (DIN-Mapping).
            </p>
          )}
        </div>
      </section>

      {/* Tijdlijn */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Tijdlijn
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
                {efforts.map((e) => (
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
