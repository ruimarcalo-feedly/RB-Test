import { createContext, useContext, useRef, useState } from "react";
import { FormattingToolbar, getFormattingToolbarItems, useBlockNoteEditor } from "@blocknote/react";
import { Popover } from "../ui/primitives";
import { brandSwatches, type Brand } from "../../data/brand";

/* ------------------------------------------------------------------ *
 * Version G (Nov 4) — recoloring text on the canvas
 *
 * The text toolbar's color button offers the brand's palette, and what it
 * changes depends on where you are:
 *   - Template editor ("style"): the color goes on the style, so every block
 *     of that type (all Heading 2s, all paragraphs) changes, and the change
 *     waits in the Styles tab's "Update brand" bar.
 *   - Report editor ("instance"): the color goes on the selected text only.
 *     The brand's styles are left alone.
 * ------------------------------------------------------------------ */

export type RecolorKey = "h1" | "h2" | "h3" | "h4" | "paragraph";

export type Recolor = {
  mode: "style" | "instance";
  brand?: Brand;
  onStyle?: (key: RecolorKey, color: string) => void;
};

export const RecolorContext = createContext<Recolor | null>(null);

const LABEL: Record<RecolorKey, string> = {
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  paragraph: "Paragraph",
};

/** BlockNote's toolbar, with its color button swapped for the brand's. */
export function RecolorToolbar() {
  const ctx = useContext(RecolorContext);
  const items = getFormattingToolbarItems().filter((el) => el.key !== "colorStyleButton");
  return (
    <FormattingToolbar>
      {items}
      {ctx && <BrandColorButton key="brandColorButton" ctx={ctx} />}
    </FormattingToolbar>
  );
}

function keyFor(block: { type: string; props?: { level?: number } }): RecolorKey | null {
  if (block.type === "heading") {
    const l = block.props?.level ?? 1;
    return l >= 1 && l <= 4 ? (`h${l}` as RecolorKey) : null;
  }
  if (["paragraph", "bulletListItem", "numberedListItem", "checkListItem"].includes(block.type)) return "paragraph";
  return null;
}

function BrandColorButton({ ctx }: { ctx: Recolor }) {
  const editor = useBlockNoteEditor();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  if (!ctx.brand) return null;
  const sw = brandSwatches(ctx.brand);
  const palette = [
    { c: sw.primary, label: "Primary" },
    { c: sw.secondary, label: "Secondary" },
    { c: sw.tertiary, label: "Tertiary" },
    { c: sw.background, label: "Background" },
    ...sw.more.map((c, i) => ({ c, label: `Color ${i + 5}` })),
  ];
  const block = editor.getTextCursorPosition().block as unknown as { type: string; props?: { level?: number } };
  const key = keyFor(block);
  const style = ctx.mode === "style";
  if (style && !key) return null;
  const active = (editor.getActiveStyles() as Record<string, unknown>).brandColor as string | undefined;
  const current = style && key ? ctx.brand.colors[key] : active ?? (key ? ctx.brand.colors[key] : undefined);

  return (
    <>
      <button
        ref={ref}
        className={`rc-btn ${open ? "on" : ""}`}
        title={style && key ? `Color every ${LABEL[key]}` : "Text color"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rc-a">A</span>
        <span className="rc-bar" style={{ background: current ?? "#333333" }} />
      </button>
      {open && (
        <Popover anchorRef={ref} onClose={() => setOpen(false)} width={232} className="menu rc-pop">
          <div className="rc-head">{style && key ? `Every ${LABEL[key]}` : "This text only"}</div>
          <div className="rc-help">
            {style
              ? "Changes the style, so every block of this type in the brand changes."
              : "Colors the selected text. The brand's styles stay as they are."}
          </div>
          <div className="bd-swatches rc-swatches">
            {palette.map((p, i) => (
              <button
                key={`${p.label}${i}`}
                className={`bd-swatch ${current && p.c.toUpperCase() === current.toUpperCase() ? "on" : ""}`}
                style={{ background: p.c }}
                title={`${p.label} ${p.c}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (style && key) ctx.onStyle?.(key, p.c);
                  else editor.addStyles({ brandColor: p.c } as never);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          {!style && active && (
            <button
              className="rc-reset"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.removeStyles({ brandColor: active } as never);
                setOpen(false);
              }}
            >
              Back to the style&rsquo;s color
            </button>
          )}
        </Popover>
      )}
    </>
  );
}
