import { useEffect, useRef, useState } from "react";

/**
 * Figma: a colour row in the brand peek and the Design tab — a label, then a
 * swatch and its hex in one bordered well. The swatch is a real colour input,
 * so picking a colour and typing a hex are the same control rather than two.
 */
export function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  /** Left off inside a table, where the row already names the setting. */
  label?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  /* The hex is edited as text, so it has to survive being half-typed. It is
     only pushed up once it parses as a colour. */
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  const commit = (v: string) => {
    setText(v);
    const hex = v.startsWith("#") ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toUpperCase());
  };

  return (
    <div className="color-row">
      {label && <span className="color-label">{label}</span>}
      <div className={`color-well ${disabled ? "disabled" : ""}`}>
        <span className="color-swatch" style={{ background: value }}>
          <input
            type="color"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label ?? "Colour"} colour`}
          />
        </span>
        <input
          className="color-hex"
          value={text}
          disabled={disabled}
          spellCheck={false}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(value);
          }}
          onChange={(e) => commit(e.target.value)}
        />
      </div>
    </div>
  );
}
