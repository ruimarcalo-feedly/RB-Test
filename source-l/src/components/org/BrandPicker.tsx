import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Select, layerStack } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { BrandPeek } from "./BrandPeek";
import { NewBrandDialog } from "./NewBrandDialog";
import { useStore, nextId } from "../../state/store";
import { FEEDLY_BRAND, extractedBrand, type Brand } from "../../data/brand";

const CREATE = "Create new brand";

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
  const { updateBrand, addBrand, addOrgItem, toast, brands: allBrands } = useStore();
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
      <div style={{ flex: 1, minWidth: 0 }}>
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
              ? [...brands.map((b) => b.name), CREATE]
              : ["No brand", ...brands.map((b) => b.name)]
          }
          renderOption={(o) =>
            o === CREATE ? (
              <span className="row create-brand-opt" style={{ gap: 8 }}>
                <Icon name="plus" size={16} />
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
