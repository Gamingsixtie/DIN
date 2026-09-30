// De leads van een werkstroom ("Cito-lead Sanne · 3sides-lead Sasja") als losse regels: de rol
// klein en gedempt, de naam vet. Zo zijn de namen in één oogopslag te lezen, op de DIN-plaat,
// de werkstroomkaarten en het actiebord. Tekst zonder herkenbare rol blijft staan als naam.

const ROL = /^((?:cito|3sides)[-\s]?lead|lead|eigenaar)\s*:?\s+(.+)$/i;

export function splitsLeads(tekst: string): { rol: string; naam: string }[] {
  return tekst
    .split(/\s+·\s+|\s*;\s*/)
    .map((deel) => deel.trim())
    .filter(Boolean)
    .map((deel) => {
      const m = deel.match(ROL);
      return m ? { rol: m[1], naam: m[2].trim() } : { rol: "", naam: deel };
    });
}

export function Leads({ tekst, cls }: { tekst: string; cls?: string }) {
  const delen = splitsLeads(tekst);
  if (delen.length === 0) return null;
  return (
    <span className={"ld" + (cls ? " " + cls : "")}>
      {delen.map((d, i) => (
        <span key={i} className="ld-r">
          {d.rol && <span className="ld-rol">{d.rol}</span>}
          <b className="ld-naam">{d.naam}</b>
        </span>
      ))}
    </span>
  );
}

export const LEADS_CSS = `
.okd .ld{display:flex;flex-direction:column;gap:3px;min-width:0}
.okd .ld-r{display:flex;align-items:baseline;gap:8px;min-width:0;line-height:1.35}
.okd .ld-rol{flex:none;min-width:78px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3,#5f6b7a)}
.okd .ld-naam{min-width:0;font-size:12.5px;font-weight:700;color:var(--ink,#111827)}
.okd .ld.okd-dp-leads{margin:5px 0 3px}
.okd .wk-meta > .ld{flex:1 0 100%}
.okd .ld.ab-leads{margin-top:5px}
`;
