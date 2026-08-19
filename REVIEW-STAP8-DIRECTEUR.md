# Review Stap 8 — Doelgroep: Directeur (geen DIN-voorkennis)

**Datum:** 2026-05-02
**Bestand:** `src/components/steps/BerekeningenStep.tsx` (1456 regels)
**Live:** https://din-kappa.vercel.app/sessies/d8b97442-ce8f-4134-b2c7-67dc8e3a3f93
**Vorige eindrapport:** zie `REVIEW-STAP8-EINDRAPPORT.md` (target: stuurgroep-lid; deze review zoomt verder in op directeur-niveau).

---

## Top 10 Must-fix (hoog → laag)

| # | Regel | Huidige tekst | Voorgestelde tekst |
|---|---|---|---|
| **1** | 168 | "Hoe komen we aan de bedragen in **§4.1**?" | "Hoe komen we aan de bedragen in de begroting?" — directeur weet niet wat §4.1 is. |
| **2** | 583, 1016, 1158 | "Σ alle inspanningen", "Σ componenten", "Σ over alle jaren" | "Totaal alle inspanningen", "Totaal componenten", "Totaal over alle jaren". Het Σ-teken staat 9× op de pagina; de directeur leest dit als wiskundeboek. |
| **3** | 818, 821, 822 | "Verschil met dossier-totaal · +€34.000 (+8%)" zonder conclusie | Voeg na het cijfer altijd één zin toe: "Dat is binnen de norm" / "Dat komt door X (zie hieronder)" — verschillen zonder duiding lezen als foutmeldingen. |
| **4** | 205, 497 | "Jaarbudget-plafond (cap)" — overal 6× "(cap)" | Schrap "(cap)" uit alle labels. De begrippenlijst is voldoende. "(cap)" is technische slang. |
| **5** | 562, 571, 614 | "Sorteer op prioriteit (rank)" — variabelennaam in tekst | "Gesorteerd op prioriteit". Schrap "(rank)" overal. |
| **6** | 769, 1136, 1151, 1158, 893–897 | "structurele jaren", "% v. inspanning", "(= aantal jaren − 1, want jaar 1 is opstart)" | Vervang door volzin: "Jaar 1 is opstart, daarna betaal je 3 jaar de doorlopende kosten". Headers: "% van inspanning" (geen v.), "Aandeel van inspanning". |
| **7** | 829 | "vaste formule (~10% van basisraming, behalve bij min20 waar cap-headroom de buffer naar nul dwingt)" | "vaste formule (ongeveer 10% van de basisraming als reserve voor onvoorziene zaken — bij het krappe scenario kan deze reserve op nul uitkomen omdat het jaarbudget al volledig benut is)". "cap-headroom" = directeur-onleesbaar. |
| **8** | 213, 1097, 1099, 1101 | "interne uren (die staan in §4.2)", "die staan in §4.2 Interne uren" | "interne uren (zie de paragraaf Interne uren in het programmaplan)". §-verwijzingen hebben geen betekenis voor de directeur. |
| **9** | 1097 | "out-of-pocket-raming" | "raming van de externe kosten". "Out-of-pocket" is consultancy-jargon. |
| **10** | 252 | "scherpste schaalvoordelen volledig benut" | "maximale schaalvoordelen". "Scherpste … volledig benut" leest stapelend. |

---

## Per-sectie bevindingen

### Header (regels 162–185)
- Regel 168: "§4.1" is een verwijzing zonder context. **Schrap**.
- Regel 169–175: lange zin van 5 stappen achter elkaar ("hoe het jaarbudget-plafond is bepaald, hoe het scenario-totaal is opgebouwd, hoe het bedrag per inspanning ontstaat …"). Splitsen in opsomming met bullets.
- Regel 179: "Cito-norm jaarbudget (basis)" — directeur kent geen "Cito-norm". Suggestie: "Jaarbudget volgens Cito-richtlijn".

### Begrippenlijst (regels 203–231)
- Goed: `<details>` is dicht zodat het niet opdringt.
- "Jaarbudget-plafond (cap)" — schrap "(cap)". Begrippenlijst is bron-van-waarheid; geen reden om de afkorting nóg een keer te tonen.
- "Lifecycle-curve" — Engels woord. Liever **"Verdeling over de jaren"** + uitleg.
- "Aanpassing tijdens optimalisatie" — woord "optimalisatie" is ok maar lange zin met "verfijningen in de motivatie van de business case" is taai. Inkorten: "Wanneer het werkelijke bedrag afwijkt van het dossier-bedrag — meestal omdat interne uren apart worden geboekt".

### Min/Mid/Max-kaart (regels 233–282)
- Inhoud is goed (Pim heeft eerder gevraagd dit te bewaren).
- Regel 252: "scherpste schaalvoordelen volledig benut" → simpeler: "maximale schaalvoordelen meegenomen".
- Regel 271: "Delta Max−Mid is wat de risico-buffer dekt" — "Delta" + "dekt" combineren slecht. Voorstel: "Het verschil tussen Max en Mid is wat de risico-buffer afdekt".
- "<span className=font-mono>" rondom Min/Mid/Max is prima maar overdreven; de monospace-styling suggereert code.

### ScenarioPicker (regels 288–335)
- Regel 327: "max/jr {bedrag}" — directeur-onleesbaar. Liever "max per jaar".
- Geen jargon-issues verder.

### Sectie A — Scenario-input (regels 462–542)
- Regel 490: "Scenario-input — hoe zijn de parameters bepaald?" Woord "parameters" is technisch. Voorstel: **"Hoe is dit scenario opgebouwd?"**.
- Regel 497: "Jaarbudget-plafond (cap)" — schrap "(cap)".
- Regel 508: capFormule wordt in `font-mono` gerenderd → ziet eruit als code-output. Vervang door volzin: "We nemen het Cito-richtlijnbudget van €250.000, vermenigvuldigen met 1,20 en ronden af op €300.000".
- Regel 514, 516: "alle dossier-totalen kan dekken binnen het jaarbudget" → "alle gewenste investeringen passen binnen het jaarlijkse budget".
- Regel 516: "dossier-mids" — directeur snapt dit niet. Vervang door "geraamde middenwaarden".
- Regel 526: "dit is wat we aanvragen — som van alle inspanningen" — goed verwoord. Houden.
- Regel 532–537: uitloop-uitleg is goed geschreven en helpt directeur. **Houden.**

### Sectie B — Optelling (regels 548–648)
- Regel 571: "Tel alle inspanningen op, gesorteerd op prioriteit (rank)." → schrap "(rank)".
- Regel 583: "Σ alle inspanningen" → **"Totaal alle inspanningen"**.
- Regel 587: "Scenario-totaal (zoals opgeslagen)" — "(zoals opgeslagen)" verraadt de developer-bril. Schrap, of vervang door "(referentie)".
- Regel 592: "buiten tolerantie" — directeur kent dit niet. Vervang door "groter dan de toegestane afwijking".
- Regel 605–648 InspanningRangoorde: balk + percentage + ranknummer is helder. Geen jargon-issues.

### Sectie C — Per inspanning (regels 654–846)

**C1 — Uit het dossier (regels 732–754)**
- Goed: kostenraming-tekst wordt netjes gerenderd met euro-highlights.
- ParserOutputPaneel (regels 868–899): "Wat de tekstparser eruit haalt" — woord "tekstparser" is dev-taal. Vervang door **"Wat we uit deze tekst halen"** of **"Samenvatting van bovenstaande tekst"**.
- Regel 893–897: "Voor dit scenario van X jaar (Y structurele jaren): Dossier-totaal Z, Min-grens W". Begrip "Min-grens" is onuitgelegd. Voorstel: "ondergrens (gunstige aannames)".

**C2 — Motivatie (regels 757–762)**
- Regel 759: "Motivatie & onderbouwing — hoe komt het bedrag tot stand?" Goed.
- Regel 917 BreakdownPaneel: "Dossier-onderbouwing — componenten en bedragen" — "Componenten" is acceptabel maar "Onderbouwing per onderdeel" leest natuurlijker.

**BreakdownTabel (regels 965–1062)**
- Tabel-header "Component" / "Bedrag" — prima.
- Regel 1016 footer: "Σ componenten" → **"Totaal onderdelen"**.
- Regel 1024: "+ buffer (uit bron-tekst)" / "+ afrondingsmarge bandbreedtes" — Pim heeft hier al aan gewerkt, maar "afrondingsmarge bandbreedtes" is nog steeds taai. Voorstel: **"+ afronding op bandbreedtes"** of **"+ marge voor afronding"**.
- Regel 1043–1057: lange uitleg "Letterlijk uit de bron-tekst …" / "Het verschil tussen Σ componenten en het hoofdtotaal komt door afronding …". "Hoofdtotaal" is prima, maar "Σ componenten" weer. Vervang door "totaal van de onderdelen".

**C3 — Berekening dossier-totaal (regels 765–791)**
- Regel 768: "Berekening van het dossier-totaal voor dit scenario" — goed.
- Regel 769 hint: "Eenmalig (mid) + structureel-mid × X structurele jaren (= aantal jaren − 1, want jaar 1 is opstart)" — formule-look. Vervang door volzin: "We nemen de eenmalige opstartkosten en tellen daar de jaarlijkse doorlopende kosten bij op, voor elk jaar ná jaar 1".
- Regel 773: "Eenmalig (mid)" — directeur snapt nog steeds niet wat (mid) betekent in een bedragen-rij. Hier zou label "Eenmalige opstart (middenwaarde)" duidelijker zijn.
- Regel 786: "marge van [Min ..., dossier-totaal × 1,05 = ...]" — formule-syntax `× 1,05 =` schreeuwt code. Volzin: "het bedrag mocht tussen de ondergrens en 5% boven het dossier-totaal liggen".

**C4 — Werkelijk + verschil (regels 794–833)**
- Regel 818: "Verschil met dossier-totaal" — goed.
- Regel 821–822: "+€34.000 (+8%)" gevolgd door DriftVerklaring. **Verschil zonder duiding leest als waarschuwing.** Zorg dat DriftVerklaring áltijd verschijnt (ook bij <€5K), met als minimum: "Dit valt binnen de normale marge van het dossier — geen actie nodig".
- Regel 829: "(~10% van basisraming, behalve bij min20 waar cap-headroom de buffer naar nul dwingt)". **Directeur-onleesbaar.** Voorstel: zie #7 in top 10.
- Regel 1090–1110 DriftVerklaring: "interne capaciteits­kosten (bijvoorbeeld CRM ~1.466 uur × €74)" — "CRM" zonder context, "~1.466 uur" detail. Inkorten naar: "interne uren van eigen medewerkers — die worden in een aparte paragraaf geboekt".

**C5 — Verdeling per jaar (regels 836–842, 1113–1191)**
- Regel 839: "Per cell: bedrag, fase, percentage." — "cell" = developer. **"Per regel: bedrag, fase, percentage."**
- Regel 1136: "% v. inspanning" — afkorting met punt. **"Aandeel"** of **"% van inspanning"**.
- Regel 1158: "Σ over alle jaren" → **"Totaal over alle jaren"**.
- Regel 1169: "Inspanning-totaal (referentie)" — prima.
- Regel 1178: "(uit AI-motivatie)" — directeur weet dit niet. Schrap "uit AI-motivatie" of vervang door "(uit dossier)".

### Sectie D — Jaartotalen (regels 1197–1305)
- Regel 1219: "Jaartotalen — verdeling per jaar" — goed.
- Regel 1220 hint: "% van het jaarbudget-plafond benut" — "benut" is acceptabel maar "% van plafond gebruikt" leest beter.
- Regel 1273–1274: "% van plafond ({bedrag})" — "plafond" + bedrag in haakjes is helder.
- Regel 1289: title "Jaar 1 op Cito-norm €250K (hard, mag boven scenario-cap uitkomen)" — woord "hard" + "scenario-cap" zijn beide jargon. **"Jaar 1 staat vast op de Cito-richtlijn van €250.000 — dit kan in krappe scenario's hoger zijn dan het scenario-plafond."**.
- ServerGuardsUitleg eerder verwijderd — goed. Sectie D is nu compact.

### Sectie E — Som-controle (regels 1311–1397)
- Regel 1334: "De som van alle inspanningen klopt met het scenario-totaal" — goede volzin.
- Regel 1336: uitleg-tekst gebruikt nog "Som inspanningen X versus scenario-totaal Y — verschil Z (toegestaan: T)." Versus-constructie + "toegestaan" is OK voor directeur. **Houden.**
- Regel 1344: "(uitzondering: jaar 1 mag op €250K Cito-norm staan)" — goed.
- Regel 1349: "min20 (cap €200K)" — schrap "(cap )". Schrijf: "voor het krappe scenario, met €200K plafond".
- Regel 1357: "(binnen tolerantie van max(€5.000, 0,5%))" — formule-syntax. Vervang door: "binnen een afwijking van €5.000 of 0,5% van het bedrag — wat van de twee groter is".
- Regel 1380: "Discrepantie gevonden" — formeel woord. Liever **"Verschil gevonden — zie details"** of **"Eén of meer berekeningen wijken af"**.

---

## Sectie-volgorde — werkt A → B → C → D → E voor een directeur?

**Mijn conclusie: ja, mits:**
- A (parameters van scenario) → B (optelling inspanningen) → C (per inspanning) → D (verdeling over jaren) → E (controle) is een logische trechter van macro naar micro naar kruiscontrole.
- **Wel:** de scenario-balk zelf (in de paarse / blauwe header met `formatEurMln(totaalScenario)`) is **al** wat de directeur eerst wil zien. Dat staat goed bovenaan elke kaart, dus dit klopt.

**Mogelijke verbetering:** in Sectie A regel 522–528 staat "Scenario-totaal (begroot) — €X — som van alle inspanningen". Deze waarde is identiek aan wat in de header van de kaart staat — dubbel. Of: weglaten in Sectie A, of: reframe als "Wat we hierna gaan onderbouwen: €X over Y jaar".

---

## Algemene observaties

### Wat werkt goed
- **De Min/Mid/Max-uitleg** (regels 233–282): pedagogisch sterk. "Uur-tarieven liggen vast, aantal uren kan variëren" is precies wat een directeur nodig heeft.
- **De Begrippenlijst** in `<details>` dicht — opdringt niet.
- **De DriftVerklaring per domein** (data_systemen / processen / cultuur) is goed gedifferentieerd.
- **De waarom-een-uitloop-uitleg** (regel 532–537): legt menselijk uit waarom we niet 3,5 jaar plannen. Houden.
- **Sectie E** in volzinnen i.p.v. variabelennamen — Pim heeft hier al hard aan gewerkt; de checks lezen nu als statements.
- **Sectiekoppen A–E** met blauwe badges visueel rustig.

### Wat niet werkt
- **Σ-symbolen op 9 plekken.** Dit is single-issue de grootste leesbarrière voor een directeur.
- **§4.1, §4.2 referenties** (3×). Directeur heeft het document niet voor zich liggen of weet niet welke paragraaf wat is.
- **"(cap)" bij elke "jaarbudget-plafond"-vermelding** (4× minimaal). Begrippenlijst is voldoende.
- **"(rank)", "(zoals opgeslagen)", "cell", "tekstparser", "out-of-pocket", "cap-headroom"** — losse code-uitstapjes die de bestuurlijke leesvloei breken.
- **font-mono op formules** (capFormule, Eenmalig + structureel × jaren, marge-formule met ×1,05) — ziet eruit als code-output, niet als bestuurlijke onderbouwing.
- **Verschillen tonen zonder conclusie** (Sectie C4): "+8%" is een getal; "+8% — dit valt binnen de normale marge" is een uitspraak.

---

## Conclusie

**Kan een directeur deze pagina nu lezen zonder vraagtekens? — Nog niet. ~70% klaar.**

Pim heeft de afgelopen uren de grote brokken jargon ("server-side aanpassingen", "guards", "drift", "doel-totaal", "bottom-up", "BenuttingsBalk", "theoretisch maximum", "ServerGuardsUitleg") uit de pagina gehaald — dat is zichtbaar en de pagina leest aanzienlijk rustiger dan in de vorige review.

Wat overblijft zijn **kleinere maar herhaalde irritanten** die voor een directeur als geheel een drempel vormen:

1. **Het Σ-symbool** — overal vervangen door "Totaal".
2. **"(cap)" / "(rank)" / "(zoals opgeslagen)" / "cell"** — schrappen, niet vervangen; ze voegen niets toe.
3. **§4.1 / §4.2 verwijzingen** — vervangen door volzin-verwijzingen ("zie de paragraaf interne uren").
4. **Formules in font-mono** in Sectie A en C3 — vervang door volzinnen.
5. **Verschillen zonder duiding** in Sectie C4 — altijd één conclusiezin er aan vast.
6. **"out-of-pocket", "cap-headroom", "tekstparser", "lifecycle-curve"** — Engelse / dev-termen vervangen.

Effort-schatting: **~90 minuten** voor alle bovenstaande aanpassingen (vooral search-and-replace + 3 zinnen herschrijven).

**Na deze laatste ronde** kan een directeur de pagina zelfstandig lezen, ziet hij een totaalbedrag, snapt hij hoe het is opgebouwd, en kan hij de cijfers aan zijn stuurgroep verdedigen zonder een programmamanager naast zich.
