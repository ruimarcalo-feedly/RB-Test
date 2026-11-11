import { type BandElement, type Brand, type PageBand, type TypeKey } from "./brand";

/* ------------------------------------------------------------------ *
 * Version E (Brand Themes) — report themes, saved inside a brand
 *
 * Like Typeform's brand kits: a brand keeps its styles (images, colors,
 * fonts) and any number of report themes. Colors and fonts are decided in the
 * brand; a theme is a report's layout: its header, footer, margins and
 * background. A report picks one theme.
 * ------------------------------------------------------------------ */

export interface TypeStyle {
  font: string;
  color: string;
  /** In px. */
  size: number;
}

export interface ReportTheme {
  id: string;
  name: string;
  header: PageBand;
  footer: PageBand;
  type: Record<TypeKey, TypeStyle>;
  divider: string;
  table: string;
  /** The page's side margins, in px. */
  margin?: number;
  /** The page's background color. */
  background?: string;
}

/** The margin choices, in px; Normal is the 900 column on a 1092 page. */
export const THEME_MARGINS: { label: string; px: number }[] = [
  { label: "Narrow", px: 48 },
  { label: "Normal", px: 96 },
  { label: "Wide", px: 160 },
];

export const TYPE_LABELS: { key: TypeKey; label: string }[] = [
  { key: "h1", label: "Heading 1" },
  { key: "h2", label: "Heading 2" },
  { key: "h3", label: "Heading 3" },
  { key: "h4", label: "Heading 4" },
  { key: "paragraph", label: "Paragraph" },
  { key: "caption", label: "Caption" },
];

/** The theme every brand starts with: greyscale and plain. */
export function simpleTheme(brand: Brand | undefined, id = "theme-simple"): ReportTheme {
  const font = brand?.font ?? "Helvetica";
  return {
    id,
    /* As F's Starter theme: the brand's hero artwork behind the logo. */
    name: "Starter layout",
    header: {
      left: { kind: "logo" },
      middle: null,
      right: null,
      scope: "cover",
      background: "#F2F2F2",
      image: null,
      height: 80,
      imageAsset: brand?.assets.some((a) => a.id === "hero") ? "hero" : undefined,
    },
    footer: {
      left: null,
      middle: { kind: "tlp", text: "TLP: AMBER" },
      right: { kind: "pageCount" },
      scope: "all",
      background: "transparent",
      image: null,
    },
    type: {
      h1: { font, color: "#1F1F1F", size: 34 },
      h2: { font, color: "#333333", size: 26 },
      h3: { font, color: "#555555", size: 16 },
      h4: { font, color: "#555555", size: 15 },
      paragraph: { font, color: "#333333", size: 14 },
      caption: { font, color: "#8A8A8A", size: 13 },
    },
    divider: "#E6E6E6",
    table: "#F2F2F2",
    margin: 96,
    background: "#FFFFFF",
  };
}

/** The brand's themes, the simple one when it has none yet. */
export function brandThemes(brand: Brand | undefined): ReportTheme[] {
  return brand?.themes?.length ? brand.themes : [simpleTheme(brand)];
}

/**
 * The brand as a theme draws it. Colors and fonts are the brand's alone (set
 * once, in its styles), so a theme changes nothing here: it is layout only,
 * its header, footer, margins and background.
 */
export function themedBrand(brand: Brand | undefined, theme: ReportTheme | undefined): Brand | undefined {
  void theme;
  return brand;
}

/** Light enough to sit behind the brand's text: the only backgrounds a theme offers. */
export function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.7;
}

/** The type sizes, as CSS custom properties for a themed page. */
export function themeSizeVars(theme: ReportTheme | undefined): Record<string, string> {
  if (!theme) return {};
  const t = theme.type;
  return {
    "--t-h1": `${t.h1.size}px`,
    "--t-h2": `${t.h2.size}px`,
    "--t-h3": `${t.h3.size}px`,
    "--t-h4": `${t.h4.size}px`,
    "--t-p": `${t.paragraph.size}px`,
    "--t-cap": `${t.caption.size}px`,
    "--doc-m": `${theme.margin ?? 96}px`,
  };
}

/* ---------------- What each report fills in ---------------- */

/**
 * A theme holds dynamic objects, not their content. The TLP badge, the date
 * and the page count are placed by the theme, and each report says what they
 * read. One value per report: a TLP rating set on the header badge is the
 * report's rating, so a badge in the footer says the same.
 */
export interface ReportFills {
  tlp?: string;
  /** ISO date, yyyy-mm-dd. */
  date?: string;
}

const FILLABLE = new Set(["tlp", "date"]);

/** The theme's band with the report's values in its dynamic objects. */
export function fillBand(band: PageBand, fills: ReportFills): PageBand {
  const fill = (el: BandElement | null): BandElement | null => {
    if (!el || !FILLABLE.has(el.kind)) return el;
    const v = el.kind === "tlp" ? fills.tlp : fills.date;
    return v ? { ...el, text: v } : el;
  };
  return { ...band, left: fill(band.left), middle: fill(band.middle), right: fill(band.right) };
}

/** The values a report set on a band's dynamic objects. */
export function readFills(band: PageBand, before: PageBand): ReportFills {
  const out: ReportFills = {};
  (["left", "middle", "right"] as const).forEach((s) => {
    const el = band[s];
    if (!el || el.text === before[s]?.text) return;
    if (el.kind === "tlp") out.tlp = el.text;
    if (el.kind === "date") out.date = el.text;
  });
  return out;
}

export const formatReportDate = (iso?: string) => {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** The theme a report in this brand starts with. */
export function defaultTheme(brand: Brand | undefined): ReportTheme | undefined {
  const list = brandThemes(brand);
  return list.find((t) => t.id === brand?.defaultThemeId) ?? list[0];
}

/** What a layout is, to tell whether a report changed it. */
export function layoutOf(t: ReportTheme) {
  return JSON.stringify({ h: t.header, f: t.footer, m: t.margin ?? 96, b: t.background ?? "#FFFFFF" });
}
