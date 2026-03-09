"use client";

import { useState } from "react";
import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import {
  findSharedCapabilities,
  getEffortsByDomainAllSectors,
} from "@/lib/din-service";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import DINNetworkGraph from "@/components/din/DINNetworkGraph";

type ViewMode = "grafisch" | "tabel";

interface MergedDINViewProps {
  session: DINSession;
  onSwitchToEdit: () => void;
  onDeleteBenefit?: (id: string) => void;
  onDeleteCapability?: (id: string) => void;
  onDeleteEffort?: (id: string) => void;
}

function SectorBadge({ sector }: { sector: string }) {
  const colors =
    SECTOR_COLORS[sector as SectorName] ||
    "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}
    >
      {sector}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  gepland: "bg-gray-100 text-gray-600",
  in_uitvoering: "bg-green-100 text-green-700",
  afgerond: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
};

const STATUS_TEXT: Record<string, string> = {
  gepland: "Gepland",
  in_uitvoering: "Actief",
  afgerond: "Afgerond",
  on_hold: "On hold",
};

export default function MergedDINView({
  session,
  onSwitchToEdit,
  onDeleteBenefit,
  onDeleteCapability,
  onDeleteEffort,
}: MergedDINViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grafisch");
  const sharedCaps = findSharedCapabilities(session.capabilities);
  const effortsByDomain = getEffortsByDomainAllSectors(session.efforts);

  const sectorsWithData = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  if (sectorsWithData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-gray-500 mb-1 font-medium">
          Nog geen DIN-data ingevuld
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Vul eerst per sector het DIN-netwerk in.
        </p>
        <button
          onClick={onSwitchToEdit}
          className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
        >
          Per Sector Invullen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-cito-blue">
            Samengevoegd DIN-Netwerk
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {sectorsWithData.length}/{SECTORS.length} sectoren &middot;{" "}
            {session.benefits.length} baten &middot;{" "}
            {session.capabilities.length} vermogens &middot;{" "}
            {session.efforts.length} inspanningen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-md">
            <button
              onClick={() => setViewMode("grafisch")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "grafisch"
                  ? "bg-white text-cito-blue shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Grafisch
            </button>
            <button
              onClick={() => setViewMode("tabel")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "tabel"
                  ? "bg-white text-cito-blue shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tabel
            </button>
          </div>
          <button
            onClick={onSwitchToEdit}
            className="px-3 py-1.5 text-sm text-cito-blue border border-cito-blue rounded-lg hover:bg-blue-50"
          >
            Per Sector bewerken
          </button>
        </div>
      </div>

      {/* Grafische weergave */}
      {viewMode === "grafisch" && <DINNetworkGraph session={session} />}

      {/* Tabel weergave */}
      {viewMode === "tabel" && (
        <>
          {session.goals
            .sort((a, b) => a.rank - b.rank)
            .map((goal) => {
              const goalBenefits = session.benefits.filter(
                (b) => b.goalId === goal.id
              );
              const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));
              const relatedCapIds = new Set(
                session.benefitCapabilityMaps
                  .filter((m) => goalBenefitIds.has(m.benefitId))
                  .map((m) => m.capabilityId)
              );
              const goalCapabilities =
                relatedCapIds.size > 0
                  ? session.capabilities.filter((c) =>
                      relatedCapIds.has(c.id)
                    )
                  : session.capabilities.filter((c) =>
                      goalBenefits.some((b) => b.sectorId === c.sectorId)
                    );

              const relatedCapIdSet = new Set(
                goalCapabilities.map((c) => c.id)
              );
              const relatedEffortIds = new Set(
                session.capabilityEffortMaps
                  .filter((m) => relatedCapIdSet.has(m.capabilityId))
                  .map((m) => m.effortId)
              );
              const goalEfforts =
                relatedEffortIds.size > 0
                  ? session.efforts.filter((e) => relatedEffortIds.has(e.id))
                  : session.efforts.filter((e) =>
                      goalBenefits.some((b) => b.sectorId === e.sectorId)
                    );

              return (
                <div
                  key={goal.id}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white"
                >
                  {/* Doel header */}
                  <div className="bg-din-doelen/10 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-din-doelen text-white flex items-center justify-center text-xs font-bold">
                      {goal.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-cito-blue">
                        {goal.name}
                      </div>
                      {goal.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {goal.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 text-[10px]">
                      <span className="bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">
                        {goalBenefits.length} baten
                      </span>
                      <span className="bg-din-vermogens/10 text-din-vermogens px-1.5 py-0.5 rounded font-medium">
                        {goalCapabilities.length} verm.
                      </span>
                      <span className="bg-din-inspanningen/10 text-din-inspanningen px-1.5 py-0.5 rounded font-medium">
                        {goalEfforts.length} insp.
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Baten */}
                    <div>
                      <h4 className="text-xs font-semibold text-din-baten uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-din-baten" />
                        Baten
                      </h4>
                      {goalBenefits.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          Geen baten voor dit doel
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {goalBenefits.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-start gap-2 text-sm group py-1 px-2 rounded hover:bg-gray-50"
                            >
                              <SectorBadge sector={b.sectorId} />
                              <span className="text-gray-700 flex-1 text-xs">
                                {b.description || "(naamloos)"}
                              </span>
                              {b.profiel.indicator && (
                                <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                                  {b.profiel.indicator}:{" "}
                                  {b.profiel.currentValue} {"\u2192"}{" "}
                                  {b.profiel.targetValue}
                                </span>
                              )}
                              {onDeleteBenefit && (
                                <button
                                  onClick={() => onDeleteBenefit(b.id)}
                                  className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  title="Verwijder baat"
                                >
                                  {"\u2715"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vermogens */}
                    <div>
                      <h4 className="text-xs font-semibold text-din-vermogens uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-din-vermogens" />
                        Vermogens
                      </h4>
                      {goalCapabilities.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          Geen vermogens gekoppeld
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {goalCapabilities.map((c) => {
                            const isShared = sharedCaps.has(c.id);
                            const sharedSectors = sharedCaps.get(c.id);
                            return (
                              <div
                                key={c.id}
                                className={`flex items-start gap-2 text-sm p-2 rounded group ${
                                  isShared
                                    ? "bg-amber-50 border border-amber-200"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <SectorBadge sector={c.sectorId} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-gray-700 text-xs">
                                    {c.description || "(naamloos)"}
                                  </span>
                                  {(c.currentLevel || c.targetLevel) && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {c.currentLevel && (
                                        <span className="text-[10px] text-amber-600">
                                          Nu: {c.currentLevel}/5
                                        </span>
                                      )}
                                      {c.targetLevel && (
                                        <span className="text-[10px] text-green-600">
                                          Doel: {c.targetLevel}/5
                                        </span>
                                      )}
                                      {c.currentLevel &&
                                        c.targetLevel &&
                                        c.targetLevel > c.currentLevel && (
                                          <span
                                            className={`text-[10px] px-1 rounded font-medium ${
                                              c.targetLevel - c.currentLevel >=
                                              3
                                                ? "bg-red-100 text-red-700"
                                                : c.targetLevel -
                                                      c.currentLevel >=
                                                    2
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-green-100 text-green-700"
                                            }`}
                                          >
                                            +{c.targetLevel - c.currentLevel}
                                          </span>
                                        )}
                                    </div>
                                  )}
                                </div>
                                {isShared && sharedSectors && (
                                  <span className="ml-auto flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                      Synergie
                                    </span>
                                    {sharedSectors
                                      .filter((s) => s !== c.sectorId)
                                      .map((s) => (
                                        <SectorBadge key={s} sector={s} />
                                      ))}
                                  </span>
                                )}
                                {onDeleteCapability && (
                                  <button
                                    onClick={() => onDeleteCapability(c.id)}
                                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Verwijder vermogen"
                                  >
                                    {"\u2715"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Inspanningen per domein */}
                    <div>
                      <h4 className="text-xs font-semibold text-din-inspanningen uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-din-inspanningen" />
                        Inspanningen per domein
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          Object.entries(DOMAIN_LABELS) as [
                            EffortDomain,
                            string,
                          ][]
                        ).map(([domain, label]) => {
                          const domainEfforts = goalEfforts.filter(
                            (e) => e.domain === domain
                          );
                          return (
                            <div key={domain}>
                              <div className="text-[10px] font-medium text-gray-500 mb-1">
                                {label}{" "}
                                {domainEfforts.length > 0 && (
                                  <span className="text-gray-400">
                                    ({domainEfforts.length})
                                  </span>
                                )}
                              </div>
                              {domainEfforts.length === 0 ? (
                                <p className="text-[10px] text-gray-300 italic">
                                  {"\u2014"}
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {domainEfforts.map((e) => (
                                    <div
                                      key={e.id}
                                      className="flex items-center gap-1.5 text-xs group py-0.5 px-1 rounded hover:bg-gray-50"
                                    >
                                      <SectorBadge sector={e.sectorId} />
                                      <span className="text-gray-600 flex-1 text-[11px]">
                                        {e.description || "(naamloos)"}
                                      </span>
                                      {e.quarter && (
                                        <span className="text-[10px] text-gray-400 shrink-0">
                                          {e.quarter}
                                        </span>
                                      )}
                                      {e.status && e.status !== "gepland" && (
                                        <span
                                          className={`text-[9px] px-1 rounded shrink-0 ${STATUS_STYLES[e.status] || ""}`}
                                        >
                                          {STATUS_TEXT[e.status] || e.status}
                                        </span>
                                      )}
                                      {onDeleteEffort && (
                                        <button
                                          onClick={() => onDeleteEffort(e.id)}
                                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                          title="Verwijder inspanning"
                                        >
                                          {"\u2715"}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Totaaloverzicht per domein */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <h3 className="text-sm font-semibold text-cito-blue mb-4">
              Totaaloverzicht inspanningen per domein
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {(
                Object.entries(effortsByDomain) as [
                  EffortDomain,
                  typeof session.efforts,
                ][]
              ).map(([domain, efforts]) => {
                const maxCount = Math.max(
                  ...Object.values(effortsByDomain).map((e) => e.length),
                  1
                );
                const pct = Math.round((efforts.length / maxCount) * 100);

                return (
                  <div key={domain} className="text-center">
                    <div className="text-2xl font-bold text-cito-blue">
                      {efforts.length}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {DOMAIN_LABELS[domain]}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            domain === "mens"
                              ? "#3b82f6"
                              : domain === "processen"
                                ? "#10b981"
                                : domain === "data_systemen"
                                  ? "#8b5cf6"
                                  : "#f59e0b",
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {SECTORS.map((s) => {
                        const count = efforts.filter(
                          (e) => e.sectorId === s
                        ).length;
                        if (count === 0) return null;
                        return (
                          <span key={s} className="text-[9px] text-gray-400">
                            {s}: {count}
                          </span>
                        );
                      })}
                    </div>
                    {efforts.length === 0 && (
                      <div className="text-[10px] text-red-400 mt-1">
                        Ontbreekt
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
