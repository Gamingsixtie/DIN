"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { ProgrammaplanDocument } from "@/components/steps/ExportStep";
import CommentSidebar from "@/components/programmaplan/CommentSidebar";
import { loadComments, type ProgrammaplanComment } from "@/lib/comments";

// Inhoudsopgave-structuur — synchroon met ProgrammaplanDocument hoofdstukken
const TOC: Array<{ id: string; nummer: string; titel: string; sub?: Array<{ id: string; titel: string }> }> = [
  { id: "hoofdstuk-1", nummer: "1.", titel: "Programmavisie en scope" },
  { id: "hoofdstuk-2", nummer: "2.", titel: "Programmadoelen" },
  {
    id: "hoofdstuk-3",
    nummer: "3.",
    titel: "Cross-sectorale uitkomst — de kern",
    sub: [
      { id: "3-1-batenprofielen", titel: "3.1 Batenprofielen" },
      { id: "3-2-vermogensprofielen", titel: "3.2 Vermogensprofielen" },
      { id: "3-3-inspanningsleiders-per-domein", titel: "3.3 Eigenaar en inspanningsleider per domein" },
      { id: "3-4-veranderstrategie", titel: "3.4 Veranderstrategie" },
    ],
  },
  {
    id: "hoofdstuk-4",
    nummer: "4.",
    titel: "Raming",
    sub: [
      { id: "4-1-raming-out-of-pocket-kosten", titel: "4.1 Out-of-pocket kosten" },
      { id: "4-2-interne-uren", titel: "4.2 Interne uren" },
      { id: "4-3-totaaloverzicht-vier-scenario-s", titel: "4.3 Totaaloverzicht — vier scenario's" },
    ],
  },
  { id: "hoofdstuk-5", nummer: "5.", titel: "Programma-organisatie en RASCI" },
  { id: "hoofdstuk-6", nummer: "6.", titel: "Planning en roadmap" },
  { id: "bijlage-a-audit-begroting", nummer: "A.", titel: "Bijlage A — Audit van de begroting" },
];

export default function PubliekProgrammaplanPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<DINSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [comments, setComments] = useState<ProgrammaplanComment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [preselectedScope, setPreselectedScope] = useState<{ type: "chapter" | "paragraph"; id: string; label: string } | null>(null);

  // Vlakke lijst van alle anchor-id's uit de TOC, voor IntersectionObserver
  const allAnchors = useMemo(
    () => TOC.flatMap((t) => [t.id, ...(t.sub?.map((s) => s.id) ?? [])]),
    []
  );

  // Scope-opties voor de comment-form (hoofdstukken + subparagrafen uit TOC)
  const scopeOptions = useMemo(() => {
    const out: Array<{ type: "chapter" | "paragraph"; id: string; label: string }> = [];
    for (const t of TOC) {
      out.push({ type: "chapter", id: t.id, label: `${t.nummer} ${t.titel}` });
      for (const s of t.sub ?? []) {
        out.push({ type: "paragraph", id: s.id, label: s.titel });
      }
    }
    return out;
  }, []);

  const refreshComments = useCallback(async () => {
    if (!id) return;
    const list = await loadComments(id);
    setComments(list);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    loadSessionFromSupabase(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          setError("Programmaplan niet gevonden of niet meer beschikbaar.");
        } else {
          setSession(s);
        }
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

  // Comments laden zodra sessie binnen is — plus periodieke polling zodat
  // aanmerkingen van andere lezers automatisch verschijnen zonder pagina-refresh.
  useEffect(() => {
    if (!session || !id) return;
    refreshComments();
    const interval = setInterval(() => {
      refreshComments();
    }, 15000); // 15 sec polling
    return () => clearInterval(interval);
  }, [session, id, refreshComments]);

  // Refresh ook bij focus/visibility-change — zodat de gebruiker direct de
  // laatste stand ziet wanneer hij van tab terugschakelt.
  useEffect(() => {
    if (!session || !id) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshComments();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, id, refreshComments]);

  // Aantal open comments per scope-id (voor markers naast hoofdstukken/paragrafen)
  const commentCounts = useMemo(() => {
    const map = new Map<string, { open: number; total: number }>();
    for (const c of comments) {
      const cur = map.get(c.scopeId) ?? { open: 0, total: 0 };
      cur.total += 1;
      if (c.status === "open") cur.open += 1;
      map.set(c.scopeId, cur);
    }
    return map;
  }, [comments]);

  // Plaats marker-knoppen naast elk hoofdstuk en elke subparagraaf
  useEffect(() => {
    if (!session) return;
    const els = document.querySelectorAll<HTMLElement>("[data-scope-id]");
    const cleanup: Array<() => void> = [];
    els.forEach((el) => {
      const scopeId = el.getAttribute("data-scope-id");
      const scopeType = el.getAttribute("data-scope-type") as "chapter" | "paragraph" | null;
      const scopeLabel = el.getAttribute("data-scope-label") ?? scopeId ?? "";
      if (!scopeId || !scopeType) return;

      // Verwijder bestaande marker (bij re-render)
      const existing = el.querySelector(":scope > .comment-marker-host");
      if (existing) existing.remove();

      const counts = commentCounts.get(scopeId);
      const host = document.createElement("div");
      host.className = "comment-marker-host absolute top-3 right-3 print:hidden";
      host.style.position = "absolute";
      host.style.top = "12px";
      host.style.right = "12px";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-full border transition-colors ${
        counts && counts.open > 0
          ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
          : "bg-white/80 border-gray-200 text-gray-500 hover:bg-cito-blue/5 hover:text-cito-blue hover:border-cito-blue/30"
      }`;
      btn.title = counts
        ? `${counts.open} open · ${counts.total} totaal — klik om opmerking te plaatsen of te bekijken`
        : "Plaats opmerking op dit onderdeel";
      btn.innerHTML = counts && counts.total > 0
        ? `<span>💬</span><span>${counts.open}/${counts.total}</span>`
        : `<span>💬</span><span>Opmerking</span>`;
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreselectedScope({ type: scopeType, id: scopeId, label: scopeLabel });
        setSidebarOpen(true);
      };

      host.appendChild(btn);
      // Zorg dat de section position:relative is zodat absolute marker correct positioneert
      const computed = window.getComputedStyle(el);
      if (computed.position === "static") {
        el.style.position = "relative";
      }
      el.appendChild(host);

      cleanup.push(() => host.remove());
    });
    return () => cleanup.forEach((fn) => fn());
  }, [session, commentCounts]);

  // Scrollprogress — dunne balk bovenaan
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.max(0, (h.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Actieve sectie-highlight in de TOC via IntersectionObserver
  useEffect(() => {
    if (!session) return;
    const elements = allAnchors
      .map((anc) => document.getElementById(anc))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pak het hoogst-zichtbare element dat in de "leesband" staat
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveAnchor(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [session, allAnchors]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-cito-blue/20 border-t-cito-blue rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Programmaplan laden…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="text-cito-blue/60 mb-3">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Programmaplan niet gevonden</h1>
          <p className="text-sm text-gray-600">{error ?? "De gedeelde link is mogelijk verlopen of het programmaplan is verwijderd."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      {/* Scroll-progress balk — alleen op scherm, niet in print */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 z-50 print:hidden">
        <div
          className="h-full bg-cito-blue transition-[width] duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 print:max-w-none print:px-0">
        {/* Read-only header — verbergen bij print */}
        <header className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-center justify-between print:hidden">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-cito-blue/70 font-bold mb-0.5">
              Programmaplan — leesversie
            </div>
            <h1 className="text-base font-bold text-cito-blue">{session.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPreselectedScope(null);
                setSidebarOpen(true);
              }}
              className="px-4 py-2 bg-white border border-cito-blue text-cito-blue rounded-lg text-sm font-medium hover:bg-cito-blue/5 transition-colors flex items-center gap-2"
            >
              💬 Aanmerkingen
              {comments.filter((c) => c.status === "open").length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {comments.filter((c) => c.status === "open").length}
                </span>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors"
            >
              Printen / opslaan als PDF
            </button>
          </div>
        </header>

        {/* Layout met sticky inhoudsopgave-zijbalk */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 print:block print:gap-0">
          {/* Inhoudsopgave — verbergen bij print */}
          <aside className="print:hidden lg:sticky lg:top-6 lg:self-start">
            <nav className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-cito-blue/70 font-bold mb-3">
                Inhoudsopgave
              </div>
              <ol className="space-y-1.5">
                {TOC.map((item) => {
                  const isActive = activeAnchor === item.id;
                  // Hoofdstuk-item is óók actief wanneer een subparagraaf ervan in beeld is
                  const subActive = !!item.sub?.some((s) => s.id === activeAnchor);
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`block text-sm -mx-2 px-2 py-1 rounded transition-colors ${
                          isActive
                            ? "bg-cito-blue/10 text-cito-blue font-semibold"
                            : subActive
                            ? "text-cito-blue"
                            : "text-gray-700 hover:text-cito-blue hover:bg-cito-blue/5"
                        }`}
                      >
                        <span className="font-semibold text-cito-blue tabular-nums mr-1">{item.nummer}</span>
                        {item.titel}
                      </a>
                      {item.sub && (
                        <ol className="mt-1 ml-3 space-y-0.5 border-l border-cito-blue/15 pl-2">
                          {item.sub.map((s) => {
                            const subIsActive = activeAnchor === s.id;
                            return (
                              <li key={s.id}>
                                <a
                                  href={`#${s.id}`}
                                  className={`block text-xs -mx-1 px-1 py-0.5 rounded transition-colors ${
                                    subIsActive
                                      ? "bg-cito-blue/10 text-cito-blue font-semibold"
                                      : "text-gray-600 hover:text-cito-blue hover:bg-cito-blue/5"
                                  }`}
                                >
                                  {s.titel}
                                </a>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-snug">
                Klik een hoofdstuk aan om er direct heen te springen.
              </div>
            </nav>
          </aside>

          {/* Document zelf */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none min-w-0">
            <ProgrammaplanDocument session={session} />
          </div>
        </div>

        {/* Footer — verbergen bij print */}
        <footer className="mt-6 text-center text-xs text-gray-400 print:hidden">
          Dit is een leesversie van het programmaplan. Voor wijzigingen — neem contact op met de programmaeigenaar.
        </footer>
      </div>

      {/* Aanmerkingen-sidebar — Word-style comments */}
      <CommentSidebar
        sessionId={id}
        comments={comments}
        onCommentsChange={refreshComments}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        scopeOptions={scopeOptions}
        preselectedScope={preselectedScope}
        onPreselectionConsumed={() => setPreselectedScope(null)}
      />
    </div>
  );
}
