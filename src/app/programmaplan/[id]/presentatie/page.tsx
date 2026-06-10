"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { OrganigramView } from "@/components/steps/GovernanceStep";

/** Presentatie-modus — opmaak: gekleurde kopbalk + witte body met platte, kleurrijke kaarten. */

const CITO = "#003366", TEAL = "#159a86", ORANGE = "#ee7a1a", GREEN = "#7bc043";
const NAVY = "#1b3a5b", PANEL = "#eef1f6", INK = "#243244", SUB = "#6b7a8d";
const SECTORS = [
  { key: "PO", color: "#7c5cd6" },
  { key: "VO", color: "#10b981" },
  { key: "Zakelijk", color: "#0e9e8e" },
] as const;
const VISIE_PIJLERS = [
  ["Outside-in leidend", "wat klanten werkelijk nodig hebben"],
  ["Vier domeinen verbonden", "mens · proces · systeem · cultuur"],
  ["Samen met klanten", "echte oplossingen, duurzame relaties"],
];
// Inspanningen per domein — cross-sectorale bundel + gebundelde inspanningen + investering (verslag §3/§4).
const INSP_DETAIL: Array<{ label: string; color: string; titel: string; bullets: string[]; bedrag: string; aandeel: string }> = [
  { label: "Mens", color: "#2563eb", titel: "Gespreksvaardigheidstraining outside-in voor alle sectoren", bullets: ["Trainen in klantgerichte gespreksvaardigheden", "Werven & ontwikkelen van outside-in competenties", "Klantgerichte rollen en samenwerking verankeren"], bedrag: "€ 182.500", aandeel: "~13%" },
  { label: "Processen", color: "#059669", titel: "Uniforme klantinformatieprocessen & funnelgovernance", bullets: ["Klantinformatieprocessen standaardiseren & borgen, organisatiebreed", "Commerciële werkafspraken, rollen & KPI-structuur standaardiseren"], bedrag: "€ 126.000", aandeel: "~9%" },
  { label: "Data & Systemen", color: "#7c3aed", titel: "Integraal CRM-klantdashboard cross-sectoraal", bullets: ["Implementeren en inrichten van integraal CRM-klantdashboard", "Eén centrale bron voor klantdata en inzichten"], bedrag: "€ 910.000", aandeel: "grootste post" },
  { label: "Cultuur", color: "#d97706", titel: "Leiderschapsprogramma outside-in verankeren", bullets: ["Outside-in leiderschap als rolmodelgedrag", "Outside-in mindset & klantgericht eigenaarschap", "Eigenaarschap & teamcultuur binnen commercieel team"], bedrag: "€ 142.000", aandeel: "~10%" },
];
const SIDES_DOEN = [
  ["Programmamanagement & regie", "Interim leiding · voortgang & tempo · escalatie · sectoren verbinden"],
  ["Adoptie & gedragsverandering", "Adoptie-framework per rol · competentiematrix · nulmeting · borging"],
  ["Customer Success", "Eén samenhangende klantreis · proactieve contactmomenten · feedback loops"],
  ["CRM & data", "Advies CRM-strategie & -keuze · koppeling Mailion/Microspace · data → actie"],
  ["Leiderschap & organisatie", "Voorbeeldgedrag · werving · profielen aanscherpen"],
  ["Kennisdeling & verbinding", "Kennisdeling tussen sectoren · intervisie · successen tonen"],
];
const SIDES_KERN: Array<[string, string, string]> = [
  ["Expertise voor ieder domein", "Snel schakelen — parallel werken aan mens · proces · data · cultuur", TEAL],
  ["Learnings uit Klant in Beeld", "De inzichten en het geleerde nemen we mee", NAVY],
  ["Prioriteit op het nú", "Sales · funnel · accountplannen · verkoopkansen — ongeacht de systeemkeuze; plus de langere-termijn doelen", ORANGE],
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

interface StepShape {
  stap2?: { vermogenGelijkenisGroepen?: Array<{ gezamenlijkeOmschrijving?: string }> };
  stap4?: { subEffortAnalysis?: Array<{ actie?: string; domein?: string; titel?: string; voorgesteldeNaam?: string }> };
}
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
    const caps = ((session.capabilities ?? []) as Array<{ title?: string; description?: string; sectorId?: string; consolidated?: boolean }>).filter((c) => !c.consolidated);
    const po = session.programmaorganisatie;
    const baatPerSector = SECTORS.map((s) => { const b = benefits.find((x) => x.sectorId === s.key); return { ...s, titel: b ? b.title || b.description || "" : "" }; });
    const vermPerSector = SECTORS.map((s) => { const c = caps.find((x) => x.sectorId === s.key); return { ...s, titel: c ? c.title || c.description || "" : "" }; });
    const hefboom = sr?.stap2?.vermogenGelijkenisGroepen?.[0]?.gezamenlijkeOmschrijving || "";
    const maxPost = Math.max(...RAMING_POST.map((p) => p[1]));

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
          <div className="text-[clamp(11px,1.3vw,16px)] tracking-[0.44em] uppercase font-semibold text-slate-400 mb-7">Doelen-Inspanningennetwerk</div>
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
          <div className="grid grid-cols-3 gap-4 mt-9">
            {VISIE_PIJLERS.map(([t, d]) => (<div key={t} className="rounded-2xl p-5 border-t-4" style={{ background: PANEL, borderTopColor: TEAL }}><div className="font-bold text-[clamp(14px,1.5vw,19px)]" style={{ color: INK }}>{t}</div><div className="text-[clamp(12px,1.2vw,15px)] mt-1" style={{ color: SUB }}>{d}</div></div>))}
          </div>
        </div>
      </Slide>
    );

    // 3 — Programmadoelen (focus doel 1)
    out.push(
      <Slide title="De gezamenlijke doelen — één focus: doel 1">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
          <div className="rounded-3xl text-white p-7 shadow-xl relative overflow-hidden" style={{ background: CITO }}>
            <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full border border-white/10" />
            <div className="flex items-start gap-6 relative">
              <span className="font-extrabold leading-none" style={{ fontSize: "clamp(56px,9vh,108px)" }}>1</span>
              <div className="flex-1">
                <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ background: GREEN, color: "#173a0a" }}>FOCUS — hiermee beginnen we</span>
                <div className="font-bold leading-tight mt-2.5" style={{ fontSize: "clamp(20px,2.7vw,36px)" }}>{goals[0]?.title || goals[0]?.name}</div>
                <div className="text-white/75 mt-2.5 text-[clamp(13px,1.3vw,18px)]">Eén betrouwbaar klantbeeld · proactief handelen mogelijk</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((n) => (<div key={n} className="rounded-2xl border border-gray-200 p-4 flex items-start gap-3" style={{ background: PANEL }}><span className="text-3xl font-bold text-gray-300 leading-none">{n + 1}</span><div className="font-semibold leading-snug text-[clamp(13px,1.3vw,17px)]" style={{ color: SUB }}>{goals[n]?.title || goals[n]?.name}</div></div>))}
          </div>
          <div className="text-[clamp(12px,1.2vw,15px)] flex items-start gap-2.5" style={{ color: SUB }}><span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} /><span>De focus op doel 1 is samen met het <strong style={{ color: INK }}>MT bepaald</strong>. Doel 2 en 3 volgen gaandeweg, cyclisch.</span></div>
        </div>
      </Slide>
    );

    // 4 — Cross-sectorale uitkomst (oorspronkelijke schema)
    out.push(
      <Slide title="Cross-sectorale uitkomst — geconsolideerd vanuit de DIN">
        <div className="w-full max-w-5xl mx-auto">
          <div className="rounded-xl text-white px-5 py-2 text-center" style={{ background: NAVY }}>
            <div className="text-[9px] uppercase tracking-wider opacity-70 font-bold">Focusdoel — prioriteit 1</div>
            <div className="font-bold text-[clamp(13px,1.5vw,19px)] leading-snug">{goals[0]?.title}</div>
          </div>
          <div className="flex justify-center"><div className="w-0.5 h-3" style={{ background: "#cbd5e1" }} /></div>
          <div className="text-center text-[9px] uppercase tracking-wider font-bold mb-1.5" style={{ color: SUB }}>Baten per sector</div>
          <div className="grid grid-cols-3 gap-3">
            {baatPerSector.map((b) => (<div key={b.key} className="rounded-lg bg-white p-2.5 shadow-sm border-l-4" style={{ borderLeftColor: b.color }}><span className="text-[10px] font-bold" style={{ color: b.color }}>{b.key}</span><div className="text-[clamp(11px,1.1vw,14px)] leading-snug" style={{ color: INK }}>{b.titel}</div></div>))}
          </div>
          <div className="flex justify-center"><div className="w-0.5 h-3 mt-2" style={{ background: "#cbd5e1" }} /></div>
          <div className="rounded-xl p-3.5 mt-1" style={{ background: "#e9faf4", border: `1px solid ${TEAL}` }}>
            <div className="text-center text-[9px] uppercase tracking-wider font-bold" style={{ color: "#0b7a5c" }}>Gelijkende vermogens — hefboomgroep · dekt 4/4 domeinen</div>
            <div className="text-center text-[clamp(11px,1.1vw,14px)] leading-snug my-2" style={{ color: INK }}>{hefboom}</div>
            <div className="grid grid-cols-3 gap-2">
              {vermPerSector.map((v) => (<div key={v.key} className="rounded-lg bg-white border-2 p-2" style={{ borderColor: v.color }}><span className="text-[9px] font-bold" style={{ color: v.color }}>{v.key}</span><div className="text-[clamp(11px,1.1vw,14px)] font-semibold leading-snug" style={{ color: INK }}>{v.titel}</div></div>))}
            </div>
          </div>
        </div>
      </Slide>
    );

    // 5–8 — De inspanningen, per domein (nadruk)
    INSP_DETAIL.forEach((d) => out.push(
      <Slide key={d.label} title={`De inspanningen — ${d.label}`} headerColor={d.color}>
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-[10px] font-bold text-white rounded-full px-2.5 py-1" style={{ background: d.color }}>Combineren · hefboom — raakt 3 sectoren</span>
            <span className="font-bold tabular-nums text-[clamp(14px,1.5vw,20px)]" style={{ color: d.color }}>{d.bedrag} <span className="font-normal text-[11px]" style={{ color: SUB }}>· {d.aandeel}</span></span>
          </div>
          <div className="font-bold leading-tight text-[clamp(18px,2.2vw,30px)]" style={{ color: INK }}>{d.titel}</div>
          <div className="mt-5 space-y-3">
            {d.bullets.map((b) => (<div key={b} className="flex items-start gap-3"><span className="w-2.5 h-2.5 rounded-full mt-2 shrink-0" style={{ background: d.color }} /><span className="text-[clamp(13px,1.5vw,19px)]" style={{ color: INK }}>{b}</span></div>))}
          </div>
        </div>
      </Slide>
    ));

    // 9 — Raming (vijfjarig scenario, beter toegelicht)
    out.push(
      <Slide title="Raming — vijfjarig scenario (2026–2030)">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div><div className="font-extrabold text-[clamp(28px,4vw,52px)] leading-none" style={{ color: CITO }}>{RAMING_TOTAAL}</div><div className="text-[clamp(12px,1.3vw,16px)] mt-1" style={{ color: SUB }}>totaal · 2026–2030 (5 jaar)</div></div>
            <div className="rounded-xl px-4 py-2 text-right" style={{ background: PANEL }}><div className="font-bold text-[clamp(13px,1.4vw,18px)]" style={{ color: INK }}>Jaarplafond € 300.000</div><div className="text-[clamp(11px,1.1vw,14px)]" style={{ color: SUB }}>2026: € 250.000 (Cito-eis)</div></div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: SUB }}>Per inspanning</div>
              <div className="space-y-2">
                {RAMING_POST.map(([label, bedrag, color]) => (<div key={label} className="flex items-center gap-3"><div className="w-28 text-[clamp(10px,1.1vw,13px)] text-right shrink-0" style={{ color: INK }}>{label}</div><div className="flex-1 h-6 rounded" style={{ background: PANEL }}><div className="h-full rounded flex items-center justify-end pr-2" style={{ width: `${(bedrag / maxPost) * 100}%`, background: color }}><span className="text-[10px] font-bold text-white tabular-nums">{euroK(bedrag)}</span></div></div></div>))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: SUB }}>Per jaar — binnen het plafond</div>
              <div className="flex items-end justify-between gap-2" style={{ height: "clamp(100px,16vh,160px)" }}>
                {RAMING_JAAR.map(([jaar, bedrag]) => (<div key={jaar} className="flex-1 flex flex-col items-center justify-end h-full"><span className="text-[10px] font-bold tabular-nums" style={{ color: CITO }}>{euroK(bedrag)}</span><div className="w-full rounded-t mt-1" style={{ height: `${(bedrag / 330000) * 100}%`, background: CITO }} /><span className="text-[11px] mt-1" style={{ color: SUB }}>{jaar}</span></div>))}
              </div>
            </div>
          </div>
          <div className="rounded-lg p-3 mt-4 text-[clamp(11px,1.1vw,14px)] leading-snug" style={{ background: PANEL, color: SUB }}>
            <strong style={{ color: INK }}>Gefaseerde uitrol:</strong> CRM-bouw &amp; -migratie verspreid over twee jaar, het tweede trainingsblok valt later — daardoor blijft elk jaar binnen het plafond. Vanaf 2030 vooral structureel beheer, intervisie, jaarlijkse cultuurmeting en governance. <strong style={{ color: INK }}>Kritisch voor binnen budget:</strong> externe implementatiepartner · architectuurbesluit · tarieven leiderschapscoaches.
          </div>
        </div>
      </Slide>
    );

    // 10 — Programma-organisatie (1-op-1: app-organigram)
    if (po)
      out.push(
        <Slide title="Programma-organisatie" scroll>
          <div className="w-full max-w-5xl mx-auto"><OrganigramView po={po} /></div>
        </Slide>
      );

    // 11 — Rol van 3sides (waarom + hoe + team)
    out.push(
      <Slide title="Rol van 3sides in het programma" subtitle="Strategisch & executiepartner die de interne capaciteit versterkt" headerColor={NAVY}>
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-bold text-[clamp(14px,1.5vw,19px)] mb-2" style={{ color: CITO }}>Hoe zetten we 3sides in?</div>
              <div className="rounded-2xl p-4 space-y-2" style={{ background: PANEL }}>
                {SIDES_DOEN.map(([t, d]) => (<div key={t} className="flex items-start gap-2.5"><span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} /><div><div className="font-bold text-[clamp(12px,1.2vw,15px)]" style={{ color: INK }}>{t}</div><div className="text-[clamp(10px,1.05vw,13px)] leading-snug" style={{ color: SUB }}>{d}</div></div></div>))}
              </div>
            </div>
            <div>
              <div className="font-bold text-[clamp(14px,1.5vw,19px)] mb-2" style={{ color: CITO }}>Waarom 3sides?</div>
              <div className="space-y-2.5">
                {SIDES_KERN.map(([t, d, c]) => (<div key={t} className="rounded-2xl p-3.5 text-white" style={{ background: c }}><div className="font-bold text-[clamp(13px,1.3vw,17px)]">{t}</div><div className="text-white/85 text-[clamp(11px,1.1vw,14px)] mt-0.5 leading-snug">{d}</div></div>))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl p-3 text-center text-[clamp(11px,1.15vw,15px)]" style={{ background: PANEL, color: SUB }}>
            <strong style={{ color: INK }}>Vast team:</strong> senior consultant (~3 d/wk) + medior (~2 d/wk) · <strong style={{ color: INK }}>specialisten op afroep:</strong> CRM-consultants · solutions architecten · journey designers.
          </div>
        </div>
      </Slide>
    );

    // 12 — 3sides over de vier domeinen
    out.push(
      <Slide title="3sides werkt aan de vier domeinen — tegelijk" subtitle="Gedragsverandering lukt als mens, proces, data én cultuur samen bewegen" headerColor={NAVY}>
        <div className="grid grid-cols-2 gap-4 w-full max-w-5xl mx-auto">
          {SIDES_DOMEIN.map(([label, color, desc]) => (<div key={label} className="rounded-2xl p-5 bg-white border-l-4 shadow-sm" style={{ borderLeftColor: color }}><div className="font-bold text-[clamp(15px,1.7vw,22px)]" style={{ color }}>{label}</div><div className="text-[clamp(12px,1.3vw,16px)] mt-1.5 leading-snug" style={{ color: SUB }}>{desc}</div></div>))}
        </div>
      </Slide>
    );

    // 13 — Next steps
    out.push(
      <Slide title="Next steps" headerColor={TEAL}>
        <div className="w-full max-w-4xl mx-auto flex items-stretch gap-5">
          <div className="flex-1 rounded-2xl p-7 border-t-4" style={{ background: PANEL, borderTopColor: TEAL }}><div className="font-bold text-[clamp(22px,2.6vw,36px)]" style={{ color: CITO }}>Juni</div><div className="mt-3 text-[clamp(13px,1.4vw,18px)]" style={{ color: INK }}>Uitwerking &amp; planning — samen met 3sides</div></div>
          <div className="grid place-items-center text-4xl" style={{ color: SUB }}>→</div>
          <div className="flex-1 rounded-2xl p-7 text-white shadow-xl relative overflow-hidden" style={{ background: CITO }}><div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full border border-white/10" /><div className="font-extrabold text-[clamp(26px,3.4vw,52px)] relative">1 juli</div><div className="mt-3 text-white/80 text-[clamp(13px,1.4vw,18px)] relative">Van start — we gaan aan de slag</div></div>
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
