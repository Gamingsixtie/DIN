"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";

/** Presentatie-modus: diagram-gedreven slides. Eén beeld per slide, minimale tekst. */

const CITO = "#003366";
const MINT = "#0f9d77";
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
const SIDES = ["Programmamanagement & regie", "Adoptie & gedrag", "Customer Success", "CRM & data", "Leiderschap", "Kennisdeling"];

interface StepShape {
  stap2?: { vermogenGelijkenisGroepen?: Array<{ gezamenlijkeOmschrijving?: string }> };
  stap4?: {
    subEffortAnalysis?: Array<{ actie?: string; domein?: string; titel?: string; voorgesteldeNaam?: string }>;
    begrotingAdvies?: { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<{ totaalEuro?: number }> }> };
  };
}
const mln = (n: number) => "€ " + (n / 1_000_000).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " mln";

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <div className={`text-[clamp(11px,1.1vw,14px)] font-bold tracking-[0.24em] uppercase mb-2 ${dark ? "text-teal-200" : "text-teal-600"}`}>{children}</div>;
}
function Frame({ eyebrow, titel, children }: { eyebrow: string; titel: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col px-[6vw] py-[6vh]">
      <div className="shrink-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-[clamp(24px,3.2vw,42px)] font-bold text-cito-blue leading-tight">{titel}</h2>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">{children}</div>
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

    const focusdoel = goals[0]?.title || goals[0]?.name || "";
    const baat = (sec: string) => { const b = benefits.find((x) => x.sectorId === sec); return b ? b.title || b.description || "" : ""; };
    const combineren = (sr?.stap4?.subEffortAnalysis ?? []).filter((s) => s.actie === "combineren");
    const inspPerDomein = DOMS.map((d) => ({ ...d, titel: combineren.find((s) => s.domein === d.key)?.titel || combineren.find((s) => s.domein === d.key)?.voorgesteldeNaam || "" }));
    const scenarios = sr?.stap4?.begrotingAdvies?.scenarios ?? {};
    const scenRows = ([["advies", "Advies"], ["plus20", "+20%"], ["optimaal", "Optimaal"], ["min20", "−20%"]] as const).flatMap(([k, label]) => {
      const sc = scenarios[k]; if (!sc) return [];
      return [{ label, jaren: sc.aantalJaren ?? 0, bedrag: (sc.inspanningen ?? []).reduce((a, i) => a + (i.totaalEuro ?? 0), 0), focus: k === "plus20" }];
    });
    const maxBedrag = Math.max(1, ...scenRows.map((r) => r.bedrag));
    const namen = (arr?: Array<{ naam?: string }>) => (arr ?? []).map((r) => r.naam).filter(Boolean).join(" · ");

    const out: React.ReactNode[] = [];

    // 1 — Titel
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(58% 48% at 50% 38%, rgba(0,51,102,0.055), transparent 72%)" }} />
        <div className="relative">
          <div className="text-[clamp(11px,1.25vw,15px)] tracking-[0.42em] uppercase font-semibold text-slate-400 mb-7">Doelen-Inspanningennetwerk</div>
          <h1 className="text-[clamp(52px,8.5vw,116px)] font-bold text-cito-blue leading-[0.95] tracking-tight">Programmaplan</h1>
          <p className="text-[clamp(22px,3.4vw,48px)] font-medium mt-4">
            <span className="text-cito-blue">Klant </span><span className="text-slate-400">in</span><span className="text-cito-blue"> Beeld</span>
          </p>
          <div className="w-20 h-[3px] bg-cito-blue/25 rounded-full mx-auto mt-12" />
        </div>
      </div>
    );

    // 2 — Waar staan we (journey)
    out.push(
      <Frame eyebrow="Inleiding — waar staan we" titel="Van visie naar geconsolideerd netwerk">
        <div className="flex items-center justify-center gap-2 md:gap-6 w-full max-w-5xl">
          {[["Visie", "outside-in"], ["DIN", "met sectormanagers"], ["Netwerk", "geconsolideerd"], ["Vandaag", "recap & vervolg"]].map((s, i, arr) => (
            <div key={i} className="flex items-center gap-2 md:gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-[clamp(80px,11vw,150px)] h-[clamp(80px,11vw,150px)] rounded-full grid place-items-center text-white font-bold text-[clamp(14px,1.6vw,22px)] shadow-lg" style={{ background: i === 3 ? MINT : CITO }}>{s[0]}</div>
                <div className="text-[clamp(11px,1.1vw,15px)] text-gray-500 mt-2">{s[1]}</div>
              </div>
              {i < arr.length - 1 && <div className="text-2xl md:text-4xl text-gray-300">→</div>}
            </div>
          ))}
        </div>
      </Frame>
    );

    // 3 — Doelstellingen (3 pijlers, focus uitgelicht)
    out.push(
      <Frame eyebrow="De gezamenlijke doelstellingen" titel="Drie doelen — één focus">
        <div className="grid grid-cols-3 gap-5 w-full max-w-5xl items-end">
          {goals.slice(0, 3).map((g, i) => (
            <div key={i} className={`rounded-2xl p-6 flex flex-col ${i === 0 ? "text-white shadow-xl" : "bg-gray-50 border border-gray-200"}`} style={{ background: i === 0 ? CITO : undefined, height: i === 0 ? "clamp(220px,30vh,300px)" : "clamp(170px,24vh,240px)" }}>
              <div className="flex items-center justify-between">
                <span className={`text-[clamp(40px,5vw,68px)] font-bold leading-none ${i === 0 ? "text-white" : "text-gray-300"}`}>{i + 1}</span>
                {i === 0 && <span className="text-[11px] font-bold bg-white/20 rounded-full px-3 py-1">FOCUS</span>}
              </div>
              <div className={`mt-auto text-[clamp(13px,1.3vw,18px)] font-semibold leading-snug ${i === 0 ? "text-white" : "text-gray-800"}`}>{g.title || g.name}</div>
            </div>
          ))}
        </div>
      </Frame>
    );

    // 4 — Cross-sectorale kern (convergentie-diagram)
    const sectorY = 14, hub = { x: 500, y: 150, w: 360, h: 96 }, domY = 372;
    const sectorX = [200, 500, 800], domX = [110, 370, 630, 890];
    out.push(
      <Frame eyebrow="Cross-sectorale uitkomst — de kern" titel="Eén hefboom voor drie sectoren">
        <div className="w-full max-w-5xl">
          {focusdoel && <div className="text-center text-[clamp(12px,1.2vw,15px)] text-gray-500 mb-1"><span className="font-semibold text-cito-blue">Focusdoel:</span> {focusdoel}</div>}
          <svg viewBox="0 0 1000 460" className="w-full h-auto" style={{ maxHeight: "60vh" }}>
            {sectorX.map((x, i) => (<line key={"l" + i} x1={x} y1={sectorY + 56} x2={hub.x} y2={hub.y} stroke="#cbd5e1" strokeWidth={2} />))}
            {domX.map((x, i) => (<line key={"d" + i} x1={hub.x} y1={hub.y + hub.h} x2={x} y2={domY} stroke="#cbd5e1" strokeWidth={2} />))}
            {SECTORS.map((s, i) => (
              <g key={s.key}>
                <rect x={sectorX[i] - 90} y={sectorY} width={180} height={56} rx={12} fill="#fff" stroke={s.color} strokeWidth={2} />
                <text x={sectorX[i]} y={sectorY + 34} textAnchor="middle" fontSize={20} fontWeight={700} fill={s.color}>{s.key}</text>
              </g>
            ))}
            <rect x={hub.x - hub.w / 2} y={hub.y} width={hub.w} height={hub.h} rx={16} fill={CITO} />
            <text x={hub.x} y={hub.y + 42} textAnchor="middle" fontSize={26} fontWeight={700} fill="#fff">Eén gedeeld vermogen</text>
            <text x={hub.x} y={hub.y + 72} textAnchor="middle" fontSize={15} fill="#9fd0ff">CRM-fundament · outside-in · funnels · mensen · cultuur</text>
            {DOMS.map((d, i) => (
              <g key={d.key}>
                <rect x={domX[i] - 100} y={domY} width={200} height={56} rx={12} fill={d.color} />
                <text x={domX[i]} y={domY + 34} textAnchor="middle" fontSize={17} fontWeight={700} fill="#fff">{d.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </Frame>
    );

    // 5 — Inspanningen (4 kleurvlakken)
    out.push(
      <Frame eyebrow="De inspanningen — cross-sectoraal" titel="Vier domeinen, één keer goed">
        <div className="grid grid-cols-2 gap-4 w-full max-w-5xl">
          {inspPerDomein.map((d) => (
            <div key={d.key} className="rounded-2xl p-6 text-white flex flex-col justify-between min-h-[clamp(120px,18vh,170px)]" style={{ background: d.color }}>
              <div className="text-[clamp(18px,2vw,28px)] font-bold">{d.label}</div>
              <div className="text-[clamp(13px,1.3vw,17px)] text-white/90 leading-snug mt-2">{d.titel || "—"}</div>
            </div>
          ))}
        </div>
      </Frame>
    );

    // 6 — Raming (balkendiagram)
    if (scenRows.length > 0)
      out.push(
        <Frame eyebrow="Begroting & raming — out-of-pocket" titel="Vier scenario's — intentie: 5-jaar horizon">
          <div className="w-full max-w-4xl space-y-4">
            {scenRows.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <div className={`w-28 text-right text-[clamp(13px,1.3vw,17px)] font-semibold ${r.focus ? "text-cito-blue" : "text-gray-500"}`}>{r.label}</div>
                <div className="flex-1 h-10 rounded-lg bg-gray-100 relative overflow-hidden">
                  <div className="h-full rounded-lg flex items-center justify-end pr-3 transition-all" style={{ width: `${(r.bedrag / maxBedrag) * 100}%`, background: r.focus ? CITO : "#cbd5e1" }}>
                    <span className={`text-[clamp(12px,1.2vw,16px)] font-bold tabular-nums ${r.focus ? "text-white" : "text-gray-700"}`}>{mln(r.bedrag)}</span>
                  </div>
                  {r.focus && <span className="absolute right-[-66px] top-1/2 -translate-y-1/2 text-[11px] font-bold text-cito-blue">★ {r.jaren} jaar</span>}
                </div>
                <div className="w-14 text-[clamp(11px,1.1vw,14px)] text-gray-400">{r.jaren} jr</div>
              </div>
            ))}
          </div>
        </Frame>
      );

    // 7 — Organigram (boom)
    if (po)
      out.push(
        <Frame eyebrow="Programma-organisatie" titel="Helder belegd">
          <div className="flex flex-col items-center w-full max-w-4xl">
            {[["Opdrachtgever", po.opdrachtgever?.naam], ["Programmamanager", po.programmamanager?.naam]].map((n, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="rounded-xl bg-cito-blue text-white px-8 py-3 text-center shadow">
                  <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">{n[0]}</div>
                  <div className="font-bold text-[clamp(15px,1.5vw,20px)]">{n[1]}</div>
                </div>
                <div className="w-0.5 h-5 bg-gray-300" />
              </div>
            ))}
            <div className="w-2/3 h-0.5 bg-gray-300" />
            <div className="grid grid-cols-3 gap-4 w-full mt-5">
              {[["Stuurgroep", namen(po.stuurgroep), CITO], ["Kerngroep", "Inspanningsleiders + domeineigenaren", MINT], ["Adviesgroep", namen(po.adviesgroep), "#d97706"]].map((g, i) => (
                <div key={i} className="rounded-xl border-2 bg-white p-4 text-center" style={{ borderColor: g[2] as string }}>
                  <div className="font-bold text-[clamp(13px,1.3vw,17px)]" style={{ color: g[2] as string }}>{g[0]}</div>
                  <div className="text-[clamp(11px,1.1vw,14px)] text-gray-600 mt-1 leading-snug">{g[1] || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </Frame>
      );

    // 8 — 3sides (hub & spoke)
    out.push(
      <div className="h-full flex flex-col px-[6vw] py-[6vh] bg-cito-blue text-white">
        <div className="shrink-0"><Eyebrow dark>Samenwerking · met 3sides</Eyebrow><h2 className="text-[clamp(24px,3.2vw,42px)] font-bold">3sides — jullie executiepartner</h2></div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <svg viewBox="0 0 1000 480" className="w-full h-auto max-w-5xl" style={{ maxHeight: "62vh" }}>
            {SIDES.map((_, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; const cx = 500 + Math.cos(a) * 320, cy = 240 + Math.sin(a) * 185; return <line key={"s" + i} x1={500} y1={240} x2={cx} y2={cy} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />; })}
            <circle cx={500} cy={240} r={92} fill="#fff" />
            <text x={500} y={234} textAnchor="middle" fontSize={30} fontWeight={800} fill={CITO}>3sides</text>
            <text x={500} y={262} textAnchor="middle" fontSize={13} fill={MINT}>senior + medior</text>
            {SIDES.map((t, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; const cx = 500 + Math.cos(a) * 320, cy = 240 + Math.sin(a) * 185; return (
              <g key={i}>
                <rect x={cx - 130} y={cy - 26} width={260} height={52} rx={26} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" />
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={600} fill="#fff">{t}</text>
              </g>
            ); })}
          </svg>
        </div>
        <div className="text-[clamp(12px,1.2vw,15px)] text-teal-200 text-center">Senior (~3 d/wk) + medior (~2 d/wk) · specialisten op afroep.</div>
      </div>
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
