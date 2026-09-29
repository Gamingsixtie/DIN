"use client";

// Stap 10 — Organigram: toont de korte schets van de programmaorganisatie
// (public/schetsen/organigram-kort.html) binnen de sessieflow. De uitgebreide
// onderbouwing staat in public/schetsen/organigram-programmaleiding.html.
// Bron van waarheid zijn de root-bestanden ORGANIGRAM-KORT-SKETCH.html en
// ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html; bij wijziging opnieuw kopiëren
// (de onderlinge knop-links worden daarbij omgezet naar de app-routes).

const SCHETS_URL = "/schetsen/organigram-kort.html";
const PAGINA_URL = "/schetsen/organigram-kort";
const UITGEBREID_URL = "/schetsen/organigram-programmaleiding";

export default function OrganigramStep() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-3xl">
          Programmaorganisatie van Klant in Zicht in het kort: programmamanagement (regie en
          inhoud), de vier werkstromen met 3sides-lead en Cito-lead, domeineigenaren, stuurgroep
          en overlegritme, plus de afspraken uit de stuurgroep- en programmateam-meeting.
          Status: voorstel, vast te stellen door de programma-eigenaar.
        </p>
        <div className="flex flex-none flex-wrap gap-2">
          <a
            href={UITGEBREID_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-cito-blue text-cito-blue bg-white hover:bg-cito-blue/5 transition-colors"
          >
            Uitgebreide versie ↗
          </a>
          <a
            href={PAGINA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-cito-blue text-white hover:bg-cito-blue/90 transition-colors"
          >
            Open in eigen tabblad ↗
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-cito-border overflow-hidden bg-white">
        <iframe
          src={SCHETS_URL}
          title="Organigram Klant in Zicht — korte schets"
          className="w-full"
          style={{ height: "80vh", border: "none" }}
        />
      </div>
    </div>
  );
}
