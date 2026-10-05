// Stap 11, tabblad "Evaluatie 3sides": de twee onderdelen die alleen bij dat tabblad horen.
// - sectie "agenda": de agenda voor het evaluatiegesprek van één uur (voorstel, aanpasbaar);
// - sectie "brief": de begeleidende brief bij de versie die aan 3sides wordt overhandigd.
// De inhoud van de evaluatie zelf staat in de analyse (integratie-3sides-default.ts) en wordt
// op het tabblad als uitsnede getoond (evaluatie-uitsnede.ts).
// Standaardinhoud; in de app per kop en cel aanpasbaar en opgeslagen onder
// session.documenten[EVALUATIE_GESPREK_SLEUTEL].
// De evaluatie is een extern stuk over 3sides, geschreven als Cito ("wij"): wat 3sides heeft
// toegezegd en wat er is geleverd. Agenda en brief zeggen niets over wat Cito zelf nog doet;
// dat staat op het actiebord en op het tabblad Evaluatie intern.
// De agenda volgt de zes kaders in de volgorde van het document en verwijst naar de delen met
// de nummers van de analyse (deel 5 en 8); in de export worden dat deel 1 en 2
// (evaluatie-uitsnede.ts: herschrijfVerwijzingen). Deel 4 (de werkstroomkaarten) staat niet
// op het tabblad en niet in de export: verwijs er hier niet naar.
// De tijden zijn een voorstel; de brief heeft plekken tussen haken die de afzender invult.

import type { BewerkbaarDocument } from "@/lib/schemas";

export const EVALUATIE_GESPREK_SLEUTEL = "evaluatie-gesprek";

/** Sectie-id's in dit document; het tabblad en de export zoeken de secties hierop. */
export const GESPREK_AGENDA = "agenda";
export const GESPREK_BRIEF = "brief";

export const DEFAULT_EVALUATIE_GESPREK: BewerkbaarDocument = {
  titel: "Evaluatie Klant in Zicht: de eerste drie maanden met 3sides",
  ondertitel: "De planning van 3sides, wat er is geleverd en onze evaluatie op zes punten",
  status: "Stand van de bronnen: 01-10-2026; Miro-bord bekeken op 05-10-2026",
  secties: [
    {
      id: GESPREK_AGENDA,
      titel: "Agenda voor het evaluatiegesprek",
      intro:
        "Voorstel voor de agenda. Eén uur, alleen de evaluatie. We volgen de tijd, in dezelfde volgorde als het document: eerst de planning van 3sides, dan wat er in Q3 is geleverd, de stand op 1 oktober en de planning vooruit. Daarna onze evaluatie op zes punten. Per onderwerp eerst wat wij zien, met de bron, daarna de reactie van 3sides. We sluiten af met afspraken.",
      blokken: [
        {
          type: "tabel",
          titel: "Agenda (voorstel)",
          kolommen: ["Tijd", "Onderwerp", "Wat we bespreken", "Uitkomst"],
          rijen: [
            [
              "in te vullen",
              "Opening",
              "Het doel: het werk van 3sides na drie maanden evalueren. De kern in één zin: wij hadden te weinig zicht op het werk van 3sides. Voorstel: 3sides vertelt eerst zelf hoe het op de drie maanden terugkijkt.",
              "Hoe 3sides zelf terugkijkt",
            ],
            [
              "in te vullen",
              "De planning: de tijdlijn van 3sides (deel 5)",
              "De tijdlijn als basis: wat 3sides per onderdeel heeft gepland, van juli 2026 tot en met juni 2027.",
              "Hetzelfde beeld van de planning",
            ],
            [
              "in te vullen",
              "Wat is toegezegd en wat is geleverd (deel 5, 'Toegezegd en geleverd')",
              "De zes toezeggingen en de mijlpaal voor Q3 2026 uit het eerste voorstel. Per toezegging wat er op 1 oktober lag en wat ontbreekt. Onze vraag: wat is er volgens 3sides af, en waar kunnen wij dat zien?",
              "Per toezegging de stand volgens 3sides",
            ],
            [
              "in te vullen",
              "De stand op 1 oktober (deel 5, 'De tijdlijn van 3sides zelf')",
              "Welke onderdelen van de tijdlijn zijn over hun oplevermaand heen, welke lopen nog, en welke hebben geen datum. Onze vraag: welke datums gelden nu?",
              "Een nieuwe datum bij elk onderdeel dat is verstreken of geen datum heeft",
            ],
            [
              "in te vullen",
              "Vooruit: de planning voor de komende maanden (deel 5, 'Vooruit: wat opvalt')",
              "De 0-meting, de eerste pilot, de CRM-richting en de volgorde eind 2026. Onze vraag: wat is de planning die nu geldt, en hoe horen wij het voortaan vooraf als een datum niet wordt gehaald?",
              "Eén planning met de datums die nu gelden",
            ],
            [
              "in te vullen",
              "Onze evaluatie op zes punten (deel 8)",
              "De kern, en per punt onze bevinding met de vraag aan 3sides: leveren, tempo, rapporteren, onze medewerkers meenemen, ons framework en eigenaarschap, en onze regie. Daarbij de lessen uit Klant in Beeld: wat zagen we eerder ook? Uitgangspunt: wij leiden, 3sides volgt en voert uit.",
              "Per punt de reactie van 3sides en wat er verandert",
            ],
            [
              "in te vullen",
              "Afspraken en vervolg",
              "Wat 3sides oplevert, wanneer, en hoe het daarover rapporteert: elke week in de tijdlijn. Wanneer we opnieuw evalueren.",
              "Een afsprakenlijst met per afspraak wie, wat en wanneer",
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
            "Na drie maanden Klant in Zicht hebben wij jullie werk geëvalueerd op zes punten: leveren, tempo, rapporteren, ons helpen onze medewerkers mee te nemen, werken in ons framework en onze regie volgen. Bij deze brief vind je het resultaat: jullie planning met wat ons daarin opvalt, per toezegging wat er op 1 oktober lag en wat ontbrak, en per punt onze bevinding. De kern: wij hadden als programmateam in deze drie maanden geen beeld in hoofdlijnen van waar jullie aan werkten en hoe ver elke oplevering was. Aan het eind van het kwartaal kregen wij veel documenten tegelijk onder ogen, en daaruit hebben wij achteraf zelf moeten opmaken wat er ligt. Wekelijks rapporteren in de tijdlijn is pas recent afgesproken; daarvoor zagen wij alleen een beknopte weergave in jullie microspace. Wij willen het voortaan elke week in de tijdlijn kunnen zien. We beginnen bij de lessen uit de evaluatie van Klant in Beeld.",
        },
        {
          type: "tekst",
          tekst:
            "De maatstaf is wat jullie hebben toegezegd: de planning in jullie eerste voorstel. Daarnaast leggen we wat jullie zelf hebben opgeschreven: de resultaten in jullie plan van aanpak en de maanden in jullie tijdlijn. Die drie stukken spreken elkaar op datums tegen; waar ze verschillen, noemen we ze alle drie. Bij elke bevinding staat de bron: jullie voorstel, jullie plan van aanpak, de tijdlijn, de werkdocumenten, het Miro-bord van de klantreizen, de microspace, de presentatie van de informatiebijeenkomst, de evaluatie van Klant in Beeld en de samenvatting van ons overleg van 29 september. Waar een bevinding een waarneming van ons eigen programmateam is, staat dat erbij. Waar we naar onze eigen stukken verwijzen, het stappenplan en het organigram, lichten we die in het gesprek toe.",
        },
        {
          type: "tekst",
          tekst:
            "Ons uitgangspunt: wij leiden, 3sides volgt en voert uit. In ons stappenplan van 19-08-2026 staat het zo: 'wij voeren de regie' en 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop'. Per punt staat wat wij van jullie vragen.",
        },
        {
          type: "tekst",
          tekst:
            "We gebruiken dit stuk als basis voor ons gesprek van [datum gesprek]; de agenda staat erin. We stellen voor de zes punten in dat gesprek punt voor punt door te lopen, en horen graag per punt jullie reactie. Mis je een feit of zie je iets anders, laat het ons dan vooraf weten.",
        },
        { type: "tekst", tekst: "Met vriendelijke groet,\n\n[naam]\nprogramma-eigenaar Klant in Zicht, Cito" },
      ],
    },
  ],
};
