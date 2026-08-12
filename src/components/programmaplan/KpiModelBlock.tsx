// ============================================================
// KPI-model — baten · vermogen · inspanningen (H3.1 programmaplan)
// ------------------------------------------------------------
// Definitieve set uit de stakeholdersessie (baten-KPI's vastgesteld) +
// het goedgekeurde 3sides-voorstel (inspanningen analysefase 2026).
// Eén-op-één overgenomen uit KPI-DEFINITIEF-SKETCH.html, in de opmaak
// van het programmaplan. Levend onderdeel: startwaarden volgen uit de
// nulmeting (Q3); doelwaarden en vermogen-indicatoren in de vervolgsessie.
// Bronnen: sessie-transcript (leidend) · goedgekeurd 3sides-voorstel ·
// DIN-netwerk · Werken aan Programma's H8. Geen verzonnen waarden.
// ============================================================

interface KpiRij {
  naam: string;
  definitie: string;
  start: string;
}

const BATEN: {
  sector: string;
  sectorKleur: string;
  titel: string;
  rijen: KpiRij[];
}[] = [
  {
    sector: "Zakelijk",
    sectorKleur: "bg-violet-700",
    titel: "Sterkere klantgerichtheid bij opdrachtgevers & kandidaten",
    rijen: [
      { naam: "Funnel-conversieratio per stap", definitie: "Succespercentage per overgang: lead → opportunity → offerte → deal", start: "Nulmeting Q3 → uitval in lange leadtrajecten minimaliseren" },
      { naam: "Offertes: aantal + % → opdracht", definitie: "Volume-driver in lange trajecten én het percentage dat opdracht wordt", start: "Nulmeting Q3 → meer offertes, hogere slaagkans" },
      { naam: "Conversie uit bezoeken", definitie: "Bezoeken waar een call-to-action of vervolg uit voortkomt", start: "Nulmeting Q3 → meer vervolg uit bezoeken" },
      { naam: "Serviceniveau & reactietijden", definitie: "Reactietijd op klantvragen (mail/telefoon)", start: "Nulmeting Q3 → sneller reageren" },
      { naam: "Churn / klantbehoud", definitie: "Verloren klanten per jaar", start: "Nulmeting Q3 → churn omlaag" },
    ],
  },
  {
    sector: "PO",
    sectorKleur: "bg-sky-700",
    titel: "Intensiever partnership",
    rijen: [
      { naam: "Groei productgebruik (cross-/up-sell)", definitie: "% scholen dat upgradet van basis naar compleet, of extra trainingen/diensten afneemt", start: "Nulmeting Q3 → meer cross-/up-sell conversie" },
      { naam: "Gebruiksintensiteit volledige lijn", definitie: "% scholen met de volledige doorlopende lijn: Toets + LVS + DST", start: "Nulmeting Q3 → meer scholen op de volledige lijn" },
      { naam: "Raamcontracten grote besturen", definitie: "Aantal totaalpakket-contracten voor alle scholen tegelijk", start: "Nulmeting Q3 → alle accountmanagers voeren dit uit" },
      { naam: "Ontwikkeldeadlines & beloftes gehaald", definitie: "% productbeloftes en deadlines richting klanten gehaald — meting bij productmanagers", start: "Nulmeting Q3 → beloftes waarmaken" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen/besturen per schooljaar", start: "Nulmeting Q3 → churn omlaag" },
    ],
  },
  {
    sector: "VO",
    sectorKleur: "bg-emerald-700",
    titel: "Hogere voorspelbaarheid commerciële begroting",
    rijen: [
      { naam: "Prognose-nauwkeurigheid", definitie: "Afwijking tussen de zomerprognose en de gerealiseerde omzet", start: "Nulmeting Q3 → afwijking minimaliseren" },
      { naam: "% meerjarige (3-jr) licenties", definitie: "Aandeel licenties omgezet van 1-jarig naar 3-jarig", start: "Nulmeting Q3 → aandeel 3-jarig omhoog" },
      { naam: "Inzicht in toetskeuzemomenten", definitie: "Markt-/klantreisdata op productniveau → voedt prognose en propositieontwikkeling", start: "Nulmeting Q3 → geïntegreerd in prognosemodellen" },
      { naam: "Churn / klantbehoud", definitie: "Verloren scholen per schooljaar", start: "Nulmeting Q3 → churn omlaag" },
    ],
  },
];

interface Inspanning {
  done?: boolean;
  tekst: string;
  detail?: string;
  tags: string[];
}

const INSPANNINGEN: { domein: string; kleur: string; items: Inspanning[] }[] = [
  {
    domein: "Programma-breed — de analysefase (Q3)",
    kleur: "border-cito-blue",
    items: [
      { done: true, tekst: "Kickoff & stakeholder-alignment — gedaan", tags: ["3sides"] },
      { tekst: "Adoptie-framework", detail: "gedrag & competenties per rol + de meetaanpak; gereed & gedragen door het programmateam", tags: ["3sides"] },
      { tekst: "Nulmeting", detail: "de startwaarden van alle KPI's + de objectieve stand van het vermogen", tags: ["3sides"] },
      { tekst: "Pilotgroep starten in 1 sector", detail: "sectorkeuze: nog te bepalen", tags: ["3sides"] },
    ],
  },
  {
    domein: "Cultuur",
    kleur: "border-amber-500",
    items: [
      { tekst: "Rituelen ontworpen & ingevoerd", detail: "klantverhalen delen · reflectiesessies · klantbezoeken", tags: ["2026", "3sides"] },
      { tekst: "Ambassadeurs per sector geïdentificeerd & aangehaakt", tags: ["Q4", "3sides"] },
    ],
  },
  {
    domein: "Data & Systemen",
    kleur: "border-violet-500",
    items: [
      { tekst: "Klantinformatie-landschap + huidig CRM in kaart", detail: "wat werkt · wat loopt vast · kosten & kansen; álle systemen waar klantdata zit (o.a. Topdesk · CRM · Dynax · Maileon · Webinargeek · Umbraco · SurveyMonkey · gebruikersplatform)", tags: ["Q3", "3sides"] },
      { tekst: "Contactgegevens centraliseren + koppeling Maileon ↔ CRM", detail: 'quick win — "klein beginnen"', tags: ["doorlopend", "3sides"] },
      { tekst: "Funnelontwerp + datakwaliteit-eisen", tags: ["2026", "sessie", "3sides"] },
      { tekst: "Klantreis vertaald naar CRM-requirements", detail: "input voor het CRM (huidig of nieuw) rond data en integratie", tags: ["Q4", "3sides"] },
      { tekst: "Platformopties in kaart", detail: "richting CRM bepaald in Q4 · formele keuze ~april '27", tags: ["2026", "sessie", "3sides"] },
      { tekst: "Op orde brengen & uitvoeren", detail: "inrichting, integraties en het borgen van datakwaliteit; niet alleen advies, ook realisatie", tags: ["2026", "3sides"] },
      { tekst: 'A5 "Centrale datavoorziening klantcommunicatie"', detail: "dit project loopt al en hangt onder Data & Systemen. Tijdens de analysefase moet blijken wat we uit dit project halen: wat onder de scope van Klant in Zicht gaat hangen en wat niet", tags: ["2026", "SIO"] },
    ],
  },
  {
    domein: "Processen",
    kleur: "border-emerald-500",
    items: [
      { tekst: "Klantreizen → funnelprocessen", detail: "fases · triggers · acties, incl. customer loops (retentie · migratie · nieuw)", tags: ["Q4", "3sides"] },
      { tekst: "Eenduidig Customer Success-proces · proactieve contactmomenten per klantreis", tags: ["2026", "3sides"] },
    ],
  },
  {
    domein: "Mens",
    kleur: "border-blue-500",
    items: [
      { tekst: "Eerste intervisiegroepen live", detail: "coaching & intervisie op de werkvloer", tags: ["Q4", "3sides"] },
      { tekst: "Curriculumontwerp vaardigheidstraining", detail: "met HR, o.b.v. echte klantcases (training 2027)", tags: ["2026", "sessie", "3sides"] },
    ],
  },
];

function Tag({ t }: { t: string }) {
  const stijl =
    t === "3sides"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : t === "sessie"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : t === "SIO"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span className={`inline-block text-[8px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ml-1 align-middle ${stijl}`}>
      {t}
    </span>
  );
}

function MaturityDots({ nu }: { nu: number }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`inline-block w-3 h-3 rounded-full border-2 ${
            i <= nu ? "bg-cyan-600 border-cyan-600" : "border-cyan-600 border-dashed bg-white"
          }`}
        />
      ))}
    </span>
  );
}

export default function KpiModelBlock() {
  return (
    <div className="space-y-6">
      {/* Intro + status */}
      <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-gray-700 leading-relaxed">
        <p>
          Dit hoofdstuk is de <strong>definitieve KPI-set</strong>: de baten-KPI&apos;s zijn{" "}
          <strong>vastgesteld in de stakeholdersessie</strong>; de inspanningen komen uit het{" "}
          <strong>goedgekeurde 3sides-voorstel</strong>. Het is een <strong>levend onderdeel</strong> van dit
          programmaplan: startwaarden volgen uit de nulmeting (Q3), doelwaarden en vermogen-indicatoren
          worden in de vervolgsessie vastgesteld.
        </p>
        <p className="mt-2 font-medium text-cyan-900">
          NPS &amp; klanttevredenheid = strategische resultante (kwartaal/jaar) — geen stuur-KPI. We sturen op
          de KPI&apos;s hieronder; de NPS meet of het werkt.
        </p>
      </div>

      {/* 1. Baten-KPI's */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-1">1 · Baten-KPI&apos;s — waarop we sturen</h4>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Per sector één baat met de bijbehorende KPI&apos;s. Eigenaar:{" "}
          <strong>Commercieel Manager</strong> · meetverantwoordelijke: <strong>Strategisch Marketeer</strong>.
        </p>
        <div className="space-y-4">
          {BATEN.map((b) => (
            <div key={b.sector} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded text-white ${b.sectorKleur}`}>
                  {b.sector}
                </span>
                <span className="text-xs font-semibold text-gray-800">{b.titel}</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-cito-blue/5">
                  <tr>
                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-cito-blue uppercase tracking-wider w-[28%]">KPI</th>
                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-cito-blue uppercase tracking-wider">Definitie</th>
                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-cito-blue uppercase tracking-wider w-[30%]">Startwaarde → waar naartoe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {b.rijen.map((r) => (
                    <tr key={r.naam} className="align-top">
                      <td className="px-3 py-2 font-semibold text-gray-800">
                        {r.naam}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.definitie}</td>
                      <td className="px-3 py-2 text-gray-600">{r.start}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
          <strong>Doelwaarden: te bepalen in de vervolgsessie, ná de nulmeting (Q3).</strong> Eisen per
          doelwaarde (Werken aan Programma&apos;s, H8): concreet getal <strong>mét meetmoment</strong> ·
          meetbaar · toetsbaar · motiverend · haalbaar t.o.v. de startwaarde · roept het gewenste gedrag op.
        </div>
      </div>

      {/* 2. Het gedeelde vermogen */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-1">2 · Het gedeelde vermogen — wat we moeten kunnen</h4>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          De baten hierboven komen er alleen als de organisatie iets nieuws <strong>kan</strong>. De drie
          sector-vermogens (§3.2) zijn samengevoegd tot één gedeeld vermogen:
        </p>
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <div className="text-sm font-bold text-gray-900">
              &ldquo;Klantgericht commercieel vermogen op basis van betrouwbare klantdata&rdquo;
            </div>
            <div className="text-xs text-gray-500 italic mt-0.5">
              — outside-in handelen, gedragen door CRM-fundament, eenduidige funnelprocessen, getrainde
              medewerkers en een cultuur van eigenaarschap.
            </div>
            <div className="text-[11px] text-gray-500 mt-2">
              Opbouw langs de vier domeinen — <strong className="text-gray-700">Cultuur · Mens · Data &amp; Systemen · Processen</strong>. Wát er
              per domein precies nodig is, komt uit de analysefase (deel 3).
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">
              Waar staan we — en waar willen we naartoe? (gevoelsmeting sessie, 1–5; de nulmeting Q3
              objectiveert)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-14">Zakelijk</span><MaturityDots nu={3} /><span className="text-cyan-700 font-semibold">3 → 5</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-14">PO</span><MaturityDots nu={2} /><span className="text-cyan-700 font-semibold">2 → 5</span></div>
              <div className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-14">VO</span><MaturityDots nu={2} /><span className="text-cyan-700 font-semibold">2 → 5</span></div>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-800">Hoe komen we van 2–3 naar 5?</strong> Niet in één sprong: de
            inspanningen volgen uit de gap tussen AS-IS en TO-BE — en om die gap scherp te krijgen,
            analyseren we eerst. <strong>① Analysefase 2026 + quick wins</strong> (deel 3) maakt per domein en
            rol scherp wát er moet veranderen; de nulmeting meet waar we staan → <strong>② uitkomst</strong>:
            de vervolg-inspanningen voor 2027 én de vermogen-indicatoren → <strong>③ vervolgsessie</strong>:
            indicatoren en doelwaarden vaststellen, mét een eigenaar per indicator.
          </div>
        </div>
      </div>

      {/* 3. Inspanningen */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-1">3 · Inspanningen — wat we gaan doen</h4>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          De acties van de analysefase 2026 (+ quick wins); 3sides voert uit. Elke inspanning is afvinkbaar:{" "}
          <strong>opgeleverd, ja of nee</strong> — dat is meteen de KPI voor 3sides. Dit overzicht is een{" "}
          <strong>levend document</strong>: uit de analysefase komen naar verwachting nieuwe inspanningen bij.
        </p>
        <div className="space-y-3">
          {INSPANNINGEN.map((d) => (
            <div key={d.domein} className={`border border-gray-200 border-l-4 ${d.kleur} rounded-lg p-3`}>
              <div className="text-xs font-bold text-gray-800 mb-2">{d.domein}</div>
              <ul className="space-y-1.5">
                {d.items.map((i) => (
                  <li key={i.tekst} className="text-xs text-gray-600 flex gap-2 leading-relaxed">
                    <span className={`flex-none ${i.done ? "text-emerald-600" : "text-gray-400"}`}>{i.done ? "☑" : "☐"}</span>
                    <span>
                      <strong className="text-gray-800">{i.tekst}</strong>
                      {i.detail && <> — {i.detail}</>}
                      {i.tags.map((t) => (
                        <Tag key={t} t={t} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 leading-relaxed">
          <span className="inline-block text-[9px] font-bold uppercase tracking-wide bg-cito-blue text-white rounded px-1.5 py-0.5 mr-2 align-middle">2027</span>
          <strong>Vooruitblik — nemen we later samen door</strong> (dan toetsen we ook of we iets missen):
          uitrol 3e sector · training- &amp; coachingsprogramma live (met HR) · <strong>eerste KPI-rapportage (Q1)</strong> —
          de eerste meting van dit model tegen de nulmeting · borging &amp; co-creatie met klanten · KPI&apos;s
          aangescherpt voor de volgende cyclus · van CRM naar CSM · 3sides → sparringpartner.
        </div>
      </div>

      {/* Bemensing */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-1">Wat elke inspanning nodig heeft</h4>
        <p className="text-xs text-gray-500 mb-2 leading-relaxed">
          Een <strong>inspanningsleider</strong> (trekker) · <strong>teamleden &amp; capaciteit</strong> uit de
          sectoren · een heldere <strong>output-definitie</strong> (wanneer is het klaar j/n) · een plek in de
          planning. Bemensing zoals nu belegd:
        </p>
        <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li><strong>3sides:</strong> topic leads voor Processen en Data &amp; Systemen — senior stuurt op richting, medior op uitvoering; specialisten op afroep</li>
          <li><strong>Inspanningsleiders Cito</strong> (kernteam): Cultuur &amp; Mens — <strong>HR-manager</strong> · Data &amp; Systemen — <strong>SIO</strong> · Processen — <strong>nog te benoemen</strong> (volledig overzicht per domein: §3.3)</li>
          <li><strong>Domeineigenaar Data &amp; Systemen:</strong> Manager Data &amp; Technologie</li>
          <li><strong>Curriculum vaardigheidstraining:</strong> samen met HR ontworpen — HR-manager (inspanningsleider Mens) + HR-medewerker voor curriculum &amp; integratie</li>
          <li><strong>Cultuurlijn:</strong> gedragen door het volledige &ldquo;MT&rdquo; — sectormanagers, commercieel manager én HR-manager: voorleven, en het &ldquo;MT-besluit&rdquo; over de leiderschapsaanpak</li>
          <li className="text-amber-700"><strong>Nog te bepalen:</strong> inspanningsleider Processen + teamleden per inspanning</li>
        </ul>
      </div>

      {/* Randvoorwaarden */}
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-1">Randvoorwaarden — regelen, niet meten</h4>
        <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li><strong>Mandaat &amp; escalatiepad</strong> naar de directie — actiemodus, niet stilvallen op de interne organisatie</li>
          <li><strong>Beschikbaarheid &amp; commitment</strong> vooraf afgesproken — afwezigheid is hoge uitzondering</li>
          <li><strong>Regie &amp; programmaleiding</strong> bij 3sides — voortgang, tempo en verbinding tussen de sectoren</li>
          <li><strong>Doorlopende leiderschapsondersteuning</strong> door 3sides — voorbeeldgedrag, silo&apos;s verbinden</li>
          <li><strong>Commitment van alle sectormanagers</strong></li>
          <li><strong>Juiste mensen op de juiste plek</strong> — rollen/profielen kritisch bekijken, gericht werven waar nodig</li>
          <li><strong>Scope: lopende projecten aanhaken</strong> — het lopende A5-project &ldquo;Centrale datavoorziening klantcommunicatie&rdquo; hangt onder Data &amp; Systemen; de analysefase bepaalt wat ervan binnen de scope van Klant in Zicht valt en wat niet</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Inkoop:</strong> 3sides-as-a-service-abonnement voor 6 maanden (jul–dec 2026, 232 u/mnd);
          voor 2027 worden de uren herijkt op basis van de opgedane ervaring.
        </p>
      </div>

      {/* Vervolg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-bold text-gray-800 mb-2">Nu, ná de sessie (Q3)</div>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4 leading-relaxed">
            <li>KPI-set delen &amp; valideren met de stakeholders/eigenaren</li>
            <li>Analysefase draait: nulmeting · adoptie-framework · klantinformatie-landschap &amp; CRM in kaart · eerste quick win</li>
          </ol>
        </div>
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-bold text-gray-800 mb-2">Eén gecombineerde vervolgsessie (na nulmeting + adoptie-framework)</div>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4 leading-relaxed">
            <li>Doelwaarden vaststellen per baten-KPI — langs de eisen</li>
            <li>Vermogen-indicatoren kiezen — per domein, mét eigenaar</li>
            <li>❓ Kwaliteit van gesprekken als extra PO-KPI (3sides noemt deze; sessie besloot dit nog niet)</li>
            <li>Meetritme afspreken — wie rapporteert wat, wanneer (→ eerste KPI-rapportage Q1 &apos;27)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
