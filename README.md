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

## Four versions: A (locked), B, C and D

The prototype runs as two parallel versions, switched from the org menu
("ACME North America", top left):

- **Version A** is the locked baseline. It is served from the repository root
  (`index.html` + `assets/`), built from `source/`. Do not change it: `source/`
  is frozen, and the git tag `version-a-locked` marks the point it was frozen.
- **Version B** is served from `b/`, built from `source-b/`: the revised
  create-report flow with audience picked before the template (audience
  pre-selection) and parameters as one flat list (Option A). The questions sit in the conversation, and the
  message box only appears once the report is written, as in C.
- **Version C** is served from `c/`, built from `source-c/`: the same flow with
  the audience asked during elicitation and topic parameters kept apart from
  general ones (Option B). While the questions are open, the report skeleton holds still
  and a looping, grey-scale skeleton of the elicitation card being answered
  fades in over it, above "Waiting for your answers...".

Each build knows which version it is through the `VITE_VARIANT` environment
variable, which the org menu uses to show the current version and link to the
other one.

- **Version D** is served from `d/`, built from `source-d/`: the same flow as
  C, but while the questions are open the report page shows the original
  shimmering loading skeleton (as in A and B) instead of C's waiting card, so
  the two can be compared.

## Working on B or C (same steps in `source-c`, with `VITE_VARIANT=C` and `../c`)

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
