import { LayoutView, isSlotBand } from "../report/Layouts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, Modal, Popover, MenuItem } from "../ui/primitives";
import { BackgroundPopover } from "./BandBackground";
import { ImageSource } from "./ImageSource";
import {
  BUILDING_BLOCKS,
  dragLabel,
  isAssetLabel,
  readAssetDrag,
  readBlockDrag,
} from "../../data/buildingBlocks";
import {
  BAND_ELEMENTS,
  bandHeight,
  bandImage,
  elementAsset,
  resolveFill,
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

/** Which building blocks a band slot will take, by their lowercased labels. */
const BAND_DROPPABLE = new Set(
  BUILDING_BLOCKS.filter((b) => b.band).map((b) => b.label.toLowerCase())
);

/** The four TLP ratings, in the order the standard lists them. */
const TLP_RATINGS: { label: string; text: string; tone: "clear" | "green" | "amber" | "red" }[] = [
  { label: "TLP: CLEAR", text: "TLP: CLEAR", tone: "clear" },
  { label: "TLP: GREEN", text: "TLP: GREEN", tone: "green" },
  { label: "TLP: AMBER", text: "TLP: AMBER", tone: "amber" },
  { label: "TLP: RED", text: "TLP: RED", tone: "red" },
];

export function PageBandEditor({
  kind,
  band,
  brand,
  mode,
  active,
  onActivate,
  onChange,
  objects,
  tagLabel,
  onTagMenu,
  always,
  design,
}: {
  kind: "header" | "footer";
  band: PageBand;
  brand?: Brand;
  mode: BandMode;
  /**
   * Version I: the band inside the style designer, where all of it can be
   * changed. On a page only its TLP badge can.
   */
  design?: boolean;
  /**
   * Version C: the band is a saved object of its own, edited on the report.
   * Its toolbar is the Figma "Beginner's Flow" one (Background, Cover only),
   * and its tag carries the object's name and a menu.
   */
  objects?: boolean;
  /** The name on the tag while the band is selected (Version C). */
  tagLabel?: string;
  /** Opens the object's menu from the tag's "···" (Version C). */
  onTagMenu?: (anchor: HTMLElement) => void;
  /** Draw the band even when it only has a colour (thumbnails). */
  always?: boolean;
  /** The band being worked on — outlined in accent and labelled to match. */
  active?: boolean;
  onActivate?: () => void;
  onChange: (b: PageBand) => void;
}) {
  /* Version G: on a report or template the band is one of Feedly's layouts,
     with nothing to arrange; only its labels and TLP badge change. */
  if (objects && !(design && !band.layout))
    return (
      <LayoutBand
        design={design}
        kind={kind}
        band={band}
        brand={brand}
        mode={mode}
        active={active}
        onActivate={onActivate}
        onChange={onChange}
        tagLabel={tagLabel}
      />
    );
  return (
    <SlotBandEditor
      kind={kind}
      band={band}
      brand={brand}
      mode={mode}
      active={active}
      onActivate={onActivate}
      onChange={onChange}
      objects={objects}
      tagLabel={tagLabel}
      onTagMenu={onTagMenu}
      always={always}
    />
  );
}

/** Version G: a layout band on the page, selectable, with its tag. */
function LayoutBand({
  kind,
  band,
  brand,
  mode,
  active,
  onActivate,
  onChange,
  tagLabel,
  design,
}: {
  design?: boolean;
  kind: "header" | "footer";
  band: PageBand;
  brand?: Brand;
  mode: BandMode;
  active?: boolean;
  onActivate?: () => void;
  onChange: (b: PageBand) => void;
  tagLabel?: string;
}) {
  const slots = isSlotBand(band);
  const has = Boolean(band.layout) || slots;
  const word = kind === "header" ? "header" : "footer";
  /* Version I: on a page the band is picked, not edited. Hovering it offers
     "Add header" (none yet) or "Change header"; only the TLP badge changes
     in place. In the style designer, everything does. */
  const pickable = mode !== "plain" && !design;
  return (
    <div
      className={`band-wrap ${kind} ${mode} ${active ? "active" : ""} objects lo-wrap ${has ? "" : "lo-empty"} ${pickable ? "pickable" : ""}`}
      onClick={mode === "plain" ? undefined : onActivate}
    >
      <div className="band lo-band">
        {band.layout ? (
          <LayoutView
            kind={kind}
            band={band}
            brand={brand}
            edit={design ? mode === "edit" : pickable ? "tlp" : false}
            onChange={onChange}
          />
        ) : slots ? (
          <StaticSlotBand kind={kind} band={band} brand={brand} />
        ) : null}
        {pickable && (
          <span className="lo-pick">
            <span className="btn sm lo-pick-btn">
              {has ? null : <Icon name="plus" size={16} />}
              {has ? `Change ${word}` : `Add ${word}`}
            </span>
          </span>
        )}
      </div>
      {design && (
        <span className="band-tag">
          {tagLabel ?? (kind === "header" ? "Header" : "Footer")}
          <span className="bt-scope"> · {band.scope === "all" ? "All pages" : "Cover only"}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Version I: a band built from blank, drawn as it is, with nothing to change.
 * It is changed in the style designer.
 */
export function StaticSlotBand({
  kind,
  band,
  brand,
}: {
  kind: "header" | "footer";
  band: PageBand;
  brand?: Brand;
}) {
  const image = bandImage(band, brand);
  return (
    <div
      className={`lo lo-slots ${kind}`}
      style={{
        height: bandHeight(band, brand),
        background: image ? `${resolveFill(band.background, brand)} url("${image}") center / cover no-repeat` : resolveFill(band.background, brand),
      }}
    >
      {SLOTS.map((slot) => (
        <div className={`band-slot ${slot}`} key={slot}>
          {band[slot] && (
            <BandElementView
              el={band[slot]!}
              brand={brand}
              editable={false}
              onChange={() => {}}
              onRemove={() => {}}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SlotBandEditor({
  kind,
  band,
  brand,
  mode,
  active,
  onActivate,
  onChange,
  objects,
  tagLabel,
  onTagMenu,
  always,
}: {
  kind: "header" | "footer";
  band: PageBand;
  brand?: Brand;
  mode: BandMode;
  objects?: boolean;
  tagLabel?: string;
  onTagMenu?: (anchor: HTMLElement) => void;
  always?: boolean;
  active?: boolean;
  onActivate?: () => void;
  onChange: (b: PageBand) => void;
}) {
  const editable = mode === "edit";
  const [menuFor, setMenuFor] = useState<SlotKey | null>(null);
  /* The slot whose element was just placed, so that element can open its own
     picker the moment it appears. */
  const [justPlaced, setJustPlaced] = useState<SlotKey | null>(null);
  /* The slot a dragged block is currently over, so the target says so. */
  const [dropSlot, setDropSlot] = useState<SlotKey | null>(null);
  /* Whether a brand asset is over the band's open space, to become its
     background rather than a slot's element. */
  const [bgDrop, setBgDrop] = useState(false);
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
  const [bgPanel, setBgPanel] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Deselecting a band takes its toolbar away, so its menus go with it. */
  useEffect(() => {
    if (!active) {
      setScopeOpen(false);
      setBgOpen(false);
      setBgPanel(false);
    }
  }, [active]);

  const image = bandImage(band, brand);
  const filled = SLOTS.some((s) => band[s]);
  /* An empty band in the report is nothing at all — the slots and their dashed
     outlines are an editing affordance, not part of the document. */
  if (mode === "plain" && !filled && !image && !always) return null;

  const set = (patch: Partial<PageBand>) => onChange({ ...band, ...patch });
  const setSlot = (slot: SlotKey, el: BandElement | null) => onChange({ ...band, [slot]: el });

  /** Puts a dropped block or asset into a slot. */
  const dropInto = (slot: SlotKey, e: React.DragEvent) => {
    const assetId = readAssetDrag(e.dataTransfer);
    if (assetId) {
      e.preventDefault();
      onActivate?.();
      setSlot(slot, { kind: "asset", assetId });
      return;
    }
    const block = readBlockDrag(e.dataTransfer);
    if (!block?.band) return;
    e.preventDefault();
    onActivate?.();
    setSlot(slot, newElement(block.band));
    setJustPlaced(slot);
  };

  return (
    <div
      ref={wrapRef}
      className={`band-wrap ${kind} ${mode} ${active ? "active" : ""} ${objects ? "objects" : ""}`}
      onClick={mode === "plain" ? undefined : onActivate}
    >
      {/* The toolbar belongs to the band you are editing, not to both at once,
          so it only appears once this band is selected. */}
      {editable && active && objects && (
        <ObjectsToolbar
          bandRef={wrapRef}
          kind={kind}
          band={band}
          hasImage={Boolean(image)}
          scopeRef={scopeRef}
          bgRef={bgRef}
          onScope={() => setScopeOpen((o) => !o)}
          onBackground={() => setBgPanel((o) => !o)}
          bandBrand={brand}
        />
      )}
      {editable && active && !objects && (
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
        className={`band ${image ? "has-image" : ""} ${bgDrop ? "bg-drop" : ""}`}
        onDragOver={(e) => {
          if (!editable || !isAssetLabel(dragLabel(e.dataTransfer))) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropSlot(null);
          setBgDrop(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setBgDrop(false);
          setDropSlot(null);
        }}
        onDrop={(e) => {
          setBgDrop(false);
          setDropSlot(null);
          if (!editable) return;
          const assetId = readAssetDrag(e.dataTransfer);
          if (!assetId) return;
          e.preventDefault();
          onActivate?.();
          /* The same thing the background dialog does when an asset is picked
             there: the band shows the brand's asset, by id, so it follows the
             brand if the template changes brand. */
          set({ image: null, imageAsset: assetId });
        }}
        style={{
          background: image
            ? `${resolveFill(band.background, brand)} url("${image}") center / cover no-repeat`
            : resolveFill(band.background, brand),
        }}
      >
        {SLOTS.map((slot) => (
          /* Two drop targets per slot. The slot's own box — its element, or
             its empty "+" — takes whatever it is given, a brand asset
             included. The rest of the slot's column takes the ordinary blocks
             too, so a heading dropped a little wide of a box still lands. A
             brand asset dropped in that open space is not the slot's: it
             falls through to the band itself and becomes the background. */
          <div
            className={`band-slot ${slot} ${dropSlot === slot ? "drop-over" : ""}`}
            key={slot}
            onDragOver={(e) => {
              const label = dragLabel(e.dataTransfer);
              if (!editable || label === null || isAssetLabel(label)) return;
              /* Only the blocks a band can hold. The rest get the browser's own
                 "cannot drop here" cursor, which is the honest answer. */
              if (label && !BAND_DROPPABLE.has(label)) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
              setBgDrop(false);
              setDropSlot(slot);
            }}
            onDrop={(e) => {
              if (!editable || readAssetDrag(e.dataTransfer)) return;
              e.stopPropagation();
              setDropSlot(null);
              dropInto(slot, e);
            }}
          >
            <div
              className={`slot-drop ${dropSlot === slot ? "over" : ""}`}
              onDragOver={(e) => {
                const label = dragLabel(e.dataTransfer);
                if (!editable || label === null) return;
                if (label && !BAND_DROPPABLE.has(label) && !isAssetLabel(label)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                setBgDrop(false);
                setDropSlot(slot);
              }}
              onDrop={(e) => {
                if (!editable) return;
                e.stopPropagation();
                setDropSlot(null);
                setBgDrop(false);
                dropInto(slot, e);
              }}
            >
              {band[slot] ? (
                <BandElementView
                  el={band[slot]!}
                  brand={brand}
                  editable={editable}
                  autoOpen={justPlaced === slot}
                  onAutoOpened={() => setJustPlaced(null)}
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
          </div>
        ))}
        {/* Once a band has a background image, a small x in its top-right
            corner takes it off again. The band keeps its colour. */}
        {editable && image && !bgDrop && (
          <button
            className="band-bg-remove"
            title="Remove background image"
            aria-label="Remove background image"
            onClick={(e) => {
              e.stopPropagation();
              onActivate?.();
              set({ image: null, imageAsset: undefined });
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
        {bgDrop && (
          <span className="band-bg-hint">
            <Icon name="image" size={16} />
            Set as background
          </span>
        )}
      </div>

      {/* Version C: the band's inner edge (the bottom of a header, the top of
          a footer) drags to resize it. */}
      {editable && objects && (
        <BandResizer
          kind={kind}
          wrapRef={wrapRef}
          onResize={(h) => {
            onActivate?.();
            set({ height: h });
          }}
        />
      )}

      {mode !== "plain" && (
        <span className="band-tag">
          {objects && active && tagLabel ? tagLabel : kind === "header" ? "Header" : "Footer"}
          {band.scope === "all" && <span className="bt-scope"> · All pages</span>}
          {objects && active && onTagMenu && (
            <button
              className="bt-menu"
              title="More"
              onClick={(e) => {
                e.stopPropagation();
                onTagMenu(e.currentTarget);
              }}
            >
              <Icon name="ellipsis" size={14} />
            </button>
          )}
        </span>
      )}

      {bgPanel && (
        <BackgroundPopover
          anchorRef={bgRef}
          band={band}
          brand={brand}
          onClose={() => setBgPanel(false)}
          onChange={(patch) => set(patch)}
        />
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
                setJustPlaced(menuFor);
                setMenuFor(null);
              }}
            >
              {e.label}
            </MenuItem>
          ))}
          {/* The brand's own assets, under the palette glyph that marks
              anything coming from a brand. Whatever is uploaded to the brand
              in the Org Profile shows up here. */}
          {brand && brand.assets.length > 0 && (
            <>
              <div className="menu-sep" />
              {brand.assets.map((a) => (
                <MenuItem
                  key={a.id}
                  icon="brand"
                  onClick={() => {
                    setSlot(menuFor, { kind: "asset", assetId: a.id });
                    setMenuFor(null);
                  }}
                >
                  {a.name}
                </MenuItem>
              ))}
            </>
          )}
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

/**
 * Version C's toolbar (Figma "Beginner's Flow" 4–7): the band's background,
 * colour or image, behind one button, and which pages the band runs on.
 */
function ObjectsToolbar({
  bandRef,
  kind,
  band,
  hasImage,
  scopeRef,
  bgRef,
  onScope,
  onBackground,
  bandBrand,
}: {
  bandBrand?: Brand;
  bandRef: React.RefObject<HTMLDivElement | null>;
  kind: "header" | "footer";
  band: PageBand;
  hasImage: boolean;
  scopeRef: React.RefObject<HTMLButtonElement | null>;
  bgRef: React.RefObject<HTMLButtonElement | null>;
  onScope: () => void;
  onBackground: () => void;
}) {
  /* It floats over everything, the editor's top bar included, so it is drawn
     at the window's level and follows the band as the page scrolls: 4px
     above the header, 4px below the footer. */
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    let raf = 0;
    const place = () => {
      const b = bandRef.current?.querySelector(".band")?.getBoundingClientRect();
      const t = ref.current;
      if (b && t) {
        const left = b.left + b.width / 2 - t.offsetWidth / 2;
        const top = kind === "header" ? b.top - t.offsetHeight - 4 : b.bottom + 4;
        setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [bandRef, kind]);

  return createPortal(
    <div
      ref={ref}
      className={`band-toolbar objects floating ${kind}`}
      style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button ref={bgRef} className="btb-btn label" onClick={onBackground}>
        {hasImage ? (
          <Icon name="image" size={16} />
        ) : (
          <span
            className={`btb-swatch sm ${band.background === "transparent" ? "transparent" : ""}`}
            style={band.background === "transparent" ? undefined : { background: resolveFill(band.background, bandBrand) }}
          />
        )}
        Background
        <Icon name="chevron-down" size={14} />
      </button>
      <span className="btb-div" />
      <button ref={scopeRef} className="btb-btn label" onClick={onScope}>
        {band.scope === "cover" ? "Cover only" : "All pages"}
        <Icon name="chevron-down" size={14} />
      </button>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ *
 * One element in a slot
 * ------------------------------------------------------------------ */

function BandElementView({
  el,
  brand,
  editable,
  autoOpen,
  onAutoOpened,
  onChange,
  onRemove,
}: {
  el: BandElement;
  brand?: Brand;
  editable: boolean;
  /** Freshly placed from the slot menu, so its own picker opens straight away. */
  autoOpen?: boolean;
  onAutoOpened?: () => void;
  onChange: (el: BandElement) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const tlpRef = useRef<HTMLButtonElement>(null);
  /* Version C: an image slot picks from an upload or the brand's assets. */
  const imgRef = useRef<HTMLButtonElement>(null);
  const [imgPick, setImgPick] = useState(false);
  const [tlpMenu, setTlpMenu] = useState(false);

  /* A TLP badge is one of four ratings, so placing one asks which straight
     away rather than leaving a badge that says the wrong thing. */
  useEffect(() => {
    if (autoOpen && el.kind === "tlp" && editable) {
      setTlpMenu(true);
      onAutoOpened?.();
    }
  }, [autoOpen, el.kind, editable, onAutoOpened]);

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
      case "logo":
      case "asset": {
        /* Resolved from whichever brand is selected now, so swapping brand
           swaps the image in place. An asset the new brand does not carry
           says so rather than leaving an empty gap in the band. */
        const asset = elementAsset(el, brand);
        return asset ? (
          <img className="be-logo" src={asset.src} alt={asset.name} />
        ) : (
          <span className="be-placeholder">
            <Icon name="brand" size={16} />
            {brand ? "Not in this brand" : "No brand selected"}
          </span>
        );
      }

      case "image":
        return el.src ? (
          <img className="be-image" src={el.src} alt="" />
        ) : (
          <button
            ref={imgRef}
            className="be-placeholder as-button"
            onClick={(e) => {
              e.stopPropagation();
              setImgPick((o) => !o);
            }}
          >
            <Icon name="image" size={16} /> Add image
          </button>
        );

      case "pageCount":
        /* A page number cannot be known here, so the element shows the token it
           will be replaced by, which is what the design does. */
        return <span className="be-page">#</span>;

      case "tlp":
        /* The rating is picked from the menu above the badge rather than typed,
           because TLP is a fixed four-value scale, not free text. */
        return (
          <button
            ref={tlpRef}
            type="button"
            className={`be-tlp ${editable ? "pickable" : ""}`}
            style={{
              background: tlpTone(el.text, brand ?? FALLBACK_BRAND),
              color: brand?.colors.tlp ?? "var(--content-bold)",
            }}
            disabled={!editable}
            title={editable ? "Change the TLP rating" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              setTlpMenu((o) => !o);
            }}
          >
            {el.text}
          </button>
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
      {tlpMenu && (
        <Popover
          anchorRef={tlpRef}
          onClose={() => setTlpMenu(false)}
          placement="top"
          width={168}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {TLP_RATINGS.map((r) => (
              <MenuItem
                key={r.text}
                icon={el.text === r.text ? "check" : undefined}
                onClick={() => {
                  onChange({ ...el, text: r.text });
                  setTlpMenu(false);
                }}
              >
                <span className="tlp-opt">
                  <span
                    className="tlp-dot"
                    style={{ background: (brand ?? FALLBACK_BRAND).tlp[r.tone] }}
                  />
                  {r.label}
                </span>
              </MenuItem>
            ))}
          </div>
        </Popover>
      )}
      {el.kind === "image" && imgPick && (
        <Popover anchorRef={imgRef} onClose={() => setImgPick(false)} width={264} className="menu bgp">
          <div className="bgp-body">
            <ImageSource
              brand={brand}
              onFile={(src) => {
                onChange({ ...el, src });
                setImgPick(false);
              }}
              onAsset={(a) => {
                onChange({ ...el, src: a.src });
                setImgPick(false);
              }}
            />
          </div>
        </Popover>
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
      {src && <img className="bg-preview" src={src} alt="" />}
      {/* Version C: drag and drop or upload, then the brand's assets. */}
      <ImageSource
        brand={brand}
        selectedAssetId={assetId ?? undefined}
        onFile={(data) => {
          setAssetId(null);
          setSrc(data);
        }}
        onAsset={(a) => {
          setAssetId(a.id);
          setSrc(a.src);
        }}
      />
      <div className="field-help" style={{ marginTop: 8 }}>
        Use a 1200px width image for best results. Supported files PNG, JPG, GIF, 1 MB max.
      </div>
    </Modal>
  );
}

/** The drag handle along a band's inner edge. */
function BandResizer({
  kind,
  wrapRef,
  onResize,
}: {
  kind: "header" | "footer";
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onResize: (h: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`band-resize ${kind} ${dragging ? "dragging" : ""}`}
      title="Drag to resize"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        const bandEl = wrapRef.current?.querySelector(".band") as HTMLElement | null;
        if (!bandEl) return;
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startH = bandEl.getBoundingClientRect().height;
        setDragging(true);
        const move = (ev: PointerEvent) => {
          const dy = ev.clientY - startY;
          const h = kind === "header" ? startH + dy : startH - dy;
          onResize(Math.round(Math.min(280, Math.max(40, h))));
        };
        const up = () => {
          setDragging(false);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
      }}
    />
  );
}
