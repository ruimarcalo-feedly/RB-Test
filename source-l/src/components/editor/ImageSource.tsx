import { createContext, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Tip } from "../ui/primitives";
import type { Brand, BrandAsset } from "../../data/brand";

/** The brand in play wherever an image can be added (report or template). */
export const BrandContext = createContext<Brand | undefined>(undefined);

/**
 * Version C — where an image comes from: drag and drop or upload, and under
 * that the brand's own assets, so the logo or background is one click away.
 * Used for band backgrounds, image slots in a header or footer, and image
 * blocks in the document.
 */
export function ImageSource({
  brand,
  onFile,
  onAsset,
  onUploadClick,
  selectedAssetId,
}: {
  brand?: Brand;
  onFile: (dataUrl: string, name: string) => void;
  onAsset: (a: BrandAsset) => void;
  /** Overrides the file picker (the prototype's background shortcut). */
  onUploadClick?: () => void;
  selectedAssetId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const read = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onFile(String(r.result), f.name.replace(/\.[^.]+$/, ""));
    r.readAsDataURL(f);
  };
  const assets = brand?.assets ?? [];
  return (
    <div className="img-src">
      <div
        className={`bgp-drop ${over ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          read(e.dataTransfer.files[0]);
        }}
      >
        <Icon name="image" size={22} style={{ color: "var(--content-light)" }} />
        <span className="t-body3 muted">Drag and drop or</span>
        <Button size="sm" onClick={() => (onUploadClick ? onUploadClick() : input.current?.click())}>
          Upload image
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/svg+xml"
          hidden
          onChange={(e) => {
            read(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {assets.length > 0 && (
        <div className="img-src-assets">
          <div className="img-src-label">Brand images</div>
          <div className="img-src-grid">
            {assets.map((a) => (
              <Tip key={a.id} label={a.name}>
                <button
                  className={`img-src-tile ${a.id === "logo" ? "logo" : "art"} ${
                    selectedAssetId === a.id ? "on" : ""
                  }`}
                  aria-label={`Use ${a.name}`}
                  onClick={() => onAsset(a)}
                >
                  <img src={a.src} alt="" />
                </button>
              </Tip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
