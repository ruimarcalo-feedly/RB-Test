import type { Brand } from "../../data/brand";
import { THEME_MARGINS, type ReportTheme } from "../../data/theme";
import { BandThumb } from "./Themes";
import { Button } from "../ui/primitives";

/* ------------------------------------------------------------------ *
 * Version E — Layout, under the brand in the report's Design tab
 *
 * There is no layout editor: a layout is whatever header, footer and
 * margins the report has. Pick a saved one, or change the header and footer
 * on the page and the margins here. Any change brings up the bar at the
 * foot of the sidebar, which saves it into the brand (or is dismissed and
 * stays on this report).
 * ------------------------------------------------------------------ */

export function ThemePanel({
  brand,
  layout,
  setMargin,
  activeBand,
  onPickBand,
  onEditLayout,
}: {
  brand?: Brand;
  /** The brand's saved layouts (and a new one not saved yet). */
  layouts: ReportTheme[];
  /** What the report has now. */
  layout?: ReportTheme;
  /** The report's layout differs from the saved one. */
  edited: boolean;
  onPick: (id: string) => void;
  onNew: () => void;
  setMargin: (px: number) => void;
  activeBand: "header" | "footer" | null;
  onPickBand: (k: "header" | "footer") => void;
  /** Nov 5: opens the layout editor (header, footer and margins only). */
  onEditLayout?: () => void;
}) {
  if (!brand || !layout) return null;
  const margin = layout.margin ?? 96;

  /* Figma 4556:214211: Layout is the margins, then the header and footer as
     they are on the page. No layout picker: the report has one layout. */
  return (
    <div className="lay-sec">
      <div className="lay-title-row">
        <div className="bdf3-title">Layout</div>
        {onEditLayout && (
          <Button size="sm" icon="pencil" onClick={onEditLayout}>
            Edit layout
          </Button>
        )}
      </div>
      <div className="lay-field">
        <div className="bdf3-sub">Document margins</div>
        <div className="bdf2-toggles" role="radiogroup" aria-label="Document margins">
          {THEME_MARGINS.map((m) => (
            <button
              key={m.label}
              role="radio"
              aria-checked={margin === m.px}
              className={margin === m.px ? "on" : ""}
              onClick={() => setMargin(m.px)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {(["header", "footer"] as const).map((k) => (
        <div className="lay-field" key={k}>
          <div className="bdf3-sub">{k === "header" ? "Header" : "Footer"}</div>
          <BandThumb
            theme={layout}
            brand={brand}
            kind={k}
            active={activeBand === k}
            onClick={() => onPickBand(k)}
          />
        </div>
      ))}
    </div>
  );
}
