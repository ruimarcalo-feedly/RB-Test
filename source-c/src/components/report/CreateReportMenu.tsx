import { useMemo } from "react";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/primitives";
import { useStore } from "../../state/store";
import { templateFamilies } from "../../data/templateFamily";

/**
 * The Create Report dropdown — Figma "[2.1 Parameter Revision", `TemplateList`.
 *
 * One flat list, headed "Select Template": every template once, with no
 * audience step in front of it. The audience is asked for afterwards, inside
 * the create-report conversation, where it only offers the audiences the
 * chosen template actually serves (Figma annotation: "allowing the user to
 * select a template without the audience selection attachment, putting that
 * selection to the elicitation phase").
 */
export function CreateReportMenu({
  anchorRef,
  onClose,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Called with a template id. The audience is still open: the flow asks for it. */
  onPick: (templateId: string) => void;
}) {
  const { templates } = useStore();
  const families = useMemo(() => templateFamilies(templates), [templates]);

  return (
    <Popover anchorRef={anchorRef} onClose={onClose} align="end" width={280} className="crm">
      <div className="crm-list">
        <div className="crm-title">Select Template</div>
        {families.map((t) => (
          <button
            key={t.name}
            className="crm-item"
            onClick={() => {
              onClose();
              onPick(t.id);
            }}
          >
            <span className="crm-left">
              <Icon name={t.icon} size={20} />
            </span>
            <span className="crm-mid">{t.name}</span>
            {t.kind === "custom" && <span className="crm-note">Custom</span>}
          </button>
        ))}
      </div>
    </Popover>
  );
}
