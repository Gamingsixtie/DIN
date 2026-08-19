# Voorstel tekst-update Mens — Stap 7 Interne uren

**Sessie**: `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Domein**: Mens
**Bron**: Supabase `din_sessions.data.crossAnalyseWizard.stepResults.stap4.stap7InterneUren`
**Scope**: alleen `motivatie` + `jaren[].activiteit` per scenario voor mens-domein. Geen wijziging aan rollen, percentages of getallen.

---

## Read-state (uit Supabase)

### Mens-domein totalen per scenario

| Scenario | Periode | Totaal | Programma | Lijn | Raadplegen |
|---|---|---:|---:|---:|---:|
| advies | 2026–2029 (4 jaar) | 3.814u | 2.164u | 1.632u | 54u |
| plus20 | 2026–2030 (5 jaar) | 4.094u | 2.396u | 1.680u | 54u |
| optimaal | 2026–2032 (7 jaar) | 4.429u | 2.662u | 1.735u | 54u |
| min20 | 2026–2035 (10 jaar) | 4.859u | 3.016u | 1.809u | 54u |

Lijn-uren zijn dus **wél onderdeel van het mens-domein-totaal** (~1.632u in advies, oplopend tot ~1.809u in min20). Raadplegen-uren zijn 54u in elk scenario, geleverd door 9 geconsulteerden.

### Selectie mens (uit `selectiePerDomein.mens` + `customFunctiesPerDomein.mens`)

**Inspanningsleider (1):**
- `custom-yara-mens-leider` → **Yara — HR-manager (inspanningsleider Mens)** (HR, leider, programma 0.9 / lijn 0.1 / raadplegen 0)

**Kernteam (5):**
- `sectormanager_po` → Sectormanager PO (programma 0.8 / lijn 0.2)
- `sectormanager_vo` → Sectormanager VO (programma 0.8 / lijn 0.2)
- `sectormanager_prof` → Sectormanager Professionals (programma 0.8 / lijn 0.2)
- `manager_klantcontact` → Manager Klantcontact (programma 0.8 / lijn 0.2)
- `custom-hr-curriculum-mens` → HR-medewerker (curriculum + integratie) (programma 0.8 / lijn 0.2)

**Trainings-deelnemers (65, programma 0.5 / lijn 0.5):**
- `klantenservice_c` × 28 — Klantenservice medewerker C
- `trainer_adviseur_a` × 12 — **Trainer/Adviseur A (zelf cursist; externe partij geeft de training)**
- `accountmanager_c` × 7 — Accountmanager C
- `mdw_binnendienst_b` × 7 — Medewerker binnendienst B
- `accountmanager_c_prof` × 5 — Accountmanager C (Professionals)
- 6 ad-hoc-instromers: `accountmanager_a` (1), `accountmanager_b` (1), `klantenservice_a` (1), `klantenservice_b` (1), `mdw_binnendienst_a` (1), `teamleider_klantenservice` (1)

**Geconsulteerden (9, programma 0 / lijn 0 / raadplegen 1.0):**
- `productmanager_dst` × 3 — Productmanager B (DST)
- `productmanager_klt` × 2 — Productmanager B (KLT)
- `campagne_marketeer_a` × 1 — Campagne Marketeer A
- `campagne_marketeer_b` × 1 — Campagne Marketeer B
- `junior_marketeer_prof` × 1 — Junior Marketeer (Professionals)
- `teamleider_trainingen` × 1 — Teamleider Trainingen

---

## Voorgestelde motivatie per scenario

### advies (2026–2029, 3.814u)

> **HR-manager (Yara) coördineert** als inspanningsleider mens-domein het hele spoor — programmaorganisatie, niet operationele facilitering.
>
> **Kernteam (5 personen)** bestaat uit **alle 3 sectormanagers (PO, VO, Zakelijk/Professionals)**, Manager Klantcontact en de HR-medewerker curriculum + integratie. Zij zetten lijnen uit en borgen de sector-doorvertaling — geen trainings-facilitering.
>
> **Externe partij verzorgt de trainingen** — ~46u contacttijd per cursist, opgesplitst in blok 1 (24u) en blok 2 (22u). De 65 trainings-deelnemers omvatten 28 Klantenservice medewerkers C, **12 Trainer/Adviseur A die zelf cursist zijn** (zij geven Cito-product-trainingen klantgericht en moeten outside-in zelf beheersen — géén facilitatoren), 7 Accountmanagers C, 7 Medewerkers binnendienst B, 5 Accountmanagers C Professionals en 6 ad-hoc-instromers.
>
> **Programma vs. lijn** is expliciet verdeeld: kernteam programma 80% / lijn 20%; trainings-deelnemers programma 50% / lijn 50% (cursistijd tijdens werktijd telt deels als lijn — vandaar **1.632 lijn-uren in dit advies-totaal**); inspanningsleider 90% / 10%.
>
> **Raadplegen-uren (54u over 4 scenario-jaren)** komen van 9 geconsulteerden — productmanagers (DST + KLT), 3 marketeers en de Teamleider Trainingen — die casuïstiek-input leveren en de externe trainingspartij coördineren op piek-momenten in 2027–2028.
>
> Cito-kerndoel-koppeling: gespreksvaardigheid outside-in op alle frontline-rollen verdiept commerciële slagkracht en klantrelaties; pieken in 2027 en 2028 (trainingsblokken), overige jaren voorbereiding en borging.

### plus20 (2026–2030, 4.094u)

> **HR-manager (Yara) coördineert** als inspanningsleider mens-domein. Plus20 strekt het advies-pakket met één extra borgingsjaar (2030) zodat de transfer naar de lijn beter beklijft.
>
> **Kernteam (5 personen)**: **alle 3 sectormanagers (PO, VO, Zakelijk/Professionals)**, Manager Klantcontact en HR-medewerker curriculum + integratie — zelfde rolverdeling als advies, geen trainings-facilitering.
>
> **Externe partij verzorgt beide trainingsblokken** voor 65 trainings-deelnemers waaronder de **12 Trainer/Adviseur A als zelf-cursist** (geen interne trainers).
>
> **Lijn-uren expliciet**: 1.680u in dit scenario (kernteam 80/20, trainings-deelnemers 50/50, leider 90/10) — iets boven advies door extra borgings-cyclus.
>
> **Raadplegen-uren expliciet**: 54u door 9 geconsulteerden (productmanagers, marketeers, Teamleider Trainingen) — input-piek in 2027 en 2028 rondom curriculum-aanscherping.
>
> Pieken in 2027 en 2028; 2029 actieve borging met aanvullende casuïstiek-sessies; 2030 borging-licht in HRM-cyclus.

### optimaal (2026–2032, 4.429u)

> **HR-manager (Yara) coördineert** als inspanningsleider mens-domein over een langer pad: een aparte basis-fase in 2027 (curriculum en planning rustig laten landen) en pas trainingsblokken in 2028 en 2029.
>
> **Kernteam (5 personen)**: **alle 3 sectormanagers (PO, VO, Zakelijk/Professionals)**, Manager Klantcontact en HR-medewerker curriculum + integratie — zij verankeren leerdoelen vóór de eerste blok-start.
>
> **Externe partij verzorgt de trainingen** — 65 trainings-deelnemers, met **12 Trainer/Adviseur A als zelf-cursist** (de externe trainer geeft de training; deze 12 zijn geen interne facilitatoren).
>
> **Lijn-uren expliciet**: 1.735u verdeeld over 7 jaar — iets hoger dan advies door langere borgings-staart (2030 actieve borging + 2031–2032 borging-licht).
>
> **Raadplegen-uren expliciet**: 54u door 9 geconsulteerden — input geconcentreerd in basisjaar 2027 en blok-1-jaar 2028.
>
> Pieken in 2028 en 2029; daarna structurele borging-cyclus.

### min20 (2026–2035, 4.859u)

> **HR-manager (Yara) coördineert** als inspanningsleider mens-domein over 10 jaar — de blokken worden uitgesmeerd (blok 1 in 2028, blok 2 in 2030) zodat de jaarlijkse capaciteitsdruk lager blijft, met meerjarige borging tot 2035.
>
> **Kernteam (5 personen)**: **alle 3 sectormanagers (PO, VO, Zakelijk/Professionals)**, Manager Klantcontact en HR-medewerker curriculum + integratie — geen trainings-facilitering vanuit Cito.
>
> **Externe partij verzorgt beide blokken** voor 65 trainings-deelnemers, inclusief de **12 Trainer/Adviseur A als zelf-cursist** (geen interne trainers — de externe partij voert blok 1 én blok 2 uit).
>
> **Lijn-uren expliciet**: 1.809u — het hoogste lijn-aandeel van alle scenario's omdat trainings-deelnemers (programma 50% / lijn 50%) over meer jaren participeren plus een lange borgings-staart 2031–2035.
>
> **Raadplegen-uren expliciet**: 54u door 9 geconsulteerden — input verdeeld tussen 2027 (basis) en 2028 (blok 1).
>
> Pieken in 2028 en 2030; 2029 tussen-borging; 2031 actieve borging; 2032–2035 borging-licht in HRM-cyclus.

---

## Voorgestelde per-jaar activiteit per scenario

> **Cruciale correctie**: in de huidige tekst voor 2027 staat (impliciet) dat 12 Trainer/Adviseur A zouden faciliteren. Dat is fout — zij zijn **zelf cursist**. De externe partij is facilitator. Onderstaande herschreven activiteiten zetten dat overal expliciet recht.

### advies

- **2026 — Behoefte-fase**: Nulmeting outside-in gespreksvaardigheid; Manager Klantcontact, HR-curriculumeigenaar en alle 3 sectormanagers (PO, VO, Professionals) leveren input voor sector-mandaat. Casuïstiek-inventarisatie via productmanagers en marketeers (geconsulteerd, 9 personen). Selectie en contractering externe trainingspartij. Deelnemerslijst van 65 cursisten vaststellen, kick-off. Yara (HR-manager) zet als inspanningsleider de governance op.
- **2027 — Vaardigheid-fase blok 1**: **Externe partij voert trainingsblok 1 (24u/cursist) uit voor 65 cursisten, waaronder de 12 Trainer/Adviseur A als zélf-cursist** (zij faciliteren niet — zij volgen de training). Tussentijdse evaluatie door HR-curriculumeigenaar en Manager Klantcontact; alle 3 sectormanagers borgen werkroostering. Volume-jaar (zwaartepunt 65 × 24u = 1.560 cursisturen + voorbereiding).
- **2028 — Vaardigheid-fase blok 2**: **Externe partij voert trainingsblok 2 (22u/cursist) uit** met casuïstiek uit eigen werk. Coaching-on-the-job door leidinggevenden (geen interne trainers vanuit Cito). Tussen-evaluatie en bijsturing curriculum door HR-curriculumeigenaar. Tweede volume-jaar (65 × 22u = 1.430 cursisturen).
- **2029 — Borging-fase**: Nazorgcyclus en evaluatie transferresultaten door HR-curriculumeigenaar; outside-in opgenomen als vast onderdeel onboarding; jaarlijkse refresher via externe partij; overdracht naar lijn (Manager Klantcontact + alle 3 sectormanagers) en verankering in HRM-cyclus. Minimum-borging in dit korte scenario.

### plus20

- **2026**: Identiek aan advies — behoefte-fase, nulmeting, selectie externe partij, kick-off met 65 cursisten. 3 sectormanagers borgen sector-mandaat.
- **2027 — Vaardigheid-fase blok 1**: **Externe partij voert trainingsblok 1 (24u/cursist) uit voor 65 cursisten, inclusief de 12 Trainer/Adviseur A als zelf-cursist**. Tussentijdse evaluatie door HR-curriculumeigenaar + Manager Klantcontact; sectormanagers borgen werkroostering.
- **2028 — Vaardigheid-fase blok 2**: **Externe partij voert trainingsblok 2 (22u/cursist) uit** met casuïstiek uit eigen werk. Coaching door leidinggevenden; geen interne trainers.
- **2029 — Borging actief**: Aanvullende casuïstiek-sessies, refresher via externe partij, transfer-monitoring door HR-curriculumeigenaar. Volume hoger dan advies-borging.
- **2030 — Borging-licht**: Jaarlijkse korte refresher en monitoring door HR-curriculumeigenaar + Manager Klantcontact. Outside-in volledig in HRM-cyclus; geen actieve trainings-uren meer.

### optimaal

- **2026**: Behoefte-fase — nulmeting, selectie externe partij, kick-off; alle 3 sectormanagers borgen mandaat.
- **2027 — Basis-fase (geen training)**: **Externe partij** rondt curriculum-ontwerp af samen met HR-curriculumeigenaar en Manager Klantcontact; planning trainingsblok 1 voor 65 cursisten (inclusief de 12 Trainer/Adviseur A als zelf-cursist). Sectormanagers en Manager Klantcontact verankeren leerdoelen. In dit optimaal-scenario bewust een aparte basis-jaar zónder training.
- **2028 — Vaardigheid-fase blok 1**: **Externe partij voert trainingsblok 1 (24u/cursist) uit voor 65 cursisten, inclusief de 12 Trainer/Adviseur A als zelf-cursist**. Tussentijdse evaluatie door HR-curriculumeigenaar + Manager Klantcontact; alle 3 sectormanagers borgen werkroostering.
- **2029 — Vaardigheid-fase blok 2**: **Externe partij voert trainingsblok 2 (22u/cursist) uit** met casuïstiek uit eigen werk. Coaching door leidinggevenden; geen interne trainers.
- **2030 — Borging actief**: Refresher, transfer-monitoring, opname in onboarding door HR-curriculumeigenaar.
- **2031–2032 — Borging-licht**: Jaarlijkse korte refresher en monitoring door HR-curriculumeigenaar + Manager Klantcontact. Outside-in in HRM-cyclus.

### min20

- **2026**: Behoefte-fase — nulmeting, casuïstiek-inventarisatie via geconsulteerden, selectie externe partij, kick-off. Alle 3 sectormanagers borgen mandaat.
- **2027 — Basis-fase (uitgesmeerd)**: **Externe partij** rondt curriculum-ontwerp af samen met HR-curriculumeigenaar; planning blok 1 voor 65 cursisten (waaronder de 12 Trainer/Adviseur A als zelf-cursist). Extra ruimte voor casuïstiek-uitwerking — zwaartepunt voorbereiding.
- **2028 — Vaardigheid-fase blok 1**: **Externe partij voert trainingsblok 1 (24u/cursist) uit voor 65 cursisten, inclusief de 12 Trainer/Adviseur A als zelf-cursist**. Tussentijdse evaluatie door HR-curriculumeigenaar + Manager Klantcontact; sectormanagers borgen werkroostering.
- **2029 — Tussen-borging**: Transfer monitoren, casuïstiek aanscherpen tussen blok 1 en blok 2; HR-curriculumeigenaar + Manager Klantcontact + sectormanagers.
- **2030 — Vaardigheid-fase blok 2**: **Externe partij voert trainingsblok 2 (22u/cursist) uit** — pieken kunnen in min20 niet verder uitgerekt door training-werklast. Coaching door leidinggevenden; geen interne trainers.
- **2031 — Borging actief**: Eerste borgings-jaar na blok 2 — refresher via externe partij, transfer-monitoring door HR-curriculumeigenaar, overdracht naar lijn.
- **2032–2035 — Borging-licht**: Jaarlijkse korte refresher en monitoring door HR-curriculumeigenaar + Manager Klantcontact. Outside-in volledig in HRM-cyclus; geen actieve trainings-uren; ad-hoc onboarding via standaard-curriculum.

---

## Verificatie

- Coördinator = HR-manager (Yara) als inspanningsleider mens-domein, niet "teamleider" — staat in alle 4 motivaties en 2026-activiteit
- "Alle 3 sectormanagers (PO, VO, Zakelijk/Professionals)" expliciet benoemd in alle motivaties + relevante jaren
- Geen "12 trainers faciliteren"-claim — overal vervangen door **"12 Trainer/Adviseur A als zelf-cursist; externe partij geeft de training"**
- Lijn-uren expliciet benoemd per scenario (1.632 / 1.680 / 1.735 / 1.809u) inclusief verdeling-mechaniek (kernteam 80/20, deelnemers 50/50, leider 90/10)
- Raadplegen-uren expliciet benoemd (54u over 4 scenario's) met identificatie van de 9 geconsulteerden
- Cijfers matchen Supabase (zie read-state-tabel hierboven)
- Geen wijziging aan selectie/classificatie of getallen — alleen `motivatie` + `jaren[].activiteit` herschreven
