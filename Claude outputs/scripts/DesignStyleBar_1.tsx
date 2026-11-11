import { useState, useSyncExternalStore } from "react";
import { Button, Field, Modal, Select } from "../ui/primitives";
import { BRANDED_FOOTER, BRANDED_HEADER, EMPTY_BAND, FEEDLY_BRAND, type PageBand } from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version A (build B), Nov 4 — design styles in the template editor
 *
 * A design style is a template's look: its brand, header and footer, saved
 * under a name so other templates can take it in one go. The sticky foot of
 * the Design tab (sized like the report's Regenerate foot) picks a saved
 * style or saves what the template has now as one.
 * ------------------------------------------------------------------ */

export type DesignStyle = {
  id: string;
  name: string;
  brandId?: string;
  header: PageBand;
  footer: PageBand;
};

type Look = Omit<DesignStyle, "id" | "name">;

/* A small store of its own, so the styles outlive one editor session. */
let styles: DesignStyle[] = [
  { id: "ds-feedly", name: "Feedly branded", brandId: FEEDLY_BRAND.id, header: BRANDED_HEADER, footer: BRANDED_FOOTER },
  { id: "ds-plain", name: "Plain", brandId: undefined, header: EMPTY_BAND, footer: EMPTY_BAND },
];
const subs = new Set<() => void>();
const setStyles = (next: DesignStyle[]) => {
  styles = next;
  subs.forEach((f) => f());
};
const useStyles = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => styles
  );

const sig = (l: Look) => JSON.stringify({ b: l.brandId ?? null, h: l.header, f: l.footer });

export function DesignStyleBar({
  look,
  onApply,
  toast,
}: {
  /** What the template has now. */
  look: Look;
  onApply: (s: DesignStyle) => void;
  toast: (msg: string) => void;
}) {
  const list = useStyles();
  /* The style picked last, or the one the template already matches. */
  const [pickedId, setPickedId] = useState<string | undefined>(
    () => list.find((s) => sig(s) === sig(look))?.id
  );
  const picked = list.find((s) => s.id === pickedId);
  const edited = Boolean(picked) && sig(picked as DesignStyle) !== sig(look);
  const [dialog, setDialog] = useState(false);

  return (
    <>
      <div className="side-foot ds-foot">
        <div className="ds-pick">
          <Select
            block
            value={picked?.name}
            placeholder="Choose design style"
            options={list.map((s) => s.name)}
            onChange={(name) => {
              const s = list.find((x) => x.name === name);
              if (!s) return;
              setPickedId(s.id);
              onApply(s);
            }}
          />
          {edited && <span className="ds-edited">Edited</span>}
        </div>
        <Button variant="primary" onClick={() => setDialog(true)}>
          Save style
        </Button>
      </div>

      {dialog && (
        <SaveStyleDialog
          picked={picked}
          edited={edited}
          taken={list.map((s) => s.name)}
          onClose={() => setDialog(false)}
          onSave={(mode, name) => {
            if (mode === "update" && picked) {
              setStyles(list.map((s) => (s.id === picked.id ? { ...s, ...look } : s)));
              toast(`“${picked.name}” updated`);
            } else {
              const s: DesignStyle = { id: `ds-${Date.now()}`, name, ...look };
              setStyles([...list, s]);
              setPickedId(s.id);
              toast(`Design style “${name}” saved`);
            }
            setDialog(false);
          }}
        />
      )}
    </>
  );
}

function SaveStyleDialog({
  picked,
  edited,
  taken,
  onClose,
  onSave,
}: {
  picked?: DesignStyle;
  edited: boolean;
  taken: string[];
  onClose: () => void;
  onSave: (mode: "update" | "new", name: string) => void;
}) {
  const [mode, setMode] = useState<"update" | "new">(picked && edited ? "update" : "new");
  const [name, setName] = useState("");
  const n = name.trim();
  const clash = mode === "new" && taken.some((t) => t.toLowerCase() === n.toLowerCase());
  const ok = mode === "update" || (n.length > 0 && !clash);
  return (
    <Modal
      title="Save style"
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSave(mode, n)}>
            {mode === "update" ? "Update style" : "Save style"}
          </Button>
        </>
      }
    >
      <div className="ds-dialog">
        <p className="t-body3 muted" style={{ margin: 0 }}>
          A design style saves this template&rsquo;s brand, header and footer, so other templates can use them.
        </p>
        {picked && (
          <div className="ds-modes" role="radiogroup" aria-label="Save as">
            <label className={`ds-mode ${mode === "update" ? "on" : ""}`}>
              <input type="radio" checked={mode === "update"} onChange={() => setMode("update")} />
              <span>
                Update &ldquo;{picked.name}&rdquo;
                <span className="ds-mode-help">Every template using this style gets the change.</span>
              </span>
            </label>
            <label className={`ds-mode ${mode === "new" ? "on" : ""}`}>
              <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
              <span>Save as a new style</span>
            </label>
          </div>
        )}
        {mode === "new" && (
          <Field label="Style name" error={clash ? "A style with this name already exists" : undefined}>
            <input
              className="input"
              autoFocus
              value={name}
              placeholder="e.g. Board report"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ok) onSave(mode, n);
              }}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
