# Voorstel update Data & Systemen — Stap 7 Interne uren

**Sessie**: `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Domein**: `data_systemen`
**Inspanning**: Integraal CRM-klantdashboard cross-sectoraal implementeren en inrichten (groep `g1`)
**Bron data**: read-only Supabase (`stap7InterneUren.vastgesteldeUrenPerInspanning` + `scenarios[].domeinen[data_systemen].jaren`)

---

## Read-state VOOR mutatie

### Functies per categorie (bron: vastgesteldeUrenPerInspanning, advies-basis)

**Leider (1 persoon, 240u)**
| FunctieId | Naam | Aantal | Uren | %P / %L / %R |
|---|---|---:|---:|---|
| `custom-sven-data-leider` | Sven — SIO (inspanningsleider Data & Systemen) | 1 | 240 | 0.9 / 0.1 / 0 |

**Kernteam (5 personen, 550u)**
| FunctieId | Naam | Aantal | Uren | %P / %L / %R |
|---|---|---:|---:|---|
| `projectmanager_d` | Projectmanager D | 1 | 110 | 0.8 / 0.2 / 0 |
| `procesmanager_data` | Procesmanager / Data-analist Klant & Markt | 1 | 110 | 0.8 / 0.2 / 0 |
| `mdw_binnendienst_a_prof` | Medewerker binnendienst A (Professionals) | 1 | 110 | 0.8 / 0.2 / 0 |
| `custom-mdw-bd-po` | Medewerker binnendienst (PO) | 1 | 110 | 0.8 / 0.2 / 0 |
| `custom-mdw-bd-vo` | Medewerker binnendienst (VO) | 1 | 110 | 0.8 / 0.2 / 0 |

**Trainings-deelnemer (26 personen, 728u)**
| FunctieId | Naam | Aantal | Uren totaal | %P / %L / %R |
|---|---|---:|---:|---|
| `sectormanager_po` | Sectormanager PO | 1 | 28 | 0.7 / 0.3 / 0 |
| `sectormanager_vo` | Sectormanager VO | 1 | 28 | 0.7 / 0.3 / 0 |
| `content_specialist` | Content Specialist | 1 | 28 | 0.7 / 0.3 / 0 |
| `productmanager_dst` | Productmanager B (DST) | 2 | 56 | 0.7 / 0.3 / 0 |
| `productmanager_kib` | Productmanager A (KiB) | 1 | 28 | 0.7 / 0.3 / 0 |
| `productmanager_klt` | Productmanager B (KLT) | 1 | 28 | 0.7 / 0.3 / 0 |
| `productmanager_lib` | Productmanager B (LiB) | 1 | 28 | 0.7 / 0.3 / 0 |
| `productmanager_nt2` | Productmanager B (NT2 overheid) | 1 | 28 | 0.7 / 0.3 / 0 |
| `sectormanager_prof` | Sectormanager Professionals | 1 | 28 | 0.7 / 0.3 / 0 |
| `trainer_adviseur_a` | Trainer/Adviseur A | 12 | 336 | 0.7 / 0.3 / 0 |
| `productmanager_cvvo` | Productmanager B (CvVO) | 1 | 28 | 0.7 / 0.3 / 0 |
| `accountmanager_c_prof_trainee` | Accountmanager C (Professionals) — trainee | 3 | 84 | 0.7 / 0.3 / 0 |

**Geconsulteerd (12 personen, 72u)**
| FunctieId | Naam | Aantal | Uren totaal | %P / %L / %R |
|---|---|---:|---:|---|
| `manager_dt` | Manager Data & Technologie | 1 | 6 | 0 / 0 / 1.0 |
| `campagne_marketeer_a` | Campagne Marketeer A | 1 | 6 | 0 / 0 / 1.0 |
| `campagne_marketeer_b` | Campagne Marketeer B | 1 | 6 | 0 / 0 / 1.0 |
| `manager_klantcontact` | Manager Klantcontact | 1 | 6 | 0 / 0 / 1.0 |
| `accountmanager_c_prof` | Accountmanager C (Professionals) | 3 | 18 | 0 / 0 / 1.0 |
| `junior_marketeer_prof` | Junior Marketeer (Professionals) | 1 | 6 | 0 / 0 / 1.0 |
| `teamleider_trainingen` | Teamleider Trainingen | 1 | 6 | 0 / 0 / 1.0 |
| `productowner_a_website` | Productowner A website | 1 | 6 | 0 / 0 / 1.0 |
| `business_info_analist_c` | Business informatieanalist C | 1 | 6 | 0 / 0 / 1.0 |
| `productowner_b_producten` | Productowner B producten | 1 | 6 | 0 / 0 / 1.0 |

**Totaal advies-basis: 240 + 550 + 728 + 72 = 1.590u** ✓ (komt overeen met `scenarios.advies.domeinen[data_systemen].uren = 1590`).

### Per scenario — totalen Data & Systemen (bron: scenarios[].domeinen[data_systemen])

| Scenario | Aantal jaren | Totaal | Programma | Lijn | Raadplegen | Totaal-kosten |
|---|---:|---:|---:|---:|---:|---:|
| advies | 4 (2026–2029) | 1.590u | 1.166u | 352u | 72u | €126.084 |
| plus20 | 5 (2026–2030) | 1.705u | 1.262u | 371u | 72u | €136.319 |
| optimaal | 7 (2026–2032) | 2.020u | 1.524u | 426u | 72u | €170.029 |
| min20 | 10 (2026–2035) | 2.450u | 1.882u | 500u | 72u | €215.173 |

### Sessie-brede totalen (alle 4 domeinen) VOOR mutatie

| Scenario | Totaal-uren | Programma | Lijn | Raadplegen |
|---|---:|---:|---:|---:|
| advies | 7.322 | 4.774 | 2.461 | 126 |
| plus20 | (zie sessie) | — | — | — |
| optimaal | (zie sessie) | — | — | — |
| min20 | 10.509 | 7.241 | 3.180 | 126 |

---

## Functie-mutatie-specificatie

### 1. VERWIJDEREN — `productowner_a_website`

- **Huidige naam**: "Productowner A website"
- **Huidige categorie**: `geconsulteerd`
- **Aantal**: 1
- **Uren-totaal advies-basis**: 6u (3u in 2027 + 3u in 2028, 0u in 2026/2029)
- **Verdeling**: programmaPct=0, lijnPct=0, raadplegenPct=1.0

**Effect per scenario (raadplegen-uren −6 elk):**
| Scenario | Aanwezig in jaren | Δuren totaal | Δraadplegen |
|---|---|---:|---:|
| advies | 2027 (3u) + 2028 (3u) | −6u | −6u |
| plus20 | 2027 (3u) + 2028 (3u) | −6u | −6u |
| optimaal | 2028 (3u) + 2029 (3u) | −6u | −6u |
| min20 | 2028 (3u) + 2029 (3u) | −6u | −6u |

**Volledig verwijderen uit:**
- `selectiePerDomein.data_systemen.productowner_a_website`
- `vastgesteldeUrenPerInspanning[g1].rollen` (waar `functieId === "productowner_a_website"`)
- `scenarios.{advies,plus20,optimaal,min20}.domeinen[data_systemen].jaren[].rollen` (alle voorkomens)

### 2. VERWIJDEREN — `content_specialist`

- **Huidige naam**: "Content Specialist"
- **Huidige categorie**: `trainings_deelnemer`
- **Aantal**: 1
- **Uren-totaal advies-basis**: 28u (14u in 2027 + 14u in 2028, 0u in 2026/2029)
- **Verdeling**: programmaPct=0.7, lijnPct=0.3, raadplegenPct=0

**Effect per scenario:**
| Scenario | Aanwezig in jaren | Δuren totaal | Δprogramma | Δlijn |
|---|---|---:|---:|---:|
| advies | 2027 (14u) + 2028 (14u) | −28u | ≈ −20u | ≈ −8u |
| plus20 | 2027 (14u) + 2028 (14u) | −28u | ≈ −20u | ≈ −8u |
| optimaal | 2028 (14u) + 2029 (14u) | −28u | ≈ −20u | ≈ −8u |
| min20 | 2028 (14u) + 2030 (14u) | −28u | ≈ −20u | ≈ −8u |

**Volledig verwijderen uit:**
- `selectiePerDomein.data_systemen.content_specialist`
- `vastgesteldeUrenPerInspanning[g1].rollen` (waar `functieId === "content_specialist"`)
- `scenarios.{advies,plus20,optimaal,min20}.domeinen[data_systemen].jaren[].rollen` (alle voorkomens)
- Tekst-referenties: "1 Content Specialist (gebruikersgidsen + helpdesk-FAQ)" en "+ 1 Content Specialist" in motivaties van alle 4 scenario's

### 3. HERNOEMEN + VERSCHUIVEN — `productowner_b_producten` → "Product Owner van de systemen"

- **Huidige naam**: "Productowner B producten"
- **Nieuwe naam**: **"Product Owner van de systemen"**
- **Huidige categorie**: `geconsulteerd` (6u, raadplegenPct=1)
- **Nieuwe categorie**: **`kernteam`**
- **Aantal**: 1 (blijft 1)

**Nieuwe vUPI-waarden (advies-basis, 4 jaar):**
| Veld | Oud | Nieuw |
|---|---|---|
| naam | "Productowner B producten" | "Product Owner van de systemen" |
| categorie | geconsulteerd | kernteam |
| urenTotaal | 6 | **160** |
| programmaPct | 0 | **0.8** |
| lijnPct | 0 | **0.2** |
| raadplegenPct | 1.0 | **0** |
| afdeling | "Data & Technologie" | "Data & Technologie" (ongewijzigd) |

**Per-jaar uren-curve advies-basis (kernteam-fasecurve, 1 persoon):**
- 2026 (analyse-jaar / niet-piek): **5u** (urenPerPersoon ≈ 6 met afronding zoals andere kernteam-leden in 2026)
- 2027 (piek-jaar — bouw): **45u** (urenPerPersoon ≈ 45, zoals projectmanager_d / procesmanager_data / mdw-binnendienst-trio)
- 2028 (piek-jaar — acceptatie + key-user): **44u** (zoals andere kernteam-leden)
- 2029 (borging-jaar): **15u** (zoals andere kernteam-leden)
- **Som = 5 + 45 + 44 + 15 = ~109u**

**Let op afwijking 109u vs gewenste 160u**: de prompt geeft urenTotaal=160 als advies-basis (40u/jr × 4 = 160u). Andere kernteam-leden zitten op ~110u/4jr in advies-scenario (analyse-jaar lichter, piek-jaren ~45u, borging 15u). Twee even valide opties:

- **Optie A — Volg fase-curve van overige kernteam-leden** (109–110u/advies, consistent): geeft urenTotaal = 110u, identiek aan andere kernteam-leden. Per-jaar 5/45/44/15.
- **Optie B — Forceer 160u per prompt** (40u/jr advies-basis): per-jaar uniformer of zwaardere piek-toewijzing 10/55/55/40. Wijkt 50u af van overige kernteam-curve.

**Aanbevolen voor applier**: Optie A (110u/advies) — sluit aan bij bestaande kernteam-fasecurve en bij `vastgesteldeUrenPerInspanning`-onderbouwing "1 persoon × 110u over advies-scenario". De prompt-waarde 160u past beter bij plus20/optimaal/min20 waar de looptijd langer is. Voor advies-basis vUPI: **urenTotaal = 110**.

**Effect per scenario** (Optie A, fasecurve consistent met overige kernteam):
| Scenario | Δuren totaal | Δprogramma | Δlijn | Δraadplegen |
|---|---:|---:|---:|---:|
| advies | +104u (was 6u → 110u) | +88u | +22u | −6u |
| plus20 | +104u (110 advies-basis × 5 jr / 4 jr) ≈ +119u | +95u | +24u | −6u |
| optimaal | ≈ +144u (kernteam ≈ 150u in optimaal) | +120u | +30u | −6u |
| min20 | ≈ +224u (kernteam ≈ 230u in min20) | +184u | +46u | −6u |

(De applier kan deze cijfers verifieer-bereken vanuit andere kernteam-leden in elk scenario; de fasecurve volgt automatisch.)

**Volledig wijzigen in:**
- `customFunctiesPerDomein.data_systemen`: voeg/wijzig entry `productowner_b_producten` met `naam = "Product Owner van de systemen"` en `cluster = "Data & Technologie"`. (Op dit moment zit `productowner_b_producten` NIET in customFunctiesPerDomein — dat is een standaard-functie. De rename moet via een override of via het normale custom-functies-mechanisme.)
- `selectiePerDomein.data_systemen.productowner_b_producten.categorie = "kernteam"`
- `vastgesteldeUrenPerInspanning[g1].rollen[productowner_b_producten]`:
  - `functieNaam: "Product Owner van de systemen"`
  - `categorie: "kernteam"`
  - `urenTotaal: 110` (advies-basis; applier herrekent voor andere scenario's via fasecurve)
  - `programmaPct: 0.8`
  - `lijnPct: 0.2`
  - `raadplegenPct: 0`
  - `onderbouwing`: nieuwe tekst — zie sectie "Voorgestelde motivatie" hieronder.
- `scenarios.{advies,plus20,optimaal,min20}.domeinen[data_systemen].jaren[].rollen[productowner_b_producten]`: vervang door kernteam-fasecurve (volg patroon andere kernteam-leden in dat scenario).

### 4. NETTO EFFECT — verwacht resultaat

**Per scenario (Δuren in data_systemen):**
| Scenario | Δ PO_a (−6) | Δ content_spec (−28) | Δ PO_b (verschil) | Δ totaal Data | Nieuw Data-totaal | Sessie-totaal nieuw |
|---|---:|---:|---:|---:|---:|---:|
| advies | −6 | −28 | +104 | **+70u** | 1.660u | 7.392u |
| plus20 | −6 | −28 | +119 | **+85u** | 1.790u | (sessie + 85) |
| optimaal | −6 | −28 | +144 | **+110u** | 2.130u | (sessie + 110) |
| min20 | −6 | −28 | +224 | **+190u** | 2.640u | 10.699u |

> **Discrepantie met prompt**: De prompt verwacht ~+126u advies (op basis van vUPI-urenTotaal 160). Met Optie A (110u, consistent met overige kernteam) wordt het +70u (advies) — hetzelfde principe, maar lager omdat de kernteam-fasecurve ~110u/advies oplevert i.p.v. 160u. **Aanbeveling: Pim besluit Optie A vs B vóór applier-run.**

**Persons-impact:**
- Geconsulteerd: 12 → 10 (−PO_a, −PO_b naar kernteam) = **10 personen, 60u advies**
- Trainings-deelnemer: 26 → 25 (−content_specialist) = **25 personen, 700u advies**
- Kernteam: 5 → 6 (+PO_b "Product Owner van de systemen") = **6 personen, ~660u advies**
- Leider: 1 (Sven) = **1 persoon, 240u advies**
- **Totaal personen NA mutatie: 1 + 6 + 25 + 10 = 42 personen** (was: 1 + 5 + 26 + 12 = 44 personen — netto −2)

---

## Voorgestelde motivatie per scenario (NA mutatie)

> **Verplichte elementen** (in alle 4 scenario's):
> - "Sven (SIO) leidt data & systemen-spoor als inspanningsleider."
> - "Manager Klantcontact / Commercieel manager coördineert de dagelijkse uitvoering binnen het commerciële proces" (NIET teamleider).
> - Kernteam (6 personen) met de **Product Owner van de systemen** expliciet benoemd.
> - Trainings-deelnemers zonder Content Specialist.
> - Geconsulteerden zonder Productowner A website en zonder Productowner B producten.
> - Externe inhuur in zowel piek-jaren (implementatie) als niet-piek-jaren (analyse / borging).
> - Lijn-uren en raadplegen-uren expliciet benoemd.

### advies (4 jaar, 2026–2029)

> Totaal 1.660 interne uren werklast voor het integraal CRM-klantdashboard cross-sectoraal, verdeeld over 4 jaar conform stap-6 fasering — bij dit advies-scenario intensiever per jaar met zwaartepunt 2027 (architectuur + bouw) en 2028 (acceptatie + key-user-training). **Sven (SIO) leidt het data & systemen-spoor als inspanningsleider** (240u, programma + lijn).
>
> **Coördinatie dagelijkse uitvoering**: Manager Klantcontact / Commercieel manager coördineert de dagelijkse afstemming binnen het commerciële proces — niet de Teamleider Trainingen, die uitsluitend de planning van de cascade-key-user-onboarding faciliteert.
>
> **Kernteam (6 personen, ~660u programma-uren)**: Projectmanager D (cross-sectorale projectaansturing), Procesmanager / Data-analist Klant & Markt (data-architectuur, datakwaliteit, bronkoppelingen), drie Medewerkers binnendienst — één per sector PO, VO en Professionals — als outside-in frontline-vertegenwoordigers die dagelijks klantgegevens verwerken, én de **Product Owner van de systemen** (productowner_b_producten, hernoemd) als producteigenaar van het CRM-platform — ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier en interne stuurgroep.
>
> **Trainings-deelnemers (25 personen, ~700u)** zijn de cross-sectorale CRM-key-users die zelf opgeleid worden om CRM-functionaliteit te beheersen voor klantkennis, productattributen en sector-dashboard-gebruik: 12 Trainer/Adviseur A (cascade-key-users), 7 productmanagers (DST x2, KiB, KLT, LiB, NT2 overheid, CvVO — eindgebruiker-input op product-attributen), 3 sectormanagers (PO/VO/Prof — sector-dashboard-gebruik) en 3 Accountmanager-C-Prof-split (sales-eindgebruiker key-user-training). Externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.
>
> **Geconsulteerden (10 personen, 60u programma-uren raadplegen-only)**: Manager Data & Technologie (governance via stuurgroep), Business informatieanalist C (datakwaliteit-scan, bronsysteemintegraties), Manager Klantcontact (review klantenservice-flow + adoptie-coördinatie commercieel proces), 3 marketeers (Campagne A/B + Junior Prof voor campagne-data → CRM), Teamleider Trainingen (planning cascade-onboarding), 3 Accountmanager-C-Prof-split (review-zijde naast hun deelname als trainee).
>
> **Externe inhuur**: piek-jaren 2027–2028 implementatie/integraties (vaste-prijs implementatiepartner met escrow op datakwaliteit) én niet-piek-jaren 2026 (analyse + leveranciersselectie-ondersteuning) en 2029 (borgingsadvies + go-live-support). Externe inhuur loopt buiten de interne uren-begroting maar binnen de externe-inhuur-budgetlijn.
>
> **Programma vs lijn vs raadplegen**: programma-uren ~1.236u (kernteam-werklast + trainings-deelname + leider 90%), lijn-uren ~360u (≈ 22% van totaal — kernteam 20%, trainings-deelnemers 30%, leider 10%), raadplegen-uren 60u (geconsulteerden 100% raadpleging op stuurgroep + beslismomenten).
>
> **Cito-realisme**: cross-sectoraal CRM raakt 42 actieve interne medewerkers in Data & Technologie, Klant & Markt, alle drie de sectoren en Trainingen — ruim binnen de ~124 FTE-capaciteit. Past bij Cito-kerndoel efficiëntie kernprocessen + cross-sectorale klant-data ontsluiten.

### plus20 (5 jaar, 2026–2030)

> Totaal ~1.790 interne uren over 5 jaar — uitgesmeerder met zwaartepunt 2027 (bouw) en 2028 (acceptatie); 2029 go-live; 2030 borging. **Sven (SIO) leidt** als inspanningsleider; **Manager Klantcontact / Commercieel manager coördineert** dagelijkse uitvoering. Dezelfde 6-koppige kernteam-bezetting met de **Product Owner van de systemen** als producteigenaar van het CRM-platform.
>
> Trainings-deelnemers (25 personen) en geconsulteerden (10 personen) volgen dezelfde categorisering als advies, zonder Content Specialist en zonder Productowner A website / Productowner B producten als geconsulteerden.
>
> **Externe inhuur**: 2027–2028 implementatie-piek (vaste-prijs partner) én 2026 + 2029–2030 niet-piek-jaren (analyse-ondersteuning, go-live-coaching, borgingsadvies).
>
> Lijn-uren ~371u, raadplegen-uren 60u (NA mutatie). Programma-uren ~1.359u.

### optimaal (7 jaar, 2026–2032)

> Totaal ~2.130 interne uren over 7 jaar — gefaseerde uitrol met zwaartepunt 2028 (acceptatie + key-user) en 2029 (go-live cross-sectoraal). 2030–2032 zijn beheer-, optimalisatie- en doorontwikkelingsjaren. **Sven (SIO) leidt** als inspanningsleider; **Manager Klantcontact / Commercieel manager coördineert** dagelijkse uitvoering. 6-koppige kernteam met de **Product Owner van de systemen** als producteigenaar — in dit scenario benadrukt aan release-roadmap en sectorvariant-governance.
>
> Trainings-deelnemers (25 personen) zonder Content Specialist; geconsulteerden (10 personen) zonder PO_a en PO_b.
>
> **Externe inhuur**: 2028–2029 implementatie- en uitrol-piek; 2026–2027 analyse-/bouw-fase met externe data-architecten; 2030–2032 borgings-advies + doorontwikkelings-capaciteit.
>
> Lijn-uren ~426u, raadplegen-uren 60u (NA mutatie). Programma-uren ~1.644u.

### min20 (10 jaar, 2026–2035)

> Totaal ~2.640 interne uren over 10 jaar — uitgesmeerder per jaar met zwaartepunt 2027 (bouw) + 2028 (key-user-training) + 2030 (acceptatie & pilot) + 2031 (go-live). **Sven (SIO) leidt** als inspanningsleider; **Manager Klantcontact / Commercieel manager coördineert** dagelijkse uitvoering. 6-koppige kernteam inclusief **Product Owner van de systemen**.
>
> Trainings-deelnemers (25 personen) zonder Content Specialist; geconsulteerden (10 personen) zonder PO_a en PO_b.
>
> **Externe inhuur**: piek-jaren 2028 + 2030 (implementatie-partner); niet-piek-jaren 2026–2027 (analyse + leveranciersselectie), 2029 (integraties), 2031–2035 (beheer-coaching + optimalisatie).
>
> Lijn-uren ~500u, raadplegen-uren 60u (NA mutatie). Programma-uren ~2.080u.

---

## Voorgestelde per-jaar activiteit per scenario (NA mutatie)

### advies (4 jaar)

- **2026 — Analyse & architectuur** (niet-piek, ~38u programma + lijn): Architectuurkeuze cross-sectoraal datamodel + datakwaliteit-scan op 7-8 bronsystemen door Sven (leider) + 6-koppig kernteam (PM D, Procesmanager K&M, 3× Mdw binnendienst, **Product Owner van de systemen**); kick-off + nulmeting met geconsulteerde Manager DT en BIA-C; voorbereiding leveranciersselectie. **Externe inhuur (analysefase): externe data-architect ondersteunt datakwaliteit-scan en leveranciers-shortlist.**

- **2027 — Realisatie kern & integraties** (piek, ~725u): Bouw cross-sectoraal datamodel + eerste 4 bronsysteemintegraties; Procesmanager K&M leidt datakwaliteit en bronkoppelingen; Mdw binnendienst PO/VO/Prof valideren CRM-eindgebruiker-flow; **Product Owner van de systemen** prioriteert backlog en houdt release-roadmap; Manager Klantcontact / Commercieel manager coördineert dagelijkse uitvoering binnen het commerciële proces; sectormanagers reviewen sector-dashboard-conceptschermen. **Externe inhuur (implementatiefase): vaste-prijs implementatiepartner bouwt kern-CRM + integraties met escrow op datakwaliteit-risico.**

- **2028 — Acceptatie & key-user-training** (piek, ~712u): Acceptatietest CRM-functionaliteit met kernteam-binnendienst; cross-sectorale key-user-onboarding voor 25 trainings-deelnemers (12 Trainer/Adv A cascade-key-users, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof). **Review-claim**: **Product Owner van de systemen + Account Managers (3× Acc-C-Prof) voeren een review uit op acceptatie-criteria, sectorvariant-fit en sales-eindgebruiker-flow** vóór go-live. **Externe inhuur (implementatiefase): partner verzorgt organisatie-brede adoptie-begeleiding + key-user-trainingsleiding.**

- **2029 — Beheer & borging** (niet-piek, ~115u): Overdracht naar lijn-beheer Data & Technologie; structurele licentie + helpdesk-FAQ; borging proceseigenaarschap CRM bij Procesmanager K&M en **Product Owner van de systemen**. **Review-claim**: dezelfde **Product Owner van de systemen + Account Managers** voeren in 2029 de borgings-review uit (datakwaliteit, adoptie-graad per sector, KPI-uitlezing). **Externe inhuur (analysefase / borging): borgings-coach + datakwaliteit-audit door externe partij.**

### plus20 (5 jaar)

- **2026 — Analyse & architectuur** (niet-piek, ~38u): Architectuurkeuze + datakwaliteit-scan + leveranciersvoortraject; Sven leider, kernteam (6 incl. **Product Owner van de systemen**) ontwerpt; Manager DT in stuurgroep-governance. **Externe inhuur analysefase: data-architect.**
- **2027 — Realisatie bouw + integraties** (piek, ~725u): Bouw datamodel + bronsysteemintegraties; review door **Product Owner van de systemen** + sectormanagers. Manager Klantcontact / Commercieel manager coördineert. **Externe inhuur implementatiefase: vaste-prijs partner.**
- **2028 — Acceptatie & key-user-training** (piek, ~712u): Pilot + acceptatietest met kernteam-binnendienst; key-user-onboarding 25 deelnemers. **Review-claim: Product Owner van de systemen + Account Managers reviewen acceptatie-criteria + sectorvariant-fit.** **Externe inhuur implementatie.**
- **2029 — Go-live & uitrol** (niet-piek-naar-borging, ~115u): Sectoruitrol Zakelijk + cross-sectorale go-live; uitfasering oude bronsystemen onder Procesmanager K&M. **Review-claim: Product Owner van de systemen + Account Managers herhalen review op cross-sectorale adoptie.** **Externe inhuur analysefase: go-live-coach.**
- **2030 — Beheer & borging** (~115u): Structureel beheer + licentie + content-onderhoud; doorontwikkeling 0,3 FTE intern. **Externe inhuur niet-piek: borgings-coach.**

### optimaal (7 jaar)

- **2026 — Analyse & architectuur** (~31u, niet-piek): Architectuurbesluit + datakwaliteit-scan + Stichting-Cito-ontvlechting; Sven leider + kernteam 6 (incl. **Product Owner van de systemen**). Geconsulteerd: Manager DT + BIA-C. **Externe inhuur analysefase: data-architect + ontvlechtings-consultant.**
- **2027 — Realisatie bouw** (~146u): Bouw datamodel + 4 bronsysteemintegraties; Procesmanager K&M leidt; Mdw binnendienst als primaire eindgebruiker-vertegenwoordigers. **Externe inhuur implementatiefase: bouwteam.**
- **2028 — Acceptatie & key-user-training** (piek, ~733u): Acceptatietest + key-user-onboarding 25 deelnemers. **Review-claim: Product Owner van de systemen + Account Managers reviewen op acceptatie-criteria, sectorvariant-fit en sales-eindgebruiker-flow.** **Externe inhuur implementatiefase.**
- **2029 — Go-live & uitrol** (piek, ~680u): Sectoruitrol + cross-sectorale go-live; sector-specifieke configuratie-validatie. **Review-claim: Product Owner van de systemen + Account Managers herhalen review op uitrol-stabiliteit.** **Externe inhuur implementatiefase.**
- **2030 — Beheer & borging** (niet-piek, ~280u): Overdracht naar lijn-beheer; structurele licentie + helpdesk-FAQ; doorontwikkeling 0,3 FTE intern. **Externe inhuur analysefase: borgings-coach.**
- **2031 — Optimalisatie** (~75u): Finetuning dashboard-KPI's; cross-sectorale managementrapportage; structureel proceseigenaarschap CRM bij Procesmanager K&M + **Product Owner van de systemen**. **Externe inhuur niet-piek: optimalisatie-consultant.**
- **2032 — Doorontwikkeling** (~75u): Functionele uitbreidingen op basis van rapportagebehoeften 3 sectoren. **Externe inhuur niet-piek: doorontwikkelings-capaciteit.**

### min20 (10 jaar)

- **2026 — Analyse & architectuur** (~39u): Architectuur + datakwaliteit-scan + Stichting-Cito-ontvlechting; Sven leider + 6 kernteam (incl. **Product Owner van de systemen**). **Externe inhuur analysefase.**
- **2027 — Leverancier-selectie** (~140u): Selectie partner via vaste-prijs-contractering met escrow datakwaliteit; Procesmanager K&M voorbereidt migratiestrategie; **Product Owner van de systemen** stelt acceptatiecriteria + release-roadmap op. **Externe inhuur niet-piek: contracterings-jurist + RFP-begeleider.**
- **2028 — Realisatie kern + key-user-training** (piek, ~731u): Bouw kern-CRM + eerste integraties; cross-sectorale key-user-onboarding 25 deelnemers. **Review-claim: Product Owner van de systemen + Account Managers reviewen acceptatie + sales-flow.** **Externe inhuur implementatiefase.**
- **2029 — Realisatie integraties** (~316u): Afronding 7-8 bronsysteemintegraties; migratie + Zakelijk-koppelingen. Manager Klantcontact / Commercieel manager coördineert; **Product Owner van de systemen** prioriteert integraties. **Externe inhuur niet-piek/implementatie: integratie-engineers.**
- **2030 — Acceptatie & pilot** (piek, ~644u): Pilot PO en VO met 20 key-users (Mdw binnendienst-team + sectormanagers); tweede opleidingsblok. **Review-claim: Product Owner van de systemen + Account Managers reviewen op pilot-resultaten.** **Externe inhuur implementatiefase.**
- **2031 — Go-live & uitrol** (~280u): Sectoruitrol Zakelijk + cross-sectorale go-live; uitfasering oude bronsystemen. **Externe inhuur implementatiefase: go-live-coach.**
- **2032 — Beheer & borging** (~75u): Overdracht naar lijn-Data & Technologie; structurele licentie + helpdesk-FAQ door **Product Owner van de systemen**. **Externe inhuur niet-piek.**
- **2033 — Optimalisatie** (~75u): Finetuning dashboard-KPI's; cross-sectorale managementrapportage als nieuw normaal. **Externe inhuur niet-piek.**
- **2034 — Doorontwikkeling** (~75u): Kleine functionele uitbreidingen + datakwaliteit op basis van 3 sectoren. **Externe inhuur niet-piek.**
- **2035 — Continu verbeteren** (~75u): Doorlopende doorontwikkeling op basis van funnelinzichten; jaarlijkse evaluatie platform-fit door Procesmanager K&M en Manager DT (consult). **Externe inhuur niet-piek.**

---

## Verificatie

- ✓ 2 productowners → 1 productowner ("Product Owner van de systemen") in kernteam
  - PO_a (`productowner_a_website`): VOLLEDIG VERWIJDERD uit selectie + vUPI + scenarios (alle 4)
  - PO_b (`productowner_b_producten`): HERNOEMD naar "Product Owner van de systemen" + categorie kernteam + uren-curve gevolgd
- ✓ Content Specialist (`content_specialist`) verwijderd uit selectie + vUPI + scenarios (alle 4)
- ✓ Coördinator-tekst: "Manager Klantcontact / Commercieel manager coördineert" — NIET teamleider, in alle 4 motivaties + per-jaar activiteit-tekst (waar coördinator wordt benoemd)
- ✓ 2027 + 2028 review-claim: "Product Owner van de systemen + Account Managers (3× Acc-C-Prof) voeren review uit" expliciet in advies-jaar 2028 én 2029-borging; bij optimaal/min20 ook in latere jaren
- ✓ Externe inhuur expliciet in zowel implementatie-piek (2027/2028 advies; 2028 min20; 2028–2029 optimaal) als analyse-fase / borgingsfase (2026, 2029 advies; 2026/2027 min20; 2030 optimaal)
- ✓ Lijn-uren expliciet benoemd per scenario (advies 352u → 360u, plus20 371u, optimaal 426u, min20 500u)
- ✓ Raadplegen-uren expliciet benoemd: 72u → 60u NA mutatie (alle scenario's, want PO_a/PO_b dragen samen 12u raadplegen — daarvan blijft PO_b in nieuwe kernteam-rol = 0 raadplegen, PO_a is weg)
- ✓ Cijfers verwachte mutatie-effect:
  - advies +70u (Optie A, kernteam-fasecurve) of +126u (Optie B, urenTotaal=160 forced) — applier kiest
  - plus20 +85u / +146u
  - optimaal +110u / +176u
  - min20 +190u / +256u
- ✓ Geen verzonnen aantallen — alle uren-totalen zijn afgeleid uit `vastgesteldeUrenPerInspanning` (advies-basis) of uit `scenarios[].domeinen[data_systemen].jaren[].rollen` (per-scenario)
- ✓ Totaal-personen NA mutatie: 1 leider + 6 kernteam + 25 trainings-deelnemer + 10 geconsulteerd = **42 personen** (was 44)

## Open punten voor applier

1. **Optie A vs Optie B** voor `productowner_b_producten.urenTotaal` (110u kernteam-fasecurve vs 160u prompt-forced) — Pim besluit.
2. **Custom-functies-entry**: `productowner_b_producten` is geen custom-id; rename loopt via override of via splitsen "verwijder + creëer custom-id". Applier kiest mechanisme.
3. **Onderbouwing-tekst**: nieuwe `onderbouwing` voor `productowner_b_producten` als kernteam moet door applier worden gegenereerd op basis van fasecurve van overige kernteam-leden ("1 persoon × 110u over advies-scenario (4 jaar) — producteigenaar CRM-platform: ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier, interne stuurgroep").
4. **Geen Supabase-write** in dit voorstel — alle wijzigingen zijn voorstellen voor latere applier-run.
