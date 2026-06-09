"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession, Stap2Result, Stap4Result, Stap5Result } from "@/lib/types";
import StapSectorVertaling from "@/components/cross-analyse/StapSectorVertaling";
import { OrganigramView } from "@/components/steps/GovernanceStep";

/**
 * Presentatie-modus: de KERN per hoofdstuk als full-screen slides, in EXACT
 * dezelfde opmaak als de leesmodus. Het cross-sectorale schema en het organigram
 * hergebruiken de app-componenten; de overige slides zijn gecureerd uit de sessie.
 */

const SIDES_ACTIVITEITEN: Array<{ t: string; d: string }> = [
  { t: "Programmamanagement & regie", d: "Leiding, voortgang & samenhang; escalatie inrichten; de drie sectoren verbinden." },
  { t: "Adoptie & gedragsverandering", d: "Adoptie-framework per rol, competentiematrix, van training naar borging." },
  { t: "Customer Success", d: "Eén samenhangende klantreis; proactieve contactmomenten; feedback loops." },
  { t: "CRM & data", d: "CRM-strategie & -inrichting; koppelingen; data naar acties en stuurinformatie." },
  { t: "Leiderschap & organisatie", d: "Voorbeeldgedrag, werving, governance Cito BV ↔ Stichting." },
  { t: "Kennisdeling & verbinding", d: "Kennisdeling tussen sectoren; intervisie; successen zichtbaar maken." },
];

function SlideFrame({ nummer, titel, children }: { nummer?: string; titel: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col px-[6vw] py-[5vh] overflow-auto">
      <header className="mb-6 shrink-0">
        <div className="flex items-baseline gap-4 pb-2 border-b-[3px] border-cito-blue">
          {nummer && <span className="text-4xl font-light text-cito-blue/50 tabular-nums leading-none">{nummer}</span>}
          <h1 className="text-3xl font-bold text-cito-blue leading-tight">{titel}</h1>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
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

  const slides = useMemo(() => {
    if (!session) return [];
    const stepResults = session.crossAnalyseWizard?.stepResults as
      | { stap2?: Stap2Result; stap4?: Stap4Result; stap5?: Stap5Result }
      | undefined;
    const goals = session.goals ?? [];
    const visie = (session.vision ?? {}) as { beknopt?: string; uitgebreid?: string };

    // Raming-scenario's uit stap4.begrotingAdvies
    const begroting = (stepResults?.stap4 as unknown as { begrotingAdvies?: { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<{ totaalEuro?: number }> }> } })?.begrotingAdvies;
    const scen = begroting?.scenarios ?? {};
    const scenRows = ([["advies", "Advies"], ["plus20", "+20%"], ["optimaal", "Optimaal"], ["min20", "−20%"]] as const)
      .map(([key, label]) => {
        const sc = scen[key];
        if (!sc) return null;
        const som = (sc.inspanningen ?? []).reduce((a, i) => a + (i.totaalEuro ?? 0), 0);
        return { label, jaren: sc.aantalJaren ?? 0, bedrag: som, focus: key === "plus20" };
      })
      .filter((x) => x != null) as Array<{ label: string; jaren: number; bedrag: number; focus: boolean }>;
    const euro = (n: number) => "€ " + n.toLocaleString("nl-NL");

    const out: Array<{ key: string; node: React.ReactNode; dark?: boolean }> = [];

    // 1 — Titel
    out.push({ key: "titel", dark: true, node: (
      <div className="h-full flex flex-col justify-center px-[7vw] bg-cito-blue text-white">
        <div className="text-sm tracking-[0.35em] font-bold text-white/60 mb-5">CITO DIN · PROGRAMMAPLAN</div>
        <h1 className="text-[clamp(40px,7vw,84px)] font-bold leading-[1.05]">{session.name}</h1>
        <p className="text-[clamp(16px,2.2vw,28px)] text-white/75 mt-5">Recap &amp; vervolg — van strategie naar uitvoering</p>
        <div className="mt-10 text-white/55 text-sm tracking-wide">Cito BV · met 3sides</div>
      </div>
    )});

    // 2 — Visie
    out.push({ key: "visie", node: (
      <SlideFrame nummer="1" titel="Programmavisie">
        <div className="max-w-4xl">
          <p className="text-[clamp(16px,1.8vw,24px)] text-gray-800 leading-relaxed">{visie.beknopt || visie.uitgebreid}</p>
        </div>
      </SlideFrame>
    )});

    // 3 — Doelen
    out.push({ key: "doelen", node: (
      <SlideFrame nummer="2" titel="De gezamenlijke doelstellingen">
        <div className="space-y-4 max-w-5xl">
          {goals.map((g, i) => (
            <div key={(g as { id?: string }).id ?? i} className="flex items-start gap-5 p-5 rounded-xl border border-gray-200 bg-white">
              <span className={`text-4xl font-bold tabular-nums leading-none ${i === 0 ? "text-cito-blue" : "text-emerald-600"}`}>{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">{(g as { title?: string; name?: string }).title || (g as { name?: string }).name}</h3>
                  {i === 0 && <span className="text-[11px] font-bold text-white bg-cito-blue rounded-full px-2.5 py-1">FOCUS</span>}
                </div>
                {(g as { description?: string }).description && (
                  <p className="text-sm text-gray-600 mt-1.5 leading-relaxed line-clamp-3">{(g as { description?: string }).description}</p>
                )}
              </div>
            </div>
          ))}
          <p className="text-sm text-gray-500 italic pt-1">Focus op doel 1; doel 2 en 3 kunnen gaandeweg meelopen.</p>
        </div>
      </SlideFrame>
    )});

    // 4 — Cross-sectoraal schema (app-component, compact)
    out.push({ key: "schema", node: (
      <SlideFrame nummer="3" titel="Cross-sectorale uitkomst — de kern">
        <StapSectorVertaling session={session} result={stepResults?.stap5} stap2Result={stepResults?.stap2} stap4Result={stepResults?.stap4} compact />
      </SlideFrame>
    )});

    // 5 — Raming
    if (scenRows.length > 0) out.push({ key: "raming", node: (
      <SlideFrame nummer="4" titel="Begroting & raming">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 max-w-5xl">
          <div className="space-y-2.5">
            {scenRows.map((r) => (
              <div key={r.label} className={`flex items-center justify-between rounded-lg px-5 py-3 border ${r.focus ? "bg-cito-blue text-white border-cito-blue" : "bg-white border-gray-200"}`}>
                <span className="font-semibold">{r.label}</span>
                <span className={`text-sm ${r.focus ? "text-white/80" : "text-gray-500"}`}>{r.jaren} jaar</span>
                <span className="font-bold tabular-nums text-lg">{euro(r.bedrag)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-w-xs">
            <div className="text-[10px] uppercase tracking-wider text-cito-blue font-bold mb-2">Highlights</div>
            <ul className="text-sm text-gray-700 space-y-2 leading-relaxed list-disc pl-4">
              <li>Out-of-pocket; interne uren staan apart</li>
              <li>Grootste post: CRM-klantdashboard</li>
              <li>Intentie: een 5-jaar horizon (+20%)</li>
            </ul>
          </div>
        </div>
      </SlideFrame>
    )});

    // 6 — Organigram (app-component)
    if (session.programmaorganisatie) out.push({ key: "organisatie", node: (
      <SlideFrame nummer="5" titel="Programma-organisatie">
        <OrganigramView po={session.programmaorganisatie} />
      </SlideFrame>
    )});

    // 7 — 3sides
    out.push({ key: "3sides", node: (
      <SlideFrame titel="Samenwerking met 3sides">
        <div className="max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SIDES_ACTIVITEITEN.map((a) => (
              <div key={a.t} className="p-4 rounded-xl border border-gray-200 bg-white">
                <div className="font-bold text-cito-blue">{a.t}</div>
                <div className="text-sm text-gray-600 mt-1 leading-relaxed">{a.d}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            <strong>Vast team:</strong> senior consultant (~3 d/wk) + medior consultant (~2 d/wk).
            <strong> Specialisten op afroep:</strong> CRM-consultants · solutions architecten · journey designers.
          </p>
        </div>
      </SlideFrame>
    )});

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

  const current = slides[idx];

  return (
    <div ref={rootRef} className="fixed inset-0 bg-gray-100 overflow-hidden">
      {/* Voortgangsbalk */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 z-50">
        <div className="h-full bg-cito-blue transition-[width] duration-300" style={{ width: `${count > 1 ? (idx / (count - 1)) * 100 : 0}%` }} />
      </div>

      {/* Slide */}
      <div className="absolute inset-0 flex items-stretch justify-center p-[2vmin]">
        <div className="w-full max-w-[1500px] bg-white rounded-2xl shadow-2xl overflow-hidden" key={current?.key}>
          {current?.node}
        </div>
      </div>

      {/* Klikzones */}
      <button className="absolute top-0 bottom-0 left-0 w-[12%] z-30 cursor-w-resize" onClick={() => go(-1)} aria-label="Vorige" />
      <button className="absolute top-0 bottom-0 right-0 w-[12%] z-30 cursor-e-resize" onClick={() => go(1)} aria-label="Volgende" />

      {/* Navigatie */}
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
