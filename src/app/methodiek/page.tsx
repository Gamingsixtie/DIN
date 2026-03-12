"use client";

import Link from "next/link";

/* ─── constanten ─── */
const KETEN = [
  { label: "Doelen", sub: "Programmadoelstellingen", color: "#003366", light: "#003366" },
  { label: "Baten", sub: "Gewenste effecten", color: "#0066cc", light: "#0066cc" },
  { label: "Vermogens", sub: "Benodigde capaciteiten", color: "#0891b2", light: "#0891b2" },
  { label: "Inspanningen", sub: "Concrete projecten", color: "#059669", light: "#059669" },
] as const;

const DOMEINEN = [
  { label: "Mens", color: "#2563eb", icon: "👤", voorbeelden: "Opleiding, training, bemensing, competentieontwikkeling" },
  { label: "Processen", color: "#059669", icon: "⚙", voorbeelden: "Werkwijzen, procedures, governance, samenwerking" },
  { label: "Data & Systemen", color: "#7c3aed", icon: "💻", voorbeelden: "IT-systemen, data-infrastructuur, tooling, integraties" },
  { label: "Cultuur", color: "#d97706", icon: "🌱", voorbeelden: "Gedrag, mindset, waarden, leiderschapsontwikkeling" },
] as const;

const SECTOREN = [
  { naam: "PO", omschrijving: "Primair onderwijs", kleur: "#2563eb" },
  { naam: "VO", omschrijving: "Voortgezet onderwijs", kleur: "#7c3aed" },
  { naam: "Zakelijk", omschrijving: "Zakelijk / Professionals", kleur: "#059669" },
] as const;

/* ─── arrow icon ─── */
function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M6 14h16m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── section nummer ─── */
function SectionNumber({ num, color = "#003366" }: { num: number; color?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg shrink-0"
      style={{ backgroundColor: color }}
    >
      {num}
    </span>
  );
}

/* ─── page ─── */
export default function MethodiekPage() {
  return (
    <main className="min-h-screen bg-cito-bg">
      {/* ━━━ HERO ━━━ */}
      <header className="relative overflow-hidden bg-cito-blue text-white">
        {/* decoratieve achtergrond */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-8 transition-colors"
          >
            ← Terug naar sessies
          </Link>

          <p className="text-blue-200 text-sm font-semibold tracking-wider uppercase mb-3">
            Doelen-Inspanningennetwerk
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-2xl">
            Van Visie naar
            <br />
            Programmaplan
          </h1>
          <p className="text-blue-100 text-lg mt-5 max-w-xl leading-relaxed">
            Dit document beschrijft het traject waarmee we gezamenlijke programmadoelen
            vertalen naar concrete inspanningen — per sector, in vier domeinen, tot
            een samenhangend programmaplan.
          </p>

          {/* keten mini-preview */}
          <div className="mt-10 flex flex-wrap items-center gap-2 md:gap-3">
            {KETEN.map((k, i) => (
              <div key={k.label} className="flex items-center gap-2 md:gap-3">
                <span
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/20"
                  style={{ backgroundColor: `${k.color}cc` }}
                >
                  {k.label}
                </span>
                {i < KETEN.length - 1 && (
                  <ArrowRight className="text-blue-300 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* ━━━ WAAROM DIT TRAJECT? ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={0} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Waarom dit traject?</h2>
              <p className="text-gray-500 mt-1">De aanleiding en het doel</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-cito-blue/10 flex items-center justify-center text-2xl mb-4">
                🎯
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Van strategie naar actie</h3>
              <p className="text-gray-600 leading-relaxed">
                Met <strong>Klant in Beeld</strong> hebben we een gezamenlijke visie en
                programmadoelen vastgesteld. Nu is de vraag: <em>hoe vertalen we die doelen
                naar concrete projecten en activiteiten?</em> Het DIN-framework biedt
                een gestructureerde aanpak om van abstract naar concreet te werken.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-cito-blue/10 flex items-center justify-center text-2xl mb-4">
                📋
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Eerste opzet programmaplan</h3>
              <p className="text-gray-600 leading-relaxed">
                Het eindresultaat is een <strong>eerste opzet van een programmaplan</strong> waarin
                per sector duidelijk is welke inspanningen nodig zijn, inclusief een overzicht
                voor <strong>budgettering</strong> en tijdplanning. Dit vormt de basis voor
                verdere besluitvorming en goedkeuring.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━ STAP 1: STARTPUNT KIB ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={1} color="#003366" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Startpunt: Klant in Beeld</h2>
              <p className="text-gray-500 mt-1">Gezamenlijke kaders als fundament</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-cito-border overflow-hidden shadow-sm">
            <div className="bg-cito-blue/[0.03] border-b border-cito-border px-6 py-4">
              <p className="text-gray-700 leading-relaxed">
                Het traject start met de uitkomsten van <strong>Klant in Beeld</strong>.
                Dit zijn de gezamenlijk vastgestelde kaders waaraan alle sectoren hun
                inspanningen ophangen.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cito-border">
              <div className="p-6">
                <div className="text-3xl mb-3">🔭</div>
                <h4 className="font-bold text-gray-900 mb-1">Programmavisie</h4>
                <p className="text-sm text-gray-500">
                  De gezamenlijke stip op de horizon — waar wil de organisatie naartoe?
                </p>
              </div>
              <div className="p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-bold text-gray-900 mb-1">Programmadoelen</h4>
                <p className="text-sm text-gray-500">
                  De top-doelen die via dot voting zijn vastgesteld en geprioriteerd.
                </p>
              </div>
              <div className="p-6">
                <div className="text-3xl mb-3">📐</div>
                <h4 className="font-bold text-gray-900 mb-1">Scope</h4>
                <p className="text-sm text-gray-500">
                  Wat valt binnen en buiten de scope van het programma.
                </p>
              </div>
            </div>
          </div>

          {/* Lopende projecten alinken */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">🔗</div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">Lopende projecten in lijn brengen</h4>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Naast nieuwe inspanningen worden ook <strong>bestaande en lopende projecten</strong> onder
                  de kaders van Klant in Beeld gehangen. Zo wordt zichtbaar hoe het huidige werk
                  bijdraagt aan de programmadoelen, en waar eventueel bijsturing nodig is.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ STAP 2: PER SECTOR ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={2} color="#0066cc" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Per sector doorlopen</h2>
              <p className="text-gray-500 mt-1">Elke sector werkt de DIN-keten uit</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed max-w-2xl">
            Elke sector doorloopt het DIN-framework apart. Zo ontstaat per sector een eigen
            netwerk van baten, vermogens en inspanningen — geankerd aan de gezamenlijke doelen.
          </p>

          {/* sector cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {SECTOREN.map((s) => (
              <div
                key={s.naam}
                className="bg-white rounded-2xl border-2 p-5 shadow-sm text-center"
                style={{ borderColor: `${s.kleur}30` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-lg mb-3"
                  style={{ backgroundColor: s.kleur }}
                >
                  {s.naam}
                </div>
                <h4 className="font-bold text-gray-900">{s.omschrijving}</h4>
              </div>
            ))}
          </div>

          {/* DIN keten per sector */}
          <div className="bg-white rounded-2xl border border-cito-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-cito-border bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg">De DIN-keten per sector</h3>
              <p className="text-sm text-gray-500 mt-1">
                Per doel wordt de keten van rechts naar links uitgewerkt: <em>&ldquo;Hoe bereiken we dit?&rdquo;</em>
              </p>
            </div>

            <div className="p-6">
              {/* Visuele keten */}
              <div className="flex flex-col gap-0">
                {KETEN.map((k, i) => (
                  <div key={k.label} className="flex items-stretch">
                    {/* verticale lijn */}
                    <div className="flex flex-col items-center w-12 shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 z-10"
                        style={{ backgroundColor: k.color }}
                      >
                        {i + 1}
                      </div>
                      {i < KETEN.length - 1 && (
                        <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: `${KETEN[i + 1].color}40` }}>
                          <ChevronDown className="text-gray-300 -ml-[9px] mt-1" />
                        </div>
                      )}
                    </div>

                    {/* content */}
                    <div className={`ml-4 ${i < KETEN.length - 1 ? "pb-6" : "pb-2"}`}>
                      <h4 className="font-bold text-gray-900 text-lg" style={{ color: k.color }}>
                        {k.label}
                      </h4>
                      <p className="text-gray-600 text-sm mt-0.5">{k.sub}</p>
                      <div className="mt-2 text-sm text-gray-500 leading-relaxed">
                        {i === 0 && "De gezamenlijke programmadoelen uit Klant in Beeld — het vertrekpunt."}
                        {i === 1 && "Welke effecten willen we zien in de buitenwereld? Met meetbare indicatoren, eigenaar en streefwaarden."}
                        {i === 2 && "Wat moet de organisatie kunnen om de baten te realiseren? Welke capaciteiten zijn nodig?"}
                        {i === 3 && "Welke concrete projecten en activiteiten bouwen de vermogens op? Verdeeld over vier domeinen."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ DE 4 DOMEINEN ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={3} color="#0891b2" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vier inspanningsdomeinen</h2>
              <p className="text-gray-500 mt-1">Elke inspanning valt in een van deze domeinen</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed max-w-2xl">
            Inspanningen worden ingedeeld in vier domeinen. Dit zorgt voor een evenwichtig
            programma dat niet alleen op systemen leunt, maar ook investeert in mensen,
            processen en cultuur.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {DOMEINEN.map((d) => (
              <div
                key={d.label}
                className="bg-white rounded-2xl border-l-4 p-5 shadow-sm border border-cito-border"
                style={{ borderLeftColor: d.color }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{d.icon}</span>
                  <h4 className="font-bold text-lg" style={{ color: d.color }}>
                    {d.label}
                  </h4>
                </div>
                <p className="text-sm text-gray-600">{d.voorbeelden}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ CROSS-ANALYSE ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={4} color="#059669" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cross-analyse</h2>
              <p className="text-gray-500 mt-1">Synergieën en gaps over sectoren heen</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
            <p className="text-gray-600 leading-relaxed mb-5">
              Nadat elke sector het DIN-framework heeft doorlopen, brengen we de resultaten
              samen. De cross-analyse laat zien:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="text-2xl mb-2">🤝</div>
                <h4 className="font-semibold text-green-900 mb-1">Synergieën</h4>
                <p className="text-sm text-green-700">
                  Waar overlappen inspanningen van sectoren? Waar kan worden samengewerkt?
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="text-2xl mb-2">🔍</div>
                <h4 className="font-semibold text-orange-900 mb-1">Gaps</h4>
                <p className="text-sm text-orange-700">
                  Zijn er doelen zonder inspanningen? Ontbreken er vermogens?
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="text-2xl mb-2">⚖️</div>
                <h4 className="font-semibold text-blue-900 mb-1">Domeinbalans</h4>
                <p className="text-sm text-blue-700">
                  Is er een gezonde verdeling over alle vier de inspanningsdomeinen?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ UITKOMST ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <SectionNumber num={5} color="#003366" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Uitkomst: het programmaplan</h2>
              <p className="text-gray-500 mt-1">Van DIN-netwerk naar beslisdocument</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cito-blue to-[#004d99] rounded-2xl p-8 text-white shadow-lg">
            <p className="text-blue-100 leading-relaxed mb-6 max-w-2xl">
              Alle DIN-informatie wordt samengevoegd tot een <strong className="text-white">eerste opzet
              van het programmaplan</strong>. Dit document is de basis voor verdere
              besluitvorming en bevat:
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: "📊", titel: "Overzicht per sector", tekst: "Per sector: baten, vermogens en inspanningen — inclusief verantwoordelijkheden" },
                { icon: "💰", titel: "Budgettering", tekst: "Kostenramingen per inspanning en een totaaloverzicht voor het programma" },
                { icon: "📅", titel: "Tijdlijn", tekst: "Planning per kwartaal met afhankelijkheden en mijlpalen" },
                { icon: "🔗", titel: "Lopende projecten", tekst: "Hoe bestaande initiatieven aansluiten bij de programmadoelen" },
                { icon: "🎯", titel: "Batenprofielen", tekst: "Meetbare indicatoren met eigenaren, huidige en streefwaarden" },
                { icon: "⚖️", titel: "Domeinbalans", tekst: "Verdeling van inspanningen over Mens, Processen, Data & Systemen en Cultuur" },
              ].map((item) => (
                <div key={item.titel} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h4 className="font-semibold text-white mb-1">{item.titel}</h4>
                  <p className="text-sm text-blue-100">{item.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━ TOTAALOVERZICHT PROCES ━━━ */}
        <section className="pb-8">
          <div className="bg-white rounded-2xl border border-cito-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-cito-border">
              <h3 className="font-bold text-gray-900 text-lg">Het traject in een oogopslag</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                {/* Stap flow */}
                {[
                  { label: "Klant in Beeld", sub: "Visie, doelen, scope", color: "#003366", num: "1" },
                  { label: "Per sector", sub: "PO · VO · Zakelijk", color: "#0066cc", num: "2" },
                  { label: "DIN-keten", sub: "Baten → Vermogens → Inspanningen", color: "#0891b2", num: "3" },
                  { label: "Cross-analyse", sub: "Synergieën & gaps", color: "#059669", num: "4" },
                  { label: "Programmaplan", sub: "Budget, tijdlijn, besluit", color: "#003366", num: "5" },
                ].map((stap, i, arr) => (
                  <div key={stap.label} className="flex sm:flex-col items-center gap-2 flex-1">
                    <div
                      className="rounded-xl p-4 text-center flex-1 w-full border-2"
                      style={{ borderColor: `${stap.color}25`, backgroundColor: `${stap.color}08` }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-2"
                        style={{ backgroundColor: stap.color }}
                      >
                        {stap.num}
                      </div>
                      <div className="font-semibold text-sm text-gray-900">{stap.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{stap.sub}</div>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="text-gray-300 rotate-90 sm:rotate-0 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ CTA ━━━ */}
        <section className="text-center pb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cito-blue text-white rounded-xl font-semibold hover:bg-cito-blue-light transition-colors shadow-sm"
          >
            Naar de app →
          </Link>
          <p className="text-sm text-gray-400 mt-3">
            Gebaseerd op &ldquo;Werken aan Programma&apos;s&rdquo; — Prevaas &amp; Van Loon
          </p>
        </section>
      </div>
    </main>
  );
}
