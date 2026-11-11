import { useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, Modal } from "../ui/primitives";

/**
 * Edit / Add Audience dialog.
 * Figma: Template Editor — Audiences 3 & 4, Org Profile — Creating new 3.
 */
export function AudienceDialog({
  mode,
  name: initialName,
  content: initialContent,
  canRevert,
  onClose,
  onSave,
  onRevert,
  itemLabel = "Audience",
  namePlaceholder = "e.g. CISO",
  contentPlaceholder = "Who you're writing for, so intel products land at the right level of detail. For example: the SOC, an exec briefing, or a vulnerability owner.",
}: {
  mode: "add" | "edit";
  name?: string;
  content?: string;
  canRevert?: boolean;
  onClose: () => void;
  onSave: (name: string, content: string) => void;
  onRevert?: () => void;
  itemLabel?: string;
  namePlaceholder?: string;
  contentPlaceholder?: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const dirty = mode === "add" ? name.trim() && content.trim() : content !== (initialContent ?? "");

  return (
    <Modal
      title={`${mode === "add" ? "Add" : "Edit"} ${itemLabel}`}
      width={470}
      onClose={onClose}
      footer={
        <>
          {mode === "edit" && (
            <Button
              variant={canRevert ? "outline-danger" : "default"}
              icon="history"
              disabled={!canRevert}
              onClick={onRevert}
              style={{ marginRight: "auto" }}
            >
              Revert to default
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={dirty ? "primary" : "default"}
            disabled={!dirty}
            onClick={() => onSave(name.trim(), content)}
          >
            {mode === "add" ? "Add item" : "Save"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <input
          className="input"
          value={name}
          disabled={mode === "edit"}
          placeholder={namePlaceholder}
          autoFocus={mode === "add"}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Content" footNote="Up to 10,000 characters.">
        <textarea
          className="textarea"
          rows={9}
          value={content}
          placeholder={contentPlaceholder}
          onChange={(e) => setContent(e.target.value)}
        />
        <div style={{ marginTop: 8 }}>
          <button className="btn sm">
            <Icon name="doc" size={14} />
            Upload .md file
          </button>
        </div>
      </Field>
    </Modal>
  );
}
