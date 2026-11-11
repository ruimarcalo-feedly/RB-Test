import os, sys

ROOT = sys.argv[1]
p = os.path.join(ROOT, "source-k/src/components/themes/Themes.tsx")
s = open(p, encoding="utf-8").read()


def sub1(s, old, new, label):
    if s.count(old) != 1:
        raise SystemExit(f"[{label}] found {s.count(old)}")
    return s.replace(old, new)


s = sub1(
    s,
    """  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / BAND_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);""",
    """  const [scale, setScale] = useState(0.5);
  /* The band is drawn at the real page's width (measured off the report on
     the canvas), so the thumbnail has the same proportions as the page. */
  const [pageW, setPageW] = useState(BAND_W);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const page = document.querySelector<HTMLElement>(".editor-canvas .report-page");
    const fit = () => {
      const w = page?.clientWidth || BAND_W;
      setPageW(w);
      setScale(el.clientWidth / w);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (page) ro.observe(page);
    return () => ro.disconnect();
  }, []);""",
    "fit",
)
s = sub1(
    s,
    """          width: BAND_W,
          height: h,
          transform: `scale(${scale})`,
          background: theme.background ?? "#FFFFFF",
          ...brandVars(tb),""",
    """          width: pageW,
          height: h,
          transform: `scale(${scale})`,
          background: theme.background ?? "#FFFFFF",
          ...brandVars(tb),
          ...themeSizeVars(theme),""",
    "style",
)
s = sub1(s, "const BAND_W = 560;", "const BAND_W = 1092;", "bandw")
s = sub1(
    s,
    'import { themedBrand, type ReportTheme } from "../../data/theme";',
    'import { themeSizeVars, themedBrand, type ReportTheme } from "../../data/theme";',
    "import",
)
tmp = p + ".tmp"
open(tmp, "w", encoding="utf-8").write(s)
os.replace(tmp, p)
print("ok")
