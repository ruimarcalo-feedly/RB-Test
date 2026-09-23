import { useEffect, useMemo, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { schema, type TemplateBlock } from "./blockSchema";
import type { Block, Parameter } from "../../data/mockData";
import { nextId } from "../../state/store";

/* ------------------------------------------------------------------ *
 * Our template model <-> a BlockNote document
 *
 * The stored shape is a list of sections, each a heading plus the prompts
 * under it. A BlockNote document is flat, so a heading opens a section and
 * every prompt block until the next heading belongs to it.
 * ------------------------------------------------------------------ */

/** `{{Name}}` markers become parameter chips; the rest stays plain text. */
function promptToInline(text: string) {
  return text
    .split(/(\{\{[^}]+\}\})/g)
    .filter((p) => p !== "")
    .map((p) => {
      const m = p.match(/^\{\{([^}]+)\}\}$/);
      return m
        ? ({ type: "parameter", props: { name: m[1] } } as const)
        : ({ type: "text", text: p, styles: {} } as const);
    });
}

function inlineToPrompt(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c: { type: string; text?: string; props?: { name?: string } }) =>
      c.type === "parameter" ? `{{${c.props?.name ?? ""}}}` : (c.text ?? "")
    )
    .join("");
}

/**
 * A rule and a small table close the document.
 *
 * They are what the brand's two **Structure** colours land on — a template made
 * only of headings and prompts gives "Dividers" and "Table" nothing to colour,
 * so the palette would have fields that appear to do nothing. They are part of
 * the document rather than a swatch in the panel, because that is where the
 * reader has to judge them.
 */
function structureBlocks(): TemplateBlock[] {
  return [
    { type: "divider" },
    {
      type: "table",
      content: {
        type: "tableContent",
        headerRows: 1,
        columnWidths: [300, 300, 300],
        rows: [
          { cells: ["Field", "Value", "Source"] },
          { cells: ["Severity", "From the CVE record", "NVD"] },
          { cells: ["Patch status", "From the vendor advisory", "Vendor"] },
        ],
      },
    } as TemplateBlock,
  ];
}

export function toDocument(title: string, blocks: Block[]): TemplateBlock[] {
  const doc: TemplateBlock[] = [
    { type: "heading", props: { level: 1 }, content: title },
  ];
  for (const b of blocks) {
    doc.push({ type: "heading", props: { level: 2 }, content: b.heading });
    for (const p of b.prompts) {
      doc.push({ type: "prompt", content: promptToInline(p) });
    }
  }
  doc.push(...structureBlocks());
  return doc;
}

type DocBlock = { type: string; props?: Record<string, unknown>; content?: unknown };

export function fromDocument(doc: DocBlock[]): { title: string; blocks: Block[] } {
  let title = "Report title";
  const blocks: Block[] = [];
  let seenTitle = false;

  const plain = (content: unknown) =>
    Array.isArray(content)
      ? content.map((c: { text?: string }) => c.text ?? "").join("")
      : "";

  for (const b of doc) {
    const isHeading = b.type === "heading";
    const level = Number(b.props?.level ?? 2);

    if (isHeading && level === 1 && !seenTitle) {
      title = plain(b.content) || "Report title";
      seenTitle = true;
      continue;
    }
    if (isHeading) {
      blocks.push({ id: nextId("b"), heading: plain(b.content), prompts: [] });
      continue;
    }
    /* The rule and table at the foot of the document are the brand's, not the
       template's — they are re-appended on every mount, so they are not read
       back into the stored sections. */
    if (b.type === "divider" || b.type === "table") continue;
    /* Anything that is not a heading is an instruction for the section above
       it. A block typed before any heading starts an unnamed section. */
    const text = b.type === "prompt" ? inlineToPrompt(b.content) : plain(b.content);
    if (!text.trim()) continue;
    if (blocks.length === 0) blocks.push({ id: nextId("b"), heading: "", prompts: [] });
    blocks[blocks.length - 1].prompts.push(text);
  }
  return { title, blocks };
}

/* ------------------------------------------------------------------ */

/**
 * What each building block becomes in the document.
 *
 * The blocks that are page furniture — a logo, a page count, a TLP badge —
 * are absent on purpose: they belong to a band, so the document never accepts
 * one and this map is what says so.
 */
function docBlocksFor(label: string): TemplateBlock[] | null {
  switch (label) {
    case "Heading 1":
      return [{ type: "heading", props: { level: 1 }, content: "Heading 1" }];
    case "Heading 2":
      return [{ type: "heading", props: { level: 2 }, content: "Heading 2" }];
    case "Heading 3":
      return [{ type: "heading", props: { level: 3 }, content: "Heading 3" }];
    case "Heading 4":
      return [{ type: "heading", props: { level: 4 }, content: "Heading 4" }];
    case "Paragraph":
      return [{ type: "paragraph", content: "Paragraph" }];
    case "Divider":
      return [{ type: "divider" }];
    case "Code block":
      return [{ type: "codeBlock", content: "" } as TemplateBlock];
    case "Image":
      return [{ type: "image" } as TemplateBlock];
    case "Callout":
      return [{ type: "quote", content: "Callout" } as TemplateBlock];
    case "Table":
      return [
        {
          type: "table",
          content: {
            type: "tableContent",
            headerRows: 1,
            columnWidths: [300, 300, 300],
            rows: [
              { cells: ["Column 1", "Column 2", "Column 3"] },
              { cells: ["", "", ""] },
              { cells: ["", "", ""] },
            ],
          },
        } as TemplateBlock,
      ];
    default:
      return null;
  }
}

export function BlockNoteCanvas({
  title,
  blocks,
  readOnly,
  parameters,
  insertRef,
  onChange,
}: {
  title: string;
  blocks: Block[];
  readOnly: boolean;
  parameters: Parameter[];
  /**
   * Filled with a function that drops a building block into the document.
   * The editor owns its own content, so the page outside hands the drop in
   * rather than rewriting the document from the model.
   */
  insertRef?: React.MutableRefObject<((label: string, clientY: number) => boolean) | null>;
  onChange: (next: { title: string; blocks: Block[] }) => void;
}) {
  const initialContent = useMemo(
    () => toDocument(title, blocks),
    // Built once; after that the editor owns the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const editor = useCreateBlockNote({ schema, initialContent });

  /* The editor is the source of truth while it is open, so changes are pushed
     out rather than pulled back in. */
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    editor.isEditable = !readOnly;
  }, [editor, readOnly]);

  /* A block dropped on the page lands where it was dropped, so the drop reads
     as placement rather than as an append. The block under the cursor is found
     by its own position on screen, and the new one goes above or below it
     depending on which half was hit. */
  useEffect(() => {
    if (!insertRef) return;
    insertRef.current = (label, clientY) => {
      if (readOnly) return false;
      const made = docBlocksFor(label);
      if (!made) return false;
      const doc = editor.document as { id: string }[];
      if (!doc.length) return false;
      let ref = doc[doc.length - 1];
      let placement: "before" | "after" = "after";
      for (const b of doc) {
        const el = document.querySelector(`[data-id="${b.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY < r.top + r.height / 2) {
          ref = b;
          placement = "before";
          break;
        }
      }
      editor.insertBlocks(made, ref, placement);
      latest.current(fromDocument(editor.document as DocBlock[]));
      return true;
    };
    return () => {
      insertRef.current = null;
    };
  }, [editor, insertRef, readOnly]);

  /** Slash menu: the stock items, plus our own prompt block and the AI
      sections the Figma block menu offers. */
  const slashItems = async (query: string) => {
    const insert = (heading: string, text: string) => () => {
      const at = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [
          ...(heading
            ? [{ type: "heading", props: { level: 2 }, content: heading } as TemplateBlock]
            : []),
          { type: "prompt", content: promptToInline(text) } as TemplateBlock,
        ],
        at,
        "after"
      );
    };

    const own = [
      {
        title: "AI prompt",
        subtext: "An instruction the report is written from",
        group: "AI blocks",
        onItemClick: insert("", "Describe what this section should contain."),
      },
      {
        title: "Executive summary",
        subtext: "The BLUF opening",
        group: "AI blocks",
        onItemClick: insert(
          "Executive Summary",
          "The BLUF opening. Tell the reader the bottom-line answer in 2–4 sentences."
        ),
      },
      {
        title: "Threat actor analysis",
        subtext: "Who is behind it and how they operate",
        group: "AI blocks",
        onItemClick: insert(
          "Threat Actor Analysis",
          "Who is behind this activity, their known tradecraft, and what they are after."
        ),
      },
      ...parameters.map((p) => ({
        title: p.name,
        subtext: "Insert this parameter",
        group: "Parameters",
        onItemClick: () =>
          editor.insertInlineContent([
            { type: "parameter", props: { name: p.name } },
            " ",
          ]),
      })),
    ];

    const all = [...getDefaultReactSlashMenuItems(editor), ...own];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((i) => i.title.toLowerCase().includes(q));
  };

  return (
    <BlockNoteView
      editor={editor}
      editable={!readOnly}
      theme="light"
      slashMenu={false}
      onChange={() => latest.current(fromDocument(editor.document as DocBlock[]))}
    >
      <SuggestionMenuController triggerCharacter="/" getItems={slashItems} />
    </BlockNoteView>
  );
}
