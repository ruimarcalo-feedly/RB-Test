import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, MenuItem, Popover } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import { BandThumb, DeleteBandDialog, RenameBandDialog } from "../report/BandObjects";
import { useStore } from "../../state/store";
import { EMPTY_BAND, bandVars, brandVars, type Brand, type PageBand } from "../../data/brand";
import {
  brandBands,
  nextName,
  primaryBand,
  type BandKind,
  type SavedBand,
} from "../../data/bandObjects";

/* ------------------------------------------------------------------ *
 * Version C — the brand's header and footer styles, in the Org Profile
 *
 * The brand panel lists the styles saved into the brand, the primary one
 * marked. Clicking one opens it on its own: the header, a grey stand-in for
 * the report, and the footer, so only the band itself can be changed.
 * ------------------------------------------------------------------ */

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function BrandBandsSection({ brand, kind }: { brand: Brand; kind: BandKind }) {
  const { deleteBrandBand, updateBrandBand, setPrimaryBand, toast } = useStore();
  const list = brandBands(brand, kind);
  const primaryId = primaryBand(brand, kind)?.id;
  const [studio, setStudio] = useState<SavedBand | "new" | null>(null);
  const [menuFor, setMenuFor] = useState<SavedBand | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState<SavedBand | null>(null);
  const [deleting, setDeleting] = useState<SavedBand | null>(null);

  return (
    <section className="brand-section">
      <h3 className="t-h3" style={{ margin: 0 }}>
        {cap(kind)} styles
      </h3>
      <p className="t-body3 muted" style={{ margin: "4px 0 12px" }}>
        The {kind}s saved in this brand. The default one is applied whenever the brand is; a
        template can pick another.
      </p>
      <div className="bb-grid">
        {list.map((b) => (
          <div className="bobj-card lib" key={b.id}>
            <button className="bobj-thumb" title={`Edit “${b.name}”`} onClick={() => setStudio(b)}>
              <BandThumb band={b.band} kind={kind} brand={brand} />
            </button>
            <div className="bobj-foot">
              <span className="bobj-name truncate">{b.name}</span>
              {primaryId === b.id && <span className="bobj-primary">Default</span>}
              <button
                className="btn ghost icon sm"
                title="More"
                onClick={(e) => {
                  menuRef.current = e.currentTarget;
                  setMenuFor(b);
                }}
              >
                <Icon name="ellipsis" size={16} />
              </button>
            </div>
          </div>
        ))}
        <button className="bb-add" onClick={() => setStudio("new")}>
          <Icon name="plus" size={18} />
          Add {kind} style
        </button>
      </div>

      {menuFor && (
        <Popover anchorRef={menuRef} onClose={() => setMenuFor(null)} width={190}>
          <MenuItem
            icon="pencil"
            onClick={() => {
              setStudio(menuFor);
              setMenuFor(null);
            }}
          >
            Edit
          </MenuItem>
          {primaryId !== menuFor.id && (
            <MenuItem
              icon="check"
              onClick={() => {
                setPrimaryBand(brand.id, kind, menuFor.id);
                toast(`“${menuFor.name}” is now ${brand.name}’s default ${kind}`);
                setMenuFor(null);
              }}
            >
              Set as default
            </MenuItem>
          )}
          <MenuItem
            icon="text"
            onClick={() => {
              setRenaming(menuFor);
              setMenuFor(null);
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon="trash"
            onClick={() => {
              setDeleting(menuFor);
              setMenuFor(null);
            }}
          >
            Delete
          </MenuItem>
        </Popover>
      )}

      {renaming && (
        <RenameBandDialog
          kind={kind}
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(n) => {
            updateBrandBand(brand.id, renaming.id, { name: n });
            setRenaming(null);
          }}
        />
      )}
      {deleting && (
        <DeleteBandDialog
          band={deleting}
          brand={brand}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            deleteBrandBand(brand.id, deleting.id);
            toast(`${cap(kind)} style “${deleting.name}” deleted`);
            setDeleting(null);
          }}
        />
      )}
      {studio &&
        createPortal(
          <BandStudio
            brand={brand}
            kind={kind}
            style={studio === "new" ? null : studio}
            onClose={() => setStudio(null)}
          />,
          document.body
        )}
    </section>
  );
}

/**
 * One header or footer style on its own: the band being edited, a grey page
 * where the report would be, and the brand's primary of the other band for
 * context. Nothing but the band can be changed here.
 */
function BandStudio({
  brand,
  kind,
  style,
  onClose,
}: {
  brand: Brand;
  kind: BandKind;
  style: SavedBand | null;
  onClose: () => void;
}) {
  const { addBrandBand, updateBrandBand, toast } = useStore();
  const [band, setBand] = useState<PageBand>(style?.band ?? EMPTY_BAND);
  const [name, setName] = useState(
    style?.name ?? nextName(`${cap(kind)} style`, brandBands(brand, kind).map((b) => b.name))
  );
  const other: BandKind = kind === "header" ? "footer" : "header";
  const otherBand = primaryBand(brand, other)?.band ?? EMPTY_BAND;
  const hb = kind === "header" ? band : otherBand;
  const fb = kind === "footer" ? band : otherBand;

  const save = () => {
    const n = name.trim() || `${cap(kind)} style`;
    if (style) {
      updateBrandBand(brand.id, style.id, { band, name: n });
      toast(`“${n}” saved in ${brand.name}`);
    } else {
      addBrandBand(brand.id, { kind, name: n, band });
      toast(`${cap(kind)} style “${n}” added to ${brand.name}`);
    }
    onClose();
  };

  const bandEditor = (k: BandKind, b: PageBand) => (
    <PageBandEditor
      kind={k}
      band={b}
      brand={brand}
      mode={k === kind ? "edit" : "plain"}
      objects
      active={k === kind}
      onActivate={() => {}}
      onChange={k === kind ? setBand : () => {}}
      tagLabel={k === kind ? name || cap(kind) : undefined}
    />
  );

  return (
    <div className="band-studio">
      <div className="bs-top">
        <Button onClick={onClose}>Cancel</Button>
        <div className="bs-title">
          <span className="t-body3 muted">
            {brand.name} &middot; {cap(kind)} style
          </span>
          <input
            className="bs-name"
            value={name}
            aria-label="Style name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={save}>
          {style ? "Save changes" : "Save style"}
        </Button>
      </div>
      <div className="bs-canvas">
        <div className="report-page bs-page" style={{ ...brandVars(brand), ...bandVars(hb, fb, brand) }}>
          {bandEditor("header", hb)}
          <div className="bs-body" aria-hidden="true">
            <div className="bs-line w40 tall" />
            <div className="bs-line w90" />
            <div className="bs-line w80" />
            <div className="bs-line w60" />
            <div className="bs-note">The report goes here</div>
          </div>
          {bandEditor("footer", fb)}
        </div>
      </div>
    </div>
  );
}

/**
 * Version C (Oct 31): the brand's one header (or footer), to look at. It is
 * changed in a template's Design tab and applied back to the brand from there.
 */
export function BrandBandPreview({ brand, kind }: { brand: Brand; kind: BandKind }) {
  const band = brand[kind];
  return (
    <section className="brand-section">
      <h3 className="t-h3" style={{ margin: 0 }}>
        {cap(kind)}
      </h3>
      <p className="t-body3 muted" style={{ margin: "4px 0 12px" }}>
        Every template using {brand.name} gets this {kind}. Change it in a template&rsquo;s Design
        tab, then apply it to the brand.
      </p>
      <div className="bobj-card readonly bb-preview">
        <div className="bobj-thumb">
          {band ? (
            <BandThumb band={band} kind={kind} brand={brand} context />
          ) : (
            <span className="bobj-none">No {kind}</span>
          )}
        </div>
      </div>
    </section>
  );
}
