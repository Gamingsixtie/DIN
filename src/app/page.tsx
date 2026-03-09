"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadLocal, saveLocal, removeLocal } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { createDemoSession } from "@/lib/demo-data";

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<
    { id: string; name: string; createdAt: string; currentStep: number }[]
  >([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const list = loadLocal<string[]>("session_list") || [];
    const loaded = list
      .map((id) => {
        const s = loadLocal<DINSession>(`session_${id}`);
        return s
          ? { id: s.id, name: s.name, createdAt: s.createdAt, currentStep: s.currentStep }
          : null;
      })
      .filter(Boolean) as typeof sessions;
    setSessions(loaded);
  }, []);

  function handleCreate() {
    if (!newName.trim()) return;
    const id = crypto.randomUUID();
    const session: DINSession = {
      id,
      name: newName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 0,
      goals: [],
      sectorPlans: [],
      pmcEntries: [],
      benefits: [],
      capabilities: [],
      efforts: [],
      goalBenefitMaps: [],
      benefitCapabilityMaps: [],
      capabilityEffortMaps: [],
    };
    saveLocal(`session_${id}`, session);
    const list = loadLocal<string[]>("session_list") || [];
    list.push(id);
    saveLocal("session_list", list);
    router.push(`/sessies/${id}`);
  }

  function handleDelete(id: string) {
    removeLocal(`session_${id}`);
    const list = (loadLocal<string[]>("session_list") || []).filter(
      (sid) => sid !== id
    );
    saveLocal("session_list", list.length > 0 ? list : ["__placeholder__"]);
    if (list.length === 0) removeLocal("session_list");
    else saveLocal("session_list", list);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function handleLoadDemo() {
    const demo = createDemoSession();
    saveLocal(`session_${demo.id}`, demo);
    const list = loadLocal<string[]>("session_list") || [];
    list.push(demo.id);
    saveLocal("session_list", list);
    router.push(`/sessies/${demo.id}`);
  }

  const stepLabels = [
    "KiB Import",
    "Sectorwerk",
    "DIN-Mapping",
    "Cross-analyse",
    "Planning & Goedkeuring",
    "Export",
  ];

  return (
    <main className="min-h-screen bg-cito-bg">
      <header className="bg-cito-blue text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Doelen-Inspanningennetwerk</h1>
          <p className="text-blue-200 mt-1">
            Vertaal programmadoelen naar baten, vermogens en inspanningen — per
            sector
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* DIN keten visueel */}
        <div className="bg-white rounded-xl border border-cito-border p-6 shadow-sm">
          <div className="flex items-center justify-center gap-3 text-sm font-medium">
            <span className="px-3 py-1.5 rounded-lg bg-din-doelen text-white">
              Doelen
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-baten text-white">
              Baten
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-vermogens text-white">
              Vermogens
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-inspanningen text-white">
              Inspanningen
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-center">
            <div className="p-2 rounded bg-domain-mens/10 text-domain-mens font-medium">
              Mens
            </div>
            <div className="p-2 rounded bg-domain-processen/10 text-domain-processen font-medium">
              Processen
            </div>
            <div className="p-2 rounded bg-domain-data/10 text-domain-data font-medium">
              Data & Systemen
            </div>
            <div className="p-2 rounded bg-domain-cultuur/10 text-domain-cultuur font-medium">
              Cultuur
            </div>
          </div>
        </div>

        {/* Sessies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Sessies</h2>
            <div className="flex gap-2">
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2 border border-cito-blue text-cito-blue rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Demo laden
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors"
              >
                + Nieuwe sessie
              </button>
            </div>
          </div>

          {showCreate && (
            <div className="bg-white rounded-xl border border-cito-border p-4 flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Naam van de sessie..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue"
                autoFocus
              />
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
              >
                Aanmaken
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700"
              >
                Annuleer
              </button>
            </div>
          )}

          {sessions.length === 0 && !showCreate ? (
            <div className="bg-white rounded-xl border border-cito-border p-8 text-center">
              <p className="text-gray-500">
                Nog geen sessies. Maak een nieuwe sessie aan om te beginnen.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-cito-border p-4 flex items-center justify-between hover:border-cito-blue/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/sessies/${s.id}`)}
              >
                <div>
                  <h3 className="font-medium text-gray-800">{s.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Stap {s.currentStep + 1}: {stepLabels[s.currentStep]} —{" "}
                    {new Date(s.createdAt).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id);
                  }}
                  className="text-gray-400 hover:text-red-500 text-sm px-2"
                  title="Verwijder sessie"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
