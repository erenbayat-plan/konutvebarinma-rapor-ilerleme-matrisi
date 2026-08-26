# Impeccable Design System & Craft Guidelines (impeccable.style)

This project integrates the **Impeccable** design system principles to deliver editorial-grade, human-crafted interfaces with distinctive typography, deliberate contrast, and exceptional attention to detail.

---

## 1. Core Philosophy: Anti-"AI UI" & Intentional Aesthetic
- **Reject Generic AI Slop**: Avoid boring purple-to-blue gradients, glowy glassmorphism on dark backgrounds, repetitive 3-column feature grids, and meaningless card nesting.
- **Graphic & Editorial Craft**: Embrace high-contrast, structured layouts, purposeful typographic scales, rich neutral palettes, and confident spatial hierarchies.
- **Opinionated Identity**: Create memorable, polished software that feels like an intentional publication, not a generic dashboard template.

---

## 2. The Seven Pillars of Impeccable Design

### 1. Typography & Hierarchy
- **Distinctive Pairing**: Pair high-character display headers with ultra-legible, functional monospace/sans body and data fonts.
- **Mathematical Hierarchy**: Never skip heading levels. Maintain strict proportional step ratios (e.g. 1.25–1.333) between H1, H2, H3, and body text.
- **Single-Line Data Controls**: Text inside pills, buttons, badges, and status indicators must NEVER wrap, hyphenate, or truncate. Ensure generous horizontal whitespace (`padding-x = 2 * padding-y`).

### 2. Color, Tone & Contrast
- **Rich Neutrals**: Avoid flat `#000` or `#FFF`. Utilize warm or cool toned off-whites, slates, and deep inks with subtle undertones.
- **Contrast & Legibility**: Strictly enforce WCAG AA (≥ 4.5:1 for body copy). Never put low-contrast gray text on tinted backgrounds.
- **Deliberate Accent Usage**: Use accent colors (amber, emerald, warm coral) strictly for status, key action triggers, and active states.

### 3. Spatial System & Layout Architecture
- **Flat Over Nested**: Flatten depth using crisp whitespace, deliberate borders, and background shifts rather than piling cards inside cards.
- **Rhythmic Margins & Padding**: Outer container padding must always exceed inner element gaps (minimum 16px).
- **Corner Harmony**: Mathematical radius rule: `Inner Radius = Outer Radius - Distance (Padding)`.

### 4. Tactile Interactions & Micro-States
- **Immediate State Feedback**: Crisp hover, focus, and active/pressed feedback (`scale(0.97-0.99)`) with zero layout shifting.
- **High-Affordance Controls**: Inputs, dropdowns, and toggles should feel solid, tactile, and obvious in their interactive affordance.

### 5. Motion with Restraint (Paired with Emil Kowalski Principles)
- **Natural Curves**: Use snappy entrance easing (`cubic-bezier(0.16, 1, 0.3, 1)`) and quick exits (<150ms).
- **No Decoration-Only Motion**: Every animation must serve comprehension, feedback, or spatial orientation.

### 6. Responsive & Mobile Ergonomics
- **44px Minimum Touch Targets**: Mobile-optimized controls with easy thumb reach.
- **Graceful Card Adaptation**: Transform wide analytical data tables into compact, scannable cards on narrow viewports.

### 7. UX Writing & Micro-Copy
- **Concise & Direct**: Clear, professional, jargon-free Turkish and English labeling.
- **Action-Oriented Verbs**: Avoid vague SaaS clichés. Use direct verbs (e.g., "Ekle", "Filtrele", "Kaydet").
