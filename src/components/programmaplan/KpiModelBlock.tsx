// ============================================================
// KPI-model — baten · vermogen · inspanningen
// ------------------------------------------------------------
// Eén-op-één port van KPI-DEFINITIEF-SKETCH.html (zelfde kleuren,
// chips, bolletjes en kaarten) — de sketch is de bron van waarheid
// voor de weergave. Gebruikt in stap 9 (KPI's & Meetbaarheid) en in
// het programmaplan (H3.1). Geen verzonnen waarden: startwaarden =
// nulmeting Q3 · doelwaarden = vervolgsessie (eisen staan erbij).
// ============================================================

interface KpiRij {
  naam: string;
  definitie: string;
  start: string; // "Nulmeting Q3" of afwijkende starttekst
  richting: string;
}

const BATEN: {
  sector: string;
  stagKleur: string;
  titel: string;
  rijen: KpiRij[];
}[] = [
  {
    sector: "Zakelijk",
    stagKleur: "bg-[#6d28d9]",
    titel: "Sterkere klantgerichtheid bij opdrachtgevers & kandidaten",
    rijen: [
      { naam: "Funnel-conversieratio per stap", definitie: "Succespercentage per overgang: lead → opportunity → offerte → deal", start: "Nulmeting Q3", richting: "uitval in lange leadtrajecten minimaliseren" },
      { naam: "Offertes: aantal + % → opdracht", definitie: "Volume-driver in lange trajecten én het percentage dat opdracht wordt", start: "Nulmeting Q3", richting: "meer offertes, hogere slaagkans" },
      { naam: "Conversie uit bezoeken", definitie: "Bezoeken waar een call-to-action of vervolg uit voortkomt", start: "Nulmeting Q3", richting: "meer vervolg uit bezoeken" },
      { naam: "Serviceniveau & reactietijden", definitie: "Reactietijd op klantvragen (mail/telefoon)", start: "Nulmeting Q3", richting: "sneller reageren" },
      { naam: "Churn / klantbehoud", definitie: "Verloren klanten per jaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
  {
    sector: "PO",
    stagKleur: "bg-[#0369a1]",
    titel: "Intensiever partnership",
    rijen: [
      { naam: "Groei productgebruik (cross-/up-sell)", definitie: "% scholen dat upgradet van basis naar compleet, of extra trainingen/diensten afneemt", start: "Nulmeting Q3", richting: "meer cross-/up-sell conversie" },
      { naam: "Gebruiksintensiteit volledige lijn", definitie: "% scholen met de volledige doorlopende lijn: Toets + LVS + DST", start: "Nulmeting Q3", richting: "meer scholen op de volledige lijn" },
      { naam: "Raamcontracten grote besturen", definitie: "Aantal totaalpakket-contracten voor alle scholen tegelijk", start: "Nulmeting Q3", richting: "alle accountmanagers voeren dit uit" },
      { naam: "Ontwikkeldeadlines & beloftes gehaald", definitie: "% productbeloftes en deadlines richting klanten gehaald — meting bij productmanagers", start: "Nulmeting Q3", richting: "beloftes waarmaken" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen/besturen per schooljaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
  {
    sector: "VO",
    stagKleur: "bg-[#047857]",
    titel: "Hogere voorspelbaarheid commerciële begroting",
    rijen: [
      { naam: "Prognose-nauwkeurigheid", definitie: "Afwijking tussen de zomerprognose en de gerealiseerde omzet", start: "Nulmeting Q3", richting: "afwijking minimaliseren" },
      { naam: "% meerjarige (3-jr) licenties", definitie: "Aandeel licenties omgezet van 1-jarig naar 3-jarig", start: "Nulmeting Q3", richting: "aandeel 3-jarig omhoog" },
      { naam: "Inzicht in toetskeuzemomenten", definitie: "Markt-/klantreisdata op productniveau → voedt prognose en propositieontwikkeling", start: "Nulmeting Q3", richting: "geïntegreerd in prognosemodellen" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen per schooljaar", start: "Nulmeting Q3", richting: "churn omlaag" },
    ],
  },
];

interface Inspanning {
  done?: boolean;
  tekst: string;
  detail?: string;
  tags: string[];
}

const INSPANNINGEN: {
  domein: string;
  topKleur: string;
  breed?: boolean;
  items: Inspanning[];
}[] = [
  {
    domein: "Programma-breed — de analysefase",
    topKleur: "border-t-[#003366]",
    breed: true,
    items: [
      { done: true, tekst: "Kickoff & stakeholder-alignment — gedaan", tags: ["3sides"] },
      { tekst: "Adoptie-framework", detail: "gedrag & competenties per rol + de meetaanpak; gereed & gedragen door het programmateam", tags: ["Q3", "3sides"] },
      { tekst: "Nulmeting", detail: "de startwaarden van alle KPI's + de objectieve stand van het vermogen", tags: ["Q3", "3sides"] },
      { tekst: "Pilotgroep starten in 1 sector", detail: "sectorkeuze: nog te bepalen", tags: ["Q3", "3sides"] },
    ],
  },
  {
    domein: "Cultuur",
    topKleur: "border-t-[#d97706]",
    items: [
      { tekst: "Rituelen ontworpen & ingevoerd", detail: "klantverhalen delen · reflectiesessies · klantbezoeken", tags: ["2026", "3sides"] },
      { tekst: "Ambassadeurs per sector geïdentificeerd & aangehaakt", tags: ["Q4", "3sides"] },
    ],
  },
  {
    domein: "Data & Systemen",
    topKleur: "border-t-[#7c3aed]",
    items: [
      { tekst: "Klantinformatie-landschap + huidig CRM in kaart", detail: "wat werkt · wat loopt vast · kosten & kansen; álle systemen waar klantdata zit (o.a. Topdesk · CRM · Dynax · Maileon · Webinargeek · Umbraco · SurveyMonkey · gebruikersplatform)", tags: ["Q3", "3sides"] },
      { tekst: "Quick wins — doorlopend spoor", detail: 'signaleren zodra ze zich aandienen → prioriteren op impact × uitvoerbaarheid → direct implementeren. Al benoemd: de marketing/sales-funnel · contactgegevens centraliseren + koppeling Maileon ↔ CRM ("klein beginnen")', tags: ["doorlopend", "sessie", "3sides"] },
      { tekst: "Funnelontwerp + datakwaliteit-eisen", tags: ["2026", "sessie", "3sides"] },
      { tekst: "Klantreis vertaald naar CRM-requirements", detail: "input voor het CRM (huidig of nieuw) rond data en integratie", tags: ["Q4", "3sides"] },
      { tekst: "Platformopties in kaart", detail: "richting CRM bepaald in Q4 · formele keuze ~april '27", tags: ["2026", "sessie", "3sides"] },
      { tekst: "Op orde brengen & uitvoeren", detail: "inrichting, integraties en het borgen van datakwaliteit; niet alleen advies, ook realisatie", tags: ["2026", "3sides"] },
      { tekst: 'A5 "Centrale datavoorziening klantcommunicatie"', detail: "dit project loopt al en hangt onder Data & Systemen. Tijdens de analysefase moet blijken wat we uit dit project halen: wat onder de scope van Klant in Zicht gaat hangen en wat niet", tags: ["2026", "SIO"] },
    ],
  },
  {
    domein: "Processen",
    topKleur: "border-t-[#059669]",
    items: [
      { tekst: "Klantreizen → funnelprocessen", detail: "fases · triggers · acties, incl. customer loops (retentie · migratie · nieuw)", tags: ["Q4", "3sides"] },
      { tekst: "Eenduidig Customer Success-proces · proactieve contactmomenten per klantreis", tags: ["2026", "3sides"] },
    ],
  },
  {
    domein: "Mens",
    topKleur: "border-t-[#2563eb]",
    items: [
      { tekst: "Eerste intervisiegroepen live", detail: "coaching & intervisie op de werkvloer", tags: ["Q4", "3sides"] },
      { tekst: "Curriculumontwerp vaardigheidstraining", detail: "met HR, o.b.v. echte klantcases (training 2027)", tags: ["2026", "sessie", "3sides"] },
    ],
  },
];

function Tag({ t }: { t: string }) {
  const stijl =
    t === "3sides"
      ? "bg-[#efe9fd] text-[#6d28d9] border-[#e0d3fb]"
      : t === "sessie"
        ? "bg-[#e0edff] text-[#1d4ed8] border-[#c3d9fc]"
        : t === "SIO"
          ? "bg-[#eef4fb] text-[#1d4ed8] border-[#d5e4f5]"
          : "bg-[#f1f5f9] text-[#475569] border-[#dde3ea]";
  return (
    <span className={`inline-block text-[8px] font-extrabold uppercase tracking-wide border rounded px-1.5 py-0.5 ml-1 align-[1px] ${stijl}`}>
      {t}
    </span>
  );
}

function DomChip({ naam, stijl }: { naam: string; stijl: string }) {
  return (
    <span className={`text-[10px] font-bold rounded-md px-2.5 py-1 border ${stijl}`}>{naam}</span>
  );
}

function Bollen({ nu }: { nu: number }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`inline-block w-3.5 h-3.5 rounded-full border-2 ${
            i <= nu
              ? "bg-[#0891b2] border-[#0891b2]"
              : "bg-white border-[#0891b2] border-dashed"
          }`}
        />
      ))}
    </span>
  );
}

function SectieKopNum({ num, kleur, titel }: { num: string; kleur: string; titel: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-1">
      <span className={`text-[11px] font-extrabold text-white rounded-md px-2.5 py-0.5 ${kleur}`}>{num}</span>
      <h4 className="text-lg font-bold text-gray-900 tracking-tight">{titel}</h4>
    </div>
  );
}

function DoelwaardeCel({ rijen }: { rijen: number }) {
  return (
    <td rowSpan={rijen} className="px-4 py-3 bg-[#fffdf7] border-l border-gray-200 align-top w-[25%]">
      <span className="block font-bold text-[#b45309] text-[11.5px] leading-snug mb-2">
        Te bepalen — vervolgsessie, ná nulmeting Q3
      </span>
      <span className="block text-[9px] font-extrabold uppercase tracking-wide text-gray-400 mb-1">
        Eisen per doelwaarde
      </span>
      {[
        <>Concreet getal <b className="text-gray-800">mét meetmoment</b></>,
        <b key="m" className="text-gray-800">Meetbaar</b>,
        <b key="t" className="text-gray-800">Toetsbaar</b>,
        <b key="mo" className="text-gray-800">Motiverend</b>,
        <><b className="text-gray-800">Haalbaar</b> t.o.v. de startwaarde</>,
        <>Roept het <b className="text-gray-800">gewenste gedrag</b> op</>,
      ].map((inhoud, i) => (
        <span key={i} className="block relative pl-4 text-[11px] text-gray-600 mt-0.5 leading-snug">
          <span className="absolute left-0 text-[#047857] font-extrabold">✓</span>
          {inhoud}
        </span>
      ))}
    </td>
  );
}

export default function KpiModelBlock() {
  return (
    <div className="space-y-7">
      {/* ---------- Leeswijzer ---------- */}
      <div className="flex items-stretch gap-2 flex-wrap">
        {[
          { n: "1 · Baten", nKleur: "text-[#0066cc]", top: "border-t-[#0066cc]", t: "Wat het moet opleveren", s: "De KPI's waarop we sturen — vastgesteld" },
          { n: "2 · Vermogen", nKleur: "text-[#0891b2]", top: "border-t-[#0891b2]", t: "Wat we daarvoor moeten kunnen", s: "Eén gedeeld vermogen — meting in opbouw" },
          { n: "3 · Inspanningen", nKleur: "text-[#6d28d9]", top: "border-t-[#6d28d9]", t: "Wat we gaan doen", s: "Bouwen het vermogen op — 3sides voert uit" },
        ].map((b, i) => (
          <div key={b.n} className="flex items-center gap-2 flex-1 min-w-[200px]">
            {i > 0 && <span className="text-gray-300 font-extrabold text-lg hidden sm:block">←</span>}
            <div className={`flex-1 bg-white border border-gray-200 border-t-4 ${b.top} rounded-xl px-4 py-3 shadow-sm`}>
              <div className={`text-[9.5px] font-extrabold uppercase tracking-wider ${b.nKleur}`}>{b.n}</div>
              <div className="text-[12.5px] font-bold text-gray-900 mt-0.5">{b.t}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{b.s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- NPS-banner ---------- */}
      <div className="rounded-xl px-5 py-3.5 text-white text-[12.5px] shadow-sm bg-gradient-to-br from-[#0c6b7a] to-[#0891b2]">
        <b>NPS &amp; klanttevredenheid = strategische resultante</b> (kwartaal/jaar) — geen stuur-KPI. Je
        stuurt op de KPI&apos;s hieronder; de NPS meet of het werkt.
      </div>

      {/* ---------- 1. Baten-KPI's ---------- */}
      <div>
        <SectieKopNum num="1" kleur="bg-[#0066cc]" titel="Baten-KPI's — waarop we sturen" />
        <p className="text-xs text-gray-600 mb-3 leading-relaxed max-w-3xl">
          Per sector één baat met de bijbehorende KPI&apos;s, <b className="text-gray-800">vastgesteld in de stakeholdersessie</b>.
          De startwaarden meten we in Q3 (nulmeting); de doelwaarden bepalen we daarna in de vervolgsessie —
          de eisen daarvoor staan alvast in de laatste kolom.
        </p>
        <div className="space-y-4">
          {BATEN.map((b) => (
            <div key={b.sector} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2.5 flex-wrap">
                <span className={`text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-md text-white ${b.stagKleur}`}>
                  {b.sector}
                </span>
                <span className="text-sm font-bold text-gray-900">{b.titel}</span>
                <span className="ml-auto text-[10.5px] text-gray-400 text-right leading-tight">
                  Eigenaar: <b className="text-gray-600">Commercieel Manager</b>
                  <br />
                  Meet: <b className="text-gray-600">Strategisch Marketeer</b>
                </span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-[#f7f9fc]">
                  <tr>
                    <th className="text-left px-4 py-2 text-[9.5px] font-bold text-gray-400 uppercase tracking-wider w-[24%]">KPI</th>
                    <th className="text-left px-4 py-2 text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Definitie</th>
                    <th className="text-left px-4 py-2 text-[9.5px] font-bold text-gray-400 uppercase tracking-wider w-[20%]">Startwaarde → waar naartoe</th>
                    <th className="text-left px-4 py-2 text-[9.5px] font-bold text-gray-400 uppercase tracking-wider w-[25%]">Doelwaarde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {b.rijen.map((r, i) => (
                    <tr key={r.naam} className="align-top">
                      <td className="px-4 py-2.5 font-semibold text-gray-900 text-[12.5px]">{r.naam}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-[12.5px] leading-relaxed">{r.definitie}</td>
                      <td className="px-4 py-2.5 text-[11.5px] text-gray-600 leading-snug">
                        <span className="text-[#b45309] font-semibold">{r.start}</span> →{" "}
                        <b className="text-gray-800">{r.richting}</b>
                      </td>
                      {i === 0 && <DoelwaardeCel rijen={b.rijen.length} />}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- 2. Het gedeelde vermogen ---------- */}
      <div>
        <SectieKopNum num="2" kleur="bg-[#0891b2]" titel="Het gedeelde vermogen — wat we moeten kunnen" />
        <p className="text-xs text-gray-600 mb-3 leading-relaxed max-w-3xl">
          De baten hierboven komen er alleen als de organisatie iets nieuws <b className="text-gray-800">kan</b>. Dat
          &ldquo;kunnen&rdquo; heet in het programma het <b className="text-gray-800">vermogen</b>.
        </p>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-[12.5px] font-bold text-gray-900 mb-1.5">Welk vermogen bouwen we op?</div>
            <p className="text-[11.5px] text-gray-600 leading-relaxed">
              Elke sector formuleerde eerder een eigen vermogen; die drie zijn samengevoegd tot één gedeeld
              vermogen voor het hele programma:
            </p>
            <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest bg-[#0891b2] text-white rounded-md px-2 py-0.5 mt-2.5 mb-1">
              Gedeeld vermogen
            </span>
            <div className="text-[15.5px] font-bold text-gray-900 leading-snug">
              &ldquo;Klantgericht commercieel vermogen op basis van betrouwbare klantdata&rdquo;
            </div>
            <p className="text-[11.5px] text-gray-600 italic mt-1 leading-relaxed">
              — outside-in handelen, gedragen door CRM-fundament, eenduidige funnelprocessen, getrainde
              medewerkers en een cultuur van eigenaarschap.{" "}
              <span className="not-italic text-gray-400">(letterlijke tekst programmaplan)</span>
            </p>
            <p className="text-[11.5px] text-gray-600 mt-2 leading-relaxed">
              We bouwen het op langs de <b className="text-gray-800">vier domeinen</b>. Wát er per domein
              precies nodig is, weten we nu nog niet — <b className="text-gray-800">dat komt uit de analysefase</b> (deel 3):
            </p>
            <div className="flex gap-1.5 flex-wrap mt-2">
              <DomChip naam="Cultuur" stijl="bg-[#fdf1e3] text-[#b45309] border-[#f6ddb9]" />
              <DomChip naam="Mens" stijl="bg-[#e0edff] text-[#1d4ed8] border-[#c3d9fc]" />
              <DomChip naam="Data & Systemen" stijl="bg-[#f3ecfe] text-[#6d28d9] border-[#e4d8fb]" />
              <DomChip naam="Processen" stijl="bg-[#e7f6ef] text-[#047857] border-[#c7f0dd]" />
            </div>
          </div>

          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-[12.5px] font-bold text-gray-900 mb-1.5">Waar staan we — en waar willen we naartoe?</div>
            <p className="text-[11.5px] text-gray-600 leading-relaxed">
              In de sessie scoorde elke sector zichzelf op dit vermogen (schaal 1–5, gevoelsmeting). De{" "}
              <b className="text-gray-800">nulmeting in Q3</b> maakt die inschatting objectief. &nbsp;
              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0891b2]" /> = nu ·
                <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#0891b2]" /> = ambitie
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {[
                { s: "Zakelijk", stag: "bg-[#6d28d9]", nu: 3, score: "3 → 5", was: '"Klantgerichte commerciële slagkracht"' },
                { s: "PO", stag: "bg-[#0369a1]", nu: 2, score: "2 → 5", was: '"Strategisch klantpartnerschap"' },
                { s: "VO", stag: "bg-[#047857]", nu: 2, score: "2 → 5", was: '"Klantfasegericht commercieel relatievermogen"' },
              ].map((v) => (
                <div key={v.s}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-md text-white ${v.stag}`}>{v.s}</span>
                    <Bollen nu={v.nu} />
                    <span className="text-[11px] font-bold text-[#0891b2]">{v.score}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 leading-snug">sector-vermogen (programmaplan): {v.was}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-[12.5px] font-bold text-gray-900 mb-1.5">Hoe komen we van 2–3 naar 5?</div>
            <p className="text-[11.5px] text-gray-600 leading-relaxed">
              Niet in één sprong. Volgens de methodiek volgen de inspanningen uit de{" "}
              <b className="text-gray-800">gap tussen waar we staan (AS-IS) en waar we naartoe willen (TO-BE)</b> — en
              om die gap scherp te krijgen, moet je eerst analyseren. Dat is precies wat we in{" "}
              <b className="text-gray-800">2026</b> doen:
            </p>
            <div className="flex items-stretch gap-2 flex-wrap mt-3">
              {[
                { n: "1", t: "Analysefase 2026 + quick wins", s: "de inspanningen in deel 3: maken per domein en per rol scherp wát er moet veranderen; de nulmeting meet objectief waar we staan" },
                { n: "2", t: "Uitkomst van de analyse", s: "wat er nodig is om naar 5 te groeien → de vervolg-inspanningen voor 2027 · én hoe we die groei gaan meten → de vermogen-indicatoren" },
                { n: "3", t: "Vervolgsessie", s: "indicatoren en doelwaarden vaststellen, mét een eigenaar per indicator" },
              ].map((r, i) => (
                <div key={r.n} className="flex items-start gap-2 flex-1 min-w-[180px]">
                  {i > 0 && <span className="text-gray-300 font-extrabold self-center">→</span>}
                  <div className="flex items-start gap-2 flex-1">
                    <span className="flex-none w-5 h-5 rounded-full bg-[#0891b2] text-white grid place-items-center text-[10.5px] font-extrabold mt-0.5">{r.n}</span>
                    <p className="text-[11px] text-gray-600 leading-snug">
                      <b className="text-gray-800">{r.t}</b>
                      <br />
                      {r.s}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 3. Inspanningen ---------- */}
      <div>
        <SectieKopNum num="3" kleur="bg-[#6d28d9]" titel="Inspanningen — wat we gaan doen" />
        <p className="text-xs text-gray-600 mb-3 leading-relaxed max-w-3xl">
          Dit zijn de acties van de <b className="text-gray-800">analysefase 2026</b> (+ quick wins), uit het{" "}
          <b className="text-gray-800">goedgekeurde 3sides-voorstel</b> en de sessie; 3sides voert uit. Elke
          inspanning is afvinkbaar: <b className="text-gray-800">opgeleverd, ja of nee</b> — dat is meteen de
          KPI voor 3sides.{" "}
          <b className="text-gray-800">
            Als deze inspanningen klaar zijn, weten we wat er in 2027 nodig is om het vermogen naar 5 te
            brengen — en hoe we die groei meten.
          </b>{" "}
          Dit overzicht is een <b className="text-gray-800">levend document</b>: uit de analysefase komen naar
          verwachting nieuwe inspanningen bij.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {INSPANNINGEN.map((d) => (
            <div
              key={d.domein}
              className={`bg-white border border-gray-200 border-t-4 ${d.topKleur} rounded-2xl p-4 shadow-sm ${d.breed ? "md:col-span-2" : ""}`}
            >
              <div className="text-[13px] font-bold text-gray-900 mb-2.5">
                {d.domein}
                {d.breed && <Tag t="Q3" />}
              </div>
              <ul className="space-y-1.5">
                {d.items.map((i) => (
                  <li key={i.tekst} className="text-xs text-gray-600 flex gap-2 leading-relaxed">
                    <span className={`flex-none ${i.done ? "text-emerald-600" : "text-gray-400"}`}>{i.done ? "☑" : "☐"}</span>
                    <span>
                      <b className="text-gray-900">{i.tekst}</b>
                      {i.detail && <> — {i.detail}</>}
                      {i.tags.filter((t) => !(d.breed && (t === "Q3"))).map((t) => (
                        <Tag key={t} t={t} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 2027-strip */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mt-3.5 text-[11.5px] text-gray-600 leading-relaxed">
          <span className="inline-block text-[9px] font-extrabold bg-[#003366] text-white rounded-md px-2 py-0.5 mr-2 align-[1px]">2027</span>
          <b className="text-gray-900">Vooruitblik — nemen we later samen door</b> (dan toetsen we ook of we
          iets missen): uitrol 3e sector · training- &amp; coachingsprogramma live (met HR) ·{" "}
          <b className="text-gray-900">eerste KPI-rapportage (Q1)</b> — de eerste meting van dit model tegen
          de nulmeting · borging &amp; co-creatie met klanten · KPI&apos;s aangescherpt voor de volgende
          cyclus · van CRM naar CSM · 3sides → sparringpartner.
        </div>

        {/* Bemensing */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mt-3.5 text-xs text-gray-600 leading-relaxed">
          <b className="text-gray-900">Wat elke inspanning nodig heeft:</b> een{" "}
          <b className="text-gray-900">inspanningsleider</b> (trekker) ·{" "}
          <b className="text-gray-900">teamleden &amp; capaciteit</b> uit de sectoren · een heldere{" "}
          <b className="text-gray-900">output-definitie</b> (wanneer is het klaar j/n) · een plek in de{" "}
          <b className="text-gray-900">planning</b>.
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200">
            <b className="text-gray-900">Bemensing zoals nu belegd:</b>
            <ul className="mt-1.5 space-y-1.5">
              {[
                <><b className="text-gray-900">3sides:</b> topic leads voor Processen en Data &amp; Systemen — senior stuurt op richting, medior op uitvoering; specialisten op afroep</>,
                <><b className="text-gray-900">Inspanningsleiders Cito</b> (kernteam, programmaplan): Cultuur &amp; Mens — <b className="text-gray-900">HR-manager</b> · Data &amp; Systemen — <b className="text-gray-900">SIO</b> · Processen — <b className="text-gray-900">nog te benoemen</b> (volledig overzicht per domein: §3.3)</>,
                <><b className="text-gray-900">Domeineigenaar Data &amp; Systemen:</b> Manager Data &amp; Technologie</>,
                <><b className="text-gray-900">Curriculum vaardigheidstraining:</b> wordt samen met HR ontworpen — de HR-manager (inspanningsleider Mens) plus een HR-medewerker voor curriculum &amp; integratie (kernteam)</>,
                <><b className="text-gray-900">Cultuurlijn:</b> gedragen door het volledige &ldquo;MT&rdquo; — sectormanagers, commercieel manager én HR-manager: voorleven in gedrag, en het &ldquo;MT-besluit&rdquo; over de leiderschapsaanpak<Tag t="sessie" /></>,
              ].map((inhoud, i) => (
                <li key={i} className="relative pl-4">
                  <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-gray-300" />
                  {inhoud}
                </li>
              ))}
              <li className="relative pl-4 text-[#b45309]">
                <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-[#b45309]" />
                <b>Nog te bepalen:</b> inspanningsleider Processen + teamleden per inspanning
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ---------- Randvoorwaarden ---------- */}
      <div>
        <SectieKopNum num="✓" kleur="bg-[#64748b]" titel="Randvoorwaarden" />
        <p className="text-xs text-gray-600 mb-3 leading-relaxed">
          Deze punten meet je niet — je <b className="text-gray-800">regelt</b> ze. Zonder deze voorwaarden
          stokt alles hierboven.
        </p>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-xs text-gray-600 leading-relaxed">
          <ul className="space-y-1.5">
            {[
              <><b className="text-gray-900">Mandaat &amp; escalatiepad</b> naar de directie — actiemodus, niet stilvallen op de interne organisatie</>,
              <><b className="text-gray-900">Beschikbaarheid &amp; commitment</b> vooraf afgesproken — afwezigheid is hoge uitzondering</>,
              <><b className="text-gray-900">Regie &amp; programmaleiding</b> bij 3sides — voortgang, tempo en verbinding tussen de sectoren</>,
              <><b className="text-gray-900">Doorlopende leiderschapsondersteuning</b> door 3sides — voorbeeldgedrag, silo&apos;s verbinden</>,
              <><b className="text-gray-900">Commitment van alle sectormanagers</b></>,
              <><b className="text-gray-900">Juiste mensen op de juiste plek</b> — rollen/profielen kritisch bekijken, gericht werven waar nodig</>,
              <><b className="text-gray-900">Scope: lopende projecten aanhaken</b> — het lopende A5-project &ldquo;Centrale datavoorziening klantcommunicatie&rdquo; hangt onder Data &amp; Systemen; de analysefase bepaalt wat ervan binnen de scope van Klant in Zicht valt en wat niet. Daarnaast blijven inventariseren welke andere lopende initiatieven hieronder horen — samenhang bewaken is onderdeel van de 3sides-regierol</>,
            ].map((inhoud, i) => (
              <li key={i} className="relative pl-4">
                <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-gray-400" />
                {inhoud}
              </li>
            ))}
          </ul>
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 text-[11.5px]">
            <b className="text-gray-900">Inkoop:</b> 3sides-as-a-service-abonnement voor{" "}
            <b className="text-gray-900">6 maanden</b> (jul–dec 2026, 232 u/mnd); voor{" "}
            <b className="text-gray-900">2027 worden de uren herijkt</b> op basis van de opgedane ervaring.
          </div>
        </div>
      </div>

      {/* ---------- Vervolg ---------- */}
      <div>
        <SectieKopNum num="→" kleur="bg-[#003366]" titel="Vervolg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="bg-white border border-gray-200 border-t-4 border-t-[#003366] rounded-2xl p-4 shadow-sm">
            <div className="text-[13px] font-bold text-gray-900 mb-2">Nu, ná deze sessie (Q3)</div>
            <ol className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
              <li><b className="text-gray-900">1.</b> KPI-set delen &amp; valideren met de stakeholders/eigenaren (dit document)</li>
              <li><b className="text-gray-900">2.</b> Analysefase draait: nulmeting · adoptie-framework · klantinformatie-landschap &amp; CRM in kaart · eerste quick win</li>
            </ol>
          </div>
          <div className="bg-white border border-gray-200 border-t-4 border-t-[#0066cc] rounded-2xl p-4 shadow-sm">
            <div className="text-[13px] font-bold text-gray-900 mb-2">
              Eén gecombineerde vervolgsessie (na nulmeting + adoptie-framework)
            </div>
            <ol className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
              <li><b className="text-gray-900">1.</b> Doelwaarden vaststellen per baten-KPI — langs de eisen</li>
              <li><b className="text-gray-900">2.</b> Vermogen-indicatoren kiezen — per domein, mét eigenaar</li>
              <li><b className="text-gray-900">3.</b> ❓ Kwaliteit van gesprekken als extra PO-KPI (3sides noemt deze; sessie besloot dit nog niet)</li>
              <li><b className="text-gray-900">4.</b> Meetritme afspreken — wie rapporteert wat, wanneer (→ eerste KPI-rapportage Q1 &apos;27)</li>
            </ol>
          </div>
        </div>
      </div>

      <p className="text-center text-[10.5px] text-gray-400 leading-relaxed">
        Bronnen: stakeholdersessie (leidend) · goedgekeurd 3sides-voorstel · DIN-netwerk/programmaplan ·
        Werken aan Programma&apos;s H8 · KPI-model Excel (geauditeerd)
      </p>
    </div>
  );
}
