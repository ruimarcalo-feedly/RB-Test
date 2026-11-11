import { useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { MenuItem, Popover } from "../ui/primitives";
import type { Template } from "../../data/mockData";

const isCustomOf = (t: Template) => t.kind === "custom";

export function TemplateCard({
  template,
  onOpen,
  onCreateReport,
  onDuplicate,
  onDelete,
  onEdit,
  showAudience = true,
  audienceCount,
  viewOptions,
}: {
  /**
   * Under "All Audiences", a card stands for the template in every audience.
   * "View template" then opens a second step to pick which audience's
   * template to view.
   */
  viewOptions?: { id: string; audience: string; onView: () => void }[];
  /** Off under "All Audiences", where a card stands for every pairing at once. */
  showAudience?: boolean;
  /** How many audiences the template serves, shown when the card stands for all of them. */
  audienceCount?: number;
  template: Template;
  onOpen?: () => void;
  onCreateReport?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState<"main" | "audience">("main");
  const pickAudience = !isCustomOf(template) && (viewOptions?.length ?? 0) > 1;
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
            setStep("main");
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
      {template.legacy ? (
        /* A legacy template has no audience yet, only its origin to show. */
        <div className="tcard-foot">
          <span />
          <span className="light t-body3">Legacy</span>
        </div>
      ) : (
      <div className="tcard-foot">
          <span className="badge">
            <Icon name="audience" size={16} />
            {showAudience || isCustom || audienceCount === undefined
              ? template.audience || "No audience"
              : `${audienceCount} ${audienceCount === 1 ? "audience" : "audiences"}`}
          </span>
          {isCustom && <span className="light t-body3">Custom</span>}
        </div>
      )}

      {menu && (
        <Popover
          anchorRef={moreRef}
          onClose={() => setMenu(false)}
          align="end"
          width={216}
        >
          {/* The menu is portalled out of the card, but React still bubbles its
              clicks up this tree, so without this every menu item would also
              trigger the card's own "open" click. */}
          <div onClick={(e) => e.stopPropagation()}>
            {step === "audience" && viewOptions ? (
              <>
                <button className="menu-item tc-back" onClick={() => setStep("main")}>
                  <Icon name="chevron-left" size={18} />
                  <span>Choose audience</span>
                </button>
                {viewOptions.map((o) => (
                  <MenuItem
                    key={o.id}
                    onClick={() => {
                      setMenu(false);
                      o.onView();
                    }}
                  >
                    {o.audience}
                  </MenuItem>
                ))}
              </>
            ) : (
            <>
            <MenuItem
              icon="wand"
              onClick={() => {
                setMenu(false);
                onCreateReport?.();
              }}
            >
              Create Report
            </MenuItem>
            {/* A Feedly template can't be edited, but it can be looked at: it
                opens in the template editor, read-only. */}
            {!isCustom && onEdit && (
              <MenuItem
                icon="doc"
                onClick={() => {
                  /* Several audiences: pick which one's template to view. */
                  if (pickAudience) {
                    setStep("audience");
                    return;
                  }
                  setMenu(false);
                  onEdit();
                }}
              >
                <span className="tc-mi-label">View template</span>
                {pickAudience && <Icon name="chevron-right" size={18} className="tc-mi-chev" />}
              </MenuItem>
            )}
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
            </>
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}
