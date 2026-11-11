import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Modal, Popover, MenuItem } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import { useStore } from "../../state/store";
import { EMPTY_BAND, bandHeight, bandVars, type Brand, type PageBand } from "../../data/brand";
import {
  brandBands,
  nextName,
  presetsFor,
  primaryBand,
  resolveBand,
  sameBand,
  type BandKind,
  type BandPreset,
  type SavedBand,
} from "../../data/bandObjects";

/* ------------------------------------------------------------------ *
 * Version C — header and footer styles, saved in the brand
 *
 * A report's header and footer come from its brand: the template's pinned
 * style if it has one in that brand, or else the brand's primary. Swapping the
 * brand swaps them. Editing one on the report keeps the edits on this report
 * until "Update style" writes them back to the brand (for every report using
 * it) or "Save as new style" adds another style to the brand.
 * ------------------------------------------------------------------ */

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The report's header (or footer), and the brand style it comes from. */
export function useReportBand(kind: BandKind, brand: Brand | undefined, pinId?: string) {
  const { addBrandBand, updateBrandBand, setPrimaryBand, toast } = useStore();
  const library = brandBands(brand, kind);
  const [savedId, setSavedId] = useState<string | null>(
    () => resolveBand(brand, kind, pinId)?.id ?? null
  );
  /** Edits made on this report, until they are saved; null follows the style. */
  const [local, setLocal] = useState<PageBand | null>(null);
  /** The preset the unsaved band started from, which names it until saved. */
  const [presetName, setPresetName] = useState<string | null>(null);
  const savedRef = useRef(savedId);
  savedRef.current = savedId;

  /* A different brand brings its own header. Edits that were never part of a
     style stay put when the new brand has none, so a header built before a
     brand existed can still be saved into the brand created for it. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const next = resolveBand(brand, kind, pinId);
    if (next) {
      setSavedId(next.id);
      setLocal(null);
      setPresetName(null);
    } else {
      const wasStyle = savedRef.current !== null;
      setSavedId(null);
      if (wasStyle) {
        setLocal(null);
        setPresetName(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id]);

  const saved = library.find((b) => b.id === savedId);
  const band = local ?? saved?.band ?? EMPTY_BAND;
  const empty = sameBand(band, EMPTY_BAND);
  const dirty = Boolean(saved) && local !== null && !sameBand(local, saved!.band);
  const primary = Boolean(saved) && primaryBand(brand, kind)?.id === saved!.id;

  return {
    kind,
    brand,
    band,
    setBand: (b: PageBand) => setLocal(b),
    /** Version F builder: a band composed from options, no longer a preset. */
    compose(b: PageBand) {
      setLocal(b);
      setPresetName(null);
    },
    saved,
    name: saved?.name ?? null,
    /** What the band is called: its style, or the preset it started from. */
    label: saved?.name ?? (empty ? null : presetName),
    presetName: saved || empty ? null : presetName,
    dirty,
    empty,
    primary,
    library,
    suggestedName: nextName(
      (!saved && presetName) || `${cap(kind)} style`,
      library.map((b) => b.name)
    ),
    /** "Save as new style": adds this band to the brand under a name. */
    saveNew(name: string, into?: Brand) {
      const target = into ?? brand;
      if (!target) return;
      const taken = brandBands(target, kind).map((b) => b.name);
      const made = addBrandBand(target.id, { kind, name: nextName(name, taken), band });
      setSavedId(made.id);
      setLocal(null);
      setPresetName(null);
      toast(`${cap(kind)} style \u201c${made.name}\u201d saved to ${target.name}`);
    },
    /** "Update style": writes the edits back to the brand, for every report using it. */
    update() {
      if (!brand || !saved || !local) return;
      updateBrandBand(brand.id, saved.id, { band: local });
      setLocal(null);
      toast(`\u201c${saved.name}\u201d updated in ${brand.name}`);
    },
    /** Back to the style as the brand has it. */
    discard() {
      setLocal(null);
    },
    rename(n: string) {
      if (brand && saved) updateBrandBand(brand.id, saved.id, { name: n });
    },
    makePrimary() {
      if (!brand || !saved) return;
      setPrimaryBand(brand.id, kind, saved.id);
      toast(`\u201c${saved.name}\u201d is now ${brand.name}\u2019s default ${kind}`);
    },
    /** Applies one of the brand's styles to this report, or clears it with null. */
    apply(obj: SavedBand | null) {
      setSavedId(obj ? obj.id : null);
      setLocal(obj ? null : EMPTY_BAND);
      setPresetName(null);
    },
    /** Starts from a preset: drawn with this brand, unsaved until saved. */
    applyPreset(p: BandPreset) {
      setSavedId(null);
      setLocal(p.make(brand));
      setPresetName(p.name);
    },
    /** The applied style was deleted: the band stays, as unsaved edits. */
    unlink() {
      setLocal(band);
      setSavedId(null);
    },
  };
}

export type ReportBand = ReturnType<typeof useReportBand>;

/* ------------------------------------------------------------------ */

/**
 * A picture of a band: the band itself drawn at full width, scaled down to
 * fit. It shows a saved header as it was saved, so it only changes once the
 * changes are saved.
 */
export function BandThumb({
  band,
  kind,
  brand,
  context,
}: {
  band: PageBand;
  kind: BandKind;
  brand?: Brand;
  /** Show the band on a bit of page (stand-in lines), as in the styles list. */
  context?: boolean;
}) {
  const vars = bandVars(band, band, brand);
  /* The band drawn at full width, scaled to the card's width and centred in
     the preview area. */
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.32);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    /* Fit the page to the frame (the well's width less its padding). */
    const fit = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setScale(w / 1092);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = bandHeight(band, brand);
  const pageH = context ? h + 220 : h;
  const lines = context && (
    <div className="bobj-ctx" style={kind === "header" ? { top: h + 36 } : { top: 36 }}>
      <span style={{ width: "46%" }} />
      <span style={{ width: "92%" }} />
      <span style={{ width: "84%" }} />
      <span style={{ width: "64%" }} />
    </div>
  );
  return (
    <div ref={box} className={`bobj-thumb-in ${kind} ${context ? "ctx" : ""}`}>
      <div className="bobj-thumb-frame" style={{ height: pageH * scale }}>
        <div
          className="bobj-thumb-page"
          style={{ ...(vars as React.CSSProperties), height: pageH, transform: `scale(${scale})` }}
        >
          {lines}
          <PageBandEditor
            kind={kind}
            band={band}
            brand={brand}
            mode="plain"
            always
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

/** The "···" menu, shared by the Design tab's card and the band's own tag. */
export function BandMenu({
  rb,
  anchorRef,
  onClose,
  onSave,
  onRename,
  onChange,
}: {
  rb: ReportBand;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSave: () => void;
  onRename: () => void;
  onChange: () => void;
}) {
  const { toast } = useStore();
  const run = (f: () => void) => () => {
    onClose();
    f();
  };
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} width={220}>
      {!rb.saved ? (
        /* Saving works whatever state the band is in, a blank one included. */
        <MenuItem onClick={run(onSave)}>
          {rb.brand ? `Save to ${rb.brand.name}` : "Save style"}
        </MenuItem>
      ) : (
        <>
          {rb.dirty && <MenuItem onClick={run(rb.update)}>Update style</MenuItem>}
          {rb.dirty && <MenuItem onClick={run(onSave)}>Save as new style</MenuItem>}
          {rb.dirty && <MenuItem onClick={run(rb.discard)}>Discard changes</MenuItem>}
          <MenuItem onClick={run(onRename)}>Rename style</MenuItem>
          {!rb.primary && <MenuItem onClick={run(rb.makePrimary)}>Set as default</MenuItem>}
        </>
      )}
      <MenuItem onClick={run(onChange)}>Change style</MenuItem>
      {!rb.empty && (
        <>
          <div className="menu-sep" />
          <MenuItem
            tone="danger"
            onClick={run(() => {
              rb.apply(null);
              toast(`${cap(rb.kind)} removed from this report`);
            })}
          >
            Remove from report
          </MenuItem>
        </>
      )}
    </Popover>
  );
}

/**
 * The Header / Footer card inside the Design tab's brand box.
 *
 * - No style applied: an empty state that saves the band into the brand (or,
 *   with no brand yet, starts one), and "Choose style" when the brand has some.
 * - A style applied: its picture as the brand has it and its name. Once edited,
 *   a small "Edited" marker and "Save…", which asks whether to update the
 *   style or save the edits as a new one. "Discard changes" is in "···".
 */
export function BandCard({
  rb,
  brand,
  selected,
  onSave,
  onRename,
  onChange,
}: {
  rb: ReportBand;
  brand?: Brand;
  selected: boolean;
  onSelect?: () => void;
  onSave: () => void;
  onRename: () => void;
  onChange: () => void;
}) {
  const more = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const k = rb.kind;

  if (!rb.saved && rb.empty) {
    /* Nothing on the page yet: point at the presets rather than an empty
       state, so a brand without styles still gets a header in two clicks. */
    return (
      <button className="bobj-choose" onClick={onChange}>
        <span className="bobj-choose-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="bobj-choose-text">
          <span className="bobj-choose-title">Choose a {k}</span>
          <span className="bobj-choose-sub">Start from a preset or from scratch</span>
        </span>
      </button>
    );
  }

  if (!rb.saved) {
    /* A preset, or a band built on the page: shown as it is, unsaved. */
    return (
      <div className={`bobj-card ${selected ? "selected" : ""}`}>
        <button className="bobj-thumb" onClick={onChange} title={`Change ${k} style`}>
          <BandThumb band={rb.band} kind={k} brand={brand} />
        </button>
        <div className="bobj-foot">
          <span className="bobj-name truncate">{rb.label ?? `Custom ${k}`}</span>
          <span className="bobj-edited unsaved">Not saved</span>
          <button className="bobj-save-link" disabled={!brand} onClick={onSave}>
            Save…
          </button>
          <button
            ref={more}
            className="btn ghost icon sm"
            title="More"
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name="ellipsis" size={16} />
          </button>
        </div>
        {menu && (
          <BandMenu
            rb={rb}
            anchorRef={more}
            onClose={() => setMenu(false)}
            onSave={onSave}
            onRename={onRename}
            onChange={onChange}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`bobj-card ${selected ? "selected" : ""}`}>
      <button className="bobj-thumb" onClick={onChange} title={`Change ${k} style`}>
        <BandThumb band={rb.saved.band} kind={k} brand={brand} />
      </button>
      <div className="bobj-foot">
        <span className="bobj-name truncate">{rb.saved.name}</span>
        {rb.dirty && (
          <>
            <span className="bobj-edited" title="This report has changes not saved to the style">
              Edited
            </span>
            <button className="bobj-save-link" onClick={() => setSaving(true)}>
              Save…
            </button>
          </>
        )}
        <button
          ref={more}
          className="btn ghost icon sm"
          title="More"
          onClick={() => setMenu((m) => !m)}
        >
          <Icon name="ellipsis" size={16} />
        </button>
      </div>
      {saving && (
        <SaveBandDialog
          rb={rb}
          onClose={() => setSaving(false)}
          onDone={() => setSaving(false)}
        />
      )}
      {menu && (
        <BandMenu
          rb={rb}
          anchorRef={more}
          onClose={() => setMenu(false)}
          onSave={onSave}
          onRename={onRename}
          onChange={onChange}
        />
      )}
    </div>
  );
}

/**
 * "Save…" on an edited header or footer: update the style the report uses
 * (for every report using it) or keep it and save the edits as a new style.
 */
export function SaveBandDialog({
  rb,
  onClose,
  onDone,
}: {
  rb: ReportBand;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"update" | "new">("update");
  const [name, setName] = useState(rb.suggestedName);
  const ok = mode === "update" || name.trim().length > 0;
  const brandName = rb.brand?.name ?? "this brand";
  const go = () => {
    if (!ok) return;
    if (mode === "update") rb.update();
    else rb.saveNew(name.trim());
    onDone();
  };
  return (
    <Modal
      title={`Save ${rb.kind} changes`}
      width={440}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={go}>
            {mode === "update" ? "Update style" : "Save style"}
          </Button>
        </>
      }
    >
      <div className="sbd-opts" role="radiogroup">
        <label className={`sbd-opt ${mode === "update" ? "on" : ""}`}>
          <input
            type="radio"
            name="sbd"
            checked={mode === "update"}
            onChange={() => setMode("update")}
          />
          <span className="sbd-text">
            <span className="sbd-title">Update “{rb.saved?.name}”</span>
            <span className="sbd-sub">Applies to every report using {brandName}</span>
          </span>
        </label>
        <label className={`sbd-opt ${mode === "new" ? "on" : ""}`}>
          <input type="radio" name="sbd" checked={mode === "new"} onChange={() => setMode("new")} />
          <span className="sbd-text">
            <span className="sbd-title">Save as a new style</span>
            <span className="sbd-sub">Keeps “{rb.saved?.name}” as it is</span>
            {mode === "new" && (
              <input
                className="input sbd-name"
                autoFocus
                aria-label="Style name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()}
              />
            )}
          </span>
        </label>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

export function RenameBandDialog({
  kind,
  name,
  saving,
  brandName,
  onClose,
  onSave,
}: {
  kind: BandKind;
  name: string;
  /** Saving a new style rather than renaming one. */
  saving?: boolean;
  brandName?: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [v, setV] = useState(name);
  const ok = v.trim().length > 0;
  return (
    <Modal
      title={saving ? `Save ${kind} style${brandName ? ` to ${brandName}` : ""}` : "Rename style"}
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSave(v.trim())}>
            {saving ? "Save style" : "Save"}
          </Button>
        </>
      }
    >
      <div className="field">
        <div className="field-label">Name</div>
        <input
          className="input"
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok && onSave(v.trim())}
        />
      </div>
    </Modal>
  );
}

/**
 * Every header (or footer) the report can take: the styles saved in the
 * brand (each card's menu sets the default, renames or deletes it), then
 * "Start from scratch" and the presets, drawn with the brand applied.
 */
export function BandLibraryModal({
  rb,
  brand,
  onClose,
  onScratch,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
  /** "Start from scratch": open the empty band on the page to build it. */
  onScratch?: () => void;
}) {
  const { updateBrandBand, deleteBrandBand, setPrimaryBand, toast } = useStore();
  const k = rb.kind;
  const [menuFor, setMenuFor] = useState<{ id: string; el: HTMLElement } | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState<SavedBand | null>(null);
  const [deleting, setDeleting] = useState<SavedBand | null>(null);
  const primaryId = primaryBand(brand, k)?.id;
  const menuBand = rb.library.find((b) => b.id === menuFor?.id);

  return (
    <>
      <Modal
        title={`${cap(k)} styles`}
        width={640}
        onClose={onClose}
        footer={<Button onClick={onClose}>Close</Button>}
      >
        {rb.library.length > 0 && (
          <>
            <div className="bobj-sec-head">
              <span className="field-label">Saved in {brand?.name ?? "this brand"}</span>
            </div>
            <div className="bobj-grid list">
              {rb.library.map((b) => (
                <div className={`bobj-card lib ${rb.saved?.id === b.id ? "applied" : ""}`} key={b.id}>
                  <button
                    className="bobj-thumb"
                    title={`Apply \u201c${b.name}\u201d`}
                    onClick={() => {
                      rb.apply(b);
                      onClose();
                      toast(`\u201c${b.name}\u201d applied`);
                    }}
                  >
                    <BandThumb band={b.band} kind={k} brand={brand} context />
                  </button>
                  <div className="bobj-foot">
                    <span className="bobj-name truncate">{b.name}</span>
                    {primaryId === b.id && <span className="bobj-primary">Default</span>}
                    {rb.saved?.id === b.id && <span className="bobj-applied">Applied</span>}
                    <button
                      className="btn ghost icon sm"
                      title="More"
                      onClick={(e) => {
                        menuRef.current = e.currentTarget;
                        setMenuFor({ id: b.id, el: e.currentTarget });
                      }}
                    >
                      <Icon name="ellipsis" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bobj-sec-head">
          <span className="field-label">Start a new style</span>
          <span className="t-body3 muted">
            {brand
              ? `Presets use ${brand.name}\u2019s logo, artwork and colors. Save one to add it to ${brand.name}.`
              : "Presets fill in with the brand\u2019s logo, artwork and colors once one is applied."}
          </span>
        </div>
        <button
            className="bobj-scratch"
            onClick={() => {
              rb.apply(null);
              onClose();
              onScratch?.();
            }}
          >
            <Icon name="plus" size={16} />
            Start from scratch
          </button>
        <div className="bobj-grid presets">
          {presetsFor(k).map((p) => {
            const on = !rb.saved && rb.presetName === p.name;
            return (
              <div className={`bobj-card lib ${on ? "applied" : ""}`} key={p.id}>
                <button
                  className="bobj-thumb"
                  title={`Use \u201c${p.name}\u201d`}
                  onClick={() => {
                    rb.applyPreset(p);
                    onClose();
                    toast(`\u201c${p.name}\u201d applied. Save it to keep it in ${brand?.name ?? "the brand"}`);
                  }}
                >
                  <BandThumb band={p.make(brand)} kind={k} brand={brand} context />
                </button>
                <div className="bobj-foot">
                  <span className="bobj-name truncate">{p.name}</span>
                  {on && <span className="bobj-applied">Applied</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {menuFor && menuBand && brand && (
        <Popover anchorRef={menuRef} onClose={() => setMenuFor(null)} width={190}>
          {primaryId !== menuBand.id && (
            <MenuItem
              icon="check"
              onClick={() => {
                setPrimaryBand(brand.id, k, menuBand.id);
                setMenuFor(null);
              }}
            >
              Set as default
            </MenuItem>
          )}
          <MenuItem
            icon="pencil"
            onClick={() => {
              setRenaming(menuBand);
              setMenuFor(null);
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon="trash"
            onClick={() => {
              setDeleting(menuBand);
              setMenuFor(null);
            }}
          >
            Delete
          </MenuItem>
        </Popover>
      )}

      {renaming && brand && (
        <RenameBandDialog
          kind={k}
          name={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(n) => {
            updateBrandBand(brand.id, renaming.id, { name: n });
            setRenaming(null);
          }}
        />
      )}

      {deleting && brand && (
        <DeleteBandDialog
          band={deleting}
          brand={brand}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            if (rb.saved?.id === deleting.id) rb.unlink();
            deleteBrandBand(brand.id, deleting.id);
            toast(`${cap(k)} style \u201c${deleting.name}\u201d deleted`);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

export function DeleteBandDialog({
  band,
  brand,
  onClose,
  onDelete,
}: {
  band: SavedBand;
  brand: Brand;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal
      title="Delete style"
      width={460}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onDelete}>
            Delete style
          </Button>
        </>
      }
    >
      <p className="t-body2" style={{ margin: 0 }}>
        &ldquo;{band.name}&rdquo; will be removed from {brand.name}. Reports and templates using it
        fall back to the brand&rsquo;s default {band.kind}.
      </p>
    </Modal>
  );
}

/** Keeps a DOM element in a ref object, for menus opened from the band's tag. */
export function elementRef(el: HTMLElement | null): React.RefObject<HTMLElement | null> {
  return { current: el };
}
