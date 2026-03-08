---
name: web-asset-generator
description: |
  Generate web assets inclusief favicons, app icons (PWA) en social media meta images (Open Graph) voor Facebook, Twitter, WhatsApp en LinkedIn. Gebruik wanneer de gebruiker icons, favicons, social sharing images of Open Graph images nodig heeft van logo's, tekst of emoji's. Trigger bij: "favicon", "app icon", "og image", "open graph", "social image", "meta image", "PWA icons", "website icons", "sharing image", "Twitter card", "web assets genereren". Ook gebruiken als iemand een nieuw project opstart en icons/meta images nog mist.
---

# Web Asset Generator

Generate professional web assets from logos or text slogans, including favicons, app icons, and social media meta images.

## Quick Start

When a user requests web assets:

1. **Use AskUserQuestion tool to clarify needs** if not specified:
   - What type of assets they need (favicons, app icons, social images, or everything)
   - Whether they have source material (logo image vs text/slogan)
   - For text-based images: color preferences

2. **Check for source material**:
   - If user uploaded an image: use it as the source
   - If user provides text/slogan: generate text-based images

3. **Run the appropriate script(s)**:
   - Favicons/icons: `scripts/generate_favicons.py`
   - Social media images: `scripts/generate_og_images.py`

4. **Provide the generated assets and HTML tags** to the user

## Reference Documents

| Situatie | Lees |
|---|---|
| Interactieve vragen stellen aan gebruiker | references/interactive-questions.md |
| Assets opleveren en HTML tags meegeven | references/delivering-assets.md |
| Validatie, platform specs, veelvoorkomende verzoeken | references/validation-and-specs.md |

Laad het relevante referentiebestand als de situatie erom vraagt.

## Workflows

### Generate Favicons and App Icons from Logo

When user has a logo image:

```bash
python scripts/generate_favicons.py <source_image> <output_dir> [icon_type]
```

Arguments:
- `source_image`: Path to the logo/image file
- `output_dir`: Where to save generated icons
- `icon_type`: Optional - 'favicon', 'app', or 'all' (default: 'all')

Generates:
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-96x96.png`
- `favicon.ico` (multi-resolution)
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`, `android-chrome-512x512.png`

### Generate Favicons and App Icons from Emoji

```bash
python scripts/generate_favicons.py --suggest "description" /output all
python scripts/generate_favicons.py --emoji "emoji" <output_dir> [icon_type] [--emoji-bg COLOR]
```

### Generate Social Media Meta Images

From logo:
```bash
python scripts/generate_og_images.py <output_dir> --image <source_image>
```

From text:
```bash
python scripts/generate_og_images.py <output_dir> --text "Your text here" [--logo <path>] [--bg-color <color>] [--text-color <color>]
```

Generates:
- `og-image.png` (1200x630 - Facebook, WhatsApp, LinkedIn)
- `twitter-image.png` (1200x675 - Twitter)
- `og-square.png` (1200x1200 - Square variant)

## Text Sizing
- Short text (<=20 chars): 144px
- Medium text (21-40 chars): 120px
- Long text (41-60 chars): 102px
- Very long text (>60 chars): 84px

## Dependencies
- Python 3.6+
- Pillow: `pip install Pillow`
- Pilmoji (emoji): `pip install pilmoji`
- emoji (suggestions): `pip install emoji`
