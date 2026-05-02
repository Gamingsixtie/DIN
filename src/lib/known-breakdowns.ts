// Hardcoded fallback-uitsplitsingen voor inspanningen waarvoor de
// automatische parser (parseBreakdown) de sub-componenten niet uit de
// kostenraming/motivatie kan extraheren.
//
// Reden: parseBreakdown herkent het patroon `naam (€bedrag)` per item, maar
// sommige dossiers schrijven sub-componenten als comma-gescheiden lijst
// binnen één haakjes-blok of als losse zinnen. Voor die gevallen leveren we
// hier een handmatige spiegeling van de motivatie-tekst zodat de UI dezelfde
// diepte toont als bij CRM (waar de tekst wél het haakjes-patroon volgt).
//
// De BREDRAGEN komen letterlijk uit de motivatie-tekst van de inspanning,
// niet uit eigen schatting. Componenten verwijzen via vindRedenering() naar
// herleidbare berekeningen in component-redeneringen.ts.

export interface KnownSubComponent {
  naam: string;
  bedragLow: number;
  bedragMid: number;
  bedragHigh: number;
  isPerJaar: boolean;
  /** Voor structurele componenten: vanaf welk scenario-jaar (1-indexed)
   *  is deze post actief. Default 1 (alle structurele jaren). Bv.
   *  cultuurmeting "vanaf jaar 3" → vanafJaar: 3. */
  vanafJaar?: number;
}

export interface KnownSection {
  hoofdtotaalLow: number;
  hoofdtotaalHigh: number;
  subComponenten: KnownSubComponent[];
}

export interface KnownBreakdown {
  /** Substring (lowercase) gezocht in de inspanning-titel. */
  inspanningMatch: string;
  eenmalig?: KnownSection;
  structureel?: KnownSection;
  /** Optionele disclaimer-tekst die boven de breakdown wordt getoond. Voor
   *  inspanningen waar de kostenraming-tekst en de scenariobedragen op
   *  verschillende basissen werken (bv. out-of-pocket vs bruto incl.
   *  interne uren). */
  disclaimer?: string;
}

export const KNOWN_BREAKDOWNS: KnownBreakdown[] = [
  // ─────────────────────────────────────────────────────────────────────
  // GESPREKSVAARDIGHEIDSTRAINING (mens) — bedragen letterlijk uit
  // motivatie: vast eenmalig €75K (LMS €30K, content €25K, ToT €10K,
  // nulmeting €10K) + variabel kerntraject €80K (twee blokken á €31,5K +
  // sessieondersteuning €17K). Plus jaarlijks vanaf jaar 4: refresh €15K
  // + onboarding nieuwe medewerkers €5K.
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "gespreksvaardigh",
    eenmalig: {
      hoofdtotaalLow: 125_000,
      hoofdtotaalHigh: 160_000,
      subComponenten: [
        {
          naam: "LMS-licentie (5+ jaar vooruit)",
          bedragLow: 30_000,
          bedragMid: 30_000,
          bedragHigh: 30_000,
          isPerJaar: false,
        },
        {
          naam: "Content-ontwikkeling outside-in curriculum",
          bedragLow: 21_000,
          bedragMid: 25_000,
          bedragHigh: 30_000,
          isPerJaar: false,
        },
        {
          naam: "Train-de-trainer voor 12 interne trainer/adviseurs",
          bedragLow: 10_000,
          bedragMid: 10_000,
          bedragHigh: 10_000,
          isPerJaar: false,
        },
        {
          naam: "Nulmeting + intake-sessies",
          bedragLow: 10_000,
          bedragMid: 10_000,
          bedragHigh: 10_000,
          isPerJaar: false,
        },
        {
          naam: "Kerntraject — externe trainingspartner 2 blokken",
          bedragLow: 54_000,
          bedragMid: 63_000,
          bedragHigh: 72_000,
          isPerJaar: false,
        },
        {
          naam: "Sessieondersteuning, locatie en materialen",
          bedragLow: 12_000,
          bedragMid: 17_000,
          bedragHigh: 22_000,
          isPerJaar: false,
        },
      ],
    },
    structureel: {
      hoofdtotaalLow: 15_000,
      hoofdtotaalHigh: 20_000,
      subComponenten: [
        {
          naam: "Refresh-sessies (vanaf jaar 4)",
          bedragLow: 12_000,
          bedragMid: 15_000,
          bedragHigh: 18_000,
          isPerJaar: true,
          vanafJaar: 4,
        },
        {
          naam: "Onboarding nieuwe medewerkers (vanaf jaar 4)",
          bedragLow: 3_000,
          bedragMid: 5_000,
          bedragHigh: 7_000,
          isPerJaar: true,
          vanafJaar: 4,
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // UNIFORME klantbenadering (processen) — eenmalig pakt parseBreakdown
  // al uit kostenraming. Hier alleen de structurele aanvulling, want die
  // staat in motivatie maar is niet uitgesplitst in kostenraming.
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "uniforme",
    structureel: {
      hoofdtotaalLow: 18_000,
      hoofdtotaalHigh: 27_000,
      subComponenten: [
        {
          naam: "Proceseigenaarschap-borging via bestaande Smartprocess-tooling",
          bedragLow: 10_000,
          bedragMid: 12_000,
          bedragHigh: 15_000,
          isPerJaar: true,
        },
        {
          naam: "Cross-sectoraal governance-instrumentarium (KPI-template + integratie-format CRM)",
          bedragLow: 8_000,
          bedragMid: 10_000,
          bedragHigh: 12_000,
          isPerJaar: true,
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // LEIDERSCHAPSPROGRAMMA "Outside-in als gedeelde waarde" (cultuur) —
  // 9 lg + 2 HR coördinerend. We tonen BRUTO bedragen uit motivatie omdat
  // het werkelijke scenario-totaal (€130K bij advies-scenario) ook op
  // bruto-basis wordt berekend. De kostenraming-tekst noemt out-of-pocket
  // €60–72K (na §4.2 interne uren-aftrek € 57K = 740u × € 77/u) — dat is
  // een andere weergave van dezelfde inspanning. Disclaimer maakt dit
  // expliciet zodat de gebruiker beide niet als tegenstrijdig leest.
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "leiderschap",
    disclaimer:
      "De kostenraming-tekst hierboven onder 'Uit het dossier' noemt eenmalig € 33–43K en structureel € 25–30K cumulatief over 2 jaar. Dat is een onvolledige weergave — de motivatie eronder noemt vier eenmalige posten die opgeteld € 108.500 geven (externe begeleider 15 × € 2.500 = € 37.500 + executive-tarief € 20K + 9 lg × € 4.000 = € 36K + HR-instrumentarium € 15K). Het scenariobedrag in § 4.1 begroting (bv. € 130K voor advies, 4 jaar) is op de motivatie gebaseerd, niet op de samenvattende kostenraming-tekst. Daarom sluit deze breakdown op het scenariobedrag, en niet op de € 60–72K uit het dossier-blok.",
    eenmalig: {
      hoofdtotaalLow: 95_000,
      hoofdtotaalHigh: 120_000,
      subComponenten: [
        {
          naam: "Externe begeleider programma-ontwerp en uitvoering (15 dagen × €2.500)",
          bedragLow: 33_000,
          bedragMid: 37_500,
          bedragHigh: 42_000,
          isPerJaar: false,
        },
        {
          naam: "Executive-tarief reservering MT-coaching (top-coaches tot €4K/dag)",
          bedragLow: 15_000,
          bedragMid: 20_000,
          bedragHigh: 25_000,
          isPerJaar: false,
        },
        {
          naam: "Individuele coaching 9 leidinggevenden × €4.000/traject",
          bedragLow: 32_000,
          bedragMid: 36_000,
          bedragHigh: 40_000,
          isPerJaar: false,
        },
        {
          naam: "HR-instrumentarium: functioneringscyclus + 360°-integratie",
          bedragLow: 13_000,
          bedragMid: 15_000,
          bedragHigh: 17_000,
          isPerJaar: false,
        },
      ],
    },
    structureel: {
      hoofdtotaalLow: 7_500,
      hoofdtotaalHigh: 11_500,
      subComponenten: [
        {
          naam: "360°-feedback tool licentie (vanaf jaar 1)",
          bedragLow: 4_000,
          bedragMid: 5_000,
          bedragHigh: 6_000,
          isPerJaar: true,
          vanafJaar: 1,
        },
        {
          naam: "Jaarlijkse cultuurmeting (vanaf jaar 3)",
          bedragLow: 2_000,
          bedragMid: 2_500,
          bedragHigh: 3_000,
          isPerJaar: true,
          vanafJaar: 3,
        },
        {
          naam: "Onboarding nieuwe leiders (vanaf jaar 5)",
          bedragLow: 1_500,
          bedragMid: 2_000,
          bedragHigh: 2_500,
          isPerJaar: true,
          vanafJaar: 5,
        },
      ],
    },
  },
];

/** Vind de known breakdown voor een inspanning-titel. */
export function vindKnownBreakdown(
  inspanningTitel: string,
): KnownBreakdown | null {
  const insp = inspanningTitel.toLowerCase();
  for (const b of KNOWN_BREAKDOWNS) {
    if (insp.includes(b.inspanningMatch)) return b;
  }
  return null;
}

/** Bereken cumulatief structureel bedrag (mid) over alle scenario-jaren,
 *  rekening houdend met vanafJaar per component. Returns 0 als er geen
 *  structurele section is. */
export function structureelCumulatiefMid(
  k: KnownBreakdown | null,
  aantalJaren: number,
): number {
  if (!k?.structureel) return 0;
  let som = 0;
  for (const c of k.structureel.subComponenten) {
    const start = c.vanafJaar ?? 1;
    const actiefJaren = Math.max(0, aantalJaren - start + 1);
    som += c.bedragMid * actiefJaren;
  }
  return som;
}
