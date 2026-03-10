"use client";

interface DINChainIndicatorProps {
  activeSection?: "baten" | "vermogens" | "inspanningen";
}

const CHAIN_ITEMS = [
  { key: "doelen", label: "Doelen", color: "text-din-doelen", bg: "bg-din-doelen/10", sub: "Programmadoelen uit KiB" },
  { key: "baten", label: "Baten", color: "text-din-baten", bg: "bg-din-baten/10", sub: "Gewenste effecten" },
  { key: "vermogens", label: "Vermogens", color: "text-din-vermogens", bg: "bg-din-vermogens/10", sub: "Wat moet de organisatie kunnen?" },
  { key: "inspanningen", label: "Inspanningen", color: "text-din-inspanningen", bg: "bg-din-inspanningen/10", sub: "Concrete acties" },
] as const;

export default function DINChainIndicator({ activeSection }: DINChainIndicatorProps) {
  return (
    <div className="py-3 px-4 bg-gray-50 rounded-lg mb-4">
      <div className="flex items-center gap-1">
        {CHAIN_ITEMS.map((item, i) => (
          <div key={item.key} className="flex items-center">
            <div
              className={`text-center px-3 py-1.5 rounded-md transition-colors ${
                activeSection === item.key
                  ? `${item.bg} border border-gray-200 shadow-sm`
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
              <div className="text-[9px] text-gray-400 max-w-[100px]">{item.sub}</div>
            </div>
            {i < CHAIN_ITEMS.length - 1 && (
              <span className="text-gray-300 text-xs mx-1">{"\u2192"}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[10px] text-gray-400 italic">
          Hoe-vraag {"\u2192"}: Hoe bereik je het doel? {"\u2192"} Baten {"\u2192"} Vermogens {"\u2192"} Inspanningen
        </span>
        <span className="text-[10px] text-gray-400 italic">
          {"\u2190"} Waartoe-vraag: Waartoe dient deze inspanning?
        </span>
      </div>
    </div>
  );
}
