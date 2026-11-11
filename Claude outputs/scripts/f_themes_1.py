import os, re, sys, shutil

ROOT = sys.argv[1]
L = os.path.join(ROOT, "source-l/src")
OUT = os.path.join(ROOT, "Claude outputs/scripts")


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


# ---------------------------------------------------------------- new files
shutil.copyfile(os.path.join(OUT, "ThemesPanel_1.tsx"), os.path.join(L, "components/themes/ThemesPanel.tsx"))
shutil.copyfile(os.path.join(OUT, "PaletteLists_1.tsx"), os.path.join(L, "components/org/PaletteLists.tsx"))
wr(
    os.path.join(L, "data/themesF.ts"),
    '''import { useSyncExternalStore } from "react";
import { DEFAULT_BRAND } from "./brand";
import { themeFromBrand, type ReportTheme } from "./theme";

/* Version F (Nov 5): themes are their own thing, apart from the brand. The
   org starts with one, "Main report", in the Feedly brand. */
let list: ReportTheme[] = [themeFromBrand(DEFAULT_BRAND, "theme-main", "Main report")];
const subs = new Set<() => void>();

export function setThemesF(next: ReportTheme[]) {
  list = next;
  subs.forEach((f) => f());
}
export const upsertThemeF = (t: ReportTheme) =>
  setThemesF(list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]);
export const removeThemeF = (id: string) => setThemesF(list.filter((x) => x.id !== id));

export function useThemesF(): ReportTheme[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => list
  );
}
''',
)

# ---------------------------------------------------------------- brand.ts: palettes
p = os.path.join(L, "data/brand.ts")
s = rd(p)
if "BrandPalettes" not in s:
    s = sub1(s, "  swatches?: BrandSwatches;\n", "  swatches?: BrandSwatches;\n  /** Version F (Nov 5): the brand's colors as lists, apart from where they go. */\n  palettes?: BrandPalettes;\n", "brand field")
    s = s.rstrip("\n") + '''

/* ------------------------------------------------------------------ *
 * Version F (Nov 5): a brand's colors as three lists. Which color goes on
 * which text or structure is up to each theme.
 * ------------------------------------------------------------------ */
export interface BrandPalettes {
  primary: string[];
  secondary: string[];
  neutral: string[];
}

const FEEDLY_PALETTES: BrandPalettes = {
  primary: ["#2BB24C"],
  secondary: ["#1E8E3E", "#D5F0DB"],
  neutral: ["#333333", "#757575", "#BDBDBD", "#F2F2F2", "#FFFFFF"],
};

export function brandPalettes(brand: Brand | undefined): BrandPalettes {
  if (!brand) return { primary: [], secondary: [], neutral: [] };
  if (brand.palettes) return brand.palettes;
  if (brand.id === FEEDLY_BRAND.id || brand.id === "brand-default") return FEEDLY_PALETTES;
  const sw = brandSwatches(brand);
  const uniq = (xs: string[]) => xs.map((x) => x.toUpperCase()).filter((x, i, a) => a.indexOf(x) === i);
  return { primary: uniq([sw.primary]), secondary: uniq([sw.secondary, sw.tertiary]), neutral: uniq([...sw.more, sw.background]) };
}
'''
    wr(p, s)

# ---------------------------------------------------------------- theme.ts: the theme owns its colors
p = os.path.join(L, "data/theme.ts")
s = rd(p)
if "tableHeaderText" not in s:
    s = sub1(
        s,
        "  /** The page's background color. */\n  background?: string;\n}",
        "  /** The page's background color. */\n  background?: string;\n  /** Version F (Nov 5): table header text, header background and border. */\n  tableHeaderText?: string;\n  tableHeaderBg?: string;\n  tableBorder?: string;\n}",
        "theme fields",
    )
    s = resub1(
        s,
        r"export function themedBrand\(brand: Brand \| undefined, theme: ReportTheme \| undefined\): Brand \| undefined \{\n  void theme;\n  return brand;\n\}",
        """export function themedBrand(brand: Brand | undefined, theme: ReportTheme | undefined): Brand | undefined {
  /* Version F (Nov 5): the theme decides which of the brand's colors goes on
     each text style and structure; fonts stay the brand's. */
  if (!brand || !theme) return brand;
  const colors = { ...brand.colors };
  (Object.keys(theme.type) as TypeKey[]).forEach((k) => {
    colors[k] = theme.type[k].color;
  });
  return { ...brand, colors, structure: { dividers: theme.divider, table: theme.table } };
}""",
        "themedBrand",
    )
    s = s.rstrip("\n") + '''

/** Version F (Nov 5): a theme's table colors, as CSS custom properties. */
export function themeTableVars(theme: ReportTheme | undefined): Record<string, string> {
  if (!theme) return {};
  return {
    "--b-th": theme.tableHeaderText ?? theme.type.paragraph.color,
    "--b-th-bg": theme.tableHeaderBg ?? theme.table,
    "--b-table-border": theme.tableBorder ?? theme.divider,
  };
}

/** Version F (Nov 5): a theme that applies a brand's colors sensibly. */
export function themeFromBrand(brand: Brand | undefined, id: string, name: string): ReportTheme {
  const base = simpleTheme(brand, id);
  const p = brand?.palettes ?? fallbackPalettes(brand);
  const dark = p.neutral[0] ?? "#333333";
  const mid = p.neutral[1] ?? dark;
  const line = p.neutral[2] ?? "#E6E6E6";
  const tint = p.neutral[3] ?? "#F2F2F2";
  const accent = p.primary[0] ?? dark;
  const color = (k: TypeKey) =>
    ({ h1: dark, h2: accent, h3: mid, h4: accent, paragraph: dark, caption: mid })[k];
  const type = Object.fromEntries(
    (Object.keys(base.type) as TypeKey[]).map((k) => [k, { ...base.type[k], color: color(k) }])
  ) as ReportTheme["type"];
  return {
    ...base,
    name,
    brandId: brand?.id,
    type,
    divider: line,
    table: tint,
    tableHeaderText: dark,
    tableHeaderBg: tint,
    tableBorder: line,
    background: "#FFFFFF",
  };
}

function fallbackPalettes(brand: Brand | undefined): { primary: string[]; neutral: string[] } {
  if (brand && (brand.id === "brand-default" || brand.name === "Feedly"))
    return { primary: ["#2BB24C"], neutral: ["#333333", "#757575", "#E6E6E6", "#F2F2F2"] };
  const c = brand?.colors;
  return {
    primary: [c?.h2 ?? "#333333"],
    neutral: [c?.h1 ?? "#333333", c?.caption ?? "#757575", brand?.structure.dividers ?? "#E6E6E6", brand?.structure.table ?? "#F2F2F2"],
  };
}
'''
    wr(p, s)

# ---------------------------------------------------------------- AlignedSideMenu: "Edit theme" in the block handle menu
p = os.path.join(L, "components/editor/AlignedSideMenu.tsx")
s = rd(p)
if "EditThemeContext" not in s:
    s = sub1(
        s,
        'import { SideMenuController } from "@blocknote/react";',
        '''import { createContext, useContext } from "react";
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  useComponentsContext,
} from "@blocknote/react";

/** Version F (Nov 5): when set, the block handle menu offers "Edit theme". */
export const EditThemeContext = createContext<(() => void) | null>(null);

function EditThemeItem({ onEdit }: { onEdit: () => void }) {
  const C = useComponentsContext();
  if (!C) return null;
  return (
    <C.Generic.Menu.Item className="bn-menu-item" onClick={onEdit}>
      Edit theme
    </C.Generic.Menu.Item>
  );
}''',
        "side imports",
    )
    s = sub1(
        s,
        "export function AlignedSideMenu() {\n  return (\n    <SideMenuController\n",
        """export function AlignedSideMenu() {
  const editTheme = useContext(EditThemeContext);
  return (
    <SideMenuController
      sideMenu={
        editTheme
          ? (props) => (
              <SideMenu
                {...props}
                dragHandleMenu={() => (
                  <DragHandleMenu>
                    <RemoveBlockItem>Delete</RemoveBlockItem>
                    <BlockColorsItem>Colors</BlockColorsItem>
                    <EditThemeItem onEdit={editTheme} />
                  </DragHandleMenu>
                )}
              />
            )
          : undefined
      }
""",
        "side menu",
    )
    wr(p, s)

# ---------------------------------------------------------------- ReportEditor
p = os.path.join(L, "components/report/ReportEditor.tsx")
s = rd(p)
i = s.find("  /* Version F (Separate Themes): the brand's styles are designed from the")
j = s.find("deleted`);\n  };\n", i)
if i < 0 or j < 0:
    raise SystemExit("theme logic block")
j += len("deleted`);\n  };\n")
s = s[:i] + '''  const brand = baseBrand;
  /* ---------------- Version F (Nov 5): the Themes tab ----------------
     Themes live apart from the brand. The report uses one (its look starts
     as a copy of it); changes on the page stay on the report. Opening a
     theme from the Themes tab edits the theme itself, and the page shows the
     draft until it is saved or dismissed. */
  const themesF = useThemesF();
  const [themeId, setThemeId] = useState<string | undefined>(() => themesF[0]?.id);
  const [look, setLook] = useState<ReportTheme>(() => ({
    ...(themesF[0] ?? themeFromBrand(baseBrand, "theme-main", "Main report")),
  }));
  const [themeEdit, setThemeEdit] = useState<ThemeEdit | null>(null);
  const pageTheme = themeEdit?.draft ?? look;
  const pageBrand = brands.find((b) => b.id === pageTheme.brandId) ?? brand;
  const applyThemeF = (t: ReportTheme) => {
    setThemeId(t.id);
    setLook({ ...t });
    if (t.brandId) setBrandId(t.brandId);
  };
  const openThemeF = (t: ReportTheme) => {
    applyThemeF(t);
    setThemeEdit({ draft: { ...t }, original: t });
    setTab("design");
  };
  const saveThemeF = () => {
    if (!themeEdit) return;
    const t = { ...themeEdit.draft, name: themeEdit.draft.name.trim() || "Untitled theme" };
    upsertThemeF(t);
    applyThemeF(t);
    setThemeEdit(null);
    setActiveBand(null);
    toast(themeEdit.original ? `\\u201c${t.name}\\u201d saved` : `Theme \\u201c${t.name}\\u201d created`);
  };
  const editThemeF = () => {
    const t = themesF.find((x) => x.id === themeId) ?? themesF[0];
    if (t) openThemeF(t);
  };
''' + s[j:]

s = resub1(
    s,
    r"            \{/\* Version F: save the whole look as a theme, or use a saved one\. \*/\}\n.*?              Themes\n            </button>\n",
    "",
    "top themes button",
)
s = resub1(s, r'(onClick=\{\(\) => setTab\("design"\)\}\n(?:[^\n]*\n){0,3}?\s*>\n\s*)Design\n', r"\1Themes\n", "tab label")
s = resub1(
    s,
    r'          \{tab === "design" && \(\n            /\* Version F: the brand and all its styles, designed from here\. \*/\n            <BrandDesignF\n.*?\n            />\n          \)\}\n',
    """          {tab === "design" && (
            /* Version F (Nov 5): the Themes tab. */
            <ThemesPanel
              themes={themesF}
              brands={brands}
              currentId={themeId}
              edit={themeEdit}
              setDraft={(f) => setThemeEdit((e) => (e ? { ...e, draft: f(e.draft) } : e))}
              onOpen={openThemeF}
              onBack={() => {
                setThemeEdit(null);
                setActiveBand(null);
              }}
              onSave={saveThemeF}
              onRename={(t, name) => {
                upsertThemeF({ ...t, name });
                if (t.id === themeId) setLook((l) => ({ ...l, name }));
              }}
              onDuplicate={(t) => {
                upsertThemeF({ ...t, id: nextId("theme"), name: `${t.name} copy` });
                toast(`\\u201c${t.name}\\u201d duplicated`);
              }}
              onDelete={(t) => {
                removeThemeF(t.id);
                if (t.id === themeId) {
                  const rest = themesF.filter((x) => x.id !== t.id);
                  if (rest[0]) applyThemeF(rest[0]);
                }
                toast(`\\u201c${t.name}\\u201d deleted`);
              }}
              onCreateManual={() =>
                setThemeEdit({ draft: themeFromBrand(pageBrand, nextId("theme"), "New theme"), original: null })
              }
              onGenerated={(b, t) => {
                upsertThemeF(t);
                applyThemeF(t);
                setThemeEdit({ draft: { ...t }, original: t });
                toast(`Theme \\u201c${t.name}\\u201d and brand \\u201c${b.name}\\u201d created`);
              }}
              activeBand={activeBand}
              onPickBand={selectBand}
            />
          )}
""",
    "themes panel",
)
m = re.search(r"\n            <ReportCanvas\n.*?\n            />\n", s, flags=re.S)
if not m:
    raise SystemExit("ReportCanvas")
blk = m.group(0)
blk = sub1(blk, "              brand={brand}\n", "              brand={pageBrand}\n", "canvas brand")
blk = sub1(blk, "              theme={theme}\n", "              theme={pageTheme}\n", "canvas theme")
blk = sub1(
    blk,
    "              onThemeBand={(k, b) => setLook((d) => ({ ...d, [k]: b }))}\n",
    "              onThemeBand={(k, b) =>\n                themeEdit\n                  ? setThemeEdit((e) => (e ? { ...e, draft: { ...e.draft, [k]: b } } : e))\n                  : setLook((d) => ({ ...d, [k]: b }))\n              }\n",
    "canvas band",
)
blk = "\n            <EditThemeContext.Provider value={editThemeF}>" + blk + "            </EditThemeContext.Provider>\n"
s = s[: m.start()] + blk + s[m.end():]
i = s.find("      {themesOpen && (")
j = s.find("      {libraryFor && (", i)
if i < 0 or j < 0:
    raise SystemExit("themes menu jsx")
s = s[:i] + s[j:]
s = sub1(s, "...themeSizeVars(theme),", "...themeSizeVars(theme),\n        ...themeTableVars(theme),", "table vars")
s = sub1(s, '.theme-side, .theme-inline, .bdf2-bands"', '.theme-side, .theme-inline, .bdf2-bands, .thf"', "click-off")
s = sub1(s, 'import { BrandDesignF, BuildingBlocks } from "./BrandDesignF";', '''import { BuildingBlocks } from "./BrandDesignF";
import { ThemesPanel, type ThemeEdit } from "../themes/ThemesPanel";
import { removeThemeF, upsertThemeF, useThemesF } from "../../data/themesF";
import { EditThemeContext } from "../editor/AlignedSideMenu";''', "imports")
s = sub1(s, "  simpleTheme,\n", "  simpleTheme,\n  themeFromBrand,\n  themeTableVars,\n", "theme imports")
wr(p, s)

# ---------------------------------------------------------------- BrandPeek: no Report Builder, palettes as lists, fonts only
p = os.path.join(L, "components/org/BrandPeek.tsx")
s = rd(p)
s = sub1(s, 'import { ColorField } from "../ui/ColorField";', 'import { ColorField } from "../ui/ColorField";\nimport { PaletteLists } from "./PaletteLists";', "peek import")
s = resub1(
    s,
    r'          <Section\n            title="Colors"\n.*?          </Section>\n(          <Section\n            title="Text styles")',
    r'''          <Section
            title="Colors"
            blurb="The brand's colors, kept as lists. Report themes decide which of them goes on which text, table and divider."
          >
            <PaletteLists brand={draft} onChange={(pal) => setDraft((d) => ({ ...d, palettes: pal }))} />
          </Section>
\1''',
    "colors section",
)
s = sub1(
    s,
    'blurb="Styles that will affect the typography of exported products, such as Automated Newsletters and Report Builder. Colors come from the palette above."',
    'blurb="The font for each text style in exported products, such as Automated Newsletters and Report Builder. Their colors are set in each report theme."',
    "text blurb",
)
s = sub1(s, '                { key: "name", label: "Name", width: 536 },\n                { key: "font", label: "Font", width: 178 },\n                { key: "color", label: "Color", width: 230 },\n', '                { key: "name", label: "Name", width: 714 },\n                { key: "font", label: "Font", width: 230 },\n', "cols")
s = sub1(s, 'key === "font" ? draft.fonts[r.key] : key === "color" ? draft.colors[r.key] : r.label', 'key === "font" ? draft.fonts[r.key] : r.label', "sort")
s = resub1(
    s,
    r'(                  onPreview=\{\(v\) => setTryFont\(v \? \{ key: r\.key, font: v \} : null\)\}\n                />,\n)                <PaletteField\n                  key="c"\n                  value=\{draft\.colors\[r\.key\]\}\n.*?/>,\n',
    r"\1",
    "type color cell",
)
s = sub1(s, '                ["rb", "Report Builder"],\n', "", "rb tab")
i = s.find('          {tab === "rb" && (')
j = s.find("\n            </>\n          )}\n", i)
if i < 0 or j < 0:
    raise SystemExit("rb block")
s = s[:i] + s[j + len("\n            </>\n          )}\n"):]
wr(p, s)

# ---------------------------------------------------------------- CSS
p = os.path.join(L, "styles/global.css")
s = rd(p)
if "/* ==== Version F: Themes tab (Nov 5) ==== */" not in s:
    s = s.rstrip("\n") + rd(os.path.join(OUT, "f_themes_1.css"))
    wr(p, s)
print("ok")
