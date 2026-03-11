"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import type { EffortDomain } from "@/lib/types";

export default function ExportStep() {
  const { session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

  if (!session) return null;

  async function handleExportWord() {
    setIsExportingWord(true);
    try {
      const { generateWordDocument } = await import("@/lib/word-export");
      const blob = await generateWordDocument(session!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `programmaplan-${session!.name
        .replace(/\s+/g, "-")
        .toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Word export mislukt:", e);
    } finally {
      setIsExportingWord(false);
    }
  }

  async function handleGeneratePlan() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionData: session, format: "text" }),
      });
      const data = await res.json();
      if (data.success && data.data?.plan) {
        setGeneratedPlan(data.data.plan);
      }
    } catch (e) {
      console.error("Plan generatie mislukt:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  function generateTextSummary(): string {
    let text = `# Programmaplan: ${session!.name}\n\n`;

    if (session!.vision) {
      text += `## Visie\n${session!.vision.beknopt}\n\n`;
    }

    text += `## Programmadoelen\n`;
    session!.goals
      .sort((a, b) => a.rank - b.rank)
      .forEach((g) => {
        text += `${g.rank}. ${g.name}\n   ${g.description}\n\n`;
      });

    SECTORS.forEach((sector) => {
      const sectorBenefits = session!.benefits.filter(
        (b) => b.sectorId === sector
      );
      const sectorCaps = session!.capabilities.filter(
        (c) => c.sectorId === sector
      );
      const sectorEfforts = session!.efforts.filter(
        (e) => e.sectorId === sector
      );

      if (
        sectorBenefits.length === 0 &&
        sectorCaps.length === 0 &&
        sectorEfforts.length === 0
      )
        return;

      text += `## Sector: ${sector}\n\n`;

      if (sectorBenefits.length > 0) {
        text += `### Baten\n`;
        sectorBenefits.forEach((b) => {
          text += `- ${b.description}`;
          if (b.profiel.indicator) {
            text += ` (${b.profiel.indicator}: ${b.profiel.currentValue} → ${b.profiel.targetValue})`;
          }
          if (b.profiel.bateneigenaar) {
            text += ` — Eigenaar: ${b.profiel.bateneigenaar}`;
          }
          text += "\n";
        });
        text += "\n";
      }

      if (sectorCaps.length > 0) {
        text += `### Vermogens\n`;
        sectorCaps.forEach((c) => {
          text += `- ${c.description}`;
          if (c.currentLevel || c.targetLevel) {
            text += ` (${c.currentLevel || "?"}/5 → ${c.targetLevel || "?"}/5)`;
          }
          if (c.profiel?.eigenaar) {
            text += ` — Eigenaar: ${c.profiel.eigenaar}`;
          }
          text += "\n";
        });
        text += "\n";
      }

      if (sectorEfforts.length > 0) {
        text += `### Inspanningen\n`;
        (Object.keys(DOMAIN_LABELS) as EffortDomain[]).forEach((domain) => {
          const domainEfforts = sectorEfforts.filter(
            (e) => e.domain === domain
          );
          if (domainEfforts.length === 0) return;
          text += `**${DOMAIN_LABELS[domain]}:**\n`;
          domainEfforts.forEach((e) => {
            text += `- ${e.description}`;
            if (e.quarter) text += ` (${e.quarter})`;
            if (e.dossier?.eigenaar) text += ` — Opdrachtgever: ${e.dossier.eigenaar}`;
            text += "\n";
          });
        });
        text += "\n";
      }
    });

    return text;
  }

  function handleExportText() {
    const text = generateTextSummary();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `programmaplan-${session!.name
      .replace(/\s+/g, "-")
      .toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Export opties */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Export Opties
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={handleExportWord}
            disabled={isExportingWord}
            className="p-4 border-2 border-cito-blue rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
          >
            <div className="text-sm font-semibold text-cito-blue">
              {isExportingWord
                ? "Word document aanmaken..."
                : "Programmaplan downloaden (.docx)"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Volledig programmaplan als Word document met aparte pagina per
              sector
            </div>
          </button>

          <button
            onClick={handleExportText}
            className="p-4 border border-gray-200 rounded-lg hover:border-cito-blue hover:bg-blue-50 transition-colors text-left"
          >
            <div className="text-sm font-semibold text-gray-800">
              Tekst Export
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Programmaplan als leesbaar tekstbestand
            </div>
          </button>

          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="p-4 border border-gray-200 rounded-lg hover:border-cito-blue hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
          >
            <div className="text-sm font-semibold text-gray-800">
              {isGenerating ? "Genereren..." : "AI Programmaplan"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Laat AI een samenhangend programmaplan schrijven
            </div>
          </button>
        </div>
      </section>

      {/* Samenvatting */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Overzicht
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-din-doelen/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-cito-blue">
              {session.goals.length}
            </div>
            <div className="text-xs text-gray-600">Doelen</div>
          </div>
          <div className="p-4 bg-din-baten/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-cito-blue">
              {session.benefits.length}
            </div>
            <div className="text-xs text-gray-600">Baten</div>
          </div>
          <div className="p-4 bg-din-vermogens/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-cito-blue">
              {session.capabilities.length}
            </div>
            <div className="text-xs text-gray-600">Vermogens</div>
          </div>
          <div className="p-4 bg-din-inspanningen/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-cito-blue">
              {session.efforts.length}
            </div>
            <div className="text-xs text-gray-600">Inspanningen</div>
          </div>
        </div>
      </section>

      {/* AI Programmaplan resultaat */}
      {generatedPlan && (
        <section>
          <h3 className="text-lg font-semibold text-cito-blue mb-3">
            Gegenereerd Programmaplan
          </h3>
          <div className="p-6 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
            {generatedPlan}
          </div>
        </section>
      )}

      {/* Preview */}
      <section>
        <h3 className="text-lg font-semibold text-cito-blue mb-3">
          Preview Programmaplan
        </h3>
        <div className="p-6 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono">
          {generateTextSummary()}
        </div>
      </section>
    </div>
  );
}
