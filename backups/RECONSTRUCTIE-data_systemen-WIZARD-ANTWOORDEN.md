# Wizard-antwoorden — Data & Systemen (CRM-cluster)

**Sessie:** d8b97442 · **Stap:** 6 (Optimaliseren) · **Cluster:** Integraal CRM-klantdashboard cross-sectoraal
**Bron-data:** PRE-RECOVERY snapshot v1036 — `stap7InterneUren` + `begrotingAdvies` (3 scenarios)

> Per vraag staat één direct kopieer-baar antwoord. Pas aan met de IT-architect ter plekke; alle getallen zijn afgeleid uit de eerdere sessie-output (stap 7 + begrotingsadvies) en consistent met elkaar.

---

## VRAAG 1 — CRM-platform + aantal licenties

> *Welk CRM-platform wordt (waarschijnlijk) gebruikt of uitgebreid — en hoeveel licenties zijn er naar schatting nodig voor alle medewerkers met klantcontact over PO, VO en Zakelijk samen?*

```
Microsoft Dynamics 365 (te bevestigen of alternatief in jaar 1 — keuze
maakt onderdeel uit van de architectuur-fase 2026).

83 licenties totaal, verdeeld over PO (~22), VO (~13) en Professionals/
Zakelijk (~30), aangevuld met de overstijgende klantcontact-laag (Manager
Klantcontact, Teamleider klantenservice, CRM-specialisten).

Indicatieve licentiekosten: €25.000–€35.000 per jaar structureel
(Dynamics-tarief × 83 gebruikers).
```

---

## VRAAG 2 — Externe implementatiepartner

> *Wordt er een externe implementatiepartner ingeschakeld voor de CRM-inrichting en dashboardbouw — en wat is een ruwe schatting van het budget of het aantal externe dagen?*

```
Ja — externe CRM-architect/Dynamics-consultant. Geraamd budget €200.000
voor architectuur + bouw + sectorinrichting. Inzet circa 2–2,5 FTE
gedurende 6 maanden in de bouwfase (2027), wat neerkomt op
ruim 220 externe dagen.

Aanvullend €25.000 voor sectorinrichting per sector (PO/VO/Zakelijk
afzonderlijke configuratie) en circa €10.000 voor een externe trainer
(5–8 dagen) om 5 interne CRM-specialisten op te leiden in 2027.

Vereiste: partner met aantoonbare CRM-ervaring in B2B én onderwijssector.
```

---

## VRAAG 3 — Bronsystemen + integratie-complexiteit

> *Hoeveel bronsystemen moeten worden gekoppeld — denk aan LVS-data (PO), schoolplan- en contractsystemen (VO), factuur- en kandidaatdata (Zakelijk) — en zijn er bekende integratie-uitdagingen of legacy-systemen?*

```
7–8 bronsystemen worden gekoppeld of gemigreerd. As-is datakwaliteit
is wisselend en deels vervuild — een datakwaliteit-scan in 2026 vóór
bouw is een harde voorwaarde.

Denkbare bronnen (te valideren met IT-architect):
1. Bestaand sales-CRM / opportunity-tooling
2. Excel- en Sheets-bestanden per sector (pipelines, schoolplannen)
3. AFAS — HR + klant-/contractgegevens
4. Exact — facturatie, betaalgedrag
5. Klantenservice-ticketing (TopDesk / ServiceNow / Freshdesk)
6. E-mailmarketing-platform (Mailchimp / Spotler)
7. Schoolregister / DUO-data — adres- en bestuursgegevens (PO + VO)
8. Productgebruiksdata uit Cito-platforms (LIB, KIB, etc.)

Geraamde migratie- en opschoningskosten: €75.000 (≈400–500 externe uren).

Grootste risico: datamigratie kan 2–3× duurder uitvallen
(€50.000–€100.000 extra). Single-point-of-failure voor jaarbudget 2027 —
afgesproken: bij dreigende overschrijding directe escalatie naar de
opdrachtgever (CIO).
```

---

## VRAAG 4 — Looptijd + fasering

> *Wat is de verwachte looptijd — en zijn er al gedachten over fasering (bijv. eerst Zakelijk als pilot, dan PO en VO)?*

```
Totale looptijd: 14 maanden actieve implementatie, gespreid over 3 jaar.

  • 2026 — Analyse & Ontwerp (architectuur, datamodel, leveranciersselectie,
            data-eigenaarschap, kwaliteitsscan 7–8 bronsystemen)
  • 2027 — Realisatie (bouw + datamigratie + sectorinrichting + acceptatie-
            testen, opleiden 5 interne CRM-specialisten)
  • 2028 — Live gang voor 83 gebruikers + eerste optimalisatieronde
            + start structurele licentiekosten

Fasering: parallelle uitrol PO + VO + Zakelijk vanaf go-live 2028, NIET
sequentieel per sector. Reden: het cross-sectorale datamodel en het
gedeelde dashboard zijn één product.

Mogelijke nuance: Zakelijk-inrichting kan 3–4 weken extra duren door
afwijkende marktcontext (kandidaten + opdrachtgevers); Zakelijk wordt
daarom als laatste sector live gezet binnen dezelfde 2028-window.

Plus20-scenario: 3 jaar (2026–2028) bij €300K/jaar (sneller, intensievere
bouwpiek 2027). Min20-scenario: 5 jaar (2026–2030) bij €200K/jaar
(langzamer, ruimere risicobuffer voor datamigratie).
```

---

## VRAAG 5 — Aantal te trainen medewerkers + trainingsaanpak

> *Hoeveel medewerkers met klantcontact moeten worden getraind — en denk je aan centrale trainingsdagen, e-learning, of begeleiding on-the-job?*

```
83 eindgebruikers + 5 interne CRM-specialisten worden getraind.

Gelaagde aanpak:
  • 5 interne CRM-specialisten (één per afdeling: Klantcontact, Sector PO,
    Sector VO, Sector Professionals, Data & Technologie) worden in 2027
    extern opgeleid door een externe trainer (5–8 dagen). Zij worden
    daarna trainers/begeleiders voor de eindgebruikers.

  • 83 eindgebruikers krijgen elk 8 uur onboarding in 2028 = 664 uur
    totaal, intern gefaciliteerd door de 5 CRM-specialisten +
    Manager Klantcontact (30 uur sturing + rapportage). Geen klassikale
    trainingsdag, maar gefocuste sessies per team gekoppeld aan
    werkprocessen — on-the-job met directe toepassing.

  • Acceptatietesten met key-users per sector in 2027 (24 uur per
    sectormanager: 8u testdeelname + 8u adoptiesturing eigen team
    + 8u go-live communicatie).

Geen aparte e-learning ontwikkeld — directe begeleiding door interne
specialisten is bewust gekozen om Cito-context en eigen werkprocessen
mee te kunnen geven.

Geraamd trainingsbudget: €25.000 (externe trainer + opleiding 5
specialisten + materialen).
```

---

## VRAAG 6 — Data-eigenaarschap + toegangsrechten + vastleggingsprotocollen

> *Is er al capaciteit gereserveerd of budget gedacht voor het formeel vastleggen van data-eigenaarschap, toegangsrechten en vastleggingsprotocollen per sector — en wie trekt dat traject intern?*

```
Status: nog te starten — onderdeel van de architectuur-fase 2026, vóór
bouw kan beginnen. Formeel besluit MT vereist als randvoorwaarde.

Trekker: Manager Data & Technologie, in afstemming met de drie sector-
managers en de CIO (als eigenaar).

Geraamde uren 2026:
  • Manager Data & Tech: 18 uur specifiek voor data-eigenaarschaps-
    afspraken 3 sectoren (onderdeel van totaal 120u jaar 1)
  • Procesmanager / Data-analist Klant & Markt: 20 uur afstemming
    funneldefinities en vastleggingsprotocollen met processen-inspanning
  • 3 sectormanagers (PO/VO/Professionals): elk 8 uur op data-
    eigenaarschap (onderdeel van hun 20u jaar 1 in dit cluster)

Harde afhankelijkheid met processen-inspanning: funnelprocessen en
vastleggingsprotocollen MOETEN technisch zijn vertaald vóór bouw.
Daarom procesontwerp parallel aan architectuur-fase, niet sequentieel.

Geen apart budget — interne uren binnen bestaande formatie. Geen
juridische of compliance-inhuur voorzien (alleen Cito-interne
governance).
```

---

## VRAAG 7 — Cito-rollen voor deze inspanning

> *Welke Cito-rollen verwacht je nodig voor deze inspanning? Denk aan: IT-architect (inspanningsleider), CIO (eigenaar), Sectormanager PO/VO/Professionals, Productmanager, Manager Data & Technologie, Procesmanager, Projectmanager, en eventueel Accountmanagers als key users per sector.*

```
Eigenaar: CIO
Inspanningsleider: IT-architect

Kerngroep architectuur + bouw:
  • Manager Data & Technologie       (architectuur, leveranciersselectie,
                                      stuurgroep)
  • Procesmanager / Data-analist     (datamodel, bronnenanalyse,
    Klant & Markt                     datamigratie-coördinatie)
  • Productowner B producten         (requirements, backlog, bouw-
                                      aansturing, go-live)
  • Business informatieanalist C     (functionele analyse, datamapping,
                                      specificaties)
  • Trainer/Adviseur A (2×)          (interne CRM-specialist + opleiding
                                      eindgebruikers)

Data-eigenaarschap + adoptiesturing per sector:
  • Sectormanager PO
  • Sectormanager VO
  • Sectormanager Professionals
  • Manager Klantcontact             (adoptiesturing klantcontact-team,
                                      rapportage-review)

Eindgebruikers / key-users (onboarding 2028):
  • Productmanager B (DST) ×2
  • Productmanager B (KLT)
  • Productmanager A (Internationaal & Zakelijk)
  • Campagne Marketeer A (PO)
  • Campagne Marketeer B (VO)
  • Junior Marketeer (Professionals)
  • Accountmanager C (Professionals) ×3
  • Medewerker binnendienst A (Professionals)
```

---

## VRAAG 8 — Interne uren per rol per jaar

> *Hoeveel interne uren per rol per jaar verwacht je voor deze CRM-inspanning?*

```
Onderbouwing: IT-architect/Manager D&T zwaar in jaar 1 (architectuur,
leveranciersselectie, data-eigenaarschap), lichter in jaar 2 (acceptatie-
testen, adoptiesturing). Procesmanager Data en Productowner B zijn
stevig betrokken over twee jaar (datamodel-uitwerking en bouw-
aansturing). Business informatieanalist alleen in jaar 1 (specificaties).
Sectormanagers consistent licht in jaar 1 + 2 (data-eigenaarschap +
acceptatie). Eindgebruikers krijgen 8 uur onboarding in 2028.

Per rol per jaar:

  Manager Data & Technologie         2026: 120u  2027:  80u  → 200u
  Procesmanager / Data-analist       2026: 160u  2027: 200u  → 360u
  Productowner B producten           2026: 160u  2027: 200u  → 360u
  Business informatieanalist C       2026: 200u                → 200u
  Trainer/Adviseur A (2× specialist)             2027:  96u  →  96u
  Sectormanager PO                   2026:  20u  2027:  24u  →  44u
  Sectormanager VO                   2026:  20u  2027:  24u  →  44u
  Sectormanager Professionals        2026:  20u  2027:  24u  →  44u
  Manager Klantcontact                           2027:  20u  2028: 10u →  30u
  Eindgebruikers (9 rollen)                                  2028: 8u per persoon →  96u verdeeld

Totaal interne uren over alle jaren: 1.466 uur
Totale interne kosten (uurtarief €74 met indexatie): €111.174
```

---

## Risico's om in de beargumentatie mee te nemen

1. **Datamigratie 7–8 vervuilde bronnen** — kan 2–3× duurder uitvallen (€50K–€100K extra). Grootste single-point-of-failure jaarbudget 2027. Mitigatie: as-is scan in 2026 vóór bouw start.
2. **Externe partner-tarief** — kan boven gangbare benchmark uitkomen bij scope-creep tijdens bouw.
3. **Vertraging architectuurbesluit** — blokkeert procesvalidatie (afhankelijkheid met processen-inspanning).
4. **Adoptie bij 83 eindgebruikers** — onvoldoende onboarding leidt tot inconsistent gebruik en herhaling van het oorspronkelijke probleem.

## Resultaatverwachting (uit dossier)

> CRM operationeel binnen 12 maanden bouwfase; dashboard-adoptie ≥80% van klantcontact-medewerkers actief gebruikend binnen 3 maanden na go-live; CRM-volledigheidscore ≥85% per klantrecord; VO-verlengingssignalering ≥90% tijdig (≥6 weken voor verloopdatum); reductie van 'onverwachte uitstroom' VO met ≥40%.
