// Toont de zelfstandige Systeem & Data-schets (public/schetsen/systeem-data.html)
// in een volledige iframe, met een dunne app-balk erboven.
export default function SysteemDataSchets() {
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
          Systeem &amp; Data — donderdag-sessie
        </span>
      </div>
      <iframe
        src="/schetsen/systeem-data.html"
        title="Systeem & Data — schets"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
