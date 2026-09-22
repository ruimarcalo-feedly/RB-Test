import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Modal, Popover, MenuItem } from "../ui/primitives";
import {
  BAND_ELEMENTS,
  bandImage,
  brandLogo,
  newElement,
  tlpTone,
  type Brand,
  type BandElement,
  type BandElementKind,
  type PageBand,
  type SlotKey,
} from "../../data/brand";

/**
 * Figma "Template editor - Heading" and "- Footer".
 *
 * The band across the top and bottom of the page. It is three slots — left,
 * middle, right — rather than a free canvas, because a header only reads as a
 * header when it lands in the same place on every page; the alignment is the
 * structure, so it is the model.
 *
 * The band has three states, which is what `mode` switches between:
 *
 * - `plain` — the report editor. Whatever the band holds is simply part of the
 *   page; there is nothing to hover and nothing to add.
 * - `hint` — the template editor's other tabs. The band is quiet until the
 *   cursor lands on it, and then outlines itself in grey and says which one it
 *   is, so the page's furniture can be found without being in its way.
 * - `edit` — the Design tab. Every band outlines itself permanently in grey and
 *   turns accent on hover, with its empty slots and its toolbar.
 *
 * Clicking a band in `hint` is how you get to `edit`: the band you clicked is
 * marked active and the editor moves to the Design tab, so finding the thing
 * and being able to change it are one gesture rather than two.
 */

export type BandMode = "plain" | "hint" | "edit";

const SLOTS: SlotKey[] = ["left", "middle", "right"];

export function PageBandEditor({
  kind,
  band,
  brand,
  mode,
  active,
  onActivate,
  onChange,
}: {
  kind: "header" | "footer";
  band: PageBand;
  brand?: Brand;
  mode: BandMode;
  /** The band being worked on — outlined in accent and labelled to match. */
  active?: boolean;
  onActivate?: () => void;
  onChange: (b: PageBand) => void;
}) {
  const editable = mode === "edit";
  const [menuFor, setMenuFor] = useState<SlotKey | null>(null);
  const [bgDialog, setBgDialog] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const slotRefs = {
    left: useRef<HTMLButtonElement>(null),
    middle: useRef<HTMLButtonElement>(null),
    right: useRef<HTMLButtonElement>(null),
  };
  const scopeRef = useRef<HTMLButtonElement>(null);
  const bgRef = useRef<HTMLButtonElement>(null);

  /* Deselecting a band takes its toolbar away, so its menus go with it. */
  useEffect(() => {
    if (!active) {
      setScopeOpen(false);
      setBgOpen(false);
    }
  }, [active]);

  const image = bandImage(band, brand);
  const filled = SLOTS.some((s) => band[s]);
  /* An empty band in the report is nothing at all — the slots and their dashed
     outlines are an editing affordance, not part of the document. */
  if (mode === "plain" && !filled && !image) return null;

  const set = (patch: Partial<PageBand>) => onChange({ ...band, ...patch });
  const setSlot = (slot: SlotKey, el: BandElement | null) => onChange({ ...band, [slot]: el });

  return (
    <div
      className={`band-wrap ${kind} ${mode} ${active ? "active" : ""}`}
      onClick={mode === "plain" ? undefined : onActivate}
    >
      {/* The toolbar belongs to the band you are editing, not to both at once,
          so it only appears once this band is selected. */}
      {editable && active && (
        <BandToolbar
          kind={kind}
          band={band}
          scopeRef={scopeRef}
          bgRef={bgRef}
          onScope={() => setScopeOpen((o) => !o)}
          onBackground={() => setBgOpen((o) => !o)}
          onImage={() => setBgDialog(true)}
        />
      )}

      <div
        className={`band ${image ? "has-image" : ""}`}
        style={{
          background: image
            ? `${band.background} url("${image}") center / cover no-repeat`
            : band.background,
        }}
      >
        {SLOTS.map((slot) => (
          <div className={`band-slot ${slot}`} key={slot}>
            {band[slot] ? (
              <BandElementView
                el={band[slot]!}
                brand={brand}
                editable={editable}
                onChange={(el) => setSlot(slot, el)}
                onRemove={() => setSlot(slot, null)}
              />
            ) : editable ? (
              <button
                ref={slotRefs[slot]}
                className="band-add"
                onClick={() => setMenuFor(slot)}
                title={`Add to the ${slot} of the ${kind}`}
              >
                <Icon name="plus" size={20} />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {mode !== "plain" && (
        <span className="band-tag">
          {kind === "header" ? "Header" : "Footer"}
          {band.scope === "all" && <span className="bt-scope"> · All pages</span>}
        </span>
      )}

      {/* ---------------- The slot's own menu ---------------- */}
      {menuFor && (
        <Popover anchorRef={slotRefs[menuFor]} onClose={() => setMenuFor(null)} width={200}>
          {BAND_ELEMENTS.map((e) => (
            <MenuItem
              key={e.kind}
              icon={e.icon}
              onClick={() => {
                setSlot(menuFor, newElement(e.kind as BandElementKind));
                setMenuFor(null);
              }}
            >
              {e.label}
            </MenuItem>
          ))}
        </Popover>
      )}

      {/* ---------------- Which pages the band runs on ---------------- */}
      {scopeOpen && (
        <Popover anchorRef={scopeRef} onClose={() => setScopeOpen(false)} width={160}>
          <MenuItem
            icon={band.scope === "cover" ? "check" : undefined}
            onClick={() => {
              set({ scope: "cover" });
              setScopeOpen(false);
            }}
          >
            Cover only
          </MenuItem>
          <MenuItem
            icon={band.scope === "all" ? "check" : undefined}
            onClick={() => {
              set({ scope: "all" });
              setScopeOpen(false);
            }}
          >
            All pages
          </MenuItem>
        </Popover>
      )}

      {/* ---------------- The band's background colour ---------------- */}
      {bgOpen && (
        <Popover anchorRef={bgRef} onClose={() => setBgOpen(false)} width={196}>
          <div className="swatch-grid">
            {["#FFFFFF", "#F7F7F7", "#F2F2F2", "#141413", "#2BB24C", "#EAF7ED", "#1E7FD8", "#FCC7C3"].map(
              (c) => (
                <button
                  key={c}
                  className={`swatch ${band.background === c ? "on" : ""}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => {
                    set({ background: c });
                    setBgOpen(false);
                  }}
                />
              )
            )}
          </div>
          {image && (
            <>
              <div className="menu-sep" />
              <MenuItem
                icon="trash"
                onClick={() => {
                  set({ image: null, imageAsset: undefined });
                  setBgOpen(false);
                }}
              >
                Remove image
              </MenuItem>
            </>
          )}
        </Popover>
      )}

      {bgDialog && (
        <BackgroundDialog
          brand={brand}
          onClose={() => setBgDialog(false)}
          onApply={(patch) => {
            set({ image: null, imageAsset: undefined, ...patch });
            setBgDialog(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The floating toolbar
 * ------------------------------------------------------------------ */

/**
 * Figma `FloatingMenu`: a layout button, a background image, a background
 * colour, and which pages the band runs on. It hangs just outside the band —
 * above the header, below the footer — so it never sits over the content it
 * is about.
 */
function BandToolbar({
  kind,
  band,
  scopeRef,
  bgRef,
  onScope,
  onBackground,
  onImage,
}: {
  kind: "header" | "footer";
  band: PageBand;
  scopeRef: React.RefObject<HTMLButtonElement | null>;
  bgRef: React.RefObject<HTMLButtonElement | null>;
  onScope: () => void;
  onBackground: () => void;
  onImage: () => void;
}) {
  return (
    <div className={`band-toolbar ${kind}`}>
      <button className="btb-btn cols" title="Three columns">
        <span className="cols-glyph">
          <i />
          <i />
          <i />
        </span>
        <Icon name="chevron-down" size={14} />
      </button>
      <span className="btb-div" />
      <button className="btb-btn" title="Background image" onClick={onImage}>
        <Icon name="image" size={18} />
      </button>
      <button ref={bgRef} className="btb-btn" title="Background colour" onClick={onBackground}>
        <span className="btb-swatch" style={{ background: band.background }} />
        <Icon name="chevron-down" size={14} />
      </button>
      <span className="btb-div" />
      <button ref={scopeRef} className="btb-btn label" onClick={onScope}>
        {band.scope === "cover" ? "Cover only" : "All pages"}
        <Icon name="chevron-down" size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One element in a slot
 * ------------------------------------------------------------------ */

function BandElementView({
  el,
  brand,
  editable,
  onChange,
  onRemove,
}: {
  el: BandElement;
  brand?: Brand;
  editable: boolean;
  onChange: (el: BandElement) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  /* The text is written straight into the element rather than through a field,
     so what is being edited is the thing on the page. React must not re-render
     over the caret, so the DOM is only seeded when the value changes from
     outside. */
  useEffect(() => {
    if (textRef.current && textRef.current.textContent !== (el.text ?? "")) {
      textRef.current.textContent = el.text ?? "";
    }
  }, [el.text]);

  const body = () => {
    switch (el.kind) {
      case "logo": {
        const logo = brandLogo(brand);
        return logo ? (
          <img className="be-logo" src={logo.src} alt={logo.name} />
        ) : (
          <span className="be-placeholder">
            <Icon name="brand" size={16} /> No brand logo
          </span>
        );
      }

      case "image":
        return el.src ? (
          <img className="be-image" src={el.src} alt="" />
        ) : (
          <button className="be-placeholder as-button" onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={16} /> Upload image
          </button>
        );

      case "pageCount":
        /* A page number cannot be known here, so the element shows the token it
           will be replaced by, which is what the design does. */
        return <span className="be-page">#</span>;

      case "tlp":
        return (
          <span
            className="be-tlp"
            style={{
              background: tlpTone(el.text, brand ?? FALLBACK_BRAND),
              color: brand?.colors.tlp ?? "var(--content-bold)",
            }}
          >
            <span
              ref={textRef}
              contentEditable={editable}
              suppressContentEditableWarning
              onInput={(e) => onChange({ ...el, text: e.currentTarget.textContent ?? "" })}
            />
          </span>
        );

      default:
        return (
          <span
            ref={textRef}
            className={`be-text ${el.kind}`}
            style={{ color: textColor(el.kind, brand) }}
            contentEditable={editable}
            suppressContentEditableWarning
            onInput={(e) => onChange({ ...el, text: e.currentTarget.textContent ?? "" })}
          />
        );
    }
  };

  return (
    <div className={`band-el ${editable ? "editing" : ""}`}>
      {body()}
      {editable && (
        <button className="be-remove" title="Remove" onClick={onRemove}>
          <Icon name="close" size={12} />
        </button>
      )}
      {el.kind === "image" && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => onChange({ ...el, src: String(r.result) });
            r.readAsDataURL(f);
          }}
        />
      )}
    </div>
  );
}

/** Colours for the text elements come from the brand, like the body copy. */
function textColor(kind: BandElementKind, brand?: Brand) {
  if (!brand) return undefined;
  if (kind === "h3") return brand.colors.h3;
  if (kind === "h4") return brand.colors.h4;
  return brand.colors.caption;
}

/** Only used to tone a TLP badge before a brand is picked. */
const FALLBACK_BRAND = {
  tlp: { clear: "#F2F2F2", green: "#D5F0DB", amber: "#FFEACC", red: "#FCC7C3" },
} as Brand;

/* ------------------------------------------------------------------ *
 * Background image
 * ------------------------------------------------------------------ */

function BackgroundDialog({
  brand,
  onClose,
  onApply,
}: {
  brand?: Brand;
  onClose: () => void;
  onApply: (patch: Partial<PageBand>) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  /* An asset is applied by id, so the band follows the brand rather than
     keeping a copy of whichever image was current when it was chosen. */
  const [assetId, setAssetId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const read = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setAssetId(null);
      setSrc(String(r.result));
    };
    r.readAsDataURL(f);
  };

  return (
    <Modal
      title="Upload background image"
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            disabled={!src && !assetId}
            onClick={() => onApply(assetId ? { imageAsset: assetId } : { image: src })}
          >
            Apply
          </Button>
        </>
      }
    >
      {src ? (
        <img className="bg-preview" src={src} alt="" />
      ) : (
        <div
          className={`dropzone ${over ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            read(e.dataTransfer.files[0]);
          }}
        >
          <Icon name="image" size={24} style={{ color: "var(--content-light)" }} />
          <div className="t-body3 muted">Drag and drop or</div>
          <Button onClick={() => input.current?.click()}>Upload Image</Button>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            hidden
            onChange={(e) => read(e.target.files?.[0])}
          />
        </div>
      )}
      <div className="field-help" style={{ marginTop: 8 }}>
        Use a 1200px width image for best results. Supported files PNG, JPG, GIF, 1 MB max.
      </div>
      {/* The brand's own imagery is the usual answer, and picking it here keeps
          the band tied to the brand rather than to this particular file. */}
      {(brand?.assets ?? []).map((a) => (
        <button
          key={a.id}
          className={`bg-preset ${assetId === a.id ? "on" : ""}`}
          onClick={() => {
            setAssetId(a.id);
            setSrc(a.src);
          }}
        >
          <img src={a.src} alt="" />
          <span>
            Use {brand?.name}&rsquo;s {a.name.toLowerCase()}
          </span>
        </button>
      ))}
    </Modal>
  );
}
