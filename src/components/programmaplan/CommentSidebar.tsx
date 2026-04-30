"use client";

import { useState } from "react";
import {
  type ProgrammaplanComment,
  type CommentStatus,
  type CommentScopeType,
  createComment,
  updateCommentStatus,
  applyAISuggestion,
  setAISuggestion,
  deleteComment,
} from "@/lib/comments";

interface ScopeOption {
  type: CommentScopeType;
  id: string;
  label: string;
}

interface Props {
  sessionId: string;
  comments: ProgrammaplanComment[];
  onCommentsChange: () => void;
  open: boolean;
  onClose: () => void;
  scopeOptions: ScopeOption[];
  preselectedScope?: ScopeOption | null;
  onPreselectionConsumed?: () => void;
}

type FilterMode = "open" | "all" | "resolved";

export default function CommentSidebar({
  sessionId,
  comments,
  onCommentsChange,
  open,
  onClose,
  scopeOptions,
  preselectedScope,
  onPreselectionConsumed,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>("open");
  const [showForm, setShowForm] = useState(false);
  const [formAuthor, setFormAuthor] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formScope, setFormScope] = useState<ScopeOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);

  // Open form automatisch wanneer een scope is voorgekozen via marker-klik
  if (preselectedScope && !showForm) {
    setShowForm(true);
    setFormScope(preselectedScope);
    onPreselectionConsumed?.();
  }

  const filtered = comments.filter((c) => {
    if (filter === "open") return c.status === "open";
    if (filter === "resolved") return c.status !== "open";
    return true;
  });

  const counts = {
    open: comments.filter((c) => c.status === "open").length,
    all: comments.length,
    resolved: comments.filter((c) => c.status !== "open").length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formScope || !formBody.trim()) return;
    setSubmitting(true);
    const result = await createComment({
      sessionId,
      scopeType: formScope.type,
      scopeId: formScope.id,
      scopeLabel: formScope.label,
      body: formBody.trim(),
      authorName: formAuthor.trim() || null,
    });
    setSubmitting(false);
    if (result) {
      setFormBody("");
      setShowForm(false);
      setFormScope(null);
      onCommentsChange();
    }
  };

  const handleStatusChange = async (id: string, status: CommentStatus) => {
    const ok = await updateCommentStatus(id, status);
    if (ok) onCommentsChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deze opmerking definitief verwijderen?")) return;
    const ok = await deleteComment(id);
    if (ok) onCommentsChange();
  };

  const handleAIRewrite = async (comment: ProgrammaplanComment) => {
    setAiBusyId(comment.id);
    try {
      const res = await fetch("/api/comments-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          scopeType: comment.scopeType,
          scopeId: comment.scopeId,
          scopeLabel: comment.scopeLabel,
          commentBody: comment.body,
        }),
      });
      const json = await res.json();
      if (json?.success && json.suggestion) {
        await setAISuggestion(comment.id, json.suggestion);
        onCommentsChange();
      } else {
        alert(json?.error || "AI-voorstel kon niet worden gegenereerd.");
      }
    } catch (err) {
      console.error("[comments] AI rewrite failed:", err);
      alert("AI-voorstel kon niet worden gegenereerd.");
    } finally {
      setAiBusyId(null);
    }
  };

  const handleApplySuggestion = async (comment: ProgrammaplanComment) => {
    if (!comment.aiSuggestion) return;
    const ok = await applyAISuggestion(comment.id, comment.aiSuggestion);
    if (ok) onCommentsChange();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 print:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 print:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex flex-col h-full">
          <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-cito-blue text-white shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                Aanmerkingen
              </div>
              <h2 className="text-base font-bold">{counts.open} open · {counts.all} totaal</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-blue-200 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
              aria-label="Sluit sidebar"
            >
              ×
            </button>
          </header>

          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex gap-1 text-xs">
              {(["open", "resolved", "all"] as FilterMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilter(m)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    filter === m
                      ? "bg-cito-blue text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {m === "open" ? `Open (${counts.open})` : m === "resolved" ? `Verwerkt (${counts.resolved})` : `Alles (${counts.all})`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setFormScope(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-cito-blue text-white rounded hover:bg-cito-blue-light transition-colors"
            >
              + Nieuw
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-gray-100 bg-cito-blue/5 space-y-3 shrink-0">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-1">
                  Locatie
                </label>
                <select
                  value={formScope ? `${formScope.type}:${formScope.id}` : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setFormScope(null);
                      return;
                    }
                    const [type, id] = v.split(":");
                    const found = scopeOptions.find((o) => o.type === type && o.id === id);
                    if (found) setFormScope(found);
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                  required
                >
                  <option value="">— Kies hoofdstuk of paragraaf —</option>
                  {scopeOptions.map((o) => (
                    <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
                      {o.type === "chapter" ? "📖" : "📄"} {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-1">
                  Naam (optioneel)
                </label>
                <input
                  type="text"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  placeholder="Bijv. Jan de Vries"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-1">
                  Opmerking
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={4}
                  placeholder="Wat valt je op? Wat zou je willen veranderen?"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded resize-y"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !formScope || !formBody.trim()}
                  className="flex-1 px-3 py-1.5 text-sm font-semibold bg-cito-blue text-white rounded hover:bg-cito-blue-light disabled:opacity-50"
                >
                  {submitting ? "Plaatsen…" : "Plaats opmerking"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormBody("");
                    setFormScope(null);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                {filter === "open" ? "Nog geen open opmerkingen." : "Geen opmerkingen om te tonen."}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <li key={c.id} className="px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(c.scopeId);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="text-[10px] uppercase tracking-wider text-cito-blue font-bold hover:underline text-left"
                      >
                        {c.scopeType === "chapter" ? "📖" : "📄"} {c.scopeLabel || c.scopeId}
                      </button>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        c.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "applied"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {c.status === "open" ? "Open" : c.status === "applied" ? "Verwerkt" : c.status === "resolved" ? "Opgelost" : "Afgewezen"}
                      </span>
                    </div>
                    {c.authorName && (
                      <div className="text-xs text-gray-500 mb-1">{c.authorName}</div>
                    )}
                    <p className="text-sm text-gray-800 leading-relaxed mb-2 whitespace-pre-wrap">{c.body}</p>

                    {c.aiSuggestion && (
                      <div className="mt-2 p-3 rounded bg-emerald-50 border border-emerald-200">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold mb-1">
                          AI-tekstvoorstel
                        </div>
                        <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{c.aiSuggestion}</p>
                        {c.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleApplySuggestion(c)}
                            className="mt-2 px-2 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Toepassen op het document
                          </button>
                        )}
                      </div>
                    )}

                    {c.aiAppliedText && c.status === "applied" && (
                      <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
                        ✓ Toegepast als nieuwe tekst.
                      </div>
                    )}

                    {c.status === "open" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {!c.aiSuggestion && (
                          <button
                            type="button"
                            onClick={() => handleAIRewrite(c)}
                            disabled={aiBusyId === c.id}
                            className="px-2 py-1 text-[11px] font-semibold bg-cito-blue text-white rounded hover:bg-cito-blue-light disabled:opacity-50"
                          >
                            {aiBusyId === c.id ? "AI denkt…" : "✨ Verwerk via AI"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "resolved")}
                          className="px-2 py-1 text-[11px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          Markeer opgelost
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "dismissed")}
                          className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Afwijzen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded ml-auto"
                          title="Definitief verwijderen — niet meer terug te halen"
                        >
                          🗑 Verwijder
                        </button>
                      </div>
                    )}
                    {c.status !== "open" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(c.id, "open")}
                          className="px-2 py-1 text-[11px] font-medium text-cito-blue hover:bg-cito-blue/5 rounded"
                        >
                          Heropenen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded"
                        >
                          Verwijder
                        </button>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
