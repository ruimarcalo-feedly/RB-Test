import os, re, sys

ROOT = sys.argv[1]
K = os.path.join(ROOT, "source-k/src")
L = os.path.join(ROOT, "source-l/src")


def rd(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def wr(p, s):
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(s)
    os.replace(tmp, p)


def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected 1 match, found {n}: {old[:80]!r}")
    return s.replace(old, new)


# ================================================================ 1. E: palette as a summary card
p = os.path.join(K, "components/report/BrandDesignF.tsx")
s = rd(p)
s = sub1(s, "  const [adding, setAdding] = useState(false);\n", "  const [adding, setAdding] = useState(false);\n  /* Version E (Nov 4): the palette starts as a summary card; click to open it. */\n  const [paletteOpen, setPaletteOpen] = useState(false);\n", "state")
s = sub1(
    s,
    """                <div className="bdf3-sub">Main colors</div>
                {/* Always open: the colors, the text styles and the dividers and
                    tables, straight in the brand box. */}
                <div className="bdf2-all">
""",
    """                {!paletteOpen ? (
                  <button className="bdf3-sum" onClick={() => setPaletteOpen(true)} aria-expanded={false}>
                    <span className="bdf3-sum-body">
                      <span className="bdf3-sum-sw">
                        {palette.map((p, i) => (
                          <span key={`${p.label}${i}`} style={{ background: p.c }} title={`${p.label} ${p.c}`} />
                        ))}
                      </span>
                      <span className="bdf3-sum-type">
                        {TYPE_ROWS.map((r) => (
                          <span
                            key={r.key}
                            title={r.label}
                            style={{ color: rowColor(r.key), fontWeight: r.weight, fontFamily: `${rowFont(r.key)}, var(--font-sans)` }}
                          >
                            Aa
                          </span>
                        ))}
                      </span>
                    </span>
                    <Icon name="chevron-down" size={16} />
                  </button>
                ) : (
                <div className="bdf3-sum open">
                <button className="bdf3-sum-head" onClick={() => setPaletteOpen(false)} aria-expanded>
                  <span>Main colors</span>
                  <Icon name="chevron-up" size={16} />
                </button>
                <div className="bdf2-all">
""",
    "palette open",
)
s = sub1(
    s,
    """                    </div>
                </div>
              </div>

              {/* ---------------- Font ---------------- */}""",
    """                    </div>
                </div>
                </div>
                )}
              </div>

              {/* ---------------- Font ---------------- */}""",
    "palette close",
)
wr(p, s)

# ================================================================ 3. E: brand panel, Layout tab like the report's
p = os.path.join(K, "components/org/BrandPeek.tsx")
s = rd(p)
s = re.sub(
    r"const TYPE_ROWS: \{ key: TypeKey; label: string; help: string \}\[\] = \[\n.*?\n\];\n",
    '''/* Version E (Nov 4): the same rows, names and order as the report's Styles tab. */
const TYPE_ROWS: { key: TypeKey | "tableHeader"; label: string; help: string }[] = [
  { key: "h1", label: "Heading 1", help: "The font applied to all H1 content" },
  { key: "h2", label: "Heading 2", help: "The font applied to all H2 content" },
  { key: "h3", label: "Heading 3", help: "The font applied to all H3 content" },
  { key: "h4", label: "Heading 4", help: "The font applied to all H4 content" },
  { key: "paragraph", label: "Paragraph", help: "The font applied to all paragraph content" },
  { key: "tableHeader", label: "Table header", help: "The text in a table's header row. Set in the Paragraph font" },
  { key: "caption", label: "Caption", help: "The font applied to all Caption content" },
];
''',
    s,
    count=1,
    flags=re.S,
)
s = sub1(
    s,
    """              sortValue={(r, key) =>
                key === "font" ? draft.fonts[r.key] : key === "color" ? draft.colors[r.key] : r.label
              }""",
    """              sortValue={(r, key) =>
                key === "font"
                  ? draft.fonts[r.key === "tableHeader" ? "paragraph" : r.key]
                  : key === "color"
                    ? draft.colors[r.key] ?? draft.colors.paragraph
                    : r.label
              }""",
    "sort",
)
s = sub1(
    s,
    """                  value={shown.fonts[r.key]}
                  options={BRAND_FONTS}
                  onChange={font(r.key)}
                  onPreview={(v) => setTryFont(v ? { key: r.key, font: v } : null)}""",
    """                  value={shown.fonts[r.key === "tableHeader" ? "paragraph" : r.key]}
                  options={BRAND_FONTS}
                  disabled={r.key === "tableHeader"}
                  onChange={(v) => {
                    if (r.key !== "tableHeader") font(r.key)(v);
                  }}
                  onPreview={(v) => {
                    if (r.key !== "tableHeader") setTryFont(v ? { key: r.key, font: v } : null);
                  }}""",
    "font cell",
)
s = sub1(
    s,
    """                  value={draft.colors[r.key]}
                  palette={palette}
                  label={`${r.label} color`}
                  onChange={color(r.key)}""",
    """                  value={draft.colors[r.key] ?? draft.colors.paragraph}
                  palette={palette}
                  label={`${r.label} color`}
                  onChange={color(r.key)}""",
    "color cell",
)
s = sub1(s, '["rb", "Report Builder"],', '["layout", "Layout"],', "tab label")
s = sub1(s, 'useState<"typography" | "assets" | "viz" | "rb">("typography")', 'useState<"typography" | "assets" | "viz" | "layout">("typography")', "tab state")
s = sub1(s, "  const defId = defaultTheme(draft)?.id;\n", "  const defLayout = defaultTheme(draft);\n", "defId")
s = sub1(s, 'import { ThemeCard } from "../themes/Themes";\n', 'import { ThemePanel } from "../themes/ThemePanel";\n', "import")

# Pull the structure section out of the old Report Builder tab
m = re.search(r"\n          \{tab === \"rb\" && \(\n            <>\n(.*?)\n            </>\n          \)\}\n", s, flags=re.S)
if not m:
    raise SystemExit("rb tab not found")
rb = m.group(1)
sm = re.search(r"          \{/\* -+ Content structures -+ \*/\}\n(          <Section\n.*?\n          </Section>\n)", rb, flags=re.S)
if not sm:
    raise SystemExit("structures not found")
structures = sm.group(1)
structures = structures.replace('title="Report structure"', 'title="Dividers and tables"')
structures = structures.replace('blurb="Styles for the structures in a report: dividers and tables."', 'blurb="Colors for the dividers and tables in a report. Colors come from the palette above."')
layout_tab = '''
          {/* ---------------- Layout (Version E, Nov 4) ---------------- */}
          {/* The same controls as the Layout section of a report's Styles tab,
              for the layout every report in this brand starts with. */}
          {tab === "layout" && (
          <Section blurb="Every report in this brand starts with this layout. The header and footer are changed on a report, from its Styles tab.">
            <div className="peek-layout">
              <ThemePanel
                brand={draft}
                layouts={draft.themes ?? []}
                layout={defLayout}
                edited={false}
                onPick={() => {}}
                onNew={() => {}}
                setMargin={(px) =>
                  setDraft((d) => {
                    const id = defaultTheme(d)?.id;
                    return { ...d, themes: brandThemes(d).map((t) => (t.id === id ? { ...t, margin: px } : t)) };
                  })
                }
                activeBand={null}
                onPickBand={() => {}}
              />
            </div>
          </Section>
          )}
'''
s = s[: m.start()] + layout_tab + s[m.end():]
# Dividers and tables go under Text styles, as in the report
s = sub1(
    s,
    """          </Section>
          </>
          )}

          {/* ---------------- Assets ---------------- */}""",
    """          </Section>
""" + structures + """          </>
          )}

          {/* ---------------- Assets ---------------- */}""",
    "structures into typography",
)
wr(p, s)

# ================================================================ CSS (E)
p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* Version E: palette summary card (Nov 4) */" not in s:
    s = s.rstrip("\n") + """

/* Version E: palette summary card (Nov 4) */
.bdf3-sum {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
  padding: 12px 16px;
  border: 1px solid var(--border-light, #e6e6e6);
  border-radius: 6px;
  background: var(--bg-lightest, #fff);
  color: var(--content-medium, #757575);
  text-align: left;
  cursor: pointer;
}
button.bdf3-sum:hover {
  border-color: var(--border-medium, #bfbfbf);
}
.bdf3-sum-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bdf3-sum-sw {
  display: flex;
  gap: 6px;
}
.bdf3-sum-sw span {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.bdf3-sum-type {
  display: flex;
  gap: 10px;
  font-size: 13px;
  line-height: 16px;
}
.bdf3-sum.open {
  display: block;
  cursor: default;
  padding: 0 16px 16px;
}
.bdf3-sum-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% + 32px);
  margin: 0 -16px;
  padding: 12px 16px;
  border: 0;
  background: none;
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: var(--content-medium, #757575);
  cursor: pointer;
}
.bdf3-sum.open .bdf3-list {
  background: var(--bg-lightest, #fff);
}

/* Version E: the brand panel's Layout tab (Nov 4) */
.peek-layout {
  max-width: 560px;
}
.peek-layout .lay-sec > .bdf3-title {
  display: none;
}
.peek-layout .lay-sec > .lay-field:first-of-type {
  margin-top: 0;
}
.peek-layout .band-thumb {
  cursor: default;
  pointer-events: none;
}
"""
    wr(p, s)

# ================================================================ 2. F: no push / reset unless the theme changed
p = os.path.join(L, "components/themes/ThemesMenu.tsx")
s = rd(p)
s = sub1(
    s,
    """          <MenuItem onClick={act(onPush)} disabled={!changed}>
            Push changes to style
          </MenuItem>
          <MenuItem onClick={act(onReset)} disabled={!changed}>
            Reset to theme
          </MenuItem>""",
    """          {/* Nov 4: only offered once the theme has changed on this report. */}
          {changed && (
            <>
              <MenuItem onClick={act(onPush)}>Push changes to style</MenuItem>
              <MenuItem onClick={act(onReset)}>Reset to theme</MenuItem>
            </>
          )}""",
    "push",
)
wr(p, s)
print("ok")
