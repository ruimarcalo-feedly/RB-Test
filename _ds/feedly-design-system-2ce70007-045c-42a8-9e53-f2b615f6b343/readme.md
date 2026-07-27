# Feedly Threat Intelligence — Design System

<!-- Design guide & manifest. Keep in sync with the compiled component/token set. -->

> Turn the world's open knowledge into the defender's edge.

The analyst-led AI platform where CTI teams **discover** emerging threats, **contextualize** what
matters to their organization, and **deliver** tailored intelligence in minutes. This design system
captures the brand foundations, reusable UI primitives, the CTI icon set, and high-fidelity
recreations of the marketing site and the analyst workspace.

**Brand values:** Fast. Precise. Crafted.
**Brand voice:** Clear. Assured. Empathetic. Optimistic.

---

## Sources

- **Figma — "Website 2026"** — production marketing pages + the full app component library (buttons, list rows, article entries, toolbars, metadata, the variable token collection).
- **Figma — "🧩 Marketing Sites"** — the canonical marketing design system: dedicated Colors, Typography, Grid, Shadows, Brand-Logos, MarketingButton/Header/Footer, Pricing, Article and Landing components.
- **Figma — "Luminous 0.5"** — the product UI kit (referenced; same Luminous token system).
- **Uploads:** `CoType_Foundry_Order_2956.zip` (Aeonik Pro family, self-hosted), `Logo Feedly threat intelligence(.svg / -large.svg)`.
- Brand strategy brief (purpose, positioning, audience, differentiation, proof rule, "what we are not").

*Token values, colors, type and icons were extracted from the Figma files (the source of truth), not from public references.*

---

## CONTENT FUNDAMENTALS — how Feedly writes

**Voice = Clear · Assured · Empathetic · Optimistic**, always together.

- **Person & address.** Speak to the analyst as a peer. Marketing uses **"you"** ("You get an easy-to-steer AI platform…"). Never "we know best"; the analyst is the expert, Feedly is the instrument.
- **Sentences.** Short. Active verbs first ("Discover", "Contextualize", "Deliver", "Surface", "Ship"). Cut filler. Get to the recommendation.
- **Casing.** Sentence case for headings and buttons ("Start free trial", "Book a demo"), not Title Case. Product nouns capitalized as proper features: **AI Feeds**, **Research**, **Boards**, **Reports**.
- **Numbers = proof only.** Quote figures Feedly can stand behind and define ("in minutes" = from emerging signal to tailored intelligence delivered; "3 days earlier", "30-minute crisis reports"). Never an unprovable risk score.
- **Customer proof = verbatim, attributed.** Name + organization ("Ian, Quilter"). Never paraphrase a customer murmur into marketing copy.
- **The hero is the analyst, never the threat.** We elevate the defender; we do not dramatize danger.
- **No fear, no hype.** No apocalyptic framing, no "the bad guys are winning", no exclamation marks, no hooded-figure imagery.
- **Emoji:** not used in product or marketing. (The 🧩 in a Figma file name is the author's, not brand voice.)

**Examples**
- Hero: *"The fastest way to track emerging threats with AI."*
- Sub: *"Discover relevant open-source signals, contextualize what matters to your organization, and deliver tailored intelligence — in minutes."*
- Contextualization chip (in product): *"Why it matters: Ransomware · Finance."*
- What we are **not**: a news feed, fear-selling, dystopian, generic AI, autonomous, loud.

---

## VISUAL FOUNDATIONS

**Type.** Two families. **Aeonik Pro** (CoType Foundry, self-hosted woff2) for display & headings — Medium for big display, SemiBold for section heads. **Inter** (self-hosted woff2, SIL OFL — weights 400/500/600/700) for all body and productuct UI. Display is set tight (line-height ~1.04, letter-spacing −0.02em); body is airy (1.5–1.6). Monospace (system stack) only for IOCs / code-like data.

**Color.** A confident, optimistic palette anchored by:
- **Signal green** `#2BB24C` (core) with a logo gradient `#22E059 → #2BB24C`. The single brand accent — used for primary CTAs, active states, and "why it matters" contextualization chips. Used sparingly, never as a wash behind everything.
- **Ink / dark blue** `#061427` — primary text and the dark marketing sections / app sidebar. A deeper navy `#09052E` for high-contrast bands.
- **Neutrals** — `#757575` secondary text, `#F6F7F8` subtle surfaces, hairline borders at `rgba(6,20,39,0.08)`.
- **Accents** — info/link blue `#3979CC`, aware yellow `#F1C925`, danger red `#F44336`, plus teal/lime for data. Status (Critical/High/Tracking) maps to danger/warning/info.

**Backgrounds.** Mostly clean white with generous whitespace. Two recurring full-bleed treatments: a **dark ink band** (stats, CTA panels — the green mark watermarked at ~14% opacity) and a **soft green-tint band** (`#E8FFF2`) for the analyst-led-AI message. No busy gradients; at most a quiet 150° tint fade behind feature media. No textures, no noise, no illustration-heavy hero.

**Corner radii.** Controls/inputs **8px**, cards **12px**, media/large cards **16px**, marketing panels **24px**, pills/chips/badges fully round. Square (rounded-8) avatars are reserved for *sources*; circular avatars for *people*.

**Elevation.** Soft, **navy-tinted** shadows (`rgba(6,20,39,0.05–0.14)`), never harsh black. Cards rest at `shadow-sm`; the hero product pane sits at `shadow-xl`; interactive cards lift `−2px` on hover.

**Borders.** Hairline `1px` at `rgba(6,20,39,0.08)` for structure; `--border-strong` (#D9D9D9) on inputs; brand green on focus with a `3px` green focus ring.

**Motion.** Quick and precise — 120–180ms, ease `cubic-bezier(0.2,0,0.1,1)`. Fades and short slides; **no bounce**, no springy overshoot. Reflects "Fast. Precise."

**States.** Hover = subtle background tint (neutral-50/subtle) or a darker brand shade for filled buttons; never opacity dimming. Press = darker shade (no shrink). Selected = brand-tint background + green text/border. Disabled = neutral-150 surface + neutral-300 text.

**Imagery.** Real product screenshots demoing an end-to-end workflow (the proof rule: "show the workflow, not the feature"). Warm-neutral, bright, hopeful — never cool/grim, never hooded figures or dark "hacker" tropes.

---

## ICONOGRAPHY

- **Custom Feedly line-icon set**, extracted from Figma as React components in `assets/icons/` (e.g. `MagnifyingGlass`, `Bug`, `ShieldLightning`, `ShieldUser`, `Sparkles`, `Robot`, `Leo`, `RadarAlt`, `Crosshairs`, `Mitreattack`, `Ioc`, `Priority`, `BullseyeArrow`, `ChartLineUp`, `Spy`, `Bookmark`, `Star`, `Gear`, `Globe`, `Lightning`, `Paperplane`, plus UI glyphs: `Plus`, `Cross`, `Check`, `Chevron*`, `ArrowUpRight`, `Ellipsis`, `Feedly`).
- Each icon paints with **`currentColor`**, ships `bold` (off/on) and `size` (sm/md/lg) variants, and is sized via `style`. Recolor with `style={{ color: '…' }}`.
- **Two stroke weights** (regular / bold) at three sizes (20/24/28 box) — a clean, rounded, medium-weight CTI set. No emoji, no unicode glyphs as icons.
- The brand mark (green diamond) and full lockups live in `assets/logos/` — never redraw them.

---

## Index / manifest

**Root**
- `styles.css` — global entry (import this); `@import`s the token + base files.
- `readme.md` — this guide. `SKILL.md` — portable skill manifest.

**Tokens** (`tokens/`)
- `fonts.css` (Aeonik Pro @font-face + Inter), `colors.css`, `typography.css`, `spacing.css` (spacing/radii/shadows/motion), `base.css`.
- `tokens/figma/fig-tokens.css` — raw Figma variable export, kept for reference (not imported).

**Assets** (`assets/`)
- `logos/` — `feedly-ti-lockup.svg`, `-large.svg`, `-white.svg` (for dark), `feedly-mark.svg` (symbol).
- `fonts/` — Aeonik Pro woff2 (light/regular/medium/semibold/bold).
- `icons/` — the CTI icon component set (+ `icons.card.html`).

**Components** — 16 UI primitives, read from `window.DesignSystem_2ce700`:
- `components/core/` — `Button`, `IconButton`, `Badge`, `Chip`, `Avatar`.
- `components/forms/` — `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`.
- `components/feedback/` — `InlineMessage`, `Tooltip`, `Spinner`.
- `components/data/` — `Card`, `Tabs`.

**Icons** — 29 CTI line-icon components in `assets/icons/` (currentColor): `MagnifyingGlass`,
`Bug`, `ShieldLightning`, `ShieldUser`, `Sparkles`, `Robot`, `Leo`, `RadarAlt`, `Crosshairs`,
`Mitreattack`, `Ioc`, `Priority`, `BullseyeArrow`, `ChartLineUp`, `Spy`, `Bookmark`, `Star`, `Gear`,
`Globe`, `Lightning`, `Paperplane`, `Plus`, `Cross`, `Check`, `ChevronDown`, `ChevronRight`,
`ArrowUpRight`, `Ellipsis`, `Feedly`.

**UI kits** (`ui_kits/`)
- `website/` — marketing homepage recreation.
- `app/` — interactive analyst workspace (AI Feeds → brief → deliver).

**Specimen cards** (`guidelines/`) — Colors, Type, Spacing/Radii/Shadows, Brand logo + mark.

---

## Using the system
Consumers link `styles.css` and read components from `window.DesignSystem_2ce700` after loading
`_ds_bundle.js` (generated). All styling is driven by CSS custom properties — prefer the semantic
aliases (`--text-primary`, `--surface-brand`, `--border-subtle`) over raw palette tokens.

*System contents: 16 UI primitives + 29 CTI icons, ~19 Design-System-tab cards across Type / Colors /
Spacing / Brand / Components, and 2 UI kits (marketing website + analyst workspace).*
