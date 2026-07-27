# Handoff: Feedly Report Builder

## Overview
This package contains a design recreation of the Feedly Threat Intelligence **Report Builder**
screen, plus the complete **Feedly Design System** it is built on. The screen has two views —
a **list view** (table of reports) and a **gallery view** (card grid) — toggled by a control next
to the search bar.

## About the Design Files
The design lives in **`Report Builder.dc.html`**. This is a *design reference*, not production code
to ship as-is. It is authored as a "Design Component" (a streaming HTML format) and depends on a
small custom runtime (`support.js`) plus custom tags (`<x-dc>`, `<x-import>`, `<sc-for>`, `<sc-if>`).
**Do not port the runtime.** Instead, recreate the screen in your target codebase (React, Vue,
Svelte, etc.) using your existing patterns — and use the bundled Feedly Design System for all
styling, components, and tokens. If you have no framework yet, React is the closest match since the
design-system components are React.

## Fidelity
**Mixed, intentionally:**
- **Chrome / layout / design system usage = high fidelity.** The sidebar, header, buttons, toolbar,
  table structure, gallery grid, spacing, colors, and typography are final and follow the design
  system exactly. Reproduce these precisely.
- **Row & card *content* = low fidelity (wireframe).** Inside the table rows and the gallery cards,
  text is deliberately rendered as **gray skeleton bars** and previews as **black-and-white wireframe
  blocks**. This is a styling choice to explore structure before real content. When implementing,
  replace skeleton bars with real bound data (report title, headline, article count, dates, author),
  and replace wireframe card previews with real report thumbnails/metadata.

## The Design System (bundled)
Everything needed to use the Feedly Design System is in **`_ds/feedly-design-system-2ce70007-045c-42a8-9e53-f2b615f6b343/`**:

- `_ds_bundle.js` — compiled React components, read off `window.DesignSystem_2ce700`
  (Button, IconButton, Badge, Chip, Avatar, Input, Textarea, Select, Checkbox, Radio, Switch,
  InlineMessage, Tooltip, Spinner, Card, Tabs) and 29 CTI line icons (MagnifyingGlass, Bug,
  ShieldLightning, ShieldUser, Sparkles, Robot, RadarAlt, Crosshairs, BullseyeArrow, Star, Gear,
  Globe, Lightning, Paperplane, Plus, Ellipsis, ChevronDown, Feedly, …).
- `tokens/` — `colors.css`, `typography.css`, `spacing.css` (spacing/radii/shadows/motion),
  `fonts.css` (`@font-face`), `base.css`. **All styling is driven by CSS custom properties — prefer
  the semantic aliases** (`--text-primary`, `--surface-brand`, `--border-subtle`, …).
- `styles.css` — global entry that imports the token files.
- `assets/fonts/` — self-hosted Aeonik Pro (display/headings) + Inter (body/UI) woff2 files.
- `readme.md` — the full design-system guide (brand voice, visual foundations, full component manifest).

The full *source* tree for the design system (individual component `.jsx` files, icon sources, the
two reference UI kits) is a separate project and is **not** included here; the compiled `_ds_bundle.js`
is sufficient to render. Ask if you want the source components copied in too.

## Screens / Views

### 1. App shell (always visible)
- **Left sidebar**, fixed `296px`, white, right border `1px var(--border-subtle)`, scrollable.
  - Workspace header: green gradient logo chip (`linear-gradient(135deg,#22E059,#2BB24C)`, `26px`,
    radius `7px`) + "Feedly / Threat Intelligence" (15px / 600) + ChevronDown + a collapse-panel icon.
  - Primary actions (icon + label, 34px rows, 14px/500): Create Intel Agent, Create AI Feed,
    Follow Sources, Research, Go To…
  - Main nav: Get Started (trailing "2/7 completed"), **Report Builder** (active — `var(--surface-subtle)`
    background, trailing "Beta"), Today, Threat Landscape, Automated Newsletters, Intel Profile,
    Integrations & API.
  - "Intel Agents" overline, then collapsible groups: Custom Agent (Lightning icons), TTPs
    (Crosshairs icons), Vulnerabilities (Bug icons), each with sample saved-search rows.
- **Main column**, scrollable, padding `30px 56px 60px`, inner `max-width:1320px` centered.
  - Header row: `h1` "Report Builder" (Aeonik Pro, 36px/600, `-0.02em`) + neutral "Beta" Badge;
    subtitle "Generate reports in minutes with accuracy and control" (16px, `--text-secondary`).
    Right side: green heart glyph (`--surface-brand`), a **secondary** Button "Templates" (with a
    template/layout icon), and a **primary** Button "Create Report".
  - Toolbar row: full-width search `Input` (placeholder "Search Reports", MagnifyingGlass icon-left)
    that flexes to fill, with a **segmented view toggle** pinned to the right (two `34×30` icon
    buttons in a `1px var(--border-strong)` rounded container — gallery grid icon and list-rows icon;
    the active one gets a `var(--surface-subtle)` background). List is the default.
  - Below the toolbar: a small **secondary** Button "Show filters" (filter icon).

### 2. List view (default)
A 6-column table (CSS grid `1.2fr 1.6fr 88px 120px 150px 56px`, `gap:20px`, row padding `18px 8px`,
`1px var(--border-subtle)` row dividers, hover `var(--surface-subtle)`).
- Header labels (13px, `--text-secondary`): **Title · Headline · Articles · Last edited · Created · Action**.
- Each row (currently wireframe):
  - **Title** — one skeleton bar (`var(--fdl-neutral-200)`). *Bind: report title.*
  - **Headline** — one or two skeleton bars (`var(--fdl-neutral-150)`). *Bind: report subline/summary.*
  - **Articles** — a count chip (`min-width:30px`, `height:22px`, radius `6px`,
    `background:var(--fdl-neutral-100)`, `color:var(--fdl-neutral-600)`, 13px/600). *Bind: number of
    articles in the report. Intended to be clickable (open the article list) — not wired yet.*
  - **Last edited** — skeleton bar. *Bind: e.g. "Jun 22, 2026".*
  - **Created** — skeleton bar. *Bind: author name.*
  - **Action** — small square placeholder. *Bind: an Ellipsis (⋯) overflow menu / IconButton.*

### 3. Gallery view (card grid)
Grid `repeat(auto-fill, minmax(224px, 1fr))`, `gap:22px`. Cards: white, `1px var(--border-subtle)`,
radius `12px`, padding `12px`, lift `-2px` + soft shadow on hover. Two card kinds:

- **Folder cards** (first few): the preview is a **stack of cards** — two offset rounded rectangles
  peeking behind a front card; the front card holds a 2×2 grid of gray tiles (its contents). Footer:
  a title skeleton bar with the **folder count** (e.g. 3, 8, 5) shown immediately to its right, a
  headline skeleton bar, and a neutral **"Folder" Badge** beneath. *Bind: folder name, item count.*
- **Report cards**: the preview is a **PDF-style page** (`184px`, white, `1px var(--border-strong)`,
  radius `8px`, padding `16px`, overflow hidden) containing varied wireframe blocks — a dark brand
  icon square, dark title bars, light text lines, gray image blocks, and a mini bar-chart. Footer:
  title + headline skeleton bars. *Bind: report thumbnail/preview + title + headline.*

## Interactions & Behavior
- **View toggle**: clicking the gallery icon shows the card grid and hides the table; the list icon
  does the reverse. Implement as a single `view: 'list' | 'gallery'` state; the active toggle button
  gets the `var(--surface-subtle)` background.
- **Hover**: nav items and table rows tint to `var(--surface-subtle)`; gallery cards translate
  `-2px` with a soft navy-tinted shadow. Filled buttons darken (no opacity, no shrink).
- **Motion**: 120–180ms, ease `cubic-bezier(0.2,0,0.1,1)`, no bounce.
- **Not yet wired** (left for implementation): search filtering, "Show filters" panel, the Articles
  count click-through, opening a folder, the Action overflow menu, Templates/Create Report actions.

## State Management
- `view: 'list' | 'gallery'` — toolbar toggle. (Defaults to `list`.)
- Future: `searchQuery`, `filtersOpen`, `reports[]` / `folders[]` data, selection state.

## Design Tokens
Use the bundled token files rather than hardcoding. Key values:
- **Brand green** `#2BB24C` (`--surface-brand`), gradient `#22E059 → #2BB24C`.
- **Ink / primary text** `#061427` (`--text-primary`); **secondary** `#757575` (`--text-secondary`);
  tertiary `--fdl-neutral-400`.
- **Surfaces**: page `#fff`, subtle `#F6F7F8` (`--surface-subtle`), neutrals `--fdl-neutral-100/150/200/300`.
- **Borders**: subtle `rgba(6,20,39,0.08)` (`--border-subtle`), strong `#D9D9D9` (`--border-strong`).
- **Radii**: inputs/controls 8px, cards 12px, pills/badges full.
- **Type**: Aeonik Pro (display/headings, tight), Inter (body/UI, 1.5–1.6). Full scale in
  `tokens/typography.css`.
- **Shadows/spacing/motion**: see `tokens/spacing.css`.

## Assets
- Self-hosted fonts in `_ds/.../assets/fonts/` (Aeonik Pro + Inter woff2).
- All icons are code (currentColor React components in `_ds_bundle.js`). A few small UI glyphs in
  the prototype (collapse-panel, heart, list/gallery/filter/template) are inline SVG drawn to match
  the set, since the design system has no exact equivalent — swap for your icon library or keep them.
- No raster images are used; gallery previews are CSS wireframe blocks.

## Files
- `Report Builder.dc.html` — the design (template markup + a small logic class with the sample data
  and the view-toggle state). Read this for exact structure, inline styles, and the data shape.
- `support.js` — the prototype runtime (reference only; do not port).
- `_ds/feedly-design-system-2ce70007-045c-42a8-9e53-f2b615f6b343/` — the full Feedly Design System
  (bundle, tokens, fonts, guide).
