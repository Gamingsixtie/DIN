# AUDIT — Tekst-consistency §4.1 Begrotingsadvies (Pass 1)
Sessie: d8b97442-ce8f-4134-b2c7-67dc8e3a3f93
Versie: 2074 | Updated: 2026-05-01T20:29:34.495+00:00
Run: 2026-05-01T20:33:01.188Z

## 0. Samenvatting hoofdbevindingen

Zie sectie 5 voor de gedetailleerde fix-aanbevelingen. Kernpunten:

- **Fase-namen consistent (no breakage)**: alle vier inspanningen tonen overlappende fase-naamgeving
  tussen scenarios; per scenario zijn de fase-volgordes plausibel uitgesmeerd over de looptijd.
- **Activiteit-tekst per identieke fase**: na FASE_CHAINS+ACTIVITEITEN normalisatie is activiteit-tekst
  identiek waar fase identiek is.
- **Scenario-samenvatting & prioriteitAdvies bevatten verouderde / niet-overeenkomende getallen**
  in ten minste optimaal en min20 (zie sectie 3).
- **Optimaal**: samenvatting noemt "circa € 1.441.000" maar berekend totaal is € 1.490.000.
- **Plus20 & advies**: samenvatting noemt geen totaalbedrag (alleen abstract); risico op stille drift.
- **Cross-scenario consistency CRM/cultuur framing**: in elk scenario consistent ('grootste post' / 'klein in € groot in belang #2').

## 1. Scenario-level teksten

### ADVIES (advies)
- **Werkelijk totaal**: € 1.159.000 over 4 jaar
- **Verwacht (briefing)**: € 1.159.000 over 4 jaar (cap € 341.000/jr)
- **Stored totaalGeraamdEuro**: € 1.159.000
- **Stored jaarlijksBudgetEuro**: € 341.000
- **Jaarverdeling**:
  - 2026: € 251.000
  - 2027: € 341.000
  - 2028: € 338.000
  - 2029: € 229.000

**Samenvatting**:
> Dit scenario voert het volledige programma uit in een compacte looptijd waarin CRM-bouw, gespreksvaardigheidsverankering en cultuurverandering parallel lopen: in het startjaar worden architectuurkeuzes, curriculumontwerp, procesinventarisatie en MT-bewustwording opgepakt; rond het midden van de looptijd ligt het zwaartepunt met CRM-realisatie, eerste trainingsblok en intensieve leiderschapssessies; in het slotjaar volgen acceptatie, het tweede trainingsblok plus nazorg en verankering in HR-instrumenten. Een kortere looptijd is niet realistisch omdat cultuurverandering meerdere praktijkcycli van bewustwording, adoptie en rolmodelgedrag vraagt en CRM-adoptie na technische oplevering nog datakwaliteit- en gewenningstijd nodig heeft; uitsmeren over een langere looptijd zou momentum en urgentie uit het programma halen.

**PrioriteitAdvies**:
> De budget-verhouding volgt outside-in logica: data/systemen krijgt verreweg het grootste aandeel omdat het CRM-fundament de technische enabler is voor alle andere ambities — zonder werkend dashboard blijven proactief handelen en funnelsturing onuitvoerbaar op schaal, en de eenmalige bouw-, migratie- en integratiekosten (externe partner 1.500-2.500 consultanturen, 7-8 bronsysteemintegraties, dubbele licentielast tijdens transitie) plus €92.500/jaar structureel zijn nu eenmaal substantieel. Mens volgt op rang 2 omdat gespreksvaardigheid de cultuur naar de klant vertaalt; het curriculum bedient 66 medewerkers met twee trainingsblokken en bundelt drie sectoren in één traject met circa 30% schaalvoordeel. Processen krijgen een kleiner aandeel doordat het cross-sectorale schaalvoordeel groot is (één kader, drie sectorvarianten) en het werk vooral standaardisatie en borging betreft die meelift op de CRM-bouw, met €12.500/jaar structureel voor proceseigenaarschap-borging. Cultuur staat in eurobedrag het kleinst (kleine doelgroep van negen leidinggevenden plus HR, externe begeleider circa €37.500), maar inhoudelijk cruciaal: zonder zichtbaar voorleven door het MT en zonder verankering van outside-in als waarde wordt het CRM niet gebruikt zoals bedoeld en blijft outside-in een hol begrip — eurogrootte staat hier niet gelijk aan inhoudelijk belang. Belangrijk: alle vier domeinen starten parallel in het startjaar — de ranking gaat over budget-aandeel, niet over startmoment. Cultuur en mens beginnen direct met urgentiebesef en curriculumontwerp, terwijl data/systemen architectuurkeuzes maakt en processen as-is mapping start.

---

### PLUS20 (plus20)
- **Werkelijk totaal**: € 1.270.000 over 5 jaar
- **Verwacht (briefing)**: € 1.270.000 over 5 jaar (cap € 300.000/jr)
- **Stored totaalGeraamdEuro**: € 1.270.000
- **Stored jaarlijksBudgetEuro**: € 300.000
- **Jaarverdeling**:
  - 2026: € 250.000
  - 2027: € 300.000
  - 2028: € 268.500
  - 2029: € 271.000
  - 2030: € 180.500

**Samenvatting**:
> In dit plus20-scenario verdelen we het dossier-totaal binnen een jaarlijks plafond van €300K, waarbij CRM het zwaartepunt vormt rond het midden van de looptijd in de bouw- en migratiefase en cultuur, mens en processen parallel meelopen vanaf het startjaar. Tegen het einde verschuift het profiel naar structureel beheer, intervisie en borging in de lijn.

**PrioriteitAdvies**:
> Data/systemen krijgt het grootste budget-aandeel omdat het CRM-klantdashboard het technische fundament vormt: zonder werkend, eenduidig systeem blijft outside-in een ambitie zonder ruggengraat, en de eenmalige bouw- en migratielast (€440K–€640K eenmalig plus €92.500/jaar structureel) is de grootste enkelvoudige post in het programma. Mens staat tweede omdat gespreksvaardigheid de directe vertaling is van CRM-data en cultuur naar klantgedrag — 66 deelnemers vragen twee volledige trainingsblokken (€52K externe partner) plus borging, wat een substantieel budget rechtvaardigt. Cultuur staat derde in budget maar in inhoudelijk belang nadrukkelijk op #2: het bedrag is klein omdat de cultuur-Q&A een doelgroep van slechts 9 leidinggevenden plus 2 HR-coördinatoren bedient, maar zonder leiderschap dat outside-in voorleeft wordt het CRM niet gebruikt zoals bedoeld en blijft de transformatie hol — eurogrootte is hier dus géén maatstaf voor strategisch gewicht. Processen krijgen het kleinste aandeel (€100K Doel-totaal) omdat het werk vooral bestaat uit ontwerp in de eerste helft van de looptijd plus structurele borging — minder consultantintensief dan de andere drie. Alle vier de domeinen starten parallel in het startjaar; de ranking gaat uitsluitend over budget-aandeel, niet over startmoment. Kritisch voor het slagen binnen budget zijn de aannames rond de externe implementatiepartner (1.500–2.500 uur à €150) en het architectuurbesluit Stichting Cito — beide kunnen het CRM-budget materieel verschuiven.

---

### OPTIMAAL (optimaal)
- **Werkelijk totaal**: € 1.490.000 over 7 jaar
- **Verwacht (briefing)**: € 1.441.000 over 7 jaar (cap € 250.000/jr)
- **Stored totaalGeraamdEuro**: € 1.490.000
- **Stored jaarlijksBudgetEuro**: € 250.000
- **Jaarverdeling**:
  - 2026: € 250.000
  - 2027: € 250.000
  - 2028: € 217.000
  - 2029: € 250.000
  - 2030: € 204.000
  - 2031: € 180.000
  - 2032: € 139.000

**Samenvatting**:
> Scenario Huidig Budget verdeelt circa € 1.441.000 binnen het bestaande jaarbudget van € 250.000, waarbij CRM het zwaartepunt vormt rond het midden van de looptijd, processen vroeg in de looptijd (in de eerste twee jaren) zwaarder zijn om funneldefinities op tijd technisch te vertalen, mens zijn zwaartepunt heeft rond het midden van de looptijd met de twee trainingsblokken, en cultuur in de eerste helft van de looptijd piekt en daarna afneemt tot lichte borging tegen het einde. Kritisch voor het binnen budget blijven zijn het architectuurbesluit op de Stichting Cito-afhankelijkheid en de externe tarieven bij CRM-partner en leiderschapscoach.

**PrioriteitAdvies**:
> Outside-in werken vraagt eerst een werkend technisch fundament: het CRM is veruit de grootste eenmalige post en de enabler waarop processen, gesprekken en cultuur kunnen landen — daarom rank 1 op budget, met een doel-totaal van circa € 910.000 inclusief € 92.500/jaar structureel beheer. Mens komt op rank 2 omdat gespreksvaardigheid in alle drie sectoren de grootste deelnemersgroep raakt (66 medewerkers, twee trainingsblokken met externe partner) en de directe vertaling vormt van outside-in naar klantcontact. Processen volgt op rank 3: het werk is essentieel voor consistente funnelregistratie maar in euro kleiner doordat één generiek kader drie sectorvarianten oplevert en veel structureel werk binnen bestaande proceseigenaarschapsuren past (€ 12.500/jaar structureel). Cultuur staat op rank 4 in EURO omdat de doelgroep klein is (negen leidinggevenden plus HR-coördinatie), maar in inhoudelijk BELANG is dit feitelijk de tweede hefboom: zonder zichtbaar voorgeleefd outside-in gedrag blijft het CRM onderbenut en verzandt de gespreksvaardigheid in oude reflexen — euro-grootte zegt hier dus niets over impact. Alle vier domeinen starten parallel in het startjaar (architectuur, curriculumontwerp, procesinventarisatie en MT-coalitievorming lopen gelijktijdig); de ranking gaat over budget-aandeel, niet over startmoment. Kritische aannames die het slagen binnen budget bepalen zijn de Stichting Cito-afhankelijkheid (architectuurbesluit), het externe-tariefniveau bij implementatiepartner én leiderschapscoach, en de datakwaliteit-go/no-go op de bronsystemen.

---

### MIN20 (min20)
- **Werkelijk totaal**: € 1.819.500 over 10 jaar
- **Verwacht (briefing)**: € 1.819.000 over 10 jaar (cap € 200.000/jr)
- **Stored totaalGeraamdEuro**: € 1.819.500
- **Stored jaarlijksBudgetEuro**: € 200.000
- **Jaarverdeling**:
  - 2026: € 200.000
  - 2027: € 200.000
  - 2028: € 200.000
  - 2029: € 200.000
  - 2030: € 200.000
  - 2031: € 183.000
  - 2032: € 187.000
  - 2033: € 156.000
  - 2034: € 150.500
  - 2035: € 143.000

**Samenvatting**:
> Cross-sectorale outside-in-transformatie uitgesmeerd binnen een krap jaarbudget van € 200.000: zwaartepunt eenmalige investeringen in de bouw- en migratiejaren rond het midden van de looptijd (CRM-bouw plus parallel proces-, mens- en cultuurinterventies vanaf het startjaar), gevolgd door structurele licentie- en borgingslast tot het slotjaar. Alle vier domeinen starten parallel in het startjaar en respecteren de dossier-ondergrenzen; de Stichting Cito-afhankelijkheid en datakwaliteit-scan in de eerste twee jaren bepalen of de PM-buffer kan worden afgebouwd.

**PrioriteitAdvies**:
> Bij dit krappere jaarbudget is een uitgesmeerde aanpak nodig om dossier-totalen te respecteren zonder kwaliteitsverlies. Data/Systemen krijgt het grootste budget-aandeel (rank 1) omdat het CRM het technische fundament vormt: zonder werkend integraal klantbeeld blijven de andere inspanningen losse interventies en is outside-in op schaal onuitvoerbaar; dit is bovendien de grootste eenmalige post (€440K–€640K) plus structureel €92.500/jaar voor licenties van 85 gebruikers en beheer. Cultuur staat op rank 2 qua belang ondanks een klein euro-aandeel — de cultuur-Q&A bedient een kleine doelgroep van 9 leidinggevenden plus 2 HR-medewerkers, dus eurogrootte is laag (€66K), maar zonder cultuurverandering wordt het CRM niet gebruikt zoals bedoeld en blijft outside-in een hol begrip; de cross-sectorale leerkringen versterken bovendien de andere drie domeinen. Mens (rank 3) vertaalt die cultuur naar concreet gedrag in klantgesprekken en realiseert de meetbare commerciële effecten via 66 deelnemers in twee trainingsblokken. Processen (rank 4) krijgt het kleinste aandeel omdat het primair governance- en borgingswerk betreft (€87.500 structureel via Smartprocess) dat aansluit op CRM-inrichting, met schaalvoordeel door één generiek kader voor drie sectorvarianten. Eurogrootte ≠ inhoudelijk belang: alle vier domeinen starten parallel in het startjaar — ranking gaat over budget-aandeel, niet over startmoment, want harde en zachte kant moeten samen oplopen.

---

## 2. Fase + activiteit consistency per inspanning

### Integraal CRM-klantdashboard cross-sectoraal implementeren en inrichten

| Fase | advies | plus20 | optimaal | min20 | act consistent? |
|---|---|---|---|---|---|
| Acceptatie & pilot | — | — | — | OK | OK |
| Acceptatie & sectoruitrol | — | — | OK | — | OK |
| Acceptatie & uitrol | OK | OK | — | — | OK |
| Analyse & architectuur | OK | OK | OK | OK | OK |
| Continu verbeteren | — | — | — | OK | OK |
| Doorontwikkeling | — | — | — | OK | OK |
| Go-live & adoptie | — | — | OK | — | OK |
| Go-live & uitrol | — | — | — | OK | OK |
| In beheer | — | OK | OK | OK | OK |
| In beheer & optimalisatie | OK | — | — | — | OK |
| Leverancier-selectie | — | — | OK | OK | OK |
| Optimalisatie | — | OK | OK | OK | OK |
| Realisatie & integraties | OK | OK | OK | — | OK |
| Realisatie - integraties | — | — | — | OK | OK |
| Realisatie - kern | — | — | — | OK | OK |

*Geen activiteit-inconsistenties; alle gelijke fase-namen hebben gelijke activiteit-tekst.*


### Uniforme klantinformatieprocessen en funnelgovernance cross-sectoraal inrichten

| Fase | advies | plus20 | optimaal | min20 | act consistent? |
|---|---|---|---|---|---|
| Continu verbeteren | OK | OK | OK | OK | OK |
| Continue verbetering | — | — | — | OK | OK |
| Herontwerp (to-be) | — | — | OK | OK | OK |
| Herontwerp (to-be) & pilot | — | OK | — | — | OK |
| Inventarisatie & herontwerp | OK | — | — | — | OK |
| Inventarisatie (as-is) | — | OK | OK | OK | OK |
| Pilot & sectorinkleuring | OK | — | — | — | OK |
| Pilot & validatie | — | — | OK | OK | OK |
| Standaardisatie | — | OK | OK | OK | OK |
| Standaardisatie & adoptie | — | — | — | OK | OK |
| Uitrol | — | OK | OK | OK | OK |
| Uitrol & standaardisatie | OK | — | — | — | OK |
| Verankering | — | — | OK | OK | OK |

*Geen activiteit-inconsistenties; alle gelijke fase-namen hebben gelijke activiteit-tekst.*


### Gespreksvaardigheidstraining outside-in voor alle sectoren realiseren

| Fase | advies | plus20 | optimaal | min20 | act consistent? |
|---|---|---|---|---|---|
| Basistraining | OK | OK | OK | — | OK |
| Basistraining - blok 1 | — | — | — | OK | OK |
| Basistraining - blok 2 | — | — | — | OK | OK |
| Behoeftestelling & curriculumontwerp | OK | OK | OK | OK | OK |
| Borging & nazorg | OK | OK | OK | OK | OK |
| Borging in lijn | — | — | — | OK | OK |
| Continue ontwikkeling | — | — | — | OK | OK |
| Curriculumvalidatie & pilot | — | — | OK | OK | OK |
| Toepassing in praktijk | — | OK | OK | OK | OK |
| Vaardigheidstraining | — | OK | OK | OK | OK |
| Vaardigheidstraining & toepassing | OK | — | — | — | OK |
| Verankering | — | — | OK | OK | OK |

*Geen activiteit-inconsistenties; alle gelijke fase-namen hebben gelijke activiteit-tekst.*


### Leiderschapsprogramma outside-in als gedeelde waarde cross-sectoraal verankeren

| Fase | advies | plus20 | optimaal | min20 | act consistent? |
|---|---|---|---|---|---|
| Acceptatie & rolmodelgedrag | OK | OK | OK | OK | OK |
| Adoptie | OK | OK | OK | OK | OK |
| Bewustwording & coalitievorming | OK | OK | OK | — | OK |
| Borging in HR-cyclus | — | — | OK | OK | OK |
| Coalitievorming | — | — | — | OK | OK |
| Continue ontwikkeling | — | — | — | OK | OK |
| Continue rolmodel-werking | — | OK | OK | OK | OK |
| Urgentiebesef | — | — | — | OK | OK |
| Verankering | — | — | OK | OK | OK |
| Verankering in lijn | — | — | — | OK | OK |
| Waardenverankering | OK | OK | OK | OK | OK |

*Geen activiteit-inconsistenties; alle gelijke fase-namen hebben gelijke activiteit-tekst.*


## 3. Bedragen + claims uit samenvatting/prioriteitAdvies (validatie)

### ADVIES
- Werkelijk totaal: € 1.159.000 | Verwacht: € 1.159.000
- Bedragen genoemd: €92.500, €12.500, €37.500
- Looptijd-vermeldingen: (geen)
- **Claim-checks**:
  - Tekst noemt €92.500/jaar structureel CRM-licenties (= dossier-uitspraak — controleer of dit nog klopt in actuele dossier)
  - Tekst noemt €12.500/jaar structureel processen — controleer dossier
  - Tekst noemt €37.500 externe begeleider leiderschap — controleer dossier

### PLUS20
- Werkelijk totaal: € 1.270.000 | Verwacht: € 1.270.000
- Bedragen genoemd: €300K, €440K–€640K, €92.500, €52K, €100K, €150
- Looptijd-vermeldingen: (geen)
- **Claim-checks**:
  - Tekst noemt CRM eenmalig €440K-€640K (= referentie naar dossier-onderbouwing, niet scenario-totaal — controleer of dit nog klopt)
  - Tekst noemt €92.500/jaar structureel CRM-licenties (= dossier-uitspraak — controleer of dit nog klopt in actuele dossier)
  - Tekst noemt €52K externe partner gespreksvaardigheid — controleer dossier
  - Tekst noemt €100K processen — controleer of dit overeenkomt met €100K-€175K spreiding tussen scenarios

### OPTIMAAL
- Werkelijk totaal: € 1.490.000 | Verwacht: € 1.441.000
- Bedragen genoemd: € 1.441.000, € 250.000,, € 910.000, € 92.500, € 12.500
- Looptijd-vermeldingen: (geen)
- **Claim-checks**:
  - Tekst noemt € 1.441.000, werkelijk € 1.490.000 (delta: € 49.000)
  - Tekst noemt €92.500/jaar structureel CRM-licenties (= dossier-uitspraak — controleer of dit nog klopt in actuele dossier)
  - Tekst noemt €12.500/jaar structureel processen — controleer dossier
  - Tekst noemt CRM-doel-totaal € 910.000 (alleen optimaal). Werkelijk CRM in optimaal: € 1.095.000.

### MIN20
- Werkelijk totaal: € 1.819.500 | Verwacht: € 1.819.000
- Bedragen genoemd: € 200.000, €440K–€640K, €92.500, €66K, €87.500
- Looptijd-vermeldingen: (geen)
- **Claim-checks**:
  - Tekst noemt CRM eenmalig €440K-€640K (= referentie naar dossier-onderbouwing, niet scenario-totaal — controleer of dit nog klopt)
  - Tekst noemt €92.500/jaar structureel CRM-licenties (= dossier-uitspraak — controleer of dit nog klopt in actuele dossier)
  - Tekst noemt €87.500 structureel via Smartprocess (alleen min20) — controleer of in lijn met andere scenarios
  - Tekst noemt €66K cultuur-doel-totaal — controleer overeenstemming met cultuur-ophoging

## 4. Inspanning-totalen per scenario (sanity-check)

| Inspanning | advies | plus20 | optimaal | min20 |
|---|---|---|---|---|
| Integraal CRM-klantdashboard cross-sectoraal implementeren en inrichte | € 817.000 | € 910.000 | € 1.095.000 | € 1.372.000 |
| Uniforme klantinformatieprocessen en funnelgovernance cross-sectoraal  | € 100.000 | € 112.500 | € 137.000 | € 175.000 |
| Gespreksvaardigheidstraining outside-in voor alle sectoren realiseren | € 142.000 | € 142.500 | € 143.000 | € 142.500 |
| Leiderschapsprogramma outside-in als gedeelde waarde cross-sectoraal v | € 100.000 | € 105.000 | € 115.000 | € 130.000 |

## 5. Concrete fix-aanbevelingen

### 5.1 OPTIMAAL — samenvatting noemt verkeerd totaal

**Probleem**: Samenvatting noemt *"circa € 1.441.000"* — werkelijk berekend totaal = **€ 1.490.000**.
Dit is een delta van € 49.000 (≈ 3.4%). Vermoedelijk ontstaan door cultuur-ophoging.

**Fix**: vervang in optimaal.samenvatting:
- *"verdeelt circa € 1.441.000 binnen het bestaande jaarbudget van € 250.000"*
- → *"verdeelt circa € 1.490.000 binnen het bestaande jaarbudget van € 250.000"*

**Probleem #2**: PrioriteitAdvies optimaal noemt CRM-doel-totaal *"circa € 910.000"* — werkelijk CRM-totaal in optimaal = **€ 1.095.000** (delta: € 185K, 20%). Dit is significant.

**Fix**: optimaal.prioriteitAdvies:
- *"…rank 1 op budget, met een doel-totaal van circa € 910.000 inclusief € 92.500/jaar structureel beheer"*
- → *"…rank 1 op budget, met een doel-totaal van circa € 1.095.000 inclusief € 92.500/jaar structureel beheer"*

### 5.2 PLUS20 — samenvatting bevat geen totaalbedrag

**Probleem**: plus20.samenvatting noemt alleen *"jaarlijks plafond van €300K"* maar geen totaal of looptijd. Risico op stille drift.

**Fix-suggestie**: voeg expliciete totalen toe analoog aan optimaal:
- Totaal € 1.270.000 over 5 jaar
- Plafond € 300K/jr

### 5.3 ADVIES — samenvatting bevat geen totaalbedrag

**Probleem**: advies.samenvatting bevat geen €-bedrag of looptijd-vermelding (4 jaar, € 1.159.000, € 341K cap). Andere scenarios zijn explicieter.

**Fix-suggestie**: voeg toe of formuleer expliciet:
- *"…volledig programma in 4 jaar (totaal € 1.159.000) waarbij in 2026 € 250.000 wordt benut conform Cito-eis en de pieken in 2027/2028 binnen het cap van € 341K/jr blijven."*

### 5.4 MIN20 — heel licht, controleer dossier-claims

**Probleem**: min20.prioriteitAdvies noemt *"€87.500 structureel via Smartprocess"* (Processen). Andere scenarios noemen €12.500/jaar structureel. Lijkt een verschil in domein-aggregatie (cumulatief over looptijd?).

**Verificatie**: € 12.500 × 7 jaar (optimaal) = € 87.500 — dat klopt voor lange looptijd. Echter min20 = 10 jaar, dat zou dan € 125K worden. Inhoudelijk: claim is verwarrend zonder context. **Aanbeveling**: vervang door eenduidige per-jaar-formulering ("€ 12.500/jaar structureel via Smartprocess") óf consistent cumulatief over alle scenarios.

### 5.5 Cross-scenario CRM/cultuur framing — IS consistent

**Bevinding (positief)**: in alle 4 scenarios wordt:
- CRM consistent beschreven als "grootste enkelvoudige post" / "technische enabler/fundament" — OK.
- Cultuur consistent beschreven als "klein in euro, inhoudelijk #2/tweede hefboom" — OK.
- Mens consistent op rank 2 in budget, met 66 deelnemers, twee trainingsblokken — OK.
- Processen consistent op rank 4 met cross-sectoraal schaalvoordeel — OK.

### 5.6 Fase-namen — kleine variatie tussen scenarios (acceptabel)

Fase-namen variëren bewust per looptijd (FASE_CHAINS), bijv:
- "In beheer & optimalisatie" (advies, 1 jaar) versus "In beheer" + "Optimalisatie" (plus20+, gesplitst).
- "Acceptatie & uitrol" (advies/plus20) vs "Acceptatie & sectoruitrol" + "Go-live & adoptie" (optimaal).
- "Vaardigheidstraining & toepassing" (advies, gecombineerd) vs gesplitst (plus20+).

Dit is **gewenst** gedrag van FASE_CHAINS-normalisatie en geen consistency-fout. Activiteit-tekst is OK voor identieke fase-namen.

Wel verdacht: in min20 staan "Continu verbeteren" + "Continue verbetering" + "Verankering" + "Verankering in lijn" + "Continue ontwikkeling" allemaal naast elkaar. Dit is taalkundig dubbel; overweeg of FASE_CHAINS zo veel sub-stappen voor 10-jarig moet hebben.

### 5.7 Fix-prioriteit-overzicht

| Prio | Fix | Type | Effort |
|---|---|---|---|
| **HOOG** | optimaal samenvatting: € 1.441.000 → € 1.490.000 | tekst-edit | 1 regel |
| **HOOG** | optimaal prioriteitAdvies: CRM € 910.000 → € 1.095.000 | tekst-edit | 1 regel |
| MID | plus20 samenvatting: voeg expliciet "€ 1.270.000 over 5 jaar" toe | tekst-edit | 1 zin |
| MID | advies samenvatting: voeg expliciet "€ 1.159.000 over 4 jaar" + cap-vermelding toe | tekst-edit | 1 zin |
| LAAG | min20 prioriteitAdvies: harmoniseer "€87.500 structureel" naar "€ 12.500/jaar structureel" | tekst-edit | 1 zin |
| LAAG | min20 fase-naamgeving: dubbele 'Continu verbeteren'/'Continue verbetering' opruimen in FASE_CHAINS | code | klein |
