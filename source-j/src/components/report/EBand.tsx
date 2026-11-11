import { Icon } from "../ui/Icon";
import { Button, MenuItem, Modal, Popover } from "../ui/primitives";
import { LayoutThumb } from "./Layouts";
import type { ReportBand } from "./BandObjects";
import { EMPTY_BAND, type Brand } from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version E — the header and footer styles, from the band on the report
 *
 * The band is built on the page. Its tag says which style it is; "···" saves
 * it as a new style, updates the style it came from, or swaps it for another.
 * ------------------------------------------------------------------ */

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function EBandMenu({
  rb,
  anchorRef,
  onClose,
  onSaveNew,
  onRename,
  onChange,
}: {
  rb: ReportBand;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSaveNew: () => void;
  onRename: () => void;
  onChange: () => void;
}) {
  const run = (f: () => void) => () => {
    onClose();
    f();
  };
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} width={230}>
      {rb.saved && rb.dirty && <MenuItem onClick={run(rb.update)}>Update &ldquo;{rb.saved.name}&rdquo;</MenuItem>}
      {(!rb.saved || rb.dirty) && !rb.empty && <MenuItem onClick={run(onSaveNew)}>Save as new style</MenuItem>}
      {rb.saved && rb.dirty && <MenuItem onClick={run(rb.discard)}>Discard changes</MenuItem>}
      {rb.saved && <MenuItem onClick={run(onRename)}>Rename style</MenuItem>}
      <MenuItem onClick={run(onChange)}>Change style</MenuItem>
      {!rb.empty && (
        <>
          <div className="menu-sep" />
          <MenuItem tone="danger" onClick={run(() => rb.apply(null))}>
            Remove {rb.kind}
          </MenuItem>
        </>
      )}
    </Popover>
  );
}

/** "Change style": the saved styles, drawn with the report's brand, and a blank one. */
export function EStylePicker({
  rb,
  brand,
  onClose,
}: {
  rb: ReportBand;
  brand?: Brand;
  onClose: () => void;
}) {
  const k = rb.kind;
  const pick = (id: string | null) => {
    if (id) rb.setLayout(id);
    else rb.apply(null);
    onClose();
  };
  return (
    <Modal
      title={`${cap(k)} styles`}
      width={760}
      className="sp-modal"
      onClose={onClose}
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      <p className="t-body3 muted" style={{ margin: "0 0 14px" }}>
        Shown with {brand?.name ?? "the report's brand"}. A style takes its colors and logo from
        whichever brand the report uses.
      </p>
      <div className="sp-grid">
        <button className="sp-new" onClick={() => pick(null)}>
          <Icon name="plus" size={20} />
          <span className="sp-new-title">Blank {k}</span>
          <span className="sp-new-sub">Build it on the page, then save it as a style</span>
        </button>
        {rb.library.map((s) => {
          const on = rb.layoutId === s.id;
          return (
            <button key={s.id} className={`lo-dcard sl-card ${on ? "on" : ""}`} onClick={() => pick(s.id)}>
              <span className="lo-dcard-pic">
                <LayoutThumb kind={k} band={s.band ?? EMPTY_BAND} brand={brand} />
              </span>
              <span className="lo-card-name">
                <span className="truncate">{s.name}</span>
                {on && <Icon name="check" size={14} />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
