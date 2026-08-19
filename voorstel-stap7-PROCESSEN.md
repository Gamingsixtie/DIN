# Voorstel update Processen — Stap 7 Interne uren

**Sessie**: `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Domein**: `processen` (index 3 in `scenarios[].domeinen`)
**Inspanning**: "Uniforme klantinformatieprocessen en funnelgovernance cross-sectoraal inrichten"
**Status read-only verificatie**: voltooid op basis van Supabase-snapshot.

---

## Read-state VOOR mutatie

### Uren-totalen per scenario (processen-domein)

| Scenario | Looptijd | Totaal | Programma | Lijn | Raadplegen |
|---|---|---:|---:|---:|---:|
| advies     | 2026–2029 (4 jaar)  |   775u |   644u |  133u | **0u** |
| plus20     | 2026–2030 (5 jaar)  | 1.000u |   827u |  176u | **0u** |
| optimaal   | 2026–2032 (7 jaar)  | 1.250u | 1.032u |  222u | **0u** |
| min20      | 2026–2035 (10 jaar) | 1.475u | 1.222u |  260u | **0u** |

> **Verificatie**: `raadplegenUren = 0` in alle 4 scenario's — bevestigt dat er momenteel **geen geconsulteerden** zijn ingesteld voor processen.

### Functies (huidige `selectiePerDomein.processen`)

| FunctieId | Naam | Cluster | Aantal | Categorie (afgeleid) |
|---|---|---|---:|---|
| `custom-inspanningsleider-processen-tbd` | Inspanningsleider Processen — naam nog te benoemen | Inspanningsleider | 1 | leider |
| `procesmanager_data` | Procesmanager / Data-analist Klant & Markt | — | 1 | kernteam |
| `projectmanager_d` | Projectmanager D | — | 1 | kernteam |
| `procesondersteuner_po` | Procesondersteuner C (PO) | — | 1 | kernteam |
| `procesondersteuner_vo` | Procesondersteuner C (VO) | — | 1 | kernteam |
| `custom-1777459472792-own3u` | Procesondersteuner professionals | — | 1 | kernteam |

- **Leider**: TBD (`custom-inspanningsleider-processen-tbd`)
- **Kernteam**: 5 personen (Procesmanager K&M + Projectmanager D + 3 procesondersteuners PO/VO/Prof)
- **Trainings-deelnemers**: 0
- **Geconsulteerden**: **0** ← te muteren
- **vUPI[processen].rollen**: 1 inspanning, 1 leider-rol gedocumenteerd (`urenTotaal=240`, `lijnPct=0.1`)

### Verificatie functie-IDs voor toe te voegen geconsulteerden

| FunctieId | In `selectiePerDomein` van | In `customFunctiesPerDomein` |
|---|---|---|
| `sectormanager_po`   | mens, cultuur, data_systemen | nee (standaard-functie) |
| `sectormanager_vo`   | mens, cultuur, data_systemen | nee (standaard-functie) |
| `sectormanager_prof` | mens, cultuur, data_systemen | nee (standaard-functie) |
| `custom-commercieel-manager` | (nog niet aanwezig) | (nieuw aan te maken) |

> Conclusie: drie sectormanager-IDs bestaan als standaard-functies en kunnen direct toegevoegd worden aan `selectiePerDomein.processen`. De commercieel manager wordt als nieuwe custom-functie aangemaakt onder `customFunctiesPerDomein.processen`.

### "21 medewerkers"-claim — locaties

In **alle vier scenario's** komt exact dezelfde formulering voor in de `activiteit` van het uitrol-piekjaar. Letterlijke tekst:

> _"\[Uitrol & onboardingsprogramma\] Brede uitrol bij ~21 betrokken medewerkers; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies."_

| Scenario | Piek-jaar met "21 medewerkers" |
|---|---|
| advies   | **2028** (`scenarios.advies.domeinen[3].jaren[2].activiteit`) |
| plus20   | **2028** (`scenarios.plus20.domeinen[3].jaren[2].activiteit`) |
| optimaal | **2028** (`scenarios.optimaal.domeinen[3].jaren[2].activiteit`) |
| min20    | **2029** (`scenarios.min20.domeinen[3].jaren[3].activiteit`) — uitrol-fase schuift door |

> Daarnaast komt "21 medewerkers" voor in de Q&A-context (`vragenAntwoorden`) — die context wordt door dit voorstel niet aangepast (alleen scenario-output).

### "Geen geconsulteerden, geen aparte trainings-deelnemers"-claim — locaties

In **alle vier motivaties** (advies/plus20/optimaal/min20) staat letterlijk:

> _"Geen geconsulteerden, geen aparte trainings-deelnemers — dit is een klein domein waarin alle 6 personen kernteam-uitvoerend zijn; sectoradoptie loopt via de eigen procesondersteuners en niet via een trainingsdoelgroep."_

> Locatie: `scenarios.{advies|plus20|optimaal|min20}.domeinen[3].motivatie` — vervangen door correcte 4-geconsulteerden-tekst.

---

## Functie-toevoeging-specificatie

### 1. Nieuwe custom-functie aanmaken

Toevoegen aan `stap7InterneUren.customFunctiesPerDomein.processen`:

```jsonc
{
  "id": "custom-commercieel-manager",
  "naam": "Commercieel manager",
  "cluster": "Commercieel"
}
```

### 2. `selectiePerDomein.processen` — toevoegen 4 entries

| FunctieId | Aantal | Categorie |
|---|---:|---|
| `custom-commercieel-manager` | 1 | geconsulteerd |
| `sectormanager_po`           | 1 | geconsulteerd |
| `sectormanager_vo`           | 1 | geconsulteerd |
| `sectormanager_prof`         | 1 | geconsulteerd |

> Bestaande zes selectie-entries blijven onveranderd (kernteam + leider).

### 3. `vUPI[processen].rollen` — toevoegen 4 rollen

Toevoegen aan de bestaande inspanning "Uniforme klantinformatieprocessen en funnelgovernance cross-sectoraal inrichten" (`vastgesteldeUrenPerInspanning[…].rollen`):

| functieId | functieNaam | urenTotaal | programmaPct | lijnPct | raadplegenPct | categorie | onderbouwing |
|---|---|---:|---:|---:|---:|---|---|
| `custom-commercieel-manager` | Commercieel manager | 6 | 0 | 0 | 1.0 | geconsulteerd | "Geraadpleegd op funnel-design en CVM-cyclus — commerciële proces-input voor cruciale besluiten over funnelfasen, vastleggingsprotocollen en commerciële sturing op klantinformatie." |
| `sectormanager_po`   | Sectormanager PO   | 6 | 0 | 0 | 1.0 | geconsulteerd | "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op PO-werkpraktijk en draagvlak in eigen sector." |
| `sectormanager_vo`   | Sectormanager VO   | 6 | 0 | 0 | 1.0 | geconsulteerd | "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op VO-werkpraktijk en draagvlak in eigen sector." |
| `sectormanager_prof` | Sectormanager Professionals | 6 | 0 | 0 | 1.0 | geconsulteerd | "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op Professionals-werkpraktijk en draagvlak in eigen sector." |

### 4. Per scenario — toevoegen aan `scenarios[].domeinen[3].jaren[].rollen`

De 24u raadplegen-uren (4 personen × 6u) worden verdeeld over de twee piek-jaren rond uitrol/onboarding (3u per persoon per piek-jaar). Per scenario:

#### advies (4 jaar, piek 2027 + 2028)

| Jaar | Toevoegen rol-records |
|---|---|
| 2026 | (geen) |
| 2027 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2028 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2029 | (geen) |

#### plus20 (5 jaar, piek 2027 + 2028)

| Jaar | Toevoegen rol-records |
|---|---|
| 2026 | (geen) |
| 2027 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2028 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2029–2030 | (geen) |

#### optimaal (7 jaar, piek 2027 + 2028)

| Jaar | Toevoegen rol-records |
|---|---|
| 2026 | (geen) |
| 2027 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2028 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2029–2032 | (geen) |

#### min20 (10 jaar, piek 2028 + 2029 — uitrol schuift door)

| Jaar | Toevoegen rol-records |
|---|---|
| 2026–2027 | (geen) |
| 2028 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2029 | 4× geconsulteerd-rol, ieder `urenTotaal=3`, `raadplegenPct=1.0` |
| 2030–2035 | (geen) |

> **Effect per scenario**: +24u raadplegen-uren totaal (= 4 × 6u); programma- en lijnuren onveranderd; `raadplegenUren` op scenario-niveau gaat van **0u → 24u**; `totaalUren` per scenario stijgt met +24u.

---

## Voorgestelde motivatie per scenario (NA mutatie)

> Vervangt de zin **"Geen geconsulteerden, geen aparte trainings-deelnemers — …"** in elk van de vier motivaties door onderstaande blok. De rest van de motivatie blijft ongewijzigd.

### advies — voorgestelde motivatie-blok

- Inspanningsleider Processen (TBD — naam nog te benoemen door de stuurgroep; mogelijke kandidaten: Projectmanager D of een externe procesconsultant met cross-sectorale ervaring).
- Kernteam van 5 personen (Procesmanager / Data-analist Klant & Markt + Projectmanager D + drie Procesondersteuners C voor PO, VO en Professionals) ontwerpt en stuurt funnel-governance, vastleggingsprotocollen en CVM-cyclus.
- **Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten** — **24u raadplegen-uren totaal** (4 personen × 6u over de looptijd, geconcentreerd in piek-jaren 2027–2028 rond pilot, sectorvarianten en uitrol).
- Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd; sectoradoptie loopt via de eigen procesondersteuners en niet via een aparte trainingsdoelgroep.
- Lijn-uren expliciet: kernteam draait op programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 133u lijn-belasting verdeeld over de looptijd.
- Raadplegen-uren expliciet: **24u** (commercieel manager 6u + 3× sectormanager 6u).

### plus20 — voorgestelde motivatie-blok

- Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant).
- Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 5 jaar.
- **Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten** — **24u raadplegen-uren totaal** (4 personen × 6u, piek 2027–2028).
- Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd.
- Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 176u lijn-belasting verdeeld over de looptijd.
- Raadplegen-uren expliciet: **24u**.

### optimaal — voorgestelde motivatie-blok

- Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant).
- Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 7 jaar — ruimer afgewogen tempo dan advies, met meer ruimte voor doorontwikkeling.
- **Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten** — **24u raadplegen-uren totaal** (4 personen × 6u, piek 2027–2028).
- Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd.
- Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 222u lijn-belasting verdeeld over de looptijd.
- Raadplegen-uren expliciet: **24u**.

### min20 — voorgestelde motivatie-blok

- Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant).
- Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 10 jaar — bewust laag tempo om belasting te spreiden.
- **Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten** — **24u raadplegen-uren totaal** (4 personen × 6u, piek 2028–2029 — uitrol-fase schuift in min20 één jaar door).
- Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd.
- Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 260u lijn-belasting verdeeld over de looptijd.
- Raadplegen-uren expliciet: **24u**.

---

## Voorgestelde per-jaar activiteit per scenario

> Activiteit-strings van overige jaren blijven ongewijzigd. Alleen het uitrol-piekjaar wordt aangepast: de "~21 medewerkers"-claim wordt vervangen door consultatie-context.

### advies (4 jaar)

| Jaar | Status | Activiteit |
|---|---|---|
| 2026 | ongewijzigd | _\[Inventarisatie & herontwerp\] Smartprocess as-is mapping per sector …_ |
| 2027 | aanvulling | Bestaande _\[Pilot & sectorvarianten\]_-tekst behouden; toevoegen aan einde: _"Eerste raadpleeg-moment: commercieel manager + 3 sectormanagers leveren commerciële en sector-specifieke input op funnelfase-pilot (3u per consult)."_ |
| **2028** | **VERVANG** | _\[Uitrol & borging funnel-werking\] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. **Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen, CVM-cyclus-review en validatie funneldefinities (3u per consult)."_ |
| 2029 | ongewijzigd | _\[Standaardisatie & continu verbeteren\] …_ |

### plus20 (5 jaar)

| Jaar | Status | Activiteit |
|---|---|---|
| 2026 | ongewijzigd | _\[Inventarisatie & herontwerp\] …_ |
| 2027 | aanvulling | Bestaande _\[Pilot & sectorvarianten\]_-tekst + toevoeging: _"Eerste raadpleeg-moment: commercieel manager + 3 sectormanagers leveren input op funnelfase-pilot (3u per consult)."_ |
| **2028** | **VERVANG** | _\[Uitrol & borging funnel-werking\] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M. **Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen en CVM-cyclus-review (3u per consult)."_ |
| 2029 | ongewijzigd | _\[Standaardisatie & proceseigenaarschap\] …_ |
| 2030 | ongewijzigd | _\[Continu verbeteren\] …_ |

### optimaal (7 jaar)

| Jaar | Status | Activiteit |
|---|---|---|
| 2026 | ongewijzigd | _\[Inventarisatie & herontwerp\] …_ |
| 2027 | aanvulling | Bestaande _\[Pilot & sectorvarianten\]_-tekst + toevoeging: _"Eerste raadpleeg-moment: commercieel manager + 3 sectormanagers leveren input op funnelfase-pilot (3u per consult)."_ |
| **2028** | **VERVANG** | _\[Uitrol & borging funnel-werking\] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. **Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen, CVM-cyclus-review en harmonisatie met live-CRM (3u per consult)."_ |
| 2029 | ongewijzigd | _\[Standaardisatie & proceseigenaarschap\] …_ |
| 2030 | ongewijzigd | _\[Continu verbeteren\] …_ |
| 2031 | ongewijzigd | _\[Doorontwikkeling vastleggingsprotocollen\] …_ |
| 2032 | ongewijzigd | _\[Verankering in lijn\] …_ |

### min20 (10 jaar — uitrol schuift naar 2029, niet 2028!)

| Jaar | Status | Activiteit |
|---|---|---|
| 2026 | ongewijzigd | _\[Voorbereiding & inventarisatie\] …_ |
| 2027 | ongewijzigd | _\[Herontwerp & generiek kader\] …_ |
| 2028 | aanvulling | Bestaande _\[Pilot & sectorvarianten\]_-tekst + toevoeging: _"Eerste raadpleeg-moment: commercieel manager + 3 sectormanagers leveren input op funnelfase-pilot (3u per consult)."_ |
| **2029** | **VERVANG** | _\[Uitrol & borging funnel-werking\] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. **Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen en CVM-cyclus-review (3u per consult)."_ |
| 2030 | ongewijzigd | _\[Standaardisatie & proceseigenaarschap\] …_ |
| 2031 | ongewijzigd | _\[Continu verbeteren — eerste cyclus\] …_ |
| 2032 | ongewijzigd | _\[Continu verbeteren — tweede cyclus\] …_ |
| 2033 | ongewijzigd | _\[Doorontwikkeling vastleggingsprotocollen\] …_ |
| 2034 | ongewijzigd | _\[Doorontwikkeling onboarding & funneldefinities\] …_ |
| 2035 | ongewijzigd | _\[Verankering in lijn\] …_ |

---

## Verificatie-checklist

- [x] **"21 medewerkers"-claim** in alle 4 scenario's vervangen (advies/plus20/optimaal in 2028, min20 in 2029).
- [x] **"Geen geconsulteerden, geen aparte trainings-deelnemers"-zin** in alle 4 motivaties vervangen door correcte 4-geconsulteerden-tekst.
- [x] **Commercieel manager + 3 sectormanagers** als geconsulteerd toegevoegd aan `selectiePerDomein.processen` (4 entries).
- [x] **Custom-functie `custom-commercieel-manager`** aangemaakt in `customFunctiesPerDomein.processen` (cluster "Commercieel").
- [x] **vUPI[processen].rollen** uitgebreid met 4 geconsulteerden-rollen (urenTotaal=6, raadplegenPct=1.0, programma/lijn=0).
- [x] **Per scenario uren-verdeling** in piek-jaren (3u + 3u per persoon = 6u totaal per persoon × 4 personen = 24u per scenario).
- [x] **Raadplegen-uren** expliciet: 24u per scenario (was 0u).
- [x] **Aantal kernteam blijft 5** (geen wijziging aan bestaande zes selectie-entries voor leider + kernteam).
- [x] **Bestaande functie-IDs sectormanager_po/vo/prof** geverifieerd: aanwezig als standaard-functies in andere domeinen — direct herbruikbaar.
- [x] **Geen verzonnen aantallen** — alle uren afgeleid uit door Pim goedgekeurde 6u/persoon-norm.
- [x] **Geen Supabase-writes** — alleen voorstel-tekst.

---

## Niet doen

- Geen wijziging aan kernteam-samenstelling, leider-rol of bestaande kernteam-uren.
- Geen wijziging aan motivaties of activiteit-strings buiten de twee genoemde elementen ("21 medewerkers"-claim + "Geen geconsulteerden"-zin).
- Geen aanpassing van de Q&A-context (`vragenAntwoorden`) — die blijft historisch.
- Geen wijziging aan de inspanningsleider-rol-uren in vUPI (240u blijft staan).
