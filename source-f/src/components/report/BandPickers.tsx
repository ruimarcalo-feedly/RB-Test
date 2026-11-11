import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { Button, Modal, Popover } from "../ui/primitives";
import { useStore } from "../../state/store";
import { EMPTY_BAND, type BandElement, type Brand, type PageBand } from "../../data/brand";
import {
  presetsFor,
  tint,
  type BandKind,
  type BandPreset,
  type SavedBand,
} from "../../data/bandObjects";
import { BandLibraryModal, BandThumb, type ReportBand } from "./BandObjects";

/* ------------------------------------------------------------------ *
 * Version F — five ways to pick a header or footer, side by side
 *
 * Each follows a product that does the same job:
 * - Gallery (Flodesk, Wix, Squarespace): a large modal, shelves on the left,
 *   previews drawn with the brand on the right.
 * - Quick list (Salesforce "Change layout"): a compact modal of thin strips,
 *   pick one and Apply.
 * - Sidebar (Klaviyo "Pre-built / Universal"): the picker takes over the
 *   Design tab, with Presets and Saved tabs, and stays open while you flip.
 * - On page (Mailchimp sites "Layout"): select the band on the page and a
 *   "Layouts" button beside it opens the choices right there.
 * - Builder (Linktree "Design"): no presets at all; a few options compose
 *   the band (where the logo goes, what sits beside it, the background).
 * The switcher at the bottom right moves between them.
 * ------------------------------------------------------------------ */

export type PickerMode = "styles" | "gallery" | "quick" | "sidebar" | "canvas" | "builder";

export const PICKER_MODES: { id: PickerMode; label: string; from: string }[] = [
  { id: "styles", label: "Styles modal", from: "Version C" },
  { id: "gallery", label: "Gallery", from: "Flodesk, Wix" },
  { id: "quick", label: "Quick list", from: "Salesforce" },
  { id: "sidebar", label: "Sidebar", from: "Klaviyo" },
  { id: "canvas", label: "On page", from: "Mailchimp" },
  { id: "builder", label: "Builder", from: "Linktree" },
];

const KEY = "rbPickerMode";
const EVT = "rb-picker-mode";
const read = (): PickerMode => {
  try {
    const v = localStorage.getItem(KEY) as PickerMode | null;
    if (v && PICKER_MODES.some((m) => m.id === v)) return v;
  } catch {
    /* storage blocked: fall back to the default */
  }
  return "gallery";
};

/** The picker in use, shared by every part of the editor that shows one. */
export function usePickerMode(): [PickerMode, (m: PickerMode) => void] {
  const [mode, setMode] = useState<PickerMode>(read);
  useEffect(() => {
    const on = () => setMode(read());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return [
    mode,
    (m: PickerMode) => {
      try {
        localStorage.setItem(KEY, m);
      } catch {
        /* ignore */
      }
      setMode(m);
      window.dispatchEvent(new Event(EVT));
    },
  ];
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The prototype's switcher, pinned to the bottom right of the editor. */
export function PickerSwitcher() {
  const [mode, setMode] = usePickerMode();
  const [open, setOpen] = useState(true);
  if (!open)
    return (
      <button className="bp-switch-min" onClick={() => setOpen(true)} title="Header picker">
        <Icon name="wand" size={16} />
        Picker: {PICKER_MODES.find((m) => m.id === mode)?.label}
      </button>
    );
  return (
    <div className="bp-switch">
      <div className="bp-switch-head">
        <span>Header &amp; footer picker</span>
        <button className="bp-switch-x" onClick={() => setOpen(false)} title="Minimize">
          <Icon name="chevron-down" size={14} />
        </button>
      </div>
      <div className="bp-switch-opts">
        {PICKER_MODES.map((m) => (
          <button
            key={m.id}
            className={`bp-switch-opt ${mode === m.id ? "on" : ""}`}
            onClick={() => setMode(m.id)}
          >
            <span className="bp-switch-label">{m.label}</span>
            <span className="bp-switch-from">{m.from}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Choice = { type: "saved"; b: SavedBand } | { type: "preset"; p: BandPreset } | { type: "blank" };

/** What a choice puts on the page, and whether it is what is there now. */
function useChoices(rb: ReportBand, brand?: Brand) {
  const { toast } = useStore();
  const k = rb.kind;
  const presets = presetsFor(k);
  const bandOf = (c: Choice): PageBand =>
    c.type === "saved" ? c.b.band : c.type === "preset" ? c.p.make(brand) : EMPTY_BAND;
  const isOn = (c: Choice) =>
    c.type === "saved"
      ? rb.saved?.id === c.b.id
      : c.type === "preset"
        ? !rb.saved && rb.presetName === c.p.name
        : !rb.saved && rb.empty;
  const pick = (c: Choice, quiet?: boolean) => {
    if (c.type === "saved") {
      rb.apply(c.b);
      if (!quiet) toast(`“${c.b.name}” applied`);
    } else if (c.type === "preset") {
      rb.applyPreset(c.p);
      if (!quiet) toast(`“${c.p.name}” applied. Save it to keep it in ${brand?.name ?? "the brand"}`);
    } else rb.apply(null);
  };
  const nameOf = (c: Choice) =>
    c.type === "saved" ? c.b.name : c.type === "preset" ? c.p.name : `Blank ${k}`;
  const keyOf = (c: Choice) =>
    c.type === "saved" ? `s-${c.b.id}` : c.type === "preset" ? `p-${c.p.id}` : "blank";
  return { k, presets, bandOf, isOn, pick, nameOf, keyOf };
}

/* ---------------- Gallery (Flodesk / Wix / Squarespace) ---------------- */

function GalleryModal({
  rb,
  brand,
  onClose,
  onScratch,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  onScratch?: () => void;
}) {
  const { k, presets, isOn, pick } = useChoices(rb, brand);
  const groups = Array.from(new Set(presets.map((p) => p.group)));
  const [shelf, setShelf] = useState<string>(rb.library.length ? "saved" : "all");
  const shown: Choice[] =
    shelf === "saved"
      ? rb.library.map((b) => ({ type: "saved" as const, b }))
      : presets
          .filter((p) => shelf === "all" || p.group === shelf)
          .map((p) => ({ type: "preset" as const, p }));
  return (
    <Modal title={`Choose a ${k}`} width={920} onClose={onClose} className="bp-gallery">
      <div className="bp-gal">
        <nav className="bp-gal-nav">
          <button
            className="bp-gal-blank"
            onClick={() => {
              pick({ type: "blank" });
              onClose();
              onScratch?.();
            }}
          >
            <Icon name="plus" size={14} />
            Blank {k}
          </button>
          {rb.library.length > 0 && (
            <>
              <div className="bp-gal-cap">Saved</div>
              <button
                className={`bp-gal-item ${shelf === "saved" ? "on" : ""}`}
                onClick={() => setShelf("saved")}
              >
                In {brand?.name ?? "this brand"}
                <span className="bp-gal-count">{rb.library.length}</span>
              </button>
            </>
          )}
          <div className="bp-gal-cap">Presets</div>
          <button
            className={`bp-gal-item ${shelf === "all" ? "on" : ""}`}
            onClick={() => setShelf("all")}
          >
            All presets
          </button>
          {groups.map((g) => (
            <button
              key={g}
              className={`bp-gal-item ${shelf === g ? "on" : ""}`}
              onClick={() => setShelf(g)}
            >
              {g}
            </button>
          ))}
        </nav>
        <div className="bp-gal-grid">
          {shown.map((c) => {
            const name = c.type === "saved" ? c.b.name : c.type === "preset" ? c.p.name : "";
            const band = c.type === "saved" ? c.b.band : c.type === "preset" ? c.p.make(brand) : EMPTY_BAND;
            return (
              <button
                key={c.type === "saved" ? c.b.id : c.type === "preset" ? c.p.id : "b"}
                className={`bp-gal-card ${isOn(c) ? "on" : ""}`}
                onClick={() => {
                  pick(c);
                  onClose();
                }}
              >
                <BandThumb band={band} kind={k} brand={brand} context />
                <span className="bp-gal-name">
                  {name}
                  {isOn(c) && <span className="bobj-applied">Applied</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Quick list (Salesforce "Change layout") ---------------- */

function StripList({
  rb,
  brand,
  selected,
  onSelect,
}: {
  rb: ReportBand;
  brand?: Brand;
  selected: string | null;
  onSelect: (c: Choice) => void;
}) {
  const { k, presets, bandOf, nameOf, keyOf } = useChoices(rb, brand);
  const row = (c: Choice) => {
    const key = keyOf(c);
    return (
      <button
        key={key}
        className={`bp-strip ${selected === key ? "on" : ""}`}
        onClick={() => onSelect(c)}
      >
        <span className="bp-strip-band">
          {c.type === "blank" ? (
            <span className="bp-strip-blank">
              <Icon name="plus" size={14} /> Start from scratch
            </span>
          ) : (
            <BandThumb band={bandOf(c)} kind={k} brand={brand} />
          )}
        </span>
        <span className="bp-strip-name">{c.type === "blank" ? "Blank" : nameOf(c)}</span>
        {selected === key && (
          <span className="bp-strip-tick">
            <Icon name="check" size={12} />
          </span>
        )}
      </button>
    );
  };
  return (
    <div className="bp-strips">
      {rb.library.length > 0 && (
        <>
          <div className="bp-cap">Saved in {brand?.name ?? "this brand"}</div>
          {rb.library.map((b) => row({ type: "saved", b }))}
        </>
      )}
      <div className="bp-cap">Presets</div>
      {row({ type: "blank" })}
      {presets.map((p) => row({ type: "preset", p }))}
    </div>
  );
}

function QuickModal({
  rb,
  brand,
  onClose,
  onScratch,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  onScratch?: () => void;
}) {
  const { k, presets, isOn, pick, keyOf } = useChoices(rb, brand);
  const all: Choice[] = [
    ...rb.library.map((b) => ({ type: "saved" as const, b })),
    { type: "blank" as const },
    ...presets.map((p) => ({ type: "preset" as const, p })),
  ];
  const current = all.find(isOn);
  const [sel, setSel] = useState<Choice | null>(current ?? null);
  const selKey = sel ? keyOf(sel) : null;
  return (
    <Modal
      title={`Change ${k} layout`}
      width={560}
      onClose={onClose}
      className="bp-quick"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!sel || (current !== undefined && keyOf(current) === selKey)}
            onClick={() => {
              if (!sel) return;
              pick(sel);
              onClose();
              if (sel.type === "blank") onScratch?.();
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <StripList rb={rb} brand={brand} selected={selKey} onSelect={setSel} />
    </Modal>
  );
}

/* ---------------- Sidebar (Klaviyo "Pre-built / Universal") ---------------- */

function SidebarPanel({
  rb,
  brand,
  onClose,
  onScratch,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  onScratch?: () => void;
}) {
  const { k, presets, isOn, pick, bandOf, nameOf, keyOf } = useChoices(rb, brand);
  const [tab, setTab] = useState<"presets" | "saved">(rb.library.length ? "saved" : "presets");
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>(".editor-side"));
  }, []);
  if (!host) return null;
  const list: Choice[] =
    tab === "saved"
      ? rb.library.map((b) => ({ type: "saved" as const, b }))
      : presets.map((p) => ({ type: "preset" as const, p }));
  return createPortal(
    <div className="bp-side">
      <div className="bp-side-head">
        <button className="btn ghost icon sm" title="Back" onClick={onClose}>
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="bp-side-title">{cap(k)}</span>
        <Button size="sm" variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
      <div className="tabs bp-side-tabs">
        <button className={`tab ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
          Saved{rb.library.length ? ` (${rb.library.length})` : ""}
        </button>
        <button
          className={`tab ${tab === "presets" ? "active" : ""}`}
          onClick={() => setTab("presets")}
        >
          Presets
        </button>
      </div>
      <div className="bp-side-body">
        <button
          className="bobj-scratch"
          onClick={() => {
            pick({ type: "blank" });
            onClose();
            onScratch?.();
          }}
        >
          <Icon name="plus" size={16} />
          Start from scratch
        </button>
        {tab === "saved" && !rb.library.length && (
          <p className="t-body3 muted bp-side-empty">
            Nothing saved in {brand?.name ?? "this brand"} yet. Pick a preset, then Save to keep it.
          </p>
        )}
        {list.map((c) => (
          <button
            key={keyOf(c)}
            className={`bp-side-card ${isOn(c) ? "on" : ""}`}
            onClick={() => pick(c, true)}
          >
            <BandThumb band={bandOf(c)} kind={k} brand={brand} />
            <span className="bp-side-name">
              {nameOf(c)}
              {isOn(c) && <span className="bobj-applied">Applied</span>}
            </span>
          </button>
        ))}
      </div>
    </div>,
    host
  );
}

/* ---------------- On page (Mailchimp "Layout") ---------------- */

/** The band on the page (not one of the thumbnails drawn of it). */
function pageBand(k: BandKind): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`.band-wrap.${k}`));
  return all.find((el) => !el.closest(".bobj-thumb-in, .modal, .bp-side")) ?? null;
}

/** Follows the band as the page scrolls. */
function useBandRect(k: BandKind) {
  const [r, setR] = useState<DOMRect | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = pageBand(k);
      const n = el?.getBoundingClientRect() ?? null;
      setR((o) =>
        o && n && o.top === n.top && o.left === n.left && o.width === n.width && o.height === n.height
          ? o
          : n
      );
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [k]);
  return r;
}

/** "Layouts" beside the selected band, as Mailchimp's site editor has it. */
export function CanvasChip({ kind, onOpen }: { kind: BandKind; onOpen: () => void }) {
  const r = useBandRect(kind);
  if (!r) return null;
  const style: CSSProperties =
    kind === "header"
      ? { position: "fixed", left: r.left + 8, top: r.bottom + 8 }
      : { position: "fixed", left: r.left + 8, top: r.top - 40 };
  return createPortal(
    <div className="bp-chip bp-keep" style={style}>
      <button className="bp-chip-btn" onClick={onOpen}>
        <Icon name="details" size={14} />
        Layouts
      </button>
    </div>,
    document.body
  );
}

function CanvasPopover({
  rb,
  brand,
  onClose,
  onScratch,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  onScratch?: () => void;
}) {
  const { k, isOn, pick, keyOf } = useChoices(rb, brand);
  const anchor = useRef<HTMLElement | null>(null);
  const r = useBandRect(k);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    /* An invisible anchor at the band's corner, so the shared Popover places it. */
    const a = document.createElement("div");
    a.className = "bp-anchor";
    document.body.appendChild(a);
    anchor.current = a;
    setReady(true);
    return () => a.remove();
  }, []);
  if (anchor.current && r) {
    Object.assign(anchor.current.style, {
      position: "fixed",
      left: `${r.left + 8}px`,
      top: k === "header" ? `${r.bottom + 4}px` : `${r.top - 4}px`,
      width: "1px",
      height: "1px",
    });
  }
  const all: Choice[] = [
    ...rb.library.map((b) => ({ type: "saved" as const, b })),
    { type: "blank" as const },
    ...presetsFor(k).map((p) => ({ type: "preset" as const, p })),
  ];
  const cur = all.find(isOn);
  if (!ready || !r) return null;
  return (
    <Popover
      anchorRef={anchor}
      onClose={onClose}
      width={360}
      className="menu bp-pop"
      placement={k === "header" ? "bottom" : "top"}
    >
      <div className="bp-pop-head">{cap(k)} layouts</div>
      <div className="bp-pop-body">
        <StripList
          rb={rb}
          brand={brand}
          selected={cur ? keyOf(cur) : null}
          onSelect={(c) => {
            pick(c, true);
            if (c.type === "blank") {
              onClose();
              onScratch?.();
            }
          }}
        />
      </div>
    </Popover>
  );
}

/* ---------------- Builder (Linktree "Design") ---------------- */

const LOGO: BandElement = { kind: "asset", assetId: "logo" };
const isLogo = (e: BandElement | null) => !!e && (e.kind === "logo" || (e.kind === "asset" && e.assetId === "logo"));
type Slot = "left" | "middle" | "right";

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="bp-seg-row">
      <div className="bp-seg-label">{label}</div>
      <div className="bp-seg">
        {options.map((o) => (
          <button
            key={o.id}
            className={`bp-seg-opt ${value === o.id ? "on" : ""}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type SlotWhat = "none" | "logo" | "title" | "label" | "tlp" | "page";
const whatOf = (e: BandElement | null): SlotWhat => {
  if (!e) return "none";
  if (isLogo(e)) return "logo";
  if (e.kind === "pageCount") return "page";
  if (e.kind === "tlp") return "tlp";
  if (e.kind === "h3" || e.kind === "h4") return "title";
  return "label";
};
const elOf = (w: SlotWhat, prev: BandElement | null): BandElement | null => {
  switch (w) {
    case "none":
      return null;
    case "logo":
      return LOGO;
    case "page":
      return { kind: "pageCount" };
    case "tlp":
      return { kind: "tlp", text: prev?.kind === "tlp" ? prev.text : "TLP: AMBER" };
    case "title":
      return { kind: "h4", text: prev?.kind === "h4" ? prev.text : "Threat Intelligence" };
    case "label":
      return { kind: "paragraph", text: prev?.kind === "paragraph" ? prev.text : "PRIVATE" };
  }
};

/** A few options that compose the band, in place of presets. */
export function BandBuilder({ rb, brand }: { rb: ReportBand; brand?: Brand }) {
  const b = rb.band;
  const k = rb.kind;
  const set = (patch: Partial<PageBand>) => rb.compose({ ...b, ...patch });
  const bg: "none" | "tint" | "image" = b.imageAsset || b.image ? "image" : b.background && b.background !== "transparent" && b.background.toUpperCase() !== "#FFFFFF" ? "tint" : "none";
  const setBg = (v: "none" | "tint" | "image") =>
    set(
      v === "image"
        ? { imageAsset: "hero", image: null, background: "#FFFFFF" }
        : v === "tint"
          ? { imageAsset: undefined, image: null, background: tint(brand) }
          : { imageAsset: undefined, image: null, background: "transparent" }
    );
  const slotOpts = (ids: SlotWhat[]) =>
    ids.map((id) => ({
      id,
      label: { none: "None", logo: "Logo", title: "Title", label: "Label", tlp: "TLP", page: "Page no." }[id],
    }));
  const setSlot = (s: Slot, w: SlotWhat) => set({ [s]: elOf(w, b[s]) } as Partial<PageBand>);

  if (k === "header") {
    const logoAt: "none" | Slot = isLogo(b.left) ? "left" : isLogo(b.middle) ? "middle" : isLogo(b.right) ? "right" : "none";
    /* The other thing in the header: whatever sits in a slot the logo is not in. */
    const otherSlot: Slot = logoAt === "right" ? "left" : "right";
    const other = whatOf(logoAt === "middle" ? b.right : b[otherSlot]);
    const moveLogo = (to: "none" | Slot) => {
      const keep = logoAt === "middle" ? b.right : b[otherSlot];
      const next: Partial<PageBand> = { left: null, middle: null, right: null };
      if (to !== "none") next[to] = LOGO;
      const keepAt: Slot = to === "right" ? "left" : "right";
      if (keep && !isLogo(keep)) next[keepAt] = keep;
      set(next);
    };
    return (
      <div className="bp-build">
        <Seg
          label="Logo"
          value={logoAt}
          options={[
            { id: "none", label: "None" },
            { id: "left", label: "Left" },
            { id: "middle", label: "Center" },
            { id: "right", label: "Right" },
          ]}
          onChange={moveLogo}
        />
        <Seg
          label={logoAt === "none" ? "Content" : "Beside the logo"}
          value={other === "logo" ? "none" : other}
          options={slotOpts(["none", "title", "tlp", "label"])}
          onChange={(w) => setSlot(logoAt === "right" ? "left" : "right", w)}
        />
        <Seg
          label="Background"
          value={bg}
          options={[
            { id: "none", label: "None" },
            { id: "tint", label: "Tint" },
            { id: "image", label: "Image" },
          ]}
          onChange={setBg}
        />
        <Seg
          label="Shows on"
          value={b.scope}
          options={[
            { id: "cover", label: "Cover only" },
            { id: "all", label: "All pages" },
          ]}
          onChange={(v) => set({ scope: v })}
        />
      </div>
    );
  }
  return (
    <div className="bp-build">
      <Seg label="Left" value={whatOf(b.left)} options={slotOpts(["none", "label", "logo", "tlp"])} onChange={(w) => setSlot("left", w)} />
      <Seg label="Middle" value={whatOf(b.middle)} options={slotOpts(["none", "label", "tlp"])} onChange={(w) => setSlot("middle", w)} />
      <Seg label="Right" value={whatOf(b.right)} options={slotOpts(["none", "page", "logo"])} onChange={(w) => setSlot("right", w)} />
      <Seg
        label="Background"
        value={bg === "image" ? "tint" : bg}
        options={[
          { id: "none", label: "None" },
          { id: "tint", label: "Tint" },
        ]}
        onChange={(v) => setBg(v)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Whichever picker is switched on, for the band being changed. */
export function BandPickerHost({
  mode,
  rb,
  brand,
  onClose,
  onScratch,
}: {
  mode: PickerMode;
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  onScratch?: () => void;
}) {
  const props = { rb, brand, onClose, onScratch };
  switch (mode) {
    case "gallery":
      return <GalleryModal {...props} />;
    case "quick":
    case "builder":
      return <QuickModal {...props} />;
    case "sidebar":
      return <SidebarPanel {...props} />;
    case "canvas":
      return <CanvasPopover {...props} />;
    default:
      return <BandLibraryModal {...props} />;
  }
}

