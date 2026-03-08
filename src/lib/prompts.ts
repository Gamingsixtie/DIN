// DIN-specifieke AI Prompts
// Gebaseerd op "Werken aan Programma's" (Prevaas & Van Loon)

export const DIN_MAPPING_PROMPT = `Je bent een expert in programmamanagement volgens de DIN-methodiek (Doelen-Inspanningennetwerk, Wijnen & Van der Tak, 2002).

Gegeven een programmadoel en beschikbare sectorplannen, genereer het volledige DIN-netwerk:

1. **Baten** (3-5 per doel): Gewenste effecten in de buitenwereld (klant, markt, organisatie).
   Per baat een batenprofiel met:
   - Omschrijving
   - Meetbare indicator
   - Eigenaar (rol/functie)
   - Huidige waarde (schatting)
   - Gewenste waarde

2. **Vermogens** (2-4 per baat): Wat de organisatie moet kunnen om de baten te realiseren.
   - Koppel aan relevante sectoren

3. **Inspanningen** (1-3 per vermogen): Concrete projecten/activiteiten, ingedeeld in 4 domeinen:
   - Mens: opleiding, training, bemensing
   - Processen: werkwijzen, procedures, governance
   - Data & Systemen: IT, data-infrastructuur, tooling
   - Cultuur: gedrag, mindset, waarden

Redeneer van rechts naar links (hoe-vraag): "Hoe bereiken we dit doel?" → baten → vermogens → inspanningen.

Antwoord in het Nederlands. Gebruik concrete, meetbare formuleringen.`;

export const CROSS_ANALYSE_PROMPT = `Analyseer de complete set DIN-netwerken en identificeer:

1. **Synergie**: Welke vermogens komen bij meerdere doelen terug? Dit zijn hefbomen — investeren hierin heeft breed effect.

2. **Gaps**: Zijn er doelen zonder voldoende inspanningen? Baten zonder vermogens? Vermogens zonder inspanningen?

3. **Hefboomwerking**: Welke inspanningen dragen bij aan meerdere baten? Prioriteer deze.

4. **Domein-balans**: Zijn alle 4 inspanningsdomeinen (Mens, Processen, Data & Systemen, Cultuur) voldoende afgedekt?

5. **Sector-overlap**: Welke inspanningen of vermogens komen bij meerdere sectoren terug? Waar kan gecombineerd worden?

Presenteer als matrix-overzicht. Antwoord in het Nederlands.`;

export const SECTOR_INTEGRATIE_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek). Je krijgt:
- De KiB-doelen (gezamenlijke programmadoelen)
- Het sectorplan van een specifieke sector
- De huidige DIN-invulling (baten, vermogens, inspanningen) voor deze sector

Geef concreet advies over hoe het DIN-netwerk geïntegreerd kan worden in het sectorplan:

1. **Aansluiting**: Welke items uit het sectorplan sluiten direct aan op de KiB-doelen? Waar zit overlap?

2. **Verrijking**: Welke baten/vermogens/inspanningen uit het DIN-netwerk versterken het bestaande sectorplan?

3. **Aanvullingen**: Welke onderdelen ontbreken nog in het sectorplan om de KiB-doelen te realiseren?

4. **Quick wins**: Welke bestaande activiteiten uit het sectorplan kunnen direct bijdragen aan DIN-inspanningen?

5. **Aandachtspunten**: Waar zijn er conflicten of spanningen tussen sectorplan en DIN?

Antwoord in het Nederlands. Wees concreet en verwijs naar specifieke items uit het sectorplan en de DIN-invulling.`;

export const PROGRAMMAPLAN_PROMPT = `Genereer een samenhangend programmaplan document op basis van alle DIN-data.

Structuur:
1. Programmavisie (uit KiB)
2. Programmadoelen (top 5, gerankt)
3. Per doel: DIN-netwerk (baten → vermogens → inspanningen)
4. Cross-analyse: synergieën, hefbomen, gaps
5. Geprioriteerde inspanningen
6. Tijdlijn/roadmap per kwartaal
7. Sectorale vertalingen
8. Governance en monitoring (batenprofielen)

Antwoord in het Nederlands. Gebruik professionele maar toegankelijke taal.`;

export const BATENPROFIEL_PROMPT = `Stel voor een gegeven baat een volledig batenprofiel op:

- **Omschrijving**: Wat is het gewenste effect? Wie merkt het?
- **Meetbare indicator**: Welke KPI of metric meet deze baat? (specifiek, niet vaag)
- **Eigenaar**: Wie is verantwoordelijk voor het realiseren van deze baat? (rol/functie)
- **Huidige waarde**: Wat is de huidige stand van de indicator? (of beste schatting)
- **Gewenste waarde**: Wat is het doel? Wanneer?
- **Meetmoment**: Wanneer en hoe wordt gemeten?

Antwoord in het Nederlands. Wees specifiek en meetbaar.`;
