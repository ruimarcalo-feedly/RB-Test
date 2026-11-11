import type { Brand, PageBand, PageBand as PB } from "./brand";

/**
 * Version C — header and footer styles, saved inside a brand.
 *
 * A header or footer is built right on a report, then saved into the report's
 * brand as a style. A brand can hold several of each; one is its primary, the
 * one a report gets when the brand is applied. A template can pin another of
 * the same brand's styles. Because the styles live with the brand's own
 * assets, swapping the brand swaps the header and footer with everything else.
 */
export type BandKind = "header" | "footer";

export interface SavedBand {
  id: string;
  kind: BandKind;
  name: string;
  band: PageBand;
}

export const KIND_LABEL: Record<BandKind, string> = { header: "header", footer: "footer" };

/** Two bands are the same if every slot, colour, image and scope matches. */
export function sameBand(a: PageBand, b: PageBand) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** "Custom header", then "Custom header 2", "Custom header 3"… */
export function nextName(base: string, taken: string[]) {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

/** A brand's saved styles of one kind, in the order they were saved. */
export function brandBands(brand: Brand | undefined, kind: BandKind): SavedBand[] {
  return (brand?.bands ?? []).filter((b) => b.kind === kind);
}

/** The brand's primary style of a kind: the one marked, or else the first. */
export function primaryBand(brand: Brand | undefined, kind: BandKind): SavedBand | undefined {
  const mine = brandBands(brand, kind);
  return mine.find((b) => b.id === brand?.primary?.[kind]) ?? mine[0];
}

/** What a report gets: the template's pinned style if it is in this brand, or the primary. */
export function resolveBand(
  brand: Brand | undefined,
  kind: BandKind,
  pinId?: string
): SavedBand | undefined {
  return brandBands(brand, kind).find((b) => b.id === pinId) ?? primaryBand(brand, kind);
}

/* ------------------------------------------------------------------ *
 * Presets: starting points for a new header or footer style.
 *
 * A preset is a layout, not a style of its own: it is drawn with the brand
 * now applied (its logo, its artwork, its colours) and only becomes one of
 * the brand's styles once it is saved. Logo and artwork are referenced by
 * the brand's asset ids, so the same preset fills in for any brand.
 * ------------------------------------------------------------------ */

export interface BandPreset {
  id: string;
  kind: BandKind;
  name: string;
  /** Version F: the shelf the gallery files it under. */
  group: string;
  make: (brand?: Brand) => PB;
}

/** A light wash of the brand's accent colour, for the tinted presets. */
export const tint = (brand?: Brand) => {
  const c = brand?.colors.h2 ?? "#757575";
  return /^#[0-9a-f]{6}$/i.test(c) ? `${c}14` : "#F7F7F7";
};
const base = (scope: PB["scope"]): PB => ({
  left: null,
  middle: null,
  right: null,
  scope,
  background: "transparent",
  image: null,
});
const LOGO = { kind: "asset" as const, assetId: "logo" };

export const BAND_PRESETS: BandPreset[] = [
  {
    id: "h-logo-left",
    group: "Logo",
    kind: "header",
    name: "Logo left",
    make: () => ({ ...base("all"), left: LOGO }),
  },
  {
    id: "h-logo-center",
    group: "Logo",
    kind: "header",
    name: "Logo centered",
    make: () => ({ ...base("all"), middle: LOGO }),
  },
  {
    id: "h-logo-title",
    group: "Logo and details",
    kind: "header",
    name: "Logo and title",
    make: () => ({ ...base("all"), left: LOGO, right: { kind: "h4", text: "Threat Intelligence" } }),
  },
  {
    id: "h-logo-tlp",
    group: "Logo and details",
    kind: "header",
    name: "Logo and TLP",
    make: () => ({ ...base("all"), left: LOGO, right: { kind: "tlp", text: "TLP: AMBER" } }),
  },
  {
    id: "h-tinted",
    group: "Color and image",
    kind: "header",
    name: "Tinted band",
    make: (b) => ({ ...base("all"), left: LOGO, background: tint(b) }),
  },
  {
    id: "h-cover",
    group: "Color and image",
    kind: "header",
    name: "Cover image",
    make: () => ({ ...base("cover"), left: LOGO, background: "#FFFFFF", imageAsset: "hero" }),
  },
  {
    id: "f-page",
    group: "Simple",
    kind: "footer",
    name: "Page number",
    make: () => ({ ...base("all"), right: { kind: "pageCount" } }),
  },
  {
    id: "f-label-page",
    group: "Simple",
    kind: "footer",
    name: "Label and page number",
    make: () => ({ ...base("all"), left: { kind: "paragraph", text: "PRIVATE" }, right: { kind: "pageCount" } }),
  },
  {
    id: "f-full",
    group: "Detailed",
    kind: "footer",
    name: "Label, TLP and page number",
    make: () => ({
      ...base("all"),
      left: { kind: "paragraph", text: "PRIVATE" },
      middle: { kind: "tlp", text: "TLP: AMBER" },
      right: { kind: "pageCount" },
    }),
  },
  {
    id: "f-logo-page",
    group: "Detailed",
    kind: "footer",
    name: "Logo and page number",
    make: () => ({ ...base("all"), left: LOGO, right: { kind: "pageCount" } }),
  },
  {
    id: "f-tinted",
    group: "Color",
    kind: "footer",
    name: "Tinted band",
    make: (b) => ({
      ...base("all"),
      left: { kind: "paragraph", text: "PRIVATE" },
      right: { kind: "pageCount" },
      background: tint(b),
    }),
  },
];

export const presetsFor = (kind: BandKind) => BAND_PRESETS.filter((p) => p.kind === kind);
