import os, re, sys

ROOT = sys.argv[1]
K = os.path.join(ROOT, "source-k/src")
L = os.path.join(ROOT, "source-l/src")


def rd(p):
    return open(p, encoding="utf-8").read()


def wr(p, s):
    open(p + ".tmp", "w", encoding="utf-8").write(s)
    os.replace(p + ".tmp", p)


def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected 1 match, found {n}: {old[:80]!r}")
    return s.replace(old, new)


# ================================================================ E: Brand style first, Layout as its child
p = os.path.join(K, "components/report/BrandDesignF.tsx")
s = rd(p)
s = sub1(s, '        {/* Version E (Nov 3): Layout first, then the brand. */}\n        {children && <div className="bdf3-layout">{children}</div>}\n', "", "remove layout first")
# after the Brand style top block, before the palette
s = re.sub(
    r'(<div className="bdf3-top">.*?\n          </div>\n)',
    r"""\1
          {/* Nov 4: the brand is the parent; Layout and everything below it are
              its children, so Layout comes right under the picker. */}
          {children && <div className="bdf3-layout">{children}</div>}
""",
    s,
    count=1,
    flags=re.S,
)
if s.count("bdf3-layout") != 1:
    raise SystemExit("layout insert")
wr(p, s)

p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* Nov 4: Layout under Brand style */" not in s:
    s = s.rstrip("\n") + """

/* Nov 4: Layout under Brand style, ended by a rule that sits inside the
   panel's padding (not edge to edge). */
.bdf3 .bdf3-layout {
  margin: 0 0 24px;
  padding: 0 0 24px;
  border-bottom: 1px solid var(--border-lightest, #f2f2f2);
}
.bdf3 .bdf3-top {
  margin-top: -24px;
  padding-top: 16px;
}
"""
    wr(p, s)

# ================================================================ F: header and footer under Document margins
# BandThumb: the true-ratio version from E
kt = rd(os.path.join(K, "components/themes/Themes.tsx"))
lp = os.path.join(L, "components/themes/Themes.tsx")
lt = rd(lp)
kb = re.search(r"/\*\* A theme's header or footer, small:.*?\nconst BAND_W = 1092;\n", kt, flags=re.S)
lb = re.search(r"/\*\* A theme's header or footer, small:.*?\nconst BAND_W = 560;\n", lt, flags=re.S)
if not kb or not lb:
    raise SystemExit("BandThumb blocks")
lt = lt[: lb.start()] + kb.group(0) + lt[lb.end():]
lt = sub1(lt, 'import { themedBrand, type ReportTheme } from "../../data/theme";', 'import { themeSizeVars, themedBrand, type ReportTheme } from "../../data/theme";', "L import")
wr(lp, lt)

p = os.path.join(L, "components/report/BrandDesignF.tsx")
s = rd(p)
s = sub1(s, 'import { THEME_MARGINS, type ReportTheme } from "../../data/theme";', 'import { THEME_MARGINS, type ReportTheme } from "../../data/theme";\nimport { BandThumb } from "../themes/Themes";', "F import")
s = sub1(s, "  onDiscard,\n}: {", "  onDiscard,\n  activeBand,\n  onPickBand,\n}: {", "F props")
s = sub1(s, "  onDiscard: () => void;\n}) {", "  onDiscard: () => void;\n  /** Nov 4: the header and footer previews select the band on the page. */\n  activeBand?: \"header\" | \"footer\" | null;\n  onPickBand?: (k: \"header\" | \"footer\") => void;\n}) {", "F types")
s = sub1(
    s,
    """              {m.label}
            </button>
          ))}
        </div>
      </div>
""",
    """              {m.label}
            </button>
          ))}
        </div>

        {/* Nov 4: the report's header and footer, as they are on the page. */}
        <div className="bdf2-bands">
          {(["header", "footer"] as const).map((k) => (
            <div className="bdf2-band" key={k}>
              <div className="bdf2-title">{k === "header" ? "Header" : "Footer"}</div>
              <BandThumb
                theme={look}
                brand={brand}
                kind={k}
                active={activeBand === k}
                onClick={() => onPickBand?.(k)}
              />
            </div>
          ))}
          <div className="bdf2-help">Click the header or footer on the page to change it.</div>
        </div>
      </div>
""",
    "F bands",
)
wr(p, s)

p = os.path.join(L, "components/report/ReportEditor.tsx")
s = rd(p)
s = sub1(s, "              onDiscard={() => setBrandPatch({})}\n            />", "              onDiscard={() => setBrandPatch({})}\n              activeBand={activeBand}\n              onPickBand={selectBand}\n            />", "F editor")
s = sub1(s, '".band-wrap, .band-toolbar, .bobj-card, .menu, .scrim, .theme-side, .theme-inline"', '".band-wrap, .band-toolbar, .bobj-card, .menu, .scrim, .theme-side, .theme-inline, .bdf2-bands"', "F click-off")
wr(p, s)

p = os.path.join(L, "styles/global.css")
s = rd(p)
if "/* Nov 4: F header and footer previews */" not in s:
    s = s.rstrip("\n") + """

/* Nov 4: F header and footer previews */
.bdf2-bands {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}
.bdf2-band .bdf2-title {
  margin-bottom: 8px;
}
.bdf2-bands .bdf2-help {
  margin-top: -8px;
}
.band-thumb.theme-thumb .report-page.themed .band-slot.left {
  padding-left: var(--doc-m, 96px);
}
.band-thumb.theme-thumb .report-page.themed .band-slot.right {
  padding-right: var(--doc-m, 96px);
}
"""
    wr(p, s)
print("ok")
