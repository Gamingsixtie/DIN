export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-cito-blue">
            Doelen-Inspanningennetwerk
          </h1>
          <p className="text-lg text-gray-600">
            Vertaal programmadoelen naar baten, vermogens en inspanningen
          </p>
        </div>

        <div className="bg-cito-surface rounded-xl border border-cito-border p-8 shadow-sm">
          <div className="flex items-center justify-center gap-3 text-sm font-medium">
            <span className="px-3 py-1.5 rounded-lg bg-din-doelen text-white">
              Doelen
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-baten text-white">
              Baten
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-vermogens text-white">
              Vermogens
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-din-inspanningen text-white">
              Inspanningen
            </span>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 text-xs text-gray-500">
            <div className="p-2 rounded bg-domain-mens/10 text-domain-mens font-medium">
              Mens
            </div>
            <div className="p-2 rounded bg-domain-processen/10 text-domain-processen font-medium">
              Processen
            </div>
            <div className="p-2 rounded bg-domain-data/10 text-domain-data font-medium">
              Data & Systemen
            </div>
            <div className="p-2 rounded bg-domain-cultuur/10 text-domain-cultuur font-medium">
              Cultuur
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Vervolg-app op Klant in Beeld — Programma Planvorming
        </p>
      </div>
    </main>
  );
}
