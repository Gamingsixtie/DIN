"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import type { SectorName, EffortDomain, ApprovalStatus, DINEffort } from "@/lib/types";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";

const QUARTERS = [
  "Nader te bepalen",
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
  "Q1 2027",
  "Q2 2027",
];

const DOMAIN_COLORS: Record<EffortDomain, { bar: string; bg: string; text: string }> = {
  mens: { bar: "#2563eb", bg: "bg-blue-50", text: "text-blue-700" },
  processen: { bar: "#059669", bg: "bg-green-50", text: "text-green-700" },
  data_systemen: { bar: "#7c3aed", bg: "bg-purple-50", text: "text-purple-700" },
  cultuur: { bar: "#d97706", bg: "bg-amber-50", text: "text-amber-700" },
};

const APPROVAL_STYLES: Record<ApprovalStatus, { bg: string; text: string; label: string }> = {
  voorstel: { bg: "bg-gray-100", text: "text-gray-600", label: "Voorstel" },
  goedgekeurd: { bg: "bg-green-100", text: "text-green-700", label: "Goedgekeurd" },
  afgewezen: { bg: "bg-red-100", text: "text-red-700", label: "Afgewezen" },
  aangepast: { bg: "bg-amber-100", text: "text-amber-700", label: "Aanpassing gevraagd" },
};

const SECTOR_TAB_STYLES: Record<SectorName, { active: string; inactive: string }> = {
  PO: { active: "bg-blue-100 text-blue-800 border-blue-300", inactive: "text-blue-600 hover:bg-blue-50" },
  VO: { active: "bg-green-100 text-green-800 border-green-300", inactive: "text-green-600 hover:bg-green-50" },
  Zakelijk: { active: "bg-purple-100 text-purple-800 border-purple-300", inactive: "text-purple-600 hover:bg-purple-50" },
};

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

export default function PrioriteringStep() {
  const { session, updateSession } = useSession();
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [pendingAction, setPendingAction] = useState<{
    effortId: string;
    status: ApprovalStatus;
    opmerking: string;
  } | null>(null);

  if (!session) return null;

  const allEfforts = session.efforts;
  const totalEfforts = allEfforts.length;

  if (totalEfforts === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium mb-1">Nog geen inspanningen om te beoordelen</p>
        <p className="text-sm text-gray-400">
          Vul eerst het DIN-netwerk in via de DIN-Mapping stap.
        </p>
      </div>
    );
  }

  // Statistieken
  const statsVoorstel = allEfforts.filter((e) => !e.approvalStatus || e.approvalStatus === "voorstel").length;
  const statsGoedgekeurd = allEfforts.filter((e) => e.approvalStatus === "goedgekeurd").length;
  const statsAfgewezen = allEfforts.filter((e) => e.approvalStatus === "afgewezen").length;
  const statsIngepland = allEfforts.filter((e) => e.quarter && e.quarter !== "Nader te bepalen").length;

  function handleApprovalClick(effortId: string, status: ApprovalStatus) {
    const effort = session!.efforts.find((e) => e.id === effortId);
    setPendingAction({
      effortId,
      status,
      opmerking: effort?.opmerking || "",
    });
  }

  function confirmApproval() {
    if (!pendingAction) return;
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === pendingAction.effortId
          ? {
              ...e,
              approvalStatus: pendingAction.status,
              opmerking: pendingAction.opmerking || e.opmerking,
              approvalDate: new Date().toISOString(),
              status: pendingAction.status === "afgewezen" ? "on_hold" as const : e.status,
            }
          : e
      ),
    });
    setPendingAction(null);
  }

  function updateQuarter(effortId: string, quarter: string) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === effortId ? { ...e, quarter } : e
      ),
    });
  }

  const sectorEfforts = allEfforts.filter((e) => e.sectorId === activeSector);

  // Tijdlijn data
  const timelineQuarters = QUARTERS.filter((q) => q !== "Nader te bepalen");
  const onbepaaldEfforts = allEfforts.filter((e) => !e.quarter || e.quarter === "Nader te bepalen");

  return (
    <div className="space-y-8">
      {/* Sectie 1: Header + Statistieken */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-cito-blue">Planning & Goedkeuring</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Beoordeel inspanningen per sector, voeg opmerkingen toe en plan de tijdlijn.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-blue">{totalEfforts}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Totaal</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-500">{statsVoorstel}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Voorstel</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-600">{statsGoedgekeurd}</div>
            <div className="text-[10px] text-green-600 uppercase tracking-wider font-medium">Goedgekeurd</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-600">{statsAfgewezen}</div>
            <div className="text-[10px] text-red-600 uppercase tracking-wider font-medium">Afgewezen</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-accent">{statsIngepland}</div>
            <div className="text-[10px] text-cito-accent uppercase tracking-wider font-medium">Ingepland</div>
          </div>
        </div>
      </div>

      {/* Sectie 2: Goedkeuring per Sector */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Goedkeuring per Sector</h3>
            <p className="text-xs text-gray-400">
              Beoordeel de voorgestelde inspanningen per sector en voeg eventueel opmerkingen toe.
            </p>
          </div>
        </div>

        {/* Sector tabs */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-200">
            {SECTORS.map((sector) => {
              const count = allEfforts.filter((e) => e.sectorId === sector).length;
              const reviewed = allEfforts.filter((e) => e.sectorId === sector && e.approvalStatus && e.approvalStatus !== "voorstel").length;
              const isActive = activeSector === sector;
              const styles = SECTOR_TAB_STYLES[sector];
              return (
                <button
                  key={sector}
                  onClick={() => setActiveSector(sector)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                    isActive ? styles.active : `border-transparent ${styles.inactive}`
                  } ${count === 0 ? "opacity-40" : ""}`}
                >
                  <span>{sector}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/60" : "bg-gray-100"}`}>
                      {reviewed}/{count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voortgangsbalk sector */}
        <div className="px-5 pt-3">
          {(() => {
            const total = sectorEfforts.length;
            const reviewed = sectorEfforts.filter((e) => e.approvalStatus && e.approvalStatus !== "voorstel").length;
            const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
            return total > 0 ? (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{reviewed} van {total} beoordeeld</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Inspanningen per domein */}
        <div className="p-5 space-y-4">
          {sectorEfforts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">Geen inspanningen voor {activeSector}.</p>
              <p className="text-xs text-gray-300 mt-1">Voeg inspanningen toe in de DIN-Mapping stap.</p>
            </div>
          ) : (
            (Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
              const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
              if (domainEfforts.length === 0) return null;
              const colors = DOMAIN_COLORS[domain];

              return (
                <div key={domain}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bar }} />
                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                      {DOMAIN_LABELS[domain]} ({domainEfforts.length})
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {domainEfforts.map((effort) => (
                      <EffortApprovalCard
                        key={effort.id}
                        effort={effort}
                        domain={domain}
                        pendingAction={pendingAction}
                        onApprovalClick={handleApprovalClick}
                        onConfirm={confirmApproval}
                        onCancel={() => setPendingAction(null)}
                        onOpmerkingChange={(text) =>
                          setPendingAction((prev) => prev ? { ...prev, opmerking: text } : null)
                        }
                        onQuarterChange={updateQuarter}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Sectie 3: Tijdlijn */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Programmaplanning — Tijdlijn</h3>
            <p className="text-xs text-gray-400">
              Inspanningen per kwartaal over alle sectoren.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {timelineQuarters.map((quarter) => {
              const qEfforts = allEfforts.filter((e) => e.quarter === quarter);
              return (
                <div key={quarter} className="border border-gray-200 rounded-lg p-3 min-h-[100px]">
                  <div className="text-xs font-semibold text-gray-500 mb-2 pb-1.5 border-b border-gray-100">
                    {quarter}
                    {qEfforts.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">({qEfforts.length})</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {qEfforts.map((e) => (
                      <TimelineChip key={e.id} effort={e} />
                    ))}
                    {qEfforts.length === 0 && (
                      <p className="text-[10px] text-gray-300 italic">Geen inspanningen</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nader te bepalen */}
          {onbepaaldEfforts.length > 0 && (
            <div className="mt-4 border border-amber-200 rounded-lg p-3 bg-amber-50/30">
              <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Nader te bepalen ({onbepaaldEfforts.length})
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {onbepaaldEfforts.map((e) => (
                  <TimelineChip key={e.id} effort={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sectie 4: Voortgangsoverzicht */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Voortgangsoverzicht</h3>
            <p className="text-xs text-gray-400">
              Status van het goedkeuringsproces per sector.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTORS.map((sector) => {
              const sEfforts = allEfforts.filter((e) => e.sectorId === sector);
              const total = sEfforts.length;
              const reviewed = sEfforts.filter((e) => e.approvalStatus && e.approvalStatus !== "voorstel").length;
              const goedgekeurd = sEfforts.filter((e) => e.approvalStatus === "goedgekeurd").length;
              const afgewezen = sEfforts.filter((e) => e.approvalStatus === "afgewezen").length;
              const aangepast = sEfforts.filter((e) => e.approvalStatus === "aangepast").length;
              const open = total - reviewed;
              const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
              const sectorColors = SECTOR_COLORS[sector];

              return (
                <div key={sector} className={`rounded-xl border p-4 ${sectorColors}`}>
                  <div className="font-semibold text-sm mb-3">{sector}</div>

                  {total === 0 ? (
                    <p className="text-xs opacity-60">Geen inspanningen</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{reviewed} / {total} beoordeeld</span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Goedgekeurd
                          </span>
                          <span className="font-bold">{goedgekeurd}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Afgewezen
                          </span>
                          <span className="font-bold">{afgewezen}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Aanpassing
                          </span>
                          <span className="font-bold">{aangepast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            Open
                          </span>
                          <span className="font-bold">{open}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balans-check */}
          {(() => {
            const zonderKwartaal = allEfforts.filter((e) => !e.quarter || e.quarter === "Nader te bepalen").length;
            const zonderBeoordeling = allEfforts.filter((e) => !e.approvalStatus || e.approvalStatus === "voorstel").length;

            if (zonderKwartaal === 0 && zonderBeoordeling === 0) {
              return (
                <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Volledig:</strong> Alle inspanningen zijn beoordeeld en ingepland.</span>
                </div>
              );
            }

            return (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div>
                  {zonderBeoordeling > 0 && (
                    <p><strong>{zonderBeoordeling} inspanning{zonderBeoordeling !== 1 ? "en" : ""}</strong> nog niet beoordeeld.</p>
                  )}
                  {zonderKwartaal > 0 && (
                    <p><strong>{zonderKwartaal} inspanning{zonderKwartaal !== 1 ? "en" : ""}</strong> zonder kwartaal-toewijzing.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Sectie 5: Opmerkingen Overzicht */}
      {(() => {
        const effortsWithOpmerkingen = allEfforts.filter((e) => e.opmerking);
        if (effortsWithOpmerkingen.length === 0) return null;

        // Sort by approvalDate desc
        const sorted = [...effortsWithOpmerkingen].sort((a, b) =>
          (b.approvalDate || "").localeCompare(a.approvalDate || "")
        );

        return (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-cito-blue">Opmerkingen overzicht</h3>
                <p className="text-xs text-gray-400">
                  Alle opmerkingen van de programma-eigenaar ({effortsWithOpmerkingen.length}).
                </p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {sorted.map((effort) => {
                const approvalStyle = effort.approvalStatus
                  ? APPROVAL_STYLES[effort.approvalStatus]
                  : APPROVAL_STYLES.voorstel;

                return (
                  <div key={effort.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <SectorBadge sector={effort.sectorId} />
                      <span className="text-sm font-medium text-gray-700 flex-1">
                        {effort.description || "(naamloos)"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${approvalStyle.bg} ${approvalStyle.text}`}>
                        {approvalStyle.label}
                      </span>
                      {effort.quarter && (
                        <span className="text-[10px] text-gray-400">{effort.quarter}</span>
                      )}
                    </div>
                    <div className="pl-2 border-l-2 border-amber-300 ml-1">
                      <p className="text-sm text-gray-600 italic">&ldquo;{effort.opmerking}&rdquo;</p>
                      {effort.approvalDate && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(effort.approvalDate).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
}

// --- Sub-componenten ---

function EffortApprovalCard({
  effort,
  domain,
  pendingAction,
  onApprovalClick,
  onConfirm,
  onCancel,
  onOpmerkingChange,
  onQuarterChange,
}: {
  effort: DINEffort;
  domain: EffortDomain;
  pendingAction: { effortId: string; status: ApprovalStatus; opmerking: string } | null;
  onApprovalClick: (id: string, status: ApprovalStatus) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onOpmerkingChange: (text: string) => void;
  onQuarterChange: (id: string, quarter: string) => void;
}) {
  const colors = DOMAIN_COLORS[domain];
  const isExpanded = pendingAction?.effortId === effort.id;
  const approvalStyle = effort.approvalStatus
    ? APPROVAL_STYLES[effort.approvalStatus]
    : null;

  const statusBg = effort.status === "gepland"
    ? "border-green-200 bg-green-50/30"
    : effort.status === "on_hold"
    ? "border-red-200 bg-red-50/30"
    : effort.status === "in_uitvoering"
    ? "border-blue-200 bg-blue-50/30"
    : "border-gray-200 bg-white";

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${statusBg}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Domein kleur indicator */}
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colors.bar }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">
                  {effort.description || "(naamloos)"}
                </div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {/* Kwartaal dropdown */}
                  <select
                    value={effort.quarter || ""}
                    onChange={(e) => onQuarterChange(effort.id, e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                  >
                    <option value="">Kwartaal...</option>
                    {QUARTERS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>

                  {/* Approval badge */}
                  {approvalStyle && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${approvalStyle.bg} ${approvalStyle.text}`}>
                      {approvalStyle.label}
                    </span>
                  )}

                  {/* Opmerking indicator */}
                  {effort.opmerking && !isExpanded && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5" title={effort.opmerking}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 3.89 1 5.198v5.6c0 1.3.983 2.438 2.418 2.672.168.027.338.052.508.076l-.707 2.121a.5.5 0 00.77.53l3.463-2.207c.81.056 1.63.085 2.458.085 2.236 0 4.43-.18 6.57-.524C17.007 13.44 18 12.3 18 11v-5.6c0-1.31-.983-2.444-2.418-2.676A47.71 47.71 0 0010 2z" clipRule="evenodd" />
                      </svg>
                      Opmerking
                    </span>
                  )}
                </div>
              </div>

              {/* Actieknoppen */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onApprovalClick(effort.id, "goedgekeurd")}
                  className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    effort.approvalStatus === "goedgekeurd"
                      ? "bg-green-500 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                  title="Goedkeuren"
                >
                  Goedkeuren
                </button>
                <button
                  onClick={() => onApprovalClick(effort.id, "afgewezen")}
                  className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    effort.approvalStatus === "afgewezen"
                      ? "bg-red-500 text-white"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                  title="Afwijzen"
                >
                  Afwijzen
                </button>
                <button
                  onClick={() => onApprovalClick(effort.id, "aangepast")}
                  className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    effort.approvalStatus === "aangepast"
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }`}
                  title="Aanpassen"
                >
                  Aanpassen
                </button>
              </div>
            </div>

            {/* Bestaande opmerking weergeven */}
            {effort.opmerking && !isExpanded && (
              <div className="mt-2 pl-2 border-l-2 border-amber-300">
                <p className="text-xs text-gray-500 italic">&ldquo;{effort.opmerking}&rdquo;</p>
                {effort.approvalDate && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(effort.approvalDate).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: opmerking invoer */}
      {isExpanded && pendingAction && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <label className="text-xs font-medium text-gray-600 block mb-1.5">
            Opmerking bij {APPROVAL_STYLES[pendingAction.status].label.toLowerCase()} (optioneel):
          </label>
          <textarea
            value={pendingAction.opmerking}
            onChange={(e) => onOpmerkingChange(e.target.value)}
            placeholder="Voeg een opmerking of toelichting toe..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-blue/20 focus:border-cito-blue resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            >
              Annuleren
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-1.5 text-xs text-white rounded-md font-medium ${
                pendingAction.status === "goedgekeurd"
                  ? "bg-green-600 hover:bg-green-700"
                  : pendingAction.status === "afgewezen"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              Bevestigen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineChip({ effort }: { effort: DINEffort }) {
  const domainColor = DOMAIN_COLORS[effort.domain]?.bar || "#6b7280";
  const isAfgewezen = effort.approvalStatus === "afgewezen" || effort.status === "on_hold";

  return (
    <div
      className={`text-xs p-2 rounded-md border-l-2 bg-white border border-gray-100 shadow-sm ${
        isAfgewezen ? "opacity-40 line-through" : ""
      }`}
      style={{ borderLeftColor: domainColor }}
      title={`${effort.description}${effort.opmerking ? `\n\nOpmerking: ${effort.opmerking}` : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <SectorBadge sector={effort.sectorId} />
        <span className="text-gray-600 truncate flex-1">{effort.description || "(naamloos)"}</span>
        {effort.opmerking && (
          <svg className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 3.89 1 5.198v5.6c0 1.3.983 2.438 2.418 2.672.168.027.338.052.508.076l-.707 2.121a.5.5 0 00.77.53l3.463-2.207c.81.056 1.63.085 2.458.085 2.236 0 4.43-.18 6.57-.524C17.007 13.44 18 12.3 18 11v-5.6c0-1.31-.983-2.444-2.418-2.676A47.71 47.71 0 0010 2z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}
