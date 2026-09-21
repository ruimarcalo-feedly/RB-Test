import { useState } from "react";
import { Button, Checkbox, Field, Modal, Select } from "../ui/primitives";
import type { Parameter } from "../../data/mockData";
import { nextId } from "../../state/store";

const TYPES: Parameter["type"][] = ["Org Profile", "Free text", "Date"];

const TYPE_HELP: Record<Parameter["type"], string> = {
  "Org Profile":
    "An Org Profile type will suggest items stored in the Org Profile when you are creating your report.",
  "Free text": "A Free text type asks for a written answer when you are creating your report.",
  Date: "A Date type asks for a date or date range when you are creating your report.",
};

/**
 * Add / Edit parameter dialog.
 * Figma: Parameters — Editing 2, Create new prompt — From Canvas 3, Add parameter — From Sidebar.
 */
export function ParameterDialog({
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "add" | "edit";
  initial?: Partial<Parameter>;
  onClose: () => void;
  onSave: (p: Parameter) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<Parameter["type"]>(initial?.type ?? "Org Profile");
  const [optional, setOptional] = useState(initial?.optional ?? false);

  const valid = name.trim().length > 0 && description.trim().length > 0;

  return (
    <Modal
      title={mode === "add" ? "Add parameter" : "Edit parameter"}
      width={540}
      onClose={onClose}
      footer={
        mode === "add" ? (
          <>
            <Button onClick={onClose}>Dismiss</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() =>
                onSave({
                  id: initial?.id ?? nextId("p"),
                  name: name.trim(),
                  description: description.trim(),
                  type,
                  optional,
                })
              }
            >
              Add parameter
            </Button>
          </>
        ) : (
          <>
            <Button variant="danger-link" onClick={onDelete} style={{ marginRight: "auto" }}>
              Delete parameter
            </Button>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() =>
                onSave({
                  id: initial?.id ?? nextId("p"),
                  name: name.trim(),
                  description: description.trim(),
                  type,
                  optional,
                })
              }
            >
              Save changes
            </Button>
          </>
        )
      }
    >
      <Field label="Name" required>
        <input
          className="input"
          value={name}
          autoFocus
          placeholder="e.g. Tech Stack"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        label="Description"
        required
        footNote={`You've entered ${description.length} of 10,000 characters.`}
        footNoteSize="md"
      >
        <textarea
          className="textarea"
          rows={2}
          value={description}
          placeholder="Describe what this parameter is about in detail"
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Type" footNote={TYPE_HELP[type]}>
        <Select block value={type} options={TYPES} onChange={(v) => setType(v as Parameter["type"])} />
      </Field>
      <Checkbox checked={optional} onChange={setOptional} label="Mark parameter as optional" />
    </Modal>
  );
}
