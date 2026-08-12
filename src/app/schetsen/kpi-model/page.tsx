// Toont het definitieve KPI-model (public/schetsen/kpi-model.html)
// in een volledige iframe, met een dunne app-balk erboven.
export default function KpiModelPagina() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#003366",
          color: "#fff",
          padding: "8px 16px",
          fontSize: 13,
          display: "flex",
          gap: 14,
          alignItems: "center",
          flex: "none",
        }}
      >
        <a href="/schetsen" style={{ color: "#cbd5e1", textDecoration: "none" }}>
          ← Schetsen
        </a>
        <span style={{ fontWeight: 600 }}>
          KPI-model — baten · vermogen · inspanningen
        </span>
      </div>
      <iframe
        src="/schetsen/kpi-model.html"
        title="KPI-model Klant in Zicht"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
