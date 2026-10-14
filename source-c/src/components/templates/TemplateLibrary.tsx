import { useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { Button, Modal } from "../ui/primitives";
import { TemplateCard } from "./TemplateCard";
import { useStore } from "../../state/store";
import type { Template } from "../../data/mockData";
import { VARIANT } from "../../variant";

/** The library's own entry for templates from the previous templating system. */
const LEGACY = "Legacy";

/**
 * "Manage templates" → Template Library modal.
 * Figma: Managing Templates — Browsing / Duplicating / Deleting / Create new.
 */
export function TemplateLibrary({ onClose }: { onClose: () => void }) {
  const {
    templates,
    audiences,
    duplicateTemplate,
    deleteTemplate,
    createTemplate,
    openTemplateEditor,
    openReportEditor,
    toast,
  } = useStore();
  const [audience, setAudience] = useState("CISO");
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);

  const audienceList = useMemo(
    () => ["CISO", "Custom audience", ...audiences.filter((a) => a !== "CISO" && a !== "Custom audience")],
    [audiences]
  );

  const legacy = templates.filter((t) => t.legacy);
  const shown = templates.filter((t) =>
    audience === LEGACY
      ? t.legacy
      : !t.legacy && (audience === "Custom audience" ? t.kind === "custom" : t.audience === audience)
  );

  return (
    <>
      <Modal onClose={onClose} bare className="library">
        <div className="library-side">
          <h3>Target audiences</h3>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {audienceList.map((a) => (
              <button
                key={a}
                className={`library-aud ${a === audience ? "active" : ""}`}
                onClick={() => setAudience(a)}
              >
                {a}
              </button>
            ))}
            {legacy.length > 0 && (
              <button
                className={`library-aud ${audience === LEGACY ? "active" : ""}`}
                onClick={() => setAudience(LEGACY)}
              >
                {LEGACY}
                {/* Version B gates legacy templates behind an upgrade, so it
                    keeps count of what is left to do. */}
                {VARIANT === "B" && (
                  <span className="legacy-count">{legacy.length} left to update</span>
                )}
              </button>
            )}
          </div>
          <Button
            icon="plus"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => {
              const t = createTemplate();
              onClose();
              openTemplateEditor(t.id, true);
            }}
          >
            Create template
          </Button>
        </div>

        <div className="library-main">
          <div className="library-head">
            <div className="modal-title">Template Library</div>
            <button className="btn ghost icon sm" onClick={onClose} title="Close">
              <Icon name="close" size={16} />
            </button>
          </div>
          {audience === LEGACY && VARIANT === "B" && (
            <div className="param-warn library-warn">
              <Icon name="info" size={18} />
              Legacy templates were built on a previous templating system. To take advantage of
              new features you can upgrade them by editing their details.
            </div>
          )}
          <div className="library-grid">
            {shown.length === 0 && (
              <div className="empty">
                No templates for this audience yet. Use <b>Create template</b> to add one.
              </div>
            )}
            {shown.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onOpen={() => {
                  onClose();
                  openTemplateEditor(t.id);
                }}
                onEdit={() => {
                  onClose();
                  openTemplateEditor(t.id);
                }}
                onCreateReport={() => {
                  onClose();
                  openReportEditor(t.id, { path: "none" });
                }}
                onDuplicate={() => {
                  const copy = duplicateTemplate(t.id);
                  toast(`${copy.name} created`);
                }}
                onDelete={() => setConfirmDelete(t)}
              />
            ))}
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <Modal
          title="Delete template"
          width={420}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(null)}>No, keep this template</Button>
              <Button
                variant="danger"
                icon="trash"
                onClick={() => {
                  deleteTemplate(confirmDelete.id);
                  toast(`${confirmDelete.name} deleted`);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <div className="t-body2">
            Are you sure you want to delete <b>{confirmDelete.name}</b>? This operation cannot be
            undone.
          </div>
        </Modal>
      )}
    </>
  );
}
