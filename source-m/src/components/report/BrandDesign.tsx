import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, MenuItem, Popover, Select, Tip } from "../ui/primitives";
import { BrandPicker } from "../org/BrandPicker";
import { BandThumb, type ReportBand } from "./BandObjects";
import {
  BRAND_FONTS,
  allFonts,
  brandPalette,
  type Brand,
  type TypeKey,
} from "../../data/brand";
import type { BandKind } from "../../data/bandObjects";

/* ------------------------------------------------------------------ *
 * Version C (Nov 2) — the brand in the Design tab, without the box
 *
 * The brand picker heads the section and everything under it hangs off it:
 * its saved colors, its font, its typography (which can only use the saved
 * colors) and its layout (the one header and one footer). Any change here is
 * a change to the brand, held until "Save brand changes" in the bar that
 * appears at the bottom.
 * ------------------------------------------------------------------ */

const TYPE_ROWS: { key: TypeKey; label: string; size: number; weight: number }[] = [
  { key: "h1", label: "Heading 1", size: 20, weight: 700 },
  { key: "h2", label: "Heading 2", size: 17, weight: 700 },
  { key: "h3", label: "Heading 3", size: 15, weight: 600 },
  { key: "h4", label: "Heading 4", size: 14, weight: 600 },
  { key: "paragraph", label: "Paragraph", size: 13, weight: 400 },
  { key: "caption", label: "Caption", size: 12, weight: 400 },
];

export function BrandDesign({
  brands,
  brandId,
  setBrandId,
  createRequest,
  onBrandCreated,
  brand,
  readOnly,
  onChange,
  header,
  footer,
  activeBand,
  onSelectBand,
  dirty,
  onSave,
  onDiscard,
}: {
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  createRequest?: number;
  onBrandCreated?: () => void;
  /** The brand as it stands with the changes not yet saved. */
  brand?: Brand;
  /** A report: the brand is shown, and changed in the template. */
  readOnly?: boolean;
  onChange?: (patch: Partial<Brand>) => void;
  header: ReportBand;
  footer: ReportBand;
  activeBand: BandKind | null;
  onSelectBand: (k: BandKind) => void;
  dirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}) {
  const palette = brandPalette(brand);
  const edit = (patch: Partial<Brand>) => !readOnly && onChange?.(patch);
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState("#7A7A7A");
  const used = (c: string) =>
    brand ? TYPE_ROWS.some((r) => brand.colors[r.key].toUpperCase() === c.toUpperCase()) : false;

  return (
    <>
      <div className="bd-root">
        <div className="field-label bd-root-label">Brand</div>
        <BrandPicker
          brands={brands}
          brandId={brandId}
          onPick={setBrandId}
          textEdit
          disabled={brands.length === 0}
          createRequest={createRequest}
          onCreated={onBrandCreated}
        />
        {readOnly && brand && (
          <div className="bd-note">Change {brand.name} in a template&rsquo;s Design tab.</div>
        )}
      </div>

      {brand && (
        <div className={`bd-tree ${readOnly ? "readonly" : ""}`}>
          {/* ---------------- Saved colors ---------------- */}
          <section className="bd-sec">
            <div className="bd-sec-title">Colors</div>
            <div className="bd-swatches">
              {palette.map((c) => (
                <Tip key={c} label={c}>
                  <span className="bd-swatch-wrap">
                    <span className="bd-swatch" style={{ background: c }} />
                    {!readOnly && !used(c) && (
                      <button
                        className="bd-swatch-x"
                        aria-label={`Remove ${c}`}
                        onClick={() => edit({ palette: palette.filter((x) => x !== c) })}
                      >
                        <Icon name="close" size={10} />
                      </button>
                    )}
                  </span>
                </Tip>
              ))}
              {!readOnly && (
                <Tip label="Add a color">
                  <button ref={addRef} className="bd-swatch add" onClick={() => setAdding(true)}>
                    <Icon name="plus" size={14} />
                  </button>
                </Tip>
              )}
            </div>
            {adding && (
              <Popover anchorRef={addRef} onClose={() => setAdding(false)} width={220} className="menu bd-add-pop">
                <div className="bd-add">
                  <input
                    type="color"
                    className="bd-add-input"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value.toUpperCase())}
                  />
                  <input
                    className="input bd-add-hex"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value.toUpperCase())}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!/^#[0-9A-F]{6}$/.test(newColor) || palette.includes(newColor)}
                    onClick={() => {
                      edit({ palette: [...palette, newColor] });
                      setAdding(false);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </Popover>
            )}
          </section>

          {/* ---------------- Font ---------------- */}
          <section className="bd-sec">
            <div className="bd-sec-title">Font</div>
            <Select
              block
              value={brand.font}
              options={BRAND_FONTS}
              disabled={readOnly}
              onChange={(f) => edit({ font: f, fonts: allFonts(f) })}
            />
          </section>

          {/* ---------------- Typography ---------------- */}
          <section className="bd-sec">
            <div className="bd-sec-title">Typography</div>
            <div className="bd-type">
              {TYPE_ROWS.map((r) => (
                <TypeRow
                  key={r.key}
                  row={r}
                  brand={brand}
                  palette={palette}
                  readOnly={readOnly}
                  onPick={(c) => edit({ colors: { ...brand.colors, [r.key]: c } })}
                />
              ))}
            </div>
          </section>

          {/* ---------------- Layout ---------------- */}
          <section className="bd-sec">
            <div className="bd-sec-title">Layout</div>
            {(["header", "footer"] as const).map((k) => (
              <LayoutCard
                key={k}
                rb={k === "header" ? header : footer}
                brand={brand}
                selected={activeBand === k}
                onSelect={() => onSelectBand(k)}
              />
            ))}
          </section>
        </div>
      )}

      {/* Changes to the brand wait here until saved. */}
      {dirty && brand && !readOnly && (
        <div className="bd-savebar">
          <span className="bd-savebar-text">
            <span className="bd-dot" />
            Unsaved changes to {brand.name}
          </span>
          <Button size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" variant="primary" onClick={onSave}>
            Save brand changes
          </Button>
        </div>
      )}
    </>
  );
}

function TypeRow({
  row,
  brand,
  palette,
  readOnly,
  onPick,
}: {
  row: (typeof TYPE_ROWS)[number];
  brand: Brand;
  palette: string[];
  readOnly?: boolean;
  onPick: (c: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const color = brand.colors[row.key];
  return (
    <div className="bd-type-row">
      <span
        className="bd-type-sample truncate"
        style={{
          fontFamily: `${brand.fonts[row.key]}, var(--font-sans)`,
          fontSize: row.size,
          fontWeight: row.weight,
          color,
        }}
      >
        {row.label}
      </span>
      <button
        ref={ref}
        className="bd-swatch sm"
        style={{ background: color }}
        disabled={readOnly}
        title={readOnly ? color : `${row.label} color`}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} align="end" width={196} className="menu bd-pick">
          <div className="bd-pick-label">{row.label}</div>
          <div className="bd-swatches">
            {palette.map((c) => (
              <button
                key={c}
                className={`bd-swatch ${c.toUpperCase() === color.toUpperCase() ? "on" : ""}`}
                style={{ background: c }}
                title={c}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

/** The brand's header or footer, small; in a template it selects the band on the page. */
function LayoutCard({
  rb,
  brand,
  selected,
  onSelect,
}: {
  rb: ReportBand;
  brand: Brand;
  selected: boolean;
  onSelect: () => void;
}) {
  const k = rb.kind;
  const more = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  return (
    <div className={`bd-layout ${selected ? "selected" : ""} ${rb.editable ? "" : "readonly"}`}>
      <div className="bd-layout-head">
        <span className="bd-layout-name">{k === "header" ? "Header" : "Footer"}</span>
        {rb.dirty && <span className="bobj-edited">Edited</span>}
        {rb.dirty && (
          <button ref={more} className="btn ghost icon sm" title="More" onClick={() => setMenu((m) => !m)}>
            <Icon name="ellipsis" size={16} />
          </button>
        )}
      </div>
      <button
        className="bobj-thumb"
        disabled={!rb.editable}
        onClick={onSelect}
        title={rb.editable ? `Edit the ${k} on the page` : undefined}
      >
        {rb.empty ? <span className="bobj-none">No {k}</span> : <BandThumb band={rb.band} kind={k} brand={brand} />}
      </button>
      {menu && (
        <Popover anchorRef={more} onClose={() => setMenu(false)} width={200}>
          <MenuItem
            onClick={() => {
              rb.discard();
              setMenu(false);
            }}
          >
            Discard {k} changes
          </MenuItem>
        </Popover>
      )}
    </div>
  );
}
