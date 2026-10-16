# Audit ADVIES (4j) — Stap 6 Optimaliseren vs Stap 8 Berekeningen

**Sessie:** `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Scenario:** Snelste scenario (advies, 4 jaar, 2026-2029)
**Cap:** €341.000/jaar
**Totaal:** €1.283.500

---

## A. Toont stap 6 dezelfde totaalEuro als stap 8?

**Ja — alle totalen sluiten exact op elkaar aan.**

| Inspanning | Stap 6 `totaalEuro` | Stap 8 (eenmalig + structureel cum.) | Verschil |
|---|---:|---:|---:|
| CRM (data & systemen) | €817.500 | €540.000 + €277.500 | €0 |
| Gespreksvaardigheid (mens) | €162.500 | €142.500 + €20.000 | €0 |
| Uniforme klantbenadering (processen) | €114.000 | €78.000 + €36.000 | €0 |
| Leiderschap (cultuur) | €132.500 | €107.500 + €25.000 | €0 |
| Post onvoorzien | €57.000 | n.v.t. (programma-breed) | €0 |
| **Som** | **€1.283.500** | — | **0** |

**Som-checks (stap 6):**
- Σ inspanningen = €1.283.500 ✓
- Σ totalenPerJaar (2026-2029) = 253 + 344 + 343 + 343,5 K = **€1.283.500** ✓
- Σ verdelingPerJaar per inspanning sluit bit-voor-bit aan op `totaalEuro` ✓

**Conclusie A: Geen verschil. Stap 6 en stap 8 tonen identieke bedragen.**

---

## B. Bevat de motivatie-tekst nog OUDE bedragen?

**Ja — er zit op meerdere plekken een mismatch tussen de motivatie-tekst (stap 6) en de breakdown in `known-breakdowns.ts` / kostenraming (stap 8).** Dit is hetzelfde patroon als bij min20: motivaties zijn niet meegekanteld bij de upgrade van de breakdowns.

### B1. Mens — Gespreksvaardigheid

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming | **€125.000 – €160.000** (mid €142.500) | €15.000 – €20.000/jaar vanaf jaar 4 |
| Motivatie stap 6 (huidig) | "vast eenmalig **€75.000** plus variabel kerntraject **€80.000**" (= €155K, maar als tekst-frame onleesbaar) | "circa **€15.000** refresh + **€5.000** onboarding vanaf jaar 4" |

**Probleem:** motivatie splitst in "vast €75K + variabel €80K" terwijl de kostenraming één hoofdtotaal toont van €125-160K (mid €142,5K). De getallen sommeren wel correct, maar de gebruiker leest twee verschillende verhalen.

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing: eenmalig **€125.000 – €160.000** (middenwaarde €142.500), opgebouwd uit LMS-licentie (€30.000), curriculum-ontwikkeling outside-in (€21.000-€30.000), train-de-trainer voor 12 interne trainer/adviseurs (€10.000), nulmeting + sector-intakes (€10.000), kerntraject van twee trainingsblokken voor 80 deelnemers (~€63.000) en sessieondersteuning/locatie/materialen (€12.000-€22.000). Plus structureel **€15.000-€20.000 per jaar vanaf jaar 4** (refresh-sessies en onboarding nieuwe medewerkers). Cross-sectorale bundeling levert circa 30% schaalvoordeel; geen executive-tarief; vaste-prijs-contract bij start vereist.

---

### B2. Processen — Uniforme klantbenadering

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming | **€70.000 – €86.000** (mid €78.000) | €10.000 – €15.000/jaar vanaf jaar 2 |
| Motivatie stap 6 (huidig) | "eenmalig **€55.000 – €70.000** (middenpunt circa €62.000)" | €10.000 – €15.000/jaar |

**Probleem:** motivatie noemt **€55-70K mid €62K** terwijl breakdown **€70-86K mid €78K** is — een gat van €15-16K op het middenpunt. De motivatie verwijst naar een oudere, lagere raming die niet meer in stap 8 staat.

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing: eenmalig **€70.000 – €86.000** (middenwaarde €78.000), opgebouwd uit externe procesbegeleiding (€25.000-€40.000 over 3 sectoren), 9 multidisciplinaire werksessies (€15.000-€25.000), externe materialen / methodieken (€5.000-€10.000), cross-sectoraal governance-instrumentarium (€10.000) en sectorvariatie-buffer voor 10% herbewerkingsrisico (€5.000-€7.000) — schaalvoordeel 30-40% al verrekend. Plus structureel **€10.000-€15.000 per jaar vanaf jaar 2** voor proceseigenaarschap-borging via bestaande Smartprocess-tooling (geen aparte licentiekost).

---

### B3. Cultuur — Leiderschap

**Stap 8 kostenraming opent expliciet met:** "De **out-of-pocket investering** voor het cross-sectorale leiderschapsprogramma..."

**Motivatie stap 6 (huidig):** noemt alle bedragen kaal zonder out-of-pocket-disclaimer; spreekt over "eenmalig externe begeleider 15 dagen × €2.500 (€37.500)..." etc.

**Probleem:** de motivatie noemt geen out-of-pocket-frame. Stap 8 stelt de raming nadrukkelijk als out-of-pocket (excl. interne uren), maar de motivatie laat dit weg. Lezer kan denken dat dit een bruto/totaal-cijfer is.

**Specifiek voor 4-jarig advies:** motivatie noemt "**onboarding nieuwe leiders €2.000/jaar vanaf jaar 5**". Het advies-scenario loopt 2026-2029 (4 jaar). **Jaar 5 valt buiten de looptijd** → die zin hoort hier niet. De €2.000-component zit ook niet in `verdelingPerJaar` voor advies (want jaar 5 bestaat niet).

**Voorstel motivatie (vervangen vanaf "Dossier-onderbouwing"):**

> Dossier-onderbouwing (out-of-pocket, excl. interne uren): eenmalig **€95.000 – €120.000** (middenwaarde €107.500) — externe begeleider 15 dagen × €2.500 (€37.500), executive-tarief reservering MT-coaching (€20.000), individuele coaching voor 9 leidinggevenden (€36.000) en HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie (€15.000). Plus structureel **€7.500 – €11.500 per jaar** voor 360°-feedback tool licentie (€4.000-€6.000) en jaarlijkse cultuurmeting vanaf jaar 3 (€2.000-€3.000). In dit 4-jarige scenario komt onboarding nieuwe leiders nog niet aan de orde (start vanaf jaar 5). Interne uren (~740u × €77/u ≈ €57.000) zijn meegenomen in §4.2 Interne uren, niet in deze raming.

---

### B4. CRM — Data & Systemen

| Bron | Eenmalig | Structureel |
|---|---|---|
| Stap 8 kostenraming | €440.000 – €640.000 (mid wordt **niet** expliciet getoond, maar in CRM-totaal-rij €540K) | €75.000 – €110.000/jaar (mid €92.500) |
| Motivatie stap 6 (huidig) | "eenmalig **€440.000 – €640.000** (middenpunt circa **€540.000**)" | "structureel **€92.500 per jaar**" |

**Aansluiting:** de motivatie zegt **€540K mid eenmalig** — dit klopt ook precies met `verdelingPerJaar`-som van eenmalig (jaar 2026-2027 piek) zoals in de tabel. **€540K + 3× €92,5K structureel = €817,5K = `totaalEuro`**. ✓

**Niet aansluitend:** stap 8 kostenraming noemt ook "**dubbele licentielast 6-12 maanden** parallel-runtime (€30.000-€60.000)" als losse post in de eenmalig-bucket. De motivatie noemt dat alleen impliciet ("dubbele licentielast tijdens de transitiefase") — geen afwijking, maar mag explicieter (€30-60K is een fors bedrag).

**Geen kritieke afwijking; tekst is consistent.** Lichte verbetering: noem de €30-60K dubbele licentielast als losse post.

---

### B5. Post onvoorzien

Motivatie-tekst is intern consistent met `verdelingPerJaar` (jaar 2026 €0 → €57K cumulatief). **Geen actie nodig.**

---

## C. Kostenraming-tekst gebruikt?

**Gedeeltelijk.** De motivatie-tekst van stap 6 is duidelijk geschreven vanuit een **oudere versie** van de kostenraming dan wat stap 8 nu toont. De `known-breakdowns.ts` is geüpgrade (mens €125-160K, processen €70-86K, cultuur out-of-pocket-frame), maar de motivaties dragen nog de oude bedragen (€75K + €80K, €55-70K, geen out-of-pocket-disclaimer).

**Aanbeveling:** trigger de "TEKST_ONLY: Herschrijf de motivatie..." finetune-knop in stap 6 met expliciete instructie om voor mens, processen en cultuur de **nieuwe ranges** uit `known-breakdowns.ts` over te nemen. Zorg dat de prompt in `StapOptimaliseren.tsx` r1713-1734 de nieuwe ondergrenzen (€125K mens, €70K processen) als verplichte feiten meegeeft.

---

## D. verdelingPerJaar 2026-2029 sluit aan?

**Ja — bit-voor-bit consistent.**

| Inspanning | 2026 | 2027 | 2028 | 2029 | Som | totaalEuro |
|---|---:|---:|---:|---:|---:|---:|
| CRM | 162.000 | 221.000 | 233.000 | 201.500 | 817.500 | 817.500 ✓ |
| Mens | 40.000 | 48.000 | 39.000 | 35.500 | 162.500 | 162.500 ✓ |
| Processen | 12.000 | 30.000 | 31.000 | 41.000 | 114.000 | 114.000 ✓ |
| Cultuur | 39.000 | 39.000 | 22.000 | 32.500 | 132.500 | 132.500 ✓ |
| Onvoorzien | 0 | 6.000 | 18.000 | 33.000 | 57.000 | 57.000 ✓ |
| **Jaartotaal** | **253.000** | **344.000** | **343.000** | **343.500** | **1.283.500** | **1.283.500** ✓ |

**Cap-check:** €341.000/jaar — alleen 2027 (€344K) en 2028 (€343K) en 2029 (€343,5K) zitten **lichtjes (~1%) boven de cap**. Dit valt binnen de tolerantie van `Math.max(5000, 0.5%)` in `StapOptimaliseren.tsx` r125, maar het signaal is dat het scenario er strak tegenaan zit. Geen blocking issue.

---

## Samenvatting van vereiste motivatie-aanpassingen

| Inspanning | Aanpassing | Prio |
|---|---|---|
| **Mens** | Vervang "vast €75K + variabel €80K" door range **€125-160K mid €142.500** | Hoog |
| **Processen** | Vervang "€55-70K mid €62K" door **€70-86K mid €78K** | Hoog |
| **Cultuur** | Voeg **out-of-pocket-disclaimer** toe; verwijder of corrigeer "**onboarding nieuwe leiders vanaf jaar 5**" voor het 4-jarige advies | Hoog |
| **CRM** | Eventueel expliciet maken: dubbele licentielast €30-60K als losse post | Laag |
| **Onvoorzien** | Geen actie | — |

Alle aanpassingen zijn **tekst-only**: bedragen, percentages en jaar-totalen blijven server-zijde gegarandeerd onveranderd (zie `StapOptimaliseren.tsx` r1739). De finetune-knop is hier het juiste instrument.

---

**Bestanden:**
- `c:\Users\pdebu\Projects VS code\DIN\src\components\cross-analyse\StapOptimaliseren.tsx`
- `c:\Users\pdebu\Projects VS code\DIN\src\lib\known-breakdowns.ts`
- `c:\Users\pdebu\Projects VS code\DIN\src\components\steps\BerekeningenStep.tsx`
- `c:\Users\pdebu\Projects VS code\DIN\scripts\inspect-advies-vs-stap8.ts` (nieuw)
