import { useRef, useState } from "react";
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
import { THEME_MARGINS, type ReportTheme } from "../../data/theme";
import { BandThumb } from "../themes/Themes";

/* ------------------------------------------------------------------ *
 * Version F (Separate Themes) — the report's Design tab
 *
 * Figma "ReportLeftPanel" (4546:212352). The brand picker heads a box that
 * holds the brand's styles: its color palette (summed up as swatches, with
 * every color edited right here, always open), its font and its assets
 * (tiles that drag onto the page or a header slot). Then the building blocks
 * and the document margins. A change to the brand waits for "Save brand
 * changes" in the bar at the bottom; margins are the report's own and go
 * with a theme. The header and footer are designed on the page.
 * ------------------------------------------------------------------ */

const TYPE_ROWS: { key: TypeKey; label: string; size: number; weight: number }[] = [
  { key: "h1", label: "Heading 1", size: 20, weight: 700 },
  { key: "h2", label: "Heading 2", size: 17, weight: 700 },
  { key: "h3", label: "Heading 3", size: 15, weight: 600 },
  { key: "h4", label: "Heading 4", size: 14, weight: 600 },
  { key: "paragraph", label: "Paragraph", size: 13, weight: 400 },
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
  look,
  setLook,
  dirty,
  onSave,
  onDiscard,
  activeBand,
  onPickBand,
}: {
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  /** The brand with the changes not yet saved. */
  brand?: Brand;
  onChange: (patch: Partial<Brand>) => void;
  /** The report's current look: its margins live here. */
  look: ReportTheme;
  setLook: (f: (t: ReportTheme) => ReportTheme) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Nov 4: the header and footer previews select the band on the page. */
  activeBand?: "header" | "footer" | null;
  onPickBand?: (k: "header" | "footer") => void;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState("#7A7A7A");
  const fileRef = useRef<HTMLInputElement>(null);
  const sw = brand ? brandSwatches(brand) : null;
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
      ? [...TYPE_ROWS.map((r) => brand.colors[r.key]), brand.structure.dividers, brand.structure.table].some(
          (x) => x.toUpperCase() === c.toUpperCase()
        )
      : false;
  const margin = look.margin ?? 96;

  return (
    <>
      <div className="side-scroll details-panel bdf2">
        <div className="bdf2-brand">
          <div className="bdf2-select">
            <BrandPicker brands={brands} brandId={brandId} onPick={setBrandId} textEdit />
          </div>

          {brand && sw && (
            <div className="bdf2-box">
              {/* ---------------- Color palette ---------------- */}
              <div className="bdf2-field">
                <div className="bdf2-label">Color palette</div>
                {/* Always open: the colors, the text styles and the dividers and
                    tables, straight in the brand box. */}
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

                    <div className="bdf-sub">Text styles</div>
                    <div className="bd-type">
                      {TYPE_ROWS.map((r) => (
                        <div className="bd-type-row" key={r.key}>
                          <span
                            className="bd-type-sample truncate"
                            style={{
                              fontFamily: `${brand.fonts[r.key]}, var(--font-sans)`,
                              /* One size for every row, the divider's. */
                              fontSize: 13,
                              fontWeight: r.weight,
                              color: brand.colors[r.key],
                            }}
                          >
                            {r.label}
                          </span>
                          <PalettePick
                            value={brand.colors[r.key]}
                            palette={palette}
                            label={r.label}
                            onPick={(c) => onChange({ colors: { ...brand.colors, [r.key]: c } })}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="bdf-sub">Dividers and tables</div>
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

              {/* ---------------- Font ---------------- */}
              <div className="bdf2-field">
                <div className="bdf2-label">Font</div>
                <Select
                  block
                  value={brand.font}
                  options={BRAND_FONTS}
                  onChange={(f) => onChange({ font: f, fonts: allFonts(f) })}
                />
              </div>

              {/* ---------------- Assets ---------------- */}
              <div className="bdf2-field">
                <div className="bdf2-label">Assets</div>
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

        <div className="bdf2-rule" />

        {/* ---------------- Document margins ---------------- */}
        <div className="bdf2-title">Document margins</div>
        <div className="bdf2-toggles" role="radiogroup" aria-label="Document margins">
          {THEME_MARGINS.map((m) => (
            <button
              key={m.label}
              role="radio"
              aria-checked={margin === m.px}
              className={margin === m.px ? "on" : ""}
              onClick={() => setLook((t) => ({ ...t, margin: m.px }))}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Nov 4: the report's header and footer, as they are on the page. */}
        <div className="bdf2-bands">
          {(["header", "footer"] as const).map((k) => (
            <div className="bdf2-band" key={k}>
              <div className="bdf2-title">{k === "header" ? "Header" : "Footer"}</div>
              <BandThumb
                theme={look}
                brand={brand}
                kind={k}
                active={activeBand === k}
                onClick={() => onPickBand?.(k)}
              />
            </div>
          ))}
          <div className="bdf2-help">Click the header or footer on the page to change it.</div>
        </div>
      </div>

      {/* Changes to the brand wait here until saved. */}
      {dirty && brand && (
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
