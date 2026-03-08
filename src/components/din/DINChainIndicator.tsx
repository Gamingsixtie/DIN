"use client";

interface DINChainIndicatorProps {
  activeSection?: "baten" | "vermogens" | "inspanningen";
}

const CHAIN_ITEMS = [
  { key: "doelen", label: "Doelen", color: "text-din-doelen", sub: "(KiB)" },
  { key: "baten", label: "Baten", color: "text-din-baten", sub: "(Hoe?)" },
  { key: "vermogens", label: "Vermogens", color: "text-din-vermogens", sub: "(Hoe?)" },
  { key: "inspanningen", label: "Inspanningen", color: "text-din-inspanningen", sub: "(Hoe?)" },
] as const;

export default function DINChainIndicator({ activeSection }: DINChainIndicatorProps) {
  return (
    <div className="flex items-center gap-1 py-3 px-4 bg-gray-50 rounded-lg mb-4">
      {CHAIN_ITEMS.map((item, i) => (
        <div key={item.key} className="flex items-center">
          <div
            className={`text-center px-2 py-1 rounded ${
              activeSection === item.key
                ? "bg-white border border-gray-200 shadow-sm"
                : ""
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                activeSection === item.key ? item.color : "text-gray-500"
              }`}
            >
              {item.label}
            </div>
            <div className="text-[10px] text-gray-400">{item.sub}</div>
          </div>
          {i < CHAIN_ITEMS.length - 1 && (
            <span className="text-gray-300 text-xs mx-1">→</span>
          )}
        </div>
      ))}
      <div className="ml-auto text-[10px] text-gray-400 italic">
        ← Waartoe?
      </div>
    </div>
  );
}
