import { Icon } from "../ui/Icon";
import { Select, Tip } from "../ui/primitives";
import { ColorField } from "../ui/ColorField";
import { allFonts, BRAND_FONTS, type Brand } from "../../data/brand";
import { BUILDING_BLOCKS, setBlockDrag } from "../../data/buildingBlocks";

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
}: {
  brands: Brand[];
  brandId?: string;
  onPickBrand: (id: string | undefined) => void;
  /** Edits go back to the brand itself, not to a copy on the template. */
  onEditBrand: (patch: Partial<Brand>) => void;
  readOnly?: boolean;
}) {
  const brand = brands.find((b) => b.id === brandId);
  const color = (k: keyof Brand["colors"]) => (v: string) =>
    brand && onEditBrand({ colors: { ...brand.colors, [k]: v } });

  return (
    <>
      <div className="field">
        <div className="field-label">Brand</div>
        <div className="field-help" style={{ margin: "0 0 8px" }}>
          All brands are stored in the Org Profile and contain styles from your organization(s).
        </div>
        <Select
          block
          icon="brand"
          disabled={readOnly}
          value={brand?.name}
          placeholder="No brand"
          options={["No brand", ...brands.map((b) => b.name)]}
          onChange={(name) =>
            onPickBrand(name === "No brand" ? undefined : brands.find((b) => b.name === name)?.id)
          }
        />
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
        </>
      )}
    </>
  );
}
