# Review — Stap 8 (BerekeningenStep) op begrijpelijkheid voor een leek

**Doelgroep:** stuurgroep-lid bij Cito zonder voorkennis van DIN-methodiek, projectmanagement-jargon of programmeerachtergrond.
**Bestand beoordeeld:** `c:\Users\pdebu\Projects VS code\DIN\src\components\steps\BerekeningenStep.tsx` (2091 regels).

---

## Samenvatting

**Begrijpelijkheid voor een leek: 4 / 10.**

De pagina is technisch sterk en intern consistent voor iemand die de methodiek kent, maar voor een leek is hij op cruciale plekken ondoordringbaar. Het onderbouwingsapparaat per component is uitstekend — formule, tarief, aantal staan keurig naast elkaar. Maar de overkoepelende structuur, de jargon-dichtheid in koppen en bullets, en de monospace code-blokken in Sectie 0 dwingen de lezer telkens om een mentale vertaalslag te maken. Een stuurgroep-lid kan de eindbedragen lezen, maar zal moeite hebben uit te leggen *waarom* het bedrag zo is opgebouwd.

**Top 3 grootste obstakels:**

1. **Sectie 0 met monospace `<pre>`-blokken (regels 986–1029, 1068–1088) leest als terminal-output**, niet als bestuurlijke tekst — een leek slaat dit deel over.
2. **Onverklaard jargon op zichtbare plekken**: "cap", "benutting", "lifecycle-curve", "water-fill", "U-curve / S-curve", "PRINCE2 / BiSL", "FASE_CHAINS", "tail", "loaded cost", "drift" — geen van deze termen krijgt een eerste-keer-uitleg in een tooltip of legenda.
3. **Codebase-leakage in user-facing tekst**: regelnummers 1013, 1764, 1782, 1898, 1992–1994 verwijzen naar `FASE_CHAINS`, `scripts/rebalance-verdeling.ts`, `scripts/normalize-fases.ts`, `verdelingPerJaar`, `totalenPerJaar (scenario-veld)`, `Σ verdelingPerJaar`, `(uit Supabase)`. Dat zijn variabelen- en bestandsnamen, geen Nederlands.

---

## Per-aspect bevindingen

### 1. Jargon zonder uitleg

Een leek struikelt direct over termen die in koppen of body verschijnen zonder eerste-keer-uitleg. Inventarisatie:

| Term | Eerste plek | Wel uitgelegd? |
|---|---|---|
| **"cap"** | regel 669 (`cap {formatEurK(s?.jaarlijksBudgetEuro ?? 0)}/jr`), regel 702, 787, 1045 | Nee. De woordenboek-vertaling staat nergens. Een leek raadt "limiet" maar weet niet waarvoor. |
| **"benutting"** | regel 1524 (`Stat label="Benutting"`) | Nee — alleen `${formatEur(totaalScenario)} / ${formatEur(theoMax)}` als sub-tekst. Geen woord over wat het betekent of of <100% goed of slecht is. |
| **"lifecycle-curve"** | regel 591 (header), 1010, 1830, 1939 | Marginaal — Sectie C noemt "U-curve voor IT, S-curve voor training" maar legt niet uit wat een "curve" is. |
| **"water-fill"** | regel 1047, 1991 | Nee — staat als jargon in een uitleg-bullet. |
| **"S-curve / U-curve / Brede heuvel / Vroege piek"** | regels 79–84 (CURVE_LABEL, getoond in regel 1957) | Heel beperkt. "U-curve — piek in realisatie + acceptatie/uitrol (PRINCE2/BiSL)" stapelt drie onbekende termen. |
| **"PRINCE2 / PMI / BiSL"** | regels 80, 271, 342 | Nee. Deze methodieken-acroniemen verschijnen in de body alsof ze algemeen bekend zijn. |
| **"FASE_CHAINS"** | regel 1013 — `Curves uit <code>FASE_CHAINS</code>` | Nee. Een leek leest dit als "een variabele in code". |
| **"scope-keuze" / "tempo-keuze"** | regel 1182 (`De scenario-keuze is dus een tempo-keuze, geen scope-keuze`) | "Scope" is goed Engels-jargon, maar "tempo-keuze" is een neologisme dat niet eerder in de pagina valt. |
| **"tail"** | regels 82, 137, 505, 1164, 1172 (`langere borgingstail`, `borgingstail`) | Nee — leek leest "staart" en raadt. |
| **"PM-buffer / risico-buffer"** | regels 220, 266–272, 1146 | Voor risico-buffer is er een korte uitleg ("Max−Mid is wat de risico-buffer onvoorzien moet dekken", regel 1146). PM-buffer wordt enkel "industry standard" genoemd, niet uitgelegd. |
| **"ceiling"** | regel 219 (`(incl. PM-buffer + ceiling)`) | Nee — Engels woord midden in NL-tekst. |
| **"loaded cost"** | regels 293, 435 (`Interne FTE-kosten Cito ~€ 100.000/jaar (loaded cost)`) | Nee — Engels HR-jargon. |
| **"tabular-nums"** | regels 1641, 1670, 1925, 1968 (CSS-classnaam) | Niet zichtbaar voor de gebruiker, maar in screenshots / printbare versie kan het in `class=` lekken. Geen issue voor een gebruiker. |
| **"ETL"** | regel 230 (`ETL + datacleaning + koppelingen`) | Nee — IT-acroniem. |
| **"schaduwbegeleiding / key-user-traject / go-live"** | regels 239, 242 | Nee — projectjargon. |
| **"dossier-mid"** | regels 1050, 1789 (`opgehoogd t.o.v. dossier-mid`) | Nee — "dossier" + "mid" wordt nergens als concept geïntroduceerd. |
| **"intervisiekring"** | regel 419, 425 | Nee — HR/training-vakjargon. |
| **"borging / verankering"** | regels 117, 137, 502, 1051 (`borgingslast in HR-cyclus`) | Nee — abstractie zonder anker. |
| **"datacleaning"** | regel 230 | Engels woord, maar uit context wel raadbaar. |
| **"drift"** | regel 1733 (variabele `driftScenario`) — wordt niet zichtbaar getoond als woord, maar in regel 1789 zie je wel de gevolgen ("opgehoogd t.o.v. dossier-mid"). | n.v.t. (alleen intern) |

**Aanbeveling:** introduceer een "Begrippenlijst" als uitklapbaar blokje bovenin de pagina, of vervang termen ter plekke (cap → "jaarbudget-plafond", benutting → "% van het maximum dat wordt uitgegeven", tail → "naloop-jaren", loaded cost → "interne kosten incl. werkgeverslasten").

---

### 2. Sprongen in logica

- **Σ-symbool wordt nergens uitgelegd.** Regel 749 `"Σ inspanning-totalen = scenario-totaal"`, regel 1001 `Σ scenario-totaal (theoretisch)`, regel 1334 `Σ structureel`. Voor wie geen wiskunde-achtergrond heeft, is dit een hiërogliefen-achtige notatie. Er wordt nergens "Σ = som van" geschreven.
- **"Eenmalig (mid)" in tabelkop Sectie B (regel 1564)** vooronderstelt dat de lezer al weet wat "mid" is. De `MinMidMaxToelichting` (regel 1103) zit in Sectie 0 die uitklapbaar is — wie hem niet opent, ziet "Eenmalig (mid)" zonder context.
- **Sectie 0 heet "vanaf nul" (regel 939)**, maar de eerste regel binnen het blok (regel 956 — *"Stap 1 — Dossier-input · component-derivation per inspanning"*) gebruikt al meteen "dossier-input" en "component-derivation" als feiten. Wat is een dossier? Waar komt het vandaan? De stuurgroep heeft geen dossier voor zich.
- **"min/mid/max" inconsistentie:** in `MinMidMaxToelichting` heten ze `Min` / `Mid` / `Max` (regel 1115). Maar elders staat "middenwaarde" (regel 1796), "middenpunt" (regel 1135, 1363), en in de tabel "Eenmalig (mid)" (regel 1564). Vier varianten van hetzelfde begrip.
- **Sectie A (regel 1517) toont `Benutting` als percentage zonder normwaarde.** Een lezer ziet "82%" en weet niet of 82% goed is. Bij `>1.001` wordt `highlight={benutting > 1.001}` aan (regel 1527) maar *dat 100% een grens is* wordt nergens uitgelegd.
- **Sectie C (kolomkop in regel 1898) toont *"totalenPerJaar (scenario-veld)"* als label.** Dat is een veldnaam uit de TypeScript-types, niet Nederlands. De rij erboven heet "Σ uit inspanningen" (regel 1884). De stuurgroep ziet dus twee rijen die hetzelfde zeggen en weet niet welke geldt.
- **"Fase" wordt getoond per cel (regel 1980)** maar nergens uitgelegd. Voorbeeld: een leek ziet "2027 — Realisatie + acceptatie" en moet zelf raden dat dit een lifecycle-fase-naam is.
- **Bedrag-berekening "klopt"** op vier plekken: groene "✓ klopt" badge (regel 797), groene check Sectie D (regel 2024), match-vinkjes per rij in Sectie B (regel 1648), en `Σ verd. ✓` per rij (regel 1638). Nergens staat *waar* deze checks naar kijken — een leek vertrouwt het of niet, maar kan niet evalueren waarom.

**Aanbeveling:** introduceer Σ ter plekke als "Σ (totaal)", verleg de toelichting `Min/Mid/Max` naar boven Sectie A (ervóór, niet erin), en vervang "totalenPerJaar (scenario-veld)" door "Officiële jaartotalen (zoals opgeslagen)" of laat de regel weg.

---

### 3. Volgorde / pagina-architectuur

De huidige volgorde:

1. Header (regel 582)
2. Scenario-picker met snel-navigatie (regel 630)
3. Per scenario uitklapbare kaart, daarbinnen:
   - Sectie 0 — "Volledige berekening — vanaf nul" (uitklapbaar in een uitklapbare kaart, dus dubbele drempel)
   - Sectie A — Scenario-input
   - Sectie B — Berekening per inspanning
   - Sectie B+ — Scenario-totaal (bottom-up samenvatting)
   - Sectie C — Berekening per jaar
   - Sectie D — Som-controle

**Problemen:**

- **Sectie 0 staat eerst, maar is uitklapbaar (regel 936 `<details>`).** Standaard dicht. Een leek ziet eerst Sectie A met cijfers, weet niet wat "cap" is, en mist daardoor de verklarende `MinMidMaxToelichting` die *binnen* Sectie 0 zit (regel 947). Sectie 0 zou ofwel default open moeten zijn, ofwel de `MinMidMaxToelichting` zou erbuiten moeten staan.
- **Sectie B+ "bottom-up samenvatting" (regel 1738) komt ná Sectie B (detail-tabel).** Maar een "samenvatting" hoort bij voorkeur vóór de details. De huidige volgorde is "details eerst, samenvatting daarna". Een leek heeft de samenvatting al doorgenomen tegen de tijd dat hij hem leest.
- **Sectie 0 binnen een uitklapbare scenario-kaart** = **dubbele klik-drempel**: eerst de scenario-kaart open, dan Sectie 0 open, dan de individuele inspanning-derivations open. De diepste laag bevat de meest verhelderende cijfers (uur-tarieven), maar zit drie kliks diep.
- **Snel-nav (regel 644 `Snel-navigatie`) toont totalen in K-formaat ("1490K"), banner toont in M-formaat ("€ 1.49M")** (regel 785). Dezelfde waarde, twee notaties op één scherm.

**Aanbeveling:**
- Sectie 0 default open zetten of de `MinMidMaxToelichting` *boven* de scenario-keuze plaatsen als algemene context.
- Sectie B+ vóór Sectie B plaatsen (samenvatting → detail).
- K en M consistent maken: kies één.
- Overweeg: vouw alleen **één** scenario-kaart open per keer (radio-gedrag, dat doet `setOpenScenario` al), maar maak Sectie 0 binnen die kaart default open zodat de helderste uitleg eerst leesbaar is.

---

### 4. Verwarrende terminologie / inconsistenties

| Term/synoniem-paar | Plek | Probleem |
|---|---|---|
| `scenario-totaal` vs `totaalGeraamdEuro` vs `Σ scenariototaal` vs `werkelijk scenario-totaal` vs `Σ Scenario-totaal (bottom-up)` | regels 666, 749, 1001, 1772, 1781 | Vijf varianten, drie ervan verschijnen tegelijk in Sectie B+. Een leek vraagt: zijn dit dezelfde getallen? |
| `berekend` vs `werkelijk` vs `officieel` vs `uit Supabase` | regels 877–888, 1090, 1781, 1898 | Vier woorden voor "wat in het systeem staat". `werkelijk` en `uit Supabase` betekenen hetzelfde maar suggereren verschillende dingen. |
| `Cap` (regel 669, 1520) | nergens gedefinieerd | Een leek raadt "limiet/plafond". Maar `cap × jaren = theoretisch max` (regel 1522) bouwt dan op een ongedefinieerd fundament. |
| `drift / schuiven / opgehoogd` | regels 1003, 1789, 1797 (`scenario heeft geschoven`, `opgehoogd t.o.v. dossier-mid`) | Drie metaforen voor hetzelfde mechanisme. |
| `tempo-keuze` vs `scope-keuze` | regel 1182 | "Tempo" en "scope" worden tegenover elkaar gezet zonder dat scope is geïntroduceerd. |
| `1490K` vs `€ 1.49M` | regels 666 vs 785 | Notatie-mismatch tussen snel-nav en banner. |
| `eenmalig (mid)` (regel 1564) vs `middenwaarde` (regel 1796) vs `middenpunt eenmalig` (regel 1363) | drie plekken | Drie woorden voor één concept. |
| `+ Structureel × {aantalJaren} jr` (regel 1565) | tabelkop | Multipliceren-symbool gemengd met afkorting `jr`. Voor een leek minder leesbaar dan "structurele kosten over X jaar". |

**Aanbeveling:** kies één canonieke term per concept en gebruik die overal:
- "scenario-totaal" → altijd "Totaal voor dit scenario";
- "berekend / werkelijk / officieel / uit Supabase" → "berekend op basis van componenten" vs. "werkelijk vastgelegd in deze begroting";
- "cap" → "jaarbudget-plafond";
- "mid / middenpunt / middenwaarde" → één keuze, bv "middelste schatting".

---

### 5. Verwijzingen naar interne / technische files

- Regel 1013: `Curves uit <code>FASE_CHAINS</code> per domein × {aantalJaren} jaar.` — `FASE_CHAINS` is een TypeScript-constante. Een stuurgroep-lid kan die niet opzoeken.
- Regels 1992–1994: `Bron-curves staan in <code>scripts/rebalance-verdeling.ts</code>; fase-namen in <code>scripts/normalize-fases.ts</code>.` — twee bestandspaden in een stuurgroep-document. Niet bruikbaar voor de doelgroep, en suggereert "ik moet kunnen programmeren om dit te begrijpen".
- Regel 1090: `Bovenstaande cijfers komen uit Supabase (scenario.inspanningen[].verdelingPerJaar)`. — Supabase + JS-pad als kennisgeving. De stuurgroep weet niet wat Supabase is.
- Regel 1898: `totalenPerJaar (scenario-veld)` — een database-kolom-naam.

**Aanbeveling:** verwijder deze verwijzingen óf verplaats ze naar een `<details>` met de tekst "Voor ontwikkelaars: bron-bestanden". De inhoud van die scripts moet voor de stuurgroep-tekst worden vertaald naar uitleg, niet als file-pad.

---

### 6. Sectie D — som-controle

De vier check-labels (regels 749, 754, 759, 764):

1. `"Σ inspanning-totalen = scenario-totaal"` — gemengd: Σ-symbool + technisch jargon. Beter: **"De som van alle inspanningen klopt met het scenario-totaal"**.
2. `"Σ jaartotalen = scenario-totaal"` — idem. Beter: **"De jaartotalen tellen op tot het scenario-totaal"**.
3. `"Geen jaar boven cap (€/jaar)"` — *cap* niet uitgelegd. Beter: **"Geen jaar overschrijdt het jaarbudget-plafond"**.
4. `"Σ verdelingPerJaar (per inspanning) = inspanning-totaal"` — **dit is letterlijk de variabelennaam** uit de code (regel 716). Een leek leest hier `verdelingPerJaar` als een woord. Beter: **"Per inspanning klopt de jaarverdeling met het inspanning-totaal"**.

De toelichting per check (`uitleg`-veld, regels 751, 756, 761, 769) is in goed Nederlands geschreven en leest beter. Dus het probleem zit specifiek in de vier korte labels.

**Aanbeveling:** herschrijf de labels in volzinnen en haal de Σ + variabelennamen weg.

---

### 7. MinMidMaxToelichting blok

Het blok zelf (regels 1103–1188) is grotendeels goed: er staat letterlijk *"de uur-tarieven liggen vast (markt-conform), maar het exacte aantal uren of gebruikers kan binnen een aannemelijke range vallen"* (regel 1120-1122) — dat is de ene goede pedagogische zin van de pagina.

Maar:

- **Hij zit *binnen* Sectie 0 (regel 947)**, dus default verborgen. Een leek die de scenario-kaart opent maar Sectie 0 dicht laat, mist deze verklaring volledig en gaat met "Eenmalig (mid)" zonder context Sectie B in.
- **De vier scenario-bullets (regels 1162–1178) gaan ervan uit dat de lezer al weet welk scenario hij heeft gekozen.** Voor "Snelste scenario (4 jaar) — eenmalig Mid + 4 × structureel/jaar; kortste tail dus laagste cumulatief, maar hoogste piek per jaar in 2027–2028" stapelt opnieuw drie onbekende begrippen ("Mid", "tail", "cumulatief vs piek").
- **De zin "De scenario-keuze is dus een *tempo-keuze*, geen *scope-keuze*"** (regel 1181-1182) introduceert een tegenstelling die nergens eerder is opgebouwd. "Scope" is ook niet uitgelegd.

**Aanbeveling:**
- Verplaats het blok naar **boven** de scenario-picker (vóór regel 553). Dan is het de eerste toelichting die elke lezer ziet.
- Vereenvoudig de scenario-bullets: vermijd "tail" en "cumulatief" in deze samenvatting.

---

### 8. Stap 4 "Aanpassingen"

Regels 1032–1061 bevatten vier sub-bullets (A t/m D):

- **A. "{startJaar} Cito-eis"** (regel 1037-1043): legt uit dat het startjaar het Cito-norm-budget moet matchen. Een leek begrijpt "moet exact passen binnen het Cito-norm-budget" wel intuïtief, maar **"proportioneel opgehoogd; overschot wordt getrokken uit latere jaren met capaciteit"** is twee mechanismen in één zin zonder voorbeeld.
- **B. "Cap-respect"** (regel 1045-1048): introduceert "water-fill" als technische term zonder uitleg. *"Bij overschrijding herverdeelt water-fill het overschot proportioneel naar lichtere jaren"* — drie zelfstandige termen die elk uitleg vragen.
- **C. "Cultuur-ophoging"** (regel 1050-1054): *"dossier-mid-totaal voor cultuur is bewust opgehoogd naar realistisch verankeringsniveau (€100K–€130K afhankelijk van scenario) omdat borgingslast in HR-cyclus een meerjarige tail vraagt"*. Vier vakbegrippen ("dossier-mid", "verankering", "borging", "tail") in 35 woorden.
- **D. "Inspanning-totaal blijft leidend"** (regel 1056-1058): nuchter en goed.

**Snapt een leek waarom deze 4 aanpassingen nodig zijn?** Nee:
- Het is niet duidelijk dat A en B beide *constraint-bewerkingen* zijn (binnen budget passen) versus C (een *inhoudelijke ophoging*). Dat onderscheid is voor de stuurgroep cruciaal: A en B zijn neutraal, C is een keuze die gemaakt is.
- Zonder een mini-voorbeeld ("voor inspanning X was theoretisch €120K in 2026, na aanpassing €150K, omdat ...") blijft het abstract.

**Aanbeveling:** splits visueel A+B (rekenkundig) en C (keuze). Vervang "water-fill" door "uitsmeren over jaren met ruimte". Geef per aanpassing een voor/na-getal van een concrete inspanning als voorbeeld.

---

### 9. Structuur van Sectie 0 stap-output (pre-blokken)

Regels 986–1004, 1016–1029, 1068–1088 zijn `<pre>`-blokken in monospace-font met `padEnd / padStart`-uitlijning. Voorbeeld (regels 987–1003):

```
CRM-platform                 € 565.000 mid + 7 × € 92.500 = € 1.212.500
Uniforme klantbenadering     € 62.500 mid + 7 × € 12.500 =   € 150.000
...
────────────────────────────────────────────────────────────────────────
Σ scenario-totaal (theoretisch):    € 1.640.000
Werkelijk scenario-totaal:          € 1.490.000
Δ verschil:                          €-150.000  (scenario heeft geschoven; zie Stap 4)
```

**Werkt dit voor een leek?** Twijfelachtig:
- **Voordeel:** het lijkt op een spreadsheet — elk getal staat onder elkaar uitgelijnd.
- **Nadeel:** monospace-font + ASCII-streepje + Σ + Δ = "code-achtige" lay-out die voor een niet-technisch publiek associeert met "dit is niet voor mij". Stuurgroep-leden zijn gewend aan PowerPoint-tabellen, geen terminal-output.
- **Specifiek probleem:** het Δ-symbool (regel 1003) wordt nergens uitgelegd. "Δ verschil" = "verschil verschil" voor wie het symbool niet kent.

**Aanbeveling:** vervang `<pre>`-blokken door een echte HTML-tabel (zelfs een simpele `<table>` met `text-right` doet wat `padStart` doet, maar leest als tabel, niet als console-output). Vervang Σ/Δ door "Totaal" / "Verschil".

---

### 10. Lifecycle-toelichting Sectie C

De curve-labels (regels 79–84):

- `data_systemen: "U-curve — piek in realisatie + acceptatie/uitrol (PRINCE2/BiSL)"`
- `mens: "S-curve — opbouw via basistraining, piek in vaardigheidstraining + toepassing, tail voor borging"`
- `cultuur: "Brede heuvel — geleidelijke opbouw, lange tail voor verankering in HR-cyclus"`
- `processen: "Vroege piek — herontwerp + pilot + uitrol vroeg, daarna continu verbeteren"`

Per label ~3-5 jargon-termen:
- **U-curve** zonder grafiek of analogie (een leek ziet de letter U niet vanzelf in een lijstje getallen).
- **PRINCE2/BiSL** als methodieken-bron, niet uitgelegd.
- **S-curve** opnieuw zonder visualisatie.
- **"tail voor borging"** stapelt twee onbekende termen.
- **"Brede heuvel"** — leesbaarder, maar opnieuw zonder mini-grafiekje.

In Sectie C wordt de curve weer per inspanning getoond (regels 1957) maar in tekstvorm: "(curve 22%)" naast het bedrag (regel 1977). Een leek vraagt: 22% waarvan?

**Aanbeveling:** vervang de tekst-labels door een mini-sparkline (4 of 5 staafjes naast elkaar) per domein. Een visuele curve maakt de "U" en "S" letterlijk zichtbaar. Verwijder PRINCE2/BiSL uit de body — verplaats naar een uitklapbare "Methodische verantwoording".

---

## Top-10 prioriteit-lijst (impact op begrijpelijkheid: hoog → laag)

| # | Regelnummer | Probleem (1 zin) | Voorgestelde fix |
|---|---|---|---|
| 1 | 1090, 1898, 1992–1994 | Verwijzingen naar Supabase, `verdelingPerJaar`, `FASE_CHAINS`, scriptpaden lekken in user-facing tekst. | Verwijder of verplaats naar `<details>` "Technische verantwoording (voor ontwikkelaars)". Vervang `totalenPerJaar (scenario-veld)` door "Officiële jaartotalen". |
| 2 | 936–944 | Sectie 0 "Volledige berekening — vanaf nul" is uitklapbaar (`<details>`, default dicht) — daardoor mist een leek de cruciale `MinMidMaxToelichting` die erin zit. | Zet Sectie 0 default `open`. **Of**: verplaats `MinMidMaxToelichting` (regels 1103–1188) naar boven de scenario-picker (vóór regel 553), zodat hij altijd zichtbaar is. |
| 3 | 749, 754, 759, 764 | Sectie D-checks gebruiken Σ + variabelennamen (`Σ verdelingPerJaar`). | Herschrijf naar volzinnen: "De som van alle inspanningen klopt met het scenario-totaal" / "Geen jaar overschrijdt het jaarbudget-plafond" / "Per inspanning klopt de jaarverdeling met het inspanning-totaal". |
| 4 | 669, 702, 787, 1045, 1520 | Term "cap" wordt zes keer gebruikt zonder definitie. | Vervang overal door "jaarbudget-plafond" (of in tabellen "max/jr"). Voeg in de header eenmalig toe: "Cap = het maximale bedrag dat per jaar uitgegeven mag worden." |
| 5 | 1524 | "Benutting" als percentage zonder context — een leek weet niet of 82% goed of slecht is. | Verander label naar "% van plafond benut" en voeg sub-tekst toe: "100% = jaarbudget vol; <100% = ruimte over". Voeg een visuele balk toe. |
| 6 | 986–1004, 1016–1029, 1068–1088 | Drie monospace `<pre>`-blokken lezen als terminal-output, niet als bestuurlijke tabel; ook Σ en Δ niet uitgelegd. | Vervang door echte HTML-tabellen (`<table>` + `text-right` + `tabular-nums`). Vervang Σ door "Totaal", Δ door "Verschil". |
| 7 | 1037–1058 | Stap 4 "Aanpassingen" stapelt jargon (water-fill, dossier-mid, borgingstail, verankering) zonder voor/na-voorbeeld. | Splits visueel A+B (rekenkundig) en C (keuze). Geef per aanpassing een mini-voorbeeld: "Voor inspanning CRM was theoretisch €X in 2026; na cap-respect werd het €Y." |
| 8 | 79–84, 1957 | Curve-labels als "U-curve — piek in realisatie + acceptatie/uitrol (PRINCE2/BiSL)" stapelen onbekende termen zonder visualisatie. | Toon naast elke curve-label een mini-sparkline (5 staafjes) zodat de "U" en "S" zichtbaar zijn. Verwijder PRINCE2/BiSL uit de body, of verplaats naar een tooltip "Bron methodiek". |
| 9 | 666, 785 | "1490K" in snel-nav vs "€ 1.49M" in banner = twee notaties op één scherm. | Kies één: ofwel altijd K, ofwel altijd M. Voor stuurgroep is "€ 1,49 mln" leesbaarder. Of: toon in snel-nav ook "€ 1,49M". |
| 10 | 1735–1804 | Sectie B+ "bottom-up samenvatting" komt ná Sectie B (detail-tabel) — samenvatting hoort vóór details. | Wissel volgorde: B+ als eerste, Sectie B als detail-uitwerking. Of: hernoem B+ naar "Recap" zodat duidelijk is dat het herhalend is. |

---

## Must-fix vs nice-to-have

### Must-fix (zonder deze is de pagina onbruikbaar voor een leek)

1. **Verwijder codebase-leakage** (Supabase, `FASE_CHAINS`, scriptpaden, `verdelingPerJaar`, `totalenPerJaar`-veldnamen). Stuurgroep-tekst mag geen verwijzing naar broncode bevatten.
2. **Maak `MinMidMaxToelichting` altijd zichtbaar** (haal uit Sectie 0 of zet Sectie 0 default open). Zonder dit blok mist de lezer de fundamentele uitleg van wat "Mid" betekent.
3. **Definieer "cap" en "benutting" ter plekke** (eerste voorkomen). Deze twee termen zijn de spil van Sectie A en blijven onbegrepen.
4. **Herschrijf de vier Sectie D-checks** naar volzinnen zonder Σ en zonder variabelennamen.
5. **Vervang de drie `<pre>`-blokken in Sectie 0** door echte HTML-tabellen, en vervang Σ + Δ in zichtbare tekst.

### Nice-to-have (verhoogt de leeservaring, maar de pagina is begrijpelijk zonder)

6. **Sparkline-visualisaties** voor U-curve / S-curve / Brede heuvel (regel 79–84) in plaats van alleen tekstlabels.
7. **Wissel volgorde Sectie B en B+** zodat samenvatting vóór detail komt.
8. **Mini-voor/na-voorbeelden** in Stap 4 "Aanpassingen" (water-fill, cultuur-ophoging) — stuurgroep ziet dan concreet wat er gebeurt.
9. **Consistente € notatie** (kies K of M, niet beide).
10. **Vervang executieve termen** waar mogelijk (loaded cost → "interne kosten incl. werkgeverslasten"; intervisiekring → "kleine reflectiegroep"; tail → "naloop-jaren"; borging → "verankering in dagelijkse werkwijze").
11. **Begrippenlijst-uitklapper bovenin** met alle vakbegrippen die toch nodig zijn (PRINCE2, BiSL, ETL, CRM, NPS).

---

**Eindwoord.** De pagina is een sterk audit-instrument voor wie de methodiek kent. Voor een stuurgroep-lid is hij momenteel onmogelijk zelfstandig te lezen — de stuurgroep zal de programmamanager naast zich nodig hebben om uit te leggen wat "cap", "Σ verdelingPerJaar", "water-fill", en "U-curve (PRINCE2/BiSL)" betekenen. Met de 5 must-fixes is de pagina bruikbaar zonder begeleider; met alle 10 wordt hij een document dat je rustig kunt voorleggen aan iemand die het programmaboek nooit heeft geopend.
