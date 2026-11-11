import os, re, sys, shutil
ROOT = sys.argv[1]
K = os.path.join(ROOT, "source-k/src")
OUT = os.path.join(ROOT, "Claude outputs/scripts")
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s):
    open(p + ".tmp", "w", encoding="utf-8").write(s); os.replace(p + ".tmp", p)
def sub1(s, o, n, label):
    c = s.count(o)
    if c != 1: raise SystemExit(f"[{label}] found {c}: {o[:80]!r}")
    return s.replace(o, n)

shutil.copyfile(os.path.join(OUT, "LayoutEditor_1.tsx"), os.path.join(K, "components/themes/LayoutEditor.tsx"))

# ThemePanel: an "Edit layout" button by the title
p = os.path.join(K, "components/themes/ThemePanel.tsx"); s = rd(p)
s = sub1(s, 'import { BandThumb } from "./Themes";', 'import { BandThumb } from "./Themes";\nimport { Button } from "../ui/primitives";', "tp import")
s = sub1(s, "  activeBand,\n  onPickBand,\n}: {", "  activeBand,\n  onPickBand,\n  onEditLayout,\n}: {", "tp props")
s = sub1(s, '  onPickBand: (k: "header" | "footer") => void;\n}) {', '  onPickBand: (k: "header" | "footer") => void;\n  /** Nov 5: opens the layout editor (header, footer and margins only). */\n  onEditLayout?: () => void;\n}) {', "tp types")
s = sub1(s, '      <div className="bdf3-title">Layout</div>\n', '''      <div className="lay-title-row">
        <div className="bdf3-title">Layout</div>
        {onEditLayout && (
          <Button size="sm" icon="pencil" onClick={onEditLayout}>
            Edit layout
          </Button>
        )}
      </div>
''', "tp title")
wr(p, s)

# Report editor
p = os.path.join(K, "components/report/ReportEditor.tsx"); s = rd(p)
s = sub1(s, 'import { ThemePanel } from "../themes/ThemePanel";', 'import { ThemePanel } from "../themes/ThemePanel";\nimport { LayoutEditor } from "../themes/LayoutEditor";', "re import")
s = sub1(s, "  const [layoutDraft, setLayoutDraft] = useState<ReportTheme | null>(null);\n", "  const [layoutDraft, setLayoutDraft] = useState<ReportTheme | null>(null);\n  const [layoutEditor, setLayoutEditor] = useState(false);\n", "re state")
s = sub1(s, "                onPickBand={selectBand}\n              />\n            </BrandDesignF>", "                onPickBand={selectBand}\n                onEditLayout={() => setLayoutEditor(true)}\n              />\n            </BrandDesignF>", "re prop")
i = s.find("      {libraryFor && (")
if i < 0: raise SystemExit("re anchor")
s = s[:i] + """      {/* Nov 5: the layout on a page of its own. Done puts it on the report,
          where the "Styles have changed" bar offers to save it to the brand. */}
      {layoutEditor && layout && (
        <LayoutEditor
          brand={brand}
          layout={layout}
          onCancel={() => setLayoutEditor(false)}
          onDone={(l) => {
            setLayoutDraft(l);
            setLayoutEditor(false);
          }}
        />
      )}
""" + s[i:]
wr(p, s)

# Org Profile brand panel: the same button, for the brand's starting layout
p = os.path.join(K, "components/org/BrandPeek.tsx"); s = rd(p)
s = sub1(s, 'import { ThemePanel } from "../themes/ThemePanel";', 'import { ThemePanel } from "../themes/ThemePanel";\nimport { LayoutEditor } from "../themes/LayoutEditor";', "bp import")
s = sub1(s, "  const defLayout = defaultTheme(draft);\n", "  const defLayout = defaultTheme(draft);\n  const [layoutEditor, setLayoutEditor] = useState(false);\n", "bp state")
s = sub1(s, "                activeBand={null}\n                onPickBand={() => {}}\n              />", "                activeBand={null}\n                onPickBand={() => {}}\n                onEditLayout={() => setLayoutEditor(true)}\n              />", "bp prop")
s = sub1(s, "      {peeked && (\n        <ReferencePopover", """      {layoutEditor && defLayout && (
        <LayoutEditor
          brand={draft}
          layout={defLayout}
          onCancel={() => setLayoutEditor(false)}
          onDone={(l) => {
            setDraft((d) => {
              const id = defaultTheme(d)?.id;
              return { ...d, themes: brandThemes(d).map((t) => (t.id === id ? l : t)) };
            });
            setLayoutEditor(false);
          }}
        />
      )}
      {peeked && (
        <ReferencePopover""", "bp render")
wr(p, s)

# CSS
p = os.path.join(K, "styles/global.css"); s = rd(p)
if "/* ==== Layout editor (Nov 5) ==== */" not in s:
    s = s.rstrip("\n") + """

/* ==== Layout editor (Nov 5) ==== */
.lay-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.peek-layout .lay-title-row {
  justify-content: flex-end;
  margin-bottom: 16px;
}
.lay-ed {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--bg-light, #f7f7f7);
}
.lay-ed-top {
  flex: none;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-lightest, #f2f2f2);
  background: var(--bg-lightest, #fff);
}
.lay-ed-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.lay-ed-name {
  font-size: 16px;
  line-height: 22px;
  font-weight: 600;
  color: var(--content-bold, #333);
}
.lay-ed-sub {
  font-size: 13px;
  line-height: 18px;
  color: var(--content-medium, #757575);
}
.lay-ed-margins {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto;
}
.lay-ed-margins .bdf2-toggles {
  width: 300px;
}
.lay-ed-label {
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: var(--content-medium, #757575);
}
.lay-ed-actions {
  display: flex;
  gap: 8px;
}
.lay-ed-canvas {
  flex: 1;
  overflow: auto;
  padding: 32px;
}
.lay-ed-page.report-page {
  position: relative;
  min-height: 0;
  height: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.lay-ed-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 560px;
  margin: 0 var(--doc-m, 96px);
  padding: calc(var(--header-h, 64px) + 40px) 0 calc(var(--footer-h, 64px) + 40px);
  background-clip: content-box;
  background-color: var(--bg-light, #f2f2f2);
  color: var(--content-light, #9e9e9e);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
}
.lay-ed-content span {
  padding: 6px 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
}
.lay-ed-grid {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.lay-ed-col {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--doc-m, 96px);
  background: rgba(236, 72, 153, 0.06);
}
.lay-ed-col.left {
  left: 0;
  border-right: 1px dashed rgba(236, 72, 153, 0.55);
}
.lay-ed-col.right {
  right: 0;
  border-left: 1px dashed rgba(236, 72, 153, 0.55);
}
.lay-ed-hint {
  max-width: 1092px;
  margin: 12px auto 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-medium, #757575);
}
"""
    wr(p, s)
print("ok")
