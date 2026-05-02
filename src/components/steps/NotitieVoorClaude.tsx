"use client";

// Notitieblok voor Stap 8: programmamanager noteert hier feedback
// die alleen voor Claude bestemd is (niet voor stakeholders, niet in export).
// Per scenario en globaal. Notities kunnen toegevoegd, bewerkt, op
// "opgepakt" gezet en verwijderd worden. Persistentie via session-update.

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type { ClaudeNotitie } from "@/lib/types";

type Scope =
  | { kind: "globaal" }
  | { kind: "scenario"; scenarioKey: "optimaal" | "plus20" | "min20" | "advies" };

export function NotitieVoorClaude({
  scope,
  titel,
  hint,
}: {
  scope: Scope;
  titel: string;
  hint?: string;
}) {
  const { session, updateSession } = useSession();
  const [nieuw, setNieuw] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const stap8 = session?.crossAnalyseWizard?.stepResults?.stap8 as
    | { claudeNotes?: { globaal?: ClaudeNotitie[]; perScenario?: Record<string, ClaudeNotitie[]> } }
    | undefined;

  const notities: ClaudeNotitie[] =
    (scope.kind === "globaal"
      ? stap8?.claudeNotes?.globaal
      : stap8?.claudeNotes?.perScenario?.[scope.scenarioKey]) ?? [];

  function persist(nieuwLijst: ClaudeNotitie[]) {
    updateSession((prev) => {
      const wiz = prev.crossAnalyseWizard ?? { currentStep: 1, completedSteps: [] };
      const stepResults = (wiz.stepResults ?? {}) as Record<string, unknown>;
      const huidigeStap8 = (stepResults.stap8 ?? {}) as Record<string, unknown>;
      const huidigeNotes = (huidigeStap8.claudeNotes ?? {}) as {
        globaal?: ClaudeNotitie[];
        perScenario?: Record<string, ClaudeNotitie[]>;
      };

      const nieuweNotes =
        scope.kind === "globaal"
          ? { ...huidigeNotes, globaal: nieuwLijst }
          : {
              ...huidigeNotes,
              perScenario: { ...(huidigeNotes.perScenario ?? {}), [scope.scenarioKey]: nieuwLijst },
            };

      return {
        crossAnalyseWizard: {
          ...wiz,
          stepResults: {
            ...stepResults,
            stap8: { ...huidigeStap8, claudeNotes: nieuweNotes },
          },
        },
      } as Partial<typeof prev>;
    });
  }

  function voegToe() {
    const tekst = nieuw.trim();
    if (!tekst) return;
    const n: ClaudeNotitie = {
      id: crypto.randomUUID(),
      tekst,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    persist([...notities, n]);
    setNieuw("");
  }

  function verwijder(id: string) {
    persist(notities.filter((n) => n.id !== id));
  }

  function toggleStatus(id: string) {
    persist(
      notities.map((n) =>
        n.id === id ? { ...n, status: n.status === "open" ? "opgepakt" : "open" } : n,
      ),
    );
  }

  function startEdit(n: ClaudeNotitie) {
    setEditing(n.id);
    setEditText(n.tekst);
  }

  function saveEdit() {
    if (!editing) return;
    const tekst = editText.trim();
    if (!tekst) {
      setEditing(null);
      return;
    }
    persist(notities.map((n) => (n.id === editing ? { ...n, tekst } : n)));
    setEditing(null);
    setEditText("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditText("");
  }

  const aantalOpen = notities.filter((n) => n.status === "open").length;
  const aantalOpgepakt = notities.length - aantalOpen;

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
              Notitie voor Claude
            </span>
            <span className="text-sm font-semibold text-amber-950">{titel}</span>
          </div>
          {hint && <p className="text-xs text-amber-800/80 mt-1.5 leading-relaxed">{hint}</p>}
        </div>
        {notities.length > 0 && (
          <div className="text-[11px] text-amber-900 whitespace-nowrap">
            {aantalOpen} open · {aantalOpgepakt} opgepakt
          </div>
        )}
      </div>

      {notities.length > 0 && (
        <ul className="space-y-2 mb-3">
          {notities.map((n) => {
            const isOpgepakt = n.status === "opgepakt";
            return (
              <li
                key={n.id}
                className={`rounded-lg border bg-white p-2.5 ${
                  isOpgepakt ? "border-gray-200 opacity-60" : "border-amber-200"
                }`}
              >
                {editing === n.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm border border-amber-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="text-xs bg-amber-700 text-white px-2.5 py-1 rounded hover:bg-amber-800"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-600 px-2.5 py-1 rounded hover:bg-gray-100"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleStatus(n.id)}
                      title={isOpgepakt ? "Markeer als open" : "Markeer als opgepakt"}
                      className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isOpgepakt
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-amber-400 hover:border-amber-600"
                      }`}
                    >
                      {isOpgepakt && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <p
                      className={`text-sm flex-1 whitespace-pre-wrap leading-relaxed ${
                        isOpgepakt ? "line-through text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {n.tekst}
                    </p>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(n)}
                        title="Bewerken"
                        className="text-xs text-gray-500 hover:text-amber-700 px-1.5"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => verwijder(n.id)}
                        title="Verwijderen"
                        className="text-xs text-gray-500 hover:text-red-600 px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <textarea
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              voegToe();
            }
          }}
          placeholder="Wat valt je op? (Ctrl/Cmd+Enter om toe te voegen)"
          className="flex-1 text-sm border border-amber-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y min-h-[40px] bg-white"
          rows={1}
        />
        <button
          onClick={voegToe}
          disabled={!nieuw.trim()}
          className="text-xs font-semibold bg-amber-700 text-white px-3 py-1.5 rounded hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed self-start"
        >
          + Toevoegen
        </button>
      </div>
    </div>
  );
}
