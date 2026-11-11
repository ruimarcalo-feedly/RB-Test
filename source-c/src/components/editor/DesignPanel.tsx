import { Icon } from "../ui/Icon";
import { Select, Tip } from "../ui/primitives";
import { BrandPicker } from "../org/BrandPicker";
import { ColorField } from "../ui/ColorField";
import { allFonts, BRAND_FONTS, type Brand } from "../../data/brand";
import { brandBands, primaryBand, type BandKind } from "../../data/bandObjects";
import { BUILDING_BLOCKS, setAssetDrag, setBlockDrag } from "../../data/buildingBlocks";

/**
 * Figma "Template editor - Design Tab".
 *
 * The third tab in the template editor. It is the brand, seen from the
 * template's side: picking one fills every field below it, and editing a field
 * writes back to the brand in the Org Profile — so a colour changed here
 * changes it everywhere that brand is used, which is the point of brands
 * living there rather than on the template.
 */


export function DesignPanel({
  brands,
  brandId,
  onPickBrand,
  onEditBrand,
  readOnly,
  styleIds,
  onPickStyle,
}: {
  brands: Brand[];
  brandId?: string;
  onPickBrand: (id: string | undefined) => void;
  /** Edits go back to the brand itself, not to a copy on the template. */
  onEditBrand: (patch: Partial<Brand>) => void;
  readOnly?: boolean;
  /** Version C: the header and footer styles this template pins, from its brand. */
  styleIds?: Partial<Record<BandKind, string>>;
  onPickStyle?: (kind: BandKind, id: string | undefined) => void;
}) {
  const brand = brands.find((b) => b.id === brandId);

  return (
    <>
      <div className="field">
        <div className="field-label">Brand</div>
        <div className="field-help" style={{ margin: "0 0 8px" }}>
          All brands are stored in the Org Profile and contain styles from your organization(s).
        </div>
        <BrandPicker brands={brands} brandId={brandId} onPick={onPickBrand} disabled={readOnly} />
        {/* Version C: a template can use one of the brand's other header or
            footer styles instead of its primary. */}
        {brand &&
          onPickStyle &&
          (["header", "footer"] as BandKind[]).map((k) => {
            const list = brandBands(brand, k);
            const prim = primaryBand(brand, k);
            const primLabel = prim ? `Default (${prim.name})` : "Default";
            const pinned = list.find((b) => b.id === styleIds?.[k]);
            return (
              <div className="tpl-style-pick" key={k}>
                <div className="field-label sm">{k === "header" ? "Header style" : "Footer style"}</div>
                <Select
                  block
                  disabled={readOnly || list.length === 0}
                  value={list.length === 0 ? undefined : pinned?.name ?? primLabel}
                  placeholder={`No ${k} styles in ${brand.name}`}
                  options={[primLabel, ...list.filter((b) => b.id !== prim?.id).map((b) => b.name)]}
                  onChange={(v) => onPickStyle(k, list.find((b) => b.name === v && b.id !== prim?.id)?.id)}
                />
              </div>
            );
          })}
      </div>

      <div className="side-rule" />

      <div className="field">
        <div className="field-label" style={{ marginBottom: 10 }}>
          Building blocks
        </div>
        {/* A palette rather than a list: 60px tiles, five to a row, as in the
            design. Each tile is dragged onto the page — into the document, or
            into a header or footer slot for the blocks that are furniture. */}
        <div className="block-grid">
          {/* Each tile is only a glyph, so it names itself on hover. */}
          {BUILDING_BLOCKS.map((b) => (
            <Tip key={b.label} label={b.label}>
              <button
                className="block-tile"
                aria-label={b.label}
                disabled={readOnly}
                draggable={!readOnly}
                onDragStart={(e) => setBlockDrag(e.dataTransfer, b.label)}
              >
                <Icon name={b.icon} size={28} />
              </button>
            </Tip>
          ))}
          {/* Then the brand's own assets, one tile each, showing the image
              itself and marked with the palette glyph because they come with
              the brand. They follow the brand picked above, so they are absent
              with no brand and change when the brand does — and anything
              uploaded to the brand in the Org Profile appears here too. */}
          {brand?.assets.map((a) => (
            <Tip key={`asset-${brand.id}-${a.id}`} label={a.name}>
              <button
                className="block-tile asset"
                aria-label={a.name}
                disabled={readOnly}
                draggable={!readOnly}
                onDragStart={(e) => setAssetDrag(e.dataTransfer, a.id)}
              >
                <img src={a.src} alt="" draggable={false} />
                <span className="asset-mark" aria-hidden="true">
                  <Icon name="brand" size={16} />
                </span>
              </button>
            </Tip>
          ))}
        </div>
      </div>

      {/* Everything below is the brand's own styling. With no brand picked
          there is nothing to edit, so the panel says so rather than showing
          fields that write nowhere. */}
      {!brand ? (
        <div className="field">
          <div className="empty-note">
            Pick a brand to set the document's typeface and colours, or add one in the Org Profile.
          </div>
        </div>
      ) : (
        <BrandStyleFields brand={brand} onEditBrand={onEditBrand} readOnly={readOnly} />
      )}
    </>
  );
}

/** The brand's document styles: typeface, text colors and structure colors. */
export function BrandStyleFields({
  brand,
  onEditBrand,
  readOnly,
  charts,
}: {
  brand: Brand;
  onEditBrand: (patch: Partial<Brand>) => void;
  readOnly?: boolean;
  /** Version C: the chart colors too, for the report's Design tab. */
  charts?: boolean;
}) {
  const color = (k: keyof Brand["colors"]) => (v: string) =>
    onEditBrand({ colors: { ...brand.colors, [k]: v } });
  return (
    <>
      <div className="field">
        <div className="field-label">Default font</div>
        <Select
          block
          disabled={readOnly}
          value={brand.font}
          options={BRAND_FONTS}
          onChange={(v) => onEditBrand({ font: v, fonts: allFonts(v) })}
        />
      </div>

      <div className="field">
        <div className="field-label" style={{ marginBottom: 10 }}>
          Font colors
        </div>
        <div className="color-stack">
          <ColorField label="Header 1" value={brand.colors.h1} onChange={color("h1")} disabled={readOnly} />
          <ColorField label="Header 2" value={brand.colors.h2} onChange={color("h2")} disabled={readOnly} />
          <ColorField label="Header 3" value={brand.colors.h3} onChange={color("h3")} disabled={readOnly} />
          <ColorField label="Header 4" value={brand.colors.h4} onChange={color("h4")} disabled={readOnly} />
          <ColorField
            label="Paragraph"
            value={brand.colors.paragraph}
            onChange={color("paragraph")}
            disabled={readOnly}
          />
          <ColorField
            label="Caption"
            value={brand.colors.caption}
            onChange={color("caption")}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="field">
        <div className="field-label" style={{ marginBottom: 10 }}>
          Structure
        </div>
        <div className="color-stack">
          <ColorField
            label="Dividers"
            value={brand.structure.dividers}
            disabled={readOnly}
            onChange={(v) => onEditBrand({ structure: { ...brand.structure, dividers: v } })}
          />
          <ColorField
            label="Table"
            value={brand.structure.table}
            disabled={readOnly}
            onChange={(v) => onEditBrand({ structure: { ...brand.structure, table: v } })}
          />
        </div>
      </div>
      {charts && (
        <div className="field">
          <div className="field-label" style={{ marginBottom: 10 }}>
            Chart colors
          </div>
          <div className="color-stack">
            {brand.viz.map((v, i) => (
              <ColorField
                key={i}
                label={`Chart color ${i + 1}`}
                value={v}
                disabled={readOnly}
                onChange={(c) => onEditBrand({ viz: brand.viz.map((x, j) => (j === i ? c : x)) })}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
