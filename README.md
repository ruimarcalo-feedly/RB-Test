# Report Builder 2.0 — clickable prototype

Static prototype for user testing. The repository root **is** the site: open
`index.html`, or visit the Pages URL.

Covers the report builder, the template editor with its Context, Parameters and
Design tabs, the report editor and its elicitation flow, the Org Profile brand
editor, and the branding system that ties them together — two brands, their
logos and cover artwork, and the header and footer bands that follow whichever
brand a template is set to.

React + TypeScript + Vite, plain CSS with design tokens. No backend: every
screen runs on mock data in the browser, and nothing is fetched from a third
party at runtime, so it works offline and on a locked-down network.

## Hosting on GitHub Pages

Settings → Pages → Source: `main` / `/ (root)`. The built files at the root
reference their assets relatively, so the site works at
`https://<user>.github.io/RB-Test/`. `.nojekyll` keeps Pages from running the
files through Jekyll.

## Report Builder page (all versions)

"Manage templates" has no icon. Under All Audiences, a template card's menu
shows "View template" with a right arrow when the template serves several
audiences: it opens a "Choose audience" step, and picking one opens that
audience's template.

## Vulnerability Agent (all versions)

The agent page's top bar follows Figma "PanelHeader" (node 4510:205274):
alerts, API and share icons, Create Report as a tertiary icon-only button,
Analyze, Save changes (disabled until there is something to save) and more.
Create Report opens the "TemplateList" menu: a search over template names,
Recommended templates (most recently used, with their audiences; the custom Vulnerability Advisory (Matt) is left out), then All
templates: Feedly templates, Custom templates and Legacy templates, each
opening in place with a back header. A template written for several
audiences shows once and asks for the audience when the report opens.

## Seven versions, shown as A to G

The version menu names them A to G. The build letters, folders and the
sections below keep their original letters:

| Menu | Build letter | Folder | Source |
| --- | --- | --- | --- |
| A: Parameters V2 | B | `b/` | `source-b/` |
| B: Brand contains all | C | `c/` | `source-c/` |
| C: Header/Footer separate inline | G | `g/` | `source-g/` |
| D: Separate Header/Footer Editor | I | `i/` | `source-i/` |
| E: Brand Themes | K | `k/` | `source-k/` |
| F: Separate Themes | L | `l/` | `source-l/` |
| G: Styles everywhere | M | `m/` | `source-m/` |


The prototype runs as parallel versions, switched from the org menu
("ACME North America", top left):

- **Version A** is retired: it is out of the version menu and the artifact,
  and the root `index.html` now redirects to `b/`. Its build (`assets/`) and
  `source/` stay in the repo; the git tag `version-a-locked` marks it.
- **Version B** is served from `b/`, built from `source-b/`: the revised
  create-report flow with audience picked before the template (audience
  pre-selection) and parameters as one flat list (Option A). The questions sit in the conversation, and the
  message box only appears once the report is written, as in E.
  B also follows the "Templates V2 Release" Figma page: typed questions
  (Vulnerability suggestions, Org Profile items with an "Other item" search,
  date ranges), parameter-less templates, the new Add/Edit parameter dialog,
  parameter rows with locate and delete (delete removes every chip; a chip's
  x removes just that one), editable parameters in the Details tab, the
  Intel Agent "(N items selected)" header, and the Ask AI entry point on the
  feed page (Analyze).
  From E (and now in every version), the Create report carousel opens on "All Audiences": one card per
  template, its badge counting the audiences it serves ("4 audiences"), and
  the audience is asked as the first question once the report starts. Picking
  an audience in the filter shows that audience's pairings, as before.
- **Version C** is served from `c/`, built from `source-c/` (a branch of B):
  header and footer styles live inside a brand. A brand can hold several of
  each, one marked Default; applying a brand applies its default header and
  footer, so swapping the brand swaps them too. A template can pin another of
  its brand's styles. The report's Design tab edits the brand in place: the
  building blocks come first, then one box per brand (Figma "Rebound"): the
  brand picker is its header row, then Typography styles (summary + Edit,
  which opens the brand's full Org Profile panel), Images (logo, background
  image, others, and a + to upload one), and Header style / Footer style
  ("Save current style" saves the band on the report into the brand). Only
  when no brand exists at all is the box greyed out behind "Create your
  brand" (New Brand dialog, then the brand's full panel; applied when it
  closes). With brands, a new report gets one automatically; a reopened
  report shows "Select brand" with the sections disabled until one is
  picked. The dropdown lists the brands and "Create new brand".
  The report's brand box ends with a grey lip holding a "Set as template
  default" button (plain "Template default" text once set) that puts the brand,
  and the header/footer styles in use, on the template.
  Template editor: the page shows the brand's header and footer (editable on
  every template, with the same Design tab brand box) and the template's
  content in a "Template Prompt" container set in monospace, always outlined
  with a dashed line; its centred badge is always shown except while the
  header is hovered or selected. Feedly templates show the blue notice edge to
  edge across the top of it and a white, read-only container;
  custom templates are editable and white.
  Every place an image is added (band background, an image slot in a header
  or footer, an image block in the document) shows drag and drop / Upload
  image, then a "Brand images" section with the brand's images to pick. Drag a
  band's inner edge to resize it. With no style
  applied, the Header and Footer cards say "Choose a header" / "Choose a
  footer" and open the styles modal: the brand's saved styles, "Start from
  scratch", and presets (Logo left, Logo centered, Logo and title, Logo and
  TLP, Tinted band, Cover image; footers: Page number, Label and page number,
  Label, TLP and page number, Logo and page number, Tinted band) drawn with the
  brand's logo, artwork and colors. A preset is applied unsaved ("Not saved",
  "Save…" adds it to the brand). Edit the band on
  the report, then "Save style" (into the brand). Once a saved style is
  edited, its card shows "Edited" and "Save…", which opens a dialog: update
  the style (for every report using the brand) or save as a new style with a
  name. "Discard changes" is in the card's "···" menu. Tabs (the side panel,
  the background popover, and the image Upload / Embed panel) follow the DS
  "Tabs" component, Size=Medium, set to fill: each tab takes an equal share
  of the row with its label centered. The report title sits 40px below the
  header, in reports and templates. With no brand, saving starts "Create new
  brand" (the Org Profile's New Brand dialog; the brand comes with Feedly's
  colors, type, logo and background image, and is edited in the Design tab). The Org Profile brand panel
  lists the header and footer styles; clicking one opens an editor with only
  the band and a grey stand-in page. Report Builder settings list the brands
  reports can use (new brands are added automatically; removing one that a
  template uses asks first and clears it from those templates). A report gets
  the template's brand, else the only brand in settings, else the last
  elicitation question asks, with "Always use for this template". Version C
  starts with Acme Inc in the Org Profile but not in settings, so the first
  report is unbranded.

Each build knows which version it is through the `VITE_VARIANT` environment
variable, which the org menu uses to show the current version and link to the
other one.

  Every template starts in a greyscale "Default brand" (Acme Inc is there
  to swap to). A brand has one header and one footer: Default brand's header
  is a grey gradient strip with a "Logo" placeholder on the left, and its
  footer a TLP badge in the middle and the page number on the right. They are
  changed only in a template (Design tab, on the page): the card then shows
  "Edited" and "Apply to brand" (which updates every template using the
  brand), with "Discard changes" in its menu. Switching the template's brand
  drops changes not applied. In a report they are shown, not edited ("edit
  it in the template"). The Org Profile panel shows them read-only.
  Design tab (Nov 2): no box around the brand. The Brand picker heads the
  section and a rule runs from it down the sections it governs: Colors (the
  brand's saved colors, + to add one, x to remove an unused one), Font (one
  font for every style), Typography (Heading 1 to Caption, each with a small
  swatch that only offers the saved colors) and Layout (the header and
  footer). Any change, header and footer edits on the page included, brings
  up a bar at the foot of the sidebar: "Unsaved changes to <brand>" with
  Discard and "Save brand changes", which updates every template using the
  brand. In a report the same section is shown read-only.
  Brands are called "Brand styles" in the Org Profile. The brand panel has
  four tabs: Typography, Assets, Visualizations and Report Builder (Report
  structure, Header styles, Footer styles).
- **Version G** is served from `g/`, built from `source-g/` (a branch of C):
  headers and footers are Feedly's own layouts, not something the user
  builds. There are no slots, alignment or background controls, and no saved
  header/footer styles in the brand.
  - The brand holds typography, colors, structure colors and four fixed image
    slots: Logo (for light backgrounds), Light logo (for dark or image
    backgrounds), Hero image and Footer image. In the Design tab the brand is
    a flat section (no outline): a "Brand" dropdown with, right under it and
    unlabelled, three small cards for reviewing only: Typography styles, Structure styles and a strip of
    the brand images. "Edit" beside the brand's name (left of the chevron)
    opens the brand panel, where the image slots are uploaded. A divider
    separates the brand from the Header and Footer rows. The Feedly
    brand exists from the start; the brand menu adds Rename brand and
    Duplicate brand next to Create new brand. Every template starts in the
    Feedly brand.
  - In the Design tab, Header and Footer are cards drawn like the ones in the
    Headers / Footers panel, with "Change".
  - Two ways to pick a layout, to compare:
    - Click the header (or footer) on the page: a horizontal gallery opens
      under it (above the footer), a little wider than the page. It stays put
      while you hover; hovering previews the layout on the page, clicking keeps
      it, moving off or Escape puts the old one back.
    - "Change" on the Header or Footer row in the Design tab: a "Headers" (or
      "Footers") panel (344px wide) slides open beside the sidebar and pushes the page
      across, with the layouts as cards in a column. Hover previews, click
      keeps (the panel stays open), the X or Escape closes it.
  - A layout of another height eases in, and the text below follows.
  - Inside a layout, labels can be edited in place and the TLP badge opens a
    level picker (FIRST TLP 2.0 colors). Swapping the brand keeps the layout.
  - In a report, once the brand or a layout differs from the template's, a
    footer appears at the bottom of the Design tab (like Regenerate in the
    Context tab): "Undo changes" puts the template's brand, layouts and pages
    back, "Save styles to template" saves them on the template.
  - Header layouts, most appealing first (and the reports in the Figma board
    "Report Branding Analysis" they come from): Cover artwork (Feedly's own
    cover image with the logo), Hero banner (TVA, E.ON, Amtrak),
    Title banner (FBI PIN), Color band (Miele, Cisco), Logo masthead (Maryland
    ISAC, City of Austin).
  - Footer layouts: Footer strip (Amtrak), Logo, notice and page (Intuitive),
    Disclaimer and page (Amtrak, Health-ISAC), Marking and page (U//FOUO).
    Reports with sidebars (Army CI) were left out.
  - "No header" / "No footer" is the first option in both the gallery and the
    side panel.
  - Feedly's own templates come with the Feedly brand, the Cover artwork
    header (cover only) and the Logo, notice and page footer (all pages).
    Other templates and their reports start with no header or footer; one
    appears only once picked (or saved to the template).
  - The Headers / Footers panel has a "Show on" toggle: Cover only or All
    pages; the band's tag on the page says which. Templates keep this too.
  - The report is one long document until export, so page numbers read
    "Page #". A layout whose brand has no
    logo simply shows none.

- **Version I** is served from `i/`, built from `source-i/` (a branch of G):
  header and footer styles are a Report Builder library of their own, not
  part of the brand or the template. The brand is only styles and assets; a
  template (or report) only picks a style.
  - On the page (template editor, and the report once written): hovering an
    empty header shows "Add header"; hovering one in place shows "Change
    header". Same for the footer. Only the TLP badge changes in place.
  - Either opens the Headers / Footers modal: "New header style", your
    styles (each with "Used by N templates" and ··· Edit, Duplicate, Delete),
    then Feedly presets (two of each, ··· Customize). Picking one applies it
    and closes the modal; "Remove header" in the footer when one is applied.
  - Editing only happens in the style designer, a modal with just the header
    (or footer) on a page: Name, Show on (Cover only / All pages), Layout
    (Blank, or a Feedly preset). Presets: click labels to change their words,
    the TLP badge for its starting level. Blank: C's slot editor. Editing a
    style in use says "Used by N templates. Saving updates all of them." A
    new style is applied where it was made.
  - Report editor: no Design tab; tabs are B's (Ask AI, Sources, Details).
    Details shows C's collapsed parameters (chip and value, "Edit
    parameters" to open the fields, "Done" to close them).
  - Template editor Design tab: building blocks and the brand section
    (picker with Edit, typography, structure, images); no header or footer.
  - Feedly's templates start on two seeded styles, "Feedly cover" and "Feedly
    internal footer", so editing either shows the reach (28 templates).

- **Version K** (menu E, "Brand Themes") is served from `k/`, built from
  `source-k/` (a branch of C), inspired by Typeform's brand kits.
  - Brand panel (Org Profile brand item) is back to the table design, with
    tabs Colors and typography, Assets, Visualizations and Report Builder.
    Every color is decided in the brand, once:
    - Colors and typography: the palette (Primary, Secondary, Tertiary,
      Background, then as many more colors as needed), then Text styles
      (font and color per style; the color can only be a palette color).
      Changing a palette color moves every style that used it.
    - Assets: the Logo row first (the logo object every theme's Logo shows,
      with Replace), then other images.
    - Report Builder: Report structure (divider and table colors, palette
      only) and Report themes (cards, "Make default").
  - Every brand comes with a greyscale "Simple" theme as its default. Reports
    start on the brand's default theme and can switch.
  - Themes are edited on the report itself. In the Design tab (brand, a
    full-width rule, then the theme cards), a card's Edit button or "New theme"
    shifts the Design tab into that theme (with a "Themes" back link at the
    top), and the page's header and footer become editable in place (slots,
    Background, Cover only / All pages). The theme view sums it up: name, Margins (Narrow,
    Normal, Wide), Background (the brand's light colors only, so the brand's
    text stays readable) and Header and Footer thumbnails, which only select
    the band on the page. A theme is layout only; text colors and fonts are
    the brand's. Its foot has
    Cancel, Save as new and Save (Create theme for a new one), with a note
    that saving updates every report using the theme.
  - The brand panel's Report themes section only lists the themes and sets
    the default; there is no separate theme editor any more.
  - Dynamic objects: a theme places the TLP badge, date and page count; each
    report sets the TLP rating and the date by clicking them on the page.
    The values belong to the report, so they stay when the theme changes. A
    report can't change the theme's layout.
  - Template editor: Context and Parameters only, all monospace, no brand or
    theme. Grey "Header will go here" / "Footer will go here" areas, set off
    from the prompt by dotted lines across the canvas.
  - Report editor: Ask AI, Context, Design. Design has the brand (with Edit,
    which opens the brand panel) and its themes as cards: click one to apply
    it, Edit to edit it, "New theme" to add one.
- **Version L** (menu F, "Separate Themes") is served from `l/`, built from
  `source-l/` (a branch of K). The theme is separate from the brand's styles:
  - Report Design tab follows Figma "ReportLeftPanel" (node 4546:212352):
    the brand picker sits above a light grey box with Color palette
    (always open: the colors, the text style colors, and the divider and
    table colors, right in the box), Font, and Assets (tiles that drag onto the page or a header slot,
    plus an add tile). Then Document margins (Narrow, Normal, Wide). The
    report's tabs are Ask AI, Content and Design; Content (was Context) has
    the building blocks at the top, then Parameters and Sources. Brand changes wait in a "Save brand changes" bar. The
    brand has no header or footer. The starting brand is Feedly (its logo
    and colors).
  - The header and footer are the report's, designed on the page (click
    either one).
  - A "Themes" button (brush icon) at the top right, after version history, opens a
    dropdown, Figma node 4510:198913: "Select theme" with a line on what a
    theme is, then one card per theme, then "Save as new theme". Each card: its thumbnail, a
    badge with the brand it saves, and its name with a "···" menu. Click a
    card to apply it (its brand comes with it). A theme saves the brand and
    the layout together: header, footer and margins.
  - The current theme's card shows "Changed" once the layout differs from
    the saved theme. Changes to the brand don't count: they flow into the
    theme on their own. The "···" menu: Push changes to style, Reset to
    theme, Rename theme (opens a modal), Delete theme (not the brand's last).
    "Save as new theme" names and saves what is on the page as a new theme.
  - Every brand's standard theme is "Starter theme", with the brand's green
    hero artwork behind the logo in its header.
  - Theme thumbnails show the header on the top half, then the background
    with the title, a line of text and a rule in the brand's styles.
- **Version J** (retired, was menu E) is served from `j/`, built from `source-j/` (a branch of I):
  the template is only the prompt, the brand is only a palette, a font and a
  logo, and headers and footers are designed in the report.
  - Brand (Org Profile): Logo, Font, and Colors: Primary, Accent, Background,
    then secondary colors (+ to add, x to remove).
  - Template editor: Context and Parameters only. Grey "Header" and "Footer"
    placeholders above and below the prompt, which shows no brand colors.
  - Report editor: Ask AI, Sources, Details. Details holds the template and
    the brand. Click the header or footer on the page to edit it inline
    (slots, Background, Cover only / All pages). Background only offers the
    brand's palette, stored by role, so a style recolors with the brand.
  - Header and footer styles are their own library. The band's tag shows the
    style ("Logo header · Edited"); its menu: Update style, Save as new style,
    Discard changes, Rename style, Change style (gallery, or blank), Remove.

D, E, F, H and J were retired too: they are out of the version menu and the
artifact. Their folders (`d/`, `e/`, `f/`, `h/`, `source-d/`, `source-e/`,
`source-f/`, `source-h/`, plus `j/` and `source-j/`) stay in the repo until deleted.

## Changes from November 5 to 11

- **E (K): layout editor.** The Layouts tab has a "Report layout" title with an
  "Edit layout" button. It opens a full-screen editor with only the header,
  the footer and a grey "Content goes here" area. The margin guides show only
  while the margin toggle is hovered. Save layout stores it in the brand.
- **F (L): themes rework.** The report editor's tabs are Ask AI, Content and
  Themes. The Themes tab lists the themes ("Main report" to start) with an
  Edit button on each card; clicking a card applies it. The theme editor holds
  the name, the brand (with Edit), Text colors, Tables and structures, the
  header and footer, and the margins (guides on hover). Changes wait in an
  "Unsaved changes" bar with Dismiss and Save changes. "Create new theme"
  takes a PDF and generates a brand and a theme from it (mocked with Acme).
  Brands now keep only lists of primary, secondary and neutral colors; the
  Org Profile has no Report Builder tab. A block's handle menu has Edit theme.
- **G (M): Styles everywhere.** A branch of E with a Styles tab in the
  template editor and an editable header and footer on the template.
  Recoloring a block in a template changes the style; in a report it only
  changes that block.
- **A (B):** the Template Prompt container from C, with the design unlocked
  on Feedly templates.

## Working on B, C, G and I (same steps in `source-c`, `source-g`, `source-i`, with `VITE_VARIANT` set to that letter and the matching output folder)

```
cd source-b
npm install
npm run dev
```

## Rebuilding B after a change

```
cd source-b
VITE_VARIANT=B npm run build -- --base=./
rm -rf ../b && cp -R dist/. ../b
```
