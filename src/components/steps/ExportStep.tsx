"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import { buildChainsForSector, findGaps, analyzeHefbomen, getDomainBalance } from "@/lib/din-service";
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

const STATUS_LABEL: Record<string, string> = {
  gepland: "Gepland",
  in_uitvoering: "In uitvoering",
  afgerond: "Afgerond",
  on_hold: "On hold",
};
const STATUS_STYLE: Record<string, string> = {
  gepland: "bg-gray-100 text-gray-600",
  in_uitvoering: "bg-blue-100 text-blue-700",
  afgerond: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
};

// --- Layout componenten ---

function DocumentTitlePage({ session }: { session: DINSession }) {
  return (
    <div className="text-center py-16 border-b-2 border-[#003366]/20">
      <div className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-6">
        Doelen-Inspanningennetwerk
      </div>
      <h1 className="text-3xl font-bold text-[#003366] mb-3">Programmaplan</h1>
      <h2 className="text-xl text-[#003366]/70 mb-2">{session.name}</h2>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-[#003366] mb-4 pb-2 border-b border-[#003366]/15">
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-[#003366]/80 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

// --- Programmavisie ---

function VisionBlock({ session }: { session: DINSession }) {
  if (!session.vision) return null;
  return (
    <Section title="Programmavisie">
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

function ScopeBlock({ session }: { session: DINSession }) {
  if (!session.scope) return null;
  return (
    <Section title="Scope">
      <div className="grid grid-cols-2 gap-6">
        {session.scope.inScope.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Binnen scope</div>
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
            <div className="text-xs font-semibold text-red-700/70 uppercase tracking-wide mb-2">Buiten scope</div>
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

function GoalsBlock({ session }: { session: DINSession }) {
  return (
    <Section title="Programmadoelen">
      <div className="space-y-3">
        {session.goals.sort((a, b) => a.rank - b.rank).map((goal) => (
          <div key={goal.id} className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#003366] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
              {goal.rank}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
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

// --- DIN-Keten per Doel (met expliciete koppelingen) ---

function DINKetenBlock({ session }: { session: DINSession }) {
  const goalsWithData = session.goals
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  const activeSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s)
  );

  if (goalsWithData.length === 0) return null;

  return (
    <Section title="DIN-Netwerk per Doel">
      <p className="text-xs text-gray-500 mb-6 leading-relaxed">
        Per programmadoel wordt de volledige DIN-keten getoond: welke baten worden nagestreefd,
        welke vermogens daarvoor nodig zijn, en welke inspanningen die vermogens opbouwen.
      </p>

      {goalsWithData.map((goal) => (
        <div key={goal.id} className="mb-10 last:mb-0">
          <h3 className="text-sm font-bold text-[#003366] mb-4 pb-1 border-b border-gray-100">
            Doel {goal.rank}: {goal.name}
          </h3>

          {activeSectors.map((sector) => {
            const chainResult = buildChainsForSector(session, goal.id, sector);
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
                      <span className="text-[10px] font-bold text-white bg-[#003366] rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                        BAAT
                      </span>
                      <div className="text-xs">
                        <span className="font-semibold text-gray-800">
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
                    {chain.links.map((link) => (
                      <div key={link.capability.id} className="ml-6 mb-2">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-[10px] font-bold text-[#003366] bg-[#003366]/10 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                            VERM
                          </span>
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">
                              {link.capability.title || link.capability.description}
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
                              <span className={`text-[10px] font-bold ${dc.text} ${dc.bg} rounded px-1.5 py-0.5 shrink-0 mt-0.5 border ${dc.border}`}>
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
                    ))}

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
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                      Overige vermogens (niet gekoppeld aan een baat)
                    </div>
                    {chainResult.unlinkedCaps.map((c) => (
                      <div key={c.id} className="text-xs text-gray-500 ml-2 mb-0.5">
                        &bull; {c.title || c.description}
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

// --- Cross-analyse ---

function CrossAnalyseBlock({ session }: { session: DINSession }) {
  const balance = getDomainBalance(session.efforts);
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;

  const domainCounts = (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    count: balance[domain],
    pct: Math.round((balance[domain] / total) * 100),
  }));

  // Gedeelde vermogens
  const capBySector: Record<string, Set<string>> = {};
  session.capabilities.forEach((c) => {
    const key = (c.title || c.description || "").toLowerCase().trim();
    if (!capBySector[key]) capBySector[key] = new Set();
    capBySector[key].add(c.sectorId);
  });
  const sharedCaps = Object.entries(capBySector).filter(([, s]) => s.size > 1);

  if (session.efforts.length === 0 && sharedCaps.length === 0) return null;

  return (
    <Section title="Cross-analyse">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Analyse over alle sectoren heen: verdeling over inspanningsdomeinen,
        synergieën tussen sectoren, en mogelijke hefboomwerking.
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
                <div className="w-32 text-[10px]">
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

      {/* Synergieën */}
      {sharedCaps.length > 0 && (
        <SubSection title="Synergieën (gedeelde vermogens)">
          <div className="space-y-1.5">
            {sharedCaps.map(([cap, sectors], i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#003366] mt-0.5 shrink-0">&bull;</span>
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

// --- Gap-analyse ---

function GapAnalyseBlock({ session }: { session: DINSession }) {
  const gaps = useMemo(
    () =>
      findGaps(
        session.goals,
        session.benefits,
        session.capabilities,
        session.efforts,
        session.goalBenefitMaps,
        session.benefitCapabilityMaps,
        session.capabilityEffortMaps
      ),
    [session]
  );

  const goalsWithout = gaps.goalsWithoutBenefits.map((id) => session.goals.find((g) => g.id === id)).filter(Boolean);
  const benefitsWithout = gaps.benefitsWithoutCapabilities.map((id) => session.benefits.find((b) => b.id === id)).filter(Boolean);
  const capsWithout = gaps.capabilitiesWithoutEfforts.map((id) => session.capabilities.find((c) => c.id === id)).filter(Boolean);

  const hasGaps = goalsWithout.length > 0 || benefitsWithout.length > 0 || capsWithout.length > 0;
  if (!hasGaps) return null;

  return (
    <Section title="Gap-analyse">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Onderstaande breuken in de DIN-keten vragen aandacht. Een compleet netwerk
        verbindt elk doel via baten en vermogens aan concrete inspanningen.
      </p>

      {goalsWithout.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs font-semibold text-red-800 mb-1">
            Doelen zonder baten ({goalsWithout.length})
          </div>
          {goalsWithout.map((g) => (
            <div key={g!.id} className="text-xs text-red-700 ml-2">&bull; {g!.name}</div>
          ))}
        </div>
      )}

      {benefitsWithout.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs font-semibold text-amber-800 mb-1">
            Baten zonder vermogens ({benefitsWithout.length})
          </div>
          {benefitsWithout.map((b) => (
            <div key={b!.id} className="text-xs text-amber-700 ml-2">
              &bull; [{b!.sectorId}] {b!.title || b!.description}
            </div>
          ))}
        </div>
      )}

      {capsWithout.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs font-semibold text-amber-800 mb-1">
            Vermogens zonder inspanningen ({capsWithout.length})
          </div>
          {capsWithout.map((c) => (
            <div key={c!.id} className="text-xs text-amber-700 ml-2">
              &bull; [{c!.sectorId}] {c!.title || c!.description}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// --- Hefboomwerking ---

function HefboomBlock({ session }: { session: DINSession }) {
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
    <Section title="Hefboomwerking">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Baten die in meerdere sectoren terugkomen bieden hefboomwerking:
        gedeelde inspanningen met breed effect.
      </p>

      {multiSectorClusters.map(({ goal, cluster, chains }, i) => (
        <div key={i} className="mb-4 p-4 bg-[#003366]/5 rounded-lg border border-[#003366]/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-[#003366]">
              {cluster.theme}
            </span>
            <span className="text-[10px] text-gray-400">
              (Doel: {goal?.name}) — {cluster.sectors.length} sectoren
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {cluster.sectors.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
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

function GovernanceBlock({ session }: { session: DINSession }) {
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

  // Goedkeuringsstatus inspanningen
  const approvedEfforts = session.efforts.filter((e) => e.approvalStatus && e.approvalStatus !== "voorstel");

  return (
    <Section title="Governance & Monitoring">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Overzicht van verantwoordelijkheden voor batenrealisatie, meetmomenten en goedkeuringsstatus
        van inspanningen.
      </p>

      {/* Bateneigenaren */}
      <SubSection title="Bateneigenaren">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Eigenaar</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Sectoren</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Verantwoordelijk voor baten</th>
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
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Baat</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Indicator</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetmethode</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetmoment</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetverantw.</th>
                </tr>
              </thead>
              <tbody>
                {meetplanItems.map((b, i) => (
                  <tr key={b.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-3 py-2 font-medium text-gray-800">{b.title || b.description}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.indicator || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.meetmethode || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.measurementMoment || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{b.profiel.indicatorOwner || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
      )}

      {/* Goedkeuringsstatus */}
      {approvedEfforts.length > 0 && (
        <SubSection title="Goedkeuringsstatus inspanningen">
          <div className="space-y-1">
            {approvedEfforts.map((e) => {
              const statusColors: Record<string, string> = {
                goedgekeurd: "bg-emerald-100 text-emerald-700",
                afgewezen: "bg-red-100 text-red-700",
                aangepast: "bg-amber-100 text-amber-700",
              };
              return (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[e.approvalStatus!] || "bg-gray-100 text-gray-600"}`}>
                    {e.approvalStatus}
                  </span>
                  <span className="text-gray-600">[{e.sectorId}] {e.title || e.description}</span>
                  {e.approvalDate && <span className="text-gray-400">({e.approvalDate})</span>}
                </div>
              );
            })}
          </div>
        </SubSection>
      )}
    </Section>
  );
}

// --- Externe projecten ---

function ExterneProjectenBlock({ session }: { session: DINSession }) {
  if (!session.externalProjects || session.externalProjects.length === 0) return null;

  return (
    <Section title="Lopende projecten">
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Bestaande projecten die aansluiten bij het programma en mogelijk bijdragen aan DIN-vermogens.
      </p>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Project</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Sector</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Beschrijving</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Relevantie</th>
            </tr>
          </thead>
          <tbody>
            {session.externalProjects.map((p, i) => (
              <tr key={p.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                <td className="px-3 py-2 text-gray-600">{p.sectorId}</td>
                <td className="px-3 py-2 text-gray-600">{p.description}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[p.status] || "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{p.relevance || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
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

function SectorBlocks({ session }: { session: DINSession }) {
  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  if (activeSectors.length === 0) return null;

  return (
    <Section title="Sectorale Uitwerking">
      {activeSectors.map((sector) => {
        const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
        const sectorCaps = session.capabilities.filter((c) => c.sectorId === sector);
        const sectorEfforts = session.efforts.filter((e) => e.sectorId === sector);
        const accent = SECTOR_ACCENT[sector];

        // Integratie-advies ophalen
        const rawAdvies = session.integratieAdvies?.[sector];
        const integratieAdvies: IntegratieAdviesResult | null =
          rawAdvies && typeof rawAdvies !== "string" ? rawAdvies : null;

        return (
          <div key={sector} className={`mb-8 last:mb-0 border-l-4 ${accent} pl-5`}>
            <h3 className="text-sm font-bold text-[#003366] mb-4">Sector {sector}</h3>

            {/* Baten met volledig profiel */}
            {sectorBenefits.length > 0 && (
              <SubSection title="Baten">
                <div className="overflow-x-auto">
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Baat</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Indicator</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Huidig &rarr; Doel</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Eigenaar</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetmethode</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Meetmoment</th>
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
                            <td className="px-3 py-2 text-gray-600">{b.profiel.indicator || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {b.profiel.currentValue && b.profiel.targetValue
                                ? `${b.profiel.currentValue} \u2192 ${b.profiel.targetValue}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{b.profiel.bateneigenaar || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">{b.profiel.meetmethode || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">{b.profiel.measurementMoment || "—"}</td>
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
                            {c.currentLevel && c.targetLevel ? `${c.currentLevel}/5 \u2192 ${c.targetLevel}/5` : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{c.profiel?.huidieSituatie || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{c.profiel?.gewensteSituatie || "—"}</td>
                        </tr>
                      ))}
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
                      <div className={`text-xs font-semibold ${dc.text} mb-1.5`}>{DOMAIN_LABELS[domain]}</div>
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Inspanning</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600 w-16">Planning</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Opdrachtgever</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Leider</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Kosten</th>
                              <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Resultaat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainEfforts.map((e, i) => (
                              <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                                <td className="px-3 py-1.5">
                                  <div className="font-medium text-gray-800">{e.title || e.description}</div>
                                  {e.dossier?.randvoorwaarden && (
                                    <div className="text-gray-400 text-[10px] mt-0.5">
                                      Randvoorwaarden: {e.dossier.randvoorwaarden}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-gray-600">{e.quarter || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.eigenaar || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.inspanningsleider || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.kostenraming || "—"}</td>
                                <td className="px-3 py-1.5 text-gray-600">{e.dossier?.verwachtResultaat || "—"}</td>
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
        );
      })}
    </Section>
  );
}

// --- Roadmap ---

function RoadmapBlock({ session }: { session: DINSession }) {
  const quarters = Array.from(
    new Set(session.efforts.filter((e) => e.quarter).map((e) => e.quarter!))
  ).sort();

  if (quarters.length === 0) return null;

  return (
    <Section title="Roadmap">
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
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Opdrachtgever</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qEfforts.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                        <td className="px-3 py-2 text-gray-600">{e.sectorId}</td>
                        <td className="px-3 py-2 text-gray-600">{DOMAIN_LABELS[e.domain]}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{e.title || e.description}</td>
                        <td className="px-3 py-2 text-gray-600">{e.dossier?.eigenaar || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[e.status] || "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABEL[e.status] || e.status}
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
    </Section>
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
      a.download = `programmaplan-${session!.name.replace(/\s+/g, "-").toLowerCase()}.docx`;
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

  const stats = [
    { label: "Doelen", count: session.goals.length },
    { label: "Baten", count: session.benefits.length },
    { label: "Vermogens", count: session.capabilities.length },
    { label: "Inspanningen", count: session.efforts.length },
  ];

  const hasContent = session.goals.length > 0;

  return (
    <div className="space-y-6">
      {/* Export actie-balk */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5">
        <div>
          <h3 className="text-base font-bold text-[#003366] mb-1">Programmaplan exporteren</h3>
          <p className="text-xs text-gray-500">
            Volledig programmaplan als professioneel Word document — alle DIN-methodiek informatie
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exportSuccess && (
            <span className="text-xs text-emerald-600 font-medium">Document gedownload</span>
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
            <div className="text-2xl font-bold text-[#003366]">{s.count}</div>
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
              <DINKetenBlock session={session} />
              <CrossAnalyseBlock session={session} />
              <GapAnalyseBlock session={session} />
              <HefboomBlock session={session} />
              <GovernanceBlock session={session} />
              <ExterneProjectenBlock session={session} />
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
