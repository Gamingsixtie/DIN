---
quick_id: 260929-x5x
slug: stap11-framework-en-bronnen
date: 2026-09-30
status: complete
commits: [96cc336]
---

# Samenvatting: stap 11 v3 en naslag van de 3sides-documenten

## Opgeleverd

**Stap 11 "Programma × 3sides", v3 (commit 96cc336, live).** Kort en visueel, in 10 delen:
1. De kern: de programmastructuur staat. Wat nu knelt, en hoe de rollen in het framework dat oplossen.
2. De plaat met rollen en regieband, "Wie doet wat", toets per onderdeel, waarom logisch en risico's.
3. 3sides onder het DIN, met het taalverschil "inspanning".
4. Meetmodel: werkstromen bouwen, kernprincipes meten. Per niveau één soort meting; matrix van de vijf kernprincipes in ons vermogen; hoe de meting verloopt.
5. Werkstroomkaarten: het plan van aanpak ingepast in het DIN.
6. Gantt van de 3sides-tijdlijn, cel voor cel uit tab v3.
7. Overeenkomsten en verschillen.
8. Hoe verder.
9. Uitleggen binnen en buiten Cito.
10. Bronnen.

**Nieuwe bloktypes** in `src/components/bewerkbaar/`:
- `dinplaat` met rollen;
- `matrix`;
- `werkstromen`;
- `tijdlijn`.

Gedeelde typen staan in `blok-typen.ts`; ankers verwijzen naar kaarten (`wk-`) en tijdlijngroepen (`tl-`).

**Naslag-tabblad in stap 11** (tweede commit): "Naslag: kern van de 3sides-documenten", letterlijk omgezet uit Pims persoonlijke samenvatting.
- Opbouw: 17 delen, 86 blokken.
- Opslag onder `documenten["kern-3sides"]`.
- Directe link: `?stap=integratie&tab=kern`.

**Organigram (stap 10, schetsen, voorstel-md):**
- Plan van aanpak "ligt er, aanvullen".
- De Q3-planning staat naast de tijdlijn van 3sides (28-09).

## Controle
- **Onafhankelijke controle-agent.** Tijdlijn 28 van 28 activiteiten correct; matrix en kaarten letterlijk; paginaverwijzingen gecontroleerd. De 4 fouten, 7 twijfels en 15 kleine punten zijn verwerkt. Daaronder:
  - 4 inspanningen, één per domein, samengevoegd uit 10, in plaats van 26;
  - de plek van de BV-KPI's;
  - het bateneigenaar-conflict tussen organigram en KPI-model, als besluitpunt;
  - de planning van plan van aanpak tegenover de tijdlijn.
- **Build en tests.**
  - `npm run build` groen.
  - Browsertest stap 11: 10 secties, 4 kaarten, 4 tijdlijngroepen, matrix, 8 plaatlinks; geen zijwaartse scroll op 1280 en 390; opslaan, herladen en herstel werken; naslag heeft 17 secties en de directe link werkt.
  - Organigram-test groen.
- **Live sessie:** geen opgeslagen versie van stap 10 of 11, dus de nieuwe standaardinhoud is direct zichtbaar.

## Niet gecommit
`3SIDES-DOCUMENTEN-KERN.md` (persoonlijk bronbestand van de naslag).
