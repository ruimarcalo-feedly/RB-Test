import os, sys
ROOT = sys.argv[1]
K = os.path.join(ROOT, "source-k/src")
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s):
    open(p + ".tmp", "w", encoding="utf-8").write(s); os.replace(p + ".tmp", p)
def sub1(s, o, n, label):
    c = s.count(o)
    if c != 1: raise SystemExit(f"[{label}] found {c}: {o[:80]!r}")
    return s.replace(o, n)

# LayoutEditor: the primary button's label can be set
p = os.path.join(K, "components/themes/LayoutEditor.tsx"); s = rd(p)
s = sub1(s, "  onCancel,\n  onDone,\n}: {", "  onCancel,\n  onDone,\n  doneLabel = \"Done\",\n}: {", "le props")
s = sub1(s, "  onDone: (l: ReportTheme) => void;\n}) {", "  onDone: (l: ReportTheme) => void;\n  doneLabel?: string;\n}) {", "le types")
s = sub1(s, "            Done\n          </Button>", "            {doneLabel}\n          </Button>", "le label")
wr(p, s)

p = os.path.join(K, "components/org/BrandPeek.tsx"); s = rd(p)
s = sub1(s, '["layout", "Layout"],', '["layout", "Layouts"],', "tab name")
if "useStore" not in s:
    s = sub1(s, 'import { LayoutEditor } from "../themes/LayoutEditor";', 'import { LayoutEditor } from "../themes/LayoutEditor";\nimport { useStore } from "../../state/store";', "store import")
s = sub1(s, "  const [layoutEditor, setLayoutEditor] = useState(false);\n", "  const [layoutEditor, setLayoutEditor] = useState(false);\n  const { updateBrand } = useStore();\n", "store use")
s = sub1(
    s,
    """          <Section blurb="Every report in this brand starts with this layout. The header and footer are changed on a report, from its Styles tab.">
            <div className="peek-layout">""",
    """          <section className="brand-section">
            <div className="peek-lay-head">
              <h3 className="t-h3" style={{ margin: 0 }}>
                Report layout
              </h3>
              <Button size="sm" icon="pencil" onClick={() => setLayoutEditor(true)}>
                Edit layout
              </Button>
            </div>
            <p className="t-body3 muted" style={{ margin: "4px 0 16px" }}>
              Every report in this brand starts with this layout: its margins, header and footer. Edit it here, or change
              it on a report from its Styles tab.
            </p>
            <div className="peek-layout">""",
    "lay head",
)
s = sub1(
    s,
    """                onPickBand={() => {}}
                onEditLayout={() => setLayoutEditor(true)}
              />
            </div>
          </Section>""",
    """                onPickBand={() => {}}
              />
            </div>
          </section>""",
    "lay close",
)
s = sub1(s, '    <div className="peek-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>',
         '    <div\n      className={`peek-scrim ${layoutEditor ? "peek-away" : ""}`}\n      onMouseDown={(e) => e.target === e.currentTarget && onClose()}\n    >', "scrim")
s = sub1(
    s,
    """          onDone={(l) => {
            setDraft((d) => {
              const id = defaultTheme(d)?.id;
              return { ...d, themes: brandThemes(d).map((t) => (t.id === id ? l : t)) };
            });
            setLayoutEditor(false);
          }}""",
    """          doneLabel="Save layout"
          onDone={(l) => {
            /* Saving the layout saves it to the brand straight away, then
               goes back to the side peek. */
            const id = defaultTheme(draft)?.id;
            const themes = brandThemes(draft).map((t) => (t.id === id ? l : t));
            setDraft((d) => ({ ...d, themes }));
            if (!creating) updateBrand(draft.id, { themes });
            setLayoutEditor(false);
          }}""",
    "done",
)
wr(p, s)

p = os.path.join(K, "styles/global.css"); s = rd(p)
if "/* Nov 5b: Report layout in the brand panel */" not in s:
    s = s.rstrip("\n") + """

/* Nov 5b: Report layout in the brand panel */
.peek-lay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.peek-layout {
  max-width: none;
}
.peek-layout .lay-title-row {
  display: none;
}
/* While the layout editor is open, the side peek steps away (and comes back
   as it was). */
.peek-scrim.peek-away {
  visibility: hidden;
}
"""
    wr(p, s)
print("ok")
