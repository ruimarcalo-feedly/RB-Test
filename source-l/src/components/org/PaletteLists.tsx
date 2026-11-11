import { Icon } from "../ui/Icon";
import { brandPalettes, type Brand, type BrandPalettes } from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version F (Nov 5) — the brand's colors as three lists
 *
 * The brand no longer decides which color goes on which text or structure
 * (a theme does that). It only keeps its colors: primary, secondary and
 * neutral, as many of each as needed.
 * ------------------------------------------------------------------ */

const GROUPS: { key: keyof BrandPalettes; label: string; help: string }[] = [
  { key: "primary", label: "Primary colors", help: "The colors the brand is known for." },
  { key: "secondary", label: "Secondary colors", help: "Supporting colors and accents." },
  { key: "neutral", label: "Neutral colors", help: "Text, backgrounds, lines and other quiet colors." },
];

export function PaletteLists({ brand, onChange }: { brand: Brand; onChange: (p: BrandPalettes) => void }) {
  const pal = brandPalettes(brand);
  const set = (k: keyof BrandPalettes, list: string[]) => onChange({ ...pal, [k]: list });
  return (
    <div className="pal-lists">
      {GROUPS.map((g) => (
        <div className="pal-group" key={g.key}>
          <div className="pal-head">
            <span className="pal-label">{g.label}</span>
            <span className="pal-help">{g.help}</span>
          </div>
          <div className="pal-row">
            {pal[g.key].map((c, i) => (
              <span className="pal-item" key={`${g.key}${i}`}>
                <label className="pal-swatch" style={{ background: c }} title={c.toUpperCase()}>
                  <input
                    type="color"
                    value={c}
                    aria-label={`${g.label} ${i + 1}`}
                    onChange={(e) => set(g.key, pal[g.key].map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
                  />
                </label>
                <span className="pal-hex">{c.toUpperCase()}</span>
                {pal[g.key].length > 1 && (
                  <button
                    className="pal-x"
                    title="Remove color"
                    onClick={() => set(g.key, pal[g.key].filter((_, j) => j !== i))}
                  >
                    <Icon name="close" size={10} />
                  </button>
                )}
              </span>
            ))}
            <button className="pal-add" title="Add a color" onClick={() => set(g.key, [...pal[g.key], "#BDBDBD"])}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
