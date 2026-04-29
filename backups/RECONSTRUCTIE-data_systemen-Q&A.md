# Reconstructie businessCase Q&A — Data & Systemen

**Inspanning:** Integraal CRM-klantdashboard cross-sectoraal implementeren en inrichten
**Eigenaar:** CIO · **Inspanningsleider:** IT-architect
**Bron-data:** PRE-RECOVERY snapshot v1036 → `stap4.subEffortAnalysis[2]` + `begrotingAdvies` + `stap7InterneUren.scenarios.optimaal.domeinen[data_systemen]` + `vragenAntwoorden.insp-2-data_systemen`

> **Werkwijze:** klik in de wizard op "Bedenk vragen" voor het cluster Data & Systemen. De AI genereert 8 vragen — vergelijkbaar met de 6 thema-vragen + 2 standaard slotvragen hieronder. Lees per gegenereerde vraag het matchend antwoord af.

---

## VRAAG 1 — Aantal eindgebruikers per sector

**Te verwachten formulering:** "Hoeveel medewerkers met klantcontact gaan het CRM-klantdashboard gebruiken — per sector een schatting?"

**Eenheid:** aantal gebruikers (per sector)

**Aanbevolen antwoord:**

> **Totaal 83 medewerkers** verspreid over de drie sectoren:
> - **PO:** ~22 (8 sales, 3 productmanagers, 3 marketing, 8 klantenservice/binnendienst)
> - **VO:** ~13 (7 sales, 2 productmanagers, 1 marketing, 3 procesondersteuners/training)
> - **Professionals/Zakelijk:** ~30 (5 sales, 2 productmanagers, 1 marketing, 22 klantenservice/binnendienst)
> - **Gedeeld (klantcontact-laag):** Manager Klantcontact, Teamleider klantenservice, Trainer/Adviseur als CRM-specialist

**Bron:** stap7 selectiePerDomein.data_systemen + analoge zelfde verdeling als bij mens-domein deelnemerstelling.

---

## VRAAG 2 — CRM-platformkeuze en implementatie-looptijd

**Te verwachten formulering:** "Welk CRM-platform overwegen jullie en hoe lang verwacht je dat de implementatie duurt — van architectuur-besluit tot productie-go-live?"

**Eenheid:** platformnaam + maanden

**Aanbevolen antwoord:**

> **Microsoft Dynamics 365** (te bevestigen of alternatief vastgesteld in jaar 1).
> **Looptijd 14 maanden** verdeeld over drie fases:
> - **Jaar 1 (2026):** Analyse & Ontwerp (architectuur) — datamodel, toegangsrechten, leveranciersselectie, data-eigenaarschapsafspraken per sector, datakwaliteit-inventarisatie 7–8 bronsystemen
> - **Jaar 2 (2027):** Realisatie (bouw) & Datamigatie — externe bouw, datamigatie + opschoning, sectorspecifieke configuratie PO/VO/Zakelijk, acceptatietesten met key-users
> - **Jaar 3 (2028):** Acceptatie + Live gang — productie go-live voor 83 gebruikers, structurele licenties starten, eerste optimalisatieronde

**Bron:** activiteit-tekst per jaar uit `begrotingAdvies.scenarios.optimaal.inspanningen[data_systemen].verdelingPerJaar`.

---

## VRAAG 3 — Externe implementatiepartner

**Te verwachten formulering:** "Wordt er een externe implementatiepartner ingeschakeld voor de CRM-bouw, en wat is de verwachte omvang?"

**Eenheid:** € totaal + FTE

**Aanbevolen antwoord:**

> **Ja — externe CRM-architect/Dynamics-consultant**, ingehuurd voor circa **€200.000 totaal**.
> Inzet: gemiddeld **2–2,5 FTE gedurende 6 maanden** in de bouwfase (2027). Partner moet aantoonbare ervaring hebben in **B2B + onderwijssector**.
> Aanvullend: **externe trainer 5–8 dagen** voor het opleiden van 5 interne CRM-specialisten (één per afdeling: Klantcontact, Sector PO, Sector VO, Sector Professionals, Data & Technologie).

**Bron:** `begrotingAdvies` motivaties (alle 3 scenarios) + activiteit-tekst min20 jaar 2028.

---

## VRAAG 4 — Datamigratie (de 7–8 vervuilde bronnen)

**Te verwachten formulering:** "Hoeveel bronsystemen moeten worden gemigreerd, wat is de datakwaliteit, en wat is de geraamde inspanning?"

**Eenheid:** aantal bronnen + € + uren

**Aanbevolen antwoord:**

> **7–8 bronsystemen** worden samengebracht in het nieuwe Dynamics 365 CRM. Datakwaliteit wisselend tot vervuild: as-is scan in 2026 vereist vóór bouw start.
> **Geraamde kosten: €75.000** voor migratie + opschoning, ofwel **400–500 externe uren**.
>
> **Lijst denkbare bronsystemen** (te valideren in gesprek met IT-architect):
>
> | # | Bronsysteem | Doel | Eigenaar |
> |---|---|---|---|
> | 1 | Bestaand sales-CRM (mogelijk Dynamics-light, SugarCRM of intern) | Klantcontacten, leads, opportunities | Sales |
> | 2 | Excel/Google Sheets per sector | Pipeline, schoolplannen, klantcontactmomenten | Sectormanagers |
> | 3 | AFAS (HR/finance) | Klant-/contractgegevens, factuurhistorie | Finance |
> | 4 | Exact (boekhouding) | Betaalgedrag, facturatie | Finance |
> | 5 | Klantenservice ticketing (TopDesk / ServiceNow / Freshdesk) | Klachten, supportverzoeken | Klantenservice |
> | 6 | E-mailmarketing (Mailchimp / Spotler / Spotify) | Mailings, gedragsdata, leads-uit-campagnes | Marketing |
> | 7 | Schoolregister / DUO-data / scholen.com | Adres- en bestuursgegevens scholen | Sectoren PO + VO |
> | 8 | Productgebruiksdata uit Cito-platforms (LIB, KIB, etc.) | Adoptie + gebruiksanalytics | Data & Tech |
>
> **Risico:** datamigratie kan **2–3× duurder** uitvallen dan geraamd → potentiële extra kosten **€50K–€100K**. Grootste single-point-of-failure voor jaarbudget 2027 — directe escalatie naar Cornelis (eigenaar) bij overschrijding.

**Bron:** `begrotingAdvies.scenarios.min20.prioriteitAdvies` + opdrachtgever-context. De 8 bronnen hierboven zijn een **denkbare invulling** — leg de lijst voor aan de IT-architect en pas aan.

---

## VRAAG 5 — Structurele licentie- en beheerkosten

**Te verwachten formulering:** "Wat zijn de structurele licentie- en beheerkosten per jaar na go-live?"

**Eenheid:** € per jaar

**Aanbevolen antwoord:**

> **€40.000–€60.000 per jaar structureel** voor 83 gebruikers, opgebouwd uit:
> - **Licenties:** €25.000–€35.000/jaar (Dynamics-tarief × 83 gebruikers)
> - **Doorontwikkeling + beheer:** €15.000–€25.000/jaar (rapportage-verbeteringen, dashboardaanpassingen, beheercontract extern)
>
> Eerste structurele jaar = 2028 (na go-live). Loopt vervolgens elk jaar door — past binnen Cito-formatie-kader (geen nieuwe FTE benodigd, alleen externe licentielast en doorontwikkelingsbeheer).

**Bron:** `begrotingAdvies.scenarios.optimaal.inspanningen[data_systemen].verdelingPerJaar` jaar 2028–2029 + min20-scenario activiteit.

---

## VRAAG 6 — Adoptie- en trainingsaanpak

**Te verwachten formulering:** "Hoe wordt de adoptie aangepakt? Welke training krijgen eindgebruikers en CRM-specialisten?"

**Eenheid:** opzet + uren per gebruiker + € totaal

**Aanbevolen antwoord:**

> **Totaal trainingsbudget: €25.000** voor:
> - **5 interne CRM-specialisten** (één per afdeling) — extern opgeleid 5–8 dagen door externe trainer in 2027 (parallel aan bouwfase). Specialisten zijn **Trainer/Adviseur A** (2 personen, 96u over 2027) plus 3 andere afdelingsverankerde rollen.
> - **83 eindgebruikers** — **8 uur onboarding per persoon** in 2028 = totaal **664 onboarding-uren**, intern gefaciliteerd door de 5 CRM-specialisten + Manager Klantcontact (30u sturing + rapportage).
> - **Acceptatietesten met key-users per sector** in 2027: 24u per sectormanager (8u testdeelname + 8u adoptiesturing eigen team + 8u go-live communicatie).

**Bron:** stap7InterneUren rollen jaar 2028 + vragenAntwoorden Q3 voor `insp-2-data_systemen`.

---

## VRAAG 7 — Interne rollen (standaard slotvraag)

**Te verwachten formulering:** "Welke Cito-rollen verwacht je nodig voor deze inspanning?"

**Eenheid:** rol-namen

**Aanbevolen antwoord — kerngroep (architectuur + bouw):**

| Rol | Functie in dit cluster |
|---|---|
| **Manager Data & Technologie** | Architectuur, leveranciersselectie, stuurgroep |
| **Procesmanager / Data-analist Klant & Markt** | Datamodel, bronnenanalyse, datamigratie-coördinatie |
| **Productowner B producten** | Requirements, backlog-beheer, bouw-aansturing, go-live |
| **Business informatieanalist C** | Functionele analyse, datamapping, specificaties |
| **Trainer/Adviseur A** (2 personen als CRM-specialist) | Opleiding eindgebruikers + sectorinrichting |

**Sturing en data-eigenaarschap (per sector):**

| Rol | Functie |
|---|---|
| Sectormanager PO | Data-eigenaarschap PO, acceptatietest, adoptiesturing |
| Sectormanager VO | Data-eigenaarschap VO, schoolfasering-validatie |
| Sectormanager Professionals | Data-eigenaarschap Zakelijk, kandidaat-/opdrachtgevercontext |
| Manager Klantcontact | Adoptiesturing klantcontact-team, rapportage-review |

**Eindgebruikers (onboarding 2028):** Productmanagers (DST/KLT/Internationaal+Zakelijk), Campagne Marketeers (PO/VO), Junior Marketeer (Professionals), Accountmanager C (Professionals), Medewerker binnendienst A (Professionals).

---

## VRAAG 8 — Interne uren per rol per jaar (standaard slotvraag)

**Te verwachten formulering:** "Hoeveel interne uren per rol per jaar verwacht je voor deze inspanning?"

**Eenheid:** uren/jaar per rol

**Aanbevolen antwoord — exact uit stap7 vastgesteldeUrenPerInspanning:**

| Rol | 2026 | 2027 | 2028 | 2029 | **Totaal** |
|---|---:|---:|---:|---:|---:|
| Manager Data & Technologie | 120 | 80 | — | — | **200u** |
| Procesmanager / Data-analist Klant & Markt | 160 | 200 | — | — | **360u** |
| Productowner B producten | 160 | 200 | — | — | **360u** |
| Business informatieanalist C | 200 | — | — | — | **200u** |
| Trainer/Adviseur A (2× CRM-specialist) | — | 96 | — | — | **96u** |
| Sectormanager PO | 20 | 24 | — | — | **44u** |
| Sectormanager VO | 20 | 24 | — | — | **44u** |
| Sectormanager Professionals | 20 | 24 | — | — | **44u** |
| Manager Klantcontact | — | 20 | 10 | — | **30u** |
| Eindgebruikers onboarding (2028, 9 rollen) | — | — | 8 per pers. | — | **96u verdeeld** |

**Onderbouwing per rol** (uit `vragenAntwoorden.insp-2-data_systemen`):

> **Q1 — Data-leiderschap:** Manager Data & Tech 2026 ~120u (architectuur-sessies 4× à 4u + voorbereiding 4× à 3u = 28u, leveranciersselectie 24u, data-eigenaarschapsafspraken 3 sectoren 18u, stuurgroep 4× à 2u = 8u, overig 42u). Procesmanager/Data-analist 2026 ~160u (datamodel technische uitwerking 60u, bronnenanalyse 7-8 bronnen 40u, afstemming processen-inspanning 20u, documentatie 40u). 2027 Manager D&T ~80u (acceptatietesten aansturing, adoptiesturing, stuurgroep). Procesmanager 2027 ~200u (datamigatie coördinatie, sectorinrichting begeleiding).
>
> **Q2 — Productontwikkeling + analyse:** Productowner B 2026 ~160u (requirements-sessies 3 sectoren 48u, leveranciersselectie 20u, backlog-beheer 40u, reviews 52u). Business informatieanalist C 2026 ~200u (functionele analyse 80u, datamapping alle bronnen 60u, specificaties 60u). 2027 per CRM-specialist (5 personen) ~60u (opleiding 24u, sectorinrichting 24u, acceptatietest 12u). Productowner B 2027 ~200u (bouw-aansturing, acceptatietesten coördinatie, go-live voorbereiding).
>
> **Q3 — Sector + adoptie:** Per sectormanager 2026 ~20u (data-eigenaarschapsafspraken 8u, stuurgroep 4×2u=8u, review datamodel 4u). 2027 ~24u (acceptatietest 8u, adoptiesturing 8u, go-live communicatie 8u). 2027–2028 eindgebruikers onboarding: 83 gebruikers × 8u = **664u totaal verspreid over sectoren**. Manager Klantcontact 2027–2028 ~30u (adoptiesturing klantcontact-team, rapportage-review).

---

## Risico's en randvoorwaarden — terloops in te brengen

**Randvoorwaarden** (beargumentatie aan AI):
1. Mandaat CIO voor cross-sectorale standaardisering datamodel + toegangsrechten-architectuur
2. Funnelprocessen + vastleggingsprotocollen uit processen-inspanning **moeten technisch zijn vertaald vóór bouw** — afhankelijkheid hardcoded
3. Data-eigenaarschapsafspraken per sector formeel vastgelegd vóór start
4. IT-capaciteit geborgd; huidige digitale achterstanden mogen implementatietijdlijn niet blokkeren

**Risico's:**
- **Datamigratie 7–8 bronnen kan 2–3× duurder** (€50K–€100K extra) — grootste single-point-of-failure jaar 2027
- Externe partner-tarief kan oplopen bij scope-creep
- Vertraging architectuurbesluit blokkeert procesvalidatie
- Adoptie-risico bij 83 eindgebruikers — onvoldoende onboarding leidt tot inconsistent gebruik en herhaling van het oorspronkelijke probleem (klantdata onvolledig/inconsistent)

---

## Resultaatverwachting (uit `begrotingAdvies.dossier.verwachtResultaat`)

> Volledig heringericht CRM operationeel voor alle drie sectoren binnen 12 maanden; dashboard-adoptie ≥80% van medewerkers met klantcontact actief gebruikend binnen 3 maanden na go-live; CRM-volledigheidscore ≥85% per klantrecord; VO-verlengingssignalering ≥90% tijdig (≥6 weken voor verloopdatum); reductie van 'onverwachte uitstroom' VO met ≥40%.
