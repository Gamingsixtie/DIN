"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import { SECTORS, DOMAIN_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/types";
import { buildChainsForSector, analyzeHefbomen, getDomainBalance } from "@/lib/din-service";
import { categorizeGaps, getActiveCaps, getActiveEfforts } from "@/lib/word-export";
import {
  OrganigramView,
  RasciFullMatrix,
  buildClusterBron,
} from "@/components/steps/GovernanceStep";
import type { EffortDomain, DINSession, SectorName, IntegratieAdviesResult } from "@/lib/types";
import DINNetworkGraph from "@/components/din/DINNetworkGraph";
import StapSectorVertaling from "@/components/cross-analyse/StapSectorVertaling";
import type { Stap2Result, Stap4Result, Stap5Result } from "@/lib/types";

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


// --- Layout componenten ---

function DocumentTitlePage({ session }: { session: DINSession }) {
  return (
    <div className="text-center py-16 border-b-2 border-cito-blue/20">
      <div className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">
        Doelen-Inspanningennetwerk
      </div>
      <h1 className="text-3xl font-bold text-cito-blue mb-3">Programmaplan</h1>
      <h2 className="text-xl text-cito-blue/70 mb-2">{session.name}</h2>
      <div className="text-xs text-gray-400 mb-8">
        Methodiek: Werken aan Programma&apos;s (Prevaas &amp; Van Loon)
      </div>
      <div className="text-sm text-gray-400 italic">
        Gegenereerd: {new Date().toLocaleDateString("nl-NL", {
          day: "numeric", month: "long", year: "numeric",
        })}
      </div>
    </div>
  );
}

function Section({ title, number, children }: { title: string; number?: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-cito-blue mb-4 pb-2 border-b border-cito-blue/15">
        {number ? `${number} ` : ""}{title}
      </h2>
      {children}
    </div>
  );
}

function SubSection({ title, number, children }: { title: string; number?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-cito-blue/80 mb-3 uppercase tracking-wide">
        {number ? `${number} ` : ""}{title}
      </h3>
      {children}
    </div>
  );
}

// --- Programmavisie ---

function VisionBlock({ session, number }: { session: DINSession; number?: string }) {
  if (!session.vision) return null;
  return (
    <Section title="Programmavisie" number={number}>
      {session.vision.beknopt && (
        <p className="text-sm font-medium text-gray-800 leading-relaxed mb-3">
          {session.vision.beknopt}
        </p>
      )}
      {session.vision.uitgebreid && (
        <p className="text-sm text-gray-600 leading-relaxed">{session.vision.uitgebreid}</p>
      )}
    </Section>
  );
}

// --- Scope ---

function ScopeBlock({ session, number }: { session: DINSession; number?: string }) {
  if (!session.scope) return null;
  const gapData = categorizeGaps(session);
  const buitenItems: string[] = [];
  gapData.volgendeCyclus.forEach((g) => buitenItems.push(`Doel: ${g.name} — wordt in volgende cyclus uitgewerkt`));
  (session.scope.outScope ?? []).forEach((s) => buitenItems.push(s));

  return (
    <Section title="Scope" number={number}>
      <div className="grid grid-cols-2 gap-6">
        {session.scope.inScope.length > 0 && (
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Binnen scope</div>
            <ul className="space-y-1">
              {session.scope.inScope.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">+</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {buitenItems.length > 0 && (
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Buiten deze cyclus</div>
            <p className="text-[10px] italic text-gray-400 mb-1">Afgeleid uit Stap 4 + expliciete scope-uitsluitingen</p>
            <ul className="space-y-1">
              {buitenItems.map((item, i) => (
                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5 shrink-0">&minus;</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

function KernonderwerpenBlock({ session }: { session: DINSession }) {
  const rows = [...session.goals]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map((g) => {
      const benefits = session.benefits.filter((b) => b.goalId === g.id);
      const sectorsHit = new Set(benefits.map((b) => b.sectorId));
      return { rank: g.rank, name: g.name, sectorsCount: sectorsHit.size, benefitsCount: benefits.length, sectors: Array.from(sectorsHit) };
    });

  if (rows.length === 0) return null;

  return (
    <Section title="Kernonderwerpen">
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        De belangrijkste onderwerpen van dit programma, afgeleid uit de programmadoelen en hun thematische spreiding over de sectoren.
      </p>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-cito-blue/5">
            <tr>
              <th className="w-10 text-center px-2 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">#</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Onderwerp (programmadoel)</th>
              <th className="text-center px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Sectoren</th>
              <th className="text-center px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Baten</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Spreiding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.rank} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-center font-bold text-cito-blue">{r.rank}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                <td className="px-3 py-2 text-center text-gray-700 tabular-nums">{r.sectorsCount}</td>
                <td className="px-3 py-2 text-center text-gray-700 tabular-nums">{r.benefitsCount}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.sectors.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// --- Programmadoelen ---

function GoalsBlock({ session, number }: { session: DINSession; number?: string }) {
  return (
    <Section title="Programmadoelen" number={number}>
      <div className="space-y-3">
        {session.goals.sort((a, b) => a.rank - b.rank).map((goal) => (
          <div key={goal.id} className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-cito-blue text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
              {goal.rank}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{goal.name}</div>
              {goal.description && (
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{goal.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- DIN-Keten per Doel (met expliciete koppelingen, consolidation filtering) ---

function DINKetenBlock({ session, number }: { session: DINSession; number?: string }) {
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);

  const activeSession = useMemo(() => ({
    ...session,
    capabilities: activeCaps,
    efforts: activeEfforts,
  }), [session, activeCaps, activeEfforts]);

  const goalsWithData = session.goals
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  const activeSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s)
  );

  if (goalsWithData.length === 0) return null;

  return (
    <Section title="DIN-Netwerk per Doel" number={number}>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed">
        Per programmadoel wordt de volledige DIN-keten getoond: welke baten worden nagestreefd,
        welke vermogens daarvoor nodig zijn, en welke inspanningen die vermogens opbouwen.
      </p>

      {goalsWithData.map((goal) => (
        <div key={goal.id} className="mb-10 last:mb-0">
          <h3 className="text-sm font-bold text-cito-blue mb-4 pb-1 border-b border-gray-100">
            Doel {goal.rank}: {goal.name}
          </h3>

          {activeSectors.map((sector) => {
            const chainResult = buildChainsForSector(activeSession as DINSession, goal.id, sector);
            if (chainResult.chains.length === 0 && chainResult.unlinkedCaps.length === 0) return null;

            return (
              <div key={sector} className={`mb-6 border-l-4 ${SECTOR_ACCENT[sector]} pl-4`}>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Sector {sector}
                </div>

                {/* Gekoppelde ketens */}
                {chainResult.chains.map((chain) => (
                  <div key={chain.benefit.id} className="mb-4 last:mb-2">
                    {/* Baat */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-cito-blue rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                        BAAT
                      </span>
                      <div className="text-xs">
                        <span className="font-bold text-gray-800">
                          {chain.benefit.title || chain.benefit.description}
                        </span>
                        {chain.benefit.profiel.indicator && (
                          <span className="text-gray-500 ml-1">
                            ({chain.benefit.profiel.indicator}: {chain.benefit.profiel.currentValue || "?"} &rarr; {chain.benefit.profiel.targetValue || "?"})
                          </span>
                        )}
                        {chain.benefit.profiel.bateneigenaar && (
                          <span className="text-gray-400 ml-1">
                            — {chain.benefit.profiel.bateneigenaar}
                          </span>
                        )}
                        {chain.benefit.profiel.meetmethode && (
                          <div className="text-gray-400 mt-0.5">
                            Meetmethode: {chain.benefit.profiel.meetmethode}
                            {chain.benefit.profiel.measurementMoment && ` | Meetmoment: ${chain.benefit.profiel.measurementMoment}`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vermogens + Inspanningen */}
                    {chain.links.map((link) => {
                      const isSharedCap = link.capability.relatedSectors && link.capability.relatedSectors.length > 1;
                      return (
                        <div key={link.capability.id} className="ml-6 mb-2">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs font-bold text-cito-blue bg-cito-blue/10 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                              VERM
                            </span>
                            <div className="text-xs">
                              <span className={`font-medium text-gray-700${isSharedCap ? " italic" : ""}`}>
                                {link.capability.title || link.capability.description}
                                {isSharedCap && <span className="text-cito-blue/60 ml-1">(gedeeld)</span>}
                              </span>
                              {link.capability.currentLevel && link.capability.targetLevel && (
                                <span className="text-gray-400 ml-1">
                                  (niveau: {link.capability.currentLevel}/5 &rarr; {link.capability.targetLevel}/5)
                                </span>
                              )}
                              {link.capability.profiel?.eigenaar && (
                                <span className="text-gray-400 ml-1">
                                  — {link.capability.profiel.eigenaar}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Inspanningen onder dit vermogen */}
                          {link.efforts.map((effort) => {
                            const dc = DOMAIN_COLORS[effort.domain];
                            return (
                              <div key={effort.id} className="ml-6 flex items-start gap-2 mb-0.5">
                                <span className={`text-xs font-bold ${dc.text} ${dc.bg} rounded px-1.5 py-0.5 shrink-0 mt-0.5 border ${dc.border}`}>
                                  {DOMAIN_LABELS[effort.domain].slice(0, 4).toUpperCase()}
                                </span>
                                <div className="text-xs text-gray-600">
                                  {effort.title || effort.description}
                                  {effort.quarter && <span className="text-gray-400 ml-1">({effort.quarter})</span>}
                                  {effort.dossier?.eigenaar && <span className="text-gray-400 ml-1">— {effort.dossier.eigenaar}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Baat zonder gekoppelde vermogens */}
                    {chain.links.length === 0 && (
                      <div className="ml-6 text-xs text-amber-600 italic">
                        Nog geen vermogens gekoppeld aan deze baat
                      </div>
                    )}
                  </div>
                ))}

                {/* Ongekoppelde vermogens */}
                {chainResult.unlinkedCaps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Overige vermogens (niet gekoppeld aan een baat)
                    </div>
                    {chainResult.unlinkedCaps.map((c) => (
                      <div key={c.id} className="text-xs text-gray-500 ml-2 mb-0.5">
                        &bull; {c.title || c.description}
                        {c.relatedSectors && c.relatedSectors.length > 1 && (
                          <span className="text-cito-blue/60 italic ml-1">(gedeeld)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Section>
  );
}

// --- DIN Tabel-Flow Visualisatie ---

function DINFlowTable({ session, number }: { session: DINSession; number?: string }) {
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);

  const activeSession = useMemo(() => ({
    ...session,
    capabilities: activeCaps,
    efforts: activeEfforts,
  }), [session, activeCaps, activeEfforts]);

  const goalsWithData = session.goals
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  const activeSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s) || activeEfforts.some((e) => e.sectorId === s)
  );

  if (goalsWithData.length === 0) return null;

  return (
    <Section title="DIN-Overzicht" number={number}>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed">
        Tabelweergave van de volledige DIN-keten per doel per sector: baat, vermogen en inspanning in samenhang.
      </p>

      {goalsWithData.map((goal) => (
        <div key={goal.id} className="mb-8 last:mb-0">
          <h3 className="text-sm font-bold text-cito-blue mb-4 pb-1 border-b border-gray-100">
            Doel {goal.rank}: {goal.name}
          </h3>

          {activeSectors.map((sector) => {
            const chainResult = buildChainsForSector(activeSession as DINSession, goal.id, sector);
            const hasData = chainResult.chains.length > 0 || chainResult.unlinkedCaps.length > 0;

            return (
              <div key={sector} className={`mb-6 border-l-4 ${SECTOR_ACCENT[sector]} pl-4`}>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Sector {sector}
                </div>

                {!hasData ? (
                  <p className="text-sm text-gray-400 italic mb-4">
                    Dit doel is nog niet uitgewerkt voor sector {sector}.
                  </p>
                ) : (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-cito-blue/5">
                          <th className="text-cito-blue font-bold text-xs uppercase tracking-wide p-2 text-left" style={{ width: "30%" }}>Baat</th>
                          <th className="text-gray-400 text-center p-2" style={{ width: "4%" }}>{"\u2192"}</th>
                          <th className="text-cito-blue font-bold text-xs uppercase tracking-wide p-2 text-left" style={{ width: "28%" }}>Vermogen</th>
                          <th className="text-gray-400 text-center p-2" style={{ width: "4%" }}>{"\u2192"}</th>
                          <th className="text-cito-blue font-bold text-xs uppercase tracking-wide p-2 text-left" style={{ width: "34%" }}>Inspanning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chainResult.chains.map((chain) => {
                          // Build flat rows: benefit spans all, cap spans its efforts
                          const rows: { benefitLabel: string | null; capLabel: string | null; capShared: boolean; effortLabel: string; effortDomain: EffortDomain }[] = [];

                          chain.links.forEach((link, linkIdx) => {
                            const isSharedCap = link.capability.relatedSectors && link.capability.relatedSectors.length > 1;
                            if (link.efforts.length === 0) {
                              rows.push({
                                benefitLabel: linkIdx === 0 ? (chain.benefit.title || chain.benefit.description) : null,
                                capLabel: link.capability.title || link.capability.description,
                                capShared: !!isSharedCap,
                                effortLabel: "",
                                effortDomain: "mens",
                              });
                            } else {
                              link.efforts.forEach((effort, ei) => {
                                rows.push({
                                  benefitLabel: linkIdx === 0 && ei === 0 ? (chain.benefit.title || chain.benefit.description) : null,
                                  capLabel: ei === 0 ? (link.capability.title || link.capability.description) : null,
                                  capShared: !!isSharedCap,
                                  effortLabel: `${effort.title || effort.description} [${DOMAIN_LABELS[effort.domain]}]`,
                                  effortDomain: effort.domain,
                                });
                              });
                            }
                          });

                          // If no links at all, show benefit with empty cap/effort
                          if (chain.links.length === 0) {
                            rows.push({
                              benefitLabel: chain.benefit.title || chain.benefit.description,
                              capLabel: null,
                              capShared: false,
                              effortLabel: "",
                              effortDomain: "mens",
                            });
                          }

                          return rows.map((row, ri) => (
                            <tr key={`${chain.benefit.id}-${ri}`} className="border-b border-gray-100">
                              <td className={`text-sm text-gray-700 p-2${row.benefitLabel ? " bg-blue-50/50" : ""}`}>
                                {row.benefitLabel || ""}
                              </td>
                              <td className="text-gray-400 text-center p-2">{row.benefitLabel || row.capLabel ? "\u2192" : ""}</td>
                              <td className={`text-sm p-2${row.capShared ? " bg-[#F0F4FF] italic" : " text-gray-700"}`}>
                                {row.capLabel ? (
                                  <>
                                    {row.capLabel}
                                    {row.capShared && <span className="text-cito-blue/60 ml-1">(gedeeld)</span>}
                                  </>
                                ) : ""}
                              </td>
                              <td className="text-gray-400 text-center p-2">{row.capLabel || row.effortLabel ? "\u2192" : ""}</td>
                              <td className={`text-sm text-gray-700 p-2${row.effortLabel ? ` ${DOMAIN_COLORS[row.effortDomain].bg}` : ""}`}>
                                {row.effortLabel}
                              </td>
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Section>
  );
}

// --- Cross-analyse: synergieën (gedeelde vermogens) ---

function CrossAnalyseBlock({ session, number }: { session: DINSession; number?: string }) {
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);

  const capBySector: Record<string, Set<string>> = {};
  activeCaps.forEach((c) => {
    const key = (c.title || c.description || "").toLowerCase().trim();
    if (!capBySector[key]) capBySector[key] = new Set();
    capBySector[key].add(c.sectorId);
  });
  const sharedCaps = Object.entries(capBySector).filter(([, s]) => s.size > 1);

  if (sharedCaps.length === 0) return null;

  return (
    <Section title="Synergieën tussen sectoren" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Vermogens die in meerdere sectoren tegelijk nodig zijn. Daar zit de cross-sectorale hefboom — gezamenlijk
        opbouwen levert breder effect dan per sector apart.
      </p>
      <div className="space-y-1.5">
        {sharedCaps.map(([cap, sectors], i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="text-cito-blue mt-0.5 shrink-0">&bull;</span>
            <span className="text-gray-700">
              {cap}
              <span className="text-gray-400 ml-1">— Sectoren: {Array.from(sectors).join(", ")}</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// --- Gap-analyse (smart categorization) ---

function GapAnalyseBlock({ session, number }: { session: DINSession; number?: string }) {
  const gapData = useMemo(() => categorizeGaps(session), [session]);

  const hasVolgendeCyclus = gapData.volgendeCyclus.length > 0;
  const hasEchteGaps = gapData.echteGapsGoals.length > 0 ||
                        gapData.benefitsWithoutCaps.length > 0 ||
                        gapData.capsWithoutEfforts.length > 0;

  return (
    <Section title="Gap-analyse" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Overzicht van de volledigheid van het DIN-netwerk: doelen die nog niet zijn uitgewerkt
        en onvolledige ketens die aandacht vragen.
      </p>

      {!hasVolgendeCyclus && !hasEchteGaps && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-xs font-bold text-emerald-800 mb-1">Alle ketens compleet</div>
          <div className="text-xs text-emerald-700">
            Elk doel is verbonden via baten en vermogens aan concrete inspanningen.
          </div>
        </div>
      )}

      {hasVolgendeCyclus && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Nog niet uitgewerkt (volgende cyclus)
            </div>
          </div>
          <div className="space-y-1">
            {gapData.volgendeCyclus.map((goal) => (
              <div key={goal.id} className="text-sm text-gray-600 ml-6">
                &bull; {goal.name} — uitwerking volgt in volgende cyclus
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEchteGaps && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              Aandachtspunten
            </div>
          </div>
          <div className="text-xs font-bold text-amber-700 mb-2">Onvolledige ketens</div>
          <div className="space-y-1">
            {gapData.echteGapsGoals.map((goal) => (
              <div key={goal.id} className="text-sm text-amber-800 ml-6">
                &bull; {goal.name} heeft geen baten
              </div>
            ))}
            {gapData.benefitsWithoutCaps.map((baat) => baat && (
              <div key={baat.id} className="text-sm text-amber-800 ml-6">
                &bull; &lsquo;{baat.title || baat.description}&rsquo; heeft geen gekoppeld vermogen
              </div>
            ))}
            {gapData.capsWithoutEfforts.map((vermogen) => vermogen && (
              <div key={vermogen.id} className="text-sm text-amber-800 ml-6">
                &bull; &lsquo;{vermogen.title || vermogen.description}&rsquo; heeft geen gekoppelde inspanning
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// --- Hefboomwerking ---

function HefboomBlock({ session, number }: { session: DINSession; number?: string }) {
  const hefbomen = useMemo(() => analyzeHefbomen(session), [session]);

  const multiSectorClusters = hefbomen.flatMap((h) => {
    const goal = session.goals.find((g) => g.id === h.goalId);
    return h.clusters
      .filter((c) => c.hefboomScore > 1)
      .map((cluster) => ({
        goal,
        cluster,
        chains: h.clusterChains.get(cluster.benefits[0].id) || [],
      }));
  });

  if (multiSectorClusters.length === 0) return null;

  return (
    <Section title="Hefboomwerking" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Baten die in meerdere sectoren terugkomen bieden hefboomwerking:
        gedeelde inspanningen met breed effect.
      </p>

      {multiSectorClusters.map(({ goal, cluster, chains }, i) => (
        <div key={i} className="mb-4 p-4 bg-cito-blue/5 rounded-lg border border-cito-blue/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-cito-blue">
              {cluster.theme}
            </span>
            <span className="text-xs text-gray-400">
              (Doel: {goal?.name}) — {cluster.sectors.length} sectoren
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {cluster.sectors.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                {s}
              </span>
            ))}
          </div>
          {chains.length > 0 && (
            <div className="space-y-1 mt-2">
              {chains.map((ch, ci) => (
                <div key={ci} className="text-xs text-gray-600">
                  <span className="font-medium">{ch.sector}:</span>{" "}
                  {ch.benefit.title || ch.benefit.description}
                  {ch.capabilities.length > 0 && (
                    <span className="text-gray-400"> &rarr; {ch.capabilities.map((c) => c.title || c.description).join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Section>
  );
}

// --- Governance & Monitoring ---

function GovernanceBlock({ session, number }: { session: DINSession; number?: string }) {
  if (session.benefits.length === 0) return null;

  // Bateneigenaren aggregeren
  const eigenaarMap: Record<string, { baten: string[]; sectors: Set<string> }> = {};
  session.benefits.forEach((b) => {
    const eigenaar = b.profiel.bateneigenaar || "Niet toegewezen";
    if (!eigenaarMap[eigenaar]) eigenaarMap[eigenaar] = { baten: [], sectors: new Set() };
    eigenaarMap[eigenaar].baten.push(b.title || b.description || "(naamloos)");
    eigenaarMap[eigenaar].sectors.add(b.sectorId);
  });

  const po = session.programmaorganisatie;
  const clusterRasci = session.clusterRasci ?? [];
  type RolWithGroep = import("@/lib/types").ProgrammaRol & { groep: string };
  const allRollen: RolWithGroep[] = [];
  if (po) {
    if (po.opdrachtgever) allRollen.push({ ...po.opdrachtgever, groep: "Opdrachtgever" });
    if (po.programmamanager) allRollen.push({ ...po.programmamanager, groep: "Programmamanager" });
    for (const r of po.kerngroep ?? []) allRollen.push({ ...r, groep: "Kerngroep" });
    for (const r of po.stuurgroep ?? []) allRollen.push({ ...r, groep: "Stuurgroep" });
    for (const r of po.domeineigenaren ?? []) allRollen.push({ ...r, groep: "Domeineigenaar" });
    for (const r of po.klankbordgroep ?? []) allRollen.push({ ...r, groep: "Klankbordgroep" });
  }
  const rolMap = new Map(allRollen.map((r) => [r.id, r]));

  return (
    <Section title="Governance & Monitoring" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Programmaorganisatie, RASCI-verantwoordelijkheden per hoofdthema, bateneigenaarschap en
        monitoring. Conform &quot;Werken aan Programma&apos;s&quot;, Hfst 6.
      </p>

      {/* Programmaorganisatie */}
      {po && allRollen.length > 0 && (
        <SubSection title="Programmaorganisatie">
          {po.aiToelichting && (
            <p className="text-xs text-gray-600 italic mb-3">{po.aiToelichting}</p>
          )}
          <div className="mb-4">
            <OrganigramView po={po} />
          </div>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-bold text-gray-600 w-36">Gremium</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Rol</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600 w-24">Sector</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Mandaat</th>
                </tr>
              </thead>
              <tbody>
                {allRollen.map((r, i) => (
                  <tr key={r.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-3 py-2 font-medium text-gray-700">{r.groep}</td>
                    <td className="px-3 py-2 text-gray-800">
                      <div className="font-medium">{r.rol}</div>
                      {r.naam && <div className="text-[10px] text-gray-500">{r.naam}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.sector || "\u2014"}</td>
                    <td className="px-3 py-2 text-gray-600">{r.mandaat || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(po.besluitvormingsritme || po.escalatiepad) && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {po.besluitvormingsritme && (
                <div className="p-3 rounded border border-gray-200 bg-gray-50">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">
                    Besluitvormingsritme
                  </div>
                  <div className="text-xs text-gray-700">{po.besluitvormingsritme}</div>
                </div>
              )}
              {po.escalatiepad && (
                <div className="p-3 rounded border border-gray-200 bg-gray-50">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">
                    Escalatiepad
                  </div>
                  <div className="text-xs text-gray-700">{po.escalatiepad}</div>
                </div>
              )}
            </div>
          )}
        </SubSection>
      )}

      {/* RASCI per hoofdthema */}
      {clusterRasci.length > 0 && (
        <SubSection title="RASCI per hoofdthema">
          <p className="text-xs text-gray-500 mb-3">
            Verantwoordelijkheidsverdeling per cross-sectoraal cluster — wet die geldt voor alle
            onderliggende baten, vermogens en inspanningen binnen dat cluster.
          </p>

          {/* Officiële RASCI-matrix (cluster × rol) */}
          {(() => {
            const wizard = session.crossAnalyseWizard;
            const bron = buildClusterBron(
              wizard?.stepResults?.stap2?.vermogenClusters ?? [],
              wizard?.stepResults?.stap3?.inspanningClusters ?? []
            );
            return (
              <div className="mb-4">
                <RasciFullMatrix clusters={bron} rollen={allRollen} rasci={clusterRasci} />
              </div>
            );
          })()}

          <div className="space-y-3">
            {clusterRasci.map((c) => {
              const nA = c.rijen.filter((x) => x.letter === "A").length;
              const nR = c.rijen.filter((x) => x.letter === "R").length;
              const valid = nA === 1 && nR >= 1;
              const perLetter: Record<string, string[]> = { R: [], A: [], S: [], C: [], I: [], V: [] };
              for (const rij of c.rijen) {
                const rol = rolMap.get(rij.rolId);
                if (rol && perLetter[rij.letter]) perLetter[rij.letter].push(rol.rol);
              }
              return (
                <div key={c.clusterTitel} className="border border-gray-200 rounded overflow-hidden">
                  <div className={`px-3 py-2 border-b flex items-center justify-between ${c.clusterType === "vermogen" ? "bg-indigo-50" : "bg-teal-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${c.clusterType === "vermogen" ? "bg-indigo-200 text-indigo-900" : "bg-teal-200 text-teal-900"}`}>
                        {c.clusterType}
                      </span>
                      <span className="text-xs font-semibold text-gray-800">{c.clusterTitel}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${valid ? "bg-green-50 text-green-800 border-green-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                      {valid ? "✓ Geldig" : `${nA} A, ${nR} R`}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {(["A", "R", "S", "C", "I", "V"] as const).map((letter) => {
                        const namen = perLetter[letter] ?? [];
                        if (letter === "V" && namen.length === 0) return null;
                        return (
                          <tr key={letter} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-3 py-1.5 w-10 font-bold text-center text-gray-700 bg-gray-50 border-r border-gray-100">
                              {letter}
                            </td>
                            <td className="px-3 py-1.5 text-gray-700">
                              {namen.length > 0 ? namen.join("; ") : <span className="text-gray-400 italic">{"\u2014"}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {c.toelichting && (
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-600 italic">
                      {c.toelichting}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SubSection>
      )}

      {/* RASCI per individueel item (baten, vermogens, inspanningen) */}
      {(() => {
        const itemRasci = session.itemRasci ?? [];
        if (itemRasci.length === 0 || allRollen.length === 0) return null;
        const benefitsRasci = itemRasci.filter((i) => i.itemType === "benefit");
        const capabilitiesRasci = itemRasci.filter((i) => i.itemType === "capability");
        const renderItemList = (
          itemsRasci: typeof itemRasci,
          lookupTitle: (id: string) => string
        ) => (
          <div className="space-y-2">
            {itemsRasci.map((it) => {
              const perLetter: Record<string, string[]> = { R: [], A: [], S: [], C: [], I: [], V: [] };
              for (const rij of it.rijen) {
                const rol = rolMap.get(rij.rolId);
                if (rol) perLetter[rij.letter].push(rol.rol);
              }
              const nA = it.rijen.filter((x) => x.letter === "A").length;
              const nR = it.rijen.filter((x) => x.letter === "R").length;
              const valid = nA === 1 && nR >= 1;
              return (
                <div key={it.itemId} className="border border-gray-200 rounded p-2 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{lookupTitle(it.itemId)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${valid ? "bg-green-50 text-green-800 border-green-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                      {valid ? "✓" : `${nA}A/${nR}R`}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-700 space-y-0.5">
                    {(["A", "R", "S", "C", "I", "V"] as const).map((l) =>
                      perLetter[l].length > 0 ? (
                        <div key={l}>
                          <span className="font-bold text-gray-600">{l}:</span> {perLetter[l].join("; ")}
                        </div>
                      ) : null
                    )}
                  </div>
                  {it.toelichting && (
                    <div className="text-[10px] text-gray-500 italic mt-1">{it.toelichting}</div>
                  )}
                </div>
              );
            })}
          </div>
        );

        return (
          <>
            {benefitsRasci.length > 0 && (
              <SubSection title="RASCI per baat">
                {renderItemList(benefitsRasci, (id) => {
                  const b = session.benefits.find((x) => x.id === id);
                  return b ? (b.title || b.description || "(naamloos)") : id;
                })}
              </SubSection>
            )}
            {capabilitiesRasci.length > 0 && (
              <SubSection title="RASCI per individueel vermogen">
                {renderItemList(capabilitiesRasci, (id) => {
                  const c = session.capabilities.find((x) => x.id === id);
                  return c ? `[${c.sectorId}] ${c.title || c.description || "(naamloos)"}` : id;
                })}
              </SubSection>
            )}
          </>
        );
      })()}

      {/* Bateneigenaren */}
      <SubSection title="Bateneigenaren">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-bold text-gray-600">Eigenaar</th>
                <th className="px-3 py-2 text-left font-bold text-gray-600">Sectoren</th>
                <th className="px-3 py-2 text-left font-bold text-gray-600">Verantwoordelijk voor baten</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(eigenaarMap).map(([eigenaar, data], i) => (
                <tr key={eigenaar} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <td className="px-3 py-2 font-medium text-gray-800">{eigenaar}</td>
                  <td className="px-3 py-2 text-gray-600">{Array.from(data.sectors).join(", ")}</td>
                  <td className="px-3 py-2 text-gray-600">{data.baten.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubSection>

    </Section>
  );
}

// --- Externe projecten ---

function ExterneProjectenBlock({ session, number }: { session: DINSession; number?: string }) {
  if (!session.externalProjects || session.externalProjects.length === 0) return null;

  return (
    <Section title="Lopende projecten" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Bestaande projecten gekoppeld aan het DIN-netwerk, gepositioneerd als inspanningen bij de relevante vermogens.
      </p>
      <div className="space-y-3">
        {session.externalProjects.map((p) => {
          const linkedCapIds = (session.projectCapabilityMaps || [])
            .filter(m => m.projectId === p.id)
            .map(m => m.capabilityId);
          const linkedCaps = (session.capabilities || []).filter(c => linkedCapIds.includes(c.id));

          return (
            <div key={p.id} className="p-3 bg-white border border-gray-200 rounded-lg border-l-[3px] border-l-[#0066cc]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{p.name}</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Lopend project</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
              {p.description && <p className="text-xs text-gray-600 mb-1">{p.description}</p>}
              {(p.domains || []).length > 0 && (
                <div className="flex gap-1 mb-1">
                  {(p.domains || []).map(d => (
                    <span key={d} className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
                      {DOMAIN_LABELS[d as EffortDomain] || d}
                    </span>
                  ))}
                </div>
              )}
              {linkedCaps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Gekoppeld aan:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {linkedCaps.map(cap => (
                      <span key={cap.id} className="px-1.5 py-0.5 text-[10px] rounded bg-[#0891b2]/10 text-[#0891b2]">
                        {cap.description.slice(0, 60)}{cap.description.length > 60 ? "..." : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// --- Sectorale uitwerking ---

function IntegratieAdviesSubSection({ advies }: { advies: IntegratieAdviesResult }) {
  const sections: { key: keyof IntegratieAdviesResult; label: string }[] = [
    { key: "aansluiting", label: "Aansluiting op KiB-doelen" },
    { key: "verrijking", label: "Verrijking" },
    { key: "aanvullingen", label: "Aanvullingen" },
    { key: "quickWins", label: "Quick wins" },
    { key: "aandachtspunten", label: "Aandachtspunten" },
  ];

  return (
    <SubSection title="Integratie-advies">
      <div className="space-y-3">
        {sections.map(({ key, label }) => {
          const item = advies[key];
          if (!item || typeof item === "string") return null;
          if (!("punten" in item) || item.punten.length === 0) return null;
          return (
            <div key={key}>
              <div className="text-xs font-bold text-gray-600 mb-1">{label}</div>
              {item.punten.map((punt, i) => (
                <div key={i} className="text-xs text-gray-600 ml-2 mb-0.5">
                  &bull; {punt}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </SubSection>
  );
}

function SectorBlocks({ session, sectionNumbers }: { session: DINSession; sectionNumbers: Record<string, string> }) {
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);

  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      activeCaps.some((c) => c.sectorId === s) ||
      activeEfforts.some((e) => e.sectorId === s)
  );

  if (activeSectors.length === 0) return null;

  return (
    <>
      {activeSectors.map((sector) => {
        const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
        const sectorCaps = activeCaps.filter((c) => c.sectorId === sector);
        const sectorEfforts = activeEfforts.filter((e) => e.sectorId === sector);
        const accent = SECTOR_ACCENT[sector];

        // Integratie-advies ophalen
        const rawAdvies = session.integratieAdvies?.[sector];
        const integratieAdvies: IntegratieAdviesResult | null =
          rawAdvies && typeof rawAdvies === "object" && "sectorName" in (rawAdvies as Record<string, unknown>)
            ? (rawAdvies as IntegratieAdviesResult)
            : null;

        return (
          <Section key={sector} title={`Sectorale Uitwerking — ${sector}`} number={sectionNumbers[`sector-${sector}`]}>
            <div className={`border-l-4 ${accent} pl-5`}>
              {/* Baten met volledig profiel */}
              {sectorBenefits.length > 0 && (
                <SubSection title="Baten">
                  <div className="overflow-x-auto">
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Baat</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Indicator</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Huidig &rarr; Doel</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Eigenaar</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Meetmethode</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Meetmoment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectorBenefits.map((b, i) => (
                            <tr key={b.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-800">{b.title || b.description}</div>
                                {b.description && b.title && (
                                  <div className="text-gray-400 mt-0.5">{b.description}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{b.profiel.indicator || "\u2014"}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {b.profiel.currentValue && b.profiel.targetValue
                                  ? `${b.profiel.currentValue} \u2192 ${b.profiel.targetValue}`
                                  : "\u2014"}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{b.profiel.bateneigenaar || "\u2014"}</td>
                              <td className="px-3 py-2 text-gray-600">{b.profiel.meetmethode || "\u2014"}</td>
                              <td className="px-3 py-2 text-gray-600">{b.profiel.measurementMoment || "\u2014"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </SubSection>
              )}

              {/* Vermogens met volledig profiel */}
              {sectorCaps.length > 0 && (
                <SubSection title="Vermogens">
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-bold text-gray-600">Vermogen</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600">Eigenaar</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600">Niveau</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600">Huidige situatie</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600">Gewenste situatie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectorCaps.map((c, i) => {
                          const isShared = c.relatedSectors && c.relatedSectors.length > 1;
                          return (
                            <tr key={c.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {c.title || c.description}
                                {isShared && <span className="text-cito-blue/60 italic ml-1">(gedeeld)</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{c.profiel?.eigenaar || "\u2014"}</td>
                              <td className="px-3 py-2 text-gray-600">
                                {c.currentLevel && c.targetLevel ? `${c.currentLevel}/5 \u2192 ${c.targetLevel}/5` : "\u2014"}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{c.profiel?.huidieSituatie || "\u2014"}</td>
                              <td className="px-3 py-2 text-gray-600">{c.profiel?.gewensteSituatie || "\u2014"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </SubSection>
              )}

              {/* Inspanningen per domein met volledig dossier */}
              {sectorEfforts.length > 0 && (
                <SubSection title="Inspanningen">
                  {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
                    const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
                    if (domainEfforts.length === 0) return null;
                    const dc = DOMAIN_COLORS[domain];
                    return (
                      <div key={domain} className="mb-3 last:mb-0">
                        <div className={`text-xs font-bold ${dc.text} mb-1.5`}>{DOMAIN_LABELS[domain]}</div>
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600">Inspanning</th>
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600 w-16">Planning</th>
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600">Opdrachtgever</th>
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600">Leider</th>
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600">Kosten</th>
                                <th className="px-3 py-1.5 text-left font-bold text-gray-600">Resultaat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {domainEfforts.map((e, i) => (
                                <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                                  <td className="px-3 py-1.5">
                                    <div className="font-medium text-gray-800">{e.title || e.description}</div>
                                    {e.dossier?.randvoorwaarden && (
                                      <div className="text-gray-400 text-xs mt-0.5">
                                        Randvoorwaarden: {e.dossier.randvoorwaarden}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-gray-600">{e.quarter || "\u2014"}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{e.dossier?.eigenaar || "\u2014"}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{e.dossier?.inspanningsleider || "\u2014"}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{e.dossier?.kostenraming || "\u2014"}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{e.dossier?.verwachtResultaat || "\u2014"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </SubSection>
              )}

              {/* Integratie-advies */}
              {integratieAdvies && <IntegratieAdviesSubSection advies={integratieAdvies} />}
            </div>
          </Section>
        );
      })}
    </>
  );
}

// --- Roadmap ---

// Helper: maak een lijst kwartalen van de planning op (bv "Q2 2026" → numeric index)
function quarterIndexFromString(q: string): number {
  const m = q.match(/Q(\d)\s*(\d{4})/);
  if (!m) return 0;
  return parseInt(m[2], 10) * 4 + parseInt(m[1], 10);
}
function quartersBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const sM = start.match(/Q(\d)\s*(\d{4})/);
  const eM = end.match(/Q(\d)\s*(\d{4})/);
  if (!sM || !eM) return result;
  let q = parseInt(sM[1], 10);
  let y = parseInt(sM[2], 10);
  const eQ = parseInt(eM[1], 10);
  const eY = parseInt(eM[2], 10);
  while (y < eY || (y === eY && q <= eQ)) {
    result.push(`Q${q} ${y}`);
    q++;
    if (q > 4) { q = 1; y++; }
    if (result.length > 40) break;
  }
  return result;
}

function RoadmapBlock({ session, number }: { session: DINSession; number?: string }) {
  const planning = session.planningVoorstel;

  const sortedBundels = useMemo(() => {
    if (!planning?.bundelPlanning) return [];
    return [...planning.bundelPlanning].sort(
      (a, b) => quarterIndexFromString(a.startKwartaal) - quarterIndexFromString(b.startKwartaal)
    );
  }, [planning]);

  // Bouw de kolommen van de gantt-tabel: alle unieke kwartalen tussen vroegste start en laatste eind
  const allQuarters = useMemo(() => {
    if (sortedBundels.length === 0) return [] as string[];
    const minStart = sortedBundels.reduce(
      (acc, b) => (quarterIndexFromString(b.startKwartaal) < quarterIndexFromString(acc) ? b.startKwartaal : acc),
      sortedBundels[0].startKwartaal
    );
    const maxEnd = sortedBundels.reduce(
      (acc, b) => (quarterIndexFromString(b.eindKwartaal) > quarterIndexFromString(acc) ? b.eindKwartaal : acc),
      sortedBundels[0].eindKwartaal
    );
    return quartersBetween(minStart, maxEnd);
  }, [sortedBundels]);

  // Bundels per domein in outside-in volgorde voor consistente weergave
  const outsideIn: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];
  const bundelsByDomein = useMemo(() => {
    return outsideIn
      .map((d) => sortedBundels.find((b) => b.domein === d))
      .filter((b): b is NonNullable<typeof b> => b !== undefined);
  }, [sortedBundels]);

  // Auto-gegenereerde samenvatting van de planning
  const autoSamenvatting = useMemo(() => {
    if (sortedBundels.length === 0) return "";
    const eersteKwartaal = sortedBundels[0].startKwartaal;
    const laatsteKwartaal = [...sortedBundels].sort(
      (a, b) => quarterIndexFromString(b.eindKwartaal) - quarterIndexFromString(a.eindKwartaal)
    )[0].eindKwartaal;

    // Parallelle starters: bundels met dezelfde startKwartaal als eerste
    const parallelStart = sortedBundels.filter((b) => b.startKwartaal === eersteKwartaal);
    const parallelDomeinen = parallelStart.map((b) => DOMAIN_LABELS[b.domein]);

    // Cyclus-overzicht
    const cycli = new Map<string, typeof sortedBundels>();
    sortedBundels.forEach((b) => {
      const lst = cycli.get(b.cyclusLabel) ?? [];
      lst.push(b);
      cycli.set(b.cyclusLabel, lst);
    });

    const cyclusBeschrijving = Array.from(cycli.entries())
      .map(([label, items]) => {
        const start = [...items].sort(
          (a, b) => quarterIndexFromString(a.startKwartaal) - quarterIndexFromString(b.startKwartaal)
        )[0].startKwartaal;
        const eind = [...items].sort(
          (a, b) => quarterIndexFromString(b.eindKwartaal) - quarterIndexFromString(a.eindKwartaal)
        )[0].eindKwartaal;
        return `${label} (${start} → ${eind}, ${items.length} bundel${items.length === 1 ? "" : "s"})`;
      })
      .join("; ");

    let zin1: string;
    if (parallelStart.length >= 2) {
      zin1 = `Het programma start parallel in ${eersteKwartaal} met ${parallelStart.length} domeinen tegelijk: ${parallelDomeinen.join(", ")}. Daarmee kunnen meerdere lijnen direct van wal en wachten ze niet op elkaar.`;
    } else {
      zin1 = `Het programma start in ${eersteKwartaal} met ${parallelDomeinen[0]} als eerste lijn; de overige domeinen volgen daarna.`;
    }
    const zin2 = `De totale doorlooptijd loopt van ${eersteKwartaal} tot ${laatsteKwartaal}, verdeeld over ${cycli.size} cyclus${cycli.size === 1 ? "" : "sen"}: ${cyclusBeschrijving}.`;
    const zin3 = `Elke cyclus duurt 6 tot 9 maanden, zodat per fase resultaten geleverd én geëvalueerd worden voordat de volgende fase begint.`;
    return `${zin1} ${zin2} ${zin3}`;
  }, [sortedBundels]);

  return (
    <Section title="Roadmap" number={number}>
      <p className="text-sm text-gray-700 leading-relaxed mb-4 max-w-prose">
        De vier cross-sectorale inspanningen (één per domein) zijn ingedeeld in cycli van 6 tot 9 maanden.
        Onderstaande planning-tabel toont per bundel de doorlooptijd in kwartalen; daaronder volgen
        mijlpalen en risico&apos;s per bundel.
      </p>

      {!planning || sortedBundels.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Roadmap wordt in de planning-stap gegenereerd via AI-voorstel en vervolgens handmatig bijgesteld.
        </p>
      ) : (
        <>
          {/* Samenvatting — auto-gegenereerd uit data */}
          {autoSamenvatting && (
            <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                Samenvatting planning
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{autoSamenvatting}</p>
            </div>
          )}

          {planning.toelichting && planning.toelichting.trim().length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Toelichting programmamanager
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{planning.toelichting}</p>
            </div>
          )}

          {/* Planning-tabel: bundels (rijen) × kwartalen (kolommen) */}
          {allQuarters.length > 0 && bundelsByDomein.length > 0 && (
            <div className="mb-5 overflow-x-auto border border-gray-200 rounded-lg bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-cito-blue/5 border-b-2 border-gray-200">
                    <th className="text-left px-3 py-2 text-[10px] font-semibold text-cito-blue uppercase tracking-wider sticky left-0 bg-cito-blue/5 min-w-[200px]">
                      Bundel
                    </th>
                    {allQuarters.map((q) => (
                      <th key={q} className="text-center px-2 py-2 text-[10px] font-semibold text-cito-blue uppercase tracking-wider min-w-[70px]">
                        {q}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bundelsByDomein.map((bp) => {
                    const dc = DOMAIN_COLORS[bp.domein];
                    const startIdx = allQuarters.indexOf(bp.startKwartaal);
                    const endIdx = allQuarters.indexOf(bp.eindKwartaal);
                    return (
                      <tr key={bp.bundelId} className="border-b border-gray-100 last:border-b-0 align-middle">
                        <td className={`px-3 py-3 sticky left-0 ${dc.bg} border-l-4 ${dc.border}`}>
                          <span className={`text-[10px] uppercase font-bold ${dc.text}`}>{DOMAIN_LABELS[bp.domein]}</span>
                          <p className="text-sm font-medium text-gray-800 leading-snug">{bp.titel}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{bp.cyclusLabel}</p>
                        </td>
                        {allQuarters.map((q, qi) => {
                          const isInRange = startIdx <= qi && qi <= endIdx;
                          const isStart = qi === startIdx;
                          const isEnd = qi === endIdx;
                          return (
                            <td key={q} className="px-1 py-3 align-middle">
                              {isInRange ? (
                                <div
                                  className={`h-5 ${dc.bg} border ${dc.border} ${isStart ? "rounded-l-md" : ""} ${isEnd ? "rounded-r-md" : ""}`}
                                />
                              ) : (
                                <div className="h-5 bg-gray-50/40" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mijlpalen + risico's per bundel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedBundels.map((bp) => {
              const dc = DOMAIN_COLORS[bp.domein];
              return (
                <div key={bp.bundelId} className={`border ${dc.border} rounded-lg bg-white overflow-hidden`}>
                  <div className={`px-3 py-2 ${dc.bg} border-b ${dc.border} flex items-center gap-2`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${dc.text}`}>
                      {DOMAIN_LABELS[bp.domein] || bp.domein}
                    </span>
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate" title={bp.titel}>
                      {bp.titel}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 font-medium shrink-0">
                      {bp.cyclusLabel}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-[11px] text-gray-500">
                      {bp.startKwartaal} → {bp.eindKwartaal}
                    </div>
                    {bp.beargumentatie && (
                      <p className="text-xs text-gray-600 italic leading-relaxed">{bp.beargumentatie}</p>
                    )}
                    {bp.mijlpalen && bp.mijlpalen.length > 0 && (
                      <ol className="space-y-1 pt-1">
                        {bp.mijlpalen.map((m, idx) => (
                          <li key={idx} className="text-xs flex gap-2">
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {m.periode}
                            </span>
                            <span className="text-gray-700">{m.mijlpaal}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {bp.risico && (
                      <p className="text-[11px] text-amber-700 italic pt-2 border-t border-gray-100">
                        <span className="font-medium not-italic">Risico: </span>
                        {bp.risico}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}

// --- Gap Detection Modal ---

// --- Hoofdstuk-wrapper voor programmaplan (live preview, spiegelt Word export) ---
function Chapter({
  number,
  title,
  intro,
  children,
}: {
  number: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <header className="mb-5">
        <div className="flex items-baseline gap-4 pb-2 border-b-[3px] border-cito-blue">
          <span className="text-4xl font-light text-cito-blue/50 tabular-nums leading-none">
            {number}
          </span>
          <h1 className="text-2xl font-bold text-cito-blue leading-tight">{title}</h1>
        </div>
      </header>
      {intro && (
        <p className="text-sm text-gray-700 leading-relaxed mb-5 max-w-prose">{intro}</p>
      )}
      {children}
    </section>
  );
}

// --- Programmadoelen met werkvolgorde-toelichting ---
function DoelenMetVolgordeBlock({ session }: { session: DINSession }) {
  const sortedGoals = [...session.goals].sort((a, b) => a.rank - b.rank);
  const focusDoelId = (session.crossAnalyseWizard?.stepResults?.stap5 as { focusDoelId?: string } | undefined)?.focusDoelId;
  const focusDoel = focusDoelId ? sortedGoals.find((g) => g.id === focusDoelId) : sortedGoals[0];
  const overigeDoelen = focusDoel ? sortedGoals.filter((g) => g.id !== focusDoel.id) : sortedGoals.slice(1);

  if (sortedGoals.length === 0) return null;

  return (
    <>
      <div className="mb-5 p-4 rounded-lg bg-cito-blue/5 border border-cito-blue/15">
        <div className="text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-2">
          Werkvolgorde
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-2">
          De programmadoelen worden volgordelijk opgepakt. We werken{" "}
          {focusDoel ? <strong>doel {focusDoel.rank} (&ldquo;{focusDoel.name}&rdquo;)</strong> : <strong>doel 1</strong>}{" "}
          eerst volledig af voordat de overige doelen{" "}
          {overigeDoelen.length > 0 && (
            <>
              (
              {overigeDoelen.map((g, i) => (
                <span key={g.id}>
                  {i > 0 && ", "}doel {g.rank}
                </span>
              ))}
              ){" "}
            </>
          )}
          aan de beurt komen. Dit borgt focus, haalbaarheid en de mogelijkheid om geleerde lessen mee te nemen
          naar de volgende doelcyclus.
        </p>
      </div>
      <div className="space-y-3">
        {sortedGoals.map((goal) => (
          <div key={goal.id} className="flex items-start gap-4">
            <div
              className={`w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                goal.id === focusDoel?.id ? "bg-cito-blue ring-4 ring-cito-blue/20" : "bg-cito-blue/60"
              }`}
            >
              {goal.rank}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <div className="text-sm font-bold text-gray-800">{goal.name}</div>
                {goal.id === focusDoel?.id && (
                  <span className="text-[10px] uppercase tracking-wider text-cito-blue font-bold">Focus</span>
                )}
              </div>
              {goal.description && (
                <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{goal.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// --- DIN-mapping per sector (sector-first view, met cross-sectoraal outro) ---
function DINMappingPerSectorBlock({ session }: { session: DINSession }) {
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);

  const activeSession = useMemo(
    () => ({ ...session, capabilities: activeCaps, efforts: activeEfforts }),
    [session, activeCaps, activeEfforts]
  );

  const goalsWithData = session.goals
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  const activeSectors = SECTORS.filter((s) => session.benefits.some((b) => b.sectorId === s));

  if (goalsWithData.length === 0 || activeSectors.length === 0) return null;

  return (
    <>
      <p className="text-sm text-gray-700 leading-relaxed mb-5 max-w-prose">
        Per sector (PO, VO, Zakelijk) is de DIN-keten opgesteld: van programmadoel via baten en vermogens naar
        concrete inspanningen. Hieronder per sector een korte toelichting en de uitwerking per doel.
      </p>
      {activeSectors.map((sector) => {
        const sectorBenefitsCount = session.benefits.filter((b) => b.sectorId === sector).length;
        const sectorCapsCount = activeCaps.filter((c) => c.sectorId === sector).length;
        const sectorEffortsCount = activeEfforts.filter((e) => e.sectorId === sector).length;

        return (
          <div key={sector} className={`mb-10 last:mb-0 border-l-4 ${SECTOR_ACCENT[sector]} pl-5`}>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-base font-bold text-cito-blue">Sector {sector}</h2>
              <span className="text-xs text-gray-500">
                {sectorBenefitsCount} baten · {sectorCapsCount} vermogens · {sectorEffortsCount} inspanningen
              </span>
            </div>
            <p className="text-xs text-gray-500 italic mb-4 leading-relaxed">
              De DIN-keten van sector {sector} verbindt de programmadoelen aan baten, vermogens en inspanningen die
              vanuit de eigen sectorcontext gerealiseerd worden.
            </p>

            {goalsWithData.map((goal) => {
              const chainResult = buildChainsForSector(activeSession as DINSession, goal.id, sector);
              if (chainResult.chains.length === 0 && chainResult.unlinkedCaps.length === 0) return null;

              return (
                <div key={goal.id} className="mb-5 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Doel {goal.rank}: {goal.name}
                  </h3>
                  {chainResult.chains.map((chain) => (
                    <div key={chain.benefit.id} className="mb-3 last:mb-1 ml-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-white bg-cito-blue rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                          BAAT
                        </span>
                        <div className="text-xs">
                          <span className="font-bold text-gray-800">
                            {chain.benefit.title || chain.benefit.description}
                          </span>
                          {chain.benefit.profiel.indicator && (
                            <span className="text-gray-500 ml-1">
                              ({chain.benefit.profiel.indicator}: {chain.benefit.profiel.currentValue || "?"} &rarr;{" "}
                              {chain.benefit.profiel.targetValue || "?"})
                            </span>
                          )}
                        </div>
                      </div>
                      {chain.links.map((link) => {
                        const isShared = link.capability.relatedSectors && link.capability.relatedSectors.length > 1;
                        return (
                          <div key={link.capability.id} className="ml-5 mb-1.5">
                            <div className="flex items-start gap-2 mb-0.5">
                              <span className="text-[10px] font-bold text-cito-blue bg-cito-blue/10 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                                VERM
                              </span>
                              <div className="text-xs">
                                <span className={`font-medium text-gray-700${isShared ? " italic" : ""}`}>
                                  {link.capability.title || link.capability.description}
                                  {isShared && <span className="text-cito-blue/60 ml-1">(gedeeld)</span>}
                                </span>
                              </div>
                            </div>
                            {link.efforts.map((effort) => {
                              const dc = DOMAIN_COLORS[effort.domain];
                              return (
                                <div key={effort.id} className="ml-5 flex items-start gap-2 mb-0.5">
                                  <span
                                    className={`text-[10px] font-bold ${dc.text} ${dc.bg} rounded px-1.5 py-0.5 shrink-0 mt-0.5 border ${dc.border}`}
                                  >
                                    {DOMAIN_LABELS[effort.domain].slice(0, 4).toUpperCase()}
                                  </span>
                                  <div className="text-xs text-gray-600">
                                    {effort.title || effort.description}
                                    {effort.quarter && (
                                      <span className="text-gray-400 ml-1">({effort.quarter})</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="mt-6 p-4 rounded-lg bg-cito-blue/5 border border-cito-blue/15">
        <div className="text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-1.5">
          Naar de cross-sectorale uitkomst
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          De drie sectorale DIN-mappings overlappen op meerdere vermogens. Daar zit de hefboom van het programma:
          gezamenlijk opbouwen levert breder effect dan apart per sector. Hoofdstuk 4 toont de cross-sectorale
          uitkomst &mdash; de geconsolideerde inspanningen, de begroting en het uiteindelijke DIN-netwerk dat per
          sector wordt teruggebracht.
        </p>
      </div>
    </>
  );
}

// --- Scenario-totaaloverzicht (4 scenarios + motivatie waarom actief scenario) ---
type ScenarioKey = "optimaal" | "plus20" | "min20" | "advies";
const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  optimaal: "Huidig budget",
  plus20: "+20% (sneller)",
  min20: "−20% (langzamer)",
  advies: "Optimaal (advies)",
};
const SCENARIO_KLEUR: Record<ScenarioKey, { ring: string; bg: string; accent: string; banner: string; bannerTekst: string }> = {
  optimaal: { ring: "ring-cito-blue", bg: "bg-blue-50", accent: "text-cito-blue", banner: "bg-cito-blue", bannerTekst: "text-blue-100" },
  plus20: { ring: "ring-emerald-700", bg: "bg-emerald-50", accent: "text-emerald-800", banner: "bg-emerald-800", bannerTekst: "text-emerald-100" },
  min20: { ring: "ring-amber-700", bg: "bg-amber-50", accent: "text-amber-800", banner: "bg-amber-800", bannerTekst: "text-amber-100" },
  advies: { ring: "ring-purple-700", bg: "bg-purple-50", accent: "text-purple-800", banner: "bg-purple-800", bannerTekst: "text-purple-100" },
};

const SCENARIO_ORDER_GLOBAL: ScenarioKey[] = ["optimaal", "plus20", "min20", "advies"];

// --- Raming out-of-pocket kosten — meerjarige verdeling per scenario per inspanning ---
// --- Raming-advies & vergelijking — hoogteafspraak voor de stuurgroep ---
function BegrotingAdviesSamenvattingBlock({ session }: { session: DINSession }) {
  type BegrScenario = {
    totaalGeraamdEuro?: number;
    samenvatting?: string;
    prioriteitAdvies?: string;
    aantalJaren?: number;
  };
  type BegrAdv = {
    startJaar?: number;
    scenarios?: Partial<Record<ScenarioKey, BegrScenario | null>>;
    vergelijking?: string;
  };
  type UrenScenario = { totaalKosten?: number; totaalUren?: number };
  type Stap4 = { begrotingAdvies?: BegrAdv; stap7InterneUren?: { scenarios?: Partial<Record<ScenarioKey, UrenScenario | null>> } };
  type Stap8 = { actiefScenario?: ScenarioKey };

  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4 } | undefined)?.stap4;
  const stap8 = (session.crossAnalyseWizard?.stepResults as { stap8?: Stap8 } | undefined)?.stap8;
  const begroting = stap4?.begrotingAdvies;
  const interneUren = stap4?.stap7InterneUren;

  if (!begroting?.scenarios) return null;

  const scenarioOrder: ScenarioKey[] = ["optimaal", "plus20", "min20", "advies"];
  const aanbevolen: ScenarioKey = stap8?.actiefScenario ?? "advies";
  const heeftAdvies = !!begroting.scenarios[aanbevolen];
  const echtAanbevolen: ScenarioKey = heeftAdvies ? aanbevolen : "optimaal";
  const aanbevolenScen = begroting.scenarios[echtAanbevolen] ?? null;
  const aanbevolenInt = interneUren?.scenarios?.[echtAanbevolen] ?? null;

  const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const totaalAanbevolen = (aanbevolenScen?.totaalGeraamdEuro ?? 0) + (aanbevolenInt?.totaalKosten ?? 0);

  const beschikbareScenarios = scenarioOrder.filter((k) => begroting.scenarios?.[k]);

  return (
    <div className="mb-6 space-y-4">
      {/* Aanbeveling-banner */}
      {aanbevolenScen && (
        <div className={`rounded-xl border-2 ${SCENARIO_KLEUR[echtAanbevolen].bg.replace("bg-", "border-").replace("-50", "-300")} ${SCENARIO_KLEUR[echtAanbevolen].bg} p-5`}>
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-8 h-8 rounded-full ${SCENARIO_KLEUR[echtAanbevolen].banner} text-white flex items-center justify-center font-bold`}>
              ✓
            </div>
            <div className="flex-1">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${SCENARIO_KLEUR[echtAanbevolen].accent} mb-0.5`}>
                Advies aan de stuurgroep
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                Kies scenario &ldquo;{SCENARIO_LABELS[echtAanbevolen]}&rdquo; — totaal {euroFmt.format(totaalAanbevolen)}
                {aanbevolenScen.aantalJaren ? ` over ${aanbevolenScen.aantalJaren} jaar` : ""}
              </h3>
              {aanbevolenScen.samenvatting && (
                <p className="text-sm text-gray-700 leading-relaxed mt-1 whitespace-pre-wrap">{aanbevolenScen.samenvatting}</p>
              )}
              {aanbevolenScen.prioriteitAdvies && (
                <p className="text-sm text-gray-600 italic leading-relaxed mt-2 whitespace-pre-wrap">{aanbevolenScen.prioriteitAdvies}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vergelijking AI-tekst (cross-scenario) */}
      {begroting.vergelijking && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 font-bold mb-1">
            Vergelijking van de vier scenario&apos;s
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{begroting.vergelijking}</p>
        </div>
      )}

      {/* Per-scenario one-liner overzicht */}
      {beschikbareScenarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarioOrder.map((k) => {
            const sc = begroting.scenarios?.[k];
            const isAanbevolen = k === echtAanbevolen;
            const oop = sc?.totaalGeraamdEuro ?? 0;
            const intK = interneUren?.scenarios?.[k]?.totaalKosten ?? 0;
            const tot = oop + intK;
            const kleur = SCENARIO_KLEUR[k];
            if (!sc) return null;
            return (
              <div
                key={k}
                className={`p-3 rounded-lg border ${isAanbevolen ? `${kleur.bg} border-2 ${kleur.bg.replace("bg-", "border-").replace("-50", "-300")}` : "bg-white border-gray-200"}`}
              >
                <div className={`text-[10px] uppercase font-bold tracking-wider ${kleur.accent} mb-1 flex items-center gap-1.5`}>
                  {SCENARIO_LABELS[k]}
                  {isAanbevolen && <span className="text-[9px] bg-white px-1 py-0.5 rounded border border-current">✓ advies</span>}
                </div>
                <div className="text-xl font-bold text-gray-800 tabular-nums">
                  {euroFmt.format(tot)}
                </div>
                {sc.samenvatting && (
                  <p className="text-[11px] text-gray-600 leading-snug mt-1.5 line-clamp-3" title={sc.samenvatting}>
                    {sc.samenvatting}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BegrotingAdviesBlock({ session }: { session: DINSession }) {
  type InspBegr = {
    inspanningTitel: string;
    domein: EffortDomain;
    totaalEuro: number;
    percentageTotaal: number;
    motivatie: string;
    verdelingPerJaar: Array<{ jaar: number; percentage: number; euro: number; fase: string; activiteit?: string }>;
    volgorde: { rank: number; reden: string };
  };
  type BegrScenario = {
    jaarlijksBudgetEuro?: number;
    aantalJaren?: number;
    totaalGeraamdEuro?: number;
    samenvatting?: string;
    prioriteitAdvies?: string;
    inspanningen?: InspBegr[];
    totalenPerJaar?: Array<{ jaar: number; euro: number; percentage: number }>;
  };
  type BegrAdv = {
    startJaar?: number;
    scenarios?: Partial<Record<ScenarioKey, BegrScenario | null>>;
    vergelijking?: string;
  };
  const begroting = (session.crossAnalyseWizard?.stepResults as { stap4?: { begrotingAdvies?: BegrAdv } } | undefined)?.stap4?.begrotingAdvies;
  if (!begroting?.scenarios) {
    return (
      <p className="text-sm text-gray-400 italic">
        Het begrotingsadvies (out-of-pocket) is nog niet beschikbaar.
      </p>
    );
  }

  const startJaar = begroting.startJaar ?? new Date().getFullYear();
  const beschikbaar = SCENARIO_ORDER_GLOBAL.filter((k) => begroting.scenarios?.[k]);
  if (beschikbaar.length === 0) {
    return <p className="text-sm text-gray-400 italic">Geen scenario&apos;s in het begrotingsadvies.</p>;
  }

  return (
    <>
      <p className="text-sm text-gray-700 leading-relaxed mb-4 max-w-prose">
        Out-of-pocket-uitgaven (externe kosten zoals licenties, inkoop en externe inhuur) per cross-sectorale
        inspanning, doorgerekend over de programma-jaren. Per scenario zie je de meerjarige verdeling met
        fase-aanduiding en activiteit per jaar.
      </p>

      {begroting.vergelijking && (
        <div className="mb-5 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-[10px] uppercase tracking-wider text-gray-600 font-bold mb-1">Vergelijking scenario&apos;s</div>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{begroting.vergelijking}</p>
        </div>
      )}

      <div className="space-y-6">
        {beschikbaar.map((key) => {
          const s = begroting.scenarios?.[key];
          if (!s) return null;
          const kleur = SCENARIO_KLEUR[key];
          const aantalJaren = s.aantalJaren ?? 1;
          const eindJaar = startJaar + aantalJaren - 1;
          const inspanningen = [...(s.inspanningen ?? [])].sort((a, b) => a.volgorde.rank - b.volgorde.rank);
          const totalenPerJaar = s.totalenPerJaar ?? [];

          return (
            <div key={key} className="space-y-3">
              <div className={`${kleur.banner} text-white rounded-lg p-4`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${kleur.bannerTekst} mb-1`}>
                  Scenario — {SCENARIO_LABELS[key]}
                </div>
                {s.samenvatting && <p className="text-sm leading-relaxed">{s.samenvatting}</p>}
                {s.totaalGeraamdEuro !== undefined && (
                  <p className={`text-xs ${kleur.bannerTekst} mt-2`}>
                    € {(s.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")} / jaar × {aantalJaren} jaar ({startJaar}–{eindJaar}) = <strong>€ {s.totaalGeraamdEuro.toLocaleString("nl-NL")}</strong>
                  </p>
                )}
              </div>

              {inspanningen.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Inspanning</th>
                        {Array.from({ length: aantalJaren }, (_, i) => startJaar + i).map((jr) => (
                          <th key={jr} className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{jr}</th>
                        ))}
                        <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Totaal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspanningen.map((insp, i) => {
                        const dc = DOMAIN_COLORS[insp.domein];
                        return (
                          <tr key={i} className="border-b border-gray-100 align-top">
                            <td className="py-2 px-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${kleur.banner} text-white text-[11px] font-bold`}>
                                {insp.volgorde.rank}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span className={`text-[10px] uppercase font-bold ${dc.text} ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 mb-1 inline-block`}>
                                {DOMAIN_LABELS[insp.domein]}
                              </span>
                              <p className="text-sm font-semibold text-gray-800 leading-snug">{insp.inspanningTitel}</p>
                              {insp.volgorde.reden && (
                                <p className="text-[11px] text-gray-600 mt-1 italic leading-snug">Positie: {insp.volgorde.reden}</p>
                              )}
                              {insp.motivatie && (
                                <p className="text-[11px] text-gray-600 mt-1 leading-snug">{insp.motivatie}</p>
                              )}
                            </td>
                            {Array.from({ length: aantalJaren }, (_, k) => startJaar + k).map((jr) => {
                              const cell = insp.verdelingPerJaar.find((x) => x.jaar === jr);
                              if (!cell || cell.euro === 0) {
                                return <td key={jr} className="text-right py-2 px-2 text-[11px] text-gray-300">—</td>;
                              }
                              return (
                                <td key={jr} className="py-2 px-2 align-top min-w-[140px]">
                                  <p className="text-sm font-semibold text-gray-800 text-right tabular-nums">€ {cell.euro.toLocaleString("nl-NL")}</p>
                                  <p className="text-[10px] text-gray-500 text-right">{cell.percentage}%</p>
                                  {cell.fase && <p className="text-[10px] text-gray-500 italic mt-0.5 text-right">{cell.fase}</p>}
                                  {cell.activiteit && (
                                    <p className="text-[10px] text-gray-700 mt-1 leading-snug border-t border-gray-100 pt-1">{cell.activiteit}</p>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-right py-2 px-2">
                              <p className={`text-sm font-bold ${kleur.accent} tabular-nums`}>€ {insp.totaalEuro.toLocaleString("nl-NL")}</p>
                              <p className="text-[10px] text-gray-500">{insp.percentageTotaal}%</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td className="py-2 px-2"></td>
                        <td className="py-2 px-2 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">Totaal per jaar</td>
                        {Array.from({ length: aantalJaren }, (_, k) => startJaar + k).map((jr) => {
                          const t = totalenPerJaar.find((x) => x.jaar === jr);
                          return (
                            <td key={jr} className="text-right py-2 px-2">
                              <p className={`text-sm font-bold ${kleur.accent} tabular-nums`}>€ {(t?.euro ?? 0).toLocaleString("nl-NL")}</p>
                              <p className="text-[10px] text-gray-500">{t?.percentage ?? 0}%</p>
                            </td>
                          );
                        })}
                        <td className="text-right py-2 px-2">
                          <p className={`text-sm font-bold ${kleur.accent} tabular-nums`}>€ {(s.totaalGeraamdEuro ?? 0).toLocaleString("nl-NL")}</p>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {s.prioriteitAdvies && (
                <div className={`p-3 rounded-lg ${kleur.bg} border border-gray-200`}>
                  <div className={`text-[10px] uppercase tracking-wider ${kleur.accent} font-bold mb-1`}>
                    Prioriteitadvies (outside-in volgorde)
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{s.prioriteitAdvies}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Interne uren — Cito-medewerkers per scenario per domein per jaar per rol ---
function InterneUrenBlock({ session }: { session: DINSession }) {
  type Rol = { functieId: string; functieNaam: string; afdeling?: string; uren: number; uurtarief: number; kosten: number };
  type JaarBlok = { jaar: number; activiteit: string; rollen: Rol[]; totaalUren?: number; totaalKosten?: number };
  type Domein = { domein: EffortDomain; motivatie?: string; jaren: JaarBlok[]; totaalUren?: number; totaalKosten?: number };
  type UrenScenario = {
    scenarioLabel?: ScenarioKey;
    aantalJaren?: number;
    startJaar?: number;
    uurtariefGebruikt?: number;
    domeinen: Domein[];
    totalenPerJaar?: Array<{ jaar: number; uren: number; kosten: number }>;
    totaalUren?: number;
    totaalKosten?: number;
    samenvatting?: string;
  };
  type UrenAdv = { uurtariefSettings?: { basisTarief: number; referentiejaar: number; indexatiePercentage: number }; scenarios?: Partial<Record<ScenarioKey, UrenScenario | null>> };
  const interneUren = (session.crossAnalyseWizard?.stepResults as { stap4?: { stap7InterneUren?: UrenAdv } } | undefined)?.stap4?.stap7InterneUren;
  if (!interneUren?.scenarios) {
    return <p className="text-sm text-gray-400 italic">Interne-uren-advies is nog niet beschikbaar.</p>;
  }
  const beschikbaar = SCENARIO_ORDER_GLOBAL.filter((k) => interneUren.scenarios?.[k]);
  if (beschikbaar.length === 0) {
    return <p className="text-sm text-gray-400 italic">Geen scenario&apos;s in het interne-uren-advies.</p>;
  }

  return (
    <>
      <p className="text-sm text-gray-700 leading-relaxed mb-4 max-w-prose">
        Inzet van Cito-medewerkers per inspanningsdomein, per jaar uitgewerkt naar functierollen, uren en
        bijbehorende kosten. Het uurtarief geldt over alle scenario&apos;s; de verdeling verschilt per scenario.
      </p>

      {interneUren.uurtariefSettings && (
        <p className="text-xs text-gray-500 italic mb-4">
          Basisuurtarief: € {interneUren.uurtariefSettings.basisTarief.toLocaleString("nl-NL")} (referentiejaar{" "}
          {interneUren.uurtariefSettings.referentiejaar}, indexatie {interneUren.uurtariefSettings.indexatiePercentage}%/jaar).
        </p>
      )}

      <div className="space-y-6">
        {beschikbaar.map((key) => {
          const s = interneUren.scenarios?.[key];
          if (!s) return null;
          const kleur = SCENARIO_KLEUR[key];

          return (
            <div key={key} className="space-y-3">
              <div className={`${kleur.banner} text-white rounded-lg p-4`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${kleur.bannerTekst} mb-1`}>
                  Scenario — {SCENARIO_LABELS[key]}
                </div>
                {s.samenvatting && <p className="text-sm leading-relaxed">{s.samenvatting}</p>}
                {s.totaalUren !== undefined && s.totaalKosten !== undefined && (
                  <p className={`text-xs ${kleur.bannerTekst} mt-2`}>
                    Totaal: <strong>{s.totaalUren.toLocaleString("nl-NL")} u</strong> × € {s.uurtariefGebruikt ?? 0} ={" "}
                    <strong>€ {s.totaalKosten.toLocaleString("nl-NL")}</strong>
                  </p>
                )}
              </div>

              {/* Domein-overzicht (totalen per domein) */}
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-cito-blue/5">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-cito-blue uppercase tracking-wider">Domein</th>
                      <th className="text-right px-3 py-2 text-[10px] font-semibold text-cito-blue uppercase tracking-wider">Uren</th>
                      <th className="text-right px-3 py-2 text-[10px] font-semibold text-cito-blue uppercase tracking-wider">Kosten</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {s.domeinen.map((d) => {
                      const dc = DOMAIN_COLORS[d.domein];
                      return (
                        <tr key={d.domein} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className={`text-[10px] uppercase font-bold ${dc.text} ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5`}>
                              {DOMAIN_LABELS[d.domein]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800 tabular-nums">{(d.totaalUren ?? 0).toLocaleString("nl-NL")} u</td>
                          <td className="px-3 py-2 text-right text-gray-800 font-semibold tabular-nums">€ {(d.totaalKosten ?? 0).toLocaleString("nl-NL")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per domein: per jaar de rol-tabel */}
              {s.domeinen.map((d) => {
                const dc = DOMAIN_COLORS[d.domein];
                return (
                  <div key={d.domein} className={`border ${dc.border} ${dc.bg} rounded-lg p-3`}>
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <div>
                        <span className={`text-[11px] uppercase font-bold ${dc.text}`}>{DOMAIN_LABELS[d.domein]}</span>
                        {d.motivatie && (
                          <p className="text-xs text-gray-600 italic leading-relaxed mt-0.5 max-w-prose">{d.motivatie}</p>
                        )}
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        <div className="font-semibold text-gray-800">{(d.totaalUren ?? 0).toLocaleString("nl-NL")} u</div>
                        <div className="text-gray-500">€ {(d.totaalKosten ?? 0).toLocaleString("nl-NL")}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {d.jaren.map((jr) => (
                        <div key={jr.jaar} className="bg-white border border-gray-100 rounded p-2.5">
                          <div className="flex items-baseline justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{jr.jaar}</span>
                              {jr.activiteit && <span className="text-xs text-gray-700 ml-2">{jr.activiteit}</span>}
                            </div>
                            <div className="text-right text-[11px] tabular-nums">
                              <div className="font-semibold text-gray-800">{(jr.totaalUren ?? jr.rollen.reduce((s, r) => s + r.uren, 0)).toLocaleString("nl-NL")} u</div>
                              <div className="text-gray-500">€ {(jr.totaalKosten ?? jr.rollen.reduce((s, r) => s + r.kosten, 0)).toLocaleString("nl-NL")}</div>
                            </div>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left border-b border-gray-100">
                                <th className="py-1 font-semibold text-gray-500">Rol</th>
                                <th className="py-1 font-semibold text-gray-500 text-right">Uren</th>
                                <th className="py-1 font-semibold text-gray-500 text-right">€ / u</th>
                                <th className="py-1 font-semibold text-gray-500 text-right">Kosten</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jr.rollen.map((r, i) => (
                                <tr key={`${r.functieId}-${i}`} className="border-b border-gray-50 last:border-b-0">
                                  <td className="py-1">
                                    <span className="text-gray-800">{r.functieNaam}</span>
                                    {r.afdeling && <span className="text-[10px] text-gray-500 ml-1">({r.afdeling})</span>}
                                  </td>
                                  <td className="py-1 text-right text-gray-800 tabular-nums">{r.uren.toLocaleString("nl-NL")}</td>
                                  <td className="py-1 text-right text-gray-500 tabular-nums">€ {r.uurtarief}</td>
                                  <td className="py-1 text-right font-semibold text-gray-800 tabular-nums">€ {r.kosten.toLocaleString("nl-NL")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ScenarioTotaalBlock({ session }: { session: DINSession }) {
  // Datasources (zelfde aanpak als StapTotaaloverzicht.tsx in de wizard):
  // - stap4.begrotingAdvies.scenarios[key]   → out-of-pocket (totaalGeraamdEuro) + samenvatting + prioriteitAdvies
  // - stap4.stap7InterneUren.scenarios[key]  → interne uren + interne kosten
  // - stap8 (optioneel): expliciet opgeslagen totaaloverzicht — fallback indien aanwezig
  type BegrotingScenario = {
    totaalGeraamdEuro?: number;
    samenvatting?: string;
    prioriteitAdvies?: string;
  };
  type BegrotingAdv = {
    scenarios?: Partial<Record<ScenarioKey, BegrotingScenario | null>>;
  };
  type InterneUrenScenario = { totaalUren?: number; totaalKosten?: number };
  type Stap7Internt = {
    scenarios?: Partial<Record<ScenarioKey, InterneUrenScenario | null>>;
  };
  type Stap4 = { begrotingAdvies?: BegrotingAdv; stap7InterneUren?: Stap7Internt };
  type ScenarioTot = { totaalOutOfPocket: number; totaalInterneUren: number; totaalGeraamd: number };
  type Stap8 = { actiefScenario?: ScenarioKey; scenarios?: Partial<Record<ScenarioKey, ScenarioTot | null>> };

  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4 } | undefined)?.stap4;
  const stap8 = (session.crossAnalyseWizard?.stepResults as { stap8?: Stap8 } | undefined)?.stap8;
  const begroting = stap4?.begrotingAdvies;
  const interneUren = stap4?.stap7InterneUren;

  const scenarioOrder: ScenarioKey[] = ["optimaal", "plus20", "min20", "advies"];
  const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  // Bereken totals per scenario uit primaire bronnen, met stap8 als fallback
  const rows = scenarioOrder
    .map((key) => {
      const b = begroting?.scenarios?.[key] ?? null;
      const i = interneUren?.scenarios?.[key] ?? null;
      const fromStap8 = stap8?.scenarios?.[key] ?? null;

      const outOfPocket = b?.totaalGeraamdEuro ?? fromStap8?.totaalOutOfPocket ?? 0;
      const interneKosten = i?.totaalKosten ?? fromStap8?.totaalInterneUren ?? 0;
      const totaalGeraamd = outOfPocket + interneKosten || fromStap8?.totaalGeraamd || 0;
      const interneUrenTotaal = i?.totaalUren ?? 0;

      // Skip lege rijen
      if (outOfPocket === 0 && interneKosten === 0 && totaalGeraamd === 0 && !b && !i && !fromStap8) {
        return null;
      }
      return { key, outOfPocket, interneKosten, interneUrenTotaal, totaalGeraamd };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        De begroting is nog niet beschikbaar. Genereer in de cross-analyse stap 6 (Optimaliseren) een
        begrotingsadvies en stap 7 (Interne uren) een uren-raming.
      </p>
    );
  }

  // Helper: bouw per-jaar regels op voor een scenario uit beschikbare bronnen
  type PerJaar = { jaar: number; outOfPocket: number; interneUren: number; interneKosten: number; totaal: number };
  type Stap8DetailExt = { scenarios?: Partial<Record<ScenarioKey, { perJaar?: PerJaar[] } | null>> };
  type BegrJaar = { jaar: number; euro: number };
  type BegrScenarioExt = { totalenPerJaar?: BegrJaar[] };
  type BegrAdvExt = { scenarios?: Partial<Record<ScenarioKey, BegrScenarioExt | null>> };
  type Stap4Ext = { begrotingAdvies?: BegrAdvExt; stap7InterneUren?: { scenarios?: Partial<Record<ScenarioKey, { totalenPerJaar?: { jaar: number; uren: number; kosten: number }[] } | null>> } };

  const stap8Detail = (session.crossAnalyseWizard?.stepResults as { stap8?: Stap8DetailExt } | undefined)?.stap8;
  const stap4Ext = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Ext } | undefined)?.stap4;

  function jarenForScenario(key: ScenarioKey): PerJaar[] {
    const fromStap8 = stap8Detail?.scenarios?.[key]?.perJaar ?? [];
    if (fromStap8.length > 0) return fromStap8;
    const begrPerJaar = stap4Ext?.begrotingAdvies?.scenarios?.[key]?.totalenPerJaar ?? [];
    const urenPerJaar = stap4Ext?.stap7InterneUren?.scenarios?.[key]?.totalenPerJaar ?? [];
    if (begrPerJaar.length === 0 && urenPerJaar.length === 0) return [];
    const alleJaren = Array.from(
      new Set([...begrPerJaar.map((b) => b.jaar), ...urenPerJaar.map((u) => u.jaar)])
    ).sort();
    return alleJaren.map((jaar) => {
      const b = begrPerJaar.find((x) => x.jaar === jaar);
      const u = urenPerJaar.find((x) => x.jaar === jaar);
      const outOfPocket = b?.euro ?? 0;
      const interneKosten = u?.kosten ?? 0;
      return {
        jaar,
        outOfPocket,
        interneUren: u?.uren ?? 0,
        interneKosten,
        totaal: outOfPocket + interneKosten,
      };
    });
  }

  return (
    <>
      <div className="mb-5 p-4 rounded-lg bg-blue-50/60 border border-blue-200/70 max-w-prose">
        <p className="text-sm text-gray-700 leading-relaxed mb-2">
          De totale programmakosten kennen twee componenten:
        </p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><strong>Out-of-pocket</strong> &mdash; externe uitgaven per inspanning (licenties, inkoop, externe inhuur).</li>
          <li><strong>Interne uren</strong> &mdash; tijd van Cito-medewerkers, vermenigvuldigd met het interne uurtarief tot interne kosten.</li>
        </ul>
        <p className="text-sm text-gray-700 mt-2">
          Onderstaande vier scenario&apos;s zijn gelijkwaardig doorgerekend. De stuurgroep kiest hieruit het
          scenario waarmee de programmabegroting verder wordt vastgezet.
        </p>
      </div>

      {/* 4 scenario-tabellen onder elkaar — geen 'actief' state */}
      <div className="space-y-5">
        {scenarioOrder.map((key) => {
          const r = rows.find((x) => x.key === key);
          const kleur = SCENARIO_KLEUR[key];
          const motivatie = begroting?.scenarios?.[key]?.samenvatting?.trim() ?? "";
          const advies = begroting?.scenarios?.[key]?.prioriteitAdvies?.trim() ?? "";
          if (!r) {
            return (
              <div key={key} className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                <div className={`text-[11px] font-bold uppercase tracking-wider ${kleur.accent} mb-1`}>
                  {SCENARIO_LABELS[key]}
                </div>
                <p className="text-sm text-gray-500 italic">Geen data beschikbaar voor dit scenario.</p>
              </div>
            );
          }
          const jaren = jarenForScenario(key);
          const totOop = jaren.reduce((s, j) => s + j.outOfPocket, 0);
          const totInt = jaren.reduce((s, j) => s + j.interneKosten, 0);
          const totUren = jaren.reduce((s, j) => s + j.interneUren, 0);
          return (
            <div key={key} className={`border-2 rounded-lg overflow-hidden ${kleur.bg.replace("bg-", "border-").replace("-50", "-200")}`}>
              <div className={`${kleur.bg} px-4 py-3 flex items-baseline justify-between gap-3`}>
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${kleur.accent}`}>
                    {SCENARIO_LABELS[key]}
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mt-0.5 tabular-nums">
                    {euroFmt.format(r.totaalGeraamd)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-700 text-right space-y-0.5 tabular-nums">
                  <div>Out-of-pocket: <strong>{euroFmt.format(r.outOfPocket)}</strong></div>
                  <div>
                    Interne uren: <strong>{euroFmt.format(r.interneKosten)}</strong>
                    {r.interneUrenTotaal > 0 && (
                      <span className="text-gray-500 ml-1">({r.interneUrenTotaal.toLocaleString("nl-NL")} u)</span>
                    )}
                  </div>
                </div>
              </div>
              {jaren.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Categorie</th>
                        {jaren.map((j) => (
                          <th key={j.jaar} className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            {j.jaar}
                          </th>
                        ))}
                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Totaal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-700">Out-of-pocket</div>
                          <div className="text-[10px] text-gray-500">Externe uitgaven</div>
                        </td>
                        {jaren.map((j) => (
                          <td key={j.jaar} className="text-right px-3 py-2 text-gray-800 tabular-nums">{euroFmt.format(j.outOfPocket)}</td>
                        ))}
                        <td className="text-right px-3 py-2 font-semibold text-cito-blue tabular-nums">{euroFmt.format(totOop)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-700">Interne uren</div>
                          <div className="text-[10px] text-gray-500">Cito-medewerkers (uren × uurtarief)</div>
                        </td>
                        {jaren.map((j) => (
                          <td key={j.jaar} className="text-right px-3 py-2 text-gray-800 tabular-nums">
                            <div>{euroFmt.format(j.interneKosten)}</div>
                            <div className="text-[10px] text-gray-400">{j.interneUren.toLocaleString("nl-NL")} u</div>
                          </td>
                        ))}
                        <td className="text-right px-3 py-2 font-semibold text-cito-blue tabular-nums">
                          <div>{euroFmt.format(totInt)}</div>
                          <div className="text-[10px] text-gray-400">{totUren.toLocaleString("nl-NL")} u</div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-cito-blue bg-cito-blue/10">
                        <td className="px-3 py-2 text-sm font-bold text-cito-blue">TOTAAL</td>
                        {jaren.map((j) => (
                          <td key={j.jaar} className="text-right px-3 py-2 font-bold text-cito-blue tabular-nums">{euroFmt.format(j.totaal)}</td>
                        ))}
                        <td className="text-right px-3 py-2 text-base font-bold text-cito-blue tabular-nums">{euroFmt.format(r.totaalGeraamd)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {/* Domein-breakdown + duurste inspanningen + automatische toelichting */}
              {(() => {
                type Insp = {
                  inspanningTitel: string;
                  domein: EffortDomain;
                  totaalEuro: number;
                  percentageTotaal: number;
                  motivatie: string;
                };
                type BegrScenarioRich = { inspanningen?: Insp[] };
                type BegrAdvRich = { scenarios?: Partial<Record<ScenarioKey, BegrScenarioRich | null>> };
                type Stap4Rich = { begrotingAdvies?: BegrAdvRich };
                const stap4Rich = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Rich } | undefined)?.stap4;
                const inspanningen: Insp[] = stap4Rich?.begrotingAdvies?.scenarios?.[key]?.inspanningen ?? [];
                if (inspanningen.length === 0) return null;

                const domeinen: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];
                const perDomein = domeinen.map((d) => {
                  const items = inspanningen.filter((i) => i.domein === d);
                  const totaal = items.reduce((s, i) => s + i.totaalEuro, 0);
                  return { domein: d, totaal, count: items.length };
                });
                const grandTotalOop = perDomein.reduce((s, d) => s + d.totaal, 0) || 1;

                const sortedInsp = [...inspanningen].sort((a, b) => b.totaalEuro - a.totaalEuro);
                const top = sortedInsp.slice(0, Math.min(3, sortedInsp.length));
                const topDuurste = top[0];
                const topDomein = [...perDomein].sort((a, b) => b.totaal - a.totaal)[0];

                const autoToelichting = topDuurste && topDomein
                  ? `Het grootste kostendrijver is "${topDuurste.inspanningTitel}" (${euroFmt.format(topDuurste.totaalEuro)}, ${Math.round((topDuurste.totaalEuro / grandTotalOop) * 100)}% van de out-of-pocket-uitgaven). Het domein ${DOMAIN_LABELS[topDomein.domein]} trekt het grootste deel van de externe budgetten (${euroFmt.format(topDomein.totaal)}, ${Math.round((topDomein.totaal / grandTotalOop) * 100)}%).`
                  : "";

                return (
                  <>
                    {/* Domein-verdeling */}
                    <div className="px-4 py-3 bg-white border-t border-gray-100">
                      <div className={`text-[10px] uppercase tracking-wider ${kleur.accent} font-bold mb-2`}>
                        Verdeling over de vier inspanningsdomeinen
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-2 py-1 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Domein</th>
                            <th className="text-right px-2 py-1 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Inspanningen</th>
                            <th className="text-right px-2 py-1 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Out-of-pocket</th>
                            <th className="text-right px-2 py-1 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Aandeel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perDomein.map((d) => {
                            const dc = DOMAIN_COLORS[d.domein];
                            const pct = Math.round((d.totaal / grandTotalOop) * 100);
                            return (
                              <tr key={d.domein} className="border-b border-gray-50 last:border-b-0">
                                <td className="px-2 py-1.5">
                                  <span className={`text-[10px] uppercase font-bold ${dc.text} ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 whitespace-nowrap`}>
                                    {DOMAIN_LABELS[d.domein]}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-700 tabular-nums">{d.count}</td>
                                <td className="px-2 py-1.5 text-right text-gray-800 font-medium tabular-nums">{euroFmt.format(d.totaal)}</td>
                                <td className="px-2 py-1.5 text-right text-gray-600 tabular-nums">{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Top duurste inspanningen */}
                    {top.length > 0 && (
                      <div className="px-4 py-3 bg-white border-t border-gray-100">
                        <div className={`text-[10px] uppercase tracking-wider ${kleur.accent} font-bold mb-2`}>
                          Grootste kostendrijvers in dit scenario
                        </div>
                        <ol className="space-y-2">
                          {top.map((insp, i) => {
                            const dc = DOMAIN_COLORS[insp.domein];
                            return (
                              <li key={i} className="flex items-start gap-3">
                                <span className="text-sm font-bold text-cito-blue/70 tabular-nums w-5 shrink-0">{i + 1}.</span>
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">{insp.inspanningTitel}</span>
                                    <span className={`text-[10px] uppercase font-bold ${dc.text} ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5`}>
                                      {DOMAIN_LABELS[insp.domein]}
                                    </span>
                                    <span className="text-sm text-cito-blue font-semibold tabular-nums">
                                      {euroFmt.format(insp.totaalEuro)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 tabular-nums">
                                      ({Math.round((insp.totaalEuro / grandTotalOop) * 100)}% van out-of-pocket)
                                    </span>
                                  </div>
                                  {insp.motivatie && (
                                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5 italic">{insp.motivatie}</p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    {/* Toelichting */}
                    <div className="px-4 py-3 bg-white border-t border-gray-100">
                      <div className={`text-[10px] uppercase tracking-wider ${kleur.accent} font-bold mb-1`}>
                        Toelichting bij dit scenario
                      </div>
                      {autoToelichting && (
                        <p className="text-xs text-gray-700 leading-relaxed mb-2">{autoToelichting}</p>
                      )}
                      {motivatie && <p className="text-xs text-gray-700 leading-relaxed mb-1 whitespace-pre-wrap">{motivatie}</p>}
                      {advies && <p className="text-xs text-gray-600 italic leading-relaxed whitespace-pre-wrap">{advies}</p>}
                    </div>
                  </>
                );
              })()}

              {/* Fallback: alleen statische motivatie als er geen inspanningen-data is */}
              {(motivatie || advies) && !((session.crossAnalyseWizard?.stepResults as { stap4?: { begrotingAdvies?: { scenarios?: Partial<Record<ScenarioKey, { inspanningen?: unknown[] } | null>> } } } | undefined)?.stap4?.begrotingAdvies?.scenarios?.[key]?.inspanningen?.length) && (
                <div className="px-4 py-3 bg-white border-t border-gray-100">
                  <div className={`text-[10px] uppercase tracking-wider ${kleur.accent} font-bold mb-1`}>
                    Toelichting bij dit scenario
                  </div>
                  {motivatie && <p className="text-xs text-gray-700 leading-relaxed mb-1 whitespace-pre-wrap">{motivatie}</p>}
                  {advies && <p className="text-xs text-gray-600 italic leading-relaxed whitespace-pre-wrap">{advies}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ManagementSamenvattingBlock({ session }: { session: DINSession }) {
  const activeCaps = getActiveCaps(session);
  const activeEfforts = getActiveEfforts(session);

  const sharedCount = (() => {
    const byTitle = new Map<string, Set<string>>();
    activeCaps.forEach((c) => {
      const key = (c.title || c.description || "").trim().toLowerCase();
      if (!key) return;
      if (!byTitle.has(key)) byTitle.set(key, new Set());
      byTitle.get(key)!.add(c.sectorId);
    });
    let n = 0;
    byTitle.forEach((s) => { if (s.size > 1) n++; });
    return n;
  })();

  const hefbomen = analyzeHefbomen(session);
  const hefboomCount = hefbomen.reduce(
    (n, h) => n + h.clusters.filter((c) => c.hefboomScore > 1).length,
    0
  );

  const balance = getDomainBalance(activeEfforts);
  const totBal = Object.values(balance).reduce((a, b) => a + b, 0) || 1;
  const domeinenOutsideIn: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];

  const stap8 = (session.crossAnalyseWizard?.stepResults as { stap8?: { actiefScenario?: "optimaal" | "plus20" | "min20"; scenarios: Record<string, { totaalGeraamd?: number } | null> } } | undefined)?.stap8;
  const actiefScenario = stap8?.actiefScenario ?? "optimaal";
  const totaalGeraamd = stap8?.scenarios?.[actiefScenario]?.totaalGeraamd;

  const kwartalenSet = new Set<string>();
  session.planningVoorstel?.bundelPlanning.forEach((bp) => {
    if (bp.startKwartaal) kwartalenSet.add(bp.startKwartaal);
    if (bp.eindKwartaal) kwartalenSet.add(bp.eindKwartaal);
  });
  const kwSorted = Array.from(kwartalenSet).sort();

  const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <div className="mb-12 bg-gradient-to-br from-cito-blue/5 to-cito-blue/10 border border-cito-blue/20 rounded-xl p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-cito-blue/70 font-bold mb-2">Managementsamenvatting</div>
      {session.vision?.beknopt && (
        <p className="text-sm italic text-gray-700 mb-4 leading-relaxed">{session.vision.beknopt}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="text-xs uppercase tracking-wide text-cito-blue/80 font-bold">Drie cross-sectorale kernboodschappen</div>
        <ul className="text-sm text-gray-700 space-y-1.5 pl-4 list-disc marker:text-cito-blue">
          <li><strong>{sharedCount}</strong> gedeelde vermogens tussen sectoren — de belangrijkste hefboom.</li>
          <li><strong>{hefboomCount}</strong> multi-sector hefboomclusters — gezamenlijke inspanningen met breed effect.</li>
          <li>
            Domeinbalans (cultuur → mens → data/systemen → processen):{" "}
            {domeinenOutsideIn.map((d, i) => {
              const pct = Math.round(((balance[d] ?? 0) / totBal) * 100);
              return (
                <span key={d}>
                  {i > 0 && " • "}<strong>{DOMAIN_LABELS[d]} {pct}%</strong>
                </span>
              );
            })}
          </li>
        </ul>
      </div>

      {(kwSorted.length >= 2 || totaalGeraamd) && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-700 pt-3 border-t border-cito-blue/15">
          {kwSorted.length >= 2 && (
            <div>
              <span className="text-xs uppercase text-gray-500 block">Programmaduur</span>
              <strong className="text-cito-blue">{kwSorted[0]} → {kwSorted[kwSorted.length - 1]}</strong>
            </div>
          )}
          {totaalGeraamd !== undefined && (
            <div>
              <span className="text-xs uppercase text-gray-500 block">Totaal geraamd ({actiefScenario})</span>
              <strong className="text-cito-blue">{euroFmt.format(totaalGeraamd)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectorwerkKaderBlock({ session }: { session: DINSession }) {
  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s && !c.consolidated) ||
      session.efforts.some((e) => e.sectorId === s && !e.consolidated) ||
      session.sectorPlans.some((sp) => sp.sectorName === s)
  );

  if (activeSectors.length === 0) {
    return (
      <div className="text-sm italic text-gray-500 py-2">
        Nog geen sectorplannen geladen of sector-specifieke DIN-items ingevoerd.
      </div>
    );
  }

  const totaalPmc = (session.pmcEntries ?? []).length;

  return (
    <div>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-cito-blue/5">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Sector</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Kern sectorplan</th>
              <th className="text-center px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Doelen</th>
              <th className="text-center px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">B / V / I</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeSectors.map((sector) => {
              const plan = session.sectorPlans.find((s) => s.sectorName === sector);
              const kern = plan?.rawText
                ? plan.rawText.slice(0, 160).replace(/\s+/g, " ").trim() + (plan.rawText.length > 160 ? "…" : "")
                : "Geen sectorplan geladen";
              const batenCount = session.benefits.filter((b) => b.sectorId === sector).length;
              const vermogensCount = session.capabilities.filter((c) => c.sectorId === sector && !c.consolidated).length;
              const inspanningenCount = session.efforts.filter((e) => e.sectorId === sector && !e.consolidated).length;
              const goalIds = new Set(session.benefits.filter((b) => b.sectorId === sector).map((b) => b.goalId));
              return (
                <tr key={sector} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-bold text-cito-blue">{sector}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs leading-relaxed">{kern}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{goalIds.size}</td>
                  <td className="px-3 py-2 text-center text-gray-700 text-xs">{batenCount} / {vermogensCount} / {inspanningenCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totaalPmc > 0 && (
        <div className="text-xs italic text-gray-500 mt-2">
          Totaal product-marktcombinaties in scope: {totaalPmc}.
        </div>
      )}
    </div>
  );
}

function RamingBlock({ session }: { session: DINSession }) {
  type Stap7 = {
    uurtariefSettings?: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
    scenarios?: { optimaal: unknown; plus20: unknown; min20: unknown };
  };
  type Stap8 = {
    actiefScenario?: "optimaal" | "plus20" | "min20";
    scenarios: Record<"optimaal" | "plus20" | "min20", {
      totaalOutOfPocket: number;
      totaalInterneUren: number;
      totaalGeraamd: number;
    } | null>;
  };
  const wizard = session.crossAnalyseWizard?.stepResults as { stap7?: Stap7; stap8?: Stap8 } | undefined;
  const stap7 = wizard?.stap7;
  const stap8 = wizard?.stap8;

  if (!stap7 && !stap8) {
    return (
      <div className="text-sm italic text-gray-500 border border-dashed border-gray-300 rounded-lg px-4 py-3">
        De raming is nog niet ingevuld. Open de Cross-analyse wizard (Stap 4) om de interne uren per domein en de scenario-overzichten te genereren.
      </div>
    );
  }

  const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const scenLabels: Record<"optimaal" | "plus20" | "min20", string> = {
    optimaal: "Optimaal", plus20: "+20% scenario", min20: "−20% scenario",
  };
  const actief = stap8?.actiefScenario ?? "optimaal";

  return (
    <div className="space-y-4">
      {stap7?.uurtariefSettings && (
        <div className="text-xs text-gray-500">
          Basisuurtarief: <strong className="text-gray-700">{euroFmt.format(stap7.uurtariefSettings.basisTarief)}</strong>
          {" "}(referentiejaar {stap7.uurtariefSettings.referentiejaar}, indexatie {stap7.uurtariefSettings.indexatiePercentage}%/jaar)
        </div>
      )}
      {stap8?.scenarios && (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-cito-blue/5">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Scenario</th>
                <th className="text-right px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Out-of-pocket</th>
                <th className="text-right px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Interne uren</th>
                <th className="text-right px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Totaal geraamd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(["optimaal", "plus20", "min20"] as const).map((key) => {
                const sc = stap8.scenarios[key];
                if (!sc) return null;
                const isActief = key === actief;
                return (
                  <tr key={key} className={isActief ? "bg-cito-blue/10" : "hover:bg-gray-50"}>
                    <td className="px-3 py-2 font-bold text-cito-blue">
                      {scenLabels[key]}{isActief && <span className="ml-2 text-[10px] uppercase text-cito-blue/70">(actief)</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{euroFmt.format(sc.totaalOutOfPocket)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{euroFmt.format(sc.totaalInterneUren)}</td>
                    <td className="px-3 py-2 text-right text-cito-blue font-bold tabular-nums">{euroFmt.format(sc.totaalGeraamd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs italic text-gray-500">
        De volledige raming (per domein per jaar, in outside-in volgorde cultuur → mens → data/systemen → processen) staat in het Word-document.
      </p>
    </div>
  );
}

// Resolveer een lijst items (kunnen effort-IDs OF titels zijn) naar leesbare titels.
// IDs zonder match worden gefilterd; we tonen liever niets dan een UUID.
function resolveItemLabels(items: string[], session: DINSession): string[] {
  const isUuidLike = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return items
    .map((item) => {
      const effort = session.efforts.find((e) => e.id === item);
      if (effort) return effort.title || effort.description || "";
      const cap = session.capabilities.find((c) => c.id === item);
      if (cap) return cap.title || cap.description || "";
      const benefit = session.benefits.find((b) => b.id === item);
      if (benefit) return benefit.title || benefit.description || "";
      // Geen match: als het op een UUID lijkt, weglaten — anders is het al een titel
      return isUuidLike(item) ? "" : item;
    })
    .filter((s) => s.trim().length > 0);
}

function OptimalisatieBlock({ session }: { session: DINSession }) {
  type SubEffort = {
    groepId: string;
    domein: EffortDomain;
    actie: "combineren" | "apart_houden";
    items: string[];
    reden: string;
    voorgesteldeNaam?: string | null;
    titel?: string;
    beschrijving?: string;
    beargumentatie?: string;
    dossier?: {
      eigenaar?: string;
      inspanningsleider?: string;
      kostenraming?: string;
      verwachtResultaat?: string;
      randvoorwaarden?: string;
    };
  };
  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: { subEffortAnalysis?: SubEffort[] } } | undefined)?.stap4;
  const adviezen = stap4?.subEffortAnalysis ?? [];
  if (adviezen.length === 0) {
    return (
      <div className="text-sm italic text-gray-500 border border-dashed border-gray-300 rounded-lg px-4 py-3">
        Stap-optimalisatie nog niet gegenereerd. Ga naar de Cross-analyse wizard (Stap 4) om geconsolideerde cross-sectorale inspanningen per domein te bepalen.
      </div>
    );
  }

  const outsideIn: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];
  const sorted = [...adviezen].sort((a, b) => outsideIn.indexOf(a.domein) - outsideIn.indexOf(b.domein));

  return (
    <div className="space-y-4">
      {/* Compacte overzichtstabel — kosten, eigenaar, leider per inspanning */}
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-cito-blue/5">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Domein</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Inspanning</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Eigenaar</th>
              <th className="text-left px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Leider</th>
              <th className="text-right px-3 py-2 font-semibold text-cito-blue text-xs uppercase tracking-wide">Kosten</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((se, i) => {
              const dc = DOMAIN_COLORS[se.domein];
              const itemLabels = resolveItemLabels(se.items, session);
              const titel = se.titel || se.voorgesteldeNaam || itemLabels.join(" + ") || `${DOMAIN_LABELS[se.domein]} inspanning`;
              return (
                <tr key={`row-${i}`} className="hover:bg-gray-50 align-top">
                  <td className="px-3 py-2">
                    <span className={`text-[10px] uppercase font-bold ${dc.text} ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 whitespace-nowrap`}>
                      {DOMAIN_LABELS[se.domein]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-800 font-medium">{titel}</td>
                  <td className="px-3 py-2 text-gray-600">{se.dossier?.eigenaar || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{se.dossier?.inspanningsleider || "—"}</td>
                  <td className="px-3 py-2 text-right text-cito-blue font-semibold tabular-nums whitespace-nowrap">
                    {se.dossier?.kostenraming || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per inspanning: uitvoerige toelichting */}
      <div className="space-y-3">
        {sorted.map((se, i) => {
          const dc = DOMAIN_COLORS[se.domein];
          const itemLabels = resolveItemLabels(se.items, session);
          const titel = se.titel || se.voorgesteldeNaam || itemLabels.join(" + ") || `${DOMAIN_LABELS[se.domein]} inspanning`;
          return (
            <div key={`detail-${i}`} className={`border ${dc.border} rounded-lg overflow-hidden`}>
              <div className={`${dc.bg} px-3 py-2 flex items-center gap-2 border-b ${dc.border}`}>
                <span className={`text-[10px] uppercase font-bold ${dc.text}`}>{DOMAIN_LABELS[se.domein]}</span>
                <span className="text-sm font-bold text-gray-800">{titel}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                  {se.actie === "combineren" ? "combineren" : "apart houden"}
                </span>
              </div>
              <div className="p-3 space-y-3 text-xs">
                {se.beschrijving && (
                  <p className="text-gray-700 leading-relaxed">{se.beschrijving}</p>
                )}
                {se.beargumentatie && (
                  <p className="text-gray-500 italic leading-relaxed">
                    <span className="text-gray-400 not-italic font-medium">Beargumentatie:</span>{" "}
                    {se.beargumentatie}
                  </p>
                )}
                {itemLabels.length > 0 && (
                  <p className="text-gray-500">
                    <span className="text-gray-400 font-medium">Onderliggende inspanningen:</span>{" "}
                    {itemLabels.join("; ")}
                  </p>
                )}
                {se.dossier && (
                  <div className="overflow-hidden border border-gray-100 rounded">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-50">
                        {se.dossier.eigenaar && (
                          <tr>
                            <td className="px-2.5 py-1.5 bg-gray-50/50 font-medium text-gray-600 w-32">Eigenaar</td>
                            <td className="px-2.5 py-1.5 text-gray-800">{se.dossier.eigenaar}</td>
                          </tr>
                        )}
                        {se.dossier.inspanningsleider && (
                          <tr>
                            <td className="px-2.5 py-1.5 bg-gray-50/50 font-medium text-gray-600">Inspanningsleider</td>
                            <td className="px-2.5 py-1.5 text-gray-800">{se.dossier.inspanningsleider}</td>
                          </tr>
                        )}
                        {se.dossier.kostenraming && (
                          <tr>
                            <td className="px-2.5 py-1.5 bg-gray-50/50 font-medium text-gray-600">Kostenraming</td>
                            <td className="px-2.5 py-1.5 text-cito-blue font-semibold tabular-nums">{se.dossier.kostenraming}</td>
                          </tr>
                        )}
                        {se.dossier.verwachtResultaat && (
                          <tr>
                            <td className="px-2.5 py-1.5 bg-gray-50/50 font-medium text-gray-600">Verwacht resultaat</td>
                            <td className="px-2.5 py-1.5 text-gray-800">{se.dossier.verwachtResultaat}</td>
                          </tr>
                        )}
                        {se.dossier.randvoorwaarden && (
                          <tr>
                            <td className="px-2.5 py-1.5 bg-gray-50/50 font-medium text-gray-600">Randvoorwaarden</td>
                            <td className="px-2.5 py-1.5 text-gray-800">{se.dossier.randvoorwaarden}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {se.reden && (
                  <p className="text-gray-400 italic text-[11px]">
                    <span className="not-italic font-medium">Reden consolidatie:</span> {se.reden}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UiteindelijkDINBlock({ session }: { session: DINSession }) {
  const record = session.integratieAdvies as Record<string, IntegratieAdviesResult | undefined> | undefined;
  const entries = record
    ? Object.entries(record).filter(([, v]) => v && typeof v === "object")
    : [];
  if (entries.length === 0) {
    return (
      <div className="text-sm italic text-gray-500 border border-dashed border-gray-300 rounded-lg px-4 py-3">
        Sector-vertaling nog niet gegenereerd. Doorloop Stap 9 in de Cross-analyse wizard om het uiteindelijke DIN-netwerk per sector op te stellen.
      </div>
    );
  }

  const sectieKeys: { key: keyof IntegratieAdviesResult; label: string; color: string }[] = [
    { key: "aansluiting", label: "Aansluiting", color: "text-blue-700" },
    { key: "verrijking", label: "Verrijking", color: "text-emerald-700" },
    { key: "aanvullingen", label: "Aanvullingen", color: "text-purple-700" },
    { key: "quickWins", label: "Quick wins", color: "text-amber-700" },
    { key: "aandachtspunten", label: "Aandachtspunten", color: "text-rose-700" },
  ];

  return (
    <div className="space-y-4">
      {entries.map(([sectorKey, raw]) => {
        const adv = raw as IntegratieAdviesResult;
        return (
          <div key={sectorKey} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-cito-blue/5 border-b border-gray-200">
              <span className="text-sm font-bold text-cito-blue">Sector {adv.sectorName || sectorKey}</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              {sectieKeys.map(({ key, label, color }) => {
                const item = adv[key] as { titel?: string; toelichting?: string; punten?: string[] } | undefined;
                if (!item) return null;
                const hasContent = (item.toelichting && item.toelichting.trim().length > 0) || (item.punten && item.punten.length > 0);
                if (!hasContent) return null;
                return (
                  <div key={key}>
                    <div className={`text-[10px] uppercase font-bold ${color} mb-1`}>{label}</div>
                    {item.toelichting && <p className="text-gray-700 leading-relaxed mb-1">{item.toelichting}</p>}
                    {item.punten && item.punten.length > 0 && (
                      <ul className="space-y-0.5 pl-4 list-disc marker:text-gray-400">
                        {item.punten.map((p, i) => (
                          <li key={i} className="text-gray-600">{p}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GapDetectionModal({
  session,
  onProceed,
  onCancel,
}: {
  session: DINSession;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const gapData = useMemo(() => categorizeGaps(session), [session]);
  const hasVolgendeCyclus = gapData.volgendeCyclus.length > 0;
  const hasEchteGaps = gapData.echteGapsGoals.length > 0 ||
                        gapData.benefitsWithoutCaps.length > 0 ||
                        gapData.capsWithoutEfforts.length > 0;

  const proceedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    proceedRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg mx-auto mt-[15vh] p-6">
        <h2 className="text-lg font-bold text-cito-blue mb-4">Exportoverzicht</h2>

        {hasVolgendeCyclus && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Nog niet uitgewerkt (volgende cyclus)
              </div>
            </div>
            <div className="space-y-1">
              {gapData.volgendeCyclus.map((goal) => (
                <div key={goal.id} className="text-sm text-gray-600 ml-6">
                  &bull; {goal.name} — uitwerking volgt in volgende cyclus
                </div>
              ))}
            </div>
          </div>
        )}

        {hasEchteGaps && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                Aandachtspunten
              </div>
            </div>
            <div className="text-xs font-bold text-amber-700 mb-1">Onvolledige ketens</div>
            <div className="space-y-1">
              {gapData.echteGapsGoals.map((goal) => (
                <div key={goal.id} className="text-sm text-amber-800 ml-6">
                  &bull; {goal.name} heeft geen baten
                </div>
              ))}
              {gapData.benefitsWithoutCaps.map((baat) => baat && (
                <div key={baat.id} className="text-sm text-amber-800 ml-6">
                  &bull; &lsquo;{baat.title || baat.description}&rsquo; heeft geen gekoppeld vermogen
                </div>
              ))}
              {gapData.capsWithoutEfforts.map((vermogen) => vermogen && (
                <div key={vermogen.id} className="text-sm text-amber-800 ml-6">
                  &bull; &lsquo;{vermogen.title || vermogen.description}&rsquo; heeft geen gekoppelde inspanning
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Eerst aanvullen
          </button>
          <button
            ref={proceedRef}
            onClick={onProceed}
            className="px-5 py-2.5 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
          >
            Toch exporteren
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Programmaplan-document (herbruikbaar voor in-app preview én publieke deel-pagina) ---
export function ProgrammaplanDocument({ session }: { session: DINSession }) {
  return (
    <div className="p-8 max-w-none">
      <DocumentTitlePage session={session} />
      <div className="mt-10">
        <Chapter
          number="1."
          title="Programmavisie en scope"
          intro="De programmavisie geeft de richting van het geheel: waartoe is dit programma bedoeld en wat valt er binnen en buiten de cyclus."
        >
          <VisionBlock session={session} />
          <ScopeBlock session={session} />
        </Chapter>

        <Chapter
          number="2."
          title="Programmadoelen"
          intro="De programmadoelen zijn de kernonderwerpen van het programma. Ze worden volgordelijk opgepakt zodat de organisatie focus en haalbaarheid behoudt."
        >
          <DoelenMetVolgordeBlock session={session} />
        </Chapter>

        <Chapter
          number="3."
          title="Cross-sectorale uitkomst — de kern"
          intro="Dit is het uiteindelijke DIN-netwerk zoals het uit de cross-analyse komt. Bovenaan staat het focusdoel; daaronder de baten per sector (PO/VO/Zakelijk). Vervolgens zie je per groep van vergelijkbare sector-vermogens drie parallelle kaarten — één per sector — en daaronder de hefboomlaag met de gezamenlijke inspanningen per domein: wat er wordt gedaan, waarom cross-sectoraal, met welke impact per sector, en met een volledig dossier (eigenaar, leider, kosten, resultaat, randvoorwaarden)."
        >
          <SubSection title="Uiteindelijke DIN-netwerk (uit cross-analyse stap 9)">
            <p className="text-xs text-gray-500 mb-4 leading-relaxed max-w-prose">
              Focusdoel → Baten per sector → Drieluik van gelijkende vermogens → Hefboomlaag per domein.
              Dit is exact de visualisatie en data uit de laatste stap van de cross-analyse-wizard.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <StapSectorVertaling
                session={session}
                result={(session.crossAnalyseWizard?.stepResults as { stap5?: Stap5Result } | undefined)?.stap5}
                stap2Result={(session.crossAnalyseWizard?.stepResults as { stap2?: Stap2Result } | undefined)?.stap2}
                stap4Result={(session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Result } | undefined)?.stap4}
                compact
              />
            </div>
          </SubSection>
        </Chapter>

        <Chapter
          number="4."
          title="Raming"
          intro="De programmaraming bestaat uit twee componenten: out-of-pocket-uitgaven (externe kosten per inspanning) en interne uren (Cito-medewerkers, in uren én euro&apos;s). Beide zijn doorgerekend over vier scenario&apos;s. Hieronder eerst het advies aan de stuurgroep met een korte vergelijking van de vier scenario&apos;s; daaronder de detailuitwerking (4.1 out-of-pocket, 4.2 interne uren, 4.3 totaaloverzicht)."
        >
          <BegrotingAdviesSamenvattingBlock session={session} />
          <SubSection title="4.1 Raming out-of-pocket kosten">
            <BegrotingAdviesBlock session={session} />
          </SubSection>
          <SubSection title="4.2 Interne uren">
            <InterneUrenBlock session={session} />
          </SubSection>
          <SubSection title="4.3 Totaaloverzicht — vier scenario's">
            <ScenarioTotaalBlock session={session} />
          </SubSection>
        </Chapter>

        <Chapter
          number="5."
          title="Programma-organisatie en RASCI"
          intro="De programma-organisatie bepaalt de veranderkracht: wie beslist, wie draagt bij, wie wordt geïnformeerd. De RASCI-matrix legt per hoofdthema de verantwoordelijkheidsverdeling vast."
        >
          <GovernanceBlock session={session} />
        </Chapter>

        <Chapter
          number="6."
          title="Planning en roadmap"
          intro="De roadmap groepeert inspanningen in bundels en cycli, maakt afhankelijkheden zichtbaar en markeert de mijlpalen waarop voortgang wordt gemeten. Het is het ritmische kompas van het programma."
        >
          <RoadmapBlock session={session} />
        </Chapter>
      </div>
    </div>
  );
}

// --- Hoofd ExportStep ---

export default function ExportStep() {
  const { session } = useSession();
  const { addToast } = useToast();
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showGapModal, setShowGapModal] = useState(false);

  // Section numbering computation
  const sectionNumbers = useMemo(() => {
    if (!session) return {} as Record<string, string>;

    let h1 = 0;
    const numbers: Record<string, string> = {};

    // Fixed order sections
    if (session.vision) { h1++; numbers["vision"] = `${h1}.`; }
    if (session.scope) { h1++; numbers["scope"] = `${h1}.`; }
    if (session.goals.length > 0) { h1++; numbers["goals"] = `${h1}.`; }

    // DIN-Keten
    const goalsWithData = session.goals.filter((g) => session.benefits.some((b) => b.goalId === g.id));
    if (goalsWithData.length > 0) { h1++; numbers["din"] = `${h1}.`; }

    // DIN-Overzicht (tabel-flow)
    if (goalsWithData.length > 0) { h1++; numbers["flow"] = `${h1}.`; }

    // Cross-analyse
    const activeEffortsList = session.efforts.filter((e) => !e.consolidated);
    const activeCapsForNumbers = session.capabilities.filter((c) => !c.consolidated);
    if (activeEffortsList.length > 0 || activeCapsForNumbers.length > 0) { h1++; numbers["cross"] = `${h1}.`; }

    // Gap-analyse (always present)
    h1++; numbers["gap"] = `${h1}.`;

    // Hefboomwerking (conditional)
    const hefbomen = analyzeHefbomen(session);
    const hasHefbomen = hefbomen.some((h2) => h2.clusters.some((c) => c.hefboomScore > 1));
    if (hasHefbomen) { h1++; numbers["hefboom"] = `${h1}.`; }

    // Governance (conditional)
    if (session.benefits.length > 0) { h1++; numbers["governance"] = `${h1}.`; }

    // Externe projecten (conditional)
    if (session.externalProjects && session.externalProjects.length > 0) { h1++; numbers["extern"] = `${h1}.`; }

    // Sectorale uitwerking
    const activeSectors = SECTORS.filter((s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => !c.consolidated && c.sectorId === s) ||
      session.efforts.some((e) => !e.consolidated && e.sectorId === s)
    );
    activeSectors.forEach((s) => { h1++; numbers[`sector-${s}`] = `${h1}.`; });

    // Roadmap (always present)
    h1++; numbers["roadmap"] = `${h1}.`;

    return numbers;
  }, [session]);

  if (!session) return null;

  function handleExportClick() {
    const gapData = categorizeGaps(session!);
    const hasAnyGaps = gapData.volgendeCyclus.length > 0 ||
                        gapData.echteGapsGoals.length > 0 ||
                        gapData.benefitsWithoutCaps.length > 0 ||
                        gapData.capsWithoutEfforts.length > 0;

    if (hasAnyGaps) {
      setShowGapModal(true);
    } else {
      handleProceedExport();
    }
  }

  async function handleProceedExport() {
    setShowGapModal(false);
    setIsExportingWord(true);
    setExportSuccess(false);
    try {
      const { generateWordDocument } = await import("@/lib/word-export");
      const blob = await generateWordDocument(session!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `programmaplan-${session!.name.replace(/\s+/g, "-").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      addToast("Programmaplan geexporteerd", "success");
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (e) {
      console.error("Word export mislukt:", e);
      addToast("Word export mislukt. Probeer het opnieuw.", "error");
    } finally {
      setIsExportingWord(false);
    }
  }

  const activeCaps = getActiveCaps(session);
  const activeEfforts = getActiveEfforts(session);

  const stats = [
    { label: "Doelen", count: session.goals.length },
    { label: "Baten", count: session.benefits.length },
    { label: "Vermogens", count: activeCaps.length },
    { label: "Inspanningen", count: activeEfforts.length },
  ];

  const hasContent = session.goals.length > 0;

  return (
    <div className="space-y-6">
      {/* Gap Detection Modal */}
      {showGapModal && (
        <GapDetectionModal
          session={session}
          onProceed={handleProceedExport}
          onCancel={() => setShowGapModal(false)}
        />
      )}

      {/* Export actie-balk */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-cito-blue mb-1">Programmaplan delen of downloaden</h3>
          <p className="text-xs text-gray-500">
            Deel een leesversie via een link, of download als Word-bestand voor offline gebruik.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {exportSuccess && (
            <span className="text-xs text-emerald-600 font-medium">Klaar</span>
          )}
          <button
            onClick={() => {
              if (!session) return;
              const url = `${window.location.origin}/programmaplan/${session.id}`;
              navigator.clipboard
                .writeText(url)
                .then(() => addToast("Deel-link gekopieerd naar klembord", "success"))
                .catch(() => addToast("Kopiëren mislukt — open de link handmatig", "error"));
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            disabled={!hasContent}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open een leesversie in een nieuw tabblad en kopieer de link voor stakeholders"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Open leesversie + kopieer link
          </button>
          <button
            onClick={handleExportClick}
            disabled={isExportingWord || !hasContent}
            className="flex items-center gap-2 px-5 py-2.5 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            <div className="text-2xl font-bold text-cito-blue">{s.count}</div>
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
            <span className="text-xs text-gray-400">
              Het Word document bevat dezelfde inhoud met professionele opmaak
            </span>
          </div>
          <ProgrammaplanDocument session={session} />
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


