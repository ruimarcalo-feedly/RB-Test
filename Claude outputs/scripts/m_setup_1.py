import os, re, sys

ROOT = sys.argv[1]
M = os.path.join(ROOT, "source-m/src")


def rd(p):
    return open(p, encoding="utf-8").read()


def wr(p, s):
    open(p + ".tmp", "w", encoding="utf-8").write(s)
    os.replace(p + ".tmp", p)


def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected 1 match, found {n}: {old[:90]!r}")
    return s.replace(old, new)


def resub1(s, pat, new, label, flags=re.S):
    out, n = re.subn(pat, new, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"[{label}] pattern not found")
    return out


# ================================================================ variant.ts everywhere
for src in ["b", "c", "g", "i", "k", "l", "m"]:
    p = os.path.join(ROOT, f"source-{src}/src/variant.ts")
    s = rd(p)
    if '"M"' in s:
        continue
    s = sub1(s, 'export type Variant = "A" | "B" | "C" | "G" | "I" | "K" | "L";', 'export type Variant = "A" | "B" | "C" | "G" | "I" | "K" | "L" | "M";', f"{src} type")
    s = sub1(s, 'export const VARIANTS: Variant[] = ["B", "C", "G", "I", "K", "L"];', 'export const VARIANTS: Variant[] = ["B", "C", "G", "I", "K", "L", "M"];', f"{src} list")
    s = sub1(s, '  L: "F: Separate Themes",\n', '  L: "F: Separate Themes",\n  M: "G: Styles everywhere",\n', f"{src} label")
    s = sub1(s, 'env === "K" || env === "L" ? env : "A";', 'env === "K" || env === "L" || env === "M" ? env : "A";', f"{src} env")
    wr(p, s)

# ================================================================ G: template keeps its own styles until saved
p = os.path.join(M, "data/mockData.ts")
s = rd(p)
s = resub1(
    s,
    r"(export interface Template \{\n(?:.*\n)*?)(  brandId\?: string;\n)",
    r"""\1\2  /** Version G: the template's layout and brand changes not saved into the brand. */
  layout?: import("./theme").ReportTheme;
  stylePatch?: Partial<import("./brand").Brand>;
""",
    "template type",
    flags=0,
)
wr(p, s)

# ================================================================ schema: an instance color
p = os.path.join(M, "components/editor/blockSchema.tsx")
s = rd(p)
s = sub1(s, "  defaultInlineContentSpecs,\n", "  defaultInlineContentSpecs,\n  defaultStyleSpecs,\n", "core import")
s = sub1(
    s,
    'import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";',
    'import { createReactBlockSpec, createReactInlineContentSpec, createReactStyleSpec } from "@blocknote/react";',
    "react import",
)
s = sub1(
    s,
    "/* createReactBlockSpec returns a factory, so the spec is the call. */\nexport const schema = BlockNoteSchema.create({",
    """/* Version G: a color put on a piece of text in a report, from the brand's
   palette. It belongs to that text, not to the style. */
const BrandColor = createReactStyleSpec(
  { type: "brandColor", propSchema: "string" },
  { render: (props) => <span style={{ color: props.value }} ref={props.contentRef} /> }
);

/* createReactBlockSpec returns a factory, so the spec is the call. */
export const schema = BlockNoteSchema.create({
  styleSpecs: { ...defaultStyleSpecs, brandColor: BrandColor },""",
    "schema",
)
wr(p, s)

# ================================================================ toolbars
p = os.path.join(M, "components/editor/BlockNoteCanvas.tsx")
s = rd(p)
s = sub1(s, 'import { schema, type TemplateBlock } from "./blockSchema";', 'import { schema, type TemplateBlock } from "./blockSchema";\nimport { FormattingToolbarController } from "@blocknote/react";\nimport { RecolorToolbar } from "./RecolorToolbar";', "canvas import")
s = sub1(s, "      slashMenu={false}\n      sideMenu={false}\n", "      slashMenu={false}\n      sideMenu={false}\n      formattingToolbar={false}\n", "canvas prop")
s = sub1(s, "      <AlignedSideMenu />\n      {!readOnly && <BrandFilePanelController />}", "      <AlignedSideMenu />\n      {!readOnly && <FormattingToolbarController formattingToolbar={RecolorToolbar} />}\n      {!readOnly && <BrandFilePanelController />}", "canvas toolbar")
wr(p, s)

p = os.path.join(M, "components/report/ReportDocument.tsx")
s = rd(p)
s = sub1(s, 'import { useCreateBlockNote } from "@blocknote/react";', 'import { FormattingToolbarController, useCreateBlockNote } from "@blocknote/react";\nimport { RecolorToolbar } from "../editor/RecolorToolbar";', "doc import")
s = sub1(
    s,
    '<BlockNoteView editor={editor} editable={editable} theme="light" slashMenu={editable} sideMenu={false} filePanel={false}>\n      {editable && <AlignedSideMenu />}',
    '<BlockNoteView editor={editor} editable={editable} theme="light" slashMenu={editable} sideMenu={false} filePanel={false} formattingToolbar={false}>\n      {editable && <AlignedSideMenu />}\n      {editable && <FormattingToolbarController formattingToolbar={RecolorToolbar} />}',
    "doc toolbar",
)
wr(p, s)

# ================================================================ report editor: start from the template's styles; recolor = instance
p = os.path.join(M, "components/report/ReportEditor.tsx")
s = rd(p)
s = sub1(s, "const [brandPatch, setBrandPatch] = useState<Partial<Brand>>({});", "const [brandPatch, setBrandPatch] = useState<Partial<Brand>>(() => template.stylePatch ?? {});", "rep patch")
s = sub1(s, "const [layoutDraft, setLayoutDraft] = useState<ReportTheme | null>(null);", "const [layoutDraft, setLayoutDraft] = useState<ReportTheme | null>(() => template.layout ?? null);", "rep layout")
s = sub1(s, 'import { BrandDesignF, BuildingBlocks } from "./BrandDesignF";', 'import { BrandDesignF, BuildingBlocks } from "./BrandDesignF";\nimport { RecolorContext } from "../editor/RecolorToolbar";', "rep import")
s = resub1(
    s,
    r"(\n            <ReportCanvas\n.*?\n            />\n)",
    r"""
            {/* Version G: recoloring text here colors that text only. */}
            <RecolorContext.Provider value={{ mode: "instance", brand }}>\1            </RecolorContext.Provider>
""",
    "rep provider",
)
wr(p, s)

# ================================================================ template editor: the Styles tab and an editable page
p = os.path.join(M, "components/editor/TemplateEditor.tsx")
s = rd(p)
s = sub1(s, 'import { useEffect, useRef, useState } from "react";', 'import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";', "te react")
s = sub1(
    s,
    'import { EMPTY_BAND, bandVars, type Brand } from "../../data/brand";',
    '''import { DEFAULT_BRAND, EMPTY_BAND, bandVars, brandVars, type Brand } from "../../data/brand";
import { brandThemes, defaultTheme, layoutOf, themeSizeVars, themedBrand, type ReportTheme } from "../../data/theme";
import { BrandDesignF } from "../report/BrandDesignF";
import { ThemePanel } from "../themes/ThemePanel";
import { PageBandEditor } from "./PageBandEditor";
import { RecolorContext, type Recolor } from "./RecolorToolbar";''',
    "te imports",
)
s = sub1(s, 'type Tab = "context" | "parameters" | "design";', 'type Tab = "context" | "parameters" | "design" | "styles";', "te tab type")
s = sub1(s, '    if (t !== "design") setActiveBand(null);', '    if (t !== "styles") setActiveBand(null);', "te goTab")
s = sub1(s, '      if (target.closest(".bobj-card, .brand-scope, .menu")) return;', '      if (target.closest(".bobj-card, .brand-scope, .menu, .lay-sec")) return;', "te clickoff")

hooks = '''
  /* ---------------- Version G (Nov 4): the Styles tab ----------------
     The same Styles tab as the report: the brand, its layout and its styles,
     designed here on the template. Changes wait in the "Update brand" bar;
     until then they stay on this template (and reports made from it start
     with them). Recoloring text here changes the style itself. */
  const gBase = brands.find((b) => b.id === (template?.brandId ?? DEFAULT_BRAND.id)) ?? brands[0];
  const [gPatch, setGPatch] = useState<Partial<Brand>>(() => template?.stylePatch ?? {});
  const gBrand = useMemo(() => (gBase ? { ...gBase, ...gPatch } : undefined), [gBase, gPatch]);
  const gBrandDirty = Object.keys(gPatch).length > 0;
  const gSaved = defaultTheme(gBase);
  const [gDraft, setGDraft] = useState<ReportTheme | null>(() => template?.layout ?? null);
  const gLayout = gDraft ?? defaultTheme(gBrand);
  const gLayoutDirty = !!gDraft && (!gSaved || layoutOf(gDraft) !== layoutOf(gSaved));
  const gKey = JSON.stringify([gPatch, gDraft && layoutOf(gDraft)]);
  const [gDismissed, setGDismissed] = useState<string | null>(null);
  const gShowBar = (gBrandDirty || gLayoutDirty) && gKey !== gDismissed;
  useEffect(() => {
    if (!template) return;
    updateTemplate(template.id, { stylePatch: gBrandDirty ? gPatch : undefined, layout: gDraft ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gPatch, gDraft]);
  const gEditLayout = (f: (t: ReportTheme) => ReportTheme) =>
    setGDraft((d) => {
      const b = d ?? defaultTheme(gBrand);
      return b ? f(b) : d;
    });
  const gSaveAll = () => {
    if (!gBase) return;
    const p: Partial<Brand> = { ...gPatch };
    if (gDraft && gLayoutDirty) {
      const list = brandThemes(gBase);
      p.themes = list.some((x) => x.id === gDraft.id)
        ? list.map((x) => (x.id === gDraft.id ? gDraft : x))
        : [...list, gDraft];
    }
    updateBrand(gBase.id, p);
    setGPatch({});
    setGDraft(null);
    setGDismissed(null);
    toast(`Saved to ${gBase.name}`);
  };
  const gThemed = themedBrand(gBrand, gLayout);
  const gRecolor: Recolor = {
    mode: "style",
    brand: gBrand,
    onStyle: (k, c) =>
      setGPatch((x) => ({ ...x, colors: { ...(x.colors ?? gBase?.colors ?? DEFAULT_BRAND.colors), [k]: c } })),
  };

  if (!template) return null;
'''
s = sub1(s, "\n  if (!template) return null;\n", hooks, "te hooks")
s = sub1(
    s,
    """  const selectBand = (k: BandKind) => {
    setTab("design");
    setActiveBand(k);
  };""",
    """  const selectBand = (k: BandKind) => {
    setTab("styles");
    setActiveBand(k);
  };""",
    "te selectBand",
)
s = sub1(
    s,
    """              Parameters
            </button>
          </div>""",
    """              Parameters
            </button>
            <button
              className={`tab ${tab === "styles" ? "active" : ""}`}
              onClick={() => goTab("styles")}
            >
              Styles
            </button>
          </div>""",
    "te tab btn",
)
s = sub1(s, '          <div className="side-scroll">', '          <div className="side-scroll" style={tab === "styles" ? { display: "none" } : undefined}>', "te side-scroll")
s = sub1(s, ") : tab === \"parameters\" ? (", ") : tab === \"styles\" ? null : tab === \"parameters\" ? (", "te chain")
s = sub1(
    s,
    """          </div>
        </aside>

        {/* ---------------- Canvas ---------------- */}""",
    """          </div>
          {tab === "styles" && (
            <BrandDesignF
              brands={brands}
              brandId={gBase?.id}
              setBrandId={(id) => {
                updateTemplate(template.id, { brandId: id });
                setGPatch({});
                setGDraft(null);
                setActiveBand(null);
              }}
              brand={gBrand}
              onChange={(p) => setGPatch((x) => ({ ...x, ...p }))}
              dirty={gShowBar}
              onSave={gSaveAll}
              onDiscard={() => setGDismissed(gKey)}
            >
              <ThemePanel
                brand={gBrand}
                layouts={brandThemes(gBrand)}
                layout={gLayout}
                edited={false}
                onPick={() => {}}
                onNew={() => {}}
                setMargin={(px) => gEditLayout((t) => ({ ...t, margin: px }))}
                activeBand={activeBand}
                onPickBand={(k) => setActiveBand(k)}
              />
            </BrandDesignF>
          )}
        </aside>

        {/* ---------------- Canvas ---------------- */}""",
    "te styles panel",
)
s = resub1(
    s,
    r'<div\n            className="canvas-page tpl-page"\n.*?style=\{\{ \.\.\.bandVars\(EMPTY_BAND, EMPTY_BAND\) \}\}\n          >',
    """<div
            className="canvas-page tpl-page tpl-styled"
            /* Version G: the template is drawn with its brand and layout, and
               its header and footer are edited right here. */
            style={
              {
                ...brandVars(gThemed),
                ...themeSizeVars(gLayout),
                ...(gLayout ? bandVars(gLayout.header, gLayout.footer, gThemed) : bandVars(EMPTY_BAND, EMPTY_BAND)),
                ...(gLayout?.background ? { background: gLayout.background } : {}),
              } as CSSProperties
            }
          >""",
    "te page",
)
band = lambda k, K: f"""{{gLayout && (
              <PageBandEditor
                kind="{k}"
                band={{gLayout.{k}}}
                brand={{gThemed}}
                mode={{activeBand === "{k}" ? "edit" : "hint"}}
                objects
                active={{activeBand === "{k}"}}
                onActivate={{() => selectBand("{k}")}}
                onChange={{(b) => gEditLayout((t) => ({{ ...t, {k}: b }}))}}
                tagLabel="{K}"
              />
            )}}"""
s = sub1(
    s,
    """<div className="band-wrap header tpl-ph-wrap tpl-ph-header">
              <div className="band tpl-ph">Header will go here</div>
            </div>""",
    band("header", "Header"),
    "te header",
)
s = sub1(
    s,
    """<div className="band-wrap footer tpl-ph-wrap tpl-ph-footer">
              <div className="band tpl-ph">Footer will go here</div>
            </div>""",
    band("footer", "Footer"),
    "te footer",
)
s = sub1(s, "<BrandContext.Provider value={undefined}>", "<RecolorContext.Provider value={gRecolor}>\n                <BrandContext.Provider value={undefined}>", "te provider open")
s = sub1(s, "</BrandContext.Provider>", "</BrandContext.Provider>\n                </RecolorContext.Provider>", "te provider close")
wr(p, s)

# ================================================================ CSS
p = os.path.join(M, "styles/global.css")
s = rd(p)
s = sub1(s, ".tpl-page,\n.tpl-page * {", ".tpl-page:not(.tpl-styled),\n.tpl-page:not(.tpl-styled) * {", "mono")
if "/* Version G (Nov 4) */" not in s:
    s = s.rstrip("\n") + """

/* Version G (Nov 4) */
/* The template is drawn in its brand's type and colors. */
.tpl-styled .canvas-doc .bn-container,
.tpl-styled .canvas-doc .bn-editor {
  font-family: var(--b-font, var(--font-sans));
}
.tpl-styled .canvas-doc .bn-block-content[data-content-type="heading"]:not([data-level]) {
  color: var(--b-h1, var(--content-bold));
  font-family: var(--b-font-h1, inherit);
}
.tpl-styled .canvas-doc .bn-block-content[data-content-type="heading"][data-level="2"] {
  color: var(--b-h2, var(--content-bold));
  font-family: var(--b-font-h2, inherit);
}
.tpl-styled .canvas-doc .bn-block-content[data-content-type="heading"][data-level="3"] {
  color: var(--b-h3, var(--content-bold));
  font-family: var(--b-font-h3, inherit);
}
.tpl-styled .canvas-doc .bn-block-content[data-content-type="heading"][data-level="4"] {
  color: var(--b-h4, var(--content-bold));
  font-family: var(--b-font-h4, inherit);
}
.tpl-styled .canvas-doc .bn-block-content[data-content-type="paragraph"],
.tpl-styled .canvas-doc .bn-block-content[data-content-type="bulletListItem"],
.tpl-styled .canvas-doc .bn-block-content[data-content-type="numberedListItem"] {
  color: var(--b-paragraph, inherit);
}
.tpl-styled .band-slot.left {
  padding-left: var(--doc-m, 96px);
}
.tpl-styled .band-slot.right {
  padding-right: var(--doc-m, 96px);
}

/* The text toolbar's brand color button. */
.rc-btn {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-left: 2px;
  border: 0;
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.rc-btn:hover,
.rc-btn.on {
  background: var(--bg-light, #f2f2f2);
}
.rc-a {
  font-size: 14px;
  line-height: 14px;
  font-weight: 600;
  color: var(--content-bold, #333);
}
.rc-bar {
  width: 14px;
  height: 3px;
  margin-top: 2px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.rc-pop {
  padding: 12px;
}
.rc-head {
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: var(--content-bold, #333);
}
.rc-help {
  margin: 4px 0 10px;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-medium, #757575);
}
.rc-reset {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: none;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-medium, #757575);
  text-decoration: underline;
  cursor: pointer;
}
"""
wr(p, s)
print("ok")
