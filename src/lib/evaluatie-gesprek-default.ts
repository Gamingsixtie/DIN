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
  ondertitel: "De planning van 3sides, wat er is geleverd en onze evaluatie op zes kaders",
  status: "Stand van de bronnen: 01-10-2026",
  secties: [
    {
      id: GESPREK_AGENDA,
      titel: "Agenda voor het evaluatiegesprek",
      intro:
        "Eén uur, alleen de evaluatie. We beginnen bij de lessen uit Klant in Beeld en volgen daarna de zes kaders in de volgorde van het document: leveren, tempo, rapporteren, hulp bij het meenemen van onze medewerkers, ons framework en eigenaarschap, en onze regie. Per kader eerst onze bevinding met de bron, daarna de reactie van 3sides. We sluiten af met wat 3sides oplevert, wanneer, en hoe het rapporteert.",
      blokken: [
        {
          type: "tabel",
          titel: "Agenda (voorstel; de tijden zijn aanpasbaar)",
          kolommen: ["Tijd", "Onderwerp", "Wat we bespreken", "Uitkomst"],
          rijen: [
            [
              "0:00–0:08",
              "Opening en startpunt: de lessen uit Klant in Beeld (deel 8)",
              "Het doel: na drie maanden het werk van 3sides evalueren op zes kaders. De kern: wij hadden in deze drie maanden geen beeld in hoofdlijnen van waar 3sides aan werkte en hoe ver elke oplevering was, en kregen aan het eind veel documenten tegelijk; wij willen dat voortaan elke week in de tijdlijn zien. De werkwijze: per kader onze bevinding met de bron, daarna de reactie van 3sides. Het uitgangspunt: wij leiden, 3sides volgt en voert uit. Het startpunt: welke drie lessen haalt 3sides zelf uit de evaluatie van Klant in Beeld, en waar zien wij elk daarvan vóór eind december terug: in welk onderdeel van de tijdlijn en met welke datum?",
              "Hetzelfde beeld van doel, werkwijze en uitgangspunt; drie lessen van 3sides, elk met een onderdeel en een datum",
            ],
            [
              "0:08–0:20",
              "Leveren (deel 8, kader 1)",
              "Ligt er wat 3sides zelf heeft opgeschreven: de zes toezeggingen voor Q3 2026 uit het eerste voorstel, van de kick-off tot de pilotgroep, met de onderdelen uit de tijdlijn die erbij horen. In de tabel 'Toegezegd en geleverd' (deel 5) staat per toezegging wat er ligt en wat ontbreekt; de tijdlijn ligt erbij.",
              "Per onderdeel de stand volgens 3sides, en een nieuwe datum waar de maand is verstreken",
            ],
            [
              "0:20–0:30",
              "Tempo en rapporteren (deel 8, kader 2 en 3)",
              "Blijft het tempo erin, en lezen wij uit de rapportage wat af is, wat vastzit en waarom. Met de tijdlijn erbij (deel 5).",
              "Per kader de reactie van 3sides en wat er verandert",
            ],
            [
              "0:30–0:40",
              "Hulp bij het meenemen van onze medewerkers (deel 8, kader 4)",
              "Hoe helpt 3sides ons onze medewerkers mee te nemen in de verandering, en wanneer is het adoptieframework zo ver dat we ermee kunnen werken.",
              "De reactie van 3sides en wat er verandert",
            ],
            [
              "0:40–0:52",
              "Eén framework, eigenaarschap en regie (deel 8, kader 5 en 6)",
              "Werkt 3sides in ons framework en met onze begrippen, komen kennis en resultaat per werkstroom bij ons te liggen, en volgt 3sides onze regie: voorleggen, de stappen uit het eigen plan regelen en vroeg melden als iets vastloopt.",
              "Per kader de reactie van 3sides en wat er verandert",
            ],
            [
              "0:52–1:00",
              "Afspraken en vervolg",
              "Wat 3sides oplevert, wanneer, en hoe het daarover rapporteert. Wanneer we opnieuw evalueren.",
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
            "Na drie maanden Klant in Zicht hebben wij jullie werk geëvalueerd op zes punten: leveren, tempo, rapporteren, ons helpen onze medewerkers mee te nemen, werken in ons framework en onze regie volgen. Bij deze brief vind je het resultaat: jullie planning met wat ons daarin opvalt, per toezegging wat er op 1 oktober lag en wat ontbrak, en per punt onze bevinding. De kern: wij hadden als programmateam in deze drie maanden geen beeld in hoofdlijnen van waar jullie aan werkten en hoe ver elke oplevering was. Aan het eind van het kwartaal kregen wij veel documenten tegelijk onder ogen, en daaruit hebben wij achteraf zelf moeten opmaken wat er ligt. Wij willen het voortaan elke week in de tijdlijn kunnen zien. We beginnen bij de lessen uit de evaluatie van Klant in Beeld.",
        },
        {
          type: "tekst",
          tekst:
            "De maatstaf is wat jullie zelf hebben opgeschreven: de planning in jullie eerste voorstel, de resultaten in jullie plan van aanpak en de maanden in jullie tijdlijn. Die drie stukken spreken elkaar op datums tegen; waar ze verschillen, noemen we ze alle drie. Bij elke bevinding staat de bron: jullie voorstel, jullie plan van aanpak, de tijdlijn, de werkdocumenten, het Miro-bord van de klantreizen, de statuspagina, de presentatie van de town hall, de evaluatie van Klant in Beeld en de samenvatting van ons overleg van 29 september. Waar een bevinding een waarneming van ons eigen programmateam is, staat dat erbij. Waar we naar onze eigen stukken verwijzen, het stappenplan en het organigram, lichten we die in het gesprek toe.",
        },
        {
          type: "tekst",
          tekst:
            "Ons uitgangspunt staat in ons stappenplan van 19-08-2026: wij leiden, 3sides volgt en voert uit. Per punt staat wat wij van jullie vragen.",
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
