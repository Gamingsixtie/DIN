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
        "Voorstel voor de agenda. Eén uur, alleen de evaluatie. Eerst waarom we hier zitten: de kern van de evaluatie en de lessen uit Klant in Beeld. Daarna de feiten in de volgorde wat er ligt, wanneer het komt en hoe wij het konden volgen, en dan de samenwerking. Per punt eerst onze bevinding met de bron, daarna de reactie van 3sides. We sluiten af met afspraken.",
      blokken: [
        {
          type: "tabel",
          titel: "Agenda (voorstel)",
          kolommen: ["Tijd", "Onderwerp", "Wat we bespreken", "Uitkomst"],
          rijen: [
            [
              "in te vullen",
              "Opening en werkwijze",
              "Het doel: het werk van 3sides na drie maanden evalueren op zes punten. De werkwijze: per punt eerst onze bevinding met de bron, daarna de reactie van 3sides; aan het eind de afspraken. Het uitgangspunt: wij leiden, 3sides volgt en voert uit (deel 8, Rolverdeling).",
              "Overeenstemming over doel, werkwijze en uitgangspunt",
            ],
            [
              "in te vullen",
              "De kern: zicht op het werk (deel 8)",
              "Wij hadden in de eerste drie maanden geen beeld in hoofdlijnen van waar 3sides aan werkte en hoe ver elke oplevering was. Er is onvoldoende met ons besproken wat er precies was gedaan: wij zagen alleen een beknopte weergave in de microspace van 3sides, en aan het eind van het kwartaal kregen wij veel documenten tegelijk. Wekelijks rapporteren in de tijdlijn is pas recent afgesproken. Voorstel: 3sides vertelt eerst zelf hoe het op de drie maanden terugkijkt; daarna onze waarneming en wat wij als eerste vragen: elke week per oplevering zien waar 3sides aan werkt, hoe ver het is en wat in de weg staat.",
              "Hoe 3sides zelf terugkijkt, en of 3sides ons beeld herkent",
            ],
            [
              "in te vullen",
              "Startpunt: de lessen uit Klant in Beeld (deel 8)",
              "Welke drie lessen haalt 3sides zelf uit de evaluatie van Klant in Beeld, en in welk onderdeel van de tijdlijn en met welke datum zien wij elk daarvan vóór eind december terug?",
              "Drie lessen van 3sides, elk met een onderdeel van de tijdlijn en een datum",
            ],
            [
              "in te vullen",
              "Leveren (deel 8, punt 1; de tabel 'Toegezegd en geleverd' in deel 5)",
              "Is er geleverd wat 3sides heeft toegezegd: de zes toezeggingen en de mijlpaal voor Q3 2026 uit het eerste voorstel, met de onderdelen uit de tijdlijn die erbij horen. Per toezegging wat er ligt en wat ontbreekt. Onze vraag: wat is er volgens 3sides af van wat voor Q3 was gepland, en waar kunnen wij dat zien?",
              "Per toezegging de stand volgens 3sides, en een nieuwe datum waar die nodig is",
            ],
            [
              "in te vullen",
              "Tempo (deel 8, punt 2; 'Wat opvalt in de planning' in deel 5)",
              "Welke datums gelden nu: voor de onderdelen die over hun oplevermaand heen zijn, voor de 0-meting en voor de eerste pilot. En hoe horen wij het voortaan vooraf als een datum niet wordt gehaald?",
              "Eén planning met de datums die nu gelden",
            ],
            [
              "in te vullen",
              "Rapporteren (deel 8, punt 3)",
              "Hoe zien wij voortaan elke week, zonder alle stukken te lezen, wat af is, wat vastzit en waarom? Dit sluit aan op de kern.",
              "Afspraak over de wekelijkse tijdlijn: wat erin staat en wanneer wij hem krijgen",
            ],
            [
              "in te vullen",
              "Samenwerking: medewerkers meenemen, ons framework en eigenaarschap, onze regie (deel 8, punt 4, 5 en 6)",
              "Wat merken onze medewerkers vóór eind december van het programma, en wanneer is het adoptieframework zo ver dat we ermee kunnen werken? Werkt 3sides in ons framework en met onze begrippen, en hoe komen kennis en resultaat per werkstroom bij ons te liggen? Legt 3sides keuzes op tijd als advies aan ons voor, en bereidt 3sides de stappen uit het eigen plan voor en plant het ze in?",
              "Per punt de reactie van 3sides en wat er verandert",
            ],
            [
              "in te vullen",
              "Afspraken en vervolg",
              "Wat 3sides oplevert, wanneer, en hoe het daarover rapporteert. Wanneer we opnieuw evalueren.",
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
