---
name: ui-design-system
description: |
  UI design system toolkit voor het genereren van design tokens, kleurpaletten, typografie, spacing systemen en developer handoff documentatie. Gebruik deze skill wanneer de gebruiker vraagt om: design tokens, kleurpalet, typografie schaal, spacing systeem, CSS/SCSS variabelen, component architectuur, WCAG contrast check, 8pt grid, developer handoff, Figma sync, of breakpoints. Ook triggeren bij "design system opzetten", "tokens genereren", "kleur varianten", "component library", of wanneer visuele consistentie en systematisch design gevraagd wordt.
---

# UI Design System

Generate design tokens, create color palettes, calculate typography scales, build component systems, and prepare developer handoff documentation.

---

## Workflow 1: Generate Design Tokens

1. Identify brand color (hex) and style: modern | classic | playful
2. Generate tokens using script:
```bash
python scripts/design_token_generator.py "#0066CC" modern json
```
3. Review generated categories: colors, typography, spacing (8pt grid), borders, shadows, animation, breakpoints
4. Export in target format:
```bash
python scripts/design_token_generator.py "#0066CC" modern css > design-tokens.css
python scripts/design_token_generator.py "#0066CC" modern scss > _design-tokens.scss
python scripts/design_token_generator.py "#0066CC" modern json > design-tokens.json
```
5. Validate: WCAG AA (4.5:1 normal text, 3:1 large text)

---

## Workflow 2: Create Component System

**Component hierarchy:**
- Atoms: Button, Input, Icon, Label, Badge
- Molecules: FormField, SearchBar, Card, ListItem
- Organisms: Header, Footer, DataTable, Modal
- Templates: DashboardLayout, AuthLayout

**Size variants:**
```
sm: height 32px, paddingX 12px, fontSize 14px
md: height 40px, paddingX 16px, fontSize 16px
lg: height 48px, paddingX 20px, fontSize 18px
```

**Color variants:**
```
primary: background primary-500, text white
secondary: background neutral-100, text neutral-900
ghost: background transparent, text neutral-700
```

---

## Workflow 3: Responsive Design

**Breakpoints:**
| Name | Width | Target |
|------|-------|--------|
| xs | 0 | Small phones |
| sm | 480px | Large phones |
| md | 640px | Tablets |
| lg | 768px | Small laptops |
| xl | 1024px | Desktops |
| 2xl | 1280px | Large screens |

**Fluid typography (clamp):**
```css
--fluid-h1: clamp(2rem, 1rem + 3.6vw, 4rem);
--fluid-h2: clamp(1.75rem, 1rem + 2.3vw, 3rem);
--fluid-body: clamp(1rem, 0.95rem + 0.2vw, 1.125rem);
```

---

## Workflow 4: Developer Handoff

**Framework integration:**

React + CSS Variables:
```tsx
import './design-tokens.css';
```

Tailwind Config:
```javascript
const tokens = require('./design-tokens.json');
module.exports = { theme: { colors: tokens.colors } };
```

Figma: Install Tokens Studio plugin, import design-tokens.json.

**Handoff checklist:**
- [ ] Token files added to project
- [ ] Build pipeline configured
- [ ] Theme/CSS variables imported
- [ ] Component library aligned
- [ ] Documentation generated

---

## Quick Reference

### Typography Scale (1.25x Ratio)
| Size | Value |
|------|-------|
| xs | 10px |
| sm | 13px |
| base | 16px |
| lg | 20px |
| xl | 25px |
| 2xl | 31px |

### WCAG Contrast
| Level | Normal Text | Large Text |
|-------|-------------|------------|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

### Style Presets
| Aspect | Modern | Classic | Playful |
|--------|--------|---------|---------|
| Font Sans | Inter | Helvetica | Poppins |
| Radius | 8px | 4px | 16px |
