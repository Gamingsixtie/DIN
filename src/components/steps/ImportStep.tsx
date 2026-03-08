"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { PMCEntry, Priority, SectorPlan } from "@/lib/types";
import { SECTORS } from "@/lib/types";
import { importFromKiB } from "@/lib/kib-import";
import { generateId } from "@/lib/din-service";

export default function ImportStep() {
  const { session, updateSession } = useSession();
  const [kibJson, setKibJson] = useState("");
  const [kibStatus, setKibStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [kibError, setKibError] = useState("");

  // PMC state
  const [newProduct, setNewProduct] = useState("");
  const [newMarket, setNewMarket] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("midden");

  if (!session) return null;

  function handleKibImport() {
    try {
      const result = importFromKiB(kibJson);
      updateSession({
        vision: result.vision || session!.vision,
        goals: result.goals.length > 0 ? result.goals : session!.goals,
        scope: result.scope || session!.scope,
      });
      setKibStatus("success");
      setKibError("");
    } catch (e) {
      setKibStatus("error");
      setKibError(e instanceof Error ? e.message : "Onbekende fout");
    }
  }

  function handleSectorUpload(sectorName: string, text: string) {
    const plan: SectorPlan = {
      id: generateId(),
      sectorName,
      rawText: text,
      uploadedAt: new Date().toISOString(),
    };
    const existing = session!.sectorPlans.filter(
      (s) => s.sectorName !== sectorName
    );
    updateSession({ sectorPlans: [...existing, plan] });
  }

  function handleAddPMC() {
    if (!newProduct.trim() || !newMarket.trim()) return;
    const pmc: PMCEntry = {
      id: generateId(),
      product: newProduct.trim(),
      marketSegment: newMarket.trim(),
      priority: newPriority,
    };
    updateSession({ pmcEntries: [...session!.pmcEntries, pmc] });
    setNewProduct("");
    setNewMarket("");
    setNewPriority("midden");
  }

  function handleRemovePMC(id: string) {
    updateSession({
      pmcEntries: session!.pmcEntries.filter((p) => p.id !== id),
    });
  }

  return (
    <div className="space-y-8">
      {/* A. KiB Import */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          KiB Import
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Plak de JSON-export uit Klant in Beeld om visie, doelen en scope te
          importeren.
        </p>
        <textarea
          value={kibJson}
          onChange={(e) => setKibJson(e.target.value)}
          placeholder='{"visie": {"uitgebreid": "...", "beknopt": "..."}, "doelen": [...], "scope": {"binnen": [...], "buiten": [...]}}'
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={handleKibImport}
            disabled={!kibJson.trim()}
            className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Importeer
          </button>
          {kibStatus === "success" && (
            <span className="text-sm text-green-600">Succesvol geïmporteerd</span>
          )}
          {kibStatus === "error" && (
            <span className="text-sm text-red-600">{kibError}</span>
          )}
        </div>

        {/* Geïmporteerde data tonen */}
        {session.vision && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-sm text-cito-blue">Visie</h4>
            <p className="text-sm text-gray-700 mt-1">{session.vision.beknopt}</p>
          </div>
        )}
        {session.goals.length > 0 && (
          <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-sm text-cito-blue">
              Doelen ({session.goals.length})
            </h4>
            <ol className="mt-2 space-y-1">
              {session.goals
                .sort((a, b) => a.rank - b.rank)
                .map((g) => (
                  <li key={g.id} className="text-sm text-gray-700">
                    {g.rank}. {g.name}
                  </li>
                ))}
            </ol>
          </div>
        )}
        {session.scope && (
          <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-sm text-cito-blue">Scope</h4>
            <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-600 font-medium">Binnen scope:</span>
                <ul className="mt-1 space-y-0.5">
                  {session.scope.inScope.map((s, i) => (
                    <li key={i} className="text-gray-700">• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-red-500 font-medium">Buiten scope:</span>
                <ul className="mt-1 space-y-0.5">
                  {session.scope.outScope.map((s, i) => (
                    <li key={i} className="text-gray-700">• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* B. Sectorplannen */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Sectorplannen
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Upload of plak het sectorplan per sector. De DIN-invulling verschilt
          per sector.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {SECTORS.map((sector) => {
            const existing = session.sectorPlans.find(
              (s) => s.sectorName === sector
            );
            return (
              <div
                key={sector}
                className={`p-4 rounded-lg border ${
                  existing
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{sector}</h4>
                  {existing && (
                    <span className="text-xs text-green-600">Uploaded</span>
                  )}
                </div>
                <textarea
                  placeholder={`Plak ${sector}-sectorplan hier...`}
                  className="w-full h-20 px-2 py-1.5 border border-gray-200 rounded text-xs resize-y focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                  defaultValue={existing?.rawText || ""}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      handleSectorUpload(sector, e.target.value.trim());
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* C. Product-Marktcombinaties */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Product-Marktcombinaties
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Welke producten/diensten voor welke marktsegmenten?
        </p>

        {session.pmcEntries.length > 0 && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Marktsegment</th>
                <th className="py-2 font-medium">Prioriteit</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {session.pmcEntries.map((pmc) => (
                <tr key={pmc.id} className="border-b border-gray-100">
                  <td className="py-2">{pmc.product}</td>
                  <td className="py-2">{pmc.marketSegment}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pmc.priority === "hoog"
                          ? "bg-red-100 text-red-700"
                          : pmc.priority === "midden"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {pmc.priority}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemovePMC(pmc.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Product</label>
            <input
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              placeholder="bijv. Toetsen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">Marktsegment</label>
            <input
              value={newMarket}
              onChange={(e) => setNewMarket(e.target.value)}
              placeholder="bijv. PO"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Prioriteit</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
            >
              <option value="hoog">Hoog</option>
              <option value="midden">Midden</option>
              <option value="laag">Laag</option>
            </select>
          </div>
          <button
            onClick={handleAddPMC}
            className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
          >
            +
          </button>
        </div>
      </section>
    </div>
  );
}
