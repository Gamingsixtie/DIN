"use client";

interface LoadingOverlayProps {
  title?: string;
  description?: string;
}

export default function LoadingOverlay({
  title = "AI Cross-analyse wordt uitgevoerd",
  description = "De AI analyseert synergie\u00ebn, gaps en hefboomwerking over alle sectoren en domeinen...",
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Animated DIN chain */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["Doelen", "Baten", "Vermogens", "Inspanningen"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
                  style={{
                    backgroundColor: ["#003366", "#0066cc", "#0891b2", "#059669"][i],
                    animationDelay: `${i * 200}ms`,
                    animationDuration: "1.5s",
                  }}
                >
                  {["D", "B", "V", "I"][i]}
                </div>
                <span className="text-[9px] text-gray-400 mt-1">{label}</span>
              </div>
              {i < 3 && (
                <div className="flex gap-0.5 mt-[-12px]">
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      className="w-1 h-1 rounded-full bg-gray-300 animate-pulse"
                      style={{ animationDelay: `${i * 200 + dot * 100}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-cito-blue mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {description}
        </p>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cito-blue via-cito-accent to-din-inspanningen rounded-full"
            style={{ animation: "loading-progress 3s ease-in-out infinite" }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">Dit kan 10-20 seconden duren</p>

        <style>{`
          @keyframes loading-progress {
            0% { width: 0%; }
            50% { width: 80%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}
