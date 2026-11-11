# Report Builder 2.0 prototype: handoff

Paste this into a new chat to pick up where we left off.

## What this is

React prototypes of Feedly's Report Builder 2.0, comparing ways of handling brand styles, themes, and headers/footers across many templates. Six options live side by side in one published artifact, switched from the org menu ("ACME North America", top left).

- **Artifact:** https://claude.ai/artifact/CiMmzLTonfZcvakBVtDjuk (latest Version 219). Publish to this URL after changes.
- **Repo on Rui's Mac:** `~/Documents/GitHub/RB-Test` (connected folder `RB-Test`). Rui pushes with GitHub Desktop. `README.md` there documents every option in detail; read it first.
- **Artifact host file:** `RB-Test/Claude outputs/report-builder-2-artifact.html`. Stage it to start working on the artifact.

## Options (menu label, build letter, folders)

| Menu | Build | Built folder | Source |
|---|---|---|---|
| A: Parameters V2 | B | `b/` | `source-b/` |
| B: Brand contains all | C | `c/` | `source-c/` |
| C: Header/Footer separate inline | G | `g/` | `source-g/` |
| D: Separate Header/Footer Editor | I | `i/` | `source-i/` |
| E: Brand Themes | K | `k/` | `source-k/` |
| F: Separate Themes | L | `l/` | `source-l/` (branch of K) |

Retired: D, E, F, H, J (folders remain). Labels live in each source's `src/variant.ts` (`VARIANTS`, `VARIANT_LABEL`).

## How to build and publish (on the Mac, with `device_bash`)

1. Edit files in `~/mnt/RB-Test/source-x/src` in place: python read-modify-write, written via a tmp file plus `os.replace`. Some files refuse a plain `cp` over them.
2. Build with `$HOME/rbb.sh X source-x rbbuild-x x`, for example `$HOME/rbb.sh L source-l rbbuild-l l`. It runs tsc and `vite build --base=./`, then copies the output to `x/`.
3. Stage the new `x/assets/index-*.css` and `index-*.js` (exact names come from the build output).
4. In the artifact host HTML, replace the `<script type="text/plain" id="rb-css-X" data-enc="gz64">` and `id="rb-js-X"` payloads with `base64(gzip(file, 9))`. The loader line `var ok = { B: 1, C: 1, G: 1, I: 1, K: 1, L: 1 };` lists the builds. Publish the host file with `url` set to the artifact URL.
5. Update `README.md` (edit in place on the Mac).

Notes:

- When moving a file to the Mac, commit it under a unique filename every time; same-name commits can deliver stale content.
- Delete permission on the Mac may need re-granting in a new session.
- To add a new option, use `$HOME/addvariant.py LETTER "Label" source-*/src/variant.ts`, then rebuild all builds.

## Rui's working rules

- Concise replies. No em dashes in UI copy. American spelling. Surface roadblocks early.
- After changes: update the sources, builds and README on the Mac, then publish the artifact. Rui has asked to save tokens, so batch changes and publish at the end of a batch.
- Figma file: `oFeGy51UBRzDS43LmnLaim` (Report Builder 2.0). The figma.com asset URLs are blocked here. To get exact SVG icons, use `use_figma` with `node.exportAsync({format:"SVG_STRING"})`.

## Current state: E, Brand Themes (build K)

- **Brand panel (Org Profile):** table design, with tabs Colors and typography, Assets, Visualizations, Report Builder.
  - The palette is Primary, Secondary, Tertiary, Background, plus any number of extra colors.
  - Text style colors come from the palette only.
  - Report Builder holds the structure colors and the Report themes list (set default).
- **Theme:** layout only (header, footer, margins, light background). Every brand has the "Simple" default theme.
- **Report Design tab:** brand plus theme cards with an "Edit" button. Edit shifts the tab into the theme (back link at the top), and the header and footer become editable on the page.
- **Dynamic objects:** the theme places the TLP badge, date and page count; each report sets the TLP rating and date.
- **Template editor:** no design. Grey header/footer placeholders in monospace.

## Current state: F, Separate Themes (build L)

- **Report tabs:** Ask AI, Content (was Context; building blocks at the top, then Parameters and Sources) and Design.
- **Design tab** (Figma "ReportLeftPanel" 4546:212352):
  - The brand picker sits above a light grey box (#F7F7F7).
  - Inside the box, Color palette is always open: swatches, Text styles (all 13px), and Dividers and tables. Then Font, then Assets as draggable 50px tiles.
  - Then Document margins (Narrow, Normal, Wide).
  - Brand edits wait in a "Save brand changes" bar.
- **Brand:** the default is "Feedly" (Feedly logo, colors and green hero image). The brand has no header or footer.
- **Header and footer:** they belong to the report and are designed on the page.
- **Themes button:** brush icon, top right, after version history. It opens a dropdown (Figma 4510:198913):
  - "Select theme" plus a help line.
  - Theme cards: a thumbnail with half header and half background with text, a brand badge, the name, and a "···" menu.
  - "Save as new theme" at the bottom.
- **What a theme saves:** brand plus layout (header, footer, margins). Every brand's standard theme is "Starter theme", with the green hero artwork behind the logo.
- **"Changed":** a layout change marks the current theme "Changed". Brand changes don't count; they flow into the theme.
- **"···" menu:** Push changes to style, Reset to theme, Rename theme (modal), Delete theme.

## Shared across all options

- **Vulnerability Agent top bar** (Figma "PanelHeader" 4510:205274): alerts, API and share icons (exact Figma SVGs in `src/assets/agent/`), Create Report as a tertiary icon-only button, Analyze, Save changes (disabled) and more.
- **Create Report menu** (`components/report/TemplateListMenu.tsx`):
  - Search, then Recommended templates (the 5 most recently used; "Vulnerability Advisory (Matt)" is excluded).
  - All templates: Feedly, Custom and Legacy, each opening in place with a back header.
  - A template with several audiences appears once and asks for the audience when the report opens.
- **Report Builder page:**
  - "Manage templates" has no icon.
  - Under All Audiences, a card's "View template" has a right arrow and opens a "Choose audience" step.

## Open questions

- The insight card's "Create report" still uses the old audience-first menu.
- Recommended templates is based on recency; Rui may prefer a fixed set.
- Should "Vulnerability Advisory (Matt)" be deleted from the prototype entirely?
- The TLP and date in a generated report's body text aren't linked to the header and footer badges.
