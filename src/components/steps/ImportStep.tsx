"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { SectorPlan, SectorName } from "@/lib/types";
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
  const [activeSector, setActiveSector] = useState<SectorName | "overzicht">(
    "PO"
  );

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

  return (
    <div className="space-y-8">
      {/* Uitleg */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Werkwijze:</strong> Importeer eerst de KiB-uitkomsten (visie,
        doelen, scope). Upload daarna per sector het sectorplan. Op basis van
        de KiB-doelen en sectorplannen wordt vervolgens het DIN-netwerk per
        sector ingevuld.
      </div>

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

      {/* B. Sectorplannen — tabs per sector */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Sectorplannen
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Upload per sector het sectorplan (docx, pdf, of tekst). Klik op een
          sector om het plan te uploaden of te bewerken.
        </p>

        {/* Sector tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {SECTORS.map((sector) => {
            const hasUpload = session.sectorPlans.some(
              (s) => s.sectorName === sector
            );
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
                {sector}
                {hasUpload && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setActiveSector("overzicht")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSector === "overzicht"
                ? "border-cito-blue text-cito-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overzicht
          </button>
        </div>

        {/* Overzicht tab */}
        {activeSector === "overzicht" ? (
          <div className="space-y-3">
            {SECTORS.map((sector) => {
              const plan = session.sectorPlans.find(
                (s) => s.sectorName === sector
              );
              return (
                <div
                  key={sector}
                  className={`p-4 rounded-lg border ${
                    plan
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{sector}</h4>
                    {plan ? (
                      <span className="text-xs text-green-600">
                        Geüpload (
                        {plan.rawText.length > 100
                          ? `${Math.round(plan.rawText.length / 1000)}k tekens`
                          : "tekst"}
                        )
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Nog niet geüpload
                      </span>
                    )}
                  </div>
                  {plan && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {plan.rawText}
                    </p>
                  )}
                  {!plan && (
                    <button
                      onClick={() => setActiveSector(sector)}
                      className="mt-2 text-xs text-cito-blue hover:underline"
                    >
                      Upload sectorplan →
                    </button>
                  )}
                </div>
              );
            })}
            <div className="text-xs text-gray-500 mt-2">
              {session.sectorPlans.length}/{SECTORS.length} sectorplannen
              geüpload
            </div>
          </div>
        ) : (
          /* Individuele sector tab */
          (() => {
            const sector = activeSector as SectorName;
            const existing = session.sectorPlans.find(
              (s) => s.sectorName === sector
            );
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-cito-blue">
                    Sectorplan: {sector}
                  </h4>
                  {existing && (
                    <span className="text-xs text-green-600">
                      Geüpload (
                      {existing.rawText.length > 100
                        ? `${Math.round(existing.rawText.length / 1000)}k tekens`
                        : "tekst"}
                      )
                    </span>
                  )}
                </div>

                {/* File upload — groot upload-veld */}
                <label className="block">
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-cito-blue hover:bg-blue-50/50 transition-colors">
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
                      Upload {sector}-sectorplan
                    </span>
                    <span className="text-xs text-gray-400">
                      .docx, .pdf, of .txt
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".docx,.pdf,.txt,.doc"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.name.endsWith(".txt")) {
                        const text = await file.text();
                        handleSectorUpload(sector, text);
                      } else {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("sectorName", sector);
                        try {
                          const res = await fetch("/api/parse-sector", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.success && data.data) {
                            handleSectorUpload(
                              sector,
                              data.data.rawText ||
                                `[Geüpload: ${file.name}]`
                            );
                          }
                        } catch (err) {
                          console.error("Upload mislukt:", err);
                          handleSectorUpload(
                            sector,
                            `[Document: ${file.name}]`
                          );
                        }
                      }
                    }}
                  />
                </label>

                {/* Tekst invoer als alternatief */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Of plak de tekst van het sectorplan:
                  </label>
                  <textarea
                    placeholder={`Plak hier de tekst van het ${sector}-sectorplan...`}
                    className="w-full h-48 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
                    defaultValue={
                      existing?.rawText.startsWith("[")
                        ? ""
                        : existing?.rawText || ""
                    }
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleSectorUpload(sector, e.target.value.trim());
                      }
                    }}
                  />
                </div>

                {/* Preview van geüpload plan */}
                {existing && !existing.rawText.startsWith("[") && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-600">
                        Huidige inhoud
                      </h5>
                      <button
                        onClick={() => {
                          const cleared = session!.sectorPlans.filter(
                            (s) => s.sectorName !== sector
                          );
                          updateSession({ sectorPlans: cleared });
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Verwijderen
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-10">
                      {existing.rawText}
                    </p>
                    {existing.rawText.length > 500 && (
                      <details className="mt-2">
                        <summary className="text-xs text-cito-blue cursor-pointer">
                          Volledig plan tonen
                        </summary>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                          {existing.rawText}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </section>
    </div>
  );
}
