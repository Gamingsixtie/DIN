"use client";

import Link from "next/link";

/* ─── constanten ─── */
const KETEN = [
  { label: "Doelen", sub: "Programmadoelstellingen uit Klant in Beeld", voorbeeld: "\"Outside-in competentie organisatiebreed verankeren\"", color: "#003366" },
  { label: "Baten", sub: "Gewenste effecten voor klant, markt en organisatie", voorbeeld: "\"NPS stijgt van 32 naar 45\"", color: "#0066cc" },
  { label: "Vermogens", sub: "Wat de organisatie moet kunnen om baten te realiseren", voorbeeld: "\"Medewerkers beheersen klantgesprek-methodiek\"", color: "#0891b2" },
  { label: "Inspanningen", sub: "Concrete projecten en activiteiten die vermogens opbouwen", voorbeeld: "\"Training outside-in werken (Q2 2026)\"", color: "#059669" },
] as const;

const DOMEINEN = [
  { label: "Mens", color: "#2563eb", voorbeelden: "Opleiding, training, bemensing, competentieontwikkeling" },
  { label: "Processen", color: "#059669", voorbeelden: "Werkwijzen, procedures, governance, samenwerking" },
  { label: "Data & Systemen", color: "#7c3aed", voorbeelden: "IT-systemen, data-infrastructuur, tooling, integraties" },
  { label: "Cultuur", color: "#d97706", voorbeelden: "Gedrag, mindset, waarden, leiderschapsontwikkeling" },
] as const;

const SECTOREN = [
  { naam: "PO", omschrijving: "Primair onderwijs", kleur: "#2563eb" },
  { naam: "VO", omschrijving: "Voortgezet onderwijs", kleur: "#7c3aed" },
  { naam: "Zakelijk", omschrijving: "Zakelijk / Professionals", kleur: "#059669" },
] as const;

/* ─── icons ─── */
function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M6 14h16m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepBadge({ num, color = "#003366" }: { num: number; color?: string }) {
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
    <main className="min-h-screen bg-cito-bg print:bg-white">
      {/* ━━━ HERO ━━━ */}
      <header className="relative overflow-hidden bg-cito-blue text-white">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-14 md:py-18">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-8 transition-colors print:hidden"
          >
            ← Terug naar sessies
          </Link>

          <p className="text-blue-200 text-sm font-semibold tracking-wider uppercase mb-3">
            Doelen-Inspanningennetwerk (DIN)
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-2xl">
            Van Visie naar
            <br />
            Programmaplan
          </h1>
          <p className="text-blue-100 text-lg mt-5 max-w-xl leading-relaxed">
            Deze toelichting laat zien hoe we gezamenlijke programmadoelen stap voor stap
            vertalen naar concrete inspanningen per sector — en uiteindelijk naar een
            eerste opzet van het programmaplan.
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

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-14">

        {/* ━━━ WAAROM DIT TRAJECT? (geen nummer) ━━━ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Waarom dit traject?</h2>
          <p className="text-gray-500 mb-6">De aanleiding en het beoogde resultaat</p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-2">Van strategie naar actie</h3>
              <p className="text-gray-600 leading-relaxed">
                Met <strong>Klant in Beeld</strong> hebben we een gezamenlijke visie en
                programmadoelen vastgesteld. De volgende stap is: <em>hoe vertalen we die
                doelen naar concrete projecten en activiteiten?</em> Het Doelen-Inspanningennetwerk
                (DIN) is het instrument dat we daarvoor gebruiken — een beproefde aanpak
                om stap voor stap van doel naar actie te komen.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-2">Eerste opzet programmaplan</h3>
              <p className="text-gray-600 leading-relaxed">
                Het eindresultaat is een <strong>eerste opzet van het programmaplan</strong>:
                per sector een overzicht van benodigde inspanningen, inclusief <strong>budgettering</strong>,
                tijdplanning en verantwoordelijkheden. Dit vormt de basis voor verdere
                besluitvorming en goedkeuring.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━ STAP 1: KLANT IN BEELD ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-5">
            <StepBadge num={1} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Startpunt: Klant in Beeld</h2>
              <p className="text-gray-500 mt-1">De gezamenlijke kaders als fundament</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-cito-border overflow-hidden shadow-sm">
            <div className="bg-cito-blue/[0.03] border-b border-cito-border px-6 py-4">
              <p className="text-gray-700 leading-relaxed">
                Het traject begint bij de uitkomsten van <strong>Klant in Beeld</strong>.
                Dit zijn de gezamenlijk vastgestelde kaders waar alle sectoren hun
                inspanningen aan koppelen.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cito-border">
              <div className="p-5">
                <h4 className="font-bold text-gray-900 mb-1">Programmavisie</h4>
                <p className="text-sm text-gray-500">
                  De gezamenlijke stip op de horizon — waar wil de organisatie naartoe?
                </p>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-gray-900 mb-1">Programmadoelen</h4>
                <p className="text-sm text-gray-500">
                  De top-doelen die via een stemmronde zijn vastgesteld en geprioriteerd.
                </p>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-gray-900 mb-1">Afbakening</h4>
                <p className="text-sm text-gray-500">
                  Wat valt binnen en buiten de afbakening van het programma.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ STAP 2: PER SECTOR HET DIN UITWERKEN ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-5">
            <StepBadge num={2} color="#0066cc" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Per sector het DIN uitwerken</h2>
              <p className="text-gray-500 mt-1">Elke sector vertaalt de doelen naar baten, vermogens en inspanningen</p>
            </div>
          </div>

          <p className="text-gray-600 mb-5 leading-relaxed max-w-3xl">
            Elke sector werkt het Doelen-Inspanningennetwerk apart uit. Bij elk programmadoel
            stellen we de <strong>hoe-vraag</strong>: <em>&ldquo;Hoe bereiken we dit doel?&rdquo;</em> —
            welke baten willen we zien, welke vermogens zijn daarvoor nodig, en welke
            inspanningen bouwen die vermogens op? Andersom kun je ook de <strong>waartoe-vraag</strong> stellen:
            <em>&ldquo;Waartoe dient deze inspanning?&rdquo;</em> — zo controleer je of elke
            inspanning daadwerkelijk bijdraagt aan een programmadoel.
          </p>

          {/* sector cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {SECTOREN.map((s) => (
              <div
                key={s.naam}
                className="bg-white rounded-xl border-2 p-4 shadow-sm text-center"
                style={{ borderColor: `${s.kleur}30` }}
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-base mb-2"
                  style={{ backgroundColor: s.kleur }}
                >
                  {s.naam}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm">{s.omschrijving}</h4>
              </div>
            ))}
          </div>

          {/* DIN keten uitleg */}
          <div className="bg-white rounded-2xl border border-cito-border shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-cito-border bg-gray-50/50">
              <h3 className="font-bold text-gray-900">De vier niveaus van het DIN</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Per doel doorloop je de keten: van doel naar baat, van baat naar vermogen, van vermogen naar inspanning
              </p>
            </div>

            <div className="p-6 space-y-5">
              {KETEN.map((k, i) => (
                <div key={k.label} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
                    style={{ backgroundColor: k.color }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base" style={{ color: k.color }}>
                      {k.label}
                    </h4>
                    <p className="text-sm text-gray-600 mt-0.5">{k.sub}</p>
                    <p className="text-xs text-gray-400 mt-1 italic">Voorbeeld: {k.voorbeeld}</p>
                  </div>
                </div>
              ))}

              {/* veranderstrategie */}
              <div className="mt-2 pt-4 border-t border-cito-border">
                <p className="text-sm text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">Veranderstrategie:</strong> Tussen de bovenste
                  niveaus (doelen en baten) en de onderste niveaus (vermogens en inspanningen)
                  ligt de <em>veranderstrategie</em>. Dit is de bewuste keuze <em>hoe</em> de
                  organisatie de verandering aanpakt: stapsgewijs of in een keer? Via training
                  en ontwikkeling, via nieuwe systemen, of via cultuurverandering?
                </p>
              </div>
            </div>
          </div>

          {/* batenprofielen uitleg */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <h4 className="font-bold text-blue-900 mb-1">Batenprofielen: baten concreet maken</h4>
            <p className="text-blue-800 text-sm leading-relaxed">
              Elke baat wordt uitgewerkt in een <strong>batenprofiel</strong>: wat meten we
              precies (indicator), wie is verantwoordelijk (eigenaar), wat is de huidige
              situatie (nulmeting), wat willen we bereiken (streefwaarde), en wanneer meten
              we het resultaat (meetmoment). Zo wordt elke baat toetsbaar en concreet.
            </p>
          </div>

          {/* 4 domeinen — geintegreerd bij inspanningen */}
          <div className="bg-white rounded-2xl border border-cito-border shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-cito-border bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Inspanningen in vier domeinen</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Elke inspanning valt in een van deze domeinen — zo borgen we een evenwichtig programma
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-cito-border">
              {DOMEINEN.map((d) => (
                <div key={d.label} className="bg-white p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <h4 className="font-bold text-sm" style={{ color: d.color }}>
                      {d.label}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-500">{d.voorbeelden}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lopende projecten — prominent */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="font-bold text-amber-900 mb-1">Lopende projecten inhangen</h4>
            <p className="text-amber-800 text-sm leading-relaxed">
              Naast nieuwe inspanningen brengen we ook <strong>bestaande en lopende
              projecten</strong> in lijn met de kaders van Klant in Beeld. Zo wordt
              zichtbaar hoe het huidige werk bijdraagt aan de programmadoelen — en
              waar eventueel bijsturing of aanvulling nodig is.
            </p>
          </div>
        </section>

        {/* ━━━ STAP 3: CROSS-ANALYSE ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-5">
            <StepBadge num={3} color="#059669" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cross-analyse</h2>
              <p className="text-gray-500 mt-1">Samenbrengen en verbanden leggen over sectoren heen</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-cito-border p-6 shadow-sm">
            <p className="text-gray-600 leading-relaxed mb-5">
              Nadat elke sector het Doelen-Inspanningennetwerk heeft uitgewerkt, brengen
              we de resultaten samen. De cross-analyse maakt zichtbaar:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h4 className="font-semibold text-green-900 mb-1">Synergieën</h4>
                <p className="text-sm text-green-700">
                  Waar overlappen inspanningen? Waar kan worden samengewerkt tussen sectoren?
                </p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <h4 className="font-semibold text-orange-900 mb-1">Witte vlekken</h4>
                <p className="text-sm text-orange-700">
                  Zijn er doelen zonder inspanningen? Ontbreken er vermogens of baten?
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-1">Domeinbalans</h4>
                <p className="text-sm text-blue-700">
                  Is er een gezonde verdeling over alle vier de inspanningsdomeinen?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ STAP 4: PROGRAMMAPLAN ━━━ */}
        <section>
          <div className="flex items-start gap-4 mb-5">
            <StepBadge num={4} color="#003366" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Programmaplan</h2>
              <p className="text-gray-500 mt-1">Het eerste opzet als basis voor besluitvorming</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cito-blue to-[#004d99] rounded-2xl p-7 text-white shadow-lg">
            <p className="text-blue-100 leading-relaxed mb-5 max-w-2xl">
              Alle DIN-informatie wordt samengevoegd tot een <strong className="text-white">eerste
              opzet van het programmaplan</strong>. Dit is de graadplaat voor verdere
              besluitvorming en bevat:
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { titel: "Overzicht per sector", tekst: "Baten, vermogens en inspanningen per sector — inclusief verantwoordelijkheden" },
                { titel: "Budgettering", tekst: "Kostenramingen per inspanning en een totaaloverzicht voor het programma" },
                { titel: "Tijdlijn & planning", tekst: "Planning per kwartaal met afhankelijkheden en mijlpalen" },
                { titel: "Lopende projecten", tekst: "Hoe bestaande initiatieven aansluiten bij de programmadoelen" },
                { titel: "Batenprofielen", tekst: "Meetbare indicatoren met eigenaren, huidige waarden, streefwaarden en meetmomenten" },
                { titel: "Domeinbalans", tekst: "Verdeling over Mens, Processen, Data & Systemen en Cultuur" },
              ].map((item) => (
                <div key={item.titel} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold text-white text-sm mb-1">{item.titel}</h4>
                  <p className="text-xs text-blue-100 leading-relaxed">{item.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━ OVERZICHT ━━━ */}
        <section className="pb-4">
          <div className="bg-white rounded-2xl border border-cito-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-cito-border">
              <h3 className="font-bold text-gray-900">Het traject in een oogopslag</h3>
            </div>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {[
                  { label: "Klant in Beeld", sub: "Visie, doelen, afbakening", color: "#003366", num: "1" },
                  { label: "Per sector het DIN", sub: "PO · VO · Zakelijk", color: "#0066cc", num: "2" },
                  { label: "Cross-analyse", sub: "Synergieën & witte vlekken", color: "#059669", num: "3" },
                  { label: "Programmaplan", sub: "Budget, tijdlijn, besluit", color: "#003366", num: "4" },
                ].map((stap, i, arr) => (
                  <div key={stap.label} className="flex sm:flex-col items-center gap-2 flex-1">
                    <div
                      className="rounded-xl p-3 text-center flex-1 w-full border-2"
                      style={{ borderColor: `${stap.color}25`, backgroundColor: `${stap.color}08` }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs mx-auto mb-1.5"
                        style={{ backgroundColor: stap.color }}
                      >
                        {stap.num}
                      </div>
                      <div className="font-semibold text-sm text-gray-900">{stap.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stap.sub}</div>
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
        <section className="text-center pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cito-blue text-white rounded-xl font-semibold hover:bg-cito-blue-light transition-colors shadow-sm print:hidden"
          >
            Naar de app →
          </Link>
          <p className="text-sm text-gray-400 mt-3">
            Gebaseerd op &ldquo;Werken aan Programma&apos;s&rdquo; — Prevaas &amp; Van Loon (Wijnen &amp; Van der Tak, 2002)
          </p>
        </section>
      </div>
    </main>
  );
}
