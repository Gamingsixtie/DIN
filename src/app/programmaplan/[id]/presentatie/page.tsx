"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";

/** Presentatie-modus — opmaak: gekleurde kopbalk + witte body met platte, kleurrijke kaarten. */

const CITO = "#003366", TEAL = "#159a86", ORANGE = "#ee7a1a", PINK = "#e51f55", GREEN = "#7bc043";
const NAVY = "#1b3a5b", PANEL = "#eef1f6", INK = "#243244", SUB = "#6b7a8d";
const DOMS = [
  { key: "mens", label: "Mens", color: "#2563eb" },
  { key: "processen", label: "Processen", color: "#059669" },
  { key: "data_systemen", label: "Data & Systemen", color: "#7c3aed" },
  { key: "cultuur", label: "Cultuur", color: "#d97706" },
] as const;
const SECTORS = [
  { key: "PO", color: "#7c5cd6" },
  { key: "VO", color: "#10b981" },
  { key: "Zakelijk", color: "#0e9e8e" },
] as const;
const TIMELINE = [
  { label: "Visie", sub: "outside-in als fundament", color: NAVY },
  { label: "DIN-netwerk", sub: "met de sectormanagers", color: TEAL },
  { label: "Geconsolideerd", sub: "cross-sectoraal", color: ORANGE },
  { label: "Vandaag", sub: "recap & vervolg", color: PINK },
];
const SIDES_DOEN = [
  ["Programmamanagement & regie", "Leiding, voortgang, samenhang en escalatie"],
  ["Adoptie & gedragsverandering", "Van training naar borging, per rol"],
  ["Customer Success & CRM", "Eén klantreis; data die stuurt"],
  ["Kennisdeling & verbinding", "De drie sectoren met elkaar verbinden"],
];
const SIDES_TEAM = [
  ["Senior consultant", "Interim programmaleiding · ~3 dagen/week", TEAL],
  ["Medior consultant", "Uitwerking & facilitering · ~2 dagen/week", NAVY],
  ["Specialisten op afroep", "CRM · solutions architecten · journey designers", ORANGE],
];
const NET_NODES: Array<[number, number]> = [[1150, 60], [1280, 120], [1360, 210], [1230, 235], [1330, 325], [1095, 175], [1392, 95], [1205, 345], [90, 520], [210, 600], [140, 702], [60, 640], [292, 560], [182, 762], [322, 680], [1352, 560], [1240, 662]];
const NET_LINES: Array<[number, number]> = [[0, 1], [1, 6], [1, 2], [2, 4], [3, 4], [0, 5], [3, 1], [2, 3], [7, 4], [7, 3], [8, 9], [9, 10], [8, 11], [9, 12], [10, 13], [13, 14], [14, 10], [12, 9], [15, 16]];
const NET_ACCENT = new Set([1, 9, 16]);

interface StepShape {
  stap2?: { vermogenGelijkenisGroepen?: Array<{ gezamenlijkeOmschrijving?: string }> };
  stap4?: { subEffortAnalysis?: Array<{ actie?: string; domein?: string; titel?: string; voorgesteldeNaam?: string }>; begrotingAdvies?: { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<{ totaalEuro?: number }> }> } };
}
const mln = (n: number) => "€ " + (n / 1_000_000).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " mln";

function Slide({ title, subtitle, headerColor, children }: { title: string; subtitle?: string; headerColor?: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-[5vw] py-[4vh] shrink-0" style={{ background: headerColor || CITO }}>
        <h2 className="text-[clamp(22px,3vw,40px)] font-bold text-white leading-tight">{title}</h2>
      </div>
      {subtitle && <div className="px-[5vw] pt-4 shrink-0 text-[clamp(13px,1.5vw,20px)] italic font-medium" style={{ color: TEAL }}>{subtitle}</div>}
      <div className="flex-1 min-h-0 px-[5vw] py-[4vh] flex flex-col justify-center">{children}</div>
    </div>
  );
}

export default function PresentatiePage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<DINSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    loadSessionFromSupabase(id)
      .then((s) => { if (cancelled) return; if (!s) setError("Programmaplan niet gevonden."); else setSession(s); })
      .catch(() => { if (!cancelled) setError("Programmaplan kon niet geladen worden."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const slides = useMemo<React.ReactNode[]>(() => {
    if (!session) return [];
    const sr = session.crossAnalyseWizard?.stepResults as StepShape | undefined;
    const goals = (session.goals ?? []) as Array<{ title?: string; name?: string }>;
    const benefits = (session.benefits ?? []) as Array<{ title?: string; description?: string; sectorId?: string }>;
    const po = session.programmaorganisatie;
    const combineren = (sr?.stap4?.subEffortAnalysis ?? []).filter((s) => s.actie === "combineren");
    const inspPerDomein = DOMS.map((d) => ({ ...d, titel: combineren.find((s) => s.domein === d.key)?.titel || combineren.find((s) => s.domein === d.key)?.voorgesteldeNaam || "" }));
    const scenarios = sr?.stap4?.begrotingAdvies?.scenarios ?? {};
    const scenRows = ([["advies", "Advies"], ["plus20", "+20%"], ["optimaal", "Optimaal"], ["min20", "−20%"]] as const).flatMap(([k, label]) => { const sc = scenarios[k]; if (!sc) return []; return [{ label, jaren: sc.aantalJaren ?? 0, bedrag: (sc.inspanningen ?? []).reduce((a, i) => a + (i.totaalEuro ?? 0), 0), focus: k === "plus20" }]; });
    const maxBedrag = Math.max(1, ...scenRows.map((r) => r.bedrag));
    const namen = (arr?: Array<{ naam?: string }>) => (arr ?? []).map((r) => r.naam).filter(Boolean).join(" · ");

    const out: React.ReactNode[] = [];

    // 1 — Titel (cover met netwerk-motief)
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden bg-gradient-to-b from-[#f5f8fc] to-white">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g stroke="#003366" strokeOpacity="0.15" strokeWidth="1.5">{NET_LINES.map(([a, b], i) => (<line key={i} x1={NET_NODES[a][0]} y1={NET_NODES[a][1]} x2={NET_NODES[b][0]} y2={NET_NODES[b][1]} />))}</g>
          {NET_NODES.map(([x, y], i) => { const accent = NET_ACCENT.has(i), hub = i % 4 === 0; return (<circle key={i} cx={x} cy={y} r={accent ? 7 : hub ? 9 : 5} fill={accent ? "#0f9d77" : "#003366"} fillOpacity={accent ? 0.55 : hub ? 0.24 : 0.17} />); })}
        </svg>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(50% 42% at 50% 42%, rgba(255,255,255,0.78), transparent 72%)" }} />
        <div className="relative">
          <div className="text-[clamp(11px,1.3vw,16px)] tracking-[0.44em] uppercase font-semibold text-slate-400 mb-7">Doelen-Inspanningennetwerk</div>
          <h1 className="text-[clamp(56px,9.5vw,132px)] font-extrabold text-cito-blue leading-[0.92] tracking-tight">Programmaplan</h1>
          <p className="text-[clamp(24px,3.8vw,54px)] font-medium mt-5"><span className="text-cito-blue">Klant </span><span className="text-slate-400">in</span><span className="text-cito-blue"> Beeld</span></p>
          <div className="flex items-center justify-center gap-2.5 mt-12"><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /><span className="w-16 h-[3px] bg-cito-blue/25 rounded-full" /><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /></div>
        </div>
      </div>
    );

    // 2 — Waar staan we (timeline)
    out.push(
      <Slide title="Waar staan we — van visie naar uitvoering" headerColor={TEAL}>
        <div className="relative w-full max-w-5xl mx-auto">
          <div className="absolute left-[12%] right-[12%] h-1.5 rounded-full" style={{ background: TEAL, top: "clamp(40px,7vh,60px)" }} />
          <div className="flex justify-between relative">
            {TIMELINE.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center w-1/4">
                <div className="rounded-full grid place-items-center text-white font-bold shadow-lg" style={{ background: s.color, width: "clamp(80px,12vh,120px)", height: "clamp(80px,12vh,120px)", fontSize: "clamp(28px,4vh,44px)" }}>{i + 1}</div>
                <div className="mt-4 font-bold text-[clamp(14px,1.5vw,20px)]" style={{ color: INK }}>{s.label}</div>
                <div className="text-[clamp(11px,1.2vw,15px)] mt-0.5" style={{ color: SUB }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>
    );

    // 3 — Programmadoelen (power: focus doel 1)
    out.push(
      <Slide title="Programmadoelen — één focus: doel 1">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
          <div className="rounded-3xl text-white p-7 shadow-xl relative overflow-hidden" style={{ background: CITO }}>
            <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full border border-white/10" />
            <div className="flex items-start gap-6 relative">
              <span className="font-extrabold leading-none" style={{ fontSize: "clamp(56px,9vh,108px)" }}>1</span>
              <div className="flex-1">
                <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ background: GREEN, color: "#173a0a" }}>FOCUS</span>
                <div className="font-bold leading-tight mt-2.5" style={{ fontSize: "clamp(20px,2.7vw,36px)" }}>{goals[0]?.title || goals[0]?.name}</div>
                <div className="text-white/75 mt-2.5 text-[clamp(13px,1.3vw,18px)]">Eén betrouwbaar klantbeeld · proactief handelen mogelijk</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="rounded-2xl border border-gray-200 p-4 flex items-start gap-3" style={{ background: PANEL }}>
                <span className="text-3xl font-bold text-gray-300 leading-none">{n + 1}</span>
                <div className="font-semibold leading-snug text-[clamp(13px,1.3vw,17px)]" style={{ color: SUB }}>{goals[n]?.title || goals[n]?.name}</div>
              </div>
            ))}
          </div>
          <div className="text-[clamp(12px,1.2vw,15px)] flex items-start gap-2.5" style={{ color: SUB }}>
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} />
            <span>De focus op doel 1 bepalen we samen in de <strong style={{ color: INK }}>eerste sessie met het MT</strong>. Doel 2 en 3 volgen gaandeweg, cyclisch.</span>
          </div>
        </div>
      </Slide>
    );

    // 4 — Cross-sectorale kern (convergentie)
    const sY = 14, hub = { x: 500, y: 150, w: 360, h: 96 }, dY = 372, sX = [200, 500, 800], dX = [110, 370, 630, 890];
    out.push(
      <Slide title="Cross-sectorale uitkomst — één hefboom voor drie sectoren">
        <div className="w-full max-w-5xl mx-auto">
          {goals[0] && <div className="text-center text-[clamp(12px,1.2vw,15px)] mb-1" style={{ color: SUB }}><span className="font-semibold" style={{ color: CITO }}>Focusdoel:</span> {goals[0].title}</div>}
          <svg viewBox="0 0 1000 460" className="w-full h-auto" style={{ maxHeight: "54vh" }}>
            {sX.map((x, i) => (<line key={"l" + i} x1={x} y1={sY + 56} x2={hub.x} y2={hub.y} stroke="#cbd5e1" strokeWidth={2} />))}
            {dX.map((x, i) => (<line key={"d" + i} x1={hub.x} y1={hub.y + hub.h} x2={x} y2={dY} stroke="#cbd5e1" strokeWidth={2} />))}
            {SECTORS.map((s, i) => (<g key={s.key}><rect x={sX[i] - 90} y={sY} width={180} height={56} rx={14} fill="#fff" stroke={s.color} strokeWidth={2.5} /><text x={sX[i]} y={sY + 35} textAnchor="middle" fontSize={21} fontWeight={700} fill={s.color}>{s.key}</text></g>))}
            <rect x={hub.x - hub.w / 2} y={hub.y} width={hub.w} height={hub.h} rx={18} fill={CITO} />
            <text x={hub.x} y={hub.y + 42} textAnchor="middle" fontSize={26} fontWeight={700} fill="#fff">Eén gedeeld vermogen</text>
            <text x={hub.x} y={hub.y + 72} textAnchor="middle" fontSize={15} fill="#9fd0ff">CRM-fundament · outside-in · funnels · mensen · cultuur</text>
            {DOMS.map((d, i) => (<g key={d.key}><rect x={dX[i] - 100} y={dY} width={200} height={56} rx={14} fill={d.color} /><text x={dX[i]} y={dY + 35} textAnchor="middle" fontSize={17} fontWeight={700} fill="#fff">{d.label}</text></g>))}
          </svg>
        </div>
      </Slide>
    );

    // 5 — Inspanningen (4 kleurkaarten)
    out.push(
      <Slide title="De inspanningen — vier domeinen, één keer goed">
        <div className="grid grid-cols-2 gap-4 w-full max-w-5xl mx-auto">
          {inspPerDomein.map((d) => (
            <div key={d.key} className="rounded-2xl p-6 text-white flex flex-col justify-between" style={{ background: d.color, minHeight: "clamp(110px,17vh,160px)" }}>
              <div className="font-bold text-[clamp(17px,2vw,26px)]">{d.label}</div>
              <div className="text-white/90 leading-snug mt-2 text-[clamp(12px,1.3vw,16px)]">{d.titel || "—"}</div>
            </div>
          ))}
        </div>
      </Slide>
    );

    // 6 — Raming (balken)
    if (scenRows.length > 0)
      out.push(
        <Slide title="Begroting & raming — vier scenario's">
          <div className="w-full max-w-4xl mx-auto space-y-4">
            {scenRows.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <div className={`w-24 text-right font-semibold text-[clamp(13px,1.3vw,17px)]`} style={{ color: r.focus ? CITO : SUB }}>{r.label}</div>
                <div className="flex-1 h-11 rounded-lg relative overflow-hidden" style={{ background: PANEL }}>
                  <div className="h-full rounded-lg flex items-center justify-end pr-3" style={{ width: `${(r.bedrag / maxBedrag) * 100}%`, background: r.focus ? CITO : "#c4cdd9" }}>
                    <span className={`font-bold tabular-nums text-[clamp(12px,1.2vw,16px)] ${r.focus ? "text-white" : "text-gray-700"}`}>{mln(r.bedrag)}</span>
                  </div>
                </div>
                <div className="w-16 text-[clamp(11px,1.1vw,14px)]" style={{ color: r.focus ? CITO : SUB, fontWeight: r.focus ? 700 : 400 }}>{r.jaren} jr{r.focus ? " ★" : ""}</div>
              </div>
            ))}
            <div className="text-center text-[clamp(12px,1.2vw,15px)] pt-2" style={{ color: SUB }}>Intentie: het <strong style={{ color: CITO }}>+20%-scenario</strong> als 5-jaar horizon · out-of-pocket (interne uren apart)</div>
          </div>
        </Slide>
      );

    // 7 — Organigram (boom)
    if (po)
      out.push(
        <Slide title="Programma-organisatie — helder belegd">
          <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
            {[["Opdrachtgever", po.opdrachtgever?.naam], ["Programmamanager", po.programmamanager?.naam]].map((n, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="rounded-xl text-white px-8 py-3 text-center shadow" style={{ background: CITO }}>
                  <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{n[0]}</div>
                  <div className="font-bold text-[clamp(15px,1.5vw,20px)]">{n[1]}</div>
                </div>
                <div className="w-0.5 h-5 bg-gray-300" />
              </div>
            ))}
            <div className="w-2/3 h-0.5 bg-gray-300" />
            <div className="grid grid-cols-3 gap-4 w-full mt-5">
              {[["Stuurgroep", namen(po.stuurgroep), CITO], ["Kerngroep", "Inspanningsleiders + domeineigenaren", TEAL], ["Adviesgroep", namen(po.adviesgroep), ORANGE]].map((g, i) => (
                <div key={i} className="rounded-xl bg-white p-4 text-center border-t-4 shadow-sm" style={{ borderTopColor: g[2] as string }}>
                  <div className="font-bold text-[clamp(13px,1.3vw,17px)]" style={{ color: g[2] as string }}>{g[0]}</div>
                  <div className="mt-1 leading-snug text-[clamp(11px,1.1vw,14px)]" style={{ color: SUB }}>{g[1] || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </Slide>
      );

    // 8 — 3sides (2 kolommen)
    out.push(
      <Slide title="Rol van 3sides in het programma" subtitle="Strategisch partner die de interne capaciteit versterkt" headerColor={NAVY}>
        <div className="grid grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
          <div>
            <div className="font-bold text-[clamp(15px,1.6vw,21px)] mb-3" style={{ color: CITO }}>Hoe zetten we 3sides in?</div>
            <div className="rounded-2xl p-5 space-y-3.5" style={{ background: PANEL }}>
              {SIDES_DOEN.map(([t, d]) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} />
                  <div><div className="font-bold text-[clamp(13px,1.3vw,17px)]" style={{ color: INK }}>{t}</div><div className="text-[clamp(11px,1.15vw,14px)]" style={{ color: SUB }}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold text-[clamp(15px,1.6vw,21px)] mb-3" style={{ color: CITO }}>Het team</div>
            <div className="space-y-3">
              {SIDES_TEAM.map(([t, d, c]) => (
                <div key={t} className="rounded-2xl p-4 text-white" style={{ background: c }}>
                  <div className="font-bold text-[clamp(14px,1.4vw,19px)]">{t}</div>
                  <div className="text-white/85 text-[clamp(11px,1.15vw,14px)] mt-0.5">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>
    );

    return out;
  }, [session]);

  const count = slides.length;
  const go = useCallback((d: number) => setIdx((i) => Math.max(0, Math.min(count - 1, i + d))), [count]);
  const toggleFs = useCallback(() => { const el = rootRef.current; if (!el) return; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === "Home") setIdx(0); else if (e.key === "End") setIdx(count - 1);
      else if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFs, count]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="text-center"><div className="inline-block w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" /><p className="text-sm text-gray-300">Presentatie laden…</p></div></div>;
  if (error || !session) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="max-w-md text-center bg-white rounded-xl p-8 shadow"><h1 className="text-lg font-bold text-gray-800 mb-2">Niet gevonden</h1><p className="text-sm text-gray-600">{error ?? "De link is mogelijk verlopen."}</p></div></div>;

  return (
    <div ref={rootRef} className="fixed inset-0 bg-gray-100 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 z-50"><div className="h-full bg-cito-blue transition-[width] duration-300" style={{ width: `${count > 1 ? (idx / (count - 1)) * 100 : 0}%` }} /></div>
      <div className="absolute inset-0 flex items-stretch justify-center p-[2vmin]"><div className="w-full max-w-[1440px] bg-white rounded-2xl shadow-2xl overflow-hidden">{slides[idx]}</div></div>
      <button className="absolute top-0 bottom-0 left-0 w-[12%] z-30 cursor-w-resize" onClick={() => go(-1)} aria-label="Vorige" />
      <button className="absolute top-0 bottom-0 right-0 w-[12%] z-30 cursor-e-resize" onClick={() => go(1)} aria-label="Volgende" />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg border border-gray-200 px-2 py-1.5">
        <button onClick={() => go(-1)} disabled={idx === 0} className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg">‹</button>
        <span className="text-xs font-semibold text-gray-600 tabular-nums px-1 min-w-[44px] text-center">{idx + 1} / {count}</span>
        <button onClick={() => go(1)} disabled={idx >= count - 1} className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg">›</button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={toggleFs} className="h-9 px-3 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 text-xs font-semibold" title="Volledig scherm (F)">⤢ Full-screen</button>
      </div>
      <div className="absolute bottom-6 right-6 z-40 text-[11px] text-gray-400 select-none">← → · F volledig scherm</div>
    </div>
  );
}
