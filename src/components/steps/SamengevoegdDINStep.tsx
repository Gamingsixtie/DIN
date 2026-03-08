"use client";

import { useSession } from "@/lib/session-context";
import MergedDINView from "@/components/din/MergedDINView";

export default function SamengevoegdDINStep() {
  const { session, setCurrentStep } = useSession();

  if (!session) return null;

  const hasDINData =
    session.benefits.length > 0 ||
    session.capabilities.length > 0 ||
    session.efforts.length > 0;

  if (!hasDINData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Nog geen DIN-data beschikbaar. Vul eerst per sector het DIN-netwerk in
          via stap 2 (Sectorwerk).
        </p>
        <button
          onClick={() => setCurrentStep("sectorwerk")}
          className="mt-3 px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
        >
          Ga naar Sectorwerk →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
        <strong>Samengevoegd overzicht:</strong> Alle sectoren gecombineerd in
        één DIN-netwerk. Per doel zie je welke baten, vermogens en inspanningen
        per sector zijn ingevuld. Gedeelde vermogens worden als synergie
        gemarkeerd.
      </div>

      <MergedDINView
        session={session}
        onSwitchToEdit={() => setCurrentStep("sectorwerk")}
      />
    </div>
  );
}
