# Begroting-aanbeveling — sluiting met §4.1

**Doel:** elke c3-rekensom in stap 8 moet 1-op-1 sluiten op het scenario-bedrag in §4.1 begroting (uit stap 6). 16 punten (4 inspanningen × 4 scenario's). Hieronder per inspanning de oorzaak en de keuze "begroting aanpassen" vs "berekening aanpassen", met concrete getallen.

Sessie: `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`. Pad voor begroting-bedragen:
`crossAnalyseWizard.stepResults.stap4.begrotingAdvies.scenarios.<key>.inspanningen[<i>].totaalEuro`

---

## 1. CRM (€27.500–28.000 vast nadeel — alle scenario's)

### Oorzaak — gevonden

De berekening neemt voor eenmalig de **kostenraming-hoofdtotaal-mid van €567.500** (avg van €455K + €680K). Maar de motivatie-tekst onder de inspanning (en de basis voor het scenariobedrag in §4.1) gebruikt **eenmalig mid €540.000** (avg van €440K + €640K — letterlijk in de motivatie: *"middenpunt circa € 540.000"*).

Verschil: **€567.500 − €540.000 = €27.500.** Dat is *exact* het vaste gat. Bij 4-jarig wordt het nog €500 verhoogd door afronding op de structureel-mid (€92.500/jr × 3 = €277.500 vs. begroting €249.500). De drijver is dus eenmalig.

De kostenraming-tekst noemt eenmalig **€455K–€680K** (top-line) en somt vervolgens 4 sub-componenten op: implementatie €250–375K + datamigratie €75–125K + training €40–55K + dubbele-licentielast €30–60K. Totaal sub-mid = €312,5K + €100K + €47,5K + €45K = **€505K** — maar de hoofdtotaal-mid is €567,5K. Het verschil van €62,5K binnen de top-line is een impliciete PM-buffer die de hoofdtotaal-range omhoog trekt; de motivatie corrigeert dit terug naar €440K–€640K (mid €540K) door de 30% PM-buffer **deels** los te maken (worst-case plafond €830K is apart).

### Optie A — begroting aanpassen (geen voorkeur)

CRM is door de programmamanager expliciet buiten scope verklaard ("CRM-bedrag in §4.1 ongewijzigd" — sectie 4 van eerdere briefing). Dat betekent: dit is geen reëel nadeel; het is een meet-artefact van de berekening. Verhoog niet de begroting met +€27,5K — dat zou het sluitend maken, maar tegen de scope-afspraak.

### Optie B — berekening aanpassen (aanbevolen)

Pas de **bron** aan voor CRM-eenmalig: gebruik de motivatie-mid (€540K) i.p.v. parser-mid (€567,5K). Twee implementatie-opties:

**B1 (lichtgewicht):** Voeg CRM toe aan `KNOWN_BREAKDOWNS` in `src/lib/known-breakdowns.ts` met `inspanningMatch: "crm-klantdashboard"`, eenmalig.hoofdtotaalLow = 440.000 en hoofdtotaalHigh = 640.000 (motivatie-cijfers). Structureel laat je leeg zodat de parser-fallback structureel-mid €92.500/jr blijft gebruiken. Effect:

| Scenario | Berekening nieuw | Werkelijk | Delta nieuw |
|---|---|---|---|
| Optimaal (7j) | 540 + 92,5×6 = €1.095K | €1.095K | **€0** |
| Plus20 (5j) | 540 + 92,5×4 = €910K | €910K | **€0** |
| Advies (4j) | 540 + 92,5×3 = €817,5K | €817K | **−€500** |
| Min20 (10j) | 540 + 92,5×9 = €1.372,5K | €1.372K | **−€500** |

**B2 (parser):** Pas `parseDossierRaming()` aan zodat als motivatie-tekst een expliciete *"middenpunt circa € X"*-claim bevat, die **leidend** is voor mid (i.p.v. (low+high)/2). Generieker maar fragieler. Niet aanbevolen.

**Aanbeveling: B1.** Sluit alle 4 CRM-cellen (op €500 afronding na, ruim binnen 1%).

---

## 2. Gespreksvaardigheidstraining (mens) — variabel verschil dat met aantalJaren toeneemt

### Oorzaak — gevonden

De berekening past `vanafJaar=4` met €15K refresh + €5K onboarding = €20K/jr. Bij min20 (10j) telt dat **7 jaar** (jaar 4-10) = €140K structureel. Plus eenmalig €142,5K = som €282,5K.

Maar de werkelijke verdelingPerJaar voor min20-gesprek (zie verdeling-script):
- 2026 €43K + 2027 €24K + 2028 €25K = **€92K eenmalig** in jaar 1-3 (begroting smeert eenmalig over 3 jaren).
- Vanaf 2029 (jaar 4): 22+17+16+17+23+21+22 = €138K verdeeld over 7 jaren (≈ **€19,7K/jr** gemiddeld), waarvan jaar 8-10 (€23+21+22 = €66K) duidelijk hoger zijn dan refresh+onboarding zouden moeten zijn.

De werkelijke som is consistent **€20K lager** dan de motivatie-conforme som omdat:
1. Jaar 8-10 wordt door de begroting impliciet als "Verankering / Continue ontwikkeling" gerubriceerd; die is **niet** als refresh/onboarding meegenomen door de AI maar wel hoger dan €20K → de begroting voegt impliciet ~€10K extra/jr toe in de slotjaren.
2. De eenmalige posten in 2026-2028 (€92K) zijn lager dan known-eenmalig €142,5K — verschil €50K is door de AI gesmeerd naar latere jaren als "doorlopende coaching/refresh".

Per saldo: begroting heeft min20 op **€230K** gezet i.p.v. de motivatie-correcte €282,5K. Dat is een **echt nadeel van €52,5K** (-19%): de AI heeft een lange-staart van het structurele deel weggesneden om binnen het jaarbudget te passen.

Voor advies (4j): som €162,5K, werkelijk €155K → **€7,5K nadeel**. Hier is structureel maar 1 jaar (jaar 4 alleen), dus klein gat. Begroting €155K = klassiek dossier-eenmalig €125–160K mid (€142,5K) + €12,5K stub voor jaar 4 i.p.v. €20K.

### Optie A — begroting aanpassen (aanbevolen voor min20, plus20, optimaal)

De motivatie-mid is methodisch correct (refresh €15K/jr vanaf jaar 4 + onboarding €5K/jr vanaf jaar 4 — letterlijk in motivatie). De begroting heeft die te krap geboekt om binnen jaarbudget-cap te passen. Ophogen naar berekende som:

| Scenario | Pad index*<sup>1</sup> | Huidig | Voorgesteld | Reden |
|---|---|---|---|---|
| optimaal | `inspanningen[1].totaalEuro` | €200.000 | **€222.500** | Eenmalig €142,5K + 4× €20K = €222,5K |
| plus20 | `inspanningen[2].totaalEuro` | €170.000 | **€182.500** | Eenmalig €142,5K + 2× €20K = €182,5K |
| advies | `inspanningen[1].totaalEuro` | €155.000 | **€162.500** | Eenmalig €142,5K + 1× €20K = €162,5K |
| min20 | `inspanningen[2].totaalEuro` | €230.000 | **€282.500** | Eenmalig €142,5K + 7× €20K = €282,5K |

<sup>1</sup> *Volgorde van `inspanningen[]` per scenario: zie verdeling-output. Optimaal: [0]=CRM, [1]=Gesprek, [2]=Processen, [3]=Leiderschap, [4]=Onvoorzien. Plus20: [0]=CRM, [1]=Processen, [2]=Gesprek, [3]=Leiderschap, [4]=Onvoorzien. Advies: [0]=CRM, [1]=Gesprek, [2]=Processen, [3]=Leiderschap, [4]=Onvoorzien. Min20: [0]=CRM, [1]=Processen, [2]=Gesprek, [3]=Leiderschap, [4]=Onvoorzien. **Verifieer voor het script de exacte index per scenario via `inspanningTitel`.**

Effect: 4 cellen sluiten exact (delta €0). Cap-impact: optimaal +€22,5K, plus20 +€12,5K, advies +€7,5K, min20 +€52,5K. Past binnen cap-headroom (advies €148K marge, min20 €17K krap — bij min20 verifiëren of headroom volstaat).

### Optie B — berekening aanpassen (alternatief)

Verlaag refresh+onboarding in known-breakdown: `Refresh-sessies bedragMid 15.000 → 12.500` en `Onboarding bedragMid 5.000 → 2.500`. Effect: structureel/jr daalt naar €15K. Min20: 142,5 + 15×7 = 247,5K → werkelijk 230K → delta -17,5K (nog steeds nadeel). Stelt niet voldoende, en gaat in tegen motivatie-cijfers. **Niet aanbevolen.**

### Optie C — staffel met "vanafJaar" + "totEnMetJaar"

Voeg `totEnMetJaar` toe aan `KnownSubComponent` zodat refresh-sessies bv. alleen jaar 4-7 actief is. Methodisch onzuiver (motivatie zegt geen einde), niet aanbevolen.

**Aanbeveling: A.** Begroting ophogen voor 4 cellen — sluit exact.

---

## 3. Processen (€11–14K voordeel — alle scenario's)

### Oorzaak — gevonden

De berekening gebruikt voor processen *parsed* (niet known-eenmalig — code in `C3Samenstelling` checkt eerst `knownBreakdown.eenmalig`, en processen heeft alleen `structureel` in known-breakdowns). Dus:
- Eenmalig parsed-mid = €62.500 (avg €55K + €70K kostenraming-top)
- Structureel parsed-mid/jr = €12.500 (avg €10K + €15K — proceseigenaarschap-borging)

Maar de motivatie-tekst noemt expliciet **drie extra/aanvullende structurele componenten**:
1. *Proceseigenaarschap-borging via Smartprocess* — €10–15K/jr (mid €12K) ← parsed pakt dit
2. *Cross-sectoraal governance-instrumentarium* (KPI-template + integratie-format CRM) — **€10K** *(motivatie noemt dit als "structureel"-staart, ambigu — kan ook eenmalig zijn)*
3. *Sectorvariatie-buffer* — **€6K** *(idem ambigu)*

De begroting-AI heeft componenten 2+3 (€16K) waarschijnlijk als **eenmalig** opgenomen → echte eenmalig ≈ €62K + €16K = €78K. Met structureel €12K/jr × (jaren-1):
- Advies (4j): 78 + 12×3 = €114K → werkelijk €114K ✓ exact
- Plus20 (5j): 78 + 12×4 = €126K → werkelijk €126K ✓ exact
- Optimaal (7j): 78 + 12×6 = €150K → werkelijk €150K ✓ exact
- Min20 (10j): 78 + 12×9 = €186K → werkelijk €186K ✓ exact

**Het sluit perfect** als je de eenmalig-uitbreiding meeneemt.

### Optie A — berekening aanpassen (aanbevolen)

Voeg processen toe aan `KNOWN_BREAKDOWNS` met **eenmalig** sectie:

```
{
  inspanningMatch: "uniforme",
  eenmalig: {
    hoofdtotaalLow: 70_000,    // 55 + 10 + 5 (laag)
    hoofdtotaalHigh: 86_000,   // 70 + 10 + 6 (hoog)
    subComponenten: [
      { naam: "Externe procesbegeleiding 20d × €800 + sessiebegeleiding + materialen (kostenraming-top)", bedragLow: 55_000, bedragMid: 62_000, bedragHigh: 70_000, isPerJaar: false },
      { naam: "Cross-sectoraal governance-instrumentarium (KPI-template + integratie-format CRM)", bedragLow: 10_000, bedragMid: 10_000, bedragHigh: 10_000, isPerJaar: false },
      { naam: "Sectorvariatie-buffer (10% herbewerkingsrisico)", bedragLow: 5_000, bedragMid: 6_000, bedragHigh: 7_000, isPerJaar: false },
    ],
  },
  structureel: { ...bestaand laten — €22K/jr klopt niet voor parsed-uitkomst },
}
```

**Belangrijk:** als je eenmalig toevoegt, gaat `C3Samenstelling` automatisch ook structureel uit known-breakdown halen (huidige logica: known.eenmalig present → known.structureel ook present → som = known eenmalig + known structureel cumulatief, **niet** parsed). De huidige known-structureel is **€22K/jr** (€12K + €10K) — dat geeft:
- Advies (4j): 78 + 22×3 = €144K → werkelijk €114K → **+€30K nadeel** (overshoot).

**Daarom moet je gelijktijdig** de structureel-sectie van processen-known **inkorten naar alleen €12K/jr** (proceseigenaarschap-borging-component) en governance-instrumentarium + sectorvariatie-buffer **verplaatsen naar eenmalig**. Dat sluit dan exact.

Concreet: pas in `known-breakdowns.ts` de processen-entry aan:
```
structureel: {
  hoofdtotaalLow: 10_000,
  hoofdtotaalHigh: 15_000,
  subComponenten: [
    { naam: "Proceseigenaarschap-borging via Smartprocess", bedragLow: 10_000, bedragMid: 12_000, bedragHigh: 15_000, isPerJaar: true },
  ],
},
```
(Verwijder governance + sectorvariatie regels uit structureel; voeg ze in eenmalig toe — zie hierboven.)

Effect: alle 4 processen-cellen sluiten exact.

### Optie B — begroting aanpassen (alternatief, niet aanbevolen)

Verlaag begroting met €11–14K om bij parsed-som te passen. Tegen programmamanager-eis ("ook in voordeel kloppen") en in strijd met motivatie. **Niet aanbevolen.**

**Aanbeveling: A** met de gecombineerde shift (eenmalig uitbreiden, structureel inkorten).

---

## 4. Leiderschap — klein verschil (advies -€2.500, andere +€3K tot +€5,5K)

### Oorzaak — gevonden

Berekening gebruikt known-breakdown:
- Eenmalig mid = (95K + 120K)/2 = **€107,5K**
- Structureel: 360°-tool €5K vanaf j1, cultuurmeting €2,5K vanaf j3, onboarding €2K vanaf j5

Per scenario:
- Optimaal (7j): 107,5 + 5×7 + 2,5×5 + 2×3 = 107,5 + 35 + 12,5 + 6 = **€161K** → werkelijk €165K → +€4K
- Plus20 (5j): 107,5 + 5×5 + 2,5×3 + 2×1 = 107,5 + 25 + 7,5 + 2 = **€142K** → werkelijk €145K → +€3K
- Advies (4j): 107,5 + 5×4 + 2,5×2 + 2×0 = 107,5 + 20 + 5 + 0 = **€132,5K** → werkelijk €130K → −€2,5K
- Min20 (10j): 107,5 + 5×10 + 2,5×8 + 2×6 = 107,5 + 50 + 20 + 12 = **€189,5K** → werkelijk €195K → +€5,5K

### Wat is dit?

De gaten zijn klein (max €5,5K = 3%). Patroon: begroting heeft afgerond naar ronde getallen (€130K, €145K, €165K, €195K) zonder consistente regel. Advies is naar beneden afgerond (€132,5 → €130K), de andere drie naar boven afgerond (€142 → €145, €161 → €165, €189,5 → €195).

### Optie A — begroting aanpassen (aanbevolen)

Zet begrotingsbedragen exact gelijk aan berekende som:

| Scenario | Pad index | Huidig | Voorgesteld | Reden |
|---|---|---|---|---|
| optimaal | `inspanningen[3].totaalEuro` | €165.000 | **€161.000** | 107,5 + 35 + 12,5 + 6 = 161 |
| plus20 | `inspanningen[3].totaalEuro` | €145.000 | **€142.000** | 107,5 + 25 + 7,5 + 2 = 142 |
| advies | `inspanningen[3].totaalEuro` | €130.000 | **€132.500** | 107,5 + 20 + 5 + 0 = 132,5 |
| min20 | `inspanningen[3].totaalEuro` | €195.000 | **€189.500** | 107,5 + 50 + 20 + 12 = 189,5 |

Effect: alle 4 cellen sluiten exact. Cap-impact: −€4K / −€3K / +€2,5K / −€5,5K (netto kleiner programma, geen risico).

### Optie B — berekening aanpassen (alternatief)

Pas `vanafJaar` of bedragen in known-breakdown om de afrondingen te matchen. Methodisch onzuiver — afrondings-conventie is geen modelmatige drijver.

**Aanbeveling: A.** De motivatie-conforme som is €132,5/€142/€161/€189,5K; afrondingen waren cosmetisch.

---

## Implementatie-plan

### Stap 1 — Berekening aanpassen (1 file edit)

Pas `src/lib/known-breakdowns.ts` aan:

1. **CRM toevoegen** (nieuw blok): `inspanningMatch: "crm-klantdashboard"`, eenmalig hoofdtotaalLow 440.000, hoofdtotaalHigh 640.000, subComponenten leeg-of-mirror van motivatie. Geen structureel-sectie (parser-fallback gebruikt €92,5K/jr).
2. **Processen herschikken**:
   - Eenmalig-sectie toevoegen met 3 subComponenten (€62K + €10K + €6K = mid €78K).
   - Structureel-sectie inkorten tot alleen "Proceseigenaarschap-borging" (€12K/jr).

### Stap 2 — Begroting aanpassen (script)

Maak een nieuw script `scripts/sync-c3-begroting-bedragen.ts` dat session `d8b97442` laadt en deze 8 cellen update:

| Inspanning | optimaal | plus20 | advies | min20 |
|---|---|---|---|---|
| Gesprek | €222.500 | €182.500 | €162.500 | €282.500 |
| Leiderschap | €161.000 | €142.000 | €132.500 | €189.500 |

Per scenario: zoek `inspanningen[i]` waarvan `inspanningTitel.includes("Gespreksvaardigh")` resp. `.includes("Leiderschap")`, zet `totaalEuro` op nieuwe waarde, **en update `verdelingPerJaar` proportioneel** zodat som blijft kloppen (verdeel het delta proportioneel over alle jaren met euro>0).

### Stap 3 — Verificatie

Draai `npx tsx scripts/check-c3-aansluiting.ts`. Verwacht resultaat:

- CRM: 4× delta ≤ €500 (afronding)
- Gesprek: 4× delta = €0
- Processen: 4× delta = €0
- Leiderschap: 4× delta = €0

Totaal 16/16 sluitend. Daarna `npm run build` + commit + `npx vercel --prod`.

### Stap 4 — Cap-toetsing (handmatig)

Verifieer dat min20 nog binnen cap blijft (huidige headroom €17K, ophoging gesprek +€52,5K kan overschrijden). Indien overschrijding: óf cap accepteren met expliciete motivatie ("realistisch boven jaarbudget — vereist incidentele bestuursbeslissing"), óf gesprek-min20 herzien (aantal refresh-jaren beperken — pas dan ook known-breakdown aan).

---

## Samenvatting

| Inspanning | Aanbeveling | Welk bestand/pad |
|---|---|---|
| **CRM** | Berekening aanpassen — known-breakdown CRM toevoegen met eenmalig €440K-640K | `src/lib/known-breakdowns.ts` |
| **Gesprek** | Begroting aanpassen — 4 cellen ophogen (€222,5K / €182,5K / €162,5K / €282,5K) | session `inspanningen[i].totaalEuro` |
| **Processen** | Berekening aanpassen — eenmalig uitbreiden met governance €10K + sectorvariatie €6K, structureel inkorten | `src/lib/known-breakdowns.ts` |
| **Leiderschap** | Begroting aanpassen — 4 cellen exact maken (€161K / €142K / €132,5K / €189,5K) | session `inspanningen[i].totaalEuro` |

**Verwacht resultaat na implementatie:** 16/16 c3-cellen sluitend (delta ≤ 1%), waarmee de programmamanager-eis ("rekensommen 1-op-1 kloppen — ook in voordeel") gehaald wordt.
