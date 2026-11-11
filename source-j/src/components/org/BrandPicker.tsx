import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Modal, Select, layerStack } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { SimpleBrandPeek as BrandPeek } from "./SimpleBrandPeek";
import { NewBrandDialog } from "./NewBrandDialog";
import { useStore, nextId } from "../../state/store";
import { FEEDLY_BRAND, extractedBrand, type Brand } from "../../data/brand";

const CREATE = "Create new brand";
/* Version G: the brand in use can be renamed or copied from the same menu. */
const RENAME = "Rename brand";
const DUPLICATE = "Duplicate brand";

/**
 * The brand dropdown, wherever a brand is picked, with a pencil beside it.
 * The pencil opens the same brand side panel as the Org Profile, so a brand
 * can be adjusted without leaving the template or the report. Saving writes
 * back to the brand itself, so the change shows everywhere it is used.
 */
export function BrandPicker({
  brands,
  brandId,
  onPick,
  disabled,
  textEdit,
  createRequest,
  onCreated,
}: {
  brands: Brand[];
  brandId?: string;
  onPick: (id: string | undefined) => void;
  disabled?: boolean;
  /** Version C's Design tab: an "Edit" button rather than the pencil. */
  textEdit?: boolean;
  /** Version C: bumping this opens "Create new brand" from elsewhere (saving a header with no brand). */
  createRequest?: number;
  /** Version C: the brand created here has been set up and its panel closed. */
  onCreated?: () => void;
}) {
  const {
    updateBrand,
    addBrand,
    addOrgItem,
    toast,
    brands: allBrands,
    settings,
    setSettings,
    orgItems,
    updateOrgItem,
  } = useStore();
  const [renaming, setRenaming] = useState(false);
  const rename = (n: string) => {
    if (!brand) return;
    const old = brand.name;
    updateBrand(brand.id, { name: n });
    /* Report Builder settings and the Org Profile list brands by name. */
    setSettings({ ...settings, brands: settings.brands.map((x) => (x === old ? n : x)) });
    const item = orgItems.find((o) => o.type === "Brand" && o.name === old);
    if (item) updateOrgItem(item.id, { name: n });
    toast(`Brand renamed to \u201c${n}\u201d`);
  };
  /** Version C, from a report: the brand just created, applied once its panel closes. */
  const [freshId, setFreshId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  /** Version C: "Create new brand" opens the Org Profile's New Brand dialog,
      then the brand's side panel, the same two steps as from the Org Profile. */
  const [newDialog, setNewDialog] = useState(false);
  /** The panel is open on a brand just created here: clicking a section
      fills in Feedly's values, standing in for typing them. */
  const [fresh, setFresh] = useState(false);
  const brand = brands.find((b) => b.id === brandId);
  /* Only a change opens the dialog, not the value this picker mounted with. */
  const lastRequest = useRef(createRequest);
  useEffect(() => {
    if (createRequest && createRequest !== lastRequest.current) setNewDialog(true);
    lastRequest.current = createRequest;
  }, [createRequest]);
  const closePeek = () => {
    setEditing(false);
    if (freshId) {
      /* From a report: the brand is applied only once it has been set up. */
      onPick(freshId);
      const made = allBrands.find((b) => b.id === freshId);
      if (made) toast(`${made.name} applied to this report`);
      setFreshId(null);
    }
    if (fresh) onCreated?.();
    setFresh(false);
  };
  const peekBrand = freshId ? allBrands.find((b) => b.id === freshId) : brand;

  /* Escape closes the brand panel and nothing behind it. Caught on the way
     down, before the template or report editor underneath sees the key. */
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || layerStack.count > 0) return;
      e.stopPropagation();
      closePeek();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, fresh, freshId, allBrands]);

  return (
    <div className="row brand-picker" style={{ gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }} className={textEdit && brand ? "bp-has-edit" : ""}>
        {/* Version G: the brand is edited from its own row, beside the chevron. */}
        {textEdit && brand && !disabled && (
          <button
            className="bp-edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
        <Select
          block
          icon="brand"
          disabled={disabled}
          value={brand?.name}
          /* Version C's report: pick one of the brands or create one; there is
             no "No brand" to go back to. */
          placeholder={textEdit ? "Select brand" : brands.length ? "No brand" : "No brands saved"}
          options={
            textEdit
              ? [...brands.map((b) => b.name), ...(brand ? [RENAME, DUPLICATE] : []), CREATE]
              : ["No brand", ...brands.map((b) => b.name)]
          }
          renderOption={(o) =>
            o === CREATE || o === RENAME || o === DUPLICATE ? (
              <span className={`row create-brand-opt ${o === RENAME ? "sep" : ""}`} style={{ gap: 8 }}>
                <Icon name={o === CREATE ? "plus" : o === RENAME ? "pencil" : "duplicate"} size={16} />
                {o}
              </span>
            ) : (
              o
            )
          }
          onChange={(name) => {
            if (name === CREATE) {
              setNewDialog(true);
              return;
            }
            if (name === RENAME) {
              setRenaming(true);
              return;
            }
            if (name === DUPLICATE && brand) {
              const taken = allBrands.map((b) => b.name);
              let n = `${brand.name} copy`;
              for (let i = 2; taken.includes(n); i++) n = `${brand.name} copy ${i}`;
              const id = nextId("brand");
              addBrand({ ...brand, id, name: n });
              addOrgItem({
                id: nextId("o"),
                name: n,
                type: "Brand",
                icon: "brand",
                referencedIn: [],
                createdBy: "Rui Marçalo",
                createdOn: "Oct 30, 2026",
              });
              onPick(id);
              toast(`\u201c${n}\u201d created from ${brand.name}`);
              return;
            }
            onPick(name === "No brand" ? undefined : brands.find((b) => b.name === name)?.id);
          }}
        />
      </div>
      {/* Version C's report Design tab edits the brand in place, so it has
          no button out to the Org Profile panel. */}
      {!textEdit && (
        <Button
          icon="pencil"
          title={brand ? `Edit ${brand.name}` : "Pick a brand to edit it"}
          disabled={!brand || disabled}
          onClick={() => setEditing(true)}
        />
      )}
      {renaming && brand && (
        <RenameBrandDialog
          name={brand.name}
          taken={allBrands.filter((b) => b.id !== brand.id).map((b) => b.name)}
          onClose={() => setRenaming(false)}
          onSave={(n) => {
            rename(n);
            setRenaming(false);
          }}
        />
      )}
      {newDialog && (
        <NewBrandDialog
          autofillName={FEEDLY_BRAND.name}
          onClose={() => setNewDialog(false)}
          onCreate={(name, extracted) => {
            const id = nextId("brand");
            /* Prototype: the brand comes with Feedly's colours, type, logo and
               background image already set up, with or without a PDF. */
            const created: Brand = {
              ...extractedBrand(name, id),
              assets: FEEDLY_BRAND.assets.map((a) =>
                a.id === "hero" ? { ...a, name: "Background image" } : a
              ),
              slots: FEEDLY_BRAND.slots,
            };
            addBrand(created);
            addOrgItem({
              id: nextId("o"),
              name,
              type: "Brand",
              icon: "brand",
              referencedIn: [],
              createdBy: "Rui Marçalo",
              createdOn: "Oct 28, 2026",
            });
            setNewDialog(false);
            /* From a report, the brand's full panel opens first and the brand
               is applied to the report when it closes. */
            if (textEdit) setFreshId(id);
            else onPick(id);
            setFresh(true);
            setEditing(true);
            toast(extracted ? `Styles extracted into \u201c${name}\u201d` : `Brand \u201c${name}\u201d added`);
          }}
        />
      )}
      {editing &&
        peekBrand &&
        createPortal(
          <BrandPeek
            brand={peekBrand}
            fresh={fresh}
            onClose={closePeek}
            onSave={(b) => {
              updateBrand(b.id, b);
              closePeek();
              toast("Brand styles were successfully saved");
            }}
          />,
          document.body,
        )}
    </div>
  );
}

function RenameBrandDialog({
  name,
  taken,
  onClose,
  onSave,
}: {
  name: string;
  taken: string[];
  onClose: () => void;
  onSave: (n: string) => void;
}) {
  const [v, setV] = useState(name);
  const t = v.trim();
  const clash = taken.includes(t);
  const ok = t.length > 0 && !clash;
  return (
    <Modal
      title="Rename brand"
      width={420}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSave(t)}>
            Rename
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
          onKeyDown={(e) => e.key === "Enter" && ok && onSave(t)}
        />
        {clash && <div className="field-help" style={{ color: "var(--danger)" }}>A brand with this name already exists.</div>}
      </div>
    </Modal>
  );
}
