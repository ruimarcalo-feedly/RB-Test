import { BrandPicker } from "../org/BrandPicker";
import type { Brand } from "../../data/brand";
import { brandThemes, defaultTheme, type ReportTheme } from "../../data/theme";
import { NewThemeCard, ThemeCard } from "./Themes";

/* ------------------------------------------------------------------ *
 * Version E (Brand Themes) — the report's Design tab
 *
 * The brand (with Edit, which opens the brand's panel), a full-width rule,
 * then the brand's themes as cards. Clicking a card applies it. Its pencil,
 * or "New theme", edits the theme right on the report: the page becomes
 * editable and the theme's styles open in a second sidebar.
 * ------------------------------------------------------------------ */

export function ThemePanel({
  brands,
  brandId,
  setBrandId,
  themeId,
  setThemeId,
  editingId,
  onEdit,
}: {
  brands: Brand[];
  brandId?: string;
  setBrandId: (id: string | undefined) => void;
  themeId?: string;
  setThemeId: (id: string) => void;
  /** The theme being edited on the report, if any. */
  editingId?: string;
  onEdit: (t: ReportTheme | "new") => void;
}) {
  const brand = brands.find((b) => b.id === brandId);
  const themes = brandThemes(brand);
  const def = defaultTheme(brand);
  const current = themes.find((t) => t.id === themeId) ?? def;
  const editing = editingId !== undefined;

  return (
    <div className={`side-scroll details-panel tp-panel ${editing ? "editing" : ""}`}>
      <div className="field-label" style={{ marginBottom: 8 }}>
        Brand
      </div>
      <BrandPicker brands={brands} brandId={brandId} onPick={setBrandId} />
      <div className="tp-sep" />

      {brand && (
        <>
          <div className="field-label tp-caption">Themes</div>
          <div className="theme-list">
            {themes.map((t) => (
              <ThemeCard
                key={t.id}
                theme={t}
                brand={brand}
                selected={editing ? editingId === t.id : current?.id === t.id}
                isDefault={def?.id === t.id}
                onClick={() => !editing && setThemeId(t.id)}
                onEdit={editing ? undefined : () => onEdit(t)}
              />
            ))}
            {!editing && <NewThemeCard onClick={() => onEdit("new")} />}
          </div>
        </>
      )}
    </div>
  );
}
