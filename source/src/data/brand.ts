import type { IconName } from "../components/ui/Icon";

/**
 * Branding — Figma "[2.2] Branding & Customization".
 *
 * A brand is an Org Profile item like any other, so it is defined once and
 * referenced everywhere: a template picks one in its Design tab, and the report
 * that template produces is written in it. That is the whole chain — Org
 * Profile → template → report — and it is why the colours live here rather than
 * on the template.
 */

export interface BrandColors {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  paragraph: string;
  caption: string;
  tlp: string;
}

export interface BrandStructure {
  dividers: string;
  table: string;
}

export interface BrandTlp {
  clear: string;
  green: string;
  amber: string;
  red: string;
}

/** The six styles the Typography table sets a font and a colour for. */
export type TypeKey = "h1" | "h2" | "h3" | "h4" | "paragraph" | "caption";

/**
 * Figma "Common Imagery": the assets a brand carries. The logo is one of
 * these rather than a field of its own — a brand has a handful of images it
 * reuses, and the logo is just the one a header slot reaches for by default.
 */
export interface BrandAsset {
  id: string;
  name: string;
  /** A data URI, so the single-file build carries it. */
  src: string;
  uploaded: string;
}

/** Figma allows five. */
export const MAX_ASSETS = 5;

export interface Brand {
  id: string;
  name: string;
  /** The brand's base typeface; each style may override it. */
  font: string;
  /** Figma "Typography": the font applied to each style. */
  fonts: Record<TypeKey, string>;
  colors: BrandColors;
  structure: BrandStructure;
  tlp: BrandTlp;
  /** "Graph colors" — applied to charts across the AI features. */
  viz: string[];
  /** "Common Imagery" — up to five images the brand reuses. */
  assets: BrandAsset[];
}

/** One font for every style, which is where a brand starts. */
export function allFonts(font: string): Record<TypeKey, string> {
  return { h1: font, h2: font, h3: font, h4: font, paragraph: font, caption: font };
}

/**
 * The image a `logo` element renders: the asset actually called "Logo", or
 * failing that the first one the brand carries.
 */
export function brandLogo(brand: Brand | undefined): BrandAsset | undefined {
  if (!brand) return undefined;
  return brand.assets.find((a) => a.id === "logo") ?? brand.assets[0];
}

/** Figma "Default font" — the fonts a brand can be set in. */
export const BRAND_FONTS = [
  "Helvetica",
  "Inter",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Roboto",
  "IBM Plex Sans",
];

/**
 * The Feedly wordmark — the real asset, downscaled and inlined so the
 * single-file build carries it. It behaves like an uploaded logo: a data URI
 * the header slot renders in an `img`, replaceable from the brand peek.
 */
const FEEDLY_LOGO =
  "data:image/png;base64,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";

/**
 * The cover background the header carries on the cover page — the real asset
 * from the design, downscaled to the band's own width and inlined so the build
 * carries it rather than linking out to a host this bundle cannot reach.
 */
export const COVER_BACKGROUND =
  "data:image/jpeg;base64,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";

/** The brand the prototype ships with, referenced by the Feedly templates. */
export const FEEDLY_BRAND: Brand = {
  id: "brand-feedly",
  name: "Feedly",
  font: "Helvetica",
  fonts: allFonts("Helvetica"),
  colors: {
    h1: "#333333",
    h2: "#2BB24C",
    h3: "#757575",
    h4: "#2BB24C",
    paragraph: "#333333",
    caption: "#757575",
    tlp: "#333333",
  },
  structure: { dividers: "#F2F2F2", table: "#F2F2F2" },
  tlp: { clear: "#F2F2F2", green: "#D5F0DB", amber: "#FFEACC", red: "#FCC7C3" },
  viz: ["#69B487", "#CE6969", "#5DA2C1", "#E59E4D", "#FACF53", "#BC9D6E"],
  assets: [
    { id: "logo", name: "Logo", src: FEEDLY_LOGO, uploaded: "21 Sep 2026" },
    { id: "hero", name: "Hero banner", src: COVER_BACKGROUND, uploaded: "21 Sep 2026" },
  ],
};

/**
 * A second brand, so the effect of swapping one can be seen rather than
 * described: a different typeface pairing, a red palette, its own wordmark and
 * its own cover artwork at the same proportions as Feedly's.
 */
const ACME_LOGO =
  "data:image/png;base64,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";

const ACME_BANNER =
  "data:image/jpeg;base64,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";

export const ACME_BRAND: Brand = {
  id: "brand-acme",
  name: "Acme Inc",
  font: "Georgia",
  fonts: {
    h1: "Georgia",
    h2: "Georgia",
    h3: "Georgia",
    h4: "Georgia",
    paragraph: "Arial",
    caption: "Arial",
  },
  colors: {
    h1: "#7A161C",
    h2: "#C62828",
    h3: "#8A6F70",
    h4: "#C62828",
    paragraph: "#2A2426",
    caption: "#8A6F70",
    tlp: "#2A2426",
  },
  structure: { dividers: "#F0DEDE", table: "#FBECEC" },
  /* TLP fills stay readable as traffic lights; they are only warmed to sit
     with the rest of the palette. */
  tlp: { clear: "#F2EDED", green: "#DCEFE0", amber: "#FFE5C7", red: "#F8C9C4" },
  viz: ["#C62828", "#E2703A", "#8A3324", "#D9A441", "#A44A6E", "#6E3B3B"],
  assets: [
    { id: "logo", name: "Logo", src: ACME_LOGO, uploaded: "21 Sep 2026" },
    { id: "hero", name: "Hero banner", src: ACME_BANNER, uploaded: "21 Sep 2026" },
  ],
};

/** A brand with nothing extracted yet: the app's own defaults, ready to edit. */
export function blankBrand(name: string, id: string): Brand {
  return {
    id,
    name,
    font: "Helvetica",
    fonts: allFonts("Helvetica"),
    colors: {
      h1: "#141413",
      h2: "#141413",
      h3: "#333333",
      h4: "#333333",
      paragraph: "#333333",
      caption: "#757575",
      tlp: "#333333",
    },
    structure: { dividers: "#F2F2F2", table: "#F2F2F2" },
    tlp: { clear: "#F2F2F2", green: "#D5F0DB", amber: "#FFEACC", red: "#FCC7C3" },
    viz: ["#69B487", "#CE6969", "#5DA2C1", "#E59E4D", "#FACF53", "#BC9D6E"],
    assets: [],
  };
}

/**
 * What "extracting styles" from an uploaded PDF produces. There is no parser
 * here — the point of the upload in the flow is that the brand comes back
 * filled in rather than blank, so this is the filled-in answer.
 */
export function extractedBrand(name: string, id: string): Brand {
  return { ...FEEDLY_BRAND, id, name };
}

/* ------------------------------------------------------------------ *
 * Header and footer
 * ------------------------------------------------------------------ */

/**
 * Figma "Template editor - Heading" / "- Footer": the band at the top and
 * bottom of the page carries three slots — left, middle and right — and each
 * slot holds one element. Three slots rather than a free canvas is what makes
 * a header line up across pages, so the model is a fixed triple rather than a
 * list.
 */
export type SlotKey = "left" | "middle" | "right";

export type BandElementKind =
  | "h3"
  | "h4"
  | "paragraph"
  | "image"
  | "tlp"
  | "pageCount"
  | "logo";

export interface BandElement {
  kind: BandElementKind;
  /** Text elements carry their own words; logo and page count do not. */
  text?: string;
  /** An uploaded image, as a data URI. */
  src?: string;
}

/** Which pages a band appears on — Figma's "Cover only" / "All pages" select. */
export type BandScope = "cover" | "all";

export interface PageBand {
  left: BandElement | null;
  middle: BandElement | null;
  right: BandElement | null;
  scope: BandScope;
  /** The band's own background colour, behind any image. */
  background: string;
  /** A background image for the band, as a data URI. */
  image: string | null;
  /**
   * A brand asset used as the background instead of an uploaded file. Held as
   * an id rather than a copy of the image, so swapping the template's brand
   * swaps the artwork with it.
   */
  imageAsset?: string;
}

/** The band's background image, wherever it comes from. */
export function bandImage(band: PageBand, brand?: Brand): string | null {
  if (band.imageAsset) return brand?.assets.find((a) => a.id === band.imageAsset)?.src ?? null;
  return band.image;
}

export const EMPTY_BAND: PageBand = {
  left: null,
  middle: null,
  right: null,
  scope: "cover",
  background: "#FFFFFF",
  image: null,
};

/** The menu a slot's `+` opens, in the design's order. */
export const BAND_ELEMENTS: { kind: BandElementKind; label: string; icon: IconName }[] = [
  { kind: "h3", label: "Heading 3", icon: "h3" },
  { kind: "h4", label: "Heading 4", icon: "h4" },
  { kind: "paragraph", label: "Paragraph", icon: "paragraph" },
  { kind: "image", label: "Image", icon: "image" },
  { kind: "tlp", label: "TLP Badge", icon: "tlp-badge" },
  { kind: "pageCount", label: "Page count", icon: "page-count" },
  { kind: "logo", label: "Logo", icon: "logo" },
];

/** What a freshly inserted element says, so a slot is never empty-looking. */
export function newElement(kind: BandElementKind): BandElement {
  switch (kind) {
    case "h3":
      return { kind, text: "Heading 3" };
    case "h4":
      return { kind, text: "Heading 4" };
    case "paragraph":
      return { kind, text: "PRIVATE" };
    case "tlp":
      return { kind, text: "TLP: RED" };
    case "image":
      return { kind, src: undefined };
    default:
      return { kind };
  }
}

/**
 * The furniture a branded template ships with.
 *
 * The header is the brand's cover artwork with its logo on it, and it runs on
 * the cover only. The footer is the same on every page: what the document is,
 * how far it may travel, and which page you are on. Both reference the brand's
 * assets by id rather than embedding them, so a template that changes brand
 * changes its cover and its wordmark with it.
 */
export const BRANDED_HEADER: PageBand = {
  left: { kind: "logo" },
  middle: null,
  right: null,
  scope: "cover",
  background: "#FFFFFF",
  image: null,
  imageAsset: "hero",
};

export const BRANDED_FOOTER: PageBand = {
  left: { kind: "paragraph", text: "PRIVATE" },
  middle: { kind: "tlp", text: "TLP: AMBER" },
  right: { kind: "pageCount" },
  scope: "all",
  background: "#FFFFFF",
  image: null,
};

/**
 * A blank template still starts with nothing in its bands: where a logo sits
 * and what the footer says are decisions, so one built from scratch asks for
 * them rather than assuming them.
 */

/** Which TLP badge colour a badge's text asks for. */
export function tlpTone(text: string | undefined, brand: Brand): string {
  const t = (text ?? "").toUpperCase();
  if (t.includes("RED")) return brand.tlp.red;
  if (t.includes("AMBER")) return brand.tlp.amber;
  if (t.includes("GREEN")) return brand.tlp.green;
  return brand.tlp.clear;
}

/**
 * The bands' own heights, as CSS custom properties on the page.
 *
 * A band lives inside the page's existing margin, so it costs nothing until it
 * needs more room than that margin already gives — which is only when it
 * carries a cover image. The page reads these to size the document's padding,
 * so showing or hiding a band never moves the text and adding an image does.
 */
export function bandVars(
  header: PageBand,
  footer: PageBand,
  brand?: Brand
): Record<string, string> {
  return {
    "--header-h": bandImage(header, brand) ? "120px" : "64px",
    "--footer-h": bandImage(footer, brand) ? "120px" : "64px",
  };
}

/**
 * A brand as CSS custom properties, set on whichever page is being branded.
 * Doing it this way means the document's own rules never have to know which
 * brand is in play — they read the variable and fall back to the app's colour
 * when no brand is set.
 */
export function brandVars(brand: Brand | undefined): Record<string, string> {
  if (!brand) return {};
  return {
    "--b-font": `${brand.fonts.paragraph}, var(--font-sans)`,
    "--b-font-h1": `${brand.fonts.h1}, var(--font-sans)`,
    "--b-font-h2": `${brand.fonts.h2}, var(--font-sans)`,
    "--b-font-h3": `${brand.fonts.h3}, var(--font-sans)`,
    "--b-font-h4": `${brand.fonts.h4}, var(--font-sans)`,
    "--b-font-cap": `${brand.fonts.caption}, var(--font-sans)`,
    "--b-h1": brand.colors.h1,
    "--b-h2": brand.colors.h2,
    "--b-h3": brand.colors.h3,
    "--b-h4": brand.colors.h4,
    "--b-paragraph": brand.colors.paragraph,
    "--b-caption": brand.colors.caption,
    "--b-tlp": brand.colors.tlp,
    "--b-divider": brand.structure.dividers,
    "--b-table": brand.structure.table,
  };
}
