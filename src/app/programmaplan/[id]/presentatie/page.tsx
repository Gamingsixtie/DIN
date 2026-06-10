"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { OrganigramView } from "@/components/steps/GovernanceStep";

/** Presentatie-modus — opmaak: gekleurde kopbalk + witte body met platte, kleurrijke kaarten. */

const CITO = "#003366", TEAL = "#159a86", GREEN = "#7bc043";
const NAVY = "#1b3a5b", PANEL = "#eef1f6", INK = "#243244", SUB = "#6b7a8d";
const VISIE_PIJLERS = [
  ["Outside-in leidend", "wat klanten werkelijk nodig hebben"],
  ["Vier domeinen verbonden", "mens · proces · systeem · cultuur"],
  ["Samen met klanten", "echte oplossingen, duurzame relaties"],
];
const SECTORS = [
  { key: "PO", color: "#7c5cd6" },
  { key: "VO", color: "#10b981" },
  { key: "Zakelijk", color: "#0e9e8e" },
] as const;
// Inspanningen per domein — cross-sectorale bundel + gebundelde inspanningen + vijf fasen + investering (verslag §3/§4).
const INSP_DETAIL: Array<{ label: string; color: string; titel: string; bullets: string[]; fases: string[]; bedrag: string; aandeel: string; prio?: string }> = [
  { label: "Mens", color: "#2563eb", titel: "Gespreksvaardigheidstraining outside-in voor alle sectoren", bullets: ["Trainen in klantgerichte gespreksvaardigheden", "Werven & ontwikkelen van outside-in competenties", "Klantgerichte rollen en samenwerking verankeren"], fases: ["Behoeftestelling & curriculumontwerp", "Basistraining", "Vaardigheidstraining", "Toepassing in de praktijk", "Borging & nazorg"], bedrag: "€ 182.500", aandeel: "~13%" },
  { label: "Processen", color: "#059669", titel: "Uniforme klantinformatieprocessen & funnelgovernance", bullets: ["Klantinformatieprocessen standaardiseren & borgen, organisatiebreed", "Commerciële werkafspraken, rollen & KPI-structuur standaardiseren"], fases: ["Inventarisatie (as-is)", "Herontwerp (to-be) & pilot", "Uitrol", "Standaardisatie", "Continu verbeteren"], bedrag: "€ 126.000", aandeel: "~9%" },
  { label: "Data & Systemen", color: "#7c3aed", titel: "Integraal CRM-klantdashboard cross-sectoraal", bullets: ["Implementeren en inrichten van integraal CRM-klantdashboard", "Eén centrale bron voor klantdata en inzichten"], fases: ["Analyse & architectuur", "Realisatie & integraties", "Acceptatie & uitrol", "In beheer", "Optimalisatie"], bedrag: "€ 910.000", aandeel: "grootste post", prio: "Quick wins én de uitdagingen van dit moment worden al vanaf fase 1 parallel aangepakt — daarom heeft deze CRM-inspanning prioriteit." },
  { label: "Cultuur", color: "#d97706", titel: "Leiderschapsprogramma outside-in verankeren", bullets: ["Outside-in leiderschap als rolmodelgedrag", "Outside-in mindset & klantgericht eigenaarschap"], fases: ["Bewustwording & coalitievorming", "Acceptatie & rolmodelgedrag", "Adoptie", "Waardenverankering", "Continue rolmodel-werking"], bedrag: "€ 142.000", aandeel: "~10%" },
];
const SIDES_DOMEIN: Array<[string, string, string]> = [
  ["Mens", "#2563eb", "Trainingen mét HR op echte klantcases; coaching & intervisie op de werkvloer."],
  ["Processen", "#059669", "Klantreizen → funnelprocessen met fases, triggers en acties; overlap én differentiatie per sector."],
  ["Data & Systemen", "#7c3aed", "CRM-input vanuit klantperspectief; data om gesprekken en beslissingen te sturen — welke data, welk systeem."],
  ["Cultuur", "#d97706", "Rituelen: klantverhalen, reflectie, klantbezoeken; leiderschap in voorbeeldgedrag; commitment van alle sectormanagers."],
];
const RAMING_TOTAAL = "€ 1.459.500";
const RAMING_POST: Array<[string, number, string]> = [["Data & Systemen", 910000, "#7c3aed"], ["Mens", 182500, "#2563eb"], ["Cultuur", 142000, "#d97706"], ["Processen", 126000, "#059669"], ["Onvoorzien", 99000, "#94a3b8"]];
const RAMING_JAAR: Array<[string, number]> = [["2026", 251500], ["2027", 301500], ["2028", 302500], ["2029", 301500], ["2030", 302500]];
const NET_NODES: Array<[number, number]> = [[1150, 60], [1280, 120], [1360, 210], [1230, 235], [1330, 325], [1095, 175], [1392, 95], [1205, 345], [90, 520], [210, 600], [140, 702], [60, 640], [292, 560], [182, 762], [322, 680], [1352, 560], [1240, 662]];
const NET_LINES: Array<[number, number]> = [[0, 1], [1, 6], [1, 2], [2, 4], [3, 4], [0, 5], [3, 1], [2, 3], [7, 4], [7, 3], [8, 9], [9, 10], [8, 11], [9, 12], [10, 13], [13, 14], [14, 10], [12, 9], [15, 16]];
const NET_ACCENT = new Set([1, 9, 16]);
const euroK = (n: number) => "€ " + Math.round(n / 1000).toLocaleString("nl-NL") + "K";

function Slide({ title, subtitle, headerColor, scroll, children }: { title: string; subtitle?: string; headerColor?: string; scroll?: boolean; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-[5vw] py-[3.4vh] shrink-0" style={{ background: headerColor || CITO }}>
        <h2 className="text-[clamp(21px,2.9vw,38px)] font-bold text-white leading-tight">{title}</h2>
      </div>
      {subtitle && <div className="px-[5vw] pt-3 shrink-0 text-[clamp(13px,1.5vw,20px)] italic font-medium" style={{ color: TEAL }}>{subtitle}</div>}
      <div className={`flex-1 min-h-0 px-[5vw] py-[3.4vh] flex flex-col ${scroll ? "overflow-auto justify-start" : "justify-center"}`}>{children}</div>
    </div>
  );
}

/** Handshake-vector (samenwerking) — twee handen die elkaar grijpen, lijnstijl. */
function HandshakeIcon({ className = "", stroke = "#003366" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 96 64" className={className} role="img" aria-label="samenwerking" fill="none" stroke={stroke} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
      {/* linker onderarm + mouw */}
      <path d="M4 24 l16 -7 l20 13" />
      <path d="M4 40 l13 6" />
      {/* rechter onderarm + mouw */}
      <path d="M92 24 l-16 -7 l-17 11" />
      <path d="M92 40 l-13 6" />
      {/* greep: duim + ineengevouwen vingers */}
      <path d="M40 30 q7 8 15 4" />
      <path d="M44 24 l11 8 q4 3 8 1 l13 -7" />
      <path d="M42 37 l9 6 q3 2 7 0" />
      <path d="M45 44 l6 4 q3 2 6 0" />
    </svg>
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
    const sr = session.crossAnalyseWizard?.stepResults as { stap2?: { vermogenGelijkenisGroepen?: Array<{ gezamenlijkeOmschrijving?: string }> } } | undefined;
    const goals = (session.goals ?? []) as Array<{ title?: string; name?: string }>;
    const benefits = (session.benefits ?? []) as Array<{ title?: string; description?: string; sectorId?: string }>;
    const caps = ((session.capabilities ?? []) as Array<{ title?: string; description?: string; sectorId?: string; consolidated?: boolean }>).filter((c) => !c.consolidated);
    const baatPerSector = SECTORS.map((s) => { const b = benefits.find((x) => x.sectorId === s.key); return { ...s, titel: b ? b.title || b.description || "" : "" }; });
    const vermPerSector = SECTORS.map((s) => { const c = caps.find((x) => x.sectorId === s.key); return { ...s, titel: c ? c.title || c.description || "" : "" }; });
    const hefboom = sr?.stap2?.vermogenGelijkenisGroepen?.[0]?.gezamenlijkeOmschrijving || "";
    const po = session.programmaorganisatie;

    const out: React.ReactNode[] = [];

    // 1 — Titel
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden bg-gradient-to-b from-[#f5f8fc] to-white">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g stroke="#003366" strokeOpacity="0.15" strokeWidth="1.5">{NET_LINES.map(([a, b], i) => (<line key={i} x1={NET_NODES[a][0]} y1={NET_NODES[a][1]} x2={NET_NODES[b][0]} y2={NET_NODES[b][1]} />))}</g>
          {NET_NODES.map(([x, y], i) => { const accent = NET_ACCENT.has(i), hub = i % 4 === 0; return (<circle key={i} cx={x} cy={y} r={accent ? 7 : hub ? 9 : 5} fill={accent ? "#0f9d77" : "#003366"} fillOpacity={accent ? 0.55 : hub ? 0.24 : 0.17} />); })}
        </svg>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(50% 42% at 50% 42%, rgba(255,255,255,0.78), transparent 72%)" }} />
        <div className="relative">
          <div className="text-[clamp(11px,1.3vw,16px)] tracking-[0.3em] uppercase font-semibold text-slate-400 mb-7">Doelen-Inspanningennetwerk</div>
          <h1 className="text-[clamp(56px,9.5vw,132px)] font-extrabold text-cito-blue leading-[0.92] tracking-tight">Programmaplan</h1>
          <p className="text-[clamp(24px,3.8vw,54px)] font-medium mt-5"><span className="text-cito-blue">Klant </span><span className="text-slate-400">in</span><span className="text-cito-blue"> Beeld</span></p>
          <div className="flex items-center justify-center gap-2.5 mt-12"><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /><span className="w-16 h-[3px] bg-cito-blue/25 rounded-full" /><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /></div>
        </div>
      </div>
    );

    // 2 — Visie
    out.push(
      <Slide title="Programmavisie" headerColor={TEAL}>
        <div className="w-full max-w-4xl mx-auto">
          <div className="font-bold leading-tight text-[clamp(22px,3.2vw,44px)]" style={{ color: CITO }}>Van reactief leverancier naar een proactieve, <span style={{ color: TEAL }}>outside-in</span> partner.</div>
          <div className="grid grid-cols-3 gap-5 mt-12">
            {VISIE_PIJLERS.map(([t, d]) => (<div key={t} className="rounded-2xl p-5 border-t-4" style={{ background: PANEL, borderTopColor: TEAL }}><div className="font-bold text-[clamp(14px,1.5vw,19px)]" style={{ color: INK }}>{t}</div><div className="text-[clamp(12px,1.2vw,15px)] mt-1.5 leading-snug" style={{ color: SUB }}>{d}</div></div>))}
          </div>
        </div>
      </Slide>
    );

    // 3 — Programmadoelen (focus doel 1)
    out.push(
      <Slide title="De gezamenlijke doelen — één focus: doel 1">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
          <div className="rounded-3xl text-white p-7 shadow-xl relative overflow-hidden" style={{ background: CITO }}>
            <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full border border-white/10" />
            <div className="flex items-start gap-6 relative">
              <span className="font-extrabold leading-none" style={{ fontSize: "clamp(48px,7.5vh,88px)" }}>1</span>
              <div className="flex-1">
                <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ background: GREEN, color: "#173a0a" }}>FOCUS — hiermee beginnen we</span>
                <div className="font-bold leading-tight mt-2.5" style={{ fontSize: "clamp(20px,2.7vw,36px)" }}>{goals[0]?.title || goals[0]?.name}</div>
                <div className="text-white/75 mt-2.5 text-[clamp(13px,1.3vw,18px)]">Eén betrouwbaar klantbeeld · proactief handelen mogelijk</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((n) => (<div key={n} className="rounded-2xl border border-gray-200 p-4 flex items-start gap-3" style={{ background: PANEL }}><span className="text-2xl font-bold text-gray-300 leading-none">{n + 1}</span><div className="font-semibold leading-snug text-[clamp(13px,1.3vw,17px)]" style={{ color: SUB }}>{goals[n]?.title || goals[n]?.name}</div></div>))}
          </div>
          <div className="rounded-xl p-3 text-[clamp(12px,1.2vw,15px)] flex items-start gap-2.5" style={{ background: PANEL, color: SUB }}><span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} /><span>De focus op doel 1 is samen met het <strong style={{ color: INK }}>MT bepaald</strong>. Doel 2 en 3 volgen gaandeweg, cyclisch.</span></div>
        </div>
      </Slide>
    );

    // 4 — Cross-sectorale uitkomst (volledig schema; inspanningen = titel, toelichting volgt)
    out.push(
      <Slide title="Cross-sectorale uitkomst — het volledige DIN-diagram">
        <div className="w-full max-w-5xl mx-auto">
          <div className="rounded-2xl text-white px-7 py-4 text-center shadow-lg" style={{ background: NAVY }}>
            <div className="text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold" style={{ color: "#9fe6ce" }}>Focusdoel — prioriteit 1</div>
            <div className="font-bold text-[clamp(18px,2.3vw,30px)] leading-snug mt-0.5">{goals[0]?.title}</div>
          </div>
          <div className="text-center text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold mt-4 mb-2" style={{ color: SUB }}>Baten per sector</div>
          <div className="grid grid-cols-3 gap-3">
            {baatPerSector.map((b) => (<div key={b.key} className="rounded-xl bg-white p-3 shadow-sm border-l-4" style={{ borderLeftColor: b.color }}><span className="text-[clamp(11px,1.2vw,14px)] font-bold" style={{ color: b.color }}>{b.key}</span><div className="text-[clamp(13px,1.45vw,17px)] leading-snug line-clamp-2 mt-0.5" style={{ color: INK }}>{b.titel}</div></div>))}
          </div>
          <div className="rounded-2xl p-3.5 mt-4" style={{ background: "#e9faf4", border: `1px solid ${TEAL}` }}>
            <div className="text-center text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold" style={{ color: "#0b7a5c" }}>Gedeelde vermogens — hefboomgroep · dekt 4/4 domeinen</div>
            <div className="text-center text-[clamp(13px,1.4vw,17px)] leading-snug my-2 max-w-3xl mx-auto line-clamp-2" style={{ color: INK }}>{hefboom}</div>
            <div className="grid grid-cols-3 gap-2.5">
              {vermPerSector.map((v) => (<div key={v.key} className="rounded-lg bg-white border p-2" style={{ borderColor: v.color }}><span className="text-[clamp(10px,1.1vw,13px)] font-bold" style={{ color: v.color }}>{v.key}</span><div className="text-[clamp(12px,1.3vw,15px)] font-semibold leading-snug line-clamp-2" style={{ color: INK }}>{v.titel}</div></div>))}
            </div>
          </div>
          <div className="text-center mt-4 mb-2"><span className="text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold" style={{ color: SUB }}>Cross-sectorale inspanningen</span> <span className="text-[clamp(11px,1.2vw,14px)] italic" style={{ color: SUB }}>— toelichting per inspanning volgt hierna</span></div>
          <div className="grid grid-cols-4 gap-2.5">
            {INSP_DETAIL.map((d) => (<div key={d.label} className="rounded-xl p-3 text-white" style={{ background: d.color }}><div className="text-[clamp(11px,1.15vw,13px)] font-bold uppercase opacity-85">{d.label}</div><div className="text-[clamp(12px,1.3vw,15px)] leading-snug line-clamp-2 mt-0.5">{d.titel}</div></div>))}
          </div>
        </div>
      </Slide>
    );

    // 5–8 — De inspanningen, per domein (power slide: hero + kaarten + fase-journey)
    INSP_DETAIL.forEach((d, di) => out.push(
      <Slide key={d.label} title={`Inspanning ${di + 1} van 4 — ${d.label}`} headerColor={d.color}>
        <div className="w-full max-w-5xl mx-auto">
          {/* Hero: titel + prominente investering */}
          <div className="flex items-stretch gap-4">
            <div className="flex-1 rounded-2xl bg-white border-l-[7px] shadow-sm p-5" style={{ borderLeftColor: d.color }}>
              <div className="inline-flex items-center gap-1.5 text-[clamp(10px,1.05vw,12px)] font-bold uppercase tracking-wider rounded-full px-3 py-1 mb-2.5" style={{ background: d.color + "18", color: d.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />Cross-sectorale hefboom · combineren</div>
              <div className="font-extrabold leading-tight text-[clamp(19px,2.4vw,32px)]" style={{ color: INK }}>{d.titel}</div>
            </div>
            <div className="w-[26%] shrink-0 rounded-2xl text-white p-4 flex flex-col items-center justify-center text-center shadow-lg" style={{ background: d.color }}>
              <div className="text-[clamp(10px,1.05vw,12px)] uppercase tracking-wider font-bold opacity-85">Investering</div>
              <div className="font-extrabold tabular-nums leading-none mt-1.5 text-[clamp(24px,3.2vw,42px)]">{d.bedrag}</div>
              <div className="text-[clamp(11px,1.15vw,14px)] opacity-90 mt-1.5">{d.aandeel} van totaal</div>
            </div>
          </div>
          {/* Wat bouwen we — kaarten */}
          <div className="mt-5">
            <div className="text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold mb-2.5" style={{ color: SUB }}>Wat bouwen we?</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${d.bullets.length}, minmax(0,1fr))` }}>
              {d.bullets.map((b) => (
                <div key={b} className="rounded-xl bg-white border shadow-sm p-4" style={{ borderColor: d.color + "33" }}>
                  <span className="w-8 h-8 rounded-lg grid place-items-center mb-2.5" style={{ background: d.color + "18" }}><span className="w-3 h-3 rounded-full" style={{ background: d.color }} /></span>
                  <div className="text-[clamp(13px,1.4vw,17px)] leading-snug font-medium" style={{ color: INK }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Aanpak in vijf fasen — horizontale journey */}
          <div className="mt-6">
            <div className="text-[clamp(11px,1.2vw,14px)] uppercase tracking-wider font-bold mb-3" style={{ color: SUB }}>Aanpak in vijf fasen</div>
            <div className="relative flex items-start justify-between">
              <div className="absolute left-[8%] right-[8%] h-[3px] rounded-full" style={{ background: d.color + "30", top: "17px" }} />
              {d.fases.map((f, i) => (
                <div key={f} className="relative flex-1 flex flex-col items-center text-center px-1.5">
                  <span className="w-9 h-9 rounded-full grid place-items-center text-white text-[clamp(13px,1.4vw,16px)] font-bold shadow" style={{ background: d.color }}>{i + 1}</span>
                  <span className="text-[clamp(11px,1.2vw,14px)] mt-2.5 leading-tight font-medium" style={{ color: INK }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          {d.prio && (
            <div className="mt-5 rounded-xl p-3.5 flex items-start gap-3" style={{ background: d.color + "14", border: `1px solid ${d.color}40` }}>
              <span className="text-[clamp(10px,1.1vw,13px)] font-extrabold text-white rounded-full px-3 py-1 shrink-0 tracking-wide" style={{ background: d.color }}>PRIORITEIT</span>
              <span className="text-[clamp(12px,1.3vw,16px)] leading-snug font-medium" style={{ color: INK }}>{d.prio}</span>
            </div>
          )}
        </div>
      </Slide>
    ));

    // 9 — Raming (+20%-scenario = de 5 jaar) — grote cijfers
    out.push(
      <Slide title="Raming — +20%-scenario over vijf jaar (2026–2030)">
        <div className="w-full max-w-5xl mx-auto">
          {/* Hero: totaal + plafond */}
          <div className="flex items-stretch gap-4 mb-5">
            <div className="flex-1 rounded-2xl text-white p-5 shadow-lg" style={{ background: CITO }}>
              <div className="text-[clamp(12px,1.3vw,16px)] uppercase tracking-wider font-bold opacity-80">Totale investering · vijf jaar</div>
              <div className="font-extrabold tabular-nums leading-none mt-2 text-[clamp(40px,6vw,76px)]">{RAMING_TOTAAL}</div>
              <div className="text-[clamp(13px,1.35vw,17px)] opacity-85 mt-2">het <strong>+20%-scenario</strong> = de vijfjarige horizon</div>
            </div>
            <div className="shrink-0 rounded-2xl px-5 py-4 flex flex-col justify-center" style={{ background: PANEL }}>
              <div className="font-extrabold text-[clamp(22px,2.6vw,34px)] leading-none" style={{ color: INK }}>€ 300.000</div>
              <div className="text-[clamp(12px,1.25vw,15px)] mt-1 font-semibold" style={{ color: SUB }}>jaarplafond</div>
              <div className="text-[clamp(12px,1.25vw,15px)] mt-2 leading-snug" style={{ color: SUB }}>2026 max <strong style={{ color: INK }}>€ 250.000</strong> (Cito-eis)</div>
            </div>
          </div>
          {/* Per jaar — grote balken */}
          <div className="text-[clamp(12px,1.3vw,16px)] uppercase tracking-wider font-bold mb-3" style={{ color: SUB }}>Per jaar — binnen het plafond</div>
          <div className="flex items-end justify-between gap-3.5 mb-5" style={{ height: "clamp(150px,22vh,210px)" }}>
            {RAMING_JAAR.map(([jaar, bedrag]) => (
              <div key={jaar} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="font-extrabold tabular-nums text-[clamp(15px,1.7vw,24px)]" style={{ color: CITO }}>{euroK(bedrag)}</span>
                <div className="w-full rounded-t-lg mt-1.5" style={{ height: `${(bedrag / 360000) * 100}%`, background: `linear-gradient(180deg, ${CITO}, #2c5d8f)` }} />
                <span className="text-[clamp(14px,1.5vw,19px)] font-bold mt-2" style={{ color: INK }}>{jaar}</span>
              </div>
            ))}
          </div>
          {/* Per inspanning — chips met grote bedragen */}
          <div className="grid grid-cols-5 gap-2.5">
            {RAMING_POST.map(([label, bedrag, color]) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: color + "14", border: `1px solid ${color}33` }}>
                <div className="font-extrabold tabular-nums text-[clamp(16px,1.9vw,24px)] leading-none" style={{ color }}>{euroK(bedrag)}</div>
                <div className="text-[clamp(11px,1.2vw,14px)] mt-1.5 leading-tight font-medium" style={{ color: INK }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>
    );

    // 10 — Programma-organisatie (originele app-opmaak, tekst uitvergroot)
    if (po)
      out.push(
        <Slide title="Programma-organisatie">
          <div className="w-full flex items-start justify-center">
            <div className="w-full max-w-5xl origin-top" style={{ transform: "scale(1.1)" }}><OrganigramView po={po} /></div>
          </div>
        </Slide>
      );

    // 11 — De samenwerking met 3sides (power slide: discipline per inspanning)
    out.push(
      <Slide title="De samenwerking met 3sides" headerColor={NAVY}>
        <div className="w-full max-w-5xl mx-auto">
          {/* Samenwerkings-lockup: Cito × 3sides (echte logo's) */}
          <div className="flex items-center justify-center gap-6 sm:gap-9 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cito_logo.jpg" alt="Cito" className="h-[clamp(54px,9vh,82px)] w-auto rounded-xl shadow-sm" />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <HandshakeIcon stroke={TEAL} className="h-[clamp(26px,4.5vh,42px)] w-auto" />
              <span className="text-[clamp(9px,1vw,12px)] uppercase tracking-[0.18em] font-bold" style={{ color: TEAL }}>samenwerking</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/3sides.png" alt="3sides — Strategic Product People" className="h-[clamp(72px,12vh,112px)] w-auto rounded-xl border border-gray-200 shadow-sm" />
          </div>
          {/* Statement */}
          <div className="text-center mb-5">
            <div className="font-extrabold leading-tight text-[clamp(19px,2.6vw,36px)]" style={{ color: CITO }}>Voor élke inspanning de juiste discipline aan tafel</div>
            <div className="text-[clamp(12px,1.35vw,17px)] mt-1.5 max-w-3xl mx-auto" style={{ color: SUB }}>Cito &amp; 3sides als strategisch &amp; executiepartner — verandering lukt als mens, proces, data én cultuur samen bewegen.</div>
          </div>
          {/* Discipline per inspanning */}
          <div className="grid grid-cols-4 gap-3">
            {SIDES_DOMEIN.map(([label, color, desc], i) => (
              <div key={label} className="rounded-2xl bg-white border-t-4 shadow-sm p-4 flex flex-col" style={{ borderTopColor: color }}>
                <div className="text-[clamp(10px,1.05vw,12px)] uppercase tracking-wider font-bold" style={{ color: SUB }}>Inspanning {i + 1}</div>
                <div className="font-bold text-[clamp(15px,1.7vw,21px)] mt-0.5 leading-tight" style={{ color }}>{label}</div>
                <div className="w-9 h-[3px] rounded-full my-2.5" style={{ background: color }} />
                <div className="text-[clamp(11px,1.25vw,15px)] leading-snug" style={{ color: INK }}>{desc}</div>
              </div>
            ))}
          </div>
          {/* Team — specialisten op afroep */}
          <div className="mt-5 rounded-2xl text-white p-4 flex items-center gap-4 shadow-lg" style={{ background: NAVY }}>
            <span className="text-[clamp(13px,1.45vw,19px)] font-extrabold shrink-0">Specialisten op afroep</span>
            <span className="w-px self-stretch bg-white/20" />
            <span className="flex-1 text-[clamp(12px,1.3vw,16px)] leading-snug opacity-90">Inzetbaar afhankelijk van de behoefte op dat moment: <strong className="opacity-100">CRM · solutions architecten · journey designers</strong>.</span>
          </div>
        </div>
      </Slide>
    );

    // 12 — Slotslide: feestelijk, we gaan van START
    const confetti = Array.from({ length: 38 }, (_, i) => ({
      x: (i * 149 + 60) % 1440,
      y: (i * 233 + 40) % 810,
      c: ["#7bc043", "#fb6e6e", "#16c7de", "#ffffff", "#ffd166", "#7c3aed"][i % 6],
      r: (i * 57) % 360,
      w: 9 + (i % 3) * 5,
    }));
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${CITO} 0%, #0c4f86 55%, #0a4a7a 100%)` }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {confetti.map((p, i) => (i % 2 === 0
            ? <rect key={i} x={p.x} y={p.y} width={p.w} height={p.w * 0.5} rx={2} fill={p.c} opacity={0.82} transform={`rotate(${p.r} ${p.x} ${p.y})`} />
            : <circle key={i} cx={p.x} cy={p.y} r={p.w * 0.42} fill={p.c} opacity={0.78} />
          ))}
        </svg>
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 text-[clamp(11px,1.3vw,16px)] tracking-[0.25em] uppercase font-bold text-white/70 mb-6">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} />1 juli 2026 · samen met 3sides
          </div>
          <h1 className="text-[clamp(46px,8.5vw,116px)] font-extrabold text-white leading-[0.95] tracking-tight">We gaan <span style={{ color: GREEN }}>van start!</span></h1>
          <p className="text-[clamp(15px,2.1vw,28px)] text-white/85 mt-6 max-w-3xl mx-auto">Van strategie naar uitvoering — samen maken we Klant in Beeld waar.</p>
          <div className="mt-9 inline-flex items-center gap-4 rounded-full bg-white/10 border border-white/20 px-6 py-3 backdrop-blur">
            <span className="text-[clamp(12px,1.3vw,16px)] text-white/80">Juni — uitwerking &amp; planning</span>
            <span className="text-white/50">→</span>
            <span className="text-[clamp(13px,1.5vw,19px)] font-bold text-white">1 juli — van start 🚀</span>
          </div>
        </div>
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
