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

const blank = {
  left: null,
  middle: null,
  right: null,
  background: "transparent",
  image: null,
} as const;

/** The organization's own styles to begin with, used by Feedly's templates. */
export const SEED_STYLES: BandStyle[] = [
  {
    id: "style-feedly-cover",
    kind: "header",
    name: "Feedly cover",
    band: { ...blank, scope: "cover", layout: "h-feedly-cover", height: 120 },
  },
  {
    id: "style-feedly-footer",
    kind: "footer",
    name: "Feedly internal footer",
    band: {
      ...blank,
      scope: "all",
      layout: "f-logo-notice",
      height: 56,
      texts: { notice: "For internal use only. Not for external distribution." },
    },
  },
];
