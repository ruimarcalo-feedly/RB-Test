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
        raise SystemExit(f"[{label}] expected 1 match, found {n}: {old[:70]!r}")
    return s.replace(old, new)


def cut(s, start, end, new, label):
    i = s.find(start)
    j = s.find(end, i)
    if i < 0 or j < 0:
        raise SystemExit(f"[{label}] markers not found")
    return s[:i] + new + s[j:]


# ---------------------------------------------------------------- Layout section
wr(
    os.path.join(K, "components/themes/ThemePanel.tsx"),
    '''import type { Brand } from "../../data/brand";
import { THEME_MARGINS, type ReportTheme } from "../../data/theme";
import { Button, Select, Tip } from "../ui/primitives";
import { BandThumb } from "./Themes";

/* ------------------------------------------------------------------ *
 * Version E — Layout, under the brand in the report's Design tab
 *
 * There is no layout editor: a layout is whatever header, footer and
 * margins the report has. Pick a saved one, or change the header and footer
 * on the page and the margins here. Any change brings up the bar at the
 * foot of the sidebar, which saves it into the brand (or is dismissed and
 * stays on this report).
 * ------------------------------------------------------------------ */

export function ThemePanel({
  brand,
  layouts,
  layout,
  edited,
  onPick,
  onNew,
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
  const names = layouts.map((t) => t.name);

  return (
    <div className="lay-sec">
      <div className="bdf2-title">Layout</div>
      <div className="lay-pick">
        <Select
          block
          value={layout.name}
          options={names}
          onChange={(n) => {
            const t = layouts.find((x) => x.name === n);
            if (t) onPick(t.id);
          }}
          renderOption={(n) => n}
        />
        <Tip label="New layout">
          <Button icon="plus" title="New layout" onClick={onNew} />
        </Tip>
      </div>
      {edited && <div className="lay-edited">Edited on this report</div>}

      {(["header", "footer"] as const).map((k) => (
        <div className="lay-field" key={k}>
          <div className="bdf2-label">{k === "header" ? "Header" : "Footer"}</div>
          <BandThumb
            theme={layout}
            brand={brand}
            kind={k}
            active={activeBand === k}
            onClick={() => onPickBand(k)}
          />
        </div>
      ))}
      <div className="lay-hint">Click the header or footer on the page to change it.</div>

      <div className="lay-field">
        <div className="bdf2-label">Document margins</div>
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
    </div>
  );
}
''',
)

# ---------------------------------------------------------------- BrandDesignF bar copy
p = os.path.join(K, "components/report/BrandDesignF.tsx")
s = rd(p)
s = re.sub(
    r"\{/\* Changes to the brand wait here until saved\. \*/\}.*?</div>\n      \)\}\n",
    """{/* Version E: any change (brand, header, footer, margins) asks to be
          saved into the brand. Dismiss keeps it on this report only. */}
      {dirty && brand && (
        <div className="bd-savebar">
          <span className="bd-savebar-text">
            <span className="bd-dot" />
            You&rsquo;ve made changes. Save them into {brand.name}?
          </span>
          <Button size="sm" onClick={onDiscard}>
            Dismiss
          </Button>
          <Button size="sm" variant="primary" onClick={onSave}>
            Save to brand
          </Button>
        </div>
      )}
""",
    s,
    count=1,
    flags=re.S,
)
if "Save to brand" not in s:
    raise SystemExit("bar not replaced")
wr(p, s)

# ---------------------------------------------------------------- ReportEditor
p = os.path.join(K, "components/report/ReportEditor.tsx")
s = rd(p)
s = sub1(s, 'import { ThemeSide } from "../themes/ThemeSide";\n', "", "imp side")
s = sub1(s, "  simpleTheme,\n", "  layoutOf,\n", "imp simple")

# brand save: the bar saves brand + layout together, so drop the old saveBrand
s = cut(
    s,
    "  const saveBrand = () => {",
    "  /* Version E (Brand Themes): the theme",
    "",
    "saveBrand",
)

s = cut(
    s,
    "  /* Version E: a theme being edited right on the report.",
    "  /** Saving a header before any brand exists",
    """  /* Version E (Nov 3): no layout editor. The report's layout is the saved
     one plus whatever was changed on it (header, footer, margins). Any
     change, to it or to the brand, brings up the bar that saves it all into
     the brand; dismissing the bar keeps the change on this report. */
  const [layoutDraft, setLayoutDraft] = useState<ReportTheme | null>(null);
  const savedLayouts = brandThemes(baseBrand);
  const layout = layoutDraft ?? theme;
  const layoutIsNew = layoutDraft ? !savedLayouts.some((t) => t.id === layoutDraft.id) : false;
  const layoutDirty =
    !!layoutDraft && (layoutIsNew || !theme || layoutOf(layoutDraft) !== layoutOf(theme));
  const changeKey = JSON.stringify([brandPatch, layoutDraft && layoutOf(layoutDraft), layoutDraft?.id]);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const showSaveBar = (brandDirty || layoutDirty) && changeKey !== dismissedKey;
  const editLayout = (f: (t: ReportTheme) => ReportTheme) =>
    setLayoutDraft((d) => {
      const base = d ?? theme;
      return base ? f(base) : d;
    });
  const saveAll = () => {
    if (!baseBrand) return;
    const patch: Partial<Brand> = { ...brandPatch };
    if (layoutDraft && layoutDirty) {
      patch.themes = layoutIsNew
        ? [...savedLayouts, layoutDraft]
        : savedLayouts.map((x) => (x.id === layoutDraft.id ? layoutDraft : x));
    }
    updateBrand(baseBrand.id, patch);
    if (layoutDraft) setThemeId(layoutDraft.id);
    setBrandPatch({});
    setLayoutDraft(null);
    setDismissedKey(null);
    toast(`Saved to ${baseBrand.name}`);
  };
""",
    "draft block",
)

s = cut(
    s,
    '          {tab === "design" && themeDraft && brand && (',
    "          {/* Figma: source / language / company changes need a regeneration. */}",
    """          {tab === "design" && (
            /* Version E (Nov 3): the brand and its styles (from F), then the layout. */
            <BrandDesignF
              brands={brands.filter((b) => enabledBrands.includes(b) || b.id === brandId)}
              brandId={brandId}
              setBrandId={(id) => {
                setBrandId(id);
                setBrandPatch({});
                setThemeId(undefined);
                setLayoutDraft(null);
                setActiveBand(null);
              }}
              brand={brand}
              onChange={(p) => setBrandPatch((x) => ({ ...x, ...p }))}
              dirty={showSaveBar}
              onSave={saveAll}
              onDiscard={() => setDismissedKey(changeKey)}
            >
              <ThemePanel
                brand={brand}
                layouts={layoutIsNew && layoutDraft ? [...savedLayouts, layoutDraft] : savedLayouts}
                layout={layout}
                edited={layoutDirty && !layoutIsNew}
                onPick={(id) => {
                  setThemeId(id);
                  setLayoutDraft(null);
                }}
                onNew={() => {
                  if (!layout) return;
                  let n = savedLayouts.length + 1;
                  while (savedLayouts.some((t) => t.name === `Layout ${n}`)) n++;
                  setLayoutDraft({ ...layout, id: nextId("theme"), name: `Layout ${n}` });
                }}
                setMargin={(px) => editLayout((t) => ({ ...t, margin: px }))}
                activeBand={activeBand}
                onPickBand={selectBand}
              />
            </BrandDesignF>
          )}

""",
    "design jsx",
)

s = sub1(
    s,
    "              theme={themeDraft ?? theme}\n              editTheme={Boolean(themeDraft)}\n              onThemeBand={(k, b) => setThemeDraft((d) => (d ? { ...d, [k]: b } : d))}\n",
    "              theme={layout}\n              editTheme\n              onThemeBand={(k, b) => editLayout((t) => ({ ...t, [k]: unfill(b, t[k]) }))}\n",
    "canvas props",
)
s = sub1(s, ".theme-side, .theme-inline\"", ".theme-side, .theme-inline, .lay-sec\"", "click off")

# The page: report values (TLP, date) stay the report's, the rest goes to the layout.
for k, v in (("header", "hb"), ("footer", "fb")):
    s = sub1(
        s,
        f'          editTheme ? onThemeBand?.("{k}", b) : theme ? onFills?.(readFills(b, {v})) : {k}.setBand(b)\n',
        f"""          {{
            if (!editTheme) return theme ? onFills?.(readFills(b, {v})) : {k}.setBand(b);
            const f = readFills(b, {v});
            if (Object.keys(f).length) onFills?.(f);
            onThemeBand?.("{k}", b);
          }}
""",
        f"page {k}",
    )

s = s.rstrip("\n") + '''

/** Version E: a band from the page, with the report's own values (TLP, date)
    put back to the layout's, so they never count as a layout change. */
function unfill(band: PageBand, before: PageBand): PageBand {
  const put = (s: "left" | "middle" | "right") => {
    const el = band[s];
    const was = before[s];
    if (el && was && el.kind === was.kind && (el.kind === "tlp" || el.kind === "date")) return { ...el, text: was.text };
    return el;
  };
  return { ...band, left: put("left"), middle: put("middle"), right: put("right") };
}
'''
wr(p, s)

# ---------------------------------------------------------------- theme.ts: layoutOf
p = os.path.join(K, "data/theme.ts")
s = rd(p)
if "export function layoutOf" not in s:
    s = s.rstrip("\n") + '''

/** What a layout is, to tell whether a report changed it. */
export function layoutOf(t: ReportTheme) {
  return JSON.stringify({ h: t.header, f: t.footer, m: t.margin ?? 96, b: t.background ?? "#FFFFFF" });
}
'''
wr(p, s)

# ---------------------------------------------------------------- CSS
p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* Version E: Layout section (Nov 3b) */" not in s:
    s = s.rstrip("\n") + """

/* Version E: Layout section (Nov 3b) */
.lay-pick {
  display: flex;
  gap: 8px;
  align-items: center;
}
.lay-pick > :first-child {
  flex: 1;
  min-width: 0;
}
.lay-edited {
  margin-top: 6px;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-light, #9e9e9e);
}
.lay-field {
  margin-top: 16px;
}
.lay-field .bdf2-label {
  margin-bottom: 8px;
}
.lay-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 16px;
  color: var(--content-light, #9e9e9e);
}
/* The page is always editable in E now: no edit-mode chrome. */
.report-page.theme-editing {
  outline: none;
}
"""
wr(p, s)
print("ok")
