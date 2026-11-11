import type { PageBand } from "./brand";
import type { BandKind } from "./bandObjects";

/* ------------------------------------------------------------------ *
 * Version I — header and footer styles, a library of their own
 *
 * Not in the brand and not in the template: Report Builder keeps one list of
 * header and footer styles for the whole organization. Templates and reports
 * only point at one. Feedly's presets are always there; the organization's
 * own styles are made (from a preset or from blank) in the style designer,
 * and changing one there changes it everywhere it is used.
 * ------------------------------------------------------------------ */

export interface BandStyle {
  id: string;
  kind: BandKind;
  name: string;
  band: PageBand;
}

/**
 * Version E: the styles to begin with, built in the report and drawn with the
 * report's brand (its logo, and its palette by role).
 */
export const SEED_STYLES: BandStyle[] = [
  {
    id: "style-feedly-cover",
    kind: "header",
    name: "Logo header",
    band: {
      left: { kind: "logo" },
      middle: null,
      right: null,
      scope: "cover",
      background: "brand:background",
      image: null,
      height: 88,
    },
  },
  {
    id: "style-feedly-footer",
    kind: "footer",
    name: "TLP and page number",
    band: {
      left: null,
      middle: { kind: "tlp", text: "TLP: AMBER" },
      right: { kind: "pageCount" },
      scope: "all",
      background: "transparent",
      image: null,
    },
  },
];
