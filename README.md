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

## Working on it

The source lives in `source/`.

```
cd source
npm install
npm run dev
```

## Rebuilding the site after a change

```
cd source
npm run build -- --base=./
cp -R dist/. ..
```

The `--base=./` matters: without it the built page asks for `/assets/...` at
the domain root, which is not where a project Pages site lives.

## Layout

| Path | |
|---|---|
| `index.html`, `assets/` | the built site that Pages serves |
| `source/src/components/` | the screens, by area — `editor/`, `report/`, `org/`, `ui/`, `layout/` |
| `source/src/data/` | the mock content, and `brand.ts` — the brand model, both brands and their assets |
| `source/src/state/store.tsx` | one store holding templates, reports, brands and org items |
| `source/src/styles/global.css` | every style, with the design tokens at the top |

Images (logos, cover artwork) are inlined as data URIs in
`source/src/data/brand.ts`, so the build stays one self-contained bundle.
