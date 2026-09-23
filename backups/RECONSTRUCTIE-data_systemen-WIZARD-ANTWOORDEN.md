# Wizard-antwoorden — Data & Systemen (CRM-cluster)

**Sessie:** d8b97442 · **Stap:** 6 (Optimaliseren) · **Cluster:** Integraal CRM-klantdashboard cross-sectoraal
**Bron-data:** PRE-RECOVERY snapshot v1036 — `stap7InterneUren` + `begrotingAdvies` (3 scenarios) + handmatige aanvullingen door programmamanager

> Per vraag staat één direct kopieer-baar antwoord. Aantallen en bedragen zijn afgeleid uit de eerdere sessie-output (stap 7 + begrotingsadvies) en aangevuld met de actuele context die in de re-invul-sessie naar voren kwam.

---

## VRAAG 1 — CRM-platform + aantal licenties

> *Welk CRM-platform wordt (waarschijnlijk) gebruikt of uitgebreid — en hoeveel licenties zijn er naar schatting nodig voor alle medewerkers met klantcontact over PO, VO en Zakelijk samen?*

```
Op dit moment werken we met Microsoft Dynamics, maar het is nog niet
bevestigd of we daarmee verder gaan of een ander platform kiezen — die
keuze is onderdeel van de architectuur-fase 2026 en mede afhankelijk
van de uitkomsten van de bronsystemen-scan en de impact op Stichting Cito
(zie hieronder).

Geraamde licentiebehoefte: circa 85 gebruikers (alle medewerkers met
klantcontact over PO, VO en Professionals/Zakelijk samen). 

KOSTENVERHOGENDE FACTOREN OM EXPLICIET MEE TE NEMEN:

1. Tijdens de herstructurering moet het huidige Dynamics-platform in
   stand blijven tot het nieuwe CRM live gaat. Daardoor lopen er twee
   licentie- en beheerstromen parallel gedurende circa 6–12 maanden in
   2027–2028 

2. Cito BV en Stichting Cito hangen aan hetzelfde CRM-fundament. De
   integratie kan technisch en organisatorisch wellicht niet eenvoudig worden
   ontvlecht. Het is goed mogelijk dat een nieuw CRM ook bij Stichting
   Cito moet worden ingevoerd — dat verdubbelt potentieel de licentie-
   en migratiescope. Deze afhankelijkheid moet in de architectuur-fase
   eerst formeel worden uitgezocht; tot die tijd geldt een PM-buffer
   van 30%.
```

---

## VRAAG 2 — Externe implementatiepartner

> *Wordt er een externe implementatiepartner ingeschakeld voor de CRM-inrichting en dashboardbouw — en wat is een ruwe schatting van het budget of het aantal externe dagen?*

```
Ja — een externe implementatiepartner is nodig en wenselijk. Reden: de
belastbaarheid van de interne organisatie laat een volledig in-house
traject niet toe naast het reguliere werk.

Eisen aan de partner:
  • Implementatieleider met aantoonbare CRM-ervaring én inhoudelijke
    domeinkennis — bewust kwaliteit boven kwantiteit.
  • Aantoonbare ervaring in B2B én onderwijssector (klantcontext PO/VO
    naast zakelijke relaties).
  • Capaciteit om regie te voeren op datakwaliteit, datamodel-
    standaardisering en sectorinrichting — niet alleen technische bouw.

Geraamd budget: circa €200.000 voor architectuur, bouw en sector-
inrichting. Inzet circa 2–2,5 FTE gedurende 6 maanden in de bouwfase
(2027) ≈ 220 externe dagen.

Aanvullend €25.000 voor sectorspecifieke configuratie en circa €10.000
voor een externe trainer (5–8 dagen) die de 5 interne CRM-specialisten
in 2027 opleidt en hen later begeleidt bij de live-uitrol (zie Q5).
```

---

## VRAAG 3 — Bronsystemen + integratie-complexiteit

> *Hoeveel bronsystemen moeten worden gekoppeld — denk aan LVS-data (PO), schoolplan- en contractsystemen (VO), factuur- en kandidaatdata (Zakelijk) — en zijn er bekende integratie-uitdagingen of legacy-systemen?*

```
7–8 bronsystemen worden gekoppeld of gemigreerd naar het nieuwe CRM.

HARDE VOORWAARDE: een datakwaliteit-scan in 2026 vóór de bouw start, zodat
we per bronsysteem weten welke gegevens betrouwbaar zijn en welke niet
direct bruikbaar zijn.

KERNKEUZE die in 2026 moet worden gemaakt:
  Migreren we de huidige (deels vervuilde) data één-op-één mee naar het
  nieuwe CRM, of maken we eerst schoon schip? Beide hebben kostenimpact:
    • Vervuilde data meenemen: lagere migratiekosten upfront, maar
      structureel hogere correctie-uren en lagere data-betrouwbaarheid.
    • Schoon schip maken: hogere migratiekosten in 2026–2027, maar
      een betrouwbaar fundament voor het 360°-klantbeeld.
  Aanbeveling: scan-uitkomst leidend laten zijn voor deze keuze.

Geraamde migratie- en opschoningskosten: €75.000 (≈400–500 externe uren).

GROOTSTE RISICO: datamigratie kan 2–3× duurder uitvallen dan geraamd
(€50.000–€100.000 extra). Dit is het single-point-of-failure voor
het jaarbudget 2027. Bij dreigende overschrijding: directe escalatie
naar de eigenaar (CIO).

Denkbare bronsystemen om in de scan op te nemen (te valideren met
IT-architect):
  1. Bestaand sales-CRM / opportunity-tooling
  2. Excel- en Sheets-bestanden per sector (pipelines, schoolplannen)
  3. AFAS — HR + klant-/contractgegevens
  4. Exact — facturatie, betaalgedrag
  5. Klantenservice-ticketing (TopDesk / ServiceNow / Freshdesk)
  6. E-mailmarketing-platform (Mailchimp / Spotler)
  7. Schoolregister / DUO-data — adres- en bestuursgegevens (PO + VO)
  8. Productgebruiksdata uit Cito-platforms (LIB, KIB, etc.)
```

---

## VRAAG 4 — Looptijd + fasering

> *Wat is de verwachte looptijd — en zijn er al gedachten over fasering (bijv. eerst Zakelijk als pilot, dan PO en VO)?*

```
Voorkeur: zo snel mogelijk live, maar mét behoud van de gefaseerde
opbouw die in de architectuur is bedacht. Niet plat versnellen ten
koste van zorgvuldigheid.

Totale looptijd: 14 maanden actieve implementatie, gespreid over 3 jaar:
  • 2026 — Analyse & Ontwerp (architectuur, datamodel, leveranciers-
            selectie, data-eigenaarschap, kwaliteitsscan 7–8 bronsystemen)
  • 2027 — Realisatie (bouw + datamigratie + sectorinrichting +
            acceptatietesten + opleiden 5 interne CRM-specialisten)
  • 2028 — Live gang voor circa 83 gebruikers + start structurele
            licentiekosten + eerste optimalisatieronde

SECTOR-FASERING:
  PO en VO hebben veel overlap in klantcontext (schoolbesturen,
  leerkrachten, schoolfasering) en kunnen daarom dezelfde sectorinrichting
  als basis gebruiken. Voor Zakelijk geldt een afwijkende marktcontext:
  kandidaten en opdrachtgevers buiten de onderwijsmarkt vragen om een
  andere klantfunnel en aparte module. Dat verschil rechtvaardigt een
  3–4 weken latere live-datum voor Zakelijk.

  Voorgestelde volgorde: PO + VO parallel live gezet in 2028, gevolgd
  door Zakelijk 3–4 weken later. Geen sectorpilot vooraf — het cross-
  sectorale datamodel en het gedeelde dashboard zijn één product.

Plus20-scenario: 3 jaar (2026–2028) bij €300K/jaar (sneller, intensievere
bouwpiek 2027). Min20-scenario: 5 jaar (2026–2030) bij €200K/jaar
(langzamer, ruimere risicobuffer voor datamigratie).
```

---

## VRAAG 5 — Aantal te trainen medewerkers + trainingsaanpak

> *Hoeveel medewerkers met klantcontact moeten worden getraind — en denk je aan centrale trainingsdagen, e-learning, of begeleiding on-the-job?*

```
Bewuste keuze voor een gecombineerde aanpak: extra trainingsdag(en) + 
begeleiding on-the-job met een externe die meekijkt hoe het CRM in de
dagelijkse praktijk wordt gebruikt. Daarnaast wijzen we ambassadeurs en
key-users aan die de nieuwe manier van werken introduceren én bewaken
dat de manier van werken wordt vastgehouden — zo voorkomen we dat
dingen "wegzakken" na de live-gang.

OPGEBOUWDE DOELGROEP — totaal circa 77 personen, plus 10% foutmarge
voor uitbreiding/uitval = effectief plannen voor circa 85 personen:

  Klantcontact-laag (sales + binnendienst + klantenservice PO + VO):  49
  Trainings- en advies-team (12 trainers + 1 teamleider trainingen):  13
  Sector PO  (3 productmanagers + 2 marketeers):                       5
  Sector VO  (2 productmanagers + 1 marketeer):                        3
  Sector Zakelijk (4 sales + 1 binnendienst + 2 productmanagers):      7
  ────────────────────────────────────────────────────────────────────
  Subtotaal:                                                          77
  + foutmarge 10% (uitbreiding/uitval):                                8
  ────────────────────────────────────────────────────────────────────
  TOTAAL te plannen:                                                  85

GELAAGDE OPLEIDINGSAANPAK:

  Laag 1 — 5 interne CRM-specialisten + ambassadeurs/key-users
    Eén CRM-specialist per afdeling (Klantcontact, Sector PO, Sector
    VO, Sector Professionals/Zakelijk, Data & Technologie) wordt in
    2027 extern opgeleid door de externe trainer (5–8 dagen). Per
    sector worden daarnaast 2–3 ambassadeurs/key-users aangewezen die
    de nieuwe manier van werken introduceren en in stand houden.

  Laag 2 — 85 eindgebruikers
    Elk circa 8 uur onboarding in 2028 (extra trainingsdag + on-the-job
    begeleiding) = 680 uur totaal, intern gefaciliteerd door de 5
    CRM-specialisten + Manager Klantcontact (sturing + rapportage).
    Geen klassikale trainingsdag, wel gefocuste sessies per team
    gekoppeld aan eigen werkprocessen.

  Laag 3 — externe schaduw-begeleiding na go-live
    De externe partner kijkt mee bij het dagelijks gebruik van het CRM
    direct na live-gang en signaleert afwijkingen tussen de bedoelde
    werkwijze en de feitelijke adoptie. Ambassadeurs gebruiken die
    signalen om bij te sturen.

  Laag 4 — acceptatietesten met key-users per sector in 2027
    24 uur per sectormanager: 8u testdeelname + 8u adoptiesturing eigen
    team + 8u go-live communicatie.

Geraamd trainingsbudget: €25.000–€30.000 (externe trainer + externe
schaduw-begeleiding na go-live + materialen + ambassadeur-faciliteiten).
```

---

## VRAAG 6 — Data-eigenaarschap + toegangsrechten + vastleggingsprotocollen

> *Is er al capaciteit gereserveerd of budget gedacht voor het formeel vastleggen van data-eigenaarschap, toegangsrechten en vastleggingsprotocollen per sector — en wie trekt dat traject intern?*

```
Status: nog te starten — onderdeel van de architectuur-fase 2026, vóór
de bouw kan beginnen. Formeel besluit MT vereist als randvoorwaarde.

Trekker: Manager Data & Technologie, in afstemming met de drie
sectormanagers (PO/VO/Professionals), de Productowner Klantinformatie-
systemen en de eigenaar (CIO/Directeur IV/IT).

Geraamde uren 2026:
  • Manager Data & Technologie: ca. 18 uur op data-eigenaarschaps-
    afspraken voor 3 sectoren (onderdeel van totaal 120u jaar 1)
  • Procesmanager / Data-analist Klant & Markt: ca. 20 uur afstemming
    funneldefinities en vastleggingsprotocollen met de processen-
    inspanning
  • 3 sectormanagers (PO/VO/Professionals): elk ca. 8 uur op data-
    eigenaarschap (onderdeel van hun 20u jaar 1 in dit cluster)

Harde afhankelijkheid met de processen-inspanning: funnelprocessen en
vastleggingsprotocollen MOETEN technisch zijn vertaald vóór de bouw.
Daarom procesontwerp parallel aan architectuur-fase, niet sequentieel.

Geen apart budget — interne uren binnen bestaande formatie. Geen
juridische of compliance-inhuur voorzien (alleen Cito-interne
governance), tenzij de Stichting-Cito-koppeling (zie Q1) extra
juridische analyse vereist.
```

---

## VRAAG 7 — Cito-rollen voor deze inspanning

> *Welke Cito-rollen verwacht je nodig voor deze inspanning?*

```
Eigenaar: Directeur IV/IT
Inspanningsleider: SiO (Strategic Information Officer)

Stuur- en kerngroep:
  • Manager Data & Technologie
  • Productowner Klantinformatiesystemen
  • Procesmanager / Data-analist Klant & Markt
  • Commercieel Manager
  • Sectormanager PO
  • Sectormanager VO
  • Sectormanager Professionals/Zakelijk

Klankbord en key-user-vertegenwoordiging (één afgevaardigde per groep):
  • Sales buitendienst
  • Sales/Accountmanagement binnendienst
  • Klantenservice
  Deze drie afgevaardigden brengen de praktijkervaring van de
  klantcontact-laag binnen in architectuur- en acceptatie-fase, en
  fungeren tevens als ambassadeurs richting hun team.

Aanvullende inzet (als deeltrajecten dit vereisen):
  • Trainer/Adviseur A (2 personen) — als interne CRM-specialist en
    opleider van eindgebruikers
  • Manager Klantcontact — adoptiesturing klantcontact-team na go-live
  • Productmanagers per sector (DST, KLT, Internationaal & Zakelijk) —
    als key-users en domeinexperts voor sectorinrichting
```

---

## VRAAG 8 — Interne uren per rol per jaar

> *Hoeveel interne uren per rol per jaar verwacht je voor deze CRM-inspanning?*

```
Onderbouwing: SiO/IT-architect en Manager Data & Technologie zwaar in
jaar 1 (architectuur, leveranciersselectie, data-eigenaarschap), lichter
in jaar 2 (acceptatietesten, adoptiesturing). Procesmanager Data en
Productowner Klantinformatiesystemen stevig over twee jaar (datamodel-
uitwerking en bouw-aansturing). Business informatieanalist alleen in
jaar 1 (functionele specificaties). Sectormanagers consistent licht in
jaar 1 + 2 (data-eigenaarschap + acceptatie). Eindgebruikers krijgen
8 uur onboarding in 2028.

Per rol per jaar (uit stap 7, optimaal scenario):

  Manager Data & Technologie         2026: 120u  2027:  80u  → 200u
  Procesmanager / Data-analist       2026: 160u  2027: 200u  → 360u
  Productowner Klantinformatie-      2026: 160u  2027: 200u  → 360u
    systemen
  Business informatieanalist C       2026: 200u                → 200u
  Trainer/Adviseur A (2× CRM-                    2027:  96u  →  96u
    specialist)
  Sectormanager PO                   2026:  20u  2027:  24u  →  44u
  Sectormanager VO                   2026:  20u  2027:  24u  →  44u
  Sectormanager Professionals        2026:  20u  2027:  24u  →  44u
  Manager Klantcontact                           2027:  20u  2028: 10u  →  30u
  Eindgebruikers (9 rollen)                      2028: 8u per persoon  →  96u verdeeld

Totaal interne uren over alle jaren: 1.466 uur
Totale interne kosten (uurtarief €74 met indexatie): €111.174

Opmerking: bovenstaande aantallen gaan uit van het optimaal scenario
(4 jaar, €250K/jaar). Bij plus20 (3 jaar) wordt de inzet
geconcentreerder per jaar; bij min20 (5 jaar) wordt de inzet meer
gespreid maar blijft het totaal vergelijkbaar.
```

---

## Risico's om in de beargumentatie mee te nemen

1. **Datamigratie 7–8 vervuilde bronnen** — kan 2–3× duurder uitvallen (€50K–€100K extra). Grootste single-point-of-failure jaarbudget 2027. Mitigatie: as-is scan in 2026 vóór bouw start; expliciete keuze "schoon schip vs. meenemen" op basis van scan-uitkomst.
2. **Stichting Cito CRM-koppeling** — kan verplichten dat ook Stichting Cito mee-overgaat naar het nieuwe platform; verdubbelt potentieel licentie- en migratiescope. Mitigatie: juridisch-technische analyse in architectuur-fase 2026.
3. **Dubbele licentielast tijdens transitie** — huidig Dynamics-platform blijft 6–12 maanden in 2027–2028 parallel draaien tot nieuw CRM live is (€30K–€60K extra). Onvermijdelijk; expliciet meenemen in jaarbegroting 2027–2028.
4. **Externe partner-tarief** — kan boven gangbare benchmark uitkomen bij scope-creep tijdens bouw. Mitigatie: vaste prijs per fase contracteren in plaats van uurtarief op nacalculatie.
5. **Vertraging architectuurbesluit** — blokkeert procesvalidatie (afhankelijkheid met processen-inspanning). Mitigatie: harde deadline Q2 2026 voor platform- en datamodel-besluit.
6. **Adoptie bij 85 eindgebruikers** — onvoldoende onboarding leidt tot inconsistent gebruik en herhaling van het oorspronkelijke probleem. Mitigatie: ambassadeur-aanpak + externe schaduw-begeleiding na go-live.

## Resultaatverwachting

> CRM operationeel binnen 12 maanden bouwfase; dashboard-adoptie ≥80% van klantcontact-medewerkers actief gebruikend binnen 3 maanden na go-live; CRM-volledigheidscore ≥85% per klantrecord; VO-verlengingssignalering ≥90% tijdig (≥6 weken voor verloopdatum); reductie van 'onverwachte uitstroom' VO met ≥40%.
