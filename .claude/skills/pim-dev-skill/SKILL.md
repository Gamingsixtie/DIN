---
name: pim-dev-skill
description: |
  Development skill voor Pim's projecten bij Cito. Gebruik deze skill wanneer Pim werkt aan Next.js/React of Python/data projecten en vraagt om: code genereren, project opstarten, bestanden aanmaken, debuggen, of relevante methodiek/context inladen (Cito commerciële context, data-analyse stappen). Trigger bij zinnen als "maak een component", "start het project", "debug dit", "analyseer data", "klantreis", "sector PO/VO", "nieuwe pagina", "script runnen", "bestanden aanmaken", "fix deze error", "Cito", "onderwijs data". Altijd gebruiken voor Cito-gerelateerd dev-werk en data-analyse projecten.
---

# Pim Dev Skill

Development skill voor Next.js/React en Python/data projecten, met Cito context en data-analyse methodiek.

## Context inladen

| Situatie | Lees |
|---|---|
| Cito sectoren (PO/VO), klantreizen, klantdata | references/cito-context.md |
| Data inladen, analyseren, visualiseren | references/data-analyse.md |

Doe dit proactief - wacht niet tot Pim ernaar vraagt.

## Next.js / React

- Gebruik altijd TypeScript tenzij anders gevraagd
- Gebruik Tailwind CSS voor styling
- Gebruik App Router structuur (app/ directory)
- Componenten als default export met props-interface bovenaan
- Business logic in custom hooks (hooks/useX.ts)

## Python / data

- Gebruik pandas voor data-manipulatie
- Gebruik pathlib voor paden (niet os.path)
- Structuur: imports, constanten, functies, main block
- Korte commentaarregel boven elke functie

## Project opstarten

Next.js: npm run dev / npm run build / npm run lint
Python: python script.py of python -m module_name

## Debuggen

1. Lees volledige stacktrace
2. Benoem het type error
3. Leg oorzaak uit in gewone taal
4. Bied één concrete fix aan
5. Leg uit waarom de fix werkt

## Communicatie

- Nederlands, tenzij code zelf Engels is
- Direct en concreet, geen lange inleidingen
- Een oplossing, niet drie alternatieven
- Een vervolgvraag als iets mist
