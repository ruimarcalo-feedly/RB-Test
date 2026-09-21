import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { Popover } from "../ui/primitives";
import { useStore } from "../../state/store";
import { AUDIENCE_MENU_ORDER, BUILT_IN_ORDER, type Template } from "../../data/mockData";

/**
 * The Create Report dropdown — Figma "dropdown" (2578:97968).
 *
 * Two levels inside one 280px popover. The first lists the audiences (plus a
 * shortcut to the templates used most recently); picking one rotates the panel
 * along to that audience's templates, with a back header that comes back.
 * Which templates an audience gets comes straight from the template data, so
 * the lists here match the library and the carousel.
 */

type Level =
  | { kind: "audiences" }
  | { kind: "recent" }
  | { kind: "templates"; audience: string };

/** Templates for one audience, in the order the library lays them out:
 *  each built-in in its canonical order, with any custom variant of it
 *  directly after. */
function templatesFor(templates: Template[], audience: string) {
  const base = (t: Template) => t.name.replace(/\s*\([^)]*\)\s*$/, "");
  return templates
    .filter((t) => t.audience === audience)
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const ai = BUILT_IN_ORDER.indexOf(base(a.t));
      const bi = BUILT_IN_ORDER.indexOf(base(b.t));
      if (ai !== bi) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      if (a.t.kind !== b.t.kind) return a.t.kind === "feedly" ? -1 : 1;
      return a.i - b.i;
    })
    .map((x) => x.t);
}

export function CreateReportMenu({
  anchorRef,
  onClose,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Called with the chosen template id. */
  onPick: (templateId: string) => void;
}) {
  const { templates, audiences } = useStore();

  const [level, setLevel] = useState<Level>({ kind: "audiences" });
  /** The pane on its way out, kept around just long enough to slide off. */
  const [leaving, setLeaving] = useState<{ level: Level; dir: "fwd" | "back" } | null>(null);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [height, setHeight] = useState<number>();

  const paneRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);
  const first = useRef(true);

  /* Keep the popover exactly as tall as the visible pane, so the rotate reads
     as one panel changing rather than two panels of different heights. */
  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    first.current = false;
  }, [level]);

  const go = (next: Level, direction: "fwd" | "back") => {
    setLeaving({ level, dir: direction });
    setDir(direction);
    setLevel(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLeaving(null), 300);
  };

  const audienceList = useMemo(() => {
    const known = AUDIENCE_MENU_ORDER.filter((a) => audiences.includes(a));
    return [...known, ...audiences.filter((a) => !AUDIENCE_MENU_ORDER.includes(a))];
  }, [audiences]);

  /* One row per template, not per template-and-audience — the same built-in
     exists once for every audience it serves, and five rows reading
     "Executive Memo" would say nothing. */
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return [...templates]
      .sort((a, b) => a.lastUsed - b.lastUsed)
      .filter((t) => !seen.has(t.name) && (seen.add(t.name), true))
      .slice(0, 5);
  }, [templates]);

  const pick = (t: Template) => {
    onClose();
    onPick(t.id);
  };

  const templateRow = (t: Template, note?: string) => (
    <button key={t.id} className="crm-item" onClick={() => pick(t)}>
      <span className="crm-left">
        <Icon name={t.icon} size={20} />
      </span>
      <span className="crm-mid">{t.name}</span>
      {note && <span className="crm-note">{note}</span>}
    </button>
  );

  const pane = (l: Level) => {
    if (l.kind === "audiences") {
      return (
        <>
          <div className="crm-list bordered">
            <button className="crm-item" onClick={() => go({ kind: "recent" }, "fwd")}>
              <span className="crm-left quiet">
                <Icon name="history" size={20} />
              </span>
              <span className="crm-mid">Last used templates</span>
              <span className="crm-right">
                <Icon name="chevron-right" size={20} />
              </span>
            </button>
          </div>
          <div className="crm-list">
            <div className="crm-title">Select Audience</div>
            {audienceList.map((a) => (
              <button
                key={a}
                className="crm-item"
                onClick={() => go({ kind: "templates", audience: a }, "fwd")}
              >
                <span className="crm-mid plain">{a}</span>
                <span className="crm-right">
                  <Icon name="chevron-right" size={20} />
                </span>
              </button>
            ))}
          </div>
        </>
      );
    }

    const rows = l.kind === "recent" ? recent : templatesFor(templates, l.audience);
    return (
      <div className="crm-list">
        <div className="crm-back">
          <button
            className="crm-backbtn"
            onClick={() => go({ kind: "audiences" }, "back")}
            title="Back to audiences"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <span>{l.kind === "recent" ? "Last used templates" : l.audience}</span>
        </div>
        <div className="crm-title">Select Template</div>
        {rows.length === 0 ? (
          <div className="crm-empty">No templates for this audience yet.</div>
        ) : (
          /* On the recents list the audience is the useful right-hand note,
             since those rows come from all over. Inside one audience it is
             whether the template is a custom variant. */
          rows.map((t) =>
            templateRow(t, l.kind === "recent" ? t.audience : t.kind === "custom" ? "Custom" : undefined)
          )
        )}
      </div>
    );
  };

  return (
    <Popover anchorRef={anchorRef} onClose={onClose} align="end" width={280} className="crm">
      <div className="crm-view" style={{ height }}>
        {leaving && (
          <div className={`crm-pane out ${leaving.dir}`} aria-hidden>
            {pane(leaving.level)}
          </div>
        )}
        <div
          ref={paneRef}
          className={`crm-pane ${first.current ? "" : `in ${dir}`}`}
          key={level.kind === "templates" ? `t-${level.audience}` : level.kind}
        >
          {pane(level)}
        </div>
      </div>
    </Popover>
  );
}
