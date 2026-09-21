import { Icon, type IconName } from "../ui/Icon";
import { Select } from "../ui/primitives";
import { ColorField } from "../ui/ColorField";
import { allFonts, BRAND_FONTS, type Brand } from "../../data/brand";

/**
 * Figma "Template editor - Design Tab".
 *
 * The third tab in the template editor. It is the brand, seen from the
 * template's side: picking one fills every field below it, and editing a field
 * writes back to the brand in the Org Profile — so a colour changed here
 * changes it everywhere that brand is used, which is the point of brands
 * living there rather than on the template.
 */

/**
 * The palette of blocks the document can be built from — Figma "Building
 * blocks", five to a row in the design's order. Every glyph is the real icon
 * component from the file, so the palette reads as the product's own vocabulary
 * rather than a set of lookalikes.
 */
const BUILDING_BLOCKS: { label: string; icon: IconName }[] = [
  { label: "Heading 1", icon: "h1" },
  { label: "Heading 2", icon: "h2" },
  { label: "Heading 3", icon: "h3" },
  { label: "Heading 4", icon: "h4" },
  { label: "Paragraph", icon: "paragraph" },
  { label: "Divider", icon: "divider" },
  { label: "Code block", icon: "code" },
  { label: "Image", icon: "image" },
  { label: "Table", icon: "table" },
  { label: "Callout", icon: "callout" },
  { label: "TLP badge", icon: "tlp-badge" },
  { label: "Page count", icon: "page-count" },
  { label: "Logo", icon: "logo" },
];

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
            design. Dragging one onto the canvas is out of scope for this pass,
            so they read as the vocabulary the document is built from. */}
        <div className="block-grid">
          {BUILDING_BLOCKS.map((b) => (
            <button key={b.label} className="block-tile" title={b.label} disabled={readOnly}>
              <Icon name={b.icon} size={28} />
            </button>
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
              <ColorField label="TLP" value={brand.colors.tlp} onChange={color("tlp")} disabled={readOnly} />
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

          <div className="field">
            <div className="field-label" style={{ marginBottom: 10 }}>
              TLP badge colors
            </div>
            <div className="color-stack">
              <ColorField
                label="Clear"
                value={brand.tlp.clear}
                disabled={readOnly}
                onChange={(v) => onEditBrand({ tlp: { ...brand.tlp, clear: v } })}
              />
              <ColorField
                label="Green"
                value={brand.tlp.green}
                disabled={readOnly}
                onChange={(v) => onEditBrand({ tlp: { ...brand.tlp, green: v } })}
              />
              <ColorField
                label="Amber"
                value={brand.tlp.amber}
                disabled={readOnly}
                onChange={(v) => onEditBrand({ tlp: { ...brand.tlp, amber: v } })}
              />
              <ColorField
                label="Red"
                value={brand.tlp.red}
                disabled={readOnly}
                onChange={(v) => onEditBrand({ tlp: { ...brand.tlp, red: v } })}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
