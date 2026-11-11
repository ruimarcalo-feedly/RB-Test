import { useEffect, useMemo, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { AlignedSideMenu } from "../editor/AlignedSideMenu";
import { BrandFilePanelController } from "../editor/BrandFilePanel";
import { useCreateBlockNote } from "@blocknote/react";
import { schema, type TemplateBlock } from "../editor/blockSchema";
import { docBlocksFor, type DocInsert } from "../editor/BlockNoteCanvas";
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
  insertRef,
}: {
  title: string;
  meta: string[];
  nodes: DocNode[];
  editable: boolean;
  /** Version C: building blocks dragged from the Design tab land where dropped. */
  insertRef?: React.MutableRefObject<((what: DocInsert, clientY: number) => boolean) | null>;
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

  useEffect(() => {
    if (!insertRef) return;
    insertRef.current = (what, clientY) => {
      if (!editable) return false;
      const made =
        typeof what === "string"
          ? docBlocksFor(what)
          : ([{ type: "image", props: { url: what.image, name: what.name, caption: "" } }] as TemplateBlock[]);
      if (!made) return false;
      const doc = editor.document as { id: string }[];
      if (!doc.length) return false;
      let ref = doc[doc.length - 1];
      let placement: "before" | "after" = "after";
      for (const b of doc) {
        const el = document.querySelector(`.report-doc [data-id="${b.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY < r.top + r.height / 2) {
          ref = b;
          placement = "before";
          break;
        }
      }
      editor.insertBlocks(made as never, ref, placement);
      return true;
    };
    return () => {
      insertRef.current = null;
    };
  }, [editor, insertRef, editable]);

  return (
    <BlockNoteView editor={editor} editable={editable} theme="light" slashMenu={editable} sideMenu={false} filePanel={false}>
      {editable && <AlignedSideMenu />}
      {editable && <BrandFilePanelController />}
    </BlockNoteView>
  );
}
