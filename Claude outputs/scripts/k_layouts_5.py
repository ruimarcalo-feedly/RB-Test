import os, re, sys

ROOT = sys.argv[1]
K = os.path.join(ROOT, "source-k/src")


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


def resub1(s, pat, new, label, flags=re.S):
    out, n = re.subn(pat, new, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"[{label}] pattern not found")
    return out


# ---------------------------------------------------------------- brand.ts: Table header color
p = os.path.join(K, "data/brand.ts")
s = rd(p)
s = sub1(s, "  caption: string;\n  tlp: string;\n}", "  caption: string;\n  tlp: string;\n  /** Version E (Nov 3): table header text; Paragraph's color until set. */\n  tableHeader?: string;\n}", "colors type")
s = sub1(s, '    "--b-caption": brand.colors.caption,\n', '    "--b-caption": brand.colors.caption,\n    "--b-th": brand.colors.tableHeader ?? brand.colors.paragraph,\n', "brandVars")
wr(p, s)

# ---------------------------------------------------------------- BrandDesignF (E's copy)
p = os.path.join(K, "components/report/BrandDesignF.tsx")
s = rd(p)
s = sub1(
    s,
    "const TYPE_ROWS: { key: TypeKey; label: string; size: number; weight: number }[] = [",
    'type RowKey = TypeKey | "tableHeader";\nconst TYPE_ROWS: { key: RowKey; label: string; size: number; weight: number }[] = [',
    "rows type",
)
s = sub1(
    s,
    '  { key: "caption", label: "Caption", size: 12, weight: 400 },\n',
    '  { key: "tableHeader", label: "Table header", size: 13, weight: 400 },\n  { key: "caption", label: "Caption", size: 12, weight: 400 },\n',
    "rows table header",
)
s = sub1(
    s,
    "  const sw = brand ? brandSwatches(brand) : null;\n",
    "  const sw = brand ? brandSwatches(brand) : null;\n  const rowColor = (k: RowKey) => (brand ? brand.colors[k] ?? brand.colors.paragraph : \"#333333\");\n  const rowFont = (k: RowKey) => (brand ? brand.fonts[k === \"tableHeader\" ? \"paragraph\" : k] : \"\");\n",
    "rowColor",
)
s = sub1(s, "[...TYPE_ROWS.map((r) => brand.colors[r.key]),", "[...TYPE_ROWS.map((r) => rowColor(r.key)),", "used")

# Top: "Brand style" with the picker, set off by a rule; no grey box
s = resub1(
    s,
    r'<div className="bdf2-brand">\s*<div className="bdf2-select">\s*(<BrandPicker[^\n]*/>)\s*</div>\s*\{brand && sw && \(\s*<div className="bdf2-box">\s*\{/\* -+ Color palette -+ \*/\}\s*<div className="bdf2-field">\s*<div className="bdf2-label">Color palette</div>',
    r'''<div className="bdf2-brand bdf3">
          <div className="bdf3-top">
            <div className="bdf3-title strong">Brand style</div>
            \1
          </div>

          {brand && sw && (
            <div className="bdf3-box">
              {/* ---------------- Color palette ---------------- */}
              <div className="bdf2-field">
                <div className="bdf3-title">Color palette</div>
                <div className="bdf3-sub">Main colors</div>''',
    "top",
)
s = sub1(
    s,
    '<div className="bdf-sub">Text styles</div>\n                    <div className="bd-type">',
    '<div className="bdf3-sub">Text styles</div>\n                    <div className="bd-type bdf3-list">',
    "text styles",
)
s = sub1(s, "fontFamily: `${brand.fonts[r.key]}, var(--font-sans)`,", "fontFamily: `${rowFont(r.key)}, var(--font-sans)`,", "row font")
s = sub1(s, "                              color: brand.colors[r.key],\n", "                              color: rowColor(r.key),\n", "row color")
s = sub1(s, "                            value={brand.colors[r.key]}\n", "                            value={rowColor(r.key)}\n", "row value")
s = resub1(
    s,
    r'<div className="bdf-sub">Dividers and tables</div>\n(.*?)\n(                </div>\n              </div>\n\n              \{/\* -+ Font -+ \*/\})',
    r'''<div className="bdf3-sub">Dividers and tables</div>
                    <div className="bd-type bdf3-list">
\1
                    </div>
\2''',
    "dividers",
)
s = sub1(s, '<div className="bdf2-label">Font</div>', '<div className="bdf3-sub">Font</div>', "font")
s = resub1(
    s,
    r'\{/\* -+ Assets -+ \*/\}\n              <div className="bdf2-field">\n                <div className="bdf2-label">Assets</div>',
    '''<div className="bdf2-rule" />

              {/* ---------------- Assets ---------------- */}
              <div className="bdf2-field">
                <div className="bdf3-title">Assets</div>''',
    "assets",
)
s = sub1(s, '<span className="lay-changed">Styles have changed</span>', '<span className="lay-changed plain">Styles have changed</span>', "foot text")
s = sub1(s, "            Save to brand\n", "            Update brand\n", "foot btn")
wr(p, s)

# ---------------------------------------------------------------- Layout section: Figma 4556:214211
p = os.path.join(K, "components/themes/ThemePanel.tsx")
s = rd(p)
s = resub1(
    s,
    r"export function ThemePanel\(\{.*\Z",
    '''export function ThemePanel({
  brand,
  layout,
  setMargin,
  activeBand,
  onPickBand,
}: {
  brand?: Brand;
  /** The brand's saved layouts (and a new one not saved yet). */
  layouts: ReportTheme[];
  /** What the report has now. */
  layout?: ReportTheme;
  /** The report's layout differs from the saved one. */
  edited: boolean;
  onPick: (id: string) => void;
  onNew: () => void;
  setMargin: (px: number) => void;
  activeBand: "header" | "footer" | null;
  onPickBand: (k: "header" | "footer") => void;
}) {
  if (!brand || !layout) return null;
  const margin = layout.margin ?? 96;

  /* Figma 4556:214211: Layout is the margins, then the header and footer as
     they are on the page. No layout picker: the report has one layout. */
  return (
    <div className="lay-sec">
      <div className="bdf3-title">Layout</div>
      <div className="lay-field">
        <div className="bdf3-sub">Document margins</div>
        <div className="bdf2-toggles" role="radiogroup" aria-label="Document margins">
          {THEME_MARGINS.map((m) => (
            <button
              key={m.label}
              role="radio"
              aria-checked={margin === m.px}
              className={margin === m.px ? "on" : ""}
              onClick={() => setMargin(m.px)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {(["header", "footer"] as const).map((k) => (
        <div className="lay-field" key={k}>
          <div className="bdf3-sub">{k === "header" ? "Header" : "Footer"}</div>
          <BandThumb
            theme={layout}
            brand={brand}
            kind={k}
            active={activeBand === k}
            onClick={() => onPickBand(k)}
          />
        </div>
      ))}
    </div>
  );
}
''',
    "panel",
)
s = sub1(s, 'import { Button, Select, Tip } from "../ui/primitives";\n', "", "panel import")
wr(p, s)

# ---------------------------------------------------------------- Tab: "Styles"
p = os.path.join(K, "components/report/ReportEditor.tsx")
s = rd(p)
s = resub1(
    s,
    r'(onClick=\{\(\) => setTab\("design"\)\}\n\s*disabled=\{!generated\}\n\s*title=\{[^\n]*\}\n\s*>\n\s*)Design\n',
    r"\1Styles\n",
    "tab",
)
wr(p, s)

p = os.path.join(K, "components/org/BrandPeek.tsx")
s = rd(p)
s = sub1(s, "Layouts are made and edited in a report, from its Design tab.", "Layouts are made and edited in a report, from its Styles tab.", "peek")
wr(p, s)

# ---------------------------------------------------------------- CSS
p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* Version E: Styles tab, Figma 4556:214211 */" not in s:
    s = s.rstrip("\n") + """

/* Version E: Styles tab, Figma 4556:214211 */
.bdf3-top {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: -24px -24px 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-lightest, #f2f2f2);
}
.bdf3-title {
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: var(--content-bold, #333);
}
.bdf3-title.strong {
  font-weight: 700;
}
.bdf3-sub {
  margin: 16px 0 8px;
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
  color: var(--content-medium, #757575);
}
.bdf3-title + .bdf3-sub {
  margin-top: 16px;
}
.lay-field > .bdf3-sub:first-child {
  margin-top: 0;
}
.bdf3-box {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.bdf3-box .bdf2-all {
  padding: 0;
}
.bdf3-box .bdf2-rule {
  margin: 24px 0 16px;
}
.bdf3-box .bdf2-field + .bdf2-field {
  margin-top: 0;
}
.bdf3-box .bdf2-help {
  margin: 4px 0 8px;
}
.bdf3-list {
  border: 1px solid var(--border-lightest, #f2f2f2);
  border-radius: 6px;
  padding: 4px 16px;
}
.bdf3-list .bd-type-row {
  min-height: 36px;
  border-bottom: 1px solid #e6e6e6;
}
.bdf3-list .bd-type-row:last-child {
  border-bottom: 0;
}
.bdf3 .bd-swatch.add {
  border: 0;
  background: var(--bg-light, #f2f2f2);
  color: var(--content-light, #9e9e9e);
}
.bdf3 .ts-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-medium, #757575);
}
.lay-sec .lay-field {
  margin-top: 16px;
}
.lay-sec .bdf3-title + .lay-field {
  margin-top: 16px;
}
.lay-changed.plain {
  height: auto;
  padding: 0;
  background: none;
  color: var(--content-medium, #757575);
  font-weight: 500;
}
.side-foot.lay-foot {
  padding: 16px 24px;
}
/* Table header text takes the brand's Table header color. */
.report-page th,
.report-page .bn-table th,
.report-page table tr:first-child > th {
  color: var(--b-th, inherit);
}
"""
wr(p, s)
print("ok")
