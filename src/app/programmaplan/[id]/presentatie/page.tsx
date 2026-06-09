"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { ProgrammaplanDocument } from "@/components/steps/ExportStep";

/**
 * Presentatie-modus van het programmaplan.
 * Hergebruikt EXACT dezelfde rendering als de leesmodus (ProgrammaplanDocument),
 * maar presenteert die als full-screen "slides" met pijltjes-navigatie.
 * Elke hoofdstuk-sectie en subparagraaf (data-scope-id) is een navigatiepunt.
 */
export default function PresentatiePage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<DINSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [count, setCount] = useState(1);

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
      .catch(() => {
        if (!cancelled) setError("Programmaplan kon niet geladen worden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Alle navigatiepunten: titelpagina (top) + elke hoofdstuk-/paragraaf-sectie
  const getTargets = useCallback((): HTMLElement[] => {
    const root = scrollRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-scope-id]"));
  }, []);

  // Huidige positie bijhouden tijdens scrollen
  useEffect(() => {
    if (!session) return;
    const root = scrollRef.current;
    if (!root) return;
    const update = () => {
      const t = getTargets();
      setCount(t.length + 1); // +1 voor titelpagina
      const threshold = root.scrollTop + root.clientHeight * 0.3;
      let cur = 0; // 0 = titelpagina
      t.forEach((el, i) => {
        if (el.offsetTop <= threshold) cur = i + 1;
      });
      setPos(cur);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [session, getTargets]);

  const goTo = useCallback(
    (index: number) => {
      const root = scrollRef.current;
      if (!root) return;
      const t = getTargets();
      const clamped = Math.max(0, Math.min(t.length, index));
      if (clamped === 0) {
        root.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        t[clamped - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [getTargets]
  );

  const go = useCallback((dir: number) => goTo(pos + dir), [pos, goTo]);

  const toggleFullscreen = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(getTargets().length);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, goTo, getTargets, toggleFullscreen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-300">Presentatie laden…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md text-center bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h1 className="text-lg font-bold text-gray-800 mb-2">Programmaplan niet gevonden</h1>
          <p className="text-sm text-gray-600">{error ?? "De link is mogelijk verlopen."}</p>
        </div>
      </div>
    );
  }

  const progress = count > 1 ? (pos / (count - 1)) * 100 : 0;

  return (
    <div ref={scrollRef} className="pres-scroll">
      <style>{`
        .pres-scroll{height:100vh;overflow-y:auto;scroll-snap-type:y proximity;scroll-behavior:smooth;background:#e9ecf3;}
        .pres-scroll [data-scope-type="chapter"]{scroll-snap-align:start;scroll-margin-top:0;}
        .pres-scroll [data-scope-type="paragraph"]{scroll-snap-align:start;}
        .pres-scroll .comment-marker-host{display:none !important;}
        .pres-scroll::-webkit-scrollbar{width:0;height:0;}
        .pres-scroll{scrollbar-width:none;}
      `}</style>

      {/* Document — zelfde rendering als leesmodus */}
      <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-xl">
        <ProgrammaplanDocument session={session} />
      </div>

      {/* Voortgangsbalk */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-black/10 z-50">
        <div
          className="h-full bg-cito-blue transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Navigatie-chrome */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg border border-gray-200 px-2 py-1.5">
        <button
          onClick={() => go(-1)}
          disabled={pos === 0}
          className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg"
          aria-label="Vorige"
        >
          ‹
        </button>
        <span className="text-xs font-semibold text-gray-600 tabular-nums px-1 min-w-[44px] text-center">
          {pos + 1} / {count}
        </span>
        <button
          onClick={() => go(1)}
          disabled={pos >= count - 1}
          className="w-9 h-9 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 disabled:opacity-30 text-lg"
          aria-label="Volgende"
        >
          ›
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={toggleFullscreen}
          className="h-9 px-3 grid place-items-center rounded-full text-cito-blue hover:bg-cito-blue/10 text-xs font-semibold"
          title="Volledig scherm (F)"
        >
          ⤢ Full-screen
        </button>
      </div>

      {/* Subtiele hint */}
      <div className="fixed bottom-6 right-6 z-40 text-[11px] text-gray-500 select-none">
        ← → navigeren · F volledig scherm
      </div>
    </div>
  );
}
