import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Popover } from "../ui/primitives";
import { ImageSource } from "./ImageSource";
import { COVER_BACKGROUND, bandImage, type Brand, type PageBand } from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version C — the band's "Background" menu
 *
 * Figma "Beginner's Flow" 5–7: one button on the band's floating toolbar opens
 * a panel with two tabs. "Color fill" is a picker (none, a saturation and
 * brightness square, a hue bar, and the hex); "Image" is a drop zone that
 * turns into the picked image with "Remove image" under it.
 * ------------------------------------------------------------------ */

type Hsv = { h: number; s: number; v: number };

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { h: 0, s: 0, v: 1 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** A drag that keeps reporting while the pointer is held, inside a box. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const start = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const report = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      onMove(
        Math.min(1, Math.max(0, (cx - r.left) / r.width)),
        Math.min(1, Math.max(0, (cy - r.top) / r.height))
      );
    };
    report(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => report(ev.clientX, ev.clientY);
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  return { ref, start };
}

export function HsvPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [text, setText] = useState(value);
  /* Follow a value set from outside (the "none" swatch, say) without fighting
     the drag that is setting it. */
  const own = useRef(value);
  useEffect(() => {
    if (value !== own.current && /^#[0-9a-f]{6}$/i.test(value)) {
      setHsv(hexToHsv(value));
      setText(value);
      own.current = value;
    }
  }, [value]);

  const push = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    own.current = hex;
    setText(hex);
    onChange(hex);
  };

  const sv = useDrag((x, y) => push({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => push({ ...hsv, h: Math.min(359.9, x * 360) }));

  return (
    <div className="hsv">
      <div
        ref={sv.ref}
        className="hsv-square"
        style={{ background: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={sv.start}
      >
        <span className="hsv-white" />
        <span className="hsv-black" />
        <span
          className="hsv-thumb"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div ref={hue.ref} className="hsv-hue" onPointerDown={hue.start}>
        <span className="hsv-hue-thumb" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
      <input
        className="input hsv-hex"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          setText(v);
          const hex = v.startsWith("#") ? v : `#${v}`;
          if (/^#[0-9A-F]{6}$/.test(hex)) {
            own.current = hex;
            setHsv(hexToHsv(hex));
            onChange(hex);
          }
        }}
      />
    </div>
  );
}

export function BackgroundPopover({
  anchorRef,
  band,
  brand,
  onClose,
  onChange,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  band: PageBand;
  brand?: Brand;
  onClose: () => void;
  onChange: (patch: Partial<PageBand>) => void;
}) {
  const image = bandImage(band, brand);
  const [tab, setTab] = useState<"color" | "image">(image ? "image" : "color");
  const none = band.background === "transparent";

  return (
    <Popover anchorRef={anchorRef} onClose={onClose} width={264} className="menu bgp">
      <div className="bgp-tabs">
        <button className={`bgp-tab ${tab === "color" ? "on" : ""}`} onClick={() => setTab("color")}>
          <span
            className={`bgp-tab-swatch ${none ? "transparent" : ""}`}
            style={none ? undefined : { background: band.background }}
          />
          Color fill
        </button>
        <button className={`bgp-tab ${tab === "image" ? "on" : ""}`} onClick={() => setTab("image")}>
          <Icon name="image" size={16} />
          Image
        </button>
      </div>

      {tab === "color" ? (
        <div className="bgp-body">
          <button
            className={`bgp-none ${none ? "on" : ""}`}
            title="No fill"
            onClick={() => onChange({ background: "transparent" })}
          />
          <HsvPicker
            value={none ? "#FFFFFF" : band.background}
            onChange={(hex) => onChange({ background: hex })}
          />
        </div>
      ) : image ? (
        <div className="bgp-body">
          <div className="bgp-preview" style={{ backgroundImage: `url("${image}")` }} />
          <Button
            onClick={() => onChange({ image: null, imageAsset: undefined })}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Remove image
          </Button>
        </div>
      ) : (
        <div className="bgp-body">
          {/* Version C: drag and drop or upload, then the brand's assets. The
              prototype's "Upload image" drops in the Feedly cover artwork. */}
          <ImageSource
            brand={brand}
            onUploadClick={() => onChange({ image: COVER_BACKGROUND, imageAsset: undefined })}
            onFile={(src) => onChange({ image: src, imageAsset: undefined })}
            onAsset={(a) => onChange({ image: null, imageAsset: a.id })}
          />
        </div>
      )}
    </Popover>
  );
}
