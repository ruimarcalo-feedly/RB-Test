import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Field, Modal } from "../ui/primitives";

/**
 * Figma "Create new brand - 2": New Brand.
 *
 * Two fields, and the second is the point of the dialog. A brand is a dozen
 * colours and a typeface, which nobody wants to type in one at a time, so the
 * flow offers a PDF to read them out of and only falls back to a blank brand
 * when none is given.
 */
export function NewBrandDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  /** `extracted` is true when a PDF was supplied, so the brand comes back filled. */
  onCreate: (name: string, extracted: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <Modal
      title="New Brand"
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), Boolean(file))}
          >
            Continue
          </Button>
        </>
      }
    >
      <Field label="Name" required>
        <input
          className="input"
          autoFocus
          value={name}
          placeholder="Feedly"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field
        label="Extract styles"
        help="Upload a PDF document and we'll extract its branding styles automatically."
        footNote="Supports PDF files only, 2 MB max."
      >
        {file ? (
          <div className="upload-done">
            <Icon name="doc" size={18} style={{ color: "var(--content-medium)" }} />
            <span className="truncate">{file}</span>
            <button className="btn ghost icon sm" title="Remove" onClick={() => setFile(null)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div
            className={`dropzone ${over ? "over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              setFile(e.dataTransfer.files[0]?.name ?? "brand-guidelines.pdf");
            }}
          >
            <Icon name="doc" size={24} style={{ color: "var(--content-light)" }} />
            <div className="t-body3 muted">Drag and drop or</div>
            <Button onClick={() => input.current?.click()}>Upload PDF</Button>
            <input
              ref={input}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
            />
          </div>
        )}
      </Field>
    </Modal>
  );
}
