import { useEffect, useMemo, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { schema, type TemplateBlock } from "../editor/blockSchema";
import type { DocNode } from "../../data/reportDoc";

/**
 * The written report, rendered through BlockNote — the same editor the
 * template canvas uses, so a finished report is editable in place with the
 * Notion controls rather than being a read-only render.
 *
 * It is locked while the report is still being written and unlocked once it is
 * finished, which is the only state the editor cares about.
 */

function nodesToBlocks(title: string, meta: string[], nodes: DocNode[]): TemplateBlock[] {
  const out: TemplateBlock[] = [
    { type: "heading", props: { level: 1 }, content: title },
  ];
  /* TLP, date and distribution sit under the title as one quiet block. */
  for (const line of meta) {
    out.push({ type: "paragraph", props: { textColor: "gray" }, content: line });
  }

  for (const n of nodes) {
    if (n.k === "h2") out.push({ type: "heading", props: { level: 2 }, content: n.text });
    else if (n.k === "h3") out.push({ type: "heading", props: { level: 3 }, content: n.text });
    else if (n.k === "p") out.push({ type: "paragraph", content: n.text });
    else if (n.k === "ul")
      out.push(...n.items.map((t) => ({ type: "bulletListItem", content: t }) as TemplateBlock));
    else if (n.k === "ol")
      out.push(...n.items.map((t) => ({ type: "numberedListItem", content: t }) as TemplateBlock));
    else if (n.k === "table")
      out.push({
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          columnWidths: n.widths,
          rows: [n.head, ...n.rows].map((cells) => ({ cells })),
        },
      } as TemplateBlock);
  }
  return out;
}

export function ReportDocument({
  title,
  meta,
  nodes,
  editable,
}: {
  title: string;
  meta: string[];
  nodes: DocNode[];
  editable: boolean;
}) {
  const initialContent = useMemo(
    () => nodesToBlocks(title, meta, nodes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const editor = useCreateBlockNote({ schema, initialContent });

  const first = useRef(true);
  useEffect(() => {
    /* The document is rebuilt when the report is regenerated, not patched. */
    if (first.current) {
      first.current = false;
      return;
    }
    editor.replaceBlocks(editor.document, nodesToBlocks(title, meta, nodes) as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, title]);

  return (
    <BlockNoteView editor={editor} editable={editable} theme="light" slashMenu={editable} />
  );
}
