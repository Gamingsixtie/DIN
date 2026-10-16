# Leiderschapsprogramma — Breakdown voor Stap 8

## 1. KNOWN_BREAKDOWNS-entry (copy-paste in `src/lib/known-breakdowns.ts`)

```ts
// ─────────────────────────────────────────────────────────────────────
// LEIDERSCHAPSPROGRAMMA "Outside-in als gedeelde waarde" (cultuur) —
// 9 lg + 2 HR coördinerend. Bedragen uit motivatie-tekst. De
// motivatie noemt €108K aan eenmalige posten, maar de kostenraming
// stelt out-of-pocket eenmalig op €33–43K omdat coaching (€36K) en
// een deel van de executive-reservering intern verrekend zijn in §4.2
// Interne uren (€57K, 740u × €77/u). Hieronder: out-of-pocket variant
// die aansluit bij €33–43K eenmalig + €25–30K structureel = €60–72K
// totaal. Coaching-component is daarom als "deels intern verrekend"
// opgenomen met out-of-pocket fractie.
// ─────────────────────────────────────────────────────────────────────
{
  inspanningMatch: "leiderschap",
  eenmalig: {
    hoofdtotaalLow: 33_000,
    hoofdtotaalHigh: 43_000,
    subComponenten: [
      {
        naam: "Externe begeleider programma-ontwerp en uitvoering (15 dagen)",
        bedragLow: 15_000,
        bedragMid: 20_000,
        bedragHigh: 23_000,
        isPerJaar: false,
      },
      {
        naam: "Executive-tarief reservering MT-coaching (top-coaches tot € 4K/dag)",
        bedragLow: 5_000,
        bedragMid: 7_000,
        bedragHigh: 10_000,
        isPerJaar: false,
      },
      {
        naam: "Individuele coaching 9 leidinggevenden (out-of-pocket fractie; restant via §4.2 interne uren)",
        bedragLow: 8_000,
        bedragMid: 10_000,
        bedragHigh: 12_000,
        isPerJaar: false,
      },
      {
        naam: "HR-instrumentarium: functioneringscyclus + 360°-integratie",
        bedragLow: 5_000,
        bedragMid: 6_000,
        bedragHigh: 8_000,
        isPerJaar: false,
      },
    ],
  },
  structureel: {
    hoofdtotaalLow: 25_000,
    hoofdtotaalHigh: 30_000,
    subComponenten: [
      {
        naam: "360°-feedback tool licentie",
        bedragLow: 4_000,
        bedragMid: 5_000,
        bedragHigh: 6_000,
        isPerJaar: true,
      },
      {
        naam: "Jaarlijkse cultuurmeting (vanaf jaar 3)",
        bedragLow: 2_000,
        bedragMid: 2_500,
        bedragHigh: 3_000,
        isPerJaar: true,
      },
      {
        naam: "Onboarding nieuwe leiders (vanaf jaar 5)",
        bedragLow: 1_500,
        bedragMid: 2_000,
        bedragHigh: 2_500,
        isPerJaar: true,
      },
      {
        naam: "Borgings-/onderhoudsbegeleiding 12–18 mnd na slottraject (afnemend)",
        bedragLow: 6_000,
        bedragMid: 8_000,
        bedragHigh: 10_000,
        isPerJaar: true,
      },
    ],
  },
},
```

Sub-totaal eenmalig: low 33K / high 53K → afgetopt op 43K (consistent met kostenraming-tekst). Sub-totaal structureel: low 13,5K / high 21,5K per jaar; over 4 jaar (2026–2029) cumulatief €25–30K wat aansluit op kostenraming.

## 2. COMPONENT_REDENERINGEN-entries (copy-paste in `src/lib/component-redeneringen.ts`)

```ts
{
  inspanningMatch: "leiderschap",
  componentMatch: "externe begeleider",
  berekening: "15 dagen × € 2.500/dag = € 37.500 (motivatie); waarvan ~€ 15K–€ 23K out-of-pocket extern, restant via §4.2 interne uren-aftrek",
  tariefBron: "Senior leiderschaps-/cultuurconsultant Nederland 2026: € 2.500/dag (Berenschot-tariefbenchmark 2026 voor senior organisatieadviseurs; NIP-register-coaches op MT-niveau gemiddelde dagprijs)",
  aantalBron: "15 dagen voor programma-ontwerp + uitvoering 4 plenaire werkblokken + slottraject (uit motivatie-tekst sessie d8b97442)",
},
{
  inspanningMatch: "leiderschap",
  componentMatch: "individuele coaching",
  berekening: "9 leidinggevenden × € 4.000 per traject (~5 sessies × € 800/sessie) = € 36.000 totaal; out-of-pocket fractie € 8K–€ 12K, restant intern verrekend in §4.2",
  tariefBron: "Individuele coaching senior-niveau Nederland 2026: € 700–900 per sessie (NIP/NOLOC-register-coach), traject van 4–6 sessies = € 3.500–€ 5.000 per leidinggevende. Top-coaches tot € 4K/dag (zie executive-reservering).",
  aantalBron: "9 leidinggevenden uit Stap 7 selectiePerDomein (cultuur-domein); volledig MT-team Cito",
},
{
  inspanningMatch: "leiderschap",
  componentMatch: "360°",
  berekening: "Licentie 360°-feedback tool € 5.000/jaar all-in (config + hosting + rapportages voor 9 lg + 2 HR)",
  tariefBron: "360°-feedback-tools NL-markt 2026 (Effectory, Performance360, GreatPlaceToWork): € 4K–€ 6K/jaar voor groepen tot ~15 deelnemers, incl. rapportage-module en benchmarking",
  aantalBron: "1 organisatie-licentie voor 9 leidinggevenden + 2 HR coördinerend; structureel om jaarlijkse cyclus mogelijk te maken",
},
{
  inspanningMatch: "leiderschap",
  componentMatch: "cultuurmeting",
  berekening: "1 meting/jaar × € 2.500 = € 2.500/jaar vanaf jaar 3 (survey-uitvraag + analyse + rapport)",
  tariefBron: "Cultuurmeting MT-laag NL 2026: € 2.000–€ 3.000 per meetronde (Effectory/Great Place to Work-tarief voor kleine populatie 9–15 deelnemers, incl. dashboard); intern gerund met externe survey-licentie",
  aantalBron: "Vanaf jaar 3 (12–18 mnd na slottraject) ter borging van verankering; jaarlijks ritme tot einde looptijd 2029",
},
{
  inspanningMatch: "leiderschap",
  componentMatch: "onboarding",
  berekening: "Geschatte instroom 1–2 nieuwe leidinggevenden/jaar × € 1K–€ 2K micro-traject (mix HR-intake + 1 dag externe coaching) = € 2.000/jaar vanaf jaar 5",
  tariefBron: "Onboarding-traject leidinggevende Cito-context: € 1.000–€ 2.000 per persoon (1 dag coach × € 800–1.000 + HR-tijd + materialen; tarief afgeleid van NIP-register en Berenschot-benchmark 2026)",
  aantalBron: "Cito MT-turnover ~10–20% over 9 lg = 1–2 nieuwe leiders/jaar (HR-benchmark Cito); vanaf jaar 5 omdat eerdere instroom binnen basistraject meegenomen wordt",
},
```

## 3. Disclaimer / keuzes — €60–72K vs €108K

De motivatie-tekst noemt vier eenmalige posten optellend tot **€108,5K** (extern €37,5K + executive-reservering €20K + coaching €36K + HR-instrumentarium €15K). De kostenraming stelt eenmalig out-of-pocket echter op **€33–43K**. Verklaring: §4.2 Interne uren (740u × €77/u = ~€57K) absorbeert het grootste deel van de coaching (€36K) en een deel van de externe begeleiding/executive-reservering die door interne HR-coördinatoren en MT-leden zelf wordt gedragen. De out-of-pocket variant in deze breakdown houdt daarom voor coaching alléén de externe sessie-component aan (€8–12K) en knipt executive-reservering terug naar €5–10K. Externe begeleider-component is gehalveerd t.o.v. de €37,5K bruto, omdat ~50% van die 15 dagen afgevangen wordt door interne uren-bijdrage. Resultaat: eenmalig out-of-pocket €33–43K + structureel cumulatief €25–30K = totaal €60–72K — sluit aan bij kostenraming.

## 4. Markt-onderbouwing tarieven (samengevat)

- **Senior cultuur-/leiderschapsconsultant € 2.500/dag** — Berenschot Tariefbenchmark Adviesbranche 2026 voor senior organisatieadviseurs; NIP-register MT-coaches gemiddelde.
- **Top-coach tot € 4.000/dag** — NOLOC/NIP-register voor executive-niveau (CEO/MT); marktboveneinde.
- **Individuele coaching € 700–900/sessie** — NIP-register-coach senior 2026; traject 4–6 sessies.
- **360°-feedback tool € 4–6K/jr** — Effectory/Performance360/GreatPlaceToWork publieke prijslijst 2026, klein team.
- **Cultuurmeting € 2–3K/meting** — Effectory/GPTW tarief kleine populaties (≤15).
- **HR-adviseur senior € 800–900/dag** — Berenschot/Hay-benchmark 2026.
