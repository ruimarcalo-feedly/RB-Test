import { useState } from "react";
import { Button, Checkbox, Field, Modal, Select } from "../ui/primitives";
import type { Parameter } from "../../data/mockData";
import { nextId } from "../../state/store";

const TYPES: Parameter["type"][] = ["Free text", "Org Profile", "Date"];

/* Figma "Add parameter" (Parameter Revision): free text is called "Open ended". */
const TYPE_LABEL: Record<Parameter["type"], string> = {
  "Free text": "Open ended",
  "Org Profile": "Org Profile",
  Date: "Date",
};
const TYPE_HELP =
  "Open ended lets you type any value when you create a report. An Org Profile type suggests items from your Org Profile.";

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
  const [type, setType] = useState<Parameter["type"]>(initial?.type ?? "Free text");
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
                  topic: initial?.topic,
                })
              }
            >
              Save parameter
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
                  topic: initial?.topic,
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
          placeholder="i.e CVE ID"
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
          rows={4}
          value={description}
          placeholder={"What this report will focus on.\ni.e. CVE IDs, Cyberattacks, TTPs, etc."}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Type" footNote={TYPE_HELP}>
        <Select
          block
          value={TYPE_LABEL[type]}
          options={TYPES.map((t) => TYPE_LABEL[t])}
          onChange={(v) => setType(TYPES.find((t) => TYPE_LABEL[t] === v) ?? "Free text")}
        />
      </Field>
      <Checkbox checked={optional} onChange={setOptional} label="Mark as optional" />
      <div className="field-help" style={{ margin: "2px 0 0 26px" }}>
        Optional parameters can be skipped when you generate a report.
      </div>
    </Modal>
  );
}
