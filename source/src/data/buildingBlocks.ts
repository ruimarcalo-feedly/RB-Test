import type { IconName } from "../components/ui/Icon";
import type { BandElementKind } from "./brand";

/**
 * The palette in the Design tab — Figma "Building blocks".
 *
 * One list, shared by the panel that offers the blocks and by the two places
 * that accept them, so a tile cannot be draggable into somewhere that does not
 * know what to do with it. Each block says where it is allowed to land:
 *
 * - `doc` — it is a block in the document body.
 * - `band` — the header/footer element it becomes, for the blocks that are page
 *   furniture rather than content.
 *
 * A few belong to only one of the two. A logo or a page count is furniture and
 * has no meaning in the middle of a section; a table or a code block is content
 * and does not fit in a band's slot.
 */
export interface BuildingBlock {
  label: string;
  icon: IconName;
  /** Can be dropped into the document body. */
  doc: boolean;
  /** The band element it becomes when dropped into a header or footer. */
  band?: BandElementKind;
}

export const BUILDING_BLOCKS: BuildingBlock[] = [
  { label: "Heading 1", icon: "h1", doc: true },
  { label: "Heading 2", icon: "h2", doc: true },
  { label: "Heading 3", icon: "h3", doc: true, band: "h3" },
  { label: "Heading 4", icon: "h4", doc: true, band: "h4" },
  { label: "Paragraph", icon: "paragraph", doc: true, band: "paragraph" },
  { label: "Divider", icon: "divider", doc: true },
  { label: "Code block", icon: "code", doc: true },
  { label: "Image", icon: "image", doc: true, band: "image" },
  { label: "Table", icon: "table", doc: true },
  { label: "Callout", icon: "callout", doc: true },
  { label: "TLP badge", icon: "tlp-badge", doc: false, band: "tlp" },
  { label: "Page count", icon: "page-count", doc: false, band: "pageCount" },
  { label: "Logo", icon: "logo", doc: false, band: "logo" },
];

/**
 * The drag's own media type. A private type rather than `text/plain` so that
 * dragging text in from elsewhere is not mistaken for a block, and so a drop
 * target can tell during `dragover` whether it should accept.
 */
export const BLOCK_MIME = "application/x-rb-block";

export function blockByLabel(label: string): BuildingBlock | undefined {
  return BUILDING_BLOCKS.find((b) => b.label === label);
}

/**
 * What a drag is carrying, read during `dragover`.
 *
 * The payload itself is only readable on drop, so the label rides in the media
 * type as well — `application/x-rb-block:heading 1` — which is the usual way
 * to let a target decide whether to accept before it can see the data.
 */
export function dragLabel(dt: DataTransfer | null): string | null {
  if (!dt) return null;
  const types = Array.from(dt.types);
  /* The labelled type first: the bare one only says "this is a block", which
     is not enough for a target that accepts some blocks and not others. */
  const labelled = types.find((t) => t.startsWith(`${BLOCK_MIME}:`));
  if (labelled) return labelled.slice(BLOCK_MIME.length + 1);
  return types.includes(BLOCK_MIME) ? "" : null;
}

/** Sets both the payload and the label-carrying type on a starting drag. */
export function setBlockDrag(dt: DataTransfer, label: string) {
  dt.setData(BLOCK_MIME, label);
  dt.setData(`${BLOCK_MIME}:${label.toLowerCase()}`, "");
  dt.effectAllowed = "copy";
}

/** Reads the dropped block, by payload first and by the typed label after. */
export function readBlockDrag(dt: DataTransfer | null): BuildingBlock | undefined {
  if (!dt) return undefined;
  const direct = dt.getData(BLOCK_MIME);
  if (direct) return blockByLabel(direct);
  const typed = dragLabel(dt);
  if (!typed) return undefined;
  return BUILDING_BLOCKS.find((b) => b.label.toLowerCase() === typed);
}
