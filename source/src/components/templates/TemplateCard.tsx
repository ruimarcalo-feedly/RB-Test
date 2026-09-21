import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { MenuItem, Popover } from "../ui/primitives";
import type { Template } from "../../data/mockData";

export function TemplateCard({
  template,
  onOpen,
  onCreateReport,
  onDuplicate,
  onDelete,
  onEdit,
}: {
  template: Template;
  onOpen?: () => void;
  onCreateReport?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const isCustom = template.kind === "custom";

  return (
    <div
      className="tcard"
      onClick={() => onOpen?.()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
    >
      <div className="tcard-top">
        <span className="tcard-icon">
          <Icon name={template.icon} size={20} />
        </span>
        <button
          ref={moreRef}
          className={`tcard-more ${menu ? "open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setMenu((m) => !m);
          }}
          title="More"
        >
          <Icon name="ellipsis" size={18} />
        </button>
      </div>
      <div className="tcard-title" title={template.name}>
        {template.name}
      </div>
      <div className="tcard-desc">{template.description}</div>
      <div className="tcard-foot">
        <span className="badge">{template.audience || "No audience"}</span>
        {isCustom && <span className="light t-body3">Custom</span>}
      </div>

      {menu && (
        <Popover anchorRef={moreRef} onClose={() => setMenu(false)} align="end" width={216}>
          <MenuItem
            icon="wand"
            onClick={() => {
              setMenu(false);
              onCreateReport?.();
            }}
          >
            Create Report
          </MenuItem>
          {isCustom && onEdit && (
            <MenuItem
              icon="pencil"
              onClick={() => {
                setMenu(false);
                onEdit();
              }}
            >
              Edit template
            </MenuItem>
          )}
          <MenuItem
            icon="duplicate"
            onClick={() => {
              setMenu(false);
              onDuplicate?.();
            }}
          >
            Duplicate template
          </MenuItem>
          {isCustom && onDelete && (
            <MenuItem
              icon="trash"
              tone="danger"
              onClick={() => {
                setMenu(false);
                onDelete();
              }}
            >
              Delete template
            </MenuItem>
          )}
        </Popover>
      )}
    </div>
  );
}
