"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { importFromKiB } from "@/lib/kib-import";

export default function ImportStep() {
  const { session, updateSession } = useSession();
  const [kibJson, setKibJson] = useState("");
  const [kibStatus, setKibStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [kibError, setKibError] = useState("");

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

  return (
    <div className="space-y-8">
      {/* Uitleg */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Werkwijze:</strong> Importeer de KiB-uitkomsten (visie, doelen,
        scope). Dit zijn de gezamenlijke programmadoelen die als basis dienen
        voor het DIN-netwerk per sector. Ga daarna naar stap 2 om per sector
        het sectorplan te uploaden en het DIN-netwerk in te vullen.
      </div>

      {/* KiB Import */}
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
            <span className="text-sm text-green-600">
              Succesvol geïmporteerd
            </span>
          )}
          {kibStatus === "error" && (
            <span className="text-sm text-red-600">{kibError}</span>
          )}
        </div>

        {/* Geïmporteerde data tonen */}
        {session.vision && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-medium text-sm text-cito-blue">Visie</h4>
            <p className="text-sm text-gray-700 mt-1">
              {session.vision.beknopt}
            </p>
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
                <span className="text-green-600 font-medium">
                  Binnen scope:
                </span>
                <ul className="mt-1 space-y-0.5">
                  {session.scope.inScope.map((s, i) => (
                    <li key={i} className="text-gray-700">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-red-500 font-medium">
                  Buiten scope:
                </span>
                <ul className="mt-1 space-y-0.5">
                  {session.scope.outScope.map((s, i) => (
                    <li key={i} className="text-gray-700">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
