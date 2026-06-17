"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Medewerkers-presentatie "Klant in Beeld → Klant in Zicht" — speels, voor alle Cito-medewerkers. */

const CITO = "#003366", TEAL = "#159a86", GREEN = "#7bc043";
const NAVY = "#1b3a5b", PANEL = "#eef1f6", INK = "#243244", SUB = "#6b7a8d";

const AGENDA: Array<[string, string]> = [
  ["Even terugblikken", "wat is Klant in Beeld ook alweer?"],
  ["Groot nieuws ✨", "Klant in Beeld krijgt een nieuwe naam"],
  ["Zo werken we", "één netwerk, vier domeinen"],
  ["Een quizje 🤔", "zijn we er met één domein?"],
  ["Samen met 3sides", "met wie we dit hebben gedaan"],
  ["Op de hoogte blijven", "intranet & bijeenkomsten"],
];

// 4 domeinen in outside-in volgorde: cultuur → mens → data/systemen → processen
const DOMEINEN: Array<{ label: string; color: string; emoji: string; vraag: string; uitleg: string }> = [
  { label: "Cultuur", color: "#d97706", emoji: "🌱", vraag: "Stel: iederéén bij Cito ademt ‘de klant centraal’.", uitleg: "Zonder de juiste vaardigheden, processen én systemen blijft het bij mooie intenties." },
  { label: "Mens", color: "#2563eb", emoji: "🎓", vraag: "Stel: we trainen iedereen tot kampioen klantgesprekken.", uitleg: "Zonder ondersteunende processen, data en een cultuur die het draagt, zakt het zo weer weg." },
  { label: "Data & Systemen", color: "#7c3aed", emoji: "💻", vraag: "Stel: we hebben het mooiste klant-dashboard van Nederland.", uitleg: "Een systeem zonder gedrag, proces en cultuur is… een hele dure database." },
  { label: "Processen", color: "#059669", emoji: "🔄", vraag: "Stel: onze processen staan tot in de puntjes op papier.", uitleg: "Zonder mensen die ze beheersen, data die ze voedt en cultuur die ze draagt, blijft het papier." },
];

// Wat heeft het opgeleverd? — per sector (samenvatting projectgroepen Klant in Beeld)
const OPGELEVERD: Array<{ sector: string; color: string; cijfers: Array<[string, string]>; punten: string[]; betrokkenen: string; foto: string }> = [
  { sector: "Primair Onderwijs", color: "#7c5cd6", cijfers: [["8", "interviews"], ["11", "betrokkenen"], ["3", "klantreizen"], ["2", "proceskaarten"]], punten: ["2 klantreizen van scholen + 1 aparte KVS-klantreis", "2 interne proceskaarten: systemen, data & interne stappen", "Knelpunten, behoeften & kansen → ontwerpcriteria en prioriteiten", "Eerste oplossingsrichtingen mét KPI’s — klaar om te valideren"], betrokkenen: "IB’ers, leerkrachten, beheerders & schoolleiders", foto: "Werksessie PO" },
  { sector: "Voortgezet Onderwijs", color: "#10b981", cijfers: [["9", "interviews"], ["5", "klantreizen"], ["3", "proceskaarten"], ["8", "kansen (HKJ’s)"]], punten: ["5 klantreizen: hoe scholen met onze producten werken én hoe ze dat ervaren", "3 interne proceskaarten: systemen, data & interne stappen", "Knelpunten & kansen → ontwerpcriteria en prioriteiten", "8 belangrijkste kansen (HKJ’s) uitgewerkt tot concrete ideeën"], betrokkenen: "Docenten, kwaliteitsmedewerkers, schoolleiders & leerlingen", foto: "Werksessie VO" },
  { sector: "Professionals", color: "#0e9e8e", cijfers: [["7", "externe interviews"], ["+", "interne interviews"], ["1", "klantreis"]], punten: ["Klantreis van aanvraag tot training — boven én onder de lijn van zichtbaarheid", "Interne interviews: het proces voor klant én Cito helder in beeld", "Knelpunten & kansen → Hoe-Kun-Je’s en ontwerpcriteria", "Ideeën uitgewerkt tot concrete verbeterconcepten — klaar om te valideren"], betrokkenen: "Docenten, opleidingscoördinatoren & examencommissieleden", foto: "Werksessie Professionals" },
];

function Slide({ title, subtitle, headerColor, children }: { title: string; subtitle?: string; headerColor?: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-[5vw] py-[3.4vh] shrink-0" style={{ background: headerColor || CITO }}>
        <h2 className="text-[clamp(21px,2.9vw,38px)] font-bold text-white leading-tight">{title}</h2>
        {subtitle && <div className="text-[clamp(13px,1.5vw,20px)] font-medium text-white/80 mt-1">{subtitle}</div>}
      </div>
      <div className="flex-1 min-h-0 px-[5vw] py-[3.4vh] flex flex-col justify-center">{children}</div>
    </div>
  );
}

export default function MedewerkersPresentatie() {
  const [idx, setIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const slides = useMemo<React.ReactNode[]>(() => {
    const out: React.ReactNode[] = [];

    // 1 — Titel (huidige naam; reveal komt later)
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden bg-gradient-to-b from-[#f5f8fc] to-white">
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: `radial-gradient(${CITO} 1.5px, transparent 1.5px)`, backgroundSize: "26px 26px" }} />
        <div className="relative">
          <div className="text-[clamp(11px,1.3vw,16px)] tracking-[0.3em] uppercase font-semibold text-slate-400 mb-6">Een update voor iedereen bij Cito</div>
          <h1 className="text-[clamp(48px,8vw,108px)] font-extrabold text-cito-blue leading-[0.95] tracking-tight">Klant in Beeld</h1>
          <p className="text-[clamp(16px,2.4vw,30px)] text-slate-500 mt-6">Waar staan we — en wat verandert er? 👀</p>
          <div className="flex items-center justify-center gap-2.5 mt-10"><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /><span className="w-16 h-[3px] bg-cito-blue/25 rounded-full" /><span className="w-1.5 h-1.5 rounded-full bg-cito-blue/40" /></div>
        </div>
      </div>
    );

    // 2 — Voorwoord / agenda
    out.push(
      <Slide title="Waar gaan we het over hebben?" headerColor={TEAL}>
        <div className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-4">
          {AGENDA.map(([t, d], i) => (
            <div key={t} className="rounded-2xl p-4 flex items-start gap-3" style={{ background: PANEL }}>
              <span className="w-9 h-9 rounded-full grid place-items-center text-white font-bold shrink-0 text-[clamp(14px,1.5vw,18px)]" style={{ background: CITO }}>{i + 1}</span>
              <div>
                <div className="font-bold text-[clamp(14px,1.5vw,19px)]" style={{ color: INK }}>{t}</div>
                <div className="text-[clamp(12px,1.2vw,15px)] leading-snug" style={{ color: SUB }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Slide>
    );

    // 3 — Inleiding
    out.push(
      <Slide title="Even terugblikken">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="text-[clamp(22px,3vw,40px)] font-bold leading-tight" style={{ color: CITO }}>We willen onze klanten écht begrijpen — en daar elke dag naar handelen.</div>
          <div className="text-[clamp(14px,1.7vw,22px)] mt-6 leading-relaxed" style={{ color: SUB }}>
            Met <strong style={{ color: TEAL }}>Klant in Beeld</strong> hebben we samen de basis gelegd: van losse signalen naar één gedeeld beeld van wat scholen, docenten en leerlingen nodig hebben. <span style={{ color: INK }}>Niet vanuit onszelf, maar van buiten naar binnen — <strong>outside-in</strong>.</span>
          </div>
        </div>
      </Slide>
    );

    // 4 — Wat heeft het opgeleverd? (overzicht)
    out.push(
      <Slide title="Wat heeft het opgeleverd?" subtitle="De projectgroep Klant in Beeld dook in de wereld van onze gebruikers">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-[clamp(13px,1.5vw,19px)] leading-relaxed text-center max-w-4xl mx-auto" style={{ color: INK }}>
            In elke sector gingen collega’s hard aan de slag. Via <strong>interviews en analyses</strong> brachten we de belangrijkste <strong>klantreizen</strong> en <strong>interne processen</strong> in kaart — wat leidde tot een helder overzicht van <strong>knelpunten én kansen</strong>, direct vertaald naar <strong>ontwerpcriteria en prioriteiten</strong>. De eerste oplossingsrichtingen staan in de steigers.
          </div>
          <div className="grid grid-cols-4 gap-3 mt-8">
            {([["24", "interviews"], ["9", "klantreizen"], ["5", "interne proceskaarten"], ["3", "sectoren aan de slag"]] as Array<[string, string]>).map(([n, l]) => (
              <div key={l} className="rounded-2xl p-4 text-center shadow-sm" style={{ background: PANEL }}>
                <div className="font-extrabold text-[clamp(26px,3.4vw,48px)] leading-none" style={{ color: CITO }}>{n}</div>
                <div className="text-[clamp(11px,1.2vw,15px)] mt-1.5" style={{ color: SUB }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="text-center text-[clamp(12px,1.3vw,16px)] mt-7 font-semibold" style={{ color: SUB }}>Per sector — PO, VO en Professionals — hieronder de oogst 👇</div>
        </div>
      </Slide>
    );

    // 5–7 — Wat heeft het opgeleverd, per sector
    OPGELEVERD.forEach((s) => out.push(
      <Slide key={s.sector} title={`Opgeleverd — ${s.sector}`} headerColor={s.color}>
        <div className="w-full max-w-5xl mx-auto grid grid-cols-[1.35fr_1fr] gap-6 items-stretch">
          <div className="flex flex-col">
            <div className="flex gap-2.5 flex-wrap mb-5">
              {s.cijfers.map(([n, l]) => (
                <div key={l} className="rounded-xl px-3.5 py-2 text-center" style={{ background: s.color + "14", border: `1px solid ${s.color}33` }}>
                  <div className="font-extrabold text-[clamp(18px,2.2vw,28px)] leading-none" style={{ color: s.color }}>{n}</div>
                  <div className="text-[clamp(10px,1.05vw,13px)] mt-1" style={{ color: SUB }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              {s.punten.map((p) => (
                <div key={p} className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: s.color }} />
                  <span className="text-[clamp(12px,1.35vw,17px)] leading-snug" style={{ color: INK }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex-1 rounded-2xl border-2 border-dashed grid place-items-center text-center p-4" style={{ borderColor: s.color + "66", background: s.color + "0d", minHeight: "clamp(150px,26vh,250px)" }}>
              <div>
                <div className="text-[clamp(28px,4vw,44px)]">📷</div>
                <div className="text-[clamp(11px,1.2vw,14px)] font-semibold mt-1" style={{ color: s.color }}>{s.foto}</div>
                <div className="text-[clamp(9px,1vw,11px)] mt-0.5" style={{ color: SUB }}>foto toevoegen in PowerPoint</div>
              </div>
            </div>
            <div className="text-[clamp(11px,1.2vw,14px)] mt-2.5 leading-snug" style={{ color: SUB }}><strong style={{ color: INK }}>Wie spraken we?</strong> {s.betrokkenen}</div>
          </div>
        </div>
      </Slide>
    ));

    // 5 — Naamswijziging: in Beeld -> in Zicht
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${CITO} 0%, #0c4f86 100%)` }}>
        <div className="relative">
          <div className="inline-block text-[clamp(11px,1.3vw,16px)] tracking-[0.25em] uppercase font-bold text-white/60 mb-6">Groot nieuws ✨</div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="text-[clamp(28px,4.5vw,60px)] font-bold text-white/45 line-through decoration-2">Klant in Beeld</span>
            <span className="text-[clamp(28px,4vw,52px)] text-white/60">→</span>
            <span className="text-[clamp(40px,7vw,96px)] font-extrabold text-white leading-none">Klant in <span style={{ color: GREEN }}>Zicht</span></span>
          </div>
          <p className="text-[clamp(15px,2.1vw,26px)] text-white/85 mt-8 max-w-3xl mx-auto leading-snug">We zetten de klant niet alleen even <strong>in beeld</strong> — we houden ’m blijvend <strong style={{ color: GREEN }}>in zicht</strong>. Van momentopname naar continu meebewegen.</p>
        </div>
      </div>
    );

    // 6 — DIN-netwerk intro
    out.push(
      <Slide title="Zo werken we: één netwerk, vier domeinen">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center text-[clamp(14px,1.6vw,21px)] leading-snug mb-7 max-w-3xl mx-auto" style={{ color: INK }}>
            Klant in Zicht wordt niet ‘even geregeld’. Het lukt als we aan <strong>vier domeinen tegelijk</strong> werken — die samen één netwerk vormen.
          </div>
          <div className="grid grid-cols-4 gap-4">
            {DOMEINEN.map((d) => (
              <div key={d.label} className="rounded-2xl p-5 text-center shadow-sm border-t-4 bg-white" style={{ borderTopColor: d.color }}>
                <div className="text-[clamp(28px,4vw,48px)]">{d.emoji}</div>
                <div className="font-bold text-[clamp(14px,1.6vw,20px)] mt-2" style={{ color: d.color }}>{d.label}</div>
              </div>
            ))}
          </div>
          <div className="text-center text-[clamp(13px,1.4vw,18px)] mt-7 font-semibold" style={{ color: SUB }}>Maar… is één domein genoeg? Laten we het testen 👇</div>
        </div>
      </Slide>
    );

    // Quizvraag per domein (gesloten vraag: ja/nee — antwoord is steeds NEE)
    DOMEINEN.forEach((d) => out.push(
      <Slide key={d.label} title={`Het domein ${d.label}`} subtitle="Quizvraag — zijn we er met dít ene domein?" headerColor={d.color}>
        <div className="w-full max-w-5xl mx-auto grid grid-cols-[1fr_1.25fr] gap-8 items-center">
          {/* Toepasselijk plaatje per domein */}
          <div className="grid place-items-center">
            <div className="rounded-[2rem] grid place-items-center shadow-sm" style={{ width: "clamp(170px,26vw,290px)", height: "clamp(170px,26vw,290px)", background: d.color + "14", border: `2px solid ${d.color}33` }}>
              <span style={{ fontSize: "clamp(80px,13vw,150px)", lineHeight: 1 }}>{d.emoji}</span>
            </div>
          </div>
          {/* Vraag + gesloten ja/nee */}
          <div>
            <div className="font-bold text-[clamp(19px,2.5vw,34px)] leading-tight" style={{ color: INK }}>{d.vraag}</div>
            <div className="text-[clamp(16px,2vw,26px)] font-bold mt-2" style={{ color: SUB }}>Zijn we er dan?</div>
            <div className="flex items-center gap-3 mt-5">
              <span className="rounded-full px-5 py-2.5 font-bold text-[clamp(15px,1.8vw,22px)] border-2" style={{ borderColor: "#cbd5e1", color: "#94a3b8" }}>JA ✅</span>
              <span className="rounded-full px-6 py-2.5 font-extrabold text-white text-[clamp(17px,2vw,26px)] shadow-lg" style={{ background: d.color }}>NEE ❌</span>
            </div>
            <div className="text-[clamp(13px,1.5vw,19px)] mt-5 leading-snug" style={{ color: INK }}>{d.uitleg}</div>
          </div>
        </div>
      </Slide>
    ));

    // 11 — Payoff
    out.push(
      <div className="h-full flex flex-col items-center justify-center text-center px-[8vw] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${CITO} 100%)` }}>
        <div className="relative">
          <div className="text-[clamp(36px,5vw,64px)] mb-4">🎯</div>
          <h1 className="text-[clamp(26px,4vw,56px)] font-extrabold text-white leading-tight max-w-4xl">Pas als <span style={{ color: GREEN }}>alle vier</span> samen bewegen, komt de klant écht in zicht.</h1>
          <div className="flex items-center justify-center gap-3 mt-9 flex-wrap">
            {DOMEINEN.map((d) => (
              <span key={d.label} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-white font-semibold text-[clamp(12px,1.4vw,17px)]" style={{ background: d.color }}>
                <span>{d.emoji}</span>{d.label}
              </span>
            ))}
          </div>
          <p className="text-[clamp(14px,1.7vw,22px)] text-white/80 mt-8">Cultuur · Mens · Data &amp; Systemen · Processen — als één netwerk.</p>
        </div>
      </div>
    );

    // 12 — Samenwerking met 3sides
    out.push(
      <Slide title="Dit deden we niet alleen" subtitle="Samen met onze partner 3sides" headerColor={NAVY}>
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="text-[clamp(20px,2.8vw,36px)] font-bold leading-tight" style={{ color: CITO }}>Met <span style={{ color: TEAL }}>3sides</span> als partner hebben we de aanpak gebouwd én in gang gezet.</div>
          <div className="grid grid-cols-3 gap-4 mt-9">
            {[["🧭", "Strategie", "samen de richting en aanpak bepaald"], ["🤝", "Samen doen", "schouder aan schouder in de uitvoering"], ["🚀", "Vaart houden", "voortgang waar kennis of capaciteit ontbreekt"]].map(([e, t, d]) => (
              <div key={t} className="rounded-2xl p-5 bg-white border-t-4 shadow-sm" style={{ borderTopColor: TEAL }}>
                <div className="text-[clamp(26px,3.5vw,44px)]">{e}</div>
                <div className="font-bold text-[clamp(14px,1.6vw,20px)] mt-2" style={{ color: INK }}>{t}</div>
                <div className="text-[clamp(12px,1.25vw,15px)] mt-1 leading-snug" style={{ color: SUB }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>
    );

    // 13 — Hoe blijven we je informeren
    out.push(
      <Slide title="Hoe blijven we je op de hoogte houden?" headerColor={GREEN}>
        <div className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-5">
          <div className="rounded-2xl p-7 bg-white border-l-4 shadow-sm flex items-start gap-4" style={{ borderLeftColor: CITO }}>
            <span className="text-[clamp(30px,4vw,48px)]">💻</span>
            <div>
              <div className="font-bold text-[clamp(16px,1.9vw,24px)]" style={{ color: CITO }}>Op het intranet</div>
              <div className="text-[clamp(13px,1.4vw,17px)] mt-1.5 leading-snug" style={{ color: SUB }}>Regelmatige updates over de voortgang, mijlpalen en wat het voor jouw werk betekent.</div>
            </div>
          </div>
          <div className="rounded-2xl p-7 bg-white border-l-4 shadow-sm flex items-start gap-4" style={{ borderLeftColor: TEAL }}>
            <span className="text-[clamp(30px,4vw,48px)]">🗣️</span>
            <div>
              <div className="font-bold text-[clamp(16px,1.9vw,24px)]" style={{ color: TEAL }}>Informatiebijeenkomsten</div>
              <div className="text-[clamp(13px,1.4vw,17px)] mt-1.5 leading-snug" style={{ color: SUB }}>Momenten om mee te denken, vragen te stellen en samen verder te bouwen.</div>
            </div>
          </div>
        </div>
      </Slide>
    );

    // 14 — Slot: waar staan we straks (tekstueel)
    out.push(
      <Slide title="Waar staan we straks?" subtitle="Als we dit samen voor elkaar krijgen">
        <div className="w-full max-w-3xl mx-auto space-y-5 text-[clamp(14px,1.7vw,22px)] leading-relaxed" style={{ color: INK }}>
          <p>We kennen onze klanten niet meer alleen van een momentopname, maar houden ze <strong style={{ color: TEAL }}>continu in zicht</strong> — over de hele klantreis heen.</p>
          <p>We werken <strong>outside-in</strong>: vanuit wat scholen, docenten en leerlingen écht nodig hebben. En dat zit in alles — in onze <strong>cultuur</strong>, onze <strong>mensen</strong>, onze <strong>systemen</strong> én onze <strong>processen</strong>.</p>
          <p>Beslissingen baseren we op echt inzicht in plaats van aannames. En dat merken onze klanten — én wijzelf.</p>
          <p className="font-bold pt-2" style={{ color: CITO }}>Klant in Zicht. Samen maken we het waar. 👀</p>
        </div>
      </Slide>
    );

    return out;
  }, []);

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
