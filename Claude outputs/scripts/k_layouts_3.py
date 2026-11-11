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


# ---------------------------------------------------------------- bar: like Regenerate
p = os.path.join(K, "components/report/BrandDesignF.tsx")
s = rd(p)
s = re.sub(
    r"      \{dirty && brand && \(\n        <div className=\"bd-savebar\">.*?</div>\n      \)\}\n",
    """      {dirty && brand && (
        <div className="side-foot lay-foot">
          <span className="lay-changed">Styles have changed</span>
          <Button onClick={onDiscard}>Dismiss</Button>
          <Button variant="primary" onClick={onSave}>
            Save to brand
          </Button>
        </div>
      )}
""",
    s,
    count=1,
    flags=re.S,
)
if "lay-changed" not in s:
    raise SystemExit("bar not replaced")
wr(p, s)

# ---------------------------------------------------------------- Feedly brand by default (as in F)
p = os.path.join(K, "data/brand.ts")
s = rd(p)
s = re.sub(
    r"(export const DEFAULT_BRAND: Brand = \{\n).*?\n\};\n",
    r"""\1  /* Version E (Nov 3, as in F): the brand every report starts in is
     Feedly's own: its logo and colors. */
  ...FEEDLY_BRAND,
  id: "brand-default",
  name: "Feedly",
};
""",
    s,
    count=1,
    flags=re.S,
)
if 'name: "Feedly",\n};' not in s:
    raise SystemExit("DEFAULT_BRAND not replaced")
# PLACEHOLDER_LOGO may now be unused; keep it exported so tsc does not complain.
s = s.replace("\nconst PLACEHOLDER_LOGO =", "\nexport const PLACEHOLDER_LOGO =")
wr(p, s)

p = os.path.join(K, "data/mockData.ts")
s = rd(p)
s = sub1(s, '    id: "o-brand-default",\n    name: "Your brand",', '    id: "o-brand-default",\n    name: "Feedly",', "org item")
wr(p, s)

# ---------------------------------------------------------------- Starter layout (F's starter theme)
p = os.path.join(K, "data/theme.ts")
s = rd(p)
s = sub1(s, '    name: "Simple",\n', '    /* As F\'s Starter theme: the brand\'s hero artwork behind the logo. */\n    name: "Starter layout",\n', "name")
s = sub1(
    s,
    '      background: "#F2F2F2",\n      image: null,\n      height: 80,\n',
    '      background: "#F2F2F2",\n      image: null,\n      height: 80,\n      imageAsset: brand?.assets.some((a) => a.id === "hero") ? "hero" : undefined,\n',
    "hero",
)
wr(p, s)

# ---------------------------------------------------------------- CSS
p = os.path.join(K, "styles/global.css")
s = rd(p)
if "/* Version E: save bar (Nov 3c) */" not in s:
    s = s.rstrip("\n") + """

/* Version E: save bar (Nov 3c), sized like the Regenerate foot. */
.side-foot.lay-foot {
  align-items: center;
}
.lay-changed {
  margin-right: auto;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: #8a5300;
  background: #fff1db;
  white-space: nowrap;
}
"""
wr(p, s)
print("ok")
