import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type PartialBlockNoDefaults,
} from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { Icon } from "../ui/Icon";

/**
 * The template canvas is a BlockNote document, so the editor gets Notion's
 * controls — drag handles, the `+` button, the slash menu, selection
 * formatting — instead of hand-rolled equivalents.
 *
 * Two things the stock schema does not have:
 *
 * - **prompt** — the grey AI-prompt box under a section heading. It is the
 *   instruction the report is generated from, not prose, so it gets its own
 *   block type rather than a styled paragraph.
 * - **parameter** — the inline `{ } Name ×` chip. An atom: it cannot be typed
 *   into or split, and it carries the parameter's name as a prop, which is what
 *   lets a parameter be renamed or removed everywhere at once.
 * - **divider** — a rule across the column. The stock schema has no such block,
 *   and the brand's "Dividers" colour has to land on something.
 */

export const Parameter = createReactInlineContentSpec(
  {
    type: "parameter",
    propSchema: { name: { default: "Parameter" } },
    content: "none",
  },
  {
    render: (props) => (
      <span className="param-chip" data-param={props.inlineContent.props.name}>
        <Icon name="braces" size={16} />
        {props.inlineContent.props.name}
        {props.editor.isEditable && (
          /* Figma V2 "ParameterBadge": the × takes this one chip out of the
             template. The parameter itself stays in the Parameters tab; the
             trash there is what removes it everywhere. */
          <button
            className="param-chip-x"
            title="Remove from here"
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              const chip = (e.currentTarget as HTMLElement).closest(".param-chip");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const view = (props.editor as any)._tiptapEditor?.view;
              if (!chip || !view) return;
              let at = -1;
              let size = 1;
              view.state.doc.descendants((node: { type: { name: string }; nodeSize: number }, pos: number) => {
                if (at >= 0 || node.type.name !== "parameter") return;
                const dom = view.nodeDOM(pos) as Node | null;
                if (dom && (dom === chip || dom.contains(chip))) {
                  at = pos;
                  size = node.nodeSize;
                }
              });
              if (at >= 0) view.dispatch(view.state.tr.delete(at, at + size));
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </span>
    ),
  }
);

export const Prompt = createReactBlockSpec(
  {
    type: "prompt",
    propSchema: {},
    content: "inline",
  },
  {
    render: (props) => (
      <div className="prompt-box">
        <span className="bn-inline" ref={props.contentRef} />
      </div>
    ),
  }
);

export const Divider = createReactBlockSpec(
  {
    type: "divider",
    propSchema: {},
    content: "none",
  },
  {
    render: () => <hr className="doc-rule" />,
  }
);

/* createReactBlockSpec returns a factory, so the spec is the call. */
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, prompt: Prompt(), divider: Divider() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, parameter: Parameter },
});

export type TemplateSchema = typeof schema;

/** A block in *our* schema — the stock `PartialBlock` only knows the default
 *  block types and rejects `prompt`. */
export type TemplateBlock = PartialBlockNoDefaults<
  TemplateSchema["blockSchema"],
  TemplateSchema["inlineContentSchema"],
  TemplateSchema["styleSchema"]
>;
