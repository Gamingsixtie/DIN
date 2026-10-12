"use client";

// Stap 12 — citaat met vindplaats en verificatiebadge (T-12-16).
// geverifieerd === false → amber waarschuwing (citaat niet letterlijk in de brontekst gevonden);
// geverifieerd === true → klein groen vinkje; undefined (seed of handmatig) → geen badge.
// Leeg citaat → niets renderen. Gebruikt in het analysepaneel, de dekkingsmatrix en de vier punten.

const WAARSCHUWING_TOOLTIP =
  "Het citaat is niet woordelijk in de brontekst gevonden. Controleer het in het originele document.";

export function CitaatWaarschuwing() {
  return (
    <span
      title={WAARSCHUWING_TOOLTIP}
      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900"
    >
      <span aria-hidden="true">⚠</span> Citaat niet letterlijk teruggevonden — controleren
    </span>
  );
}

export default function CitaatBadge({
  citaat,
  vindplaats,
  geverifieerd,
  compact = false,
}: {
  citaat: string;
  vindplaats: string;
  geverifieerd?: boolean;
  compact?: boolean;
}) {
  if (!citaat.trim()) return null;
  const badge =
    geverifieerd === false ? (
      <CitaatWaarschuwing />
    ) : geverifieerd === true ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-800">
        <span aria-hidden="true">✓</span> letterlijk gecontroleerd
      </span>
    ) : null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <p className="text-sm text-gray-700">
        <span className="italic text-gray-800">“{citaat}”</span>
        <span className="ml-1">— {vindplaats.trim() ? vindplaats : "vindplaats te bepalen"}</span>
      </p>
      {badge && <div>{badge}</div>}
    </div>
  );
}
