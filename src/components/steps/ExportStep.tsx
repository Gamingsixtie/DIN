"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import type { EffortDomain, DINSession, SectorName } from "@/lib/types";

// Domein kleuren
const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string; border: string }> = {
  mens: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  processen: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  data_systemen: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  cultuur: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
};

const SECTOR_ACCENT: Record<SectorName, string> = {
  PO: "border-l-blue-500",
  VO: "border-l-emerald-500",
  Zakelijk: "border-l-purple-500",
};

// --- Professionele document preview componenten ---

function DocumentTitlePage({ session }: { session: DINSession }) {
  return (
    <div className="text-center py-16 border-b-2 border-[#003366]/20">
      <div className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">
        Doelen-Inspanningennetwerk
      </div>
      <h1 className="text-3xl font-bold text-[#003366] mb-3">Programmaplan</h1>
      <h2 className="text-xl text-[#003366]/70 mb-8">{session.name}</h2>
      <div className="text-sm text-gray-400 italic">
        Gegenereerd: {new Date().toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

function DocumentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-[#003366] mb-4 pb-2 border-b border-[#003366]/15">
        {title}
      </h2>
      {children}
    </div>
  );
}

function DocumentSubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-[#003366]/80 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function VisionBlock({ session }: { session: DINSession }) {
  if (!session.vision) return null;
  return (
    <DocumentSection title="Programmavisie">
      {session.vision.beknopt && (
        <p className="text-sm font-medium text-gray-800 leading-relaxed mb-3">
          {session.vision.beknopt}
        </p>
      )}
      {session.vision.uitgebreid && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {session.vision.uitgebreid}
        </p>
      )}
    </DocumentSection>
  );
}

function ScopeBlock({ session }: { session: DINSession }) {
  if (!session.scope) return null;
  return (
    <DocumentSection title="Scope">
      <div className="grid grid-cols-2 gap-6">
        {session.scope.inScope.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
              Binnen scope
            </div>
            <ul className="space-y-1">
              {session.scope.inScope.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {session.scope.outScope.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-700/70 uppercase tracking-wide mb-2">
              Buiten scope
            </div>
            <ul className="space-y-1">
              {session.scope.outScope.map((item, i) => (
                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">&minus;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DocumentSection>
  );
}

function GoalsBlock({ session }: { session: DINSession }) {
  return (
    <DocumentSection title="Programmadoelen">
      <div className="space-y-3">
        {session.goals
          .sort((a, b) => a.rank - b.rank)
          .map((goal) => (
            <div key={goal.id} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#003366] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {goal.rank}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
                {goal.description && (
                  <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {goal.description}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </DocumentSection>
  );
}

function DINPerGoalBlock({ session }: { session: DINSession }) {
  const goalsWithData = session.goals
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  if (goalsWithData.length === 0) return null;

  return (
    <DocumentSection title="DIN-Netwerk per Doel">
      {goalsWithData.map((goal) => {
        const goalBenefits = session.benefits.filter((b) => b.goalId === goal.id);
        const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));
        const relatedCapIds = new Set(
          session.benefitCapabilityMaps
            .filter((m) => goalBenefitIds.has(m.benefitId))
            .map((m) => m.capabilityId)
        );
        const goalCaps = relatedCapIds.size > 0
          ? session.capabilities.filter((c) => relatedCapIds.has(c.id))
          : session.capabilities.filter((c) =>
              goalBenefits.some((b) => b.sectorId === c.sectorId)
            );
        const goalSectorIds = new Set(goalBenefits.map((b) => b.sectorId));
        const goalEfforts = session.efforts.filter((e) => goalSectorIds.has(e.sectorId));

        return (
          <div key={goal.id} className="mb-8 last:mb-0">
            <h3 className="text-sm font-bold text-[#003366] mb-4">
              Doel {goal.rank}: {goal.name}
            </h3>

            {/* Baten */}
            {goalBenefits.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Baten
                </div>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Sector</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Baat</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Indicator</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Eigenaar</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetverantw.</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Huidig &rarr; Doel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goalBenefits.map((b, i) => (
                        <tr key={b.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                          <td className="px-3 py-2 text-gray-600">{b.sectorId}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{b.title || b.description}</td>
                          <td className="px-3 py-2 text-gray-600">{b.profiel.indicator || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{b.profiel.bateneigenaar || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{b.profiel.indicatorOwner || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {b.profiel.currentValue && b.profiel.targetValue
                              ? `${b.profiel.currentValue} \u2192 ${b.profiel.targetValue}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vermogens */}
            {goalCaps.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Vermogens
                </div>
                <div className="space-y-1.5">
                  {goalCaps.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003366] shrink-0" />
                      <span className="text-gray-700">
                        <span className="text-gray-400">[{c.sectorId}]</span>{" "}
                        {c.title || c.description}
                        {c.currentLevel && c.targetLevel && (
                          <span className="text-gray-400 ml-1">
                            ({c.currentLevel}/5 &rarr; {c.targetLevel}/5)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspanningen per domein */}
            {goalEfforts.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Inspanningen
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
                    const domainEfforts = goalEfforts.filter((e) => e.domain === domain);
                    if (domainEfforts.length === 0) return null;
                    const colors = DOMAIN_COLORS[domain];
                    return (
                      <div key={domain} className={`${colors.bg} rounded-lg p-3 border ${colors.border}`}>
                        <div className={`text-xs font-semibold ${colors.text} mb-1.5`}>
                          {DOMAIN_LABELS[domain]}
                        </div>
                        {domainEfforts.map((e) => (
                          <div key={e.id} className="text-xs text-gray-700 mb-0.5">
                            <span className="text-gray-400">[{e.sectorId}]</span>{" "}
                            {e.title || e.description}
                            {e.quarter && <span className="text-gray-400 ml-1">({e.quarter})</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </DocumentSection>
  );
}

function SectorBlocks({ session }: { session: DINSession }) {
  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  if (activeSectors.length === 0) return null;

  return (
    <DocumentSection title="Sectorale Uitwerking">
      {activeSectors.map((sector) => {
        const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
        const sectorCaps = session.capabilities.filter((c) => c.sectorId === sector);
        const sectorEfforts = session.efforts.filter((e) => e.sectorId === sector);
        const accent = SECTOR_ACCENT[sector];

        return (
          <div key={sector} className={`mb-8 last:mb-0 border-l-4 ${accent} pl-5`}>
            <h3 className="text-sm font-bold text-[#003366] mb-4">
              Sector {sector}
            </h3>

            {/* Baten compact */}
            {sectorBenefits.length > 0 && (
              <DocumentSubSection title="Baten">
                <div className="space-y-2">
                  {sectorBenefits.map((b) => {
                    const goal = session.goals.find((g) => g.id === b.goalId);
                    return (
                      <div key={b.id} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#003366]/40 mt-1.5 shrink-0" />
                        <div className="text-xs">
                          <span className="font-medium text-gray-800">
                            {b.title || b.description}
                          </span>
                          {goal && (
                            <span className="text-gray-400 ml-1">(Doel: {goal.name})</span>
                          )}
                          {b.profiel.indicator && (
                            <div className="text-gray-500 mt-0.5">
                              {b.profiel.indicator}: {b.profiel.currentValue || "?"} &rarr; {b.profiel.targetValue || "?"}
                              {b.profiel.bateneigenaar && ` — ${b.profiel.bateneigenaar}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DocumentSubSection>
            )}

            {/* Vermogens tabel */}
            {sectorCaps.length > 0 && (
              <DocumentSubSection title="Vermogens">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Vermogen</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Eigenaar</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Niveau</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Huidige situatie</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Gewenste situatie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorCaps.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                          <td className="px-3 py-2 font-medium text-gray-800">{c.title || c.description}</td>
                          <td className="px-3 py-2 text-gray-600">{c.profiel?.eigenaar || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {c.currentLevel && c.targetLevel
                              ? `${c.currentLevel}/5 \u2192 ${c.targetLevel}/5`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.profiel?.huidieSituatie || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{c.profiel?.gewensteSituatie || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DocumentSubSection>
            )}

            {/* Inspanningen per domein */}
            {sectorEfforts.length > 0 && (
              <DocumentSubSection title="Inspanningen">
                {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
                  const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
                  if (domainEfforts.length === 0) return null;
                  const colors = DOMAIN_COLORS[domain];
                  return (
                    <div key={domain} className="mb-3 last:mb-0">
                      <div className={`text-xs font-semibold ${colors.text} mb-1.5`}>
                        {DOMAIN_LABELS[domain]}
                      </div>
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Inspanning</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600 w-20">Planning</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Opdrachtgever</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Leider</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Resultaat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainEfforts.map((e, i) => (
                              <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                                <td className="px-3 py-1.5 font-medium text-gray-800">{e.title || e.description}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.quarter || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.eigenaar || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.inspanningsleider || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.verwachtResultaat || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </DocumentSubSection>
            )}
          </div>
        );
      })}
    </DocumentSection>
  );
}

function CrossAnalyseBlock({ session }: { session: DINSession }) {
  // Domeinbalans berekenen
  const domainCounts = (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    count: session.efforts.filter((e) => e.domain === domain).length,
  }));
  const total = domainCounts.reduce((sum, d) => sum + d.count, 0) || 1;

  // Gedeelde vermogens (vermogens die in meerdere sectoren voorkomen via beschrijving-match)
  const capBySector: Record<string, Set<string>> = {};
  session.capabilities.forEach((c) => {
    const key = (c.title || c.description || "").toLowerCase().trim();
    if (!capBySector[key]) capBySector[key] = new Set();
    capBySector[key].add(c.sectorId);
  });
  const sharedCaps = Object.entries(capBySector).filter(([, sectors]) => sectors.size > 1);

  if (session.efforts.length === 0 && sharedCaps.length === 0) return null;

  return (
    <DocumentSection title="Cross-analyse">
      {/* Domeinbalans */}
      <DocumentSubSection title="Domeinbalans inspanningen">
        <div className="space-y-2">
          {domainCounts.map(({ domain, label, count }) => {
            const pct = Math.round((count / total) * 100);
            const colors = DOMAIN_COLORS[domain];
            return (
              <div key={domain} className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium text-gray-600">{label}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bg} border ${colors.border} rounded-full transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-gray-500 text-right">
                  {count} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </DocumentSubSection>

      {/* Synergieën */}
      {sharedCaps.length > 0 && (
        <DocumentSubSection title="Synergieën (gedeelde vermogens)">
          <div className="space-y-1.5">
            {sharedCaps.map(([cap, sectors], i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#003366] mt-0.5 shrink-0">&bull;</span>
                <span className="text-gray-700">
                  {cap}
                  <span className="text-gray-400 ml-1">
                    — Sectoren: {Array.from(sectors).join(", ")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </DocumentSubSection>
      )}
    </DocumentSection>
  );
}

function RoadmapBlock({ session }: { session: DINSession }) {
  const quarters = Array.from(
    new Set(session.efforts.filter((e) => e.quarter).map((e) => e.quarter!))
  ).sort();

  if (quarters.length === 0) return null;

  const statusLabel: Record<string, string> = {
    gepland: "Gepland",
    in_uitvoering: "In uitvoering",
    afgerond: "Afgerond",
    on_hold: "On hold",
  };
  const statusStyle: Record<string, string> = {
    gepland: "bg-gray-100 text-gray-600",
    in_uitvoering: "bg-blue-100 text-blue-700",
    afgerond: "bg-emerald-100 text-emerald-700",
    on_hold: "bg-amber-100 text-amber-700",
  };

  return (
    <DocumentSection title="Roadmap">
      <div className="space-y-5">
        {quarters.map((q) => {
          const qEfforts = session.efforts.filter((e) => e.quarter === q);
          return (
            <div key={q}>
              <h4 className="text-sm font-bold text-[#003366]/70 mb-2">{q}</h4>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Sector</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Domein</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Inspanning</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qEfforts.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                        <td className="px-3 py-2 text-gray-600">{e.sectorId}</td>
                        <td className="px-3 py-2 text-gray-600">{DOMAIN_LABELS[e.domain]}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {e.title || e.description}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[e.status] || "bg-gray-100 text-gray-600"}`}>
                            {statusLabel[e.status] || e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </DocumentSection>
  );
}

// --- Hoofd ExportStep ---

export default function ExportStep() {
  const { session } = useSession();
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!session) return null;

  async function handleExportWord() {
    setIsExportingWord(true);
    setExportSuccess(false);
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
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (e) {
      console.error("Word export mislukt:", e);
    } finally {
      setIsExportingWord(false);
    }
  }

  // Samenvattingscijfers
  const stats = [
    { label: "Doelen", count: session.goals.length, color: "text-[#003366]" },
    { label: "Baten", count: session.benefits.length, color: "text-[#003366]" },
    { label: "Vermogens", count: session.capabilities.length, color: "text-[#003366]" },
    { label: "Inspanningen", count: session.efforts.length, color: "text-[#003366]" },
  ];

  const hasContent = session.goals.length > 0;

  return (
    <div className="space-y-6">
      {/* Export actie-balk */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5">
        <div>
          <h3 className="text-base font-bold text-[#003366] mb-1">
            Programmaplan exporteren
          </h3>
          <p className="text-xs text-gray-500">
            Download het volledige programmaplan als professioneel Word document
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exportSuccess && (
            <span className="text-xs text-emerald-600 font-medium animate-in fade-in">
              Document gedownload
            </span>
          )}
          <button
            onClick={handleExportWord}
            disabled={isExportingWord || !hasContent}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#003366] text-white rounded-lg text-sm font-medium hover:bg-[#004488] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExportingWord ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Document aanmaken...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Downloaden (.docx)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Samenvattingscijfers */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Document preview */}
      {hasContent && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Preview — Programmaplan
            </span>
            <span className="text-[10px] text-gray-400">
              Het Word document bevat dezelfde inhoud met professionele opmaak
            </span>
          </div>
          <div className="p-8 max-w-none">
            <DocumentTitlePage session={session} />
            <div className="mt-10">
              <VisionBlock session={session} />
              <ScopeBlock session={session} />
              <GoalsBlock session={session} />
              <DINPerGoalBlock session={session} />
              <CrossAnalyseBlock session={session} />
              <SectorBlocks session={session} />
              <RoadmapBlock session={session} />
            </div>
          </div>
        </div>
      )}

      {!hasContent && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-sm text-gray-500">
            Nog geen data beschikbaar. Doorloop eerst de eerdere stappen om het programmaplan te vullen.
          </div>
        </div>
      )}
    </div>
  );
}
