import { useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Modal } from "../ui/primitives";

/**
 * Figma: Managing Templates — Create new 2.
 * Shown immediately after "Create template"; skipping leaves an empty template.
 */
export function GenerateWithPromptDialog({
  onClose,
  onSkip,
  onGenerate,
}: {
  onClose: () => void;
  onSkip: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  return (
    <Modal
      title="Generate with a prompt"
      width={470}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onSkip}>Skip, build manually</Button>
          <Button variant="primary" onClick={() => onGenerate(prompt)}>
            Generate
          </Button>
        </>
      }
    >
      <p className="t-body2 muted" style={{ marginTop: 0 }}>
        Upload an example or describe your template in detail, Feedly AI will create a draft for you.
      </p>
      <div
        style={{
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-large)",
          padding: 12,
        }}
      >
        {/* The well around it is the field; the textarea inside carries no
            border and no focus ring of its own, or the two would fight. */}
        <textarea
          className="textarea bare"
          style={{ padding: 0, minHeight: 44 }}
          rows={2}
          autoFocus
          placeholder="Create a report template for..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button className="btn link" style={{ marginTop: 12 }}>
          <Icon name="upload" size={15} />
          Upload PDF Example
        </button>
      </div>
    </Modal>
  );
}
