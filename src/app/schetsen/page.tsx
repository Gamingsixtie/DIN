import Link from "next/link";

// Sessie-schetsen per domein. Nu Systeem & Data (donderdag-sessie);
// de andere domeinen volgen — daarna eigen platform per domein.
const SCHETSEN = [
  {
    domein: "Systeem & Data",
    slug: "systeem-data",
    kleur: "#7c3aed",
    actief: true,
    desc: "Donderdag-sessie (Cornelis, Rick & 3sides) — analyse, twee sporen, A5 centrale datavoorziening, baten & KPI-frame.",
  },
  { domein: "Cultuur", slug: "cultuur", kleur: "#d97706", actief: false, desc: "Binnenkort." },
  { domein: "Mens", slug: "mens", kleur: "#2563eb", actief: false, desc: "Binnenkort." },
  { domein: "Processen", slug: "processen", kleur: "#059669", actief: false, desc: "Binnenkort." },
];

export default function SchetsenPage() {
  return (
    <main className="min-h-screen bg-cito-bg pb-12">
      <header className="bg-cito-blue text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-200 text-sm hover:text-white">
            ← Terug
          </Link>
          <h1 className="text-3xl font-bold mt-1">Schetsen per domein</h1>
          <p className="text-blue-200 mt-1">
            Sessie-visuals ter bespreking. Volgende stap, zodra alles definitief
            is: een eigen platform per domein.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {SCHETSEN.map((s) =>
          s.actief ? (
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
                  {s.domein}
                </h3>
                <span className="ml-auto text-cito-accent group-hover:translate-x-1 transition-transform text-lg">
                  →
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1.5">{s.desc}</p>
            </a>
          ) : (
            <div
              key={s.slug}
              className="bg-white rounded-xl border border-cito-border p-5 opacity-60"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-none"
                  style={{ background: s.kleur }}
                />
                <h3 className="font-semibold text-gray-700">{s.domein}</h3>
                <span className="ml-auto text-xs text-gray-400 uppercase tracking-wide">
                  binnenkort
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1.5">{s.desc}</p>
            </div>
          )
        )}
      </div>
    </main>
  );
}
