"use client";

import { useState, useEffect } from "react";
import type { DINSession, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import { useSession } from "@/lib/session-context";
import ExterneProjectenPanel from "@/components/din/ExterneProjectenPanel";

interface StapLopendeProjectenProps {
  session: DINSession;
  onComplete: () => void;
}

export default function StapLopendeProjecten({ session, onComplete }: StapLopendeProjectenProps) {
  const { updateSession } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");

  // Auto-complete: stap is altijd doorloopbaar (data-invoer, geen AI)
  useEffect(() => {
    onComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allProjects = session.externalProjects || [];
  const activeProjects = allProjects.filter((p) => !p.promotedAt);
  const promotedProjects = allProjects.filter((p) => !!p.promotedAt);

  const projectCountPerSector = SECTORS.reduce((acc, s) => {
    acc[s] = activeProjects.filter((p) => p.sectorId === s).length;
    return acc;
  }, {} as Record<SectorName, number>);

  const totalActive = activeProjects.length;

  return (
    <div className="space-y-4">
      {/* Samenvatting */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cito-blue/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">
              {totalActive} lopend{totalActive !== 1 ? "e" : ""} project{totalActive !== 1 ? "en" : ""}
            </span>
            <span className="text-xs text-gray-400 ml-2">
              ({SECTORS.map((s) => `${s}: ${projectCountPerSector[s]}`).join(" · ")})
            </span>
          </div>
        </div>
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SECTORS.map((sector) => {
          const isActive = sector === activeSector;
          const count = projectCountPerSector[sector];
          return (
            <button
              key={sector}
              type="button"
              onClick={() => setActiveSector(sector)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                isActive
                  ? "text-cito-blue"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: SECTOR_COLORS[sector] }}
                />
                {sector}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-cito-blue/10 text-cito-blue"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cito-blue rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ExterneProjectenPanel per actieve sector */}
      <ExterneProjectenPanel
        currentSector={activeSector}
        projects={activeProjects.filter((p) => p.sectorId === activeSector)}
        promotedProjects={promotedProjects.filter((p) => p.sectorId === activeSector)}
        onAddProjects={(newProjects) => {
          updateSession((prev) => ({
            externalProjects: [
              ...(prev.externalProjects || []),
              ...newProjects,
            ],
          }));
        }}
        onUpdate={(updated) => {
          updateSession((prev) => ({
            externalProjects: (prev.externalProjects || []).map((p) =>
              p.id === updated.id ? updated : p
            ),
          }));
        }}
        onDelete={(id) => {
          updateSession((prev) => ({
            externalProjects: (prev.externalProjects || []).filter((p) => p.id !== id),
          }));
        }}
        capabilities={(session.capabilities || []).filter(
          (c) => c.sectorId === activeSector && !c.consolidated
        )}
        existingMaps={session.projectCapabilityMaps || []}
        onConfirmMappings={(newMaps) => {
          updateSession((prev) => ({
            projectCapabilityMaps: [
              ...(prev.projectCapabilityMaps || []).filter(
                (m) => !newMaps.some((nm) => nm.projectId === m.projectId)
              ),
              ...newMaps,
            ],
          }));
        }}
      />

      {/* Hint */}
      <p className="text-xs text-gray-400 italic">
        Voeg lopende projecten toe per sector. Deze worden meegenomen in de volgende analysestappen.
        U kunt altijd terugkeren naar deze stap om projecten aan te passen.
      </p>
    </div>
  );
}
