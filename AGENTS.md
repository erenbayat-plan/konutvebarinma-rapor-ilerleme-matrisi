# Design System & Engineering Directives

This project combines **Taste-Skill (Leonxlnx/taste-skill)**, **Impeccable Design System (impeccable.style)**, and **Emil Kowalski UI & Motion Principles (emilkowal.ski/skill)** to ensure high-craft, editorial-grade aesthetics, distinct visual identity, and tactile interaction design.

---

## 1. Taste-Skill Directives (Leonxlnx/taste-skill)
- **High Design Variance & Anti-Boilerplate**: Reject generic template layouts, identical 3-box feature cards, and repetitive cookie-cutter UI blocks.
- **Visual Density & Typography Intent**: Every element must have optical purpose, calibrated whitespace, distinct typographic pairings, and clear visual hierarchy.
- **Zero Placeholder Code (Complete Outputs)**: Never leave partial placeholders, mock click handlers, or truncated components. Everything rendered must be fully interactive and production-ready.
- **Cinematic Rhythm & Palette Cohesion**: Match domain aesthetic with bold contrast, intentional chromatic accents, and authentic materials rather than muted gray blandness.

---

## 2. Impeccable Design Philosophy (impeccable.style)
- **Anti-"AI Slop"**: Reject generic purple gradients, unnecessary card-in-card nesting, floating glassy blurs, and sterile SaaS templates.
- **Editorial & Graphic Polish**: Maintain crisp typography, distinct hierarchies, mathematical spatial rhythm, and rich high-contrast palettes.
- **Single-Line Integrity**: Badges, pills, chips, and table status triggers must fit labels cleanly on a single line without wrapping or breaking.
- **Clean Contrast & Accessibility**: Pass WCAG AA standards with crisp readability on both dark and light surfaces.

---

## 3. Emil Kowalski UI & Motion Guidelines (emilkowal.ski/skill)
- **Restraint First**: Motion serves function, spatial awareness, and feedback — never superfluous decoration.
- **Perceived Performance**: Instantaneous micro-interactions (<150ms) and swift layout shifts (<250ms).
- **Physicality & Easing**: Use `cubic-bezier(0.16, 1, 0.3, 1)` for deceleration into rest and snappy ease-in for exits.
- **Tactile Feedback**:
  - Buttons and interactive items provide subtle scale-down feedback on press (`scale(0.97)`).
  - Hover states transition background and borders cleanly without layout jank.
  - Respect `prefers-reduced-motion` at all times.
