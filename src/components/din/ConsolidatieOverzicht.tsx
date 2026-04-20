"use client";

import { useState } from "react";
import type { DINSession, DINCapability, DINEffort } from "@/lib/types";

interface ConsolidatieOverzichtProps {
  session: DINSession;
}

interface MergeGroup<T> {
  shared: T;
  originals: T[];
}

function buildCapGroups(session: DINSession): MergeGroup<DINCapability>[] {
  const groups: MergeGroup<DINCapability>[] = [];
  const activeCaps = session.capabilities.filter((c) => !c.consolidated);
  for (const cap of activeCaps) {
    const originals = session.capabilities.filter((c) => c.consolidatedInto === cap.id);
    if (originals.length > 0) groups.push({ shared: cap, originals });
  }
  return groups;
}

function buildEffortGroups(session: DINSession): MergeGroup<DINEffort>[] {
  const groups: MergeGroup<DINEffort>[] = [];
  const activeEfforts = session.efforts.filter((e) => !e.consolidated);
  for (const eff of activeEfforts) {
    const originals = session.efforts.filter((e) => e.consolidatedInto === eff.id);
    if (originals.length > 0) groups.push({ shared: eff, originals });
  }
  return groups;
}

const SECTOR_COLORS: Record<string, string> = {
  PO: "bg-blue-50 text-blue-700 border-blue-200",
  VO: "bg-purple-50 text-purple-700 border-purple-200",
  Zakelijk: "bg-orange-50 text-orange-700 border-orange-200",
};

function SectorPill({ sector }: { sector: string }) {
  const color = SECTOR_COLORS[sector] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
      {sector || "?"}
    </span>
  );
}

export default function ConsolidatieOverzicht({ session }: ConsolidatieOverzichtProps) {
  const [open, setOpen] = useState(true);

  const capGroups = buildCapGroups(session);
  const effortGroups = buildEffortGroups(session);

  if (capGroups.length === 0 && effortGroups.length === 0) return null;

  const totalOriginalCaps = capGroups.reduce((sum, g) => sum + g.originals.length, 0);
  const totalOriginalEfforts = effortGroups.reduce((sum, g) => sum + g.originals.length, 0);

  return (
    <div className="bg-gradient-to-br from-teal-50/70 via-white to-indigo-50/40 border border-teal-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-start gap-3 text-left">
          <div className="w-9 h-9 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-800">
                Consolidatie-overzicht na cross-analyse
              </h4>
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 border border-teal-200 rounded-full px-2 py-0.5">
                automatisch toegepast
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              {capGroups.length > 0 && (
                <>
                  <strong>{totalOriginalCaps}</strong> oorspronkelijke vermogens zijn samengevoegd tot{" "}
                  <strong>{capGroups.length}</strong> gedeeld vermogen{capGroups.length > 1 ? "s" : ""}
                </>
              )}
              {capGroups.length > 0 && effortGroups.length > 0 && " · "}
              {effortGroups.length > 0 && (
                <>
                  <strong>{totalOriginalEfforts}</strong> oorspronkelijke inspanningen tot{" "}
                  <strong>{effortGroups.length}</strong> gedeelde inspanning{effortGroups.length > 1 ? "en" : ""}
                </>
              )}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {/* Vermogens */}
          {capGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-2">
                Gedeelde vermogens
              </p>
              <div className="space-y-2.5">
                {capGroups.map((group) => (
                  <div
                    key={group.shared.id}
                    className="bg-white border border-teal-200 rounded-lg overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0">
                      {/* Voorheen */}
                      <div className="p-3 bg-gray-50 border-r border-gray-200">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Voorheen
                        </p>
                        <ul className="space-y-1.5">
                          {group.originals.map((o) => (
                            <li key={o.id} className="flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-700 leading-snug">
                                  {o.title || o.description}
                                </p>
                                <div className="mt-0.5">
                                  <SectorPill sector={o.sectorId || ""} />
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Arrow */}
                      <div className="hidden md:flex items-center justify-center px-2 bg-white">
                        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                      {/* Nieuw */}
                      <div className="p-3 bg-teal-50/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <p className="text-[9px] font-bold text-teal-700 uppercase tracking-wider">
                            Nu &mdash; gedeeld vermogen
                          </p>
                          {group.shared.relatedSectors && group.shared.relatedSectors.length > 0 && (
                            <span className="text-[9px] font-bold text-white bg-teal-600 rounded px-1 py-0.5">
                              {group.shared.relatedSectors.length} sectoren
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-semibold text-gray-900 leading-snug">
                          {group.shared.title || group.shared.description}
                        </p>
                        {group.shared.relatedSectors && group.shared.relatedSectors.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {group.shared.relatedSectors.map((s) => (
                              <SectorPill key={s} sector={s} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspanningen */}
          {effortGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                Gedeelde inspanningen
              </p>
              <div className="space-y-2.5">
                {effortGroups.map((group) => {
                  const sectors = (group.shared.responsibleSector ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return (
                    <div
                      key={group.shared.id}
                      className="bg-white border border-indigo-200 rounded-lg overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0">
                        <div className="p-3 bg-gray-50 border-r border-gray-200">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Voorheen
                          </p>
                          <ul className="space-y-1.5">
                            {group.originals.map((o) => (
                              <li key={o.id} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-gray-700 leading-snug">
                                    {o.title || o.description}
                                  </p>
                                  <div className="mt-0.5">
                                    <SectorPill sector={o.sectorId || ""} />
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="hidden md:flex items-center justify-center px-2 bg-white">
                          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                        <div className="p-3 bg-indigo-50/40">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                              Nu &mdash; gedeelde inspanning
                            </p>
                            {sectors.length > 0 && (
                              <span className="text-[9px] font-bold text-white bg-indigo-600 rounded px-1 py-0.5">
                                {sectors.length} sectoren
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] font-semibold text-gray-900 leading-snug">
                            {group.shared.title || group.shared.description}
                          </p>
                          {sectors.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {sectors.map((s) => (
                                <SectorPill key={s} sector={s} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[11px] text-gray-500 bg-white/60 border border-gray-200 rounded-lg p-2.5">
            <span className="font-semibold text-gray-700">Let op: </span>
            De oorspronkelijke items zijn niet verwijderd — ze zijn verborgen uit de DIN-mapping
            omdat ze nu onderdeel zijn van een gedeeld item. Je kunt een samenvoeging ongedaan maken
            in de cross-analyse (stap 4 &mdash; Consolidatie).
          </div>
        </div>
      )}
    </div>
  );
}
