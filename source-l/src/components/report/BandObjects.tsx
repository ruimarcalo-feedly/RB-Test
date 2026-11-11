import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Modal, Popover, MenuItem } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import { useStore } from "../../state/store";
import { EMPTY_BAND, bandHeight, bandVars, brandBand, type Brand, type PageBand } from "../../data/brand";
import type { Template } from "../../data/mockData";
import {
  presetsFor,
  primaryBand,
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

/**
 * Version C (Oct 31): the report's (or template's) header or footer.
 *
 * A brand has one header and one footer. A template shows the brand's, and
 * can change them: the changes stay on the template until "Apply to brand"
 * writes them back to the brand (for every template using it) or "Discard
 * changes" drops them. A report shows its template's, or the brand's when the
 * report uses another brand, and changes nothing.
 */
export function useReportBand(
  kind: BandKind,
  brand: Brand | undefined,
  template: Template | undefined,
  mode: "template" | "report"
) {
  const { updateBrand, updateTemplate, toast } = useStore();
  const key = kind === "header" ? "headerEdit" : "footerEdit";
  const base = brandBand(brand, kind);
  /* The template's changes only count in the template's own brand. */
  const edit = template && brand && template.brandId === brand.id ? template[key] : undefined;
  const band = edit ?? base;
  const dirty = Boolean(edit) && !sameBand(edit!, base);
  const editable = mode === "template" && Boolean(template && brand);
  const empty = sameBand(band, EMPTY_BAND);
  const name = brand ? `${brand.name} ${kind}` : null;
  return {
    kind,
    brand,
    band,
    editable,
    setBand: (b: PageBand) => {
      if (editable) updateTemplate(template!.id, { [key]: b });
    },
    name,
    label: name,
    dirty,
    empty,
    /** "Apply to brand": the template's changes become the brand's. */
    applyToBrand() {
      if (!brand || !template || !edit) return;
      updateBrand(brand.id, { [kind]: edit });
      updateTemplate(template.id, { [key]: undefined });
      toast(`${cap(kind)} applied to ${brand.name}`);
    },
    /** "Discard changes": back to the brand's. */
    discard() {
      if (template) updateTemplate(template.id, { [key]: undefined });
    },
    /* What the older, several-styles-per-brand menus call. */
    saved: undefined as SavedBand | undefined,
    presetName: null as string | null,
    primary: false,
    library: [] as SavedBand[],
    suggestedName: "",
    saveNew(_n: string, _into?: Brand) {},
    update() {},
    rename(_n: string) {},
    makePrimary() {},
    apply(_obj: SavedBand | null) {},
    applyPreset(_p: BandPreset) {},
    unlink() {},
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
}: {
  rb: ReportBand;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSave?: () => void;
  onRename?: () => void;
  onChange?: () => void;
}) {
  const run = (f: () => void) => () => {
    onClose();
    f();
  };
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} width={220}>
      {rb.dirty ? (
        <>
          <MenuItem onClick={run(rb.applyToBrand)}>Apply to {rb.brand?.name ?? "brand"}</MenuItem>
          <MenuItem onClick={run(rb.discard)}>Discard changes</MenuItem>
        </>
      ) : (
        <MenuItem disabled onClick={onClose}>
          No changes to apply
        </MenuItem>
      )}
    </Popover>
  );
}

/**
 * The Header / Footer card inside the Design tab's brand box: the brand's
 * band in small. In a template, once the band on the page has been changed,
 * an "Edited" marker and "Apply to brand", with "Discard changes" in "···".
 * In a report it is only shown: it is changed in the template.
 */
export function BandCard({
  rb,
  brand,
  selected,
  onSelect,
}: {
  rb: ReportBand;
  brand?: Brand;
  selected: boolean;
  onSelect?: () => void;
  onSave?: () => void;
  onRename?: () => void;
  onChange?: () => void;
}) {
  const more = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const k = rb.kind;
  return (
    <div className={`bobj-card ${selected ? "selected" : ""} ${rb.editable ? "" : "readonly"}`}>
      <button
        className="bobj-thumb"
        disabled={!rb.editable}
        onClick={onSelect}
        title={rb.editable ? `Edit the ${k} on the page` : undefined}
      >
        {rb.empty ? (
          <span className="bobj-none">No {k}</span>
        ) : (
          <BandThumb band={rb.band} kind={k} brand={brand} />
        )}
      </button>
      <div className="bobj-foot">
        {rb.dirty ? (
          <>
            <span className="bobj-edited" title={`Changed in this template, not yet in ${brand?.name ?? "the brand"}`}>
              Edited
            </span>
            <button className="bobj-save-link" onClick={rb.applyToBrand}>
              Apply to brand
            </button>
            <button
              ref={more}
              className="btn ghost icon sm"
              title="More"
              onClick={() => setMenu((m) => !m)}
            >
              <Icon name="ellipsis" size={16} />
            </button>
          </>
        ) : (
          <span className="bobj-name truncate muted">
            {rb.editable
              ? `From ${brand?.name ?? "the brand"}`
              : `From ${brand?.name ?? "the brand"} \u00b7 edit it in the template`}
          </span>
        )}
      </div>
      {menu && <BandMenu rb={rb} anchorRef={more} onClose={() => setMenu(false)} />}
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
