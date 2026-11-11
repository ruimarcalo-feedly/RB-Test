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
        raise SystemExit(f"[{label}] expected 1 match, found {n}: {old[:70]!r}")
    return s.replace(old, new)


# ---------------------------------------------------------------- BrandDesignF
s = rd(os.path.join(L, "components/report/BrandDesignF.tsx"))
s = sub1(s, 'import { useRef, useState } from "react";', 'import { useRef, useState, type ReactNode } from "react";', "bdf import")
s = sub1(s, 'import { THEME_MARGINS, type ReportTheme } from "../../data/theme";\n', "", "bdf theme import")
s = sub1(s, "  look,\n  setLook,\n", "  children,\n", "bdf destructure")
s = sub1(
    s,
    "  /** The report's current look: its margins live here. */\n  look: ReportTheme;\n  setLook: (f: (t: ReportTheme) => ReportTheme) => void;\n",
    "  /** Version E: what sits under the brand (the report's layouts). */\n  children?: ReactNode;\n",
    "bdf types",
)
s = sub1(s, "  const margin = look.margin ?? 96;\n", "", "bdf margin")
s, n = re.subn(
    r"\{/\* -+ Document margins -+ \*/\}.*?</div>\n(?=      </div>\n\n      \{/\* Changes to the brand)",
    "{children}\n",
    s,
    flags=re.S,
)
if n != 1:
    raise SystemExit("bdf margins block not found")
s = s.replace(
    " * Version F (Separate Themes) — the report's Design tab",
    " * Versions E and F — the brand in the report's Design tab (from F)",
)
wr(os.path.join(K, "components/report/BrandDesignF.tsx"), s)

# ---------------------------------------------------------------- ThemePanel -> layouts list
wr(
    os.path.join(K, "components/themes/ThemePanel.tsx"),
    '''import type { Brand } from "../../data/brand";
import { brandThemes, defaultTheme, type ReportTheme } from "../../data/theme";
import { NewThemeCard, ThemeCard } from "./Themes";

/* ------------------------------------------------------------------ *
 * Version E — the report's layouts, under the brand in the Design tab
 *
 * (Layouts were called themes.) A layout is the header, footer, margins and
 * background, saved in the brand. Clicking a card applies it. Edit, or
 * "New layout", edits it right on the report, where it is saved.
 * ------------------------------------------------------------------ */

export function ThemePanel({
  brand,
  themeId,
  setThemeId,
  editingId,
  onEdit,
}: {
  brand?: Brand;
  themeId?: string;
  setThemeId: (id: string) => void;
  /** The layout being edited on the report, if any. */
  editingId?: string;
  onEdit: (t: ReportTheme | "new") => void;
}) {
  if (!brand) return null;
  const themes = brandThemes(brand);
  const def = defaultTheme(brand);
  const current = themes.find((t) => t.id === themeId) ?? def;
  const editing = editingId !== undefined;

  return (
    <div className={`lay-sec ${editing ? "editing" : ""}`}>
      <div className="bdf2-title">Layouts</div>
      <div className="theme-list">
        {themes.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            brand={brand}
            selected={editing ? editingId === t.id : current?.id === t.id}
            isDefault={def?.id === t.id}
            onClick={() => !editing && setThemeId(t.id)}
            onEdit={editing ? undefined : () => onEdit(t)}
          />
        ))}
        {!editing && <NewThemeCard onClick={() => onEdit("new")} />}
      </div>
    </div>
  );
}
''',
)

# ---------------------------------------------------------------- Themes.tsx
p = os.path.join(K, "components/themes/Themes.tsx")
s = rd(p)
s = sub1(s, "<span>New theme</span>", "<span>New layout</span>", "new card")
wr(p, s)

# ---------------------------------------------------------------- ThemeSide.tsx
p = os.path.join(K, "components/themes/ThemeSide.tsx")
s = rd(p)
s = re.sub(r"(<Icon name=\"chevron-left\" size=\{16\} />\s*)Themes", r"\1Layouts", s)
s = sub1(s, '{isNew ? "New theme" : "Editing theme"}', '{isNew ? "New layout" : "Editing layout"}', "side head")
s = sub1(s, 'aria-label="Theme name"', 'aria-label="Layout name"', "side aria")
s = sub1(s, '{isNew ? "Create theme" : "Save"}', '{isNew ? "Create layout" : "Save"}', "side create")
s = s.replace("uses this theme.", "uses this layout.")
s = s.replace(
    "The brand&rsquo;s light colors. Text colors and fonts are set in {brand.name}&rsquo;s styles.",
    "The brand&rsquo;s light colors. Text colors and fonts are the brand&rsquo;s.",
)
if "Themes" in re.sub(r"\{/\*.*?\*/\}|/\*.*?\*/", "", s, flags=re.S).split("ts-back")[1][:200]:
    raise SystemExit("back label not renamed")
wr(p, s)

# ---------------------------------------------------------------- BrandPeek.tsx
p = os.path.join(K, "components/org/BrandPeek.tsx")
s = rd(p)
s = sub1(s, "brand's styles and report themes comes from here.", "brand's styles and report layouts comes from here.", "peek blurb")
s = sub1(s, "Shown wherever a theme places the Logo object", "Shown wherever a layout places the Logo object", "peek logo")
s = sub1(s, 'title="Report themes"', 'title="Report layouts"', "peek title")
s = sub1(
    s,
    "A theme is a report's layout: its header, footer, margins and background. Reports start with the default theme. Themes are made and edited in a report, from its Design tab.",
    "A layout is a report's header, footer, margins and background. Reports start with the default layout. Layouts are made and edited in a report, from its Design tab.",
    "peek themes blurb",
)
wr(p, s)

# ---------------------------------------------------------------- ReportEditor.tsx
p = os.path.join(K, "components/report/ReportEditor.tsx")
s = rd(p)
s = sub1(
    s,
    'import { ThemePanel } from "../themes/ThemePanel";\n',
    'import { ThemePanel } from "../themes/ThemePanel";\nimport { BrandDesignF } from "./BrandDesignF";\n',
    "re import",
)
s = sub1(
    s,
    "  const brand = brands.find((b) => b.id === brandId);\n  /* Version E (Brand Themes): the theme",
    """  const baseBrand = brands.find((b) => b.id === brandId);
  /* Version E (Nov 3, from F): the brand's styles are designed from the
     Design tab. Changes wait for "Save brand changes"; the page shows them
     straight away. */
  const [brandPatch, setBrandPatch] = useState<Partial<Brand>>({});
  const brand = useMemo(
    () => (baseBrand ? { ...baseBrand, ...brandPatch } : undefined),
    [baseBrand, brandPatch]
  );
  const brandDirty = Object.keys(brandPatch).length > 0;
  const saveBrand = () => {
    if (!baseBrand || !brandDirty) return;
    updateBrand(baseBrand.id, brandPatch);
    setBrandPatch({});
    toast(`${baseBrand.name} saved`);
  };
  /* Version E (Brand Themes): the theme""",
    "re brand",
)
s = sub1(s, 'name: "New theme" });', 'name: "New layout" });', "re new name")
s = sub1(s, "toast(isNew ? `Theme \\u201c", "toast(isNew ? `Layout \\u201c", "re toast")
s = sub1(s, '`${orig?.name ?? "Theme"} copy`', '`${orig?.name ?? "Layout"} copy`', "re copy")

old_panel = re.search(
    r"          \{tab === \"design\" && !\(themeDraft && brand\) && \(\n.*?            <ThemePanel\n.*?            />\n          \)\}\n",
    s,
    flags=re.S,
)
if not old_panel:
    raise SystemExit("ThemePanel JSX not found")
new_panel = """          {tab === "design" && !(themeDraft && brand) && (
            /* Version E (Nov 3): the brand and its styles (from F), then its layouts. */
            <BrandDesignF
              brands={brands.filter((b) => enabledBrands.includes(b) || b.id === brandId)}
              brandId={brandId}
              setBrandId={(id) => {
                setBrandId(id);
                setBrandPatch({});
                setThemeId(undefined);
                endThemeEdit();
              }}
              brand={brand}
              onChange={(p) => setBrandPatch((x) => ({ ...x, ...p }))}
              dirty={brandDirty}
              onSave={saveBrand}
              onDiscard={() => setBrandPatch({})}
            >
              <ThemePanel
                brand={brand}
                themeId={themeId}
                setThemeId={setThemeId}
                editingId={themeDraft?.id}
                onEdit={startThemeEdit}
              />
            </BrandDesignF>
          )}
"""
s = s[: old_panel.start()] + new_panel + s[old_panel.end() :]
wr(p, s)

# ---------------------------------------------------------------- CSS from F
lcss = rd(os.path.join(L, "styles/global.css")).split("\n")
block = "\n".join(lcss[7696:8240])  # F's inserted rules (lines 7697-8240)
p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* ==== From F (Nov 3) ==== */" not in s:
    s = s.rstrip("\n") + "\n\n/* ==== From F (Nov 3) ==== */\n" + block + """
.bdf2-box .bdf2-all {
  padding: 0;
}
/* Version E: the layouts, under the brand. */
.lay-sec .bdf2-title {
  margin-bottom: 12px;
}
"""
wr(p, s)
print("ok")
