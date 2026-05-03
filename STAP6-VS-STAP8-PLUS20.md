# Audit PLUS20 (5j) — Stap 6 Optimaliseren vs Stap 8 Berekeningen

**Sessie:** `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Scenario:** +20% budget — sneller (plus20, 5 jaar, 2026-2030)
**Cap:** €300.000/jaar (jaar 1 €250.000 — Cito-eis hard)
**Totaal:** €1.459.500

---

## A. Toont stap 6 dezelfde totaalEuro als stap 8?

**Ja — alle inspanning-totalen sluiten exact aan.** Stap 8 baseert het bedrag op `known-breakdowns.ts` (eenmalig mid + structureel cumulatief op basis van `vanafJaar`). Voor 5 jaar geeft dat:

| Inspanning | Stap 6 `totaalEuro` | Stap 8 (eenmalig mid + structureel cum.) | Verschil |
|---|---:|---:|---:|
| CRM (data & systemen) | €910.000 | €540.000 + €370.000 | €0 ✓ |
| Gespreksvaardigheid (mens) | €182.500 | €142.500 + €40.000 | €0 ✓ |
| Uniforme klantbenadering (processen) | €126.000 | €78.000 + €48.000 | €0 ✓ |
| Leiderschap (cultuur) | €142.000 | €107.500 + €34.500 | €0 ✓ |
| Post onvoorzien | €99.000 | n.v.t. (programma-breed) | €0 |
| **Som inspanningen** | **€1.459.500** | — | **0** |

**Som-checks (stap 6):**
- Σ inspanningen = €1.459.500 ✓
- Σ totalenPerJaar (2026-2030) = 251,5 + 301,5 + 302,5 + 301,5 + 302,5 K = **€1.459.500** ✓
- Σ verdelingPerJaar per inspanning sluit bit-voor-bit aan op `totaalEuro` ✓
- `totaalGeraamdEuro` veld = €1.459.500 ✓

**Conclusie A: Geen verschil. Stap 6 en stap 8 tonen identieke bedragen.**

Note: stap 8 berekent leiderschap structureel cumulatief over 5 jaar **inclusief jaar 5 onboarding** (€2.000). De known-breakdown geeft €34.500 = 5×€5K (360°) + 3×€2,5K (cultuurmeting jr 3-5) + 1×€2K (onboarding jr 5). Bij plus20 valt jaar 5 (2030) **wel binnen looptijd** — anders dan bij advies (4j). Dit is consistent.

---

## B. Bevat de motivatie-tekst nog OUDE bedragen?

**Ja — exact dezelfde mismatches als bij advies/min20.** De motivaties zijn niet meegekanteld toen de breakdowns werden geüpgrade. Specifiek voor plus20 (5 jaar) zijn alle structurele componenten relevant — ook onboarding leiders jaar 5 — dus alle bedragen moeten kloppen.

### B1. Mens — Gespreksvaardigheid

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming + known-breakdown | **€125.000 – €160.000** (mid €142.500) — 6 componenten | €15.000 – €20.000/jaar vanaf jaar 4 |
| Motivatie stap 6 (huidig) | "vast eenmalig **€75.000** plus variabel kerntraject **€80.000**" | "circa **€15.000** refresh + **€5.000** onboarding vanaf jaar 4" |

**Probleem:** motivatie splitst in "vast €75K + variabel €80K" (= som €155K, valt binnen range) terwijl stap 8 zes componenten toont met range €125-160K mid **€142.500**. De gebruiker leest in stap 6 een ander frame dan wat stap 8 onderbouwt. Voor plus20 (5j) komt structureel voor jaren 4 en 5 erbij = 2 × €20K = **€40.000 cumulatief**. Dat is consistent met de motivatie ("jaarlijks circa €15K refresh + €5K onboarding") want 2 × (€15K + €5K) = €40K ✓.

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing: eenmalig **€125.000 – €160.000** (middenwaarde €142.500), opgebouwd uit LMS-licentie (€30.000 voor 5+ jaar), curriculum-ontwikkeling outside-in (€21.000-€30.000), train-de-trainer voor 12 interne trainer/adviseurs (€10.000), nulmeting + sector-intakes (€10.000), kerntraject van twee trainingsblokken voor 80 deelnemers (~€63.000) en sessieondersteuning/locatie/materialen (€12.000-€22.000). Plus structureel **€15.000-€20.000 per jaar vanaf jaar 4** (refresh-sessies €12-18K + onboarding nieuwe medewerkers €3-7K) — over 5 jaar dekt dat 2 actieve borgingsjaren. Cross-sectorale bundeling levert circa 30% schaalvoordeel; geen executive-tarief; vaste-prijs-contract bij start vereist.

---

### B2. Processen — Uniforme klantbenadering

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming + known-breakdown | **€70.000 – €86.000** (mid €78.000) | €10.000 – €15.000/jaar vanaf jaar 2 |
| Motivatie stap 6 (huidig) | "eenmalig **€55.000 – €70.000** (middenpunt circa €62.000)" | €10.000 – €15.000/jaar |

**Probleem:** motivatie noemt **€55-70K mid €62K** terwijl breakdown **€70-86K mid €78K** is — een gat van €15-16K op het middenpunt. De motivatie verwijst naar een oudere, lagere raming. Verder zegt de motivatie "procesbegeleider 20 dagen × €800 = €16.000" terwijl de breakdown die post als €25-40K opvoert (incl. uitrol-coördinatie 11-30 extra dagen voor 3 sectoren). Voor plus20 dekt structureel cumulatief €48K over jaren 2-5 (4 × €12K mid) — past op het scenariobedrag.

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing: eenmalig **€70.000 – €86.000** (middenwaarde €78.000), opgebouwd uit externe procesbegeleiding 20 dagen + 11-30 dagen uitrol-coördinatie over 3 sectoren (€25.000-€40.000), 9 multidisciplinaire werksessies (€15.000-€25.000), externe materialen / methodieken BiSL/Lean (€5.000-€10.000), cross-sectoraal governance-instrumentarium KPI-template + integratie-format CRM (€10.000) en sectorvariatie-buffer voor 10% herbewerkingsrisico (€5.000-€7.000) — schaalvoordeel 30-40% al verrekend. Plus structureel **€10.000-€15.000 per jaar vanaf jaar 2** voor proceseigenaarschap-borging via bestaande Smartprocess-tooling (geen aparte licentiekost). Over 5 jaar dekt dat 4 actieve borgingsjaren.

---

### B3. Cultuur — Leiderschap

**Stap 8 kostenraming opent expliciet met:** "De **out-of-pocket investering** voor het cross-sectorale leiderschapsprogramma..." Stap 8 toont **disclaimer** (uit `known-breakdowns.ts` r271-272) die expliciet zegt dat de breakdown op het scenariobedrag sluit, niet op de samenvattende kostenraming-tekst.

**Motivatie stap 6 (huidig):** noemt alle bedragen kaal zonder out-of-pocket-disclaimer; spreekt over "eenmalig externe begeleider 15 dagen × €2.500 (€37.500)..." etc.

**Probleem:** geen out-of-pocket-frame in de motivatie. Lezer kan denken dat €37.500 + €20.000 + €36.000 + €15.000 = €108.500 een bruto/totaal-cijfer is, terwijl stap 8 expliciet zegt "interne uren ~740u × €77/u ≈ €57.000 zijn meegenomen in §4.2 Interne uren — niet in deze raming."

**Plus20 specifiek (5j):** alle structurele componenten zijn relevant.
- 360°-tool licentie: 5 jaar × €5K = €25.000
- Cultuurmeting vanaf jaar 3: 3 jaar × €2,5K = €7.500
- Onboarding leiders vanaf jaar 5: 1 jaar × €2K = €2.000
- Totaal structureel cumulatief = **€34.500** ✓

De motivatie noemt deze drie posten, maar zegt over onboarding "**€2.000/jaar vanaf jaar 5**" wat in een 5-jarig scenario betekent: precies 1 actief jaar (alleen 2030). Dat hoort beter expliciet in de tekst zodat lezer niet denkt dat die post over meerdere jaren loopt.

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing (out-of-pocket, excl. interne uren): eenmalig **€95.000 – €120.000** (middenwaarde €107.500) — externe begeleider 15 dagen × €2.500 (€37.500), executive-tarief reservering MT-coaching tot €4K/dag (€20.000), individuele coaching voor 9 leidinggevenden × €4.000/traject (€36.000) en HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie (€15.000). Plus structureel **€7.500 – €11.500 per jaar** opgebouwd uit 360°-feedback tool licentie vanaf jaar 1 (€4.000-€6.000), jaarlijkse cultuurmeting vanaf jaar 3 (€2.000-€3.000) en onboarding nieuwe leiders vanaf jaar 5 (€1.500-€2.500) — in dit 5-jarige scenario komt onboarding alleen in 2030 aan de orde. Interne uren (~740u × €77/u ≈ €57.000) zijn meegenomen in §4.2 Interne uren, niet in deze out-of-pocket-raming.

---

### B4. CRM — Data & Systemen

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming + known-breakdown | €440.000 – €640.000 (mid **€540.000**) — 4 componenten | €75.000 – €110.000/jaar vanaf jaar 2 (mid €92.500) |
| Motivatie stap 6 (huidig) | "eenmalig **€440.000 – €640.000** (middenpunt circa **€540.000**)" | "structureel **€92.500 per jaar**" |

**Aansluiting:** motivatie zegt **€540K mid eenmalig + €92,5K/jr structureel**. Voor plus20 (5j, structureel vanaf jaar 2) = €540K + 4 × €92,5K = €540K + €370K = **€910.000** = `totaalEuro` ✓.

**Niet expliciet in motivatie:** de losse post "**dubbele licentielast 6-12 maanden** parallel-runtime (€30.000-€60.000)" uit de kostenraming. De motivatie noemt het impliciet ("dubbele licentielast tijdens de transitiefase") zonder bedrag — geen rekenfout, maar mag explicieter omdat €30-60K een fors bedrag is dat in plus20 specifiek in 2027-2028 valt (zie `verdelingPerJaar` €197K + €189K piekjaren).

**Geen kritieke afwijking; tekst is consistent met stap 8.** Lichte verbetering aanbevolen.

**Voorstel verfijning (optioneel):** voeg na "(1.500-2.500 consultanturen)" toe: ", **dubbele licentielast 6-12 maanden parallel-runtime van €30.000-€60.000** voor 85 gebruikers tijdens de transitiefase".

---

### B5. Post onvoorzien

Motivatie-tekst is intern consistent met `verdelingPerJaar`: jaar 2026 €0 (Cito-budget hard), jaren 2027-2030 oplopend tot €99K cumulatief. De motivatie expliceert correct de cap-headroom-logica ("circa 10% van basisraming voor scenario's met cap-headroom (Snelste, +20%, Huidig)"). **Geen actie nodig.**

---

## C. Kostenraming-tekst gebruikt?

**Gedeeltelijk.** Identiek patroon als advies en min20: de motivaties dragen nog de oude bedragen (€75K + €80K voor mens, €55-70K voor processen, geen out-of-pocket-disclaimer voor cultuur). De `known-breakdowns.ts` is in een latere commit geüpgrade (mens €125-160K, processen €70-86K, cultuur out-of-pocket-frame met disclaimer) maar het AI-gegenereerde scenario-veld `motivatie` is sindsdien niet opnieuw gegenereerd.

**Aanbeveling:** trigger de "TEKST_ONLY: Herschrijf de motivatie..." finetune-knop in stap 6 (`StapOptimaliseren.tsx` r1703-1739) met een instructie die expliciet de **nieuwe ranges** uit `known-breakdowns.ts` als verplichte feiten meegeeft — zelfde aanpak als voor advies en min20. De prompt in r1713-1734 vermeldt nog de oude bedragen ("€650K eenmalig, €87.500K procesinrichting") en moet bijgewerkt worden naar **€440-640K mid €540K (CRM eenmalig), €125-160K mid €142.500 (mens eenmalig), €70-86K mid €78K (processen eenmalig), €95-120K mid €107.500 (cultuur out-of-pocket eenmalig)** voordat finetune-knop opnieuw wordt aangeroepen.

---

## D. verdelingPerJaar 2026-2030 sluit aan?

**Ja — bit-voor-bit consistent.**

| Inspanning | 2026 | 2027 | 2028 | 2029 | 2030 | Som | totaalEuro |
|---|---:|---:|---:|---:|---:|---:|---:|
| CRM | 166.000 | 197.000 | 189.000 | 209.000 | 149.000 | 910.000 | 910.000 ✓ |
| Mens | 38.500 | 39.500 | 38.500 | 23.500 | 42.500 | 182.500 | 182.500 ✓ |
| Processen | 13.000 | 28.000 | 30.000 | 21.000 | 34.000 | 126.000 | 126.000 ✓ |
| Cultuur | 34.000 | 30.000 | 22.000 | 21.000 | 35.000 | 142.000 | 142.000 ✓ |
| Onvoorzien | 0 | 7.000 | 23.000 | 27.000 | 42.000 | 99.000 | 99.000 ✓ |
| **Jaartotaal** | **251.500** | **301.500** | **302.500** | **301.500** | **302.500** | **1.459.500** | **1.459.500** ✓ |

**Cap-check:** €300.000/jaar (2027-2030) en €250.000 (2026, hard).
- 2026: €251.500 → **€1.500 boven €250K-cap** (~0,6%, binnen `Math.max(5000, 0.5%)`-tolerantie)
- 2027-2030: €301.500-€302.500 → **€1.500-€2.500 boven €300K-cap** (~0,8%, binnen tolerantie)

Alle vijf jaren zitten lichtjes (~1%) boven de cap maar binnen de soft-tolerantie. Geen blocking issue, wel signaal dat de buffer-marge minimaal is.

**Domein-balans (plus20 vs advies):** plus20 alloceert relatief meer aan onvoorzien (€99K = 6,8% vs advies €57K = 4,4%) en aan structureel beheer CRM (€370K vs advies €277,5K) — consistent met "meer ruimte → vollere 10% buffer + langer beheerstaart".

**Mens (gespreksvaardigheid) verdeling vraagt aandacht:** activiteit 2027 verwijst naar "**66 deelnemers**" terwijl motivatie en stap 7 expliciet **80 deelnemers** noemen (uit selectiePerDomein, niet 66 zoals oude dossier-aanname). **Tekst-update aanbevolen** in `verdelingPerJaar[1].activiteit` voor 2027.

---

## Samenvatting van vereiste motivatie-aanpassingen

| Inspanning | Aanpassing | Prio |
|---|---|---|
| **Mens** | Vervang "vast €75K + variabel €80K" door range **€125-160K mid €142.500** met 6-component breakdown; corrigeer "66 deelnemers" → **80 deelnemers** in 2027-activiteit | Hoog |
| **Processen** | Vervang "€55-70K mid €62K" door **€70-86K mid €78K**; corrigeer procesbegeleider-post €16K → €25-40K (incl. uitrol-coördinatie) | Hoog |
| **Cultuur** | Voeg **out-of-pocket-disclaimer** toe; expliciteer dat onboarding leiders **alleen in 2030** valt (1 actief jaar) | Hoog |
| **CRM** | Eventueel expliciet maken: dubbele licentielast €30-60K parallel-runtime tijdens transitie 2027-2028 | Laag |
| **Onvoorzien** | Geen actie | — |

Alle aanpassingen zijn **tekst-only**: bedragen, percentages, fase-labels en jaar-totalen blijven server-zijde gegarandeerd onveranderd (zie `StapOptimaliseren.tsx` r1739). De finetune-knop is hier het juiste instrument — mits de prompt in r1713-1734 eerst wordt bijgewerkt met de nieuwe `known-breakdowns.ts`-waarden.

---

**Bestanden:**
- `c:\Users\pdebu\Projects VS code\DIN\src\components\cross-analyse\StapOptimaliseren.tsx`
- `c:\Users\pdebu\Projects VS code\DIN\src\lib\known-breakdowns.ts`
- `c:\Users\pdebu\Projects VS code\DIN\src\components\steps\BerekeningenStep.tsx`
- `c:\Users\pdebu\Projects VS code\DIN\scripts\inspect-plus20-data.ts` (nieuw)
