import os, re, sys

ROOT = sys.argv[1]
B = os.path.join(ROOT, "source-b/src")
G = os.path.join(ROOT, "source-g/src")


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


p = os.path.join(B, "components/editor/TemplateEditor.tsx")
s = rd(p)

# state, as in C
s = sub1(
    s,
    '  const [activeBand, setActiveBand] = useState<"header" | "footer" | null>(null);\n',
    '''  const [activeBand, setActiveBand] = useState<"header" | "footer" | null>(null);
  /* From version C (Nov 4): the Template Prompt's outline and badge show on
     hover, or while it is selected (clicked into); clicking elsewhere lets go
     of it. On a Feedly template, a badge follows the cursor over the prompt. */
  const promptRef = useRef<HTMLDivElement>(null);
  const [lockTip, setLockTip] = useState<{ x: number; y: number } | null>(null);
  const [promptSel, setPromptSel] = useState(false);
  useEffect(() => {
    if (!promptSel) return;
    const onDown = (e: PointerEvent) => {
      if (!promptRef.current?.contains(e.target as Node)) setPromptSel(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [promptSel]);
''',
    "state",
)

# the notice moves from above the page into the prompt
s = re.sub(
    r"          \{/\* Figma: the banner scrolls with the body.*?\n          \{readOnly && \(\n            <div className=\"info-bar\">.*?\n            </div>\n          \)\}\n",
    "",
    s,
    count=1,
    flags=re.S,
)
if 'Feedly templates cannot be edited.</span>' in s:
    raise SystemExit("banner not removed")

s = sub1(s, '            className="canvas-page"\n            style={{ ...brandVars(brand), ...bandVars(header, footer, brand) }}', '            className="canvas-page tpl-page"\n            style={{ ...brandVars(brand), ...bandVars(header, footer, brand) }}', "page class")

s = sub1(
    s,
    """            <div
              className={`canvas-doc ${readOnly ? "locked" : ""} ${docDrop ? "drop-over" : ""}`}
              onDragOver""",
    """            {/* From version C: the template's own content is the prompt the
                report is written from, between dashed lines. Feedly's is
                read-only (grey, with the notice across its top); a custom
                template's is editable (white). */}
            <div
              ref={promptRef}
              className={`tpl-prompt ${readOnly ? "locked" : ""} ${promptSel ? "selected" : ""}`}
              onPointerDown={() => setPromptSel(true)}
            >
              <span className="tpl-prompt-badge">Template Prompt</span>
              {readOnly && (
                <div className="info-bar tpl-info">
                  <Icon name="info" size={24} style={{ color: "#2f6fd0" }} />
                  <span className="strong">Feedly template prompts cannot be edited.</span>
                  <span className="muted">Please duplicate it for full edit access.</span>
                </div>
              )}
            <div
              className={`canvas-doc ${readOnly ? "locked" : ""} ${docDrop ? "drop-over" : ""}`}
              onPointerMove={readOnly ? (e) => setLockTip({ x: e.clientX, y: e.clientY }) : undefined}
              onPointerLeave={readOnly ? () => setLockTip(null) : undefined}
              onDragOver""",
    "prompt open",
)
s = sub1(
    s,
    """              {generating ? (
                <SkeletonDoc />
              ) : (
                <BlockNoteCanvas""",
    """              {readOnly && lockTip && (
                <div className="cursor-badge" style={{ left: lockTip.x + 14, top: lockTip.y + 18 }}>
                  Feedly template prompts cannot be edited
                </div>
              )}
              {generating ? (
                <SkeletonDoc />
              ) : (
                <BlockNoteCanvas""",
    "cursor badge",
)
s = sub1(
    s,
    """                />
              )}
            </div>
            <PageBandEditor
              kind="footer\"""",
    """                />
              )}
            </div>
            </div>
            <PageBandEditor
              kind="footer\"""",
    "prompt close",
)
wr(p, s)

# ---------------------------------------------------------------- CSS from C
def rules(css):
    """Top-level rule blocks (selector, body) plus @media blocks as whole."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        sel = css[i:j]
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        out.append((sel, css[i:k]))
        i = k
    return out


gcss = rd(os.path.join(G, "styles/global.css"))
bp = os.path.join(B, "styles/global.css")
bcss = rd(bp)
want = re.compile(r"tpl-prompt|tpl-info|cursor-badge|tpl-page")
picked = []
for sel, block in rules(gcss):
    sel_clean = re.sub(r"/\*.*?\*/", "", sel, flags=re.S).strip()
    if want.search(sel_clean) or (sel_clean.startswith("@") and want.search(block)):
        text = block.strip("\n")
        if text.strip() not in bcss:
            picked.append(text.strip())
if "/* ==== From C (Nov 4): Template Prompt ==== */" not in bcss:
    bcss = bcss.rstrip("\n") + "\n\n/* ==== From C (Nov 4): Template Prompt ==== */\n" + "\n\n".join(picked) + "\n"
    wr(bp, bcss)
print("ok", len(picked), "rules")
