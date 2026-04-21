"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, Stap4Result, EffortDomain } from "@/lib/types";
import type { SubEffortAdvies } from "@/lib/schemas";

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; border: string; text: string }> = {
  mens: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  processen: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  cultuur: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
};

export default function StapOptimaliseren({
  session,
  stap4Result,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
}): React.ReactElement {
  const { updateSession } = useSession();
  const [entries, setEntries] = useState<SubEffortAdvies[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (stap4Result?.subEffortAnalysis) {
      setEntries(JSON.parse(JSON.stringify(stap4Result.subEffortAnalysis)));
    }
  }, [stap4Result]);

  if (!stap4Result?.subEffortAnalysis || stap4Result.subEffortAnalysis.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-600">
          Nog geen geconsolideerde cross-sectorale inspanningen om te optimaliseren.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Draai eerst stap 4 (Inspanningen) om per domein cross-sectorale inspanningen te genereren.
        </p>
      </div>
    );
  }

  function updateEntry(idx: number, updater: (e: SubEffortAdvies) => SubEffortAdvies) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? updater(e) : e)));
    setSavedIndex(null);
  }

  async function saveEntry(idx: number) {
    setSavingIndex(idx);
    const updated = entries[idx];
    await new Promise((r) => setTimeout(r, 100));
    updateSession((prev) => {
      if (!prev.crossAnalyseWizard?.stepResults?.stap4) return prev;
      const newSubEffort = [...(prev.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis ?? [])];
      newSubEffort[idx] = updated;
      return {
        ...prev,
        crossAnalyseWizard: {
          ...prev.crossAnalyseWizard,
          stepResults: {
            ...prev.crossAnalyseWizard.stepResults,
            stap4: {
              ...prev.crossAnalyseWizard.stepResults.stap4,
              subEffortAnalysis: newSubEffort,
            },
          },
        },
      };
    });
    setSavingIndex(null);
    setSavedIndex(idx);
    setTimeout(() => setSavedIndex(null), 2500);
  }

  // Groepeer entries per groepId → domein
  const grouped = new Map<string, SubEffortAdvies[]>();
  entries.forEach((e) => {
    const list = grouped.get(e.groepId) ?? [];
    list.push(e);
    grouped.set(e.groepId, list);
  });

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          Hier kun je de cross-sectorale inspanningen uit stap 4 verfijnen voordat ze in de eindview belanden.
          Per domein staan de geconsolideerde inspanningen — pas titel, beschrijving, beargumentatie en dossier-velden aan.
        </p>
      </div>

      {Array.from(grouped.entries()).map(([groepId, groepEntries]) => (
        <div key={groepId} className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            Groep: {groepId}
          </h4>
          {groepEntries.map((entry) => {
            const idx = entries.findIndex((e) => e === entry);
            const colors = DOMAIN_COLORS[entry.domein];
            const isSaving = savingIndex === idx;
            const isSaved = savedIndex === idx;
            return (
              <div
                key={`${groepId}-${entry.domein}`}
                className={`border ${colors.border} ${colors.bg} rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                    {DOMAIN_LABELS[entry.domein]}
                  </p>
                  <span className="text-[10px] text-gray-500">
                    {entry.actie === "combineren" ? "Combineren" : "Apart"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={entry.titel ?? ""}
                      onChange={(e) =>
                        updateEntry(idx, (v) => ({ ...v, titel: e.target.value }))
                      }
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      placeholder="Sectoroverstijgende inspanningstitel"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      Beschrijving
                    </label>
                    <textarea
                      value={entry.beschrijving ?? ""}
                      onChange={(e) =>
                        updateEntry(idx, (v) => ({ ...v, beschrijving: e.target.value }))
                      }
                      rows={3}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      placeholder="Wat houdt deze cross-sectorale inspanning in?"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      Beargumentatie (Waarom cross-sectoraal?)
                    </label>
                    <textarea
                      value={entry.beargumentatie ?? ""}
                      onChange={(e) =>
                        updateEntry(idx, (v) => ({ ...v, beargumentatie: e.target.value }))
                      }
                      rows={3}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      placeholder="Waarom deze drie sectoren gezamenlijk aanpakken?"
                    />
                  </div>

                  <details className="bg-white border border-gray-200 rounded p-3">
                    <summary className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer">
                      Dossier (opdrachtgever / kostenraming / …)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {([
                        ["eigenaar", "Opdrachtgever / eigenaar"],
                        ["inspanningsleider", "Inspanningsleider"],
                        ["verwachtResultaat", "Verwacht resultaat"],
                        ["kostenraming", "Kostenraming"],
                        ["randvoorwaarden", "Randvoorwaarden"],
                      ] as const).map(([key, label]) => (
                        <div key={key}>
                          <label className="text-[10px] font-semibold text-gray-500">{label}</label>
                          <input
                            type="text"
                            value={entry.dossier?.[key] ?? ""}
                            onChange={(e) =>
                              updateEntry(idx, (v) => ({
                                ...v,
                                dossier: {
                                  eigenaar: v.dossier?.eigenaar ?? "",
                                  inspanningsleider: v.dossier?.inspanningsleider ?? "",
                                  verwachtResultaat: v.dossier?.verwachtResultaat ?? "",
                                  kostenraming: v.dossier?.kostenraming ?? "",
                                  randvoorwaarden: v.dossier?.randvoorwaarden ?? "",
                                  [key]: e.target.value,
                                },
                              }))
                            }
                            className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </details>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {isSaved && (
                      <span className="text-[11px] text-green-700 font-medium">Opgeslagen ✓</span>
                    )}
                    <button
                      onClick={() => saveEntry(idx)}
                      disabled={isSaving}
                      className="text-xs px-3 py-1.5 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
                    >
                      {isSaving ? "Opslaan..." : "Opslaan"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
