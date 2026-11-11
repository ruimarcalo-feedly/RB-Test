import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Select, layerStack } from "../ui/primitives";
import {
  BRAND_FONTS,
  allFonts,
  brandLogo,
  brandTokens,
  withTokens,
  type Brand,
  type BrandTokens,
} from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version E — the brand panel, simplified
 *
 * A brand is a logo, one font and a palette: primary, accent and background,
 * then as many secondary colors as needed. Nothing else. Headers and footers
 * are designed in the report, with these.
 * ------------------------------------------------------------------ */

const today = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function SimpleBrandPeek({
  brand,
  onClose,
  onSave,
  creating,
}: {
  brand: Brand;
  onClose: () => void;
  onSave: (b: Brand) => void;
  creating?: boolean;
  autofill?: Brand;
  fresh?: boolean;
}) {
  const [name, setName] = useState(brand.name);
  const [font, setFont] = useState(brand.font);
  const [tokens, setTokens] = useState<BrandTokens>(() => brandTokens(brand));
  const [logo, setLogo] = useState<string | undefined>(() => brandLogo(brand)?.src);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layerStack.count === 0) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    const others = brand.assets.filter((a) => a.id !== "logo");
    const assets = logo
      ? [{ id: "logo", name: "Logo", src: logo, uploaded: today() }, ...others]
      : others;
    const next = withTokens(
      {
        ...brand,
        name: name.trim() || brand.name,
        font,
        fonts: allFonts(font),
        assets,
        slots: brand.slots ? { ...brand.slots, logoDark: logo } : brand.slots,
      },
      tokens
    );
    onSave(next);
  };

  const set = (k: "primary" | "accent" | "background") => (v: string) => setTokens((t) => ({ ...t, [k]: v }));

  return (
    <div className="peek-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="peek brand-peek sbp">
        <button className="btn ghost icon sm peek-close" onClick={onClose} title="Close">
          <Icon name="close" size={18} />
        </button>
        <div className="peek-scroll">
          <div className="peek-title">
            <div>
              <div className="t-body3 muted">{creating ? "New brand" : "Brand"}</div>
              {creating ? (
                <input
                  className="brand-name-input t-h2"
                  value={name}
                  placeholder="Brand name"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              ) : (
                <h2 className="t-h2" style={{ margin: "2px 0 0" }}>
                  {name}
                </h2>
              )}
            </div>
          </div>

          <section className="sbp-sec">
            <h3 className="t-h3">Logo</h3>
            <p className="t-body3 muted">Shown wherever a header or footer places the logo.</p>
            <div className="sbp-logo">
              <span className="sbp-logo-pic">
                {logo ? <img src={logo} alt="" /> : <span className="muted">No logo</span>}
              </span>
              <Button onClick={() => file.current?.click()}>{logo ? "Replace" : "Upload logo"}</Button>
              {logo && (
                <Button variant="ghost" onClick={() => setLogo(undefined)}>
                  Remove
                </Button>
              )}
              <input
                ref={file}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setLogo(String(r.result));
                  r.readAsDataURL(f);
                }}
              />
            </div>
          </section>

          <section className="sbp-sec">
            <h3 className="t-h3">Font</h3>
            <p className="t-body3 muted">Used for every heading and paragraph.</p>
            <div style={{ maxWidth: 320 }}>
              <Select block value={font} options={BRAND_FONTS} onChange={setFont} />
            </div>
          </section>

          <section className="sbp-sec">
            <h3 className="t-h3">Colors</h3>
            <p className="t-body3 muted">
              The palette headers and footers can use. Add as many secondary colors as you need.
            </p>
            <div className="sbp-palette">
              <Chip label="Primary" value={tokens.primary} onChange={set("primary")} />
              <Chip label="Accent" value={tokens.accent} onChange={set("accent")} />
              <Chip label="Background" value={tokens.background} onChange={set("background")} />
              <span className="sbp-div" />
              {tokens.secondary.map((c, i) => (
                <Chip
                  key={i}
                  label={`Secondary ${i + 1}`}
                  value={c}
                  onChange={(v) =>
                    setTokens((t) => ({ ...t, secondary: t.secondary.map((x, j) => (j === i ? v : x)) }))
                  }
                  onRemove={() =>
                    setTokens((t) => ({ ...t, secondary: t.secondary.filter((_, j) => j !== i) }))
                  }
                />
              ))}
              <button
                className="sbp-add"
                title="Add a secondary color"
                onClick={() => setTokens((t) => ({ ...t, secondary: [...t.secondary, "#BDBDBD"] }))}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          </section>
        </div>
        <div className="peek-foot">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={creating && !name.trim()} onClick={save}>
            {creating ? "Create brand" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One square of the palette: click it to pick the color. */
function Chip({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}) {
  return (
    <span className="sbp-chip">
      <label className="sbp-square" style={{ background: value }} title={`${label} ${value}`}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        {onRemove && (
          <button
            className="sbp-x"
            aria-label={`Remove ${label}`}
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
          >
            <Icon name="close" size={10} />
          </button>
        )}
      </label>
      <span className="sbp-chip-label">{label}</span>
      <span className="sbp-chip-hex">{value.toUpperCase()}</span>
    </span>
  );
}
