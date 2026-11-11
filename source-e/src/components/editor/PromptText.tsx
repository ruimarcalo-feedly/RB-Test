import { Icon } from "../ui/Icon";

/**
 * Renders a prompt string, turning `{{Param name}}` markers into parameter chips.
 * Matches the Figma "{ } Tech stack ×" inline chip.
 */
export function PromptText({
  text,
  onRemoveParam,
  highlight,
  values,
}: {
  text: string;
  onRemoveParam?: (name: string) => void;
  /** The parameter being asked about right now, marked out in the sheet. */
  highlight?: string;
  /** Answers by parameter name — a filled parameter shows its answer instead. */
  values?: Record<string, string>;
}) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{\{([^}]+)\}\}$/);
        if (!m) return <span key={i}>{p}</span>;
        const name = m[1];
        const on = highlight && name === highlight;
        const filled = values?.[name];

        /* Once answered, the answer takes the place of the braces and the
           parameter's name — one chip per value, so a long answer wraps
           between values rather than moving as one block. */
        if (filled) {
          const items = filled
            .split(/,\s*/)
            .map((v) => v.trim())
            .filter(Boolean);
          return (
            <span key={`${i}-${filled}`}>
              {items.map((v, j) => (
                <span key={v + j}>
                  {j > 0 && " "}
                  <span className="param-chip filled" title={name}>
                    {v}
                  </span>
                </span>
              ))}
            </span>
          );
        }

        return (
          <span className={`param-chip ${on ? "on" : ""}`} key={i} contentEditable={false}>
            <Icon name="braces" size={16} />
            {name}
            {onRemoveParam && (
              <button
                title="Remove parameter"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveParam(name);
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}
