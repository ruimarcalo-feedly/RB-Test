import { useState } from "react";
import { Button, Field, Modal, Select } from "../ui/primitives";
import type { Parameter } from "../../data/mockData";
import { nextId } from "../../state/store";
import { DateRangeField } from "../report/ElicitInputs";

const TYPES: Parameter["type"][] = ["Free text", "Org Profile", "Date"];

/* Figma "ParameterDialog" (V2): the three input types and what each takes. */
const TYPE_LABEL: Record<Parameter["type"], string> = {
  "Free text": "Open context",
  "Org Profile": "Org Profile items",
  Date: "Date Range",
};
const TYPE_DESC: Record<Parameter["type"], string> = {
  "Free text": "This type will accept any open-ended text input to fill in the parameter.",
  "Org Profile": "This type will take any object from the org profile.",
  Date: "This type will take a selection of beginning and ending dates.",
};

export const ORG_ITEM_TYPES = [
  "Audience",
  "Brand",
  "Company Overview",
  "List",
  "Text content",
  "Tradecraft",
  "Vendors list",
];

/** A checkbox with a second, quieter line under its label. */
function CheckRow({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub: string;
}) {
  return (
    <label className="checkbox check-2line">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="check-title">{label}</span>
        <span className="check-sub">{sub}</span>
      </span>
    </label>
  );
}

/**
 * Add / Edit parameter dialog.
 * Figma V2: ParameterDialog (Selection = Default, Menu, Org Profile 1/2, Date 1/2;
 * Intent = Add, Edit). Deleting a parameter now happens from the Parameters
 * panel's trash, so the dialog's footer is only Cancel and the save action.
 */
export function ParameterDialog({
  mode,
  initial,
  onClose,
  onSave,
  readOnly,
}: {
  mode: "add" | "edit";
  /** Version C: a Feedly template's parameter, shown but not editable. */
  readOnly?: boolean;
  initial?: Partial<Parameter>;
  onClose: () => void;
  onSave: (p: Parameter) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<Parameter["type"]>(initial?.type ?? "Free text");
  const [optional, setOptional] = useState(initial?.optional ?? false);
  const [itemType, setItemType] = useState(initial?.itemType ?? "");
  const [dateDefault, setDateDefault] = useState(initial?.dateDefault ?? "Today");
  const [suggestions, setSuggestions] = useState(initial?.suggestions ?? true);

  const valid = name.trim().length > 0 && description.trim().length > 0;

  const save = () =>
    onSave({
      id: initial?.id ?? nextId("p"),
      name: name.trim(),
      description: description.trim(),
      type,
      optional,
      itemType: type === "Org Profile" ? itemType || undefined : undefined,
      dateDefault: type === "Date" ? dateDefault : undefined,
      suggestions,
      topic: initial?.topic,
    });

  return (
    <Modal
      title={readOnly ? "View parameter" : mode === "add" ? "Add parameter" : "Edit parameter"}
      width={540}
      onClose={onClose}
      className="param-dialog"
      footer={
        readOnly ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!valid} onClick={save}>
              {mode === "add" ? "Add parameter" : "Save changes"}
            </Button>
          </>
        )
      }
    >
      {/* Disabling the fieldset disables every control inside it. */}
      <fieldset className="pd-fieldset" disabled={readOnly}>
      <Field label="Name" required>
        <input
          className="input"
          value={name}
          autoFocus
          placeholder={"E.g. “Tech stack lists” or “TLP classification”"}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="field">
        <CheckRow
          checked={optional}
          onChange={setOptional}
          label="Mark parameter as optional"
          sub="Optional parameters can be skipped when you generate a report."
        />
      </div>
      <Field
        label="Description"
        required
        help="An accurate parameter description will help us offer better suggestions when filling in your report."
        footNote={`You’ve entered ${description.length} of 10,000 characters.`}
        footNoteSize="md"
      >
        <textarea
          className="textarea"
          rows={3}
          value={description}
          placeholder={"E.g. “The tech stack to assess this report against.”"}
          onChange={(e) => setDescription(e.target.value.slice(0, 10000))}
        />
      </Field>
      <Field label="Input type">
        <Select
          block
          value={TYPE_LABEL[type]}
          options={TYPES.map((t) => TYPE_LABEL[t])}
          onChange={(v) => setType(TYPES.find((t) => TYPE_LABEL[t] === v) ?? "Free text")}
          renderOption={(o) => {
            const t = TYPES.find((x) => TYPE_LABEL[x] === o)!;
            return (
              <span className="type-opt">
                <span className="type-opt-title">{o}</span>
                <span className="type-opt-desc">{TYPE_DESC[t]}</span>
              </span>
            );
          }}
        />
        {type === "Org Profile" && (
          <div style={{ marginTop: 8 }}>
            <Select
              block
              value={itemType}
              placeholder="Item type"
              options={ORG_ITEM_TYPES}
              onChange={setItemType}
            />
            <div className="field-help sm-dark">
              You can select specific Org Profile types to narrow down the provided list.
            </div>
          </div>
        )}
        {type === "Date" && (
          <div style={{ marginTop: 8 }}>
            <DateRangeField value={dateDefault} onChange={setDateDefault} />
          </div>
        )}
      </Field>
      <CheckRow
        checked={suggestions}
        onChange={setSuggestions}
        label="Show input suggestions"
        sub="Offer AI suggestions to fill in parameters based on your context"
      />
      </fieldset>
    </Modal>
  );
}
