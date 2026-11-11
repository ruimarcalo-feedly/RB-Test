import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import {
  bandHeight,
  bandImage,
  bandVars,
  brandSwatches,
  brandVars,
  type Brand,
} from "../../data/brand";
import { themeSizeVars, themedBrand, type ReportTheme } from "../../data/theme";

/* ------------------------------------------------------------------ *
 * Version E (Brand Themes) — the report theme: its thumbnail, its card, its
 * header and footer drawn small, and the brand-color picker
 * ------------------------------------------------------------------ */


/* The thumbnail is drawn at this size, then scaled to fit its card. */
const THUMB_W = 480;
const THUMB_H = 240;

/**
 * The theme as a thumbnail, stylized rather than a page in miniature: the top
 * half is the theme's header, the bottom half the report's background with a
 * line of paragraph text over it.
 */
export function ThemePreview({
  theme,
  brand,
  h = THUMB_H,
}: {
  theme: ReportTheme;
  brand?: Brand;
  /** The drawn height, at 480 wide; the header always takes the top half. */
  h?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / THUMB_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tb = themedBrand(brand, theme);
  const bg = theme.background ?? (brand ? brandSwatches(brand).background : "#FFFFFF");
  return (
    <div ref={box} className="theme-pv theme-thumb" style={{ height: h * scale }}>
      <div
        className="theme-pv-in report-page themed theme-thumb-page"
        style={{
          width: THUMB_W,
          height: h,
          transform: `scale(${scale})`,
          background: bg,
          ...brandVars(tb),
          "--header-h": `${h / 2}px`,
        } as React.CSSProperties}
      >
        <PageBandEditor
          kind="header"
          band={theme.header}
          brand={tb}
          mode="plain"
          objects
          always
          onChange={() => {}}
        />
        {/* Version F: the brand's styles too, as a heading over a line of text
            and a rule, so the card says what the theme carries. */}
        <div className="theme-thumb-body thumb-f">
          <div className="thumb-f-h" style={{ color: tb?.colors.h1, fontFamily: `var(--b-font-h1)` }}>
            Report title
          </div>
          <div className="thumb-f-p" style={{ color: tb?.colors.paragraph }}>
            The quick brown fox jumps over the lazy dog.
          </div>
          <div className="thumb-f-rule" style={{ background: tb?.structure.dividers }} />
        </div>
      </div>
    </div>
  );
}

/** A theme as a card: its preview and name. Clicking it uses it; Edit edits it on the report. */
export function ThemeCard({
  theme,
  brand,
  selected,
  isDefault,
  onClick,
  onEdit,
  onMakeDefault,
}: {
  theme: ReportTheme;
  brand?: Brand;
  selected?: boolean;
  /** The brand's default theme, the one every report starts with. */
  isDefault?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onMakeDefault?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`theme-card ${selected ? "on" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <ThemePreview theme={theme} brand={brand} />
      <div className="theme-card-foot">
        <span className="theme-card-name truncate">{theme.name}</span>
        {isDefault && <span className="theme-default">Default</span>}
        {onMakeDefault && !isDefault && (
          <button
            className="btn ghost sm theme-make-default"
            onClick={(e) => {
              e.stopPropagation();
              onMakeDefault();
            }}
          >
            Make default
          </button>
        )}
        {onEdit && (
          <button
            className="btn sm theme-edit"
            aria-label={`Edit ${theme.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

/** The "+" card that starts a new theme. */
export function NewThemeCard({ onClick }: { onClick: () => void }) {
  return (
    <button className="theme-card theme-new" onClick={onClick}>
      <Icon name="plus" size={20} />
      <span>New theme</span>
    </button>
  );
}

/** A color square; it opens the brand's saved colors. */
export function ColorPick({
  value,
  palette,
  label,
  onChange,
}: {
  value: string;
  palette: { c: string; label: string }[];
  label: string;
  onChange: (c: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        className="bd-swatch sm te-swatch"
        style={{ background: value }}
        title={`${label}: ${value}`}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} align="start" width={208} className="menu bd-pick">
          <div className="bd-pick-label">Brand colors</div>
          <div className="bd-swatches">
            {palette.map(({ c, label: name }) => (
              <button
                key={name}
                className={`bd-swatch ${c.toUpperCase() === value.toUpperCase() ? "on" : ""}`}
                style={{ background: c }}
                title={name === c ? c : `${name} ${c}`}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

/** A theme's header or footer, small: its band at a fixed width, scaled to fit. */
export function BandThumb({
  theme,
  brand,
  kind,
  active,
  onClick,
}: {
  theme: ReportTheme;
  brand?: Brand;
  kind: "header" | "footer";
  active?: boolean;
  onClick: () => void;
}) {
  const box = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(0.5);
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
  }, []);
  const tb = themedBrand(brand, theme);
  const band = theme[kind];
  const h = bandHeight(band, tb);
  const empty = !band.left && !band.middle && !band.right && !bandImage(band, tb);
  return (
    <button
      ref={box}
      className={`theme-pv theme-thumb band-thumb ${active ? "on" : ""}`}
      style={{ height: h * scale }}
      onClick={onClick}
      title={`Edit the ${kind} on the page`}
    >
      <div
        className="theme-pv-in report-page themed theme-thumb-page"
        style={{
          width: pageW,
          height: h,
          transform: `scale(${scale})`,
          background: theme.background ?? "#FFFFFF",
          ...brandVars(tb),
          ...themeSizeVars(theme),
          ...bandVars(theme.header, theme.footer, tb),
        } as React.CSSProperties}
      >
        <PageBandEditor kind={kind} band={band} brand={tb} mode="plain" objects always onChange={() => {}} />
      </div>
      {empty && <span className="band-thumb-empty">No {kind}</span>}
    </button>
  );
}
const BAND_W = 1092;
