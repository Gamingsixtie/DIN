// Toont de korte organigram-schets (public/schetsen/organigram-kort.html)
// in een volledige iframe, met een dunne app-balk erboven. Zelfde patroon als
// organigram-programmaleiding en systeem-data.
export default function OrganigramKortSchets() {
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
        <span style={{ fontWeight: 600 }}>Organigram Klant in Zicht — in het kort</span>
        <a
          href="/schetsen/organigram-programmaleiding"
          style={{ marginLeft: "auto", color: "#cbd5e1", textDecoration: "none" }}
        >
          Uitgebreide versie →
        </a>
      </div>
      <iframe
        src="/schetsen/organigram-kort.html"
        title="Organigram Klant in Zicht — korte schets"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
