import { useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Button, Popover, Select, Tip } from "../ui/primitives";
import { BrandPicker } from "../org/BrandPicker";
import {
  BRAND_FONTS,
  MAX_ASSETS,
  allFonts,
  brandSwatches,
  type Brand,
  type TypeKey,
} from "../../data/brand";
import { BUILDING_BLOCKS, setAssetDrag, setBlockDrag } from "../../data/buildingBlocks";

/* ------------------------------------------------------------------ *
 * Versions E and F — the brand in the report's Design tab (from F)
 *
 * Figma "ReportLeftPanel" (4546:212352). The brand picker heads a box that
 * holds the brand's styles: its color palette (summed up as swatches, with
 * every color edited right here, always open), its font and its assets
 * (tiles that drag onto the page or a header slot). Then the building blocks
 * and the document margins. A change to the brand waits for "Save brand
 * changes" in the bar at the bottom; margins are the report's own and go
 * with a theme. The header and footer are designed on the page.
 * ------------------------------------------------------------------ */

type RowKey = TypeKey | "tableHeader";
const TYPE_ROWS: { key: RowKey; label: string; size: number; weight: number }[] = [
  { key: "h1", label: "Heading 1", size: 20, weight: 700 },
  { key: "h2", label: "Heading 2", size: 17, weight: 700 },
  { key: "h3", label: "Heading 3", size: 15, weight: 600 },
  { key: "h4", label: "Heading 4", size: 14, weight: 600 },
  { key: "paragraph", label: "Paragraph", size: 13, weight: 400 },
  { key: "tableHeader", label: "Table header", size: 13, weight: 400 },
  { key: "caption", label: "Caption", size: 12, weight: 400 },
];

/* Figma's blocks: no Heading 1 (the title is the report's), and the header
   and footer objects that only go in a band (Date, Logo) are in the band's
   own "+" menu. */
const BLOCKS = BUILDING_BLOCKS.filter((b) => !["Heading 1", "Date", "Logo"].includes(b.label));

type Swatch = { c: string; label: string };

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function BrandDesignF({
  brands,
  brandId,
  setBrandId,
  brand,
  onChange,
  children,
  dirty,
  onSave,
  onDiscard,
}: {
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  /** The brand with the changes not yet saved. */
  brand?: Brand;
  onChange: (patch: Partial<Brand>) => void;
  /** Version E: what sits under the brand (the report's layouts). */
  children?: ReactNode;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  /* Version E (Nov 4): the palette starts as a summary card; click to open it. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newColor, setNewColor] = useState("#7A7A7A");
  const fileRef = useRef<HTMLInputElement>(null);
  const sw = brand ? brandSwatches(brand) : null;
  const rowColor = (k: RowKey) => (brand ? brand.colors[k] ?? brand.colors.paragraph : "#333333");
  const rowFont = (k: RowKey) => (brand ? brand.fonts[k === "tableHeader" ? "paragraph" : k] : "");
  const palette: Swatch[] = sw
    ? [
        { c: sw.primary, label: "Primary" },
        { c: sw.secondary, label: "Secondary" },
        { c: sw.tertiary, label: "Tertiary" },
        { c: sw.background, label: "Background" },
        ...sw.more.map((c, i) => ({ c, label: `Color ${i + 5}` })),
      ]
    : [];
  const used = (c: string) =>
    brand
      ? [...TYPE_ROWS.map((r) => rowColor(r.key)), brand.structure.dividers, brand.structure.table].some(
          (x) => x.toUpperCase() === c.toUpperCase()
        )
      : false;

  return (
    <>
      <div className="side-scroll details-panel bdf2">
        <div className="bdf2-brand bdf3">
          <div className="bdf3-top">
            <div className="bdf3-title strong">Brand style</div>
            <BrandPicker brands={brands} brandId={brandId} onPick={setBrandId} textEdit />
          </div>

          {/* Nov 4: the brand is the parent; Layout and everything below it are
              its children, so Layout comes right under the picker. */}
          {children && <div className="bdf3-layout">{children}</div>}

          {brand && sw && (
            <div className="bdf3-box">
              {/* ---------------- Color palette ---------------- */}
              <div className="bdf2-field">
                <div className="bdf3-title">Color palette</div>
                {!paletteOpen ? (
                  <button className="bdf3-sum" onClick={() => setPaletteOpen(true)} aria-expanded={false}>
                    <span className="bdf3-sum-body">
                      <span className="bdf3-sum-sw">
                        {palette.map((p, i) => (
                          <span key={`${p.label}${i}`} style={{ background: p.c }} title={`${p.label} ${p.c}`} />
                        ))}
                      </span>
                      <span className="bdf3-sum-type">
                        {TYPE_ROWS.map((r) => (
                          <span
                            key={r.key}
                            title={r.label}
                            style={{ color: rowColor(r.key), fontWeight: r.weight, fontFamily: `${rowFont(r.key)}, var(--font-sans)` }}
                          >
                            Aa
                          </span>
                        ))}
                      </span>
                    </span>
                    <Icon name="chevron-down" size={16} />
                  </button>
                ) : (
                <div className="bdf3-sum open">
                <button className="bdf3-sum-head" onClick={() => setPaletteOpen(false)} aria-expanded>
                  <span>Main colors</span>
                  <Icon name="chevron-up" size={16} />
                </button>
                <div className="bdf2-all">
                    <div className="bd-swatches">
                      {palette.map((p, i) => (
                        <Tip key={`${p.label}${i}`} label={`${p.label} ${p.c}`}>
                          <span className="bd-swatch-wrap">
                            <label className="bd-swatch bdf-swatch" style={{ background: p.c }}>
                              <input
                                type="color"
                                value={p.c}
                                aria-label={`${p.label} color`}
                                onChange={(e) => {
                                  const v = e.target.value.toUpperCase();
                                  const keys = ["primary", "secondary", "tertiary", "background"] as const;
                                  const next =
                                    i < 4
                                      ? { ...sw, [keys[i]]: v }
                                      : { ...sw, more: sw.more.map((x, j) => (j === i - 4 ? v : x)) };
                                  const nu = (x: string) => (x.toUpperCase() === p.c.toUpperCase() ? v : x);
                                  onChange({
                                    swatches: next,
                                    palette: undefined,
                                    colors: Object.fromEntries(
                                      Object.entries(brand.colors).map(([k, x]) => [k, nu(x)])
                                    ) as unknown as Brand["colors"],
                                    structure: {
                                      dividers: nu(brand.structure.dividers),
                                      table: nu(brand.structure.table),
                                    },
                                  });
                                }}
                              />
                            </label>
                            {i >= 4 && !used(p.c) && (
                              <button
                                className="bd-swatch-x"
                                aria-label={`Remove ${p.label}`}
                                onClick={() =>
                                  onChange({ swatches: { ...sw, more: sw.more.filter((_, j) => j !== i - 4) } })
                                }
                              >
                                <Icon name="close" size={10} />
                              </button>
                            )}
                          </span>
                        </Tip>
                      ))}
                      <Tip label="Add a color">
                        <button ref={addRef} className="bd-swatch add" onClick={() => setAdding(true)}>
                          <Icon name="plus" size={14} />
                        </button>
                      </Tip>
                    </div>
                    <div className="ts-hint">Primary, Secondary, Tertiary and Background, then any more.</div>
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
                            disabled={!/^#[0-9A-F]{6}$/.test(newColor)}
                            onClick={() => {
                              onChange({ swatches: { ...sw, more: [...sw.more, newColor] }, palette: undefined });
                              setAdding(false);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </Popover>
                    )}

                    <div className="bdf3-sub">Text styles</div>
                    <div className="bd-type bdf3-list">
                      {TYPE_ROWS.map((r) => (
                        <div className="bd-type-row" key={r.key}>
                          <span
                            className="bd-type-sample truncate"
                            style={{
                              fontFamily: `${rowFont(r.key)}, var(--font-sans)`,
                              /* One size for every row, the divider's. */
                              fontSize: 13,
                              fontWeight: r.weight,
                              color: rowColor(r.key),
                            }}
                          >
                            {r.label}
                          </span>
                          <PalettePick
                            value={rowColor(r.key)}
                            palette={palette}
                            label={r.label}
                            onPick={(c) => onChange({ colors: { ...brand.colors, [r.key]: c } })}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="bdf3-sub">Dividers and tables</div>
                    <div className="bd-type bdf3-list">
                    {(
                      [
                        ["dividers", "Divider"],
                        ["table", "Table"],
                      ] as const
                    ).map(([k, label]) => (
                      <div className="bd-type-row" key={k}>
                        <span className="bdf-label">{label}</span>
                        <PalettePick
                          value={brand.structure[k]}
                          palette={palette}
                          label={label}
                          onPick={(c) => onChange({ structure: { ...brand.structure, [k]: c } })}
                        />
                      </div>
                    ))}
                    </div>
                </div>
                </div>
                )}
              </div>

              {/* ---------------- Font ---------------- */}
              <div className="bdf2-field">
                <div className="bdf3-sub">Font</div>
                <Select
                  block
                  value={brand.font}
                  options={BRAND_FONTS}
                  onChange={(f) => onChange({ font: f, fonts: allFonts(f) })}
                />
              </div>

              <div className="bdf2-rule" />

              {/* ---------------- Assets ---------------- */}
              <div className="bdf2-field">
                <div className="bdf3-title">Assets</div>
                <div className="bdf2-help">
                  The logo, background images and any other artwork. Drag one onto the page or a header slot.
                </div>
                <div className="bdf2-tiles">
                  {brand.assets.map((a) => (
                    <Tip key={a.id} label={a.id === "logo" ? "Logo" : a.name}>
                      <span className="bdf2-tile-wrap">
                        <button
                          className="bdf2-tile"
                          aria-label={a.id === "logo" ? "Logo" : a.name}
                          draggable
                          onDragStart={(e) => setAssetDrag(e.dataTransfer, a.id)}
                        >
                          <img src={a.src} alt="" draggable={false} />
                        </button>
                        <button
                          className="bd-swatch-x"
                          aria-label={`Remove ${a.name}`}
                          onClick={() => onChange({ assets: brand.assets.filter((x) => x.id !== a.id) })}
                        >
                          <Icon name="close" size={10} />
                        </button>
                      </span>
                    </Tip>
                  ))}
                  {brand.assets.length < MAX_ASSETS && (
                    <Tip label="Add an image">
                      <button className="bdf2-tile add" onClick={() => fileRef.current?.click()}>
                        <Icon name="plus" size={20} />
                      </button>
                    </Tip>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      const src = String(r.result);
                      /* The first image a brand gets is its logo. */
                      const id = brand.assets.some((x) => x.id === "logo") ? `a${Date.now()}` : "logo";
                      onChange({
                        assets: [
                          ...brand.assets,
                          { id, name: id === "logo" ? "Logo" : f.name.replace(/\.[^.]+$/, ""), src, uploaded: today() },
                        ],
                      });
                    };
                    r.readAsDataURL(f);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version E: any change (brand, header, footer, margins) asks to be
          saved into the brand. Dismiss keeps it on this report only. */}
      {dirty && brand && (
        <div className="side-foot lay-foot">
          <span className="lay-changed plain">Styles have changed</span>
          <Button onClick={onDiscard}>Dismiss</Button>
          <Button variant="primary" onClick={onSave}>
            Update brand
          </Button>
        </div>
      )}
    </>
  );
}

/** A small square that opens the brand's colors to pick one. */
function PalettePick({
  value,
  palette,
  label,
  onPick,
}: {
  value: string;
  palette: Swatch[];
  label: string;
  onPick: (c: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        className="bd-swatch sm"
        style={{ background: value }}
        title={`${label} color`}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} align="end" width={196} className="menu bd-pick">
          <div className="bd-pick-label">{label}</div>
          <div className="bd-swatches">
            {palette.map((p, i) => (
              <button
                key={`${p.label}${i}`}
                className={`bd-swatch ${p.c.toUpperCase() === value.toUpperCase() ? "on" : ""}`}
                style={{ background: p.c }}
                title={`${p.label} ${p.c}`}
                onClick={() => {
                  onPick(p.c);
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

/** Version F: the building blocks, at the top of the Content tab. */
export function BuildingBlocks() {
  return (
    <div className="bdf2-blocks-sec">
      <div className="bdf2-title">Building blocks</div>
      <div className="block-grid bdf2-blocks">
        {BLOCKS.map((b) => (
          <Tip key={b.label} label={b.label}>
            <button
              className="block-tile"
              aria-label={b.label}
              draggable
              onDragStart={(e) => setBlockDrag(e.dataTransfer, b.label)}
            >
              <Icon name={b.icon} size={24} />
            </button>
          </Tip>
        ))}
      </div>
      <div className="bdf2-rule" />
    </div>
  );
}
