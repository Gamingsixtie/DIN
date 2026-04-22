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
        {session.scope.outScope.length > 0 && (
          <div>
            <div className="text-xs font-bold text-red-700/70 uppercase tracking-wide mb-2">Buiten scope</div>
            <ul className="space-y-1">
              {session.scope.outScope.map((item, i) => (
                <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">&minus;</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
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

// --- Cross-analyse ---

function CrossAnalyseBlock({ session, number }: { session: DINSession; number?: string }) {
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);
  const activeCaps = useMemo(() => getActiveCaps(session), [session]);

  const balance = getDomainBalance(activeEfforts);
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;

  const domainCounts = (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    count: balance[domain],
    pct: Math.round((balance[domain] / total) * 100),
  }));

  // Gedeelde vermogens (using active caps only)
  const capBySector: Record<string, Set<string>> = {};
  activeCaps.forEach((c) => {
    const key = (c.title || c.description || "").toLowerCase().trim();
    if (!capBySector[key]) capBySector[key] = new Set();
    capBySector[key].add(c.sectorId);
  });
  const sharedCaps = Object.entries(capBySector).filter(([, s]) => s.size > 1);

  if (activeEfforts.length === 0 && sharedCaps.length === 0) return null;

  return (
    <Section title="Cross-analyse" number={number}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Analyse over alle sectoren heen: verdeling over inspanningsdomeinen,
        synergieen tussen sectoren, en mogelijke hefboomwerking.
      </p>

      {/* Domeinbalans */}
      <SubSection title="Domeinbalans inspanningen">
        <div className="space-y-2">
          {domainCounts.map(({ domain, label, count, pct }) => {
            const dc = DOMAIN_COLORS[domain];
            return (
              <div key={domain} className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium text-gray-600">{label}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${dc.bg} border ${dc.border} rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <div className="w-20 text-xs text-gray-500 text-right">{count} ({pct}%)</div>
                <div className="w-32 text-xs">
                  {pct < 10 ? (
                    <span className="text-amber-600">Aandacht nodig</span>
                  ) : pct > 40 ? (
                    <span className="text-amber-600">Relatief dominant</span>
                  ) : (
                    <span className="text-emerald-600">Evenwichtig</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SubSection>

      {/* Synergieeen */}
      {sharedCaps.length > 0 && (
        <SubSection title="Synergieeen (gedeelde vermogens)">
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
        </SubSection>
      )}
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

  // Monitoring-kalender: baten met meetmoment
  const meetplanItems = session.benefits.filter(
    (b) => b.profiel.measurementMoment || b.profiel.meetmethode
  );

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
              const perLetter: Record<string, string[]> = { R: [], A: [], S: [], C: [], I: [] };
              for (const rij of c.rijen) {
                const rol = rolMap.get(rij.rolId);
                if (rol) perLetter[rij.letter].push(rol.rol);
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
                      {(["A", "R", "S", "C", "I"] as const).map((letter) => (
                        <tr key={letter} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-3 py-1.5 w-10 font-bold text-center text-gray-700 bg-gray-50 border-r border-gray-100">
                            {letter}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700">
                            {perLetter[letter].length > 0 ? perLetter[letter].join("; ") : <span className="text-gray-400 italic">{"\u2014"}</span>}
                          </td>
                        </tr>
                      ))}
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

      {/* Monitoring-kalender */}
      {meetplanItems.length > 0 && (
        <SubSection title="Monitoring-kalender">
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Baat</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Indicator</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Meetmethode</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Meetmoment</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-600">Meetverantw.</th>
                </tr>
              </thead>
              <tbody>
                {meetplanItems.map((b, i) => (
                  <tr key={b.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-3 py-2 font-medium text-gray-800">{b.title || b.description}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.indicator || "\u2014"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.meetmethode || "\u2014"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.measurementMoment || "\u2014"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.indicatorOwner || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
      )}

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

function RoadmapBlock({ session, number }: { session: DINSession; number?: string }) {
  const activeEfforts = useMemo(() => getActiveEfforts(session), [session]);

  const quarters = Array.from(
    new Set(activeEfforts.filter((e) => e.quarter).map((e) => e.quarter!))
  ).sort();

  const planning = session.planningVoorstel;

  return (
    <Section title="Roadmap" number={number}>
      {planning?.samenvatting && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
            Samenvatting planning
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{planning.samenvatting}</p>
        </div>
      )}

      {planning?.bundelPlanning && planning.bundelPlanning.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-bold text-cito-blue/70 mb-2">Bundel-planning</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {planning.bundelPlanning.map((c, idx) => (
              <div key={`${c.bundelId}-${idx}`} className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                  {DOMAIN_LABELS[c.domein] || c.domein} · {c.startKwartaal}
                  {c.eindKwartaal && c.eindKwartaal !== c.startKwartaal ? ` – ${c.eindKwartaal}` : ""}
                </div>
                <div className="text-xs font-medium text-gray-800 mb-1">{c.titel}</div>
                {c.mijlpalen && c.mijlpalen.length > 0 && (
                  <ul className="space-y-0.5 text-[11px] text-gray-600">
                    {c.mijlpalen.map((m, fidx) => (
                      <li key={fidx}>
                        <span className="inline-block px-1 rounded bg-gray-100 text-gray-600 font-medium mr-1">
                          {m.periode}
                        </span>
                        {m.mijlpaal}
                      </li>
                    ))}
                  </ul>
                )}
                {c.risico && (
                  <p className="text-[10px] text-amber-700 italic mt-1">Risico: {c.risico}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {quarters.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Kwartaalplanning wordt in een volgende cyclus bepaald.
        </p>
      ) : (
        <div className="space-y-5">
          {quarters.map((q) => {
            const qEfforts = activeEfforts.filter((e) => e.quarter === q);
            return (
              <div key={q}>
                <h4 className="text-sm font-bold text-cito-blue/70 mb-2">{q}</h4>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Sector</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Domein</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Inspanning</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Opdrachtgever</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qEfforts.map((e, i) => (
                        <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                          <td className="px-3 py-2 text-gray-600">{e.sectorId}</td>
                          <td className="px-3 py-2 text-gray-600">{DOMAIN_LABELS[e.domain]}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{e.title || e.description}</td>
                          <td className="px-3 py-2 text-gray-600">{e.dossier?.eigenaar || "\u2014"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status] || "bg-gray-100 text-gray-600"}`}>
                              {STATUS_LABELS[e.status] || e.status}
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
      )}
    </Section>
  );
}

// --- Gap Detection Modal ---

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
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5">
        <div>
          <h3 className="text-base font-bold text-cito-blue mb-1">Programmaplan exporteren</h3>
          <p className="text-xs text-gray-500">
            Volledig programmaplan als professioneel Word document — alle DIN-methodiek informatie
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exportSuccess && (
            <span className="text-xs text-emerald-600 font-medium">Document gedownload</span>
          )}
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
          <div className="p-8 max-w-none">
            <DocumentTitlePage session={session} />
            <div className="mt-10">
              <VisionBlock session={session} number={sectionNumbers["vision"]} />
              <ScopeBlock session={session} number={sectionNumbers["scope"]} />
              <GoalsBlock session={session} number={sectionNumbers["goals"]} />
              <DINKetenBlock session={session} number={sectionNumbers["din"]} />
              <DINFlowTable session={session} number={sectionNumbers["flow"]} />
              <CrossAnalyseBlock session={session} number={sectionNumbers["cross"]} />
              <GapAnalyseBlock session={session} number={sectionNumbers["gap"]} />
              <HefboomBlock session={session} number={sectionNumbers["hefboom"]} />
              <GovernanceBlock session={session} number={sectionNumbers["governance"]} />
              <ExterneProjectenBlock session={session} number={sectionNumbers["extern"]} />
              <SectorBlocks session={session} sectionNumbers={sectionNumbers} />
              <RoadmapBlock session={session} number={sectionNumbers["roadmap"]} />
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
