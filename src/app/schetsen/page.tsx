import Link from "next/link";

// Sessie-schetsen. Het definitieve KPI-model heeft een eigen kop op de
// hoofdpagina (/kpi-model) en hoort hier niet meer bij.
const PAGINAS = [
  {
    titel: "Organigram — in het kort",
    slug: "organigram-kort",
    kleur: "#003366",
    desc: "Programmaorganisatie Klant in Zicht op één pagina: programmamanagement, de vier werkstromen met 3sides-lead en Cito-lead, domeineigenaren, stuurgroep, KPI's per laag en de afspraken uit de meeting.",
  },
  {
    titel: "Organigram — uitgebreide onderbouwing",
    slug: "organigram-programmaleiding",
    kleur: "#0e7490",
    desc: "De onderbouwing uit Werken aan Programma's: verhouding programmamanager en architect, gedeelde zone en RASCI, de vier werkstromen met voorbeelden, wie beslist wat.",
  },
  {
    titel: "Systeem & Data — sessievoorbereiding",
    slug: "systeem-data",
    kleur: "#7c3aed",
    desc: "Sessie Cornelis, Rick & 3sides — analyse, twee sporen, A5 centrale datavoorziening.",
  },
];

export default function SchetsenPage() {
  return (
    <main className="min-h-screen bg-cito-bg pb-12">
      <header className="bg-cito-blue text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-200 text-sm hover:text-white">
            ← Terug
          </Link>
          <h1 className="text-3xl font-bold mt-1">Schetsen</h1>
          <p className="text-blue-200 mt-1">
            Sessie-visuals van het programma Klant in Zicht.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {PAGINAS.map((s) => (
          <a
            key={s.slug}
            href={`/schetsen/${s.slug}`}
            className="block bg-white rounded-xl border border-cito-border p-5 shadow-sm hover:shadow-md hover:border-cito-blue/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-none"
                style={{ background: s.kleur }}
              />
              <h3 className="font-semibold text-gray-900 group-hover:text-cito-blue transition-colors">
                {s.titel}
              </h3>
              <span className="ml-auto text-cito-accent group-hover:translate-x-1 transition-transform text-lg">
                →
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5">{s.desc}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
