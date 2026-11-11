import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button, layerStack } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import { bandVars, brandVars, type Brand } from "../../data/brand";
import { THEME_MARGINS, themeSizeVars, themedBrand, type ReportTheme } from "../../data/theme";

/* ------------------------------------------------------------------ *
 * Version E (Nov 5) — the layout editor
 *
 * A page with only the layout on it: the header and footer, editable, a grey
 * stand-in where the report's content goes, and the margin guides. Done
 * hands the layout back; Cancel leaves it as it was.
 * ------------------------------------------------------------------ */

export function LayoutEditor({
  brand,
  layout,
  onCancel,
  onDone,
}: {
  brand?: Brand;
  layout: ReportTheme;
  onCancel: () => void;
  onDone: (l: ReportTheme) => void;
}) {
  const [draft, setDraft] = useState<ReportTheme>(layout);
  const [active, setActive] = useState<"header" | "footer" | null>(null);
  const margin = draft.margin ?? 96;
  const tb = themedBrand(brand, draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(layout);

  useEffect(() => {
    layerStack.count += 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || layerStack.count > 1) return;
      e.stopPropagation();
      if (active) setActive(null);
      else onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      layerStack.count -= 1;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [active, onCancel]);

  /* Clicking off a band lets go of it. */
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest) return;
      if (t.closest(".band-wrap, .band-toolbar, .bobj-card, .menu, .scrim, .modal")) return;
      setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  return createPortal(
    <div className="lay-ed" role="dialog" aria-label="Edit layout">
      <div className="lay-ed-top">
        <div className="lay-ed-title">
          <span className="lay-ed-name">Edit layout</span>
          <span className="lay-ed-sub">{draft.name}</span>
        </div>
        <div className="lay-ed-margins">
          <span className="lay-ed-label">Margins</span>
          <div className="bdf2-toggles" role="radiogroup" aria-label="Margins">
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
        </div>
        <div className="lay-ed-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onDone(draft)} disabled={!changed}>
            Done
          </Button>
        </div>
      </div>

      <div className="lay-ed-canvas">
        <div
          className="report-page themed lay-ed-page"
          style={
            {
              ...brandVars(tb),
              ...themeSizeVars(draft),
              ...bandVars(draft.header, draft.footer, tb),
              ...(draft.background ? { background: draft.background } : {}),
            } as CSSProperties
          }
        >
          <PageBandEditor
            kind="header"
            band={draft.header}
            brand={tb}
            mode={active === "header" ? "edit" : "hint"}
            objects
            active={active === "header"}
            onActivate={() => setActive("header")}
            onChange={(b) => setDraft((d) => ({ ...d, header: b }))}
            tagLabel="Header"
          />
          <div className="lay-ed-content">
            <span>Content goes here</span>
          </div>
          <PageBandEditor
            kind="footer"
            band={draft.footer}
            brand={tb}
            mode={active === "footer" ? "edit" : "hint"}
            objects
            active={active === "footer"}
            onActivate={() => setActive("footer")}
            onChange={(b) => setDraft((d) => ({ ...d, footer: b }))}
            tagLabel="Footer"
          />
          {/* The margin grid: the margins shaded, with a guide on each edge. */}
          <div className="lay-ed-grid" aria-hidden>
            <span className="lay-ed-col left" />
            <span className="lay-ed-col right" />
          </div>
        </div>
        <div className="lay-ed-hint">Click the header or footer to change it. The shaded columns are the page margins.</div>
      </div>
    </div>,
    document.body
  );
}
