import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Select, layerStack } from "../ui/primitives";
import { BrandPeek } from "./BrandPeek";
import { useStore } from "../../state/store";
import type { Brand } from "../../data/brand";

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
}: {
  brands: Brand[];
  brandId?: string;
  onPick: (id: string | undefined) => void;
  disabled?: boolean;
}) {
  const { updateBrand, toast } = useStore();
  const [editing, setEditing] = useState(false);
  const brand = brands.find((b) => b.id === brandId);

  /* Escape closes the brand panel and nothing behind it. Caught on the way
     down, before the template or report editor underneath sees the key. */
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || layerStack.count > 0) return;
      e.stopPropagation();
      setEditing(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing]);

  return (
    <div className="row brand-picker" style={{ gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Select
          block
          icon="brand"
          disabled={disabled}
          value={brand?.name}
          placeholder="No brand"
          options={["No brand", ...brands.map((b) => b.name)]}
          onChange={(name) =>
            onPick(name === "No brand" ? undefined : brands.find((b) => b.name === name)?.id)
          }
        />
      </div>
      <Button
        icon="pencil"
        title={brand ? `Edit ${brand.name}` : "Pick a brand to edit it"}
        disabled={!brand || disabled}
        onClick={() => setEditing(true)}
      />
      {editing &&
        brand &&
        createPortal(
          <BrandPeek
            brand={brand}
            onClose={() => setEditing(false)}
            onSave={(b) => {
              updateBrand(b.id, b);
              setEditing(false);
              toast("Brand styles were successfully saved");
            }}
          />,
          document.body,
        )}
    </div>
  );
}
