import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, MenuItem, Modal, Popover } from "../ui/primitives";
import { PageBandEditor } from "../editor/PageBandEditor";
import { useStore } from "../../state/store";
import { EMPTY_BAND, bandVars, brandVars, type Brand, type PageBand } from "../../data/brand";
import { nextName, type BandKind } from "../../data/bandObjects";
import type { BandStyle } from "../../data/bandStyles";
import { LayoutThumb, defaultScope, layoutsFor, presetBand, withLayout } from "./Layouts";
import type { ReportBand } from "./BandObjects";

/* ------------------------------------------------------------------ *
 * Version I — the header and footer style library
 *
 * The Headers / Footers gallery lists Feedly's presets and the organization's
 * own styles. Picking one is all a template or report does. Making or
 * changing a style happens in the style designer, a modal that holds only
 * the header (or footer) on a page, so it is clear the style is its own thing
 * and that saving it changes it everywhere it is used.
 * ------------------------------------------------------------------ */

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** How many templates point at a style. */
export function useUsedBy() {
  const { templates } = useStore();
  return (id: string) => templates.filter((t) => t.headerStyleId === id || t.footerStyleId === id).length;
}

/** What the designer opens on: a style to change, or a new one from a preset or blank. */
export type DesignStart = { style: BandStyle } | { from: string | null };

/* ---------------- The header / footer gallery ---------------- */

/**
 * "Add header" (or "Change header") on the page opens this: Feedly's presets
 * and the organization's own styles, and "New header style". Picking one, or
 * saving a new one, applies it.
 */
export function StylePickerModal({
  rb,
  brand,
  onClose,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
}) {
  const k = rb.kind;
  const { bandStyles, addBandStyle, deleteBandStyle, toast } = useStore();
  const usedBy = useUsedBy();
  const [design, setDesign] = useState<DesignStart | null>(null);
  const [menu, setMenu] = useState<{ id: string; custom: boolean } | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState<BandStyle | null>(null);

  const own = bandStyles.filter((s) => s.kind === k);
  const presets = layoutsFor(k);
  const menuStyle = menu?.custom ? own.find((s) => s.id === menu.id) : undefined;
  const choose = (id: string | null) => {
    rb.setLayout(id);
    onClose();
  };

  const card = (id: string, name: string, band: PageBand, custom: boolean) => {
    const on = rb.layoutId === id;
    const n = custom ? usedBy(id) : 0;
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        className={`lo-dcard sl-card ${on ? "on" : ""}`}
        onClick={() => choose(id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && choose(id)}
      >
        <span className="lo-dcard-pic">
          <LayoutThumb kind={k} band={band} brand={brand} />
        </span>
        <span className="lo-card-name">
          <span className="sl-name">
            <span className="truncate">{name}</span>
            {custom && <span className="sl-used">{n ? `Used by ${plural(n, "template")}` : "Not in any template yet"}</span>}
          </span>
          {on && <Icon name="check" size={14} />}
          <button
            className="btn ghost icon sm sl-more"
            title="More"
            onClick={(e) => {
              e.stopPropagation();
              menuRef.current = e.currentTarget;
              setMenu({ id, custom });
            }}
          >
            <Icon name="ellipsis" size={16} />
          </button>
        </span>
      </div>
    );
  };

  return (
    <>
      <Modal
        title={k === "header" ? "Headers" : "Footers"}
        width={860}
        className="sp-modal"
        onClose={() => !design && !deleting && !menu && onClose()}
        footer={
          <>
            {rb.layoutId && (
              <Button variant="ghost" style={{ marginRight: "auto" }} onClick={() => choose(null)}>
                Remove {k}
              </Button>
            )}
            <Button onClick={onClose}>Cancel</Button>
          </>
        }
      >
        <div className="sp-grid">
          <button className="sp-new" onClick={() => setDesign({ from: null })}>
            <Icon name="plus" size={20} />
            <span className="sp-new-title">New {k} style</span>
            <span className="sp-new-sub">From blank or a Feedly preset</span>
          </button>
          {own.map((s) => card(s.id, s.name, s.band, true))}
        </div>
        <div className="sl-sec sp-sec">Feedly presets</div>
        <div className="sp-grid">{presets.map((l) => card(l.id, l.name, presetBand(k, l.id), false))}</div>
      </Modal>

      {menu && (
        <Popover anchorRef={menuRef} onClose={() => setMenu(null)} width={190}>
          {menuStyle ? (
            <>
              <MenuItem
                icon="pencil"
                onClick={() => {
                  setDesign({ style: menuStyle });
                  setMenu(null);
                }}
              >
                Edit
              </MenuItem>
              <MenuItem
                icon="duplicate"
                onClick={() => {
                  const made = addBandStyle({
                    kind: k,
                    name: nextName(`${menuStyle.name} copy`, own.map((s) => s.name)),
                    band: menuStyle.band,
                  });
                  toast(`\u201c${made.name}\u201d added to your ${k}s`);
                  setMenu(null);
                }}
              >
                Duplicate
              </MenuItem>
              <div className="menu-sep" />
              <MenuItem
                icon="trash"
                tone="danger"
                onClick={() => {
                  setDeleting(menuStyle);
                  setMenu(null);
                }}
              >
                Delete
              </MenuItem>
            </>
          ) : (
            <MenuItem
              icon="pencil"
              onClick={() => {
                setDesign({ from: menu.id });
                setMenu(null);
              }}
            >
              Customize
            </MenuItem>
          )}
        </Popover>
      )}

      {design && (
        <StyleDesigner
          kind={k}
          brand={brand}
          start={design}
          onClose={() => setDesign(null)}
          onSaved={(st, isNew) => {
            setDesign(null);
            /* A new style goes straight onto the page. */
            if (isNew) choose(st.id);
          }}
        />
      )}

      {deleting && (
        <Modal
          title={`Delete ${k} style`}
          width={460}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button onClick={() => setDeleting(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (rb.layoutId === deleting.id) rb.setLayout(null);
                  deleteBandStyle(deleting.id);
                  toast(`${cap(k)} style \u201c${deleting.name}\u201d deleted`);
                  setDeleting(null);
                }}
              >
                Delete style
              </Button>
            </>
          }
        >
          <p className="t-body2" style={{ margin: 0 }}>
            {usedBy(deleting.id)
              ? `\u201c${deleting.name}\u201d is used by ${plural(usedBy(deleting.id), "template")}. They will have no ${k} until another one is picked.`
              : `\u201c${deleting.name}\u201d will be removed from your ${k}s.`}
          </p>
        </Modal>
      )}
    </>
  );
}

/* ---------------- The style designer ---------------- */

export function StyleDesigner({
  kind,
  brand,
  start,
  onClose,
  onSaved,
}: {
  kind: BandKind;
  brand?: Brand;
  start: DesignStart;
  onClose: () => void;
  onSaved: (s: BandStyle, isNew: boolean) => void;
}) {
  const { bandStyles, addBandStyle, updateBandStyle, toast } = useStore();
  const usedBy = useUsedBy();
  const editing = "style" in start ? start.style : null;
  const fromPreset = "from" in start ? start.from : null;
  const taken = bandStyles.filter((s) => s.kind === kind).map((s) => s.name);
  const presets = layoutsFor(kind);
  const [band, setBand] = useState<PageBand>(() =>
    editing
      ? editing.band
      : fromPreset
        ? presetBand(kind, fromPreset)
        : { ...EMPTY_BAND, scope: defaultScope(kind), height: kind === "header" ? 88 : 56 }
  );
  const [name, setName] = useState(
    editing?.name ??
      nextName(
        fromPreset ? `My ${presets.find((l) => l.id === fromPreset)?.name.toLowerCase()}` : `${cap(kind)} style`,
        taken
      )
  );
  const n = editing ? usedBy(editing.id) : 0;

  const pick = (id: string | null) =>
    setBand((b) =>
      id
        ? withLayout(b, kind, id)
        : { ...EMPTY_BAND, scope: b.scope, height: kind === "header" ? 88 : 56 }
    );

  const save = () => {
    const nm = name.trim() || `${cap(kind)} style`;
    if (editing) {
      updateBandStyle(editing.id, { name: nm, band });
      toast(n ? `“${nm}” updated in ${plural(n, "template")}` : `“${nm}” saved`);
      onSaved({ ...editing, name: nm, band }, false);
    } else {
      const made = addBandStyle({ kind, name: nm, band });
      toast(`“${nm}” saved to your ${kind}s and applied`);
      onSaved(made, true);
    }
  };

  const other = { ...EMPTY_BAND, scope: "all" as const };
  const hb = kind === "header" ? band : other;
  const fb = kind === "footer" ? band : other;
  const blank = !band.layout;

  const lines = (
    <div className="sd-lines" aria-hidden="true">
      <span className="tall" style={{ width: "46%" }} />
      <span style={{ width: "92%" }} />
      <span style={{ width: "84%" }} />
      <span style={{ width: "64%" }} />
      <span style={{ width: "88%" }} />
    </div>
  );

  return (
    <Modal bare className="sd-modal" onClose={onClose}>
      <div className="sd-head">
        <div className="sd-title">
          {editing ? `Edit ${kind} style` : `New ${kind} style`}
        </div>
        <button className="btn ghost icon" onClick={onClose} title="Close">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="sd-body">
        <aside className="sd-rail">
          <label className="sd-field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="sd-field">
            <span className="field-label">Show on</span>
            <span className="lo-scope-seg sd-seg" role="radiogroup">
              {(["cover", "all"] as const).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={band.scope === v}
                  className={`lo-scope-opt ${band.scope === v ? "on" : ""}`}
                  onClick={() => setBand((b) => ({ ...b, scope: v }))}
                >
                  {v === "cover" ? "Cover only" : "All pages"}
                </button>
              ))}
            </span>
          </div>
          <div className="sd-field sd-grow">
            <span className="field-label">Layout</span>
            <div className="sd-layouts">
              <button className={`sd-lcard ${blank ? "on" : ""}`} onClick={() => pick(null)}>
                <span className="sd-blank">
                  <Icon name="plus" size={16} />
                  Blank
                </span>
                <span className="sd-lname">Build your own</span>
              </button>
              {presets.map((l) => (
                <button
                  key={l.id}
                  className={`sd-lcard ${band.layout === l.id ? "on" : ""}`}
                  onClick={() => pick(l.id)}
                >
                  <span className="sd-lpic">
                    <LayoutThumb kind={kind} band={{ ...band, layout: l.id }} brand={brand} lines={false} />
                  </span>
                  <span className="sd-lname">{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="sd-canvas">
          <div className="sd-hint">
            <Icon name="info" size={16} />
            {blank
              ? "Add text, images, a TLP badge or the page number with +. Set the background from the toolbar."
              : "Click a label to change its words. The TLP badge sets the starting level; each report can change it."}
          </div>
          <div
            className={`report-page sd-page ${kind}`}
            style={{ ...brandVars(brand), ...bandVars(hb, fb, brand) }}
          >
            {kind === "header" && (
              <PageBandEditor
                kind="header"
                band={band}
                brand={brand}
                mode="edit"
                objects
                design
                active
                onActivate={() => {}}
                onChange={setBand}
                tagLabel={name || "Header"}
              />
            )}
            {lines}
            {kind === "footer" && (
              <PageBandEditor
                kind="footer"
                band={band}
                brand={brand}
                mode="edit"
                objects
                design
                active
                onActivate={() => {}}
                onChange={setBand}
                tagLabel={name || "Footer"}
              />
            )}
          </div>
          <div className="sd-brandnote">
            {brand
              ? `Shown with ${brand.name}. Logos, images and colors come from the brand each report uses.`
              : "Logos, images and colors come from the brand each report uses."}
          </div>
        </div>
      </div>
      <div className="sd-foot">
        {editing && n > 0 && (
          <span className="sd-used">
            <Icon name="info" size={16} />
            Used by {plural(n, "template")}. Saving updates all of them.
          </span>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>
          {editing ? "Save changes" : "Save style"}
        </Button>
      </div>
    </Modal>
  );
}
