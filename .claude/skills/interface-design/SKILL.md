---
name: interface-design
description: |
  Interface design skill voor dashboards, admin panels, apps, tools en interactieve producten. NIET voor marketing design (landing pages, marketing sites, campagnes). Gebruik voor het bouwen van UI met craft, consistentie en intentie. Trigger bij: dashboard, admin panel, SaaS app, settings page, data interface, design system, component, UI consistentie, "verbeter deze interface", "maak het mooier", "design review", "visuele consistentie", "interface opzetten". Ook gebruiken wanneer een bestaande interface verbeterd moet worden of wanneer de gebruiker feedback wil op UI kwaliteit.
---

# Interface Design

Build interface design with craft and consistency.

## Scope
**Use for:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.
**Not for:** Landing pages, marketing sites, campaigns. Redirect those to frontend-design.

---

## Intent First

Before touching code, answer these out loud:

**Who is this human?** The actual person. Where are they when they open this? What did they do 5 minutes ago?

**What must they accomplish?** Not "use the dashboard." The verb. Grade these submissions. Find the broken deployment. The answer determines what leads, what follows, what hides.

**What should this feel like?** Say it in words that mean something. "Clean and modern" means nothing. Warm like a notebook? Cold like a terminal? Dense like a trading floor?

If you cannot answer these with specifics, ask the user. Do not guess. Do not default.

## Every Choice Must Be A Choice

For every decision, you must be able to explain WHY:
- Why this layout and not another?
- Why this color temperature?
- Why this typeface?
- Why this spacing scale?

If your answer is "it's common" or "it's clean" - you've defaulted.

---

## Product Domain Exploration

Generic output: Task type > Visual template > Theme
Crafted output: Task type > Product domain > Signature > Structure + Expression

**Required outputs before any direction:**
- **Domain:** Concepts, metaphors, vocabulary from this product's world. Minimum 5.
- **Color world:** What colors exist naturally in this domain? List 5+.
- **Signature:** One element that could only exist for THIS product.
- **Defaults:** 3 obvious choices for this interface type to actively reject.

---

## Design Principles

### Subtle Layering
Surfaces stack. Build a numbered elevation system. In dark mode, higher elevation = slightly lighter. Each jump should be only a few percentage points. You feel it rather than see it.

- Sidebars: Same background as canvas, not different. A subtle border is enough.
- Dropdowns: One level above their parent surface.
- Inputs: Slightly darker than surroundings - they receive content.

### Token Architecture
Every color traces back to primitives: foreground, background, border, brand, semantic.
Build four text levels: primary, secondary, tertiary, muted.
Build a border progression matching intensity to importance.

### Spacing
Pick a base unit (4px or 8px) and stick to multiples. Random values signal no system.

### Depth - Choose ONE
- **Borders-only** - Clean, technical. For dense tools.
- **Subtle shadows** - Soft lift. For approachable products.
- **Surface color shifts** - Background tints establish hierarchy without shadows.

Don't mix approaches.

### Color
Every product exists in a world. That world has colors. Find them before reaching for a palette.
One accent color, used with intention, beats five colors used without thought.
Gray builds structure. Color communicates status, action, emphasis, identity.

---

## Before Writing Each Component

State this every time:
```
Intent: [who is this human, what must they do, how should it feel]
Palette: [colors from your exploration and WHY they fit]
Depth: [borders/shadows/layered and WHY]
Surfaces: [elevation scale and WHY]
Typography: [typeface and WHY]
Spacing: [base unit]
```

---

## The Mandate

Before showing the user, ask: "If they said this lacks craft, what would they mean?"
That thing you just thought of - fix it first.

**Run these checks:**
- **Swap test:** If you swapped the typeface for your usual one, would anyone notice?
- **Squint test:** Blur your eyes. Can you still perceive hierarchy?
- **Signature test:** Can you point to 5 specific elements where your signature appears?
- **Token test:** Read your CSS variables. Do they sound like they belong to this product?

If any check fails, iterate before showing.

---

## Avoid
- Harsh borders - if borders are the first thing you see, too strong
- Dramatic surface jumps - elevation changes should be whisper-quiet
- Inconsistent spacing - clearest sign of no system
- Mixed depth strategies - pick one
- Missing interaction states - hover, focus, disabled, loading, error
- Pure white cards on colored backgrounds
- Gradients and color for decoration
- Multiple accent colors
