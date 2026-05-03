# Fix Sectie E — cap-check niet als rode kruis

## Aanbeveling: optie C (status "info" — blauw, niet rood)

**Onderbouwing**:
- Optie A (verwijderen) verliest informatie die nuttig is — de stakeholder ziet dan helemaal niet meer hoe de werkelijke piek zich verhoudt tot het plafond.
- Optie B (geen status) maakt de rij visueel inconsistent met de andere checks — de gebruiker verwacht een symbool naast elk item.
- **Optie C** behoudt de informatie, behoudt de visuele consistentie (er staat nog steeds een symbool), maar communiceert duidelijk dat dit géén fout is. We breiden de check uit met een derde status `"info"` naast `ok=true/false`. De rode `✗` wordt vervangen door een blauwe `i`, en — cruciaal — de cap-check telt niet meer mee in `allOk`. Daardoor toont de header weer het groene "Alle berekeningen kloppen" wanneer alleen de cap wordt overschreden. De minimale overschrijdingen die de programmamanager voor lief wil nemen, worden zo neutraal getoond zonder de rest van de paneel-status te besmetten.

## Concrete edit (copy-paste)

old_string:
```
  const checks: Array<{ label: string; ok: boolean; uitleg: string }> = [
    {
      label: "De som van alle inspanningen klopt met het scenario-totaal",
      ok: Math.abs(sumInspanningen - totaalScenario) <= tol,
      uitleg: `Som inspanningen ${formatEur(sumInspanningen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumInspanningen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "De jaartotalen tellen op tot het scenario-totaal",
      ok: Math.abs(sumJaartotalen - totaalScenario) <= tol,
      uitleg: `Som jaartotalen ${formatEur(sumJaartotalen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumJaartotalen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "Geen jaar overschrijdt het jaarbudget-plafond (uitzondering: jaar 1 mag op €250K Cito-norm staan)",
      ok: totalenPerJaar.every((t) => {
        const effectieveCap = t.jaar === startJaar ? Math.max(cap, 250_000) : cap;
        return t.euro <= effectieveCap * 1.001;
      }),
      uitleg: `Hoogste jaarbedrag: ${formatEur(Math.max(0, ...totalenPerJaar.map((t) => t.euro)))} versus plafond ${formatEur(cap)}. Jaar 1 (${startJaar}) is uitgezonderd: dat staat vast op de Cito-richtlijn van €250.000 — dit kan voor het krappe scenario (plafond €200K) hoger uitkomen dan het scenario-plafond.`,
    },
    {
      label: "Per inspanning klopt de jaarverdeling met het inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal (binnen een afwijking van €5.000 of 0,5% van het bedrag — wat van de twee groter is).",
    },
  ];
  const allOk = checks.every((c) => c.ok);
```

new_string:
```
  const hoogsteJaar = Math.max(0, ...totalenPerJaar.map((t) => t.euro));
  const checks: Array<{ label: string; ok: boolean; status?: "info"; uitleg: string }> = [
    {
      label: "De som van alle inspanningen klopt met het scenario-totaal",
      ok: Math.abs(sumInspanningen - totaalScenario) <= tol,
      uitleg: `Som inspanningen ${formatEur(sumInspanningen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumInspanningen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "De jaartotalen tellen op tot het scenario-totaal",
      ok: Math.abs(sumJaartotalen - totaalScenario) <= tol,
      uitleg: `Som jaartotalen ${formatEur(sumJaartotalen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumJaartotalen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "Verhouding piekjaar tot jaarbudget-plafond",
      ok: true,
      status: "info",
      uitleg: `Hoogste jaarbedrag: ${formatEur(hoogsteJaar)} versus plafond ${formatEur(cap)}${hoogsteJaar > cap ? ` — overschrijding ${formatEur(hoogsteJaar - cap)} (informatief; minimale piekjaar-afwijkingen zijn voor het bestuur acceptabel).` : " — binnen plafond."}`,
    },
    {
      label: "Per inspanning klopt de jaarverdeling met het inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal (binnen een afwijking van €5.000 of 0,5% van het bedrag — wat van de twee groter is).",
    },
  ];
  const allOk = checks.every((c) => c.ok);
```

**Aanvullende edit** voor de render-loop (zelfde functie, regels 1549–1557):

old_string:
```
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={c.ok ? "text-emerald-600" : "text-red-600"}>{c.ok ? "✓" : "✗"}</span>
              <div className="flex-1">
                <span className="font-medium text-gray-800">{c.label}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.uitleg}</p>
              </div>
            </li>
          ))}
```

new_string:
```
          {checks.map((c, i) => {
            const isInfo = c.status === "info";
            const symbol = isInfo ? "i" : c.ok ? "✓" : "✗";
            const symbolClass = isInfo
              ? "text-blue-600"
              : c.ok
                ? "text-emerald-600"
                : "text-red-600";
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={symbolClass}>{symbol}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{c.label}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{c.uitleg}</p>
                </div>
              </li>
            );
          })}
```

## Effect
- Min20-scenario (10j) toont nu groen "✓ Alle berekeningen kloppen" in de header — cap-check telt niet langer mee in `allOk` doordat `ok: true` met `status: "info"` is gezet.
- De rij over het plafond blijft staan, maar met een blauwe `i` in plaats van rode `✗`. De tekst toont expliciet hoogste jaarbedrag, plafond en (indien aanwezig) de overschrijding met de duiding "informatief; minimale piekjaar-afwijkingen zijn voor het bestuur acceptabel".
- De tweede en vierde check blijven écht falen op rood als er een rekenfout zit — die signaalfunctie blijft intact.
- Cap-info blijft elders zichtbaar in de scenario-picker kaart en in de jaartotalen-tabel; geen verlies van transparantie richting stakeholder.
