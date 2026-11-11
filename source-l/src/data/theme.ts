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
  /** Version F: the brand the theme is saved with; it goes on with the theme. */
  brandId?: string;
  /** The page's background color. */
  background?: string;
  /** Version F (Nov 5): table header text, header background and border. */
  tableHeaderText?: string;
  tableHeaderBg?: string;
  tableBorder?: string;
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
    /* Version F: every brand's standard theme. */
    name: "Starter theme",
    brandId: brand?.id,
    header: {
      left: { kind: "logo" },
      middle: null,
      right: null,
      scope: "cover",
      background: "#F2F2F2",
      image: null,
      /* The brand's green hero artwork behind the logo, when it has one. */
      imageAsset: brand?.assets.some((a) => a.id === "hero") ? "hero" : undefined,
      height: 80,
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
  const list = brand?.themes?.length ? brand.themes : [simpleTheme(brand)];
  return list.map((t) => (t.brandId || !brand ? t : { ...t, brandId: brand.id }));
}

/**
 * The brand as a theme draws it. Colors and fonts are the brand's alone (set
 * once, in its styles), so a theme changes nothing here: it is layout only,
 * its header, footer, margins and background.
 */
export function themedBrand(brand: Brand | undefined, theme: ReportTheme | undefined): Brand | undefined {
  /* Version F (Nov 5): the theme decides which of the brand's colors goes on
     each text style and structure; fonts stay the brand's. */
  if (!brand || !theme) return brand;
  const colors = { ...brand.colors };
  (Object.keys(theme.type) as TypeKey[]).forEach((k) => {
    colors[k] = theme.type[k].color;
  });
  return { ...brand, colors, structure: { dividers: theme.divider, table: theme.table } };
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

/** Version F: a theme's layout, the part a report can change and push back. */
export function layoutOf(t: ReportTheme) {
  return JSON.stringify({ h: t.header, f: t.footer, m: t.margin ?? 96, b: t.background ?? "#FFFFFF" });
}

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
