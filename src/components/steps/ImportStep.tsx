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
  const [isUploading, setIsUploading] = useState(false);

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

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setKibStatus("idle");
    setKibError("");

    try {
      // Tekstbestanden direct als JSON proberen
      if (file.name.endsWith(".json") || file.name.endsWith(".txt")) {
        const text = await file.text();
        try {
          const result = importFromKiB(text);
          updateSession({
            vision: result.vision || session!.vision,
            goals: result.goals.length > 0 ? result.goals : session!.goals,
            scope: result.scope || session!.scope,
          });
          setKibStatus("success");
          return;
        } catch {
          // Niet geldig JSON, sla op als ruwe tekst
          setKibJson(text);
          setKibStatus("error");
          setKibError(
            "Bestand bevat geen geldig KiB JSON. De tekst is in het invoerveld gezet — pas het aan naar het juiste formaat."
          );
          return;
        }
      }

      // Word bestanden via API
      if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import-kib", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.data) {
          if (data.data.vision || data.data.goals?.length > 0) {
            updateSession({
              vision: data.data.vision || session!.vision,
              goals:
                data.data.goals?.length > 0
                  ? data.data.goals
                  : session!.goals,
              scope: data.data.scope || session!.scope,
            });
            setKibStatus("success");
          } else if (data.data.rawText) {
            // Ruwe tekst uit Word, zet in tekstgebied
            setKibJson(data.data.rawText);
            setKibStatus("error");
            setKibError(
              "Word-bestand gelezen, maar bevat geen KiB JSON-structuur. De tekst is in het invoerveld gezet — plak handmatig de juiste JSON of kopieer de visie en doelen."
            );
          }
        } else {
          setKibStatus("error");
          setKibError(data.error || "Upload mislukt");
        }
        return;
      }

      setKibStatus("error");
      setKibError("Onbekend bestandsformaat. Gebruik .json, .txt, .docx of .doc");
    } catch (e) {
      setKibStatus("error");
      setKibError(e instanceof Error ? e.message : "Upload mislukt");
    } finally {
      setIsUploading(false);
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

        {/* Bestand uploaden */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-3">
            Upload het KiB-exportbestand (.json, .docx, of .txt) of plak de
            JSON hieronder.
          </p>
          <label className="block cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-cito-blue hover:bg-blue-50/50 transition-colors">
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm text-gray-600">
                {isUploading
                  ? "Bestand verwerken..."
                  : "Upload KiB-export bestand"}
              </span>
              <span className="text-xs text-gray-400">
                .json, .docx, .doc, of .txt
              </span>
            </div>
            <input
              type="file"
              accept=".json,.txt,.docx,.doc"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* JSON invoerveld */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 block mb-1">
            Of plak de KiB JSON-export:
          </label>
          <textarea
            value={kibJson}
            onChange={(e) => setKibJson(e.target.value)}
            placeholder='{"visie": {"uitgebreid": "...", "beknopt": "..."}, "doelen": [...], "scope": {"binnen": [...], "buiten": [...]}}'
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleKibImport}
            disabled={!kibJson.trim()}
            className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Importeer JSON
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
