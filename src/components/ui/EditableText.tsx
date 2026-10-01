"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Inline-edit component voor lange tekst-velden (motivatie, samenvatting,
 * prioriteitAdvies). Gebruikt door de cross-analyse wizard zodat de
 * programmamanager kleine afrondingsverschillen of formuleringen handmatig
 * kan aanpassen — zonder een AI-call (TEKST_ONLY) te triggeren en zonder
 * tokens te verbranden.
 *
 * Gedrag:
 * - Standaard wordt de tekst gerenderd met een ✎ icoon dat verschijnt op hover.
 * - Klik op het icoon (of dubbelklik op de tekst) → edit-modus met textarea.
 * - Opslaan → onSave callback (parent doet updateSession + saveNow).
 * - Annuleer / Esc → terug naar gerenderde versie.
 * - Optionele `hint` toont contextinfo (bv. top-2 zwaartepunt) onder de
 *   textarea zodat gebruiker zelf kan checken of de edit klopt.
 */
export function EditableText({
  value,
  onSave,
  hint,
  rows = 4,
  placeholder,
  className = "",
  textClassName = "text-sm text-gray-800 leading-relaxed whitespace-pre-wrap",
  emptyLabel = "(leeg — klik ✎ om toe te voegen)",
}: {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
  textClassName?: string;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Open edit mode → focus textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Cursor aan einde plaatsen
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
    }
  }, [editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  async function commitSave() {
    if (saving) return;
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setSavedFlash(true);
      setEditing(false);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      console.error("[EditableText] save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDraft(value);
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
    // Cmd/Ctrl + Enter → save
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void commitSave();
    }
  }

  if (!editing) {
    const isEmpty = !value || value.trim().length === 0;
    return (
      <div className={`group relative ${className}`}>
        {isEmpty ? (
          <p className={`${textClassName} text-gray-400 italic`}>{emptyLabel}</p>
        ) : (
          <p className={textClassName} onDoubleClick={startEdit} title="Dubbelklik om te bewerken">
            {value}
          </p>
        )}
        <button
          onClick={startEdit}
          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-[#003366] hover:border-[#003366] shadow-sm`}
          title="Bewerken (geen AI — handmatige tekst)"
          aria-label="Bewerken"
        >
          ✎ Bewerk
        </button>
        {savedFlash && (
          <span className="absolute top-0 right-20 text-[11px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
            ✓ Opgeslagen
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded border-2 border-[#003366] bg-blue-50/30 p-2 ${className}`}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y leading-relaxed"
      />
      {hint && (
        <p className="text-[11px] text-gray-600 mt-1 italic leading-snug">
          ℹ️ {hint}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 mt-1.5">
        <button
          onClick={cancelEdit}
          disabled={saving}
          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Annuleer (Esc)
        </button>
        <button
          onClick={commitSave}
          disabled={saving || draft === value}
          className="text-xs px-3 py-1 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
        >
          {saving ? "Opslaan..." : "Opslaan (Ctrl+Enter)"}
        </button>
      </div>
    </div>
  );
}
