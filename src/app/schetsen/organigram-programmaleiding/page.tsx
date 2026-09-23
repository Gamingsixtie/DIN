// Toont de zelfstandige organigram-schets (public/schetsen/organigram-programmaleiding.html)
// in een volledige iframe, met een dunne app-balk erboven. Zelfde patroon als systeem-data.
export default function OrganigramSchets() {
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
          Organigram — regie en inhoud in de programmaleiding
        </span>
      </div>
      <iframe
        src="/schetsen/organigram-programmaleiding.html"
        title="Organigram programmaleiding — schets"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}
