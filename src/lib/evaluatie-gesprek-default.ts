// Stap 11, tabblad "Evaluatie 3sides": de twee onderdelen die alleen bij dat tabblad horen.
// - sectie "agenda": de agenda voor het evaluatiegesprek van één uur (voorstel, aanpasbaar);
// - sectie "brief": de begeleidende brief bij de versie die aan 3sides wordt overhandigd.
// De inhoud van de evaluatie zelf staat in de analyse (integratie-3sides-default.ts) en wordt
// op het tabblad als uitsnede getoond (evaluatie-uitsnede.ts).
// Standaardinhoud; in de app per kop en cel aanpasbaar en opgeslagen onder
// session.documenten[EVALUATIE_GESPREK_SLEUTEL].
// De agenda verwijst naar de delen met de nummers van de analyse (deel 4, 5 en 8); in de
// export worden dat deel 1, 2 en 3 (evaluatie-uitsnede.ts: herschrijfVerwijzingen).
// De tijden zijn een voorstel; de brief heeft plekken tussen haken die de afzender invult.

import type { BewerkbaarDocument } from "@/lib/schemas";

export const EVALUATIE_GESPREK_SLEUTEL = "evaluatie-gesprek";

/** Sectie-id's in dit document; het tabblad en de export zoeken de secties hierop. */
export const GESPREK_AGENDA = "agenda";
export const GESPREK_BRIEF = "brief";

export const DEFAULT_EVALUATIE_GESPREK: BewerkbaarDocument = {
  titel: "Evaluatie Klant in Zicht: de eerste drie maanden met 3sides",
  ondertitel: "Wat er per werkstroom ligt, wat er is geleverd en de evaluatie op zes kaders",
  status: "Stand van de bronnen: 01-10-2026",
  secties: [
    {
      id: GESPREK_AGENDA,
      titel: "Agenda voor het evaluatiegesprek",
      intro:
        "Eén uur, alleen de evaluatie. De opbouw: eerst wat er ligt, dan de planning, dan de zes kaders en tot slot de afspraken. Bij elk onderdeel eerst de constatering met de bron, daarna de reactie van 3sides.",
      blokken: [
        {
          type: "tabel",
          titel: "Agenda (voorstel; de tijden zijn aanpasbaar)",
          kolommen: ["Tijd", "Onderwerp", "Wat we bespreken", "Uitkomst"],
          rijen: [
            [
              "0:00–0:05",
              "Opening",
              "Het doel van het gesprek: na drie maanden samen vaststellen waar we staan. De werkwijze: per onderdeel de constatering met de bron, daarna de reactie van 3sides.",
              "Hetzelfde beeld van doel en werkwijze",
            ],
            [
              "0:05–0:15",
              "Wat er per werkstroom ligt (deel 4)",
              "Per werkstroom: de resultaten uit het plan van aanpak van 3sides, wat er nu ligt en wat het plan van aanpak nog mist.",
              "Per werkstroom vastgesteld wat er ligt en wat ontbreekt",
            ],
            [
              "0:15–0:25",
              "Planning en opleveringen (deel 5)",
              "De negen onderdelen met een oplevering tot en met oktober: geleverd, ja of nee. Welke datums zijn verschoven en welke onderdelen hebben nog geen datum.",
              "Per onderdeel de stand, en een nieuwe datum waar de oude is verstreken",
            ],
            [
              "0:25–0:35",
              "Leveren, tempo en rapporteren (deel 8, kader 1 tot en met 3)",
              "Levert 3sides wat is afgesproken, blijft het tempo erin, en lezen we uit de rapportage wat af is en wat vastzit.",
              "Per kader de reactie van 3sides en wat er verandert",
            ],
            [
              "0:35–0:45",
              "Eén framework, eigenaarschap en medewerkers meenemen (deel 8, kader 4 en 5)",
              "Werkt 3sides in het ene framework van het programma, ligt het eigenaarschap bij Cito, en hoe neemt 3sides de medewerkers van Cito mee.",
              "Per kader de reactie van 3sides en wat er verandert",
            ],
            [
              "0:45–0:55",
              "Rolverdeling en wie aan zet is (deel 8, kader 6)",
              "Het voorstel van het programma voor de rolverdeling: Cito leidt, 3sides voert uit; wie bepaalt en toetst, en wie regelt de volgende stap, ook bij een validatie door Cito. Per onderdeel dat niet is geleverd: wat doet 3sides, wat doet Cito.",
              "De rolverdeling samen vastgelegd; per onderdeel wie aan zet is",
            ],
            [
              "0:55–1:00",
              "Afspraken en vervolg",
              "Wat spreken we af, wie doet het en wanneer. Wanneer kijken we opnieuw.",
              "Een afsprakenlijst met per afspraak een naam en een datum",
            ],
          ],
          legenda: "",
        },
      ],
    },
    {
      id: GESPREK_BRIEF,
      titel: "Begeleidende brief voor 3sides",
      intro: "",
      blokken: [
        { type: "tekst", tekst: "[plaats], [datum]" },
        { type: "tekst", tekst: "Betreft: evaluatie Klant in Zicht, de eerste drie maanden" },
        { type: "tekst", tekst: "Beste [naam]," },
        {
          type: "tekst",
          tekst:
            "Na drie maanden Klant in Zicht hebben wij de stand opgemaakt. Bij deze brief vind je onze evaluatie: wat er per werkstroom ligt, de planning met wat er is geleverd, en onze constateringen op zes kaders.",
        },
        {
          type: "tekst",
          tekst:
            "Bij elke constatering staat de bron: jullie plan van aanpak, de tijdlijn, de werkdocumenten, de statuspagina en de samenvatting van ons overleg van 29 september. Waar een constatering een waarneming van ons eigen programmateam is, staat dat erbij. Waar we naar eigen stukken van Cito verwijzen, het stappenplan en het organigram, lichten we die in het gesprek toe. Per kader staat ook wie aan zet is. Waar de volgende stap bij Cito ligt, staat dat er net zo duidelijk bij. De rolverdeling staat erin als voorstel van het programma; dat voorstel is nog niet met jullie besproken en willen we in het gesprek samen vastleggen.",
        },
        {
          type: "tekst",
          tekst:
            "We gebruiken dit stuk als basis voor ons gesprek van [datum gesprek]; de agenda staat erin. Mis je een feit of zie je iets anders, laat het ons dan vooraf weten. Dan nemen we het mee in het gesprek.",
        },
        { type: "tekst", tekst: "Met vriendelijke groet,\n\n[naam]\nprogramma-eigenaar Klant in Zicht, Cito" },
      ],
    },
  ],
};
