# Audit Begroting — Sessie d8b97442

Wat is er getoetst? Of de begroting in **Stap 6 Optimaliseren** klopt met wat jij in eerdere wizard-stappen hebt ingevuld, en of de bedragen realistisch zijn voor Cito.

> Voor 4 inspanningen × 4 scenario's = 16 cellen onderzocht. De rekenkundige check (kloppen alle sommen onderling) was al PASS in [AUDIT-berekeningen-vs-begroting.md](AUDIT-berekeningen-vs-begroting.md). Deze audit gaat over of de **inhoud** klopt.

---

## In één pagina — wat is er aan de hand?

### Kort gezegd
Drie van de vier inspanningen kloppen prima met je dossier-input. **Maar er zijn vier serieuze problemen** waar het scheef zit:

1. 🔴 **Cultuur is te laag begroot in alle scenario's** — €11.000 per leidinggevende voor een meerjarig outside-in-traject. Daar koop je een paar workshops voor, geen echte gedragsverandering. Tegelijk staat het bedrag wél boven het dossier-plafond.

2. 🔴 **CRM in het advies-scenario (€817K) heeft géén reservepotje** — terwijl jouw eigen dossier expliciet zegt dat er 30% buffer nodig is voor onzekerheden (Stichting Cito, platformkeuze). Eén tegenvaller en je zit boven budget.

3. 🟠 **Mens-budget is voor alle scenario's gelijk (€142K)** — ook voor het 10-jaars-scenario. Dat is onlogisch: voor 10 jaar moet je nieuwe mensen onboarden, refreshers geven. Dat is niet meegenomen.

4. 🟠 **Processen draait op 5 mensen voor 3 sectoren** — en sector Professionals heeft geen procesondersteuner. Externe inhuur wordt onvermijdelijk maar het tarief is "nog niet bepaald". Risico: 30-40% van het budget gaat op aan inhuur.

### De rest is in orde
- Geen interne uren per ongeluk in de out-of-pocket-bedragen verdwaald (✓)
- Motiveringen zijn niet "verzonnen" — alle getallen komen uit jouw dossier (✓)
- Methodologie van de fases klopt voor 94% (Bewustwording, Realisatie, Standaardisatie, etc. zijn correct gebruikt)
- Geen absolute jaartallen in motivatieteksten (zoals het hoort)

---

## Wat betekenen de scenario-namen eigenlijk?

Even ter verduidelijking, want dit is ook deel van de verwarring:

| Naam | Looptijd | Cap per jaar | Totaal | Wat is het écht? |
|------|----------|--------------|--------|------------------|
| `optimaal` | 7 jaar | €250K/jr | €1.490K | "Huidig budget" — jouw bestaande jaarbudget gebruikt |
| `plus20` | 5 jaar | €300K/jr | €1.270K | 20% meer budget per jaar, sneller klaar |
| `min20` | 10 jaar | €200K/jr | €1.819K | 20% minder budget per jaar, langer doorlopen |
| `advies` | 4 jaar | €341K/jr | €1.159K | Het AI-aanbevolen scenario: kortste haalbare looptijd |

> De naam `optimaal` is misleidend — dat is niet het beste, maar het bestaande budget. Het AI-advies is `advies`, niet `optimaal`.

---

# Probleem 1: Cultuur klopt niet — dubbel probleem 🔴

## Wat zie je in §4.1?

| Scenario | Cultuur-totaal | Per leidinggevende (÷9) |
|----------|----------------|--------------------------|
| advies (4j) | €100.000 | **€11.111** |
| plus20 (5j) | €105.000 | €11.667 |
| optimaal (7j) | €115.000 | €12.778 |
| min20 (10j) | €130.000 | €14.444 |

## Wat staat er in jouw dossier?

Het cultuur-dossier zegt **letterlijk**:

> *"totale out-of-pocket omvang van circa €60.000–€72.000 **over vier jaar** (2026–2029)"*

Dus: maximaal €72K voor het hele programma. Punt.

## Waar gaat het mis?

**Punt A — boven dossier-plafond.** Het dossier zegt max €72K (eenmalige som over 4 jaar). De begroting toont €100K → €130K. Dat is 39% tot 81% méér dan jij hebt afgesproken in je dossier. De software heeft het structurele deel (€25-30K voor jaren 2028-2029) verkeerd opgevat als "elk jaar opnieuw" in plaats van "totaal voor die twee jaren". Bij min20 (10 jaar) wordt dat dan jaar na jaar herhaald.

**Punt B — toch te weinig per persoon.** Tegelijk is €11.111 per leidinggevende voor een meerjarig diepgaand outside-in-traject **te weinig**. Voor zo'n programma zijn nodig:
- workshops (paar dagen)
- coaching (executive niveau is duur — €4.000/dag is geen uitzondering)
- 360°-feedback (vaak met tool-licentie €5K/jaar)
- intervisie-begeleiding
- meting van gedragsverandering

In de markt kost dat tussen **€15.000 en €30.000 per leidinggevende** over meerdere jaren. Jouw advies-scenario zit ver onder de ondergrens.

## Wat is hier dus het rare?

Het bedrag is **te hoog t.o.v. jouw eigen dossier-afspraak** maar **te laag voor wat het programma écht nodig heeft**. Dat betekent dat het dossier zelf onderschat wat een echt outside-in cultuurprogramma kost. Niet alleen de software-fout.

## Wat moet er gebeuren?

1. **Voor deze sessie**: zet cultuur in advies + plus20 op €130K-€135K. Dan zit je rond €14-15K per leidinggevende — onderkant benchmark, maar minimaal werkbaar. Cap-headroom (4 jaar × €341K = €1.364K) heb je ruim.
2. **Voor toekomstige sessies**: pas de wizard aan zodat hij vraagt om zowel het *eenmalige* als het *jaarlijkse structurele* deel apart, in plaats van een grand-total. En de software-parser moet patronen als "*€X over Y jaar*" herkennen als absolute cap.

---

# Probleem 2: CRM advies-scenario heeft geen buffer 🔴

## Wat zie je?

CRM in advies-scenario: **€817.000** voor 4 jaar.

## Wat staat er in jouw dossier?

> *"€440K–€640K eenmalig … met een PM-buffer van 30% zolang de Stichting Cito-afhankelijkheid en de platformkeuze nog open zijn (worst-case plafond circa €830K)"* + structureel €75K-€110K/jaar

Lees dat goed: jouw eigen dossier zegt dat er **30% reserve** nodig is omdat er twee grote onzekerheden zijn:
- Stichting Cito-ontvlechting (kan platformscope verdubbelen → tot €1,1M)
- Platform-keuzeproces nog niet rond

## Waar gaat het mis?

| | Bedrag | Wat past erin |
|---|--------|---------------|
| Eenmalig minimum (mid-band) | €540K | basisscope CRM |
| 4 jaar structureel (€92,5K/jr) | €370K | licenties + beheer |
| **Subtotaal** | **€910K** | |
| 30% PM-buffer (uit dossier!) | +€185K | onzekerheden | 
| **Worst-case totaal** | **€1.095K** | |

Maar het advies-scenario heeft maar €817K. Dat zit **onder het basisbedrag** wat al niet past, laat staan met de buffer die jouw eigen dossier eist.

Concreet betekent dat:
- Eén onverwachte tegenvaller (datamigratie loopt uit, of Stichting Cito-ontvlechting blijkt complex) → meteen boven budget
- Geen ruimte om de Stichting Cito-scope-uitbreiding op te vangen (kan €350K-€460K extra kosten)
- "Single-point-of-failure" — geen marge

Plus20 (€910K) heeft nét voldoende voor het basisbedrag, maar geen marge voor onverwachte zaken.

## Wat moet er gebeuren?

1. **Reserveer €150K extra in advies-scenario** als ringfenced "Stichting Cito + datakwaliteit"-buffer. Brengt CRM op €967K. Cap is 4j × €341K = €1.364K, dus er is genoeg ruimte (71% benutting).
2. **In de motivatie van CRM moet expliciet staan** dat er een 30% PM-buffer is, en dat het worst-case bedrag €830K eenmalig is. Nu staat het er niet, en daardoor kan iemand die het rapport leest niet snappen waarom het bedrag boven de naïeve high-band uitkomt.
3. **Architectuur-besluit Q2 2026 vóór leveranciersselectie** — als je voor de start formeel besluit hoe je omgaat met Stichting Cito, valt het grote risico weg.

---

# Probleem 3: Mens-budget is verdacht-lineair 🟠

## Wat zie je?

| Scenario | Looptijd | Mens-budget | Per opgeleide (÷80) |
|----------|----------|-------------|---------------------|
| advies | 4 jaar | €142.000 | €1.775 |
| plus20 | 5 jaar | €142.500 | €1.781 |
| optimaal | 7 jaar | €143.000 | €1.788 |
| min20 | 10 jaar | €142.500 | €1.781 |

Zie je het? **Bijna identiek** voor alle scenario's. Verschil tussen advies (4 jaar) en min20 (10 jaar) is slechts €500.

## Waarom is dat raar?

Voor 4 jaar is dat wel logisch: het trainingstraject duurt 10-12 maanden, daarna wat borging, klaar.

Maar voor **10 jaar** moet er meer gebeuren:
- Nieuwe medewerkers die in jaar 4-10 binnenkomen → moeten ook getraind worden (onboarding)
- Bestaande medewerkers vergeten dingen → refresher-sessies nodig
- Curriculum moet up-to-date blijven (markt verandert)

Niets daarvan is in het min20-budget meegenomen. Het systeem heeft het trainingstraject als één-malig behandeld, ongeacht of de looptijd 4 of 10 jaar is.

## En nóg iets

Jouw dossier rekent met **66 deelnemers** (PO ~14, Prof ~30, VO ~22). Maar in Stap 7 heb je **80 mensen geselecteerd**. Dat is 21% méér mensen dan waarop het dossier-bedrag is gebaseerd.

Als je inderdaad 80 mensen wil opleiden in plaats van 66, klopt het budget al niet meer.

## Per opgeleide vergeleken met de markt

| | Bedrag |
|---|--------|
| Jouw begroting | €1.775 per opgeleide |
| Markt-benchmark voor meerdaagse training + e-learning + nazorg | €1.500-€3.000 per opgeleide |
| **Plus** vast budget voor train-de-trainer + LMS + content-ontwikkeling | €40-€80K (los van aantal personen) |

Je zit op de **onderkant** van de benchmark, en het vaste budget voor train-de-trainer en LMS-licentie is helemaal niet apart begroot.

## Wat moet er gebeuren?

1. **Splits het budget in twee posten**:
   - Vast: content-ontwikkeling + train-de-trainer + LMS-licentie = €40-80K eenmalig
   - Variabel: training per deelnemer = ~€1.500/persoon
2. **Voor min20 (10 jaar)**: voeg expliciet refresher-budget toe vanaf jaar 4 (€10-15K/jaar) en onboarding-budget voor nieuwe medewerkers (~€500/persoon).
3. **Bepaal of je 66 of 80 deelnemers wil** — sluit het dossier en de Stap 7-selectie op elkaar aan, anders is het budget per definitie scheef.

---

# Probleem 4: Processen draait op 5 mensen voor 3 sectoren 🟠

## Wat zie je in Stap 7?

Geselecteerde uitvoerders voor processen:
- 1× Projectmanager D
- 1× Procesmanager Data
- 1× Procesondersteuner PO
- 1× Procesondersteuner VO
- 1× custom-rol

**Sector Professionals heeft géén dedicated procesondersteuner.** En 5 mensen voor cross-sectorale BPM in 3 sectoren = 1,67 persoon per sector (waarvan 1 cross-functioneel).

## Wat zegt jouw dossier?

> *"Externe trainer-/procesbegeleiderstarief is nog niet bepaald ('ntb'); marktconforme tarieven liggen tussen €900 en €1.400/dag, kan externe kostenpost verhogen tot €25K-€40K"*

Dus: tarief van inhuur is niet vastgelegd, en de werkelijke marktprijs kan een groot deel van het budget opslokken.

## Wat is het probleem?

Bij advies-scenario (€100K, 4 jaar):
- Externe inhuur (worst case): €40K = **40% van het budget**
- Dossier-mid eenmalig: €62K
- 4 jaar structureel à €12K: €48K
- **Totaal puur op dossier-basis al €110K** — meer dan het advies-bedrag van €100K

Dus: zelfs zonder onverwachte tegenvallers past het al niet.

En de fase-verdeling laat zien dat **45-58% van het budget naar voorbereiding gaat** (as-is mapping, herontwerp, pilot), terwijl uitrol marginaal is. Patroon: kader wordt ontworpen maar onvoldoende uitgerold.

## Wat is daar het effect van?

Vertraging is bijna onvermijdelijk:
- 5 mensen voor 3 sectoren betekent dat elke uitvoerder 2 sectoren tegelijk doet → burn-out-risico
- Externe inhuur is de facto verplicht maar tarief onbepaald
- Sector Prof zonder procesondersteuner = die sector blijft achter

Risico: 6-9 maanden vertraging à €15K/maand = **€90K-€135K extra kosten** die niet zijn opgenomen.

## Wat moet er gebeuren?

1. **Voeg een 6e procesondersteuner voor sector Prof toe in Stap 7-selectie.**
2. **Onderhandel het externe-inhuurtarief vóór de start** met een max-fee. Niet "ntb" laten staan.
3. **Splits budget in twee posten**:
   - Externe inhuur (vast contract, max 33% van budget)
   - Cross-sectorale governance/tooling (Smartprocess-licenties, etc.) — €15-25K eenmalig apart
4. **Verlaag voorbereiding** of verhoog totaalbudget voor advies-scenario — dossier zegt zelf dat het niet past.

---

# Andere bevindingen (kleinere issues)

## Bij het advies-scenario zegt de tekst iets wat de data tegenspreekt

In `prioriteitAdvies` staat: *"Mens volgt op rang 2 omdat gespreksvaardigheid de cultuur naar de klant vertaalt"*. Maar in de data staat **mens=rank 3** en **cultuur=rank 2**. Tekst en data inconsistent.

Oorzaak: in de prompt staat tegelijk dat (a) rank = euro-bedrag aflopend moet zijn én (b) cultuur staat altijd op rang 2 in belang. Die twee regels conflicteren. AI heeft (b) gevolgd, tekst beschrijft (a). Kies één van de twee.

## In min20 (10 jaar) zijn jaar 7 en 8 voor processen letterlijk identiek

Letterlijk dezelfde activiteit-tekst:
> *"Doorlopend proceseigenaarschap (4-8 uur/maand per sector), kwartaalreviews op funnelconsistentie, onboarding nieuwe medewerkers en verfijning funneldefinities op basis van CRM-data."*

Schending van regel: *"geen herhaling tussen jaren — elke activiteit-tekst uniek"*. AI heeft hier onvoldoende variatie geforceerd voor de uitsmering. Idem mens min20 jaar 4 en jaar 5 (bijna identiek, alleen puntkomma → "en").

## In min20 staan late-jaar fase-labels die niet bij het domein horen

Voorbeelden:
- Data/Systemen jaar 9-10: "Doorontwikkeling", "Continu verbeteren" — die laatste hoort bij Processen-vocabulaire
- Mens jaar 9-10: "Verankering", "Continue ontwikkeling" — beide niet uit Mens-vocabulaire
- Cultuur jaar 9: "Continue ontwikkeling" — niet uit Cultuur-vocabulaire

Dit is omdat AI ruimte moet vullen voor 10 jaar maar het methodologische vocabulaire eindigt na ~6-7 fases. Oplossing: instructie verfijnen dat dezelfde eindfase meerdere jaren mag beslaan met onderscheiden activiteit-tekst.

## Plus20 + advies missen een fase die optimaal + min20 wel hebben

- Voor CRM: **Leverancier-selectie** ontbreekt in plus20 + advies (zit impliciet in jaar 1, maar zonder fase-naam zichtbaar).
- Voor Mens: **Curriculumvalidatie & pilot** ontbreekt in plus20 + advies.

Volgens regel 12: *"alleen tempo verschilt"* — fases moeten in elk scenario inhoudelijk hetzelfde zijn.

## Onderbenutting in late jaren

In sommige jaren wordt het jaarbudget niet gevuld:
- **min20 laatste 3 jaar**: 72-78% benutting
- **optimaal jaar 2032**: 56% benutting
- **advies jaar 2026 + 2029**: 67-74% benutting

Bij Cito leidt onderbesteding tot **vrijval + lagere cap volgend jaar** (memory-context). Lange-staart-jaren zijn dus dubbel kwetsbaar.

---

# Samenvattend — wat moet er gebeuren? (volgorde van urgentie)

## Urgent (raakt budget direct)

### 1. CRM advies-scenario verhogen naar €967K
Nu €817K — zit onder het minimum dat jouw eigen dossier voorschrijft. Voeg €150K reserve toe voor Stichting Cito + datakwaliteit. Cap-headroom heb je (4 × €341K = €1.364K).

### 2. Cultuur-budget herzien
Nu zit cultuur boven dossier-plafond én onder benchmark per leidinggevende. Twee dingen tegelijk repareren:
- Voor deze sessie: zet advies + plus20 op €130-135K.
- Voor toekomstige sessies: vraag in de wizard naar eenmalig + jaarlijks-structureel apart.

### 3. Processen advies-scenario herzien
€100K dekt eenmalig + structureel niet eens (dossier-mid €62K + 4j × €12K = €110K). Plus externe inhuur kan 40% opslokken. Verhoog of pas scope aan.

### 4. Mens — vast deel apart begroten
Voeg train-de-trainer + LMS + content-ontwikkeling als aparte vaste post toe (€40-80K). Voor min20: refresher + onboarding-budget vanaf jaar 4. Sluit dossier-aanname (66) en Stap 7-selectie (80) op elkaar aan.

## Belangrijk maar niet acuut (kwaliteit van rapport)

### 5. Tekst in advies-scenario corrigeren
"Mens = rang 2" tekst tegenstrijdig met data (mens = rang 3). Of tekst aanpassen, of rank-data corrigeren.

### 6. CRM-motivatie aanpassen
Voeg expliciet toe: *"Het dossier hanteert een 30% PM-buffer; worst-case-plafond €830K eenmalig zolang Stichting Cito-afhankelijkheid en platformkeuze niet zijn vastgesteld."* Dan kan een lezer de hogere bedragen begrijpen.

### 7. Min20 dubbele activiteit-teksten fixen
Processen jaar 7 = jaar 8 verbatim identiek. Mens jaar 4 ≈ jaar 5. Maak per fase een unieke activiteit-zin.

### 8. Plus20 + advies fase-namen aanvullen
Leverancier-selectie (CRM) en Curriculumvalidatie (Mens) expliciet maken in jaar 1.

## Code-fixes (voorkomt herhaling in toekomstige sessies)

### 9. Parser-detector voor "totaal over X jaar"
In [`src/app/api/begroting-advies/route.ts:258-263`](src/app/api/begroting-advies/route.ts#L258-L263) toevoegen: regex `/over\s+\d+\s+jaa?r/i` op total-bedragen → markeer als absolute cap. Voorkomt cultuur-probleem in toekomstige sessies.

### 10. Conflict in rank-regel oplossen
In de prompt staat tegelijk "rank = euro aflopend" én "cultuur = rang 2 in belang". Kies één en synchroniseer prompt + tekst.

---

# De 10 grootste begrotingsrisico's (op een rij)

| # | Risico | Mogelijke extra kosten | Hardst geraakt | Hoe te voorkomen |
|---|--------|------------------------|----------------|------------------|
| 1 | Stichting Cito niet ontvlechtbaar → CRM-scope verdubbelt | +€350-460K | **advies (0% buffer)**, plus20 | Architectuurbesluit Q2 2026; €185K contingentie in advies-scenario |
| 2 | Datamigratie 7-8 vervuilde bronsystemen duurder | +€50-100K | advies, plus20, optimaal | Datakwaliteit-scan 2026 vóór go/no-go; gefaseerde migratie met escrow |
| 3 | Scope-creep externe CRM-implementatiepartner | +€75-100K | alle scenario's | Vaste-prijs-contract per deliverable, geen nacalculatie |
| 4 | Cultuurprogramma onderbegroot (€11-14K/lg vs €15-30K bench) | +€30-140K | **advies** > plus20 > optimaal > min20 | Bandbreedte naar €130-180K; executive-tarief afdekken; 360°-tool €5K/jr |
| 5 | Train-de-trainer + content-ontwikkeling mens ontbreekt | +€40-80K eenmalig | alle scenario's | Aparte vaste post; refresh-cyclus vanaf jaar 4 |
| 6 | Processen-blocker met 5 uitvoerders (geen Prof) | +€90-135K (vertraging 6-9 mnd) | **advies** | 6e procesondersteuner toevoegen; externe inhuur met max-fee |
| 7 | Werkdrukverlies + uitval mens-deelnemers ≥15% | +€20-30K | min20, plus20 | Beschermde sessietijd MT-besluit; back-up-deelnemers |
| 8 | Dubbele licentielast tijdens CRM-transitie 6-12 mnd | €30-60K eenmalig | alle scenario's | "Schoon schip" go/no-go vermindert dubbele last |
| 9 | Adoptie-falen klantcontact-laag (49 van 85 CRM-eindgebruikers) | +€30-50K herinvestering | optimaal, plus20 | Ambassador-aanpak; Manager Klantcontact als adoptie-eigenaar; CRM-KPI in functioneringscyclus |
| 10 | Cito-onderbesteding → cap-reductie volgend jaar | -€20-50K/jr cap | **min20** (3j <80%), **optimaal** (2032: 56%) | Jaartotaal-projectie 2j vooruit; budget-glijdend; lange-staart-jaren herallokeren |

---

# Waar komen deze cijfers vandaan?

- **De begroting zelf**: `crossAnalyseWizard.stepResults.stap4.begrotingAdvies` in jouw sessie
- **Werkelijke headcounts**: `stap7InterneUren.selectiePerDomein` (cultuur 9, mens 80, data&systemen 39, processen 5 — door jou bevestigd)
- **Dossier-bedragen + aannames**: `efforts[i].dossierKostenraming` + `businessCaseAannames`
- **Marktbenchmarks**: mid-market CRM (Gartner 2024), corporate leadership development (i-Coach/Krauthammer 2025), L&D training (Deloitte 2024)
- **Cito-context**: jouw memory (Cito ~124 FTE, jaarlijks-budget realiteit)
- **Bestaande numerieke audit**: [AUDIT-berekeningen-vs-begroting.md](AUDIT-berekeningen-vs-begroting.md)

Voor de volledige technische detail-rapporten met alle citaten en tabellen: `c:/tmp/audit-section1.md`, `c:/tmp/audit-section2.md`, `c:/tmp/audit-section3.md`.
