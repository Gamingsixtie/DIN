"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";

/**
 * Presentatie-modus: gecureerde KERN per onderwerp als full-screen slides.
 * Handgemaakt, één boodschap per slide — geen ingeplakte lees-/analyse-componenten.
 */

const SIDES_ACTIVITEITEN: Array<{ t: string; d: string }> = [
  { t: "Programmamanagement & regie", d: "Leiding, voortgang & samenhang; escalatie; de drie sectoren verbinden." },
  { t: "Adoptie & gedragsverandering", d: "Adoptie-framework per rol; van training naar borging." },
  { t: "Customer Success", d: "Eén klantreis; proactieve contactmomenten; feedback loops." },
  { t: "CRM & data", d: "CRM-strategie & -inrichting; data naar acties en stuurinformatie." },
  { t: "Leiderschap & organisatie", d: "Voorbeeldgedrag, werving, governance Cito BV ↔ Stichting." },
  { t: "Kennisdeling & verbinding", d: "Kennisdeling tussen sectoren; intervisie; successen tonen." },
];

const DOMS = [
  { key: "mens", label: "Mens", color: "#2563eb" },
  { key: "processen", label: "Processen", color: "#059669" },
  { key: "data_systemen", label: "Data & Systemen", color: "#7c3aed" },
  { key: "cultuur", label: "Cultuur", color: "#d97706" },
] as const;

const SECTOR_COLOR: Record<string, string> = { PO: "#7c5cd6", VO: "#10b981", Zakelijk: "#0e9e8e" };
const SECTORS = ["PO", "VO", "Zakelijk"] as const;

interface StepShape {
  stap2?: { vermogenGelijkenisGroepen?: Array<{ gezamenlijkeOmschrijving?: string }> };
  stap4?: {
    subEffortAnalysis?: Array<{ actie?: string; domein?: string; titel?: string; voorgesteldeNaam?: string }>;
    begrotingAdvies?: { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<{ totaalEuro?: number }> }> };
  };
}

const euro = (n: number) => "€ " + n.toLocaleString("nl-NL");

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <div className={`text-[12px] font-bold tracking-[0.22em] uppercase mb-2 ${dark ? "text-teal-200" : "text-teal-600"}`}>{children}</div>;
}

function SlideFrame({ eyebrow, titel, children }: { eyebrow: string; titel: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col px-[7vw] py-[6vh]">
      <div className="shrink-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-[clamp(26px,3.5vw,46px)] font-bold text-cito-blue leading-tight">{titel}</h2>
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-center">{children}</div>
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
      .then((s) => {
        if (cancelled) return;
        if (!s) setError("Programmaplan niet gevonden of niet meer beschikbaar.");
        else setSession(s);
      })
      .catch(() => { if (!cancelled) setError("Programmaplan kon niet geladen worden."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const slides = useMemo<React.ReactNode[]>(() => {
    if (!session) return [];
    const sr = session.crossAnalyseWizard?.stepResults as StepShape | undefined;
    const goals = (session.goals ?? []) as Array<{ title?: string; name?: string }>;
    const benefits = (session.benefits ?? []) as Array<{ title?: string; description?: string; sectorId?: string }>;
    const visie = (session.vision ?? {}) as { beknopt?: string };
    const po = session.programmaorganisatie;

    const focusdoel = goals[0]?.title || goals[0]?.name || "";
    const batenPerSector = SECTORS.map((sec) => {
      const b = benefits.find((x) => x.sectorId === sec);
      return { sector: sec, titel: b ? b.title || b.description || "" : "" };
    }).filter((x) => x.titel);
    const hefboom = sr?.stap2?.vermogenGelijkenisGroepen?.[0]?.gezamenlijkeOmschrijving || "";
    const combineren = (sr?.stap4?.subEffortAnalysis ?? []).filter((s) => s.actie === "combineren");
    const inspPerDomein = DOMS.map((d) => {
      const m = combineren.find((s) => s.domein === d.key);
      return { ...d, titel: m?.titel || m?.voorgesteldeNaam || "" };
    });
    const scenarios = sr?.stap4?.begrotingAdvies?.scenarios ?? {};
    const scenRows = ([["advies", "Advies"], ["plus20", "+20%"], ["optimaal", "Optimaal"], ["min20", "−20%"]] as const).flatMap(
      ([k, label]) => {
        const sc = scenarios[k];
        if (!sc) return [];
        const som = (sc.inspanningen ?? []).reduce((a, i) => a + (i.totaalEuro ?? 0), 0);
        return [{ label, jaren: sc.aantalJaren ?? 0, bedrag: som, focus: k === "plus20" }];
      }
    );
    const namen = (arr?: Array<{ naam?: string }>) => (arr ?? []).map((r) => r.naam).filter(Boolean).join(" · ");

    const out: React.ReactNode[] = [];

    // 1 — Titel
    out.push(
      <div className="h-full flex flex-col justify-center px-[8vw] bg-cito-blue text-white">
        <div className="text-[13px] tracking-[0.35em] font-bold text-white/55 mb-5">CITO DIN · PROGRAMMAPLAN</div>
        <h1 className="text-[clamp(44px,7vw,88px)] font-bold leading-[1.04]">{session.name}</h1>
        <p className="text-[clamp(17px,2.2vw,28px)] text-white/75 mt-5 max-w-3xl">Recap &amp; vervolg — van strategie naar uitvoering</p>
        <div className="mt-10 text-white/50 text-sm tracking-wide">Cito BV · met 3sides</div>
      </div>
    );

    // 2 — Waar staan we
    out.push(
      <SlideFrame eyebrow="Inleiding — waar staan we" titel="Wat we tot nu toe samen deden">
        <div className="space-y-5 max-w-4xl">
          {[
            ["Visie bepaald", "Van reactief leverancier naar proactieve, outside-in partner."],
            ["DIN toegepast", "Samen met de sectormanagers vertaald naar baten, vermogens en inspanningen."],
            ["Netwerk geconsolideerd", "Per doel één samenhangend, cross-sectoraal afgestemd netwerk."],
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-5">
              <span className="text-2xl font-bold text-teal-500 tabular-nums leading-none mt-1">0{i + 1}</span>
              <div>
                <div className="text-[clamp(18px,1.8vw,24px)] font-bold text-gray-900">{s[0]}</div>
                <div className="text-[clamp(14px,1.3vw,18px)] text-gray-600 mt-0.5">{s[1]}</div>
              </div>
            </div>
          ))}
        </div>
      </SlideFrame>
    );

    // 3 — Doelstellingen
    out.push(
      <SlideFrame eyebrow="De gezamenlijke doelstellingen" titel="Drie doelen — focus op doel 1">
        <div className="space-y-5 max-w-4xl">
          {goals.slice(0, 3).map((g, i) => (
            <div key={i} className="flex items-center gap-6">
              <span className={`text-[clamp(36px,4vw,56px)] font-bold tabular-nums leading-none ${i === 0 ? "text-cito-blue" : "text-gray-300"}`}>{i + 1}</span>
              <div className="flex-1 text-[clamp(17px,1.8vw,24px)] font-semibold text-gray-900">{g.title || g.name}</div>
              {i === 0 && <span className="text-[11px] font-bold text-white bg-cito-blue rounded-full px-3 py-1 shrink-0">FOCUS</span>}
            </div>
          ))}
        </div>
      </SlideFrame>
    );

    // 4 — Cross-sectorale kern
    out.push(
      <SlideFrame eyebrow="Cross-sectorale uitkomst — de kern" titel="Eén hefboom voor drie sectoren">
        <div className="max-w-5xl space-y-6">
          {focusdoel && (
            <div className="text-[clamp(13px,1.2vw,16px)] text-gray-500">
              <span className="font-semibold text-cito-blue">Focusdoel:</span> {focusdoel}
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {batenPerSector.map((b) => (
              <div key={b.sector} className="rounded-xl border border-gray-200 bg-white p-4">
                <span className="text-[11px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: SECTOR_COLOR[b.sector] }}>{b.sector}</span>
                <div className="text-[clamp(14px,1.3vw,17px)] font-medium text-gray-900 mt-2.5 leading-snug">{b.titel}</div>
              </div>
            ))}
          </div>
          {hefboom && (
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-1.5">De hefboom — gedeelde vermogens · dekt 4/4 domeinen</div>
              <div className="text-[clamp(15px,1.5vw,20px)] text-gray-800 leading-relaxed">{hefboom}</div>
            </div>
          )}
        </div>
      </SlideFrame>
    );

    // 5 — Inspanningen
    out.push(
      <SlideFrame eyebrow="De inspanningen" titel="Vier domeinen, één keer goed">
        <div className="grid grid-cols-2 gap-5 max-w-5xl">
          {inspPerDomein.map((d) => (
            <div key={d.key} className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
              <span className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ background: d.color }} />
              <div>
                <div className="font-bold text-[clamp(15px,1.4vw,19px)]" style={{ color: d.color }}>{d.label}</div>
                <div className="text-[clamp(14px,1.3vw,17px)] text-gray-800 mt-0.5 leading-snug">{d.titel || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </SlideFrame>
    );

    // 6 — Begroting & raming
    if (scenRows.length > 0)
      out.push(
        <SlideFrame eyebrow="Begroting & raming — out-of-pocket" titel="Het +20%-scenario: een 5-jaar horizon">
          <div className="grid grid-cols-[1fr_auto] gap-8 max-w-5xl items-start">
            <div className="space-y-2.5">
              {scenRows.map((r) => (
                <div key={r.label} className={`flex items-center justify-between rounded-lg px-5 py-3.5 border ${r.focus ? "bg-cito-blue text-white border-cito-blue" : "bg-white border-gray-200"}`}>
                  <span className="font-semibold w-24">{r.label}</span>
                  <span className={`text-sm ${r.focus ? "text-white/70" : "text-gray-500"}`}>{r.jaren} jaar</span>
                  <span className="font-bold tabular-nums text-lg">{euro(r.bedrag)}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 w-64">
              <div className="text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-2.5">Highlights</div>
              <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 leading-relaxed">
                <li>Out-of-pocket; interne uren apart</li>
                <li>Grootste post: CRM-klantdashboard</li>
                <li>Intentie: 5-jaar horizon (+20%)</li>
              </ul>
            </div>
          </div>
        </SlideFrame>
      );

    // 7 — Programma-organisatie (curated organigram)
    if (po)
      out.push(
        <SlideFrame eyebrow="Programma-organisatie" titel="Helder belegd">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex flex-col items-center gap-1.5">
              {[
                ["Opdrachtgever", po.opdrachtgever?.naam, true],
                ["Programmamanager", po.programmamanager?.naam, true],
                ["Kerngroep", "Inspanningsleiders + domeineigenaren", false],
              ].map((n, i) => (
                <div key={i} className="flex flex-col items-center w-full">
                  <div className={`w-72 max-w-full text-center rounded-lg px-4 py-2.5 ${n[2] ? "bg-cito-blue text-white" : "bg-white border border-gray-200"}`}>
                    <div className={`text-[10px] uppercase tracking-wider font-bold ${n[2] ? "text-white/70" : "text-cito-blue"}`}>{n[0]}</div>
                    <div className={`font-semibold ${n[2] ? "text-white" : "text-gray-900"}`}>{n[1]}</div>
                  </div>
                  {i < 2 && <div className="w-0.5 h-4 bg-gray-300" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[
                ["Stuurgroep · besluit", namen(po.stuurgroep), "#003366"],
                ["Adviesgroep · advies", namen(po.adviesgroep), "#d97706"],
              ].map((g, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 border-l-4" style={{ borderLeftColor: g[2] as string }}>
                  <div className="font-bold text-sm" style={{ color: g[2] as string }}>{g[0]}</div>
                  <div className="text-sm text-gray-700 mt-1 leading-snug">{g[1] || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    // 8 — 3sides
    out.push(
      <div className="h-full flex flex-col px-[7vw] py-[6vh] bg-cito-blue text-white">
        <div className="shrink-0">
          <Eyebrow dark>Samenwerking · met 3sides</Eyebrow>
          <h2 className="text-[clamp(26px,3.5vw,46px)] font-bold">Wat 3sides gaat doen</h2>
        </div>
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-3.5 max-w-5xl">
            {SIDES_ACTIVITEITEN.map((a) => (
              <div key={a.t} className="rounded-xl bg-white/10 border border-white/15 p-4">
                <div className="font-bold text-[clamp(14px,1.4vw,18px)]">{a.t}</div>
                <div className="text-[clamp(12px,1.15vw,15px)] text-white/70 mt-1 leading-snug">{a.d}</div>
              </div>
            ))}
          </div>
          <div className="text-[clamp(13px,1.2vw,16px)] text-teal-200 mt-5">
            Vast team: senior consultant (~3 d/wk) + medior (~2 d/wk) · specialisten op afroep.
          </div>
        </div>
      </div>
    );

    return out;
  }, [session]);

  const count = slides.length;
  const go = useCallback((d: number) => setIdx((i) => Math.max(0, Math.min(count - 1, i + d))), [count]);
  const toggleFs = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === "Home") setIdx(0);
      else if (e.key === "End") setIdx(count - 1);
      else if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFs, count]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center"><div className="inline-block w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" /><p className="text-sm text-gray-300">Presentatie laden…</p></div>
      </div>
    );
  }
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md text-center bg-white rounded-xl p-8 shadow"><h1 className="text-lg font-bold text-gray-800 mb-2">Programmaplan niet gevonden</h1><p className="text-sm text-gray-600">{error ?? "De link is mogelijk verlopen."}</p></div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="fixed inset-0 bg-gray-100 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 z-50">
        <div className="h-full bg-cito-blue transition-[width] duration-300" style={{ width: `${count > 1 ? (idx / (count - 1)) * 100 : 0}%` }} />
      </div>

      <div className="absolute inset-0 flex items-stretch justify-center p-[2vmin]">
        <div className="w-full max-w-[1440px] bg-white rounded-2xl shadow-2xl overflow-hidden">{slides[idx]}</div>
      </div>

      <button className="absolute top-0 bottom-0 left-0 w-[12%] z-30 cursor-w-resize" onClick={() => go(-1)} aria-label="Vorige" />
      <button className="absolute top-0 bottom-0 right-0 w-[12%] z-30 cursor-e-resize" onClick={() => go(1)} aria-label="Volgende" />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg border border-gray-200 px-2 py-1.5">
        <button onClick={() => go(-1)} disabled={idx === 0} className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg">‹</button>
        <span className="text-xs font-semibold text-gray-600 tabular-nums px-1 min-w-[44px] text-center">{idx + 1} / {count}</span>
        <button onClick={() => go(1)} disabled={idx >= count - 1} className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg">›</button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button onClick={toggleFs} className="h-9 px-3 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 text-xs font-semibold" title="Volledig scherm (F)">⤢ Full-screen</button>
      </div>
      <div className="absolute bottom-6 right-6 z-40 text-[11px] text-gray-400 select-none">← → navigeren · F volledig scherm</div>
    </div>
  );
}
