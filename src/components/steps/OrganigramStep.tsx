"use client";

// Stap 10 — Organigram: toont de schets van de programmaorganisatie
// (public/schetsen/organigram-programmaleiding.html) binnen de sessieflow.
// De schets is de bron van waarheid; deze stap toont hem 1-op-1 in een iframe.

const SCHETS_URL = "/schetsen/organigram-programmaleiding.html";
const PAGINA_URL = "/schetsen/organigram-programmaleiding";

export default function OrganigramStep() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-3xl">
          Voorstel voor de programmaorganisatie van Klant in Zicht: regie en inhoud in de
          programmaleiding, de vier werkstromen, inspanningsleiders, domeineigenaren en 3sides.
          Status: voorstel, vast te stellen door de programma-eigenaar.
        </p>
        <a
          href={PAGINA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none px-4 py-2 rounded-lg text-sm font-semibold bg-cito-blue text-white hover:bg-cito-blue/90 transition-colors"
        >
          Open in eigen tabblad ↗
        </a>
      </div>

      <div className="rounded-xl border border-cito-border overflow-hidden bg-white">
        <iframe
          src={SCHETS_URL}
          title="Organigram programmaleiding — schets"
          className="w-full"
          style={{ height: "80vh", border: "none" }}
        />
      </div>
    </div>
  );
}
