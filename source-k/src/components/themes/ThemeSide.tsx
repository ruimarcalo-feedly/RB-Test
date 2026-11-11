import { Button } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { brandSwatches, type Brand } from "../../data/brand";
import { THEME_MARGINS, isLight, type ReportTheme } from "../../data/theme";
import { BandThumb, ColorPick } from "./Themes";

/* ------------------------------------------------------------------ *
 * Version E (Brand Themes) — editing a theme on the report
 *
 * A second sidebar, right of the main one. It sums the theme up: margins,
 * background, and its header and footer as thumbnails. Text colors and fonts
 * are the brand's, set once in its styles.
 * The header and footer themselves are edited on the page; a thumbnail
 * only takes you to them. Colors come from the brand's saved colors only.
 * ------------------------------------------------------------------ */

export function ThemeSide({
  brand,
  draft,
  setDraft,
  isNew,
  activeBand,
  onPickBand,
  onCancel,
  onSave,
  onSaveAsNew,
  inline,
}: {
  brand: Brand;
  draft: ReportTheme;
  setDraft: (f: (t: ReportTheme) => ReportTheme) => void;
  isNew: boolean;
  activeBand: "header" | "footer" | null;
  onPickBand: (k: "header" | "footer") => void;
  onCancel: () => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  /** Inside the Design tab, in place of the theme list, with a way back. */
  inline?: boolean;
}) {
  const sw = brandSwatches(brand);
  /* Only the brand's light colors: its text is set in the brand, so a dark
     background would leave it unreadable. White is always there. */
  const all = [
    { c: sw.primary, label: "Primary" },
    { c: sw.secondary, label: "Secondary" },
    { c: sw.tertiary, label: "Tertiary" },
    { c: sw.background, label: "Background" },
    ...sw.more.map((c, i) => ({ c, label: `Color ${i + 5}` })),
  ].filter((p) => isLight(p.c));
  const palette = all.some((p) => p.c.toUpperCase() === "#FFFFFF") ? all : [...all, { c: "#FFFFFF", label: "White" }];
  const margin = draft.margin ?? 96;
  const bg = draft.background ?? "#FFFFFF";

  return (
    <aside className={inline ? "theme-inline" : "theme-side"}>
      <div className="ts-scroll">
        <div className="ts-head">
          {inline && (
            <button className="ts-back" onClick={onCancel}>
              <Icon name="chevron-left" size={16} />
              Layouts
            </button>
          )}
          <div className="t-body3 muted">{isNew ? "New layout" : "Editing layout"}</div>
          <input
            className="ts-name"
            value={draft.name}
            aria-label="Layout name"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <section className="ts-sec">
          <div className="ts-title">Margins</div>
          <div className="ts-seg" role="radiogroup" aria-label="Margins">
            {THEME_MARGINS.map((m) => (
              <button
                key={m.label}
                role="radio"
                aria-checked={margin === m.px}
                className={margin === m.px ? "on" : ""}
                onClick={() => setDraft((d) => ({ ...d, margin: m.px }))}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ts-sec">
          <div className="ts-title">Background</div>
          <div className="ts-row">
            <ColorPick
              value={bg}
              palette={palette}
              label="Background"
              onChange={(c) => setDraft((d) => ({ ...d, background: c }))}
            />
            <span className="te-hex">{bg.toUpperCase()}</span>
          </div>
          <div className="ts-hint">
            The brand&rsquo;s light colors. Text colors and fonts are the brand&rsquo;s.
          </div>
        </section>

        {(["header", "footer"] as const).map((k) => (
          <section className="ts-sec" key={k}>
            <div className="ts-title">{k === "header" ? "Header" : "Footer"}</div>
            <BandThumb
              theme={draft}
              brand={brand}
              kind={k}
              active={activeBand === k}
              onClick={() => onPickBand(k)}
            />
            <div className="ts-hint">Click the {k} on the page to change it.</div>
          </section>
        ))}
      </div>

      <div className="ts-foot">
        {!isNew && <div className="ts-warn">Saving updates every report that uses this layout.</div>}
        <div className="ts-actions">
          <Button onClick={onCancel}>Cancel</Button>
          {!isNew && <Button onClick={onSaveAsNew}>Save as new</Button>}
          <Button variant="primary" onClick={onSave}>
            {isNew ? "Create layout" : "Save"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
